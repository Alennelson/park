const express = require("express");
const router = express.Router();
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");

/* GET WALLET BALANCE */
router.get("/:ownerId", async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ ownerId: req.params.ownerId });
    
    if (!wallet) {
      // Create wallet if doesn't exist
      wallet = new Wallet({ ownerId: req.params.ownerId });
      await wallet.save();
    }
    
    res.json(wallet);
  } catch (err) {
    console.error("Get wallet error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* GET TRANSACTION HISTORY */
router.get("/:ownerId/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find({ ownerId: req.params.ownerId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(transactions);
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ADD MONEY TO WALLET (Called after successful payment) */
router.post("/credit", async (req, res) => {
  try {
    const { ownerId, amount, bookingId, description } = req.body;
    
    let wallet = await Wallet.findOne({ ownerId });
    
    if (!wallet) {
      wallet = new Wallet({ ownerId });
    }
    
    // Calculate provider share (82%)
    const providerShare = Math.round(amount * 0.82);
    
    wallet.balance += providerShare;
    wallet.totalEarnings += providerShare;
    wallet.lastTransaction = new Date();
    await wallet.save();
    
    // Create transaction record
    const transaction = new Transaction({
      ownerId,
      type: 'credit',
      amount: providerShare,
      description: description || `Booking payment - ₹${amount} (82% share)`,
      bookingId,
      status: 'completed',
      balanceAfter: wallet.balance
    });
    await transaction.save();
    
    console.log(`Credited ₹${providerShare} to wallet ${ownerId}`);
    res.json({ success: true, wallet, transaction });
  } catch (err) {
    console.error("Credit wallet error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* REQUEST WITHDRAWAL */
router.post("/withdraw", async (req, res) => {
  try {
    const { ownerId, amount, accountHolderName, accountNumber, ifscCode, upiId } = req.body;
    
    // Check wallet balance
    const wallet = await Wallet.findOne({ ownerId });
    
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ 
        success: false, 
        error: "Insufficient balance" 
      });
    }
    
    if (amount < 100) {
      return res.status(400).json({ 
        success: false, 
        error: "Minimum withdrawal amount is ₹100" 
      });
    }
    
    // Create withdrawal request
    const withdrawal = new Withdrawal({
      ownerId,
      amount,
      accountHolderName,
      accountNumber,
      ifscCode,
      upiId,
      status: 'pending'
    });
    await withdrawal.save();
    
    console.log(`Withdrawal request created: ₹${amount} for ${ownerId}`);
    res.json({ success: true, withdrawal });
  } catch (err) {
    console.error("Withdrawal request error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET WITHDRAWAL HISTORY */
router.get("/:ownerId/withdrawals", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ ownerId: req.params.ownerId })
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (err) {
    console.error("Get withdrawals error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ADMIN: GET ALL WITHDRAWAL REQUESTS */
router.get("/admin/withdrawals", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (err) {
    console.error("Get all withdrawals error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ADMIN: APPROVE WITHDRAWAL */
router.post("/admin/approve/:withdrawalId", async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
    
    if (!withdrawal) {
      return res.status(404).json({ success: false, error: "Withdrawal not found" });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, error: "Withdrawal already processed" });
    }
    
    // Deduct from wallet
    const wallet = await Wallet.findOne({ ownerId: withdrawal.ownerId });
    
    if (!wallet || wallet.balance < withdrawal.amount) {
      return res.status(400).json({ success: false, error: "Insufficient balance" });
    }
    
    wallet.balance -= withdrawal.amount;
    wallet.lastTransaction = new Date();
    await wallet.save();
    
    // Update withdrawal status
    withdrawal.status = 'completed';
    withdrawal.processedDate = new Date();
    withdrawal.adminNotes = adminNotes;
    await withdrawal.save();
    
    // Create transaction record
    const transaction = new Transaction({
      ownerId: withdrawal.ownerId,
      type: 'debit',
      amount: withdrawal.amount,
      description: `Withdrawal to ${withdrawal.accountNumber}`,
      status: 'completed',
      balanceAfter: wallet.balance
    });
    await transaction.save();
    
    console.log(`Withdrawal approved: ₹${withdrawal.amount} for ${withdrawal.ownerId}`);
    res.json({ success: true, withdrawal, wallet });
  } catch (err) {
    console.error("Approve withdrawal error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ADMIN: REJECT WITHDRAWAL */
router.post("/admin/reject/:withdrawalId", async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
    
    if (!withdrawal) {
      return res.status(404).json({ success: false, error: "Withdrawal not found" });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, error: "Withdrawal already processed" });
    }
    
    withdrawal.status = 'rejected';
    withdrawal.processedDate = new Date();
    withdrawal.adminNotes = adminNotes || "Rejected by admin";
    await withdrawal.save();
    
    console.log(`Withdrawal rejected: ₹${withdrawal.amount} for ${withdrawal.ownerId}`);
    res.json({ success: true, withdrawal });
  } catch (err) {
    console.error("Reject withdrawal error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

/* ================= ADMIN ENDPOINTS ================= */

// Get all pending withdrawals (Admin)
router.get("/admin/pending-withdrawals", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' })
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (err) {
    console.error("Get pending withdrawals error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Approve withdrawal (Admin)
router.post("/admin/approve-withdrawal/:withdrawalId", async (req, res) => {
  try {
    const { ownerId, amount, adminNotes } = req.body;
    
    // Get withdrawal
    const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
    if (!withdrawal) {
      return res.json({ success: false, error: 'Withdrawal not found' });
    }
    
    // Get wallet
    const wallet = await Wallet.findOne({ ownerId });
    if (!wallet) {
      return res.json({ success: false, error: 'Wallet not found' });
    }
    
    // Check if wallet has sufficient balance
    if (wallet.balance < amount) {
      return res.json({ success: false, error: 'Insufficient wallet balance' });
    }
    
    // Deduct from wallet
    wallet.balance -= amount;
    wallet.lastTransaction = new Date();
    await wallet.save();
    
    // Create debit transaction
    const transaction = new Transaction({
      ownerId: ownerId,
      type: 'debit',
      amount: amount,
      description: 'Withdrawal approved by admin',
      balanceAfter: wallet.balance
    });
    await transaction.save();
    
    // Update withdrawal status
    withdrawal.status = 'completed';
    withdrawal.processedDate = new Date();
    withdrawal.adminNotes = adminNotes || 'Approved by admin';
    await withdrawal.save();
    
    res.json({
      success: true,
      message: 'Withdrawal approved and amount deducted from wallet',
      newBalance: wallet.balance
    });
  } catch (err) {
    console.error("Approve withdrawal error:", err);
    res.json({ success: false, error: err.message });
  }
});

// Reject withdrawal (Admin)
router.post("/admin/reject-withdrawal/:withdrawalId", async (req, res) => {
  try {
    const { adminNotes } = req.body;
    
    const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
    if (!withdrawal) {
      return res.json({ success: false, error: 'Withdrawal not found' });
    }
    
    withdrawal.status = 'rejected';
    withdrawal.processedDate = new Date();
    withdrawal.adminNotes = adminNotes || 'Rejected by admin';
    await withdrawal.save();
    
    res.json({
      success: true,
      message: 'Withdrawal rejected'
    });
  } catch (err) {
    console.error("Reject withdrawal error:", err);
    res.json({ success: false, error: err.message });
  }
});
