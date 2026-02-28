# ASP Insurance Priority System - Complete Guide

## Overview
Users with ASP Insurance Protection receive HIGH PRIORITY treatment when they submit complaints. When admin allocates insurance money, it's credited to their wallet with a special message from the ASP Official Protection Team.

## Key Features

### ✅ 1. Automatic HIGH Priority
- When a user with ASP insurance submits a complaint, it's automatically marked as HIGH priority
- No manual priority selection needed
- System detects insurance status automatically

### ✅ 2. Visual Indicators
- **Green background** on ticket row in admin panel
- **🛡️ ASP PROTECTED** badge next to user name
- **⚡ Lightning bolt** on priority badge
- **Insurance tier** displayed (BASIC or PREMIUM)

### ✅ 3. Insurance Claim Processing
- Admin can allocate money for damages
- Money credited directly to user's wallet
- Special message from ASP Official Protection Team
- User can withdraw the money anytime

### ✅ 4. Claim Tracking
- Ticket shows if claim has been processed
- Amount credited is displayed
- Transaction history includes insurance details

## How It Works

### Step 1: User Submits Complaint

**User Side:**
1. User with ASP insurance submits a complaint
2. Uploads damage photos
3. Describes the issue

**Backend Process:**
```javascript
// System checks if user has ASP insurance
const verification = await Verification.findOne({ userId, status: 'active' });

if (verification) {
  // Automatically set HIGH priority
  ticketPriority = 'high';
  hasInsurance = true;
  insuranceTier = verification.tier; // 'basic' or 'premium'
}
```

**Console Log:**
```
🛡️ ASP Protection user detected: John Doe (PREMIUM tier) - Setting HIGH priority
Support ticket created: 123abc [ASP PROTECTED - HIGH PRIORITY]
```

### Step 2: Admin Views Ticket

**Admin Panel Display:**
```
┌────────────────────────────────────────────────────────────────┐
│ User          │ Type       │ Subject    │ Priority │ Actions   │
├───────────────┼────────────┼────────────┼──────────┼───────────┤
│ John Doe      │ 🚨 Complaint│ Car damage │ HIGH ⚡  │ 👁️ View   │
│ 🛡️ ASP PROTECTED│            │            │          │ ✓ Resolve │
│ john@...      │            │            │          │           │
└───────────────┴────────────┴────────────┴──────────┴───────────┘
     ↑ Green background indicates ASP protected user
```

**Ticket Details Modal:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎫 Ticket Details                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🛡️ ASP INSURANCE PROTECTED                              ││
│ │ Tier: PREMIUM | Priority: HIGH ⚡                        ││
│ │ Eligible for insurance claim up to tier limit           ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ User: John Doe (john@example.com)                          │
│ Type: 🚨 Complaint                                          │
│ Subject: Car damaged in parking                            │
│ Description: My car was scratched...                       │
│                                                             │
│ 📷 Attached Images (3)                                      │
│ [Image 1] [Image 2] [Image 3]                              │
│                                                             │
│ [Close]                                                     │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Admin Allocates Insurance Money

**Admin Action:**
1. Admin reviews the complaint and damage photos
2. Determines the claim amount
3. System prompts for insurance claim

**Prompt Dialog:**
```
┌─────────────────────────────────────────────────────────────┐
│ User has PREMIUM insurance (Limit: ₹10,000)                │
│                                                             │
│ Enter claim amount to allocate (or 0 to skip):             │
│ [_______]                                                   │
│                                                             │
│ [Cancel] [OK]                                               │
└─────────────────────────────────────────────────────────────┘
```

**Admin enters amount:** ₹5,000

**Backend Process:**
```javascript
// 1. Verify insurance tier and limit
if (claimAmount > verification.claimLimit) {
  return error('Claim amount exceeds tier limit');
}

// 2. Credit to wallet
wallet.balance += claimAmount;
wallet.totalEarnings += claimAmount;

// 3. Create transaction with special message
const transaction = new Transaction({
  type: 'credit',
  amount: claimAmount,
  description: `💰 Insurance Claim Approved - ₹${claimAmount} credited for your complaint. With regards, ASP Official Protection Team 🛡️`,
  metadata: {
    ticketId: ticketId,
    insuranceTier: 'premium',
    claimReason: 'Car damage claim'
  }
});

// 4. Mark ticket as claim processed
ticket.insuranceClaimProcessed = true;
ticket.insuranceClaimAmount = claimAmount;
```

**Success Message:**
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Insurance claim processed!                               │
│                                                             │
│ ₹5,000 credited to user's wallet                           │
│                                                             │
│ [OK]                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: User Sees Credit in Wallet

**User's Wallet:**
```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Wallet Balance: ₹5,000                                   │
│                                                             │
│ Recent Transactions:                                        │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ + ₹5,000                                                ││
│ │ 💰 Insurance Claim Approved - ₹5,000 credited for your ││
│ │ complaint. With regards, ASP Official Protection Team 🛡️││
│ │ Date: 2/27/2026, 10:30 AM                               ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [Withdraw Money]                                            │
└─────────────────────────────────────────────────────────────┘
```

### Step 5: User Withdraws Money

**Withdrawal Request:**
- User can withdraw the insurance money
- Money is transferred to their bank account
- Withdrawal request shows in admin panel

**Admin Approval:**
- Admin sees withdrawal request
- Approves the withdrawal
- Money deducted from wallet
- User receives payment within 1 business day

## Database Schema

### SupportTicket Model (Enhanced)
```javascript
{
  userId: ObjectId,
  userName: String,
  userEmail: String,
  category: String, // 'complaint', 'enquiry', etc.
  priority: String, // 'low', 'medium', 'high', 'urgent'
  subject: String,
  description: String,
  attachments: [String], // Image paths
  status: String, // 'open', 'resolved', etc.
  
  // NEW FIELDS:
  hasInsurance: Boolean, // true if user has ASP insurance
  insuranceTier: String, // 'basic' or 'premium'
  insuranceClaimProcessed: Boolean, // true if claim allocated
  insuranceClaimAmount: Number // Amount credited
}
```

### Transaction Model (Enhanced)
```javascript
{
  ownerId: String,
  type: String, // 'credit' or 'debit'
  amount: Number,
  description: String, // Special message for insurance claims
  balanceAfter: Number,
  
  // NEW FIELD:
  metadata: {
    ticketId: String,
    insuranceTier: String,
    claimReason: String
  }
}
```

## API Endpoints

### POST /api/support/create
**Enhanced to detect ASP insurance**

**Request:**
```json
{
  "userId": "123abc",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "category": "complaint",
  "subject": "Car damaged",
  "description": "My car was scratched...",
  "bookingId": "456def"
}
```

**Backend Process:**
1. Check if user has active insurance
2. If yes, set priority to 'high' automatically
3. Add insurance fields to ticket

**Response:**
```json
{
  "success": true,
  "ticket": {
    "_id": "789xyz",
    "priority": "high",
    "hasInsurance": true,
    "insuranceTier": "premium",
    "status": "open"
  }
}
```

### POST /api/verification/process-claim
**Enhanced with special message**

**Request:**
```json
{
  "userId": "123abc",
  "ticketId": "789xyz",
  "claimAmount": 5000,
  "reason": "Car damage claim"
}
```

**Backend Process:**
1. Verify insurance status and tier
2. Check claim amount against tier limit
3. Credit to wallet
4. Create transaction with special message
5. Mark ticket as claim processed

**Response:**
```json
{
  "success": true,
  "message": "Insurance claim approved! ₹5,000 has been credited to your wallet. You can withdraw this amount anytime.",
  "claimAmount": 5000,
  "newBalance": 5000,
  "transaction": {
    "_id": "trans123",
    "description": "💰 Insurance Claim Approved - ₹5,000 credited for your complaint. With regards, ASP Official Protection Team 🛡️"
  }
}
```

## Visual Indicators

### Admin Panel - Ticket List

**ASP Protected User (Green Background):**
```css
background: #e8f5e9; /* Light green */
```

**ASP Protected Badge:**
```html
<span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 10px;">
  🛡️ ASP PROTECTED
</span>
```

**Priority Badge with Lightning:**
```html
<span style="background: #f44336; color: white;">
  HIGH ⚡
</span>
```

### Ticket Details Modal

**Insurance Banner:**
```html
<div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
            padding: 15px; border-radius: 10px; color: white;">
  <h3>🛡️ ASP INSURANCE PROTECTED</h3>
  <p>Tier: PREMIUM | Priority: HIGH ⚡</p>
  <p>✅ Insurance Claim Processed: ₹5,000</p>
</div>
```

## Insurance Tiers

### BASIC Tier
- **Claim Limit:** ₹5,000
- **Priority:** HIGH
- **Badge Color:** Green
- **Features:**
  - Automatic HIGH priority
  - Insurance claim up to ₹5,000
  - Special message on credit

### PREMIUM Tier
- **Claim Limit:** ₹10,000
- **Priority:** HIGH
- **Badge Color:** Green
- **Features:**
  - Automatic HIGH priority
  - Insurance claim up to ₹10,000
  - Special message on credit
  - Priority support

## Special Messages

### Transaction Description (Insurance Claim)
```
💰 Insurance Claim Approved - ₹5,000 credited for your complaint. 
With regards, ASP Official Protection Team 🛡️
```

### Success Message (Admin)
```
✅ Insurance claim processed!

₹5,000 credited to user's wallet
```

### Success Message (User)
```
Insurance claim approved! ₹5,000 has been credited to your wallet. 
You can withdraw this amount anytime.
```

## Console Logs

### Backend Logs
```
🛡️ ASP Protection user detected: John Doe (PREMIUM tier) - Setting HIGH priority
Support ticket created: 789xyz by John Doe with 3 images [ASP PROTECTED - HIGH PRIORITY]
✅ Insurance claim processed: ₹5,000 credited to user 123abc for ticket 789xyz
```

### Frontend Logs
```
Loading support tickets...
Found 5 tickets, 2 with ASP insurance
Displaying ticket 789xyz with insurance badge
```

## Testing Checklist

- [ ] User with ASP insurance submits complaint
- [ ] Ticket automatically set to HIGH priority
- [ ] Green background appears in admin panel
- [ ] 🛡️ ASP PROTECTED badge shows
- [ ] ⚡ Lightning bolt on priority badge
- [ ] Insurance banner shows in ticket details
- [ ] Admin can allocate insurance money
- [ ] Money credited to user's wallet
- [ ] Special message appears in transaction
- [ ] User can see credit in wallet
- [ ] User can withdraw the money
- [ ] Ticket shows claim processed status
- [ ] Amount credited is displayed

## Files Modified

1. **backend/routes/support.js** - Auto-detect insurance, set HIGH priority
2. **backend/models/SupportTicket.js** - Added insurance fields
3. **backend/routes/verification.js** - Enhanced claim processing with special message
4. **frontend/admin-functions.js** - Visual indicators for ASP protected users

## Benefits

### For Users:
- ✅ Automatic HIGH priority treatment
- ✅ Fast response from admin
- ✅ Insurance money credited quickly
- ✅ Special recognition as protected member
- ✅ Easy withdrawal process

### For Admin:
- ✅ Easy identification of protected users
- ✅ Visual indicators (green background, badges)
- ✅ Streamlined claim processing
- ✅ Automatic priority assignment
- ✅ Complete audit trail

### For ASP:
- ✅ Better customer service
- ✅ Increased insurance value
- ✅ Professional image
- ✅ Customer satisfaction
- ✅ Competitive advantage

## Summary

The ASP Insurance Priority System ensures that users with insurance protection receive the best possible service. Complaints are automatically marked as HIGH priority, visually highlighted in the admin panel, and insurance claims are processed with special messages that reinforce the value of ASP protection.
