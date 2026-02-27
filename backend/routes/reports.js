const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Parking = require('../models/Parking');

// Submit a report
router.post('/submit', async (req, res) => {
  try {
    const {
      parkingId,
      providerId,
      reporterId,
      reporterName,
      reporterEmail,
      bookingId,
      rating,
      reasons,
      details,
      reviewComment
    } = req.body;

    // Validation
    if (!parkingId || !providerId || !reporterId || !bookingId || !rating) {
      return res.json({ success: false, error: 'Missing required fields' });
    }

    if (rating > 2) {
      return res.json({ success: false, error: 'Reports are only for ratings 1-2 stars' });
    }

    if (!reasons || reasons.length === 0) {
      return res.json({ success: false, error: 'At least one reason must be selected' });
    }

    // Create report
    const report = new Report({
      parkingId,
      providerId,
      reporterId,
      reporterName,
      reporterEmail,
      bookingId,
      rating,
      reasons,
      details: details || '',
      reviewComment: reviewComment || '',
      status: 'pending'
    });

    await report.save();

    // Check if this parking space has multiple reports
    const reportCount = await Report.countDocuments({
      parkingId: parkingId,
      status: { $in: ['pending', 'investigating'] }
    });

    console.log(`Report submitted for parking ${parkingId}. Total pending reports: ${reportCount}`);

    // If 3 or more reports, flag for urgent review
    if (reportCount >= 3) {
      console.log(`⚠️ ALERT: Parking ${parkingId} has ${reportCount} pending reports - needs urgent admin review`);
    }

    res.json({
      success: true,
      report: report,
      message: 'Report submitted successfully',
      totalReports: reportCount
    });

  } catch (err) {
    console.error('Submit report error:', err);
    res.json({ success: false, error: err.message });
  }
});

// Get reports for a parking space
router.get('/parking/:parkingId', async (req, res) => {
  try {
    const reports = await Report.find({ parkingId: req.params.parkingId })
      .sort({ createdAt: -1 })
      .populate('reporterId', 'name email')
      .populate('bookingId', 'createdAt');

    res.json(reports);
  } catch (err) {
    console.error('Get parking reports error:', err);
    res.json({ success: false, error: err.message });
  }
});

// Get reports for a provider
router.get('/provider/:providerId', async (req, res) => {
  try {
    const reports = await Report.find({ providerId: req.params.providerId })
      .sort({ createdAt: -1 })
      .populate('parkingId', 'notes')
      .populate('reporterId', 'name email')
      .populate('bookingId', 'createdAt');

    res.json(reports);
  } catch (err) {
    console.error('Get provider reports error:', err);
    res.json({ success: false, error: err.message });
  }
});

// Get all pending reports (for admin)
router.get('/admin/pending', async (req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('parkingId', 'notes images')
      .populate('providerId', 'name email')
      .populate('reporterId', 'name email')
      .populate('bookingId', 'createdAt');

    // Group by parking space to show which ones have multiple reports
    const reportsByParking = {};
    reports.forEach(report => {
      const parkingId = report.parkingId._id.toString();
      if (!reportsByParking[parkingId]) {
        reportsByParking[parkingId] = {
          parking: report.parkingId,
          provider: report.providerId,
          reports: []
        };
      }
      reportsByParking[parkingId].reports.push(report);
    });

    res.json({
      success: true,
      reports: reports,
      reportsByParking: reportsByParking,
      totalPending: reports.length
    });
  } catch (err) {
    console.error('Get pending reports error:', err);
    res.json({ success: false, error: err.message });
  }
});

// Get report statistics for a parking space
router.get('/stats/:parkingId', async (req, res) => {
  try {
    const parkingId = req.params.parkingId;

    const totalReports = await Report.countDocuments({ parkingId });
    const pendingReports = await Report.countDocuments({ parkingId, status: 'pending' });
    const resolvedReports = await Report.countDocuments({ parkingId, status: 'resolved' });

    // Get most common reasons
    const reports = await Report.find({ parkingId });
    const reasonCounts = {};
    reports.forEach(report => {
      report.reasons.forEach(reason => {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
    });

    res.json({
      success: true,
      parkingId,
      totalReports,
      pendingReports,
      resolvedReports,
      reasonCounts,
      needsAttention: pendingReports >= 3
    });
  } catch (err) {
    console.error('Get report stats error:', err);
    res.json({ success: false, error: err.message });
  }
});

// Update report status (admin only)
router.put('/admin/update/:reportId', async (req, res) => {
  try {
    const { status, adminNotes, actionTaken, resolvedBy } = req.body;

    const report = await Report.findById(req.params.reportId);
    if (!report) {
      return res.json({ success: false, error: 'Report not found' });
    }

    report.status = status || report.status;
    report.adminNotes = adminNotes || report.adminNotes;
    report.actionTaken = actionTaken || report.actionTaken;

    if (status === 'resolved' && !report.resolvedAt) {
      report.resolvedAt = new Date();
      report.resolvedBy = resolvedBy || 'Admin';
    }

    await report.save();

    res.json({
      success: true,
      report: report,
      message: 'Report updated successfully'
    });
  } catch (err) {
    console.error('Update report error:', err);
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
