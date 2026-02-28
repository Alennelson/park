const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const SupportTicket = require("../models/SupportTicket");

/* MULTER CONFIGURATION FOR IMAGE UPLOADS */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpeg, jpg, png, gif)"));
    }
  }
});

/* CREATE SUPPORT TICKET WITH OPTIONAL IMAGES */
router.post("/create", upload.array("images", 5), async (req, res) => {
  try {
    const { userId, userName, userEmail, category, subject, description, priority, bookingId } = req.body;
    
    if (!userId || !userName || !userEmail || !category || !subject || !description) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields" 
      });
    }
    
    // Check if user has ASP Insurance Protection
    const Verification = require('../models/Verification');
    // Try both userId and ownerId to handle different field names
    let verification = await Verification.findOne({ ownerId: userId, status: 'active' });
    if (!verification) {
      verification = await Verification.findOne({ userId: userId, status: 'active' });
    }
    
    let ticketPriority = priority || 'medium';
    let hasInsurance = false;
    let insuranceTier = null;
    
    if (verification) {
      // User has ASP protection - set HIGH priority automatically
      ticketPriority = 'high';
      hasInsurance = true;
      insuranceTier = verification.tier;
      console.log(`🛡️ ASP Protection user detected: ${userName} (${insuranceTier.toUpperCase()} tier) - Setting HIGH priority`);
    } else {
      console.log(`No ASP insurance found for user ${userId}`);
    }
    
    // Get uploaded image paths
    const attachments = req.files ? req.files.map(file => file.path) : [];
    
    const ticket = new SupportTicket({
      userId,
      userName,
      userEmail,
      category,
      subject,
      description,
      priority: ticketPriority,
      bookingId,
      attachments,
      status: 'open',
      hasInsurance: hasInsurance,
      insuranceTier: insuranceTier
    });
    
    await ticket.save();
    
    console.log(`Support ticket created: ${ticket._id} by ${userName} with ${attachments.length} images${hasInsurance ? ' [ASP PROTECTED - HIGH PRIORITY]' : ''}`);
    res.json({ success: true, ticket });
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET USER'S TICKETS */
router.get("/user/:userId", async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (err) {
    console.error("Get user tickets error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* GET SINGLE TICKET */
router.get("/:ticketId", async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    res.json(ticket);
  } catch (err) {
    console.error("Get ticket error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* UPDATE TICKET (USER) */
router.put("/:ticketId", async (req, res) => {
  try {
    const { description } = req.body;
    
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.ticketId,
      { description },
      { new: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }
    
    res.json({ success: true, ticket });
  } catch (err) {
    console.error("Update ticket error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ADMIN: GET ALL TICKETS */
router.get("/admin/all", async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (err) {
    console.error("Get all tickets error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ADMIN: UPDATE TICKET STATUS */
router.post("/admin/update/:ticketId", async (req, res) => {
  try {
    const { status, adminResponse, adminNotes } = req.body;
    
    const updateData = { status };
    
    if (adminResponse) updateData.adminResponse = adminResponse;
    if (adminNotes) updateData.adminNotes = adminNotes;
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    } else if (status === 'closed') {
      updateData.closedAt = new Date();
    }
    
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.ticketId,
      updateData,
      { new: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }
    
    console.log(`Ticket ${ticket._id} updated to ${status}`);
    res.json({ success: true, ticket });
  } catch (err) {
    console.error("Admin update ticket error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

/* ================= ADMIN ENDPOINTS ================= */

// Get all open tickets (Admin)
router.get("/admin/open", async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ status: { $in: ['open', 'in_progress'] } })
      .sort({ priority: -1, createdAt: -1 });
    
    // Enrich tickets with current insurance status
    const Verification = require('../models/Verification');
    
    const enrichedTickets = await Promise.all(tickets.map(async (ticket) => {
      const ticketObj = ticket.toObject();
      
      // Check current insurance status - try both ownerId and userId
      let verification = await Verification.findOne({ 
        ownerId: ticket.userId, 
        status: 'active' 
      });
      
      if (!verification) {
        verification = await Verification.findOne({ 
          userId: ticket.userId, 
          status: 'active' 
        });
      }
      
      if (verification) {
        // Update insurance fields
        ticketObj.hasInsurance = true;
        ticketObj.insuranceTier = verification.tier;
        
        // Update in database if not already set
        if (!ticket.hasInsurance) {
          await SupportTicket.findByIdAndUpdate(ticket._id, {
            hasInsurance: true,
            insuranceTier: verification.tier,
            priority: 'high' // Upgrade to high if not already
          });
          
          console.log(`✅ Updated ticket ${ticket._id} with insurance info: ${verification.tier.toUpperCase()}`);
        }
      } else {
        console.log(`No insurance found for ticket ${ticket._id}, userId: ${ticket.userId}`);
      }
      
      return ticketObj;
    }));
    
    res.json(enrichedTickets);
  } catch (err) {
    console.error("Get open tickets error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single ticket (Admin)
router.get("/ticket/:ticketId", async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    res.json(ticket);
  } catch (err) {
    console.error("Get ticket error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Resolve ticket (Admin)
router.post("/admin/resolve/:ticketId", async (req, res) => {
  try {
    const { adminResponse, resolvedBy } = req.body;
    
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.json({ success: false, error: 'Ticket not found' });
    }
    
    ticket.status = 'resolved';
    ticket.adminResponse = adminResponse;
    ticket.resolvedAt = new Date();
    ticket.resolvedBy = resolvedBy || 'Admin';
    await ticket.save();
    
    res.json({
      success: true,
      message: 'Ticket resolved',
      ticket: ticket
    });
  } catch (err) {
    console.error("Resolve ticket error:", err);
    res.json({ success: false, error: err.message });
  }
});
