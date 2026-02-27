# ASP Admin Dashboard - Complete Guide

## Overview
Complete admin control panel for managing the ASP (A Space for Park) platform.

## Access
**URL**: `https://your-domain.com/admin.html`
**Password**: `asp2024admin` (Change this in admin.html line 52)

## Features

### 1. Dashboard Overview
- **Pending Withdrawals** - Count of withdrawal requests awaiting approval
- **Pending Reports** - Count of user reports against providers
- **Open Tickets** - Count of unresolved support tickets
- **Total Users** - Total registered users on platform

### 2. Withdrawal Management 💰

**What it does:**
- View all pending withdrawal requests from providers
- Approve withdrawals (automatically deducts from provider's wallet)
- Reject withdrawals with reason

**Workflow:**
1. Provider submits withdrawal request
2. Admin sees request in "Withdrawals" section
3. Admin clicks "Approve" or "Reject"
4. If approved:
   - Amount is deducted from provider's wallet
   - Withdrawal status changes to "completed"
   - Provider receives message: "Cash will be credited within 1 business day"
5. If rejected:
   - Admin enters rejection reason
   - Provider can see reason in their dashboard

**API Endpoints:**
- `GET /api/wallet/admin/pending-withdrawals` - Get all pending
- `POST /api/wallet/admin/approve-withdrawal/:id` - Approve
- `POST /api/wallet/admin/reject-withdrawal/:id` - Reject

### 3. Report Management 🚨

**What it does:**
- View all user reports against parking providers
- See report details (rating, reasons, comments)
- Delete problematic provider accounts

**When to delete a provider:**
- Multiple reports (3+) for same issues
- Serious violations (unsafe space, fraud, etc.)
- Repeated complaints

**Workflow:**
1. Driver gives 1-2 star rating and submits report
2. Admin sees report in "Reports" section
3. Admin clicks "View" to see full details
4. Admin clicks "Delete Provider" if necessary
5. Confirmation required (type "DELETE")
6. Provider account, parking spaces, and active bookings are removed

**What gets deleted:**
- Provider account
- All parking spaces owned by provider
- Active bookings are cancelled

**API Endpoints:**
- `GET /api/reports/admin/pending` - Get all pending reports
- `DELETE /api/owner/admin/delete/:providerId` - Delete provider

### 4. Support Tickets 🆘

**What it does:**
- Handle enquiries and complaints
- Process ASP Insurance claims
- Resolve tickets with admin response

**Types:**
- **Enquiry** (💬) - General questions
- **Complaint** (🚨) - Issues, accidents, damages

**Insurance Claims:**
When viewing a complaint ticket, if the user has ASP Insurance:
1. Admin sees insurance tier (Silver/Gold/Platinum)
2. Admin enters claim amount
3. System checks if amount is within tier limit
4. If approved, amount is credited to user's wallet
5. User receives insurance payout

**Workflow:**
1. User submits ticket from dashboard
2. Admin sees ticket in "Support Tickets" section
3. Admin clicks "View" to see details
4. If complaint + user has insurance → Admin can process claim
5. Admin clicks "Resolve" and enters response
6. User sees admin response in their dashboard

**API Endpoints:**
- `GET /api/support/admin/open` - Get all open tickets
- `GET /api/support/ticket/:id` - Get ticket details
- `POST /api/support/admin/resolve/:id` - Resolve ticket
- `POST /api/verification/process-claim` - Process insurance claim

### 5. User Management 👥

**What it does:**
- View all registered users
- See user details
- Delete user accounts if needed

**Workflow:**
1. Admin clicks "Users" section
2. Sees list of all users with email, role, join date
3. Can view details or delete account

**API Endpoints:**
- `GET /api/owner/all` - Get all users
- `GET /api/owner/:userId` - Get user details
- `DELETE /api/owner/admin/delete/:providerId` - Delete user

## Security

### Password Protection
- Admin panel requires password on first access
- Password stored in localStorage after successful login
- Change default password in `admin.html` line 52

### Recommended Security Measures
1. Change default password immediately
2. Use strong password (min 12 characters)
3. Don't share admin credentials
4. Clear browser data after admin session
5. Consider adding IP whitelist
6. Add 2FA for production

## Installation

### 1. Deploy Files
```bash
# Add admin files
git add frontend/admin.html
git add frontend/admin-functions.js
git add ADMIN_DASHBOARD_GUIDE.md

# Commit
git commit -m "Add admin dashboard"

# Push to deploy
git push origin main
```

### 2. Update Backend Routes
All admin endpoints are already added to:
- `backend/routes/wallet.js` - Withdrawal management
- `backend/routes/support.js` - Support tickets
- `backend/routes/verification.js` - Insurance claims
- `backend/routes/owner.js` - User management
- `backend/routes/reports.js` - Report management

### 3. Access Admin Panel
```
https://your-domain.com/admin.html
```

## Usage Examples

### Example 1: Approve Withdrawal
```
1. Go to "Withdrawals" section
2. See: "John Doe requests ₹5000"
3. Click "Approve"
4. Confirm action
5. System deducts ₹5000 from John's wallet
6. John sees "Withdrawal approved - Cash will be credited in 1 day"
```

### Example 2: Handle Report & Delete Provider
```
1. Go to "Reports" section
2. See: "3 reports against Provider XYZ"
3. Click "View" to see details
4. Reports show: dirty space, misleading photos, rude behavior
5. Click "Delete Provider"
6. Type "DELETE" to confirm
7. Provider account removed from platform
```

### Example 3: Process Insurance Claim
```
1. Go to "Support Tickets" section
2. See complaint: "Car damaged in parking"
3. Click "View"
4. System shows: "User has GOLD insurance (Limit: ₹50,000)"
5. Enter claim amount: ₹15,000
6. Click OK
7. ₹15,000 credited to user's wallet
8. Click "Resolve" and enter response
9. User sees payout and admin response
```

## Troubleshooting

### Issue: "Password incorrect"
- Check password in `admin.html` line 52
- Clear browser cache and try again

### Issue: "No data showing"
- Check backend server is running
- Check API URLs in `config.js`
- Check browser console for errors

### Issue: "Withdrawal approval fails"
- Check provider has sufficient wallet balance
- Check withdrawal ID is correct
- Check backend logs for errors

### Issue: "Cannot delete provider"
- Check provider ID is correct
- Check database connection
- Ensure confirmation text is exactly "DELETE"

## Best Practices

1. **Review before action** - Always view details before approving/deleting
2. **Document decisions** - Add notes when rejecting withdrawals
3. **Fair evaluation** - Check multiple reports before deleting accounts
4. **Timely response** - Resolve tickets within 24-48 hours
5. **Insurance verification** - Verify claim legitimacy before approval
6. **Regular monitoring** - Check dashboard daily for pending items

## Future Enhancements

Potential improvements:
- Email notifications for admin actions
- Audit log for all admin activities
- Bulk actions (approve multiple withdrawals)
- Advanced filtering and search
- Analytics and reports
- Role-based access (super admin, moderator)
- 2FA authentication
- Activity dashboard with charts

## Support

For admin panel issues:
- Check browser console for errors
- Check backend logs
- Verify all routes are deployed
- Test API endpoints directly
- Contact development team

## Change Log

### Version 1.0.0 (Current)
- Initial admin dashboard release
- Withdrawal management
- Report management with provider deletion
- Support ticket handling
- Insurance claim processing
- User management
