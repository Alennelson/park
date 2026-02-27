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
    
    // Get uploaded image paths
    const attachments = req.files ? req.files.map(file => file.path) : [];
    
    const ticket = new SupportTicket({
      userId,
      userName,
      userEmail,
      category,
      subject,
      description,
      priority: priority || 'medium',
      bookingId,
      attachments,
      status: 'open'
    });
    
    await ticket.save();
    
    console.log(`Support ticket created: ${ticket._id} by ${userName} with ${attachments.length} images`);
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
