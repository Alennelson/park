# Report System Implementation

## Overview
Added a comprehensive reporting system that allows drivers to report issues when they give 1 or 2-star ratings. This helps admin identify problematic parking spaces and providers.

## Features

### 1. Automatic Report Trigger
- When a driver rates a parking space with 1 or 2 stars, a "Report Issue" section automatically appears
- The normal "Submit Rating" button is hidden and replaced with "Submit Rating & Report" button
- For 3-5 star ratings, the normal flow continues without reporting

### 2. Report Reasons
Drivers can select multiple issues:
- ✓ Dirty or poorly maintained space
- ✓ Unsafe or insecure location
- ✓ Misleading photos or description
- ✓ Rude or unprofessional provider
- ✓ Overpriced for the quality
- ✓ Space was not available as listed
- ✓ Other issue

### 3. Additional Details
- Drivers can provide additional text details about the issue
- Review comment is also included in the report

### 4. Report Tracking
- Each report is linked to:
  - Parking space
  - Provider
  - Reporter (driver)
  - Booking
  - Rating given
- Reports have status: pending, investigating, resolved, dismissed

### 5. Admin Alerts
- When a parking space receives 3+ pending reports, it's flagged for urgent review
- Console logs alert admins to high-priority cases

## Files Modified

### Frontend
- `frontend/find-parking.html`
  - Added report reasons checkboxes
  - Added report details textarea
  - Added "Submit Rating & Report" button
  - Modified `setRating()` to show/hide report section
  - Added `submitWithReport()` function

### Backend
- `backend/models/Report.js` (NEW)
  - Report schema with all necessary fields
  - Indexes for fast queries
  
- `backend/routes/reports.js` (NEW)
  - POST `/api/reports/submit` - Submit a report
  - GET `/api/reports/parking/:parkingId` - Get reports for a parking space
  - GET `/api/reports/provider/:providerId` - Get reports for a provider
  - GET `/api/reports/admin/pending` - Get all pending reports (admin)
  - GET `/api/reports/stats/:parkingId` - Get report statistics
  - PUT `/api/reports/admin/update/:reportId` - Update report status (admin)

- `backend/server.js`
  - Added reports route registration
  - Added support route registration

## API Endpoints

### Submit Report
```
POST /api/reports/submit
Body: {
  parkingId: string,
  providerId: string,
  reporterId: string,
  reporterName: string,
  reporterEmail: string,
  bookingId: string,
  rating: number (1-2),
  reasons: string[],
  details: string,
  reviewComment: string
}
```

### Get Parking Reports
```
GET /api/reports/parking/:parkingId
Returns: Array of reports for the parking space
```

### Get Provider Reports
```
GET /api/reports/provider/:providerId
Returns: Array of reports for the provider
```

### Get Pending Reports (Admin)
```
GET /api/reports/admin/pending
Returns: {
  reports: Array,
  reportsByParking: Object (grouped by parking space),
  totalPending: number
}
```

### Get Report Statistics
```
GET /api/reports/stats/:parkingId
Returns: {
  totalReports: number,
  pendingReports: number,
  resolvedReports: number,
  reasonCounts: Object,
  needsAttention: boolean (true if 3+ pending)
}
```

### Update Report (Admin)
```
PUT /api/reports/admin/update/:reportId
Body: {
  status: string,
  adminNotes: string,
  actionTaken: string,
  resolvedBy: string
}
```

## User Flow

1. Driver completes parking and payment
2. Rating popup appears
3. Driver selects 1 or 2 stars
4. Report section automatically appears with checkboxes
5. Driver selects issue reasons and adds details
6. Driver clicks "Submit Rating & Report"
7. System submits both rating and report
8. Admin receives notification if parking has 3+ reports
9. Admin can review reports and take action

## Admin Actions
Admins can take the following actions on reports:
- `none` - No action needed
- `warning` - Warning sent to provider
- `suspension` - Temporary suspension
- `removal` - Parking space removed from platform

## Benefits

1. **Quality Control**: Identifies problematic parking spaces quickly
2. **Provider Accountability**: Providers know they're being monitored
3. **Data-Driven Decisions**: Admin can see patterns and trends
4. **User Protection**: Drivers can report issues safely
5. **Automatic Flagging**: High-report spaces are automatically highlighted

## Future Enhancements

Potential improvements:
- Email notifications to admin for urgent reports
- Provider notification system (warning emails)
- Automatic suspension after X reports
- Report analytics dashboard
- Provider response system
- Appeal process for providers

## Testing

To test the system:
1. Create a booking as a driver
2. Complete the parking session
3. Give a 1 or 2-star rating
4. Select report reasons
5. Submit the report
6. Check backend logs for confirmation
7. Query `/api/reports/parking/:parkingId` to see the report

## Notes

- Reports are only created for 1-2 star ratings
- At least one reason must be selected
- Reports are linked to specific bookings for verification
- Multiple reports on same parking space trigger alerts
- All report data is preserved for audit trail
