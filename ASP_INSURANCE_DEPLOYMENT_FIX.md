# ASP Insurance Priority System - Deployment Fix

## Issue
User with PLATINUM ASP insurance submitted a complaint, but the admin panel shows:
- ❌ Priority: MEDIUM (should be HIGH)
- ❌ No green background
- ❌ No 🛡️ ASP PROTECTED badge
- ❌ No insurance tier displayed

## Root Causes

### 1. Field Name Mismatch
- **Verification model** uses `ownerId` field
- **Support ticket** was checking `userId` field
- They didn't match, so insurance wasn't detected

### 2. Tier Names Mismatch
- **Verification model** uses: `silver`, `gold`, `platinum`
- **Support ticket model** was expecting: `basic`, `premium`
- Enum validation would fail

### 3. Old Tickets
- Tickets created before the changes don't have insurance fields
- Need to retroactively update them

## Fixes Applied

### 1. Updated Support Ticket Creation (`backend/routes/support.js`)
```javascript
// Now checks BOTH ownerId and userId
let verification = await Verification.findOne({ ownerId: userId, status: 'active' });
if (!verification) {
  verification = await Verification.findOne({ userId: userId, status: 'active' });
}
```

### 2. Updated Support Ticket Model (`backend/models/SupportTicket.js`)
```javascript
insuranceTier: {
  type: String,
  enum: ['silver', 'gold', 'platinum', null], // ← Fixed tier names
  default: null
}
```

### 3. Updated Admin Endpoint (`backend/routes/support.js`)
```javascript
// GET /api/support/admin/open now:
// 1. Fetches all open tickets
// 2. Checks each user's insurance status
// 3. Updates old tickets with insurance info
// 4. Returns enriched data with insurance fields
```

### 4. Updated Insurance Claim Processing (`backend/routes/verification.js`)
```javascript
// Now checks BOTH ownerId and userId
let verification = await Verification.findOne({ ownerId: userId, status: 'active' });
if (!verification) {
  verification = await Verification.findOne({ userId: userId, status: 'active' });
}
```

## How It Works Now

### For New Tickets:
1. User submits complaint
2. Backend checks: `Verification.findOne({ ownerId: userId })` OR `Verification.findOne({ userId: userId })`
3. If found: Set priority=HIGH, hasInsurance=true, insuranceTier='platinum'
4. Console log: "🛡️ ASP Protection user detected: [Name] (PLATINUM tier) - Setting HIGH priority"

### For Existing Tickets:
1. Admin opens Support Tickets section
2. Backend fetches all open tickets
3. For each ticket, checks user's current insurance status
4. If user has insurance but ticket doesn't show it:
   - Updates ticket in database
   - Sets hasInsurance=true, insuranceTier='platinum', priority='high'
   - Console log: "✅ Updated ticket [ID] with insurance info: PLATINUM"
5. Returns enriched tickets to frontend

### Frontend Display:
1. Receives tickets with insurance fields
2. If `hasInsurance === true`:
   - Adds green background to row
   - Shows 🛡️ ASP PROTECTED badge
   - Shows ⚡ on priority badge
   - Displays tier (SILVER/GOLD/PLATINUM)

## Deployment Steps

### Step 1: Deploy Backend to Render
1. Push changes to Git repository
2. Render will auto-deploy (if auto-deploy enabled)
3. OR manually deploy from Render dashboard

### Step 2: Verify Deployment
Check Render logs for:
```
✅ Updated ticket [ID] with insurance info: PLATINUM
🛡️ ASP Protection user detected: [Name] (PLATINUM tier) - Setting HIGH priority
```

### Step 3: Test in Admin Panel
1. Go to admin panel: `https://park-fbps-git-main-alen-nelsons-projects.vercel.app/admin.html`
2. Login with password: `asp2024admin`
3. Click "Support Tickets"
4. Existing ticket should now show:
   - ✅ Green background
   - ✅ 🛡️ ASP PROTECTED badge
   - ✅ HIGH ⚡ priority
   - ✅ PLATINUM tier

### Step 4: Test New Ticket
1. Have user with insurance submit new complaint
2. Check admin panel
3. Should immediately show all insurance indicators

## Expected Results

### Admin Panel - Support Tickets List

**Before Fix:**
```
┌──────────────┬────────────┬──────────┬──────────┬─────────┐
│ User         │ Type       │ Subject  │ Priority │ Actions │
├──────────────┼────────────┼──────────┼──────────┼─────────┤
│ achu         │ Complaint  │ my asp   │ MEDIUM   │ View    │
│ achu@...     │            │ claim    │          │ Resolve │
└──────────────┴────────────┴──────────┴──────────┴─────────┘
```

**After Fix:**
```
┌──────────────────────────┬────────────┬──────────┬──────────┬─────────┐
│ User                     │ Type       │ Subject  │ Priority │ Actions │
├──────────────────────────┼────────────┼──────────┼──────────┼─────────┤
│ achu 🛡️ ASP PROTECTED   │ Complaint  │ my asp   │ HIGH ⚡  │ View    │
│ achu@gmail.com           │            │ claim    │          │ Resolve │
└──────────────────────────┴────────────┴──────────┴──────────┴─────────┘
     ↑ Green background
```

### Ticket Details Modal

**Shows:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎫 Ticket Details                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🛡️ ASP INSURANCE PROTECTED                              ││
│ │ Tier: PLATINUM | Priority: HIGH ⚡                       ││
│ │ Eligible for insurance claim up to tier limit           ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ User: achu (achu@gmail.com)                                │
│ Type: 🚨 Complaint                                          │
│ Priority: HIGH                                              │
│ Subject: my asp protection claim                           │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

## Console Logs to Watch For

### Backend Logs (Render)

**When admin opens Support Tickets:**
```
GET /api/support/admin/open
No insurance found for ticket 123abc, userId: 456def
✅ Updated ticket 789xyz with insurance info: PLATINUM
```

**When new ticket is created:**
```
POST /api/support/create
🛡️ ASP Protection user detected: achu (PLATINUM tier) - Setting HIGH priority
Support ticket created: 789xyz by achu with 0 images [ASP PROTECTED - HIGH PRIORITY]
```

**When insurance claim is processed:**
```
POST /api/verification/process-claim
✅ Insurance claim processed: ₹5,000 credited to user 456def (PLATINUM tier) for ticket 789xyz
```

### Frontend Logs (Browser Console)

```
Loading support tickets...
Found 1 tickets
Ticket has insurance: true, tier: platinum
Displaying with ASP protection badge
```

## Troubleshooting

### Issue: Still shows MEDIUM priority

**Check:**
1. Backend deployed? Check Render dashboard
2. Hard refresh admin panel (Ctrl+Shift+R)
3. Check Render logs for "✅ Updated ticket" message
4. Check browser console for errors

**Solution:**
- Wait for Render to deploy (2-3 minutes)
- Clear browser cache
- Check if userId in ticket matches ownerId in Verification

### Issue: No insurance badge

**Check:**
1. Does user actually have active insurance?
2. Check MongoDB: `db.verifications.findOne({ ownerId: "userId", status: "active" })`
3. Check Render logs for "No insurance found" message

**Solution:**
- Verify user has active insurance in database
- Check that ownerId matches userId in ticket
- Restart backend if needed

### Issue: Can't allocate insurance money

**Check:**
1. Is claim amount within tier limit?
2. Check Render logs for error messages
3. Verify wallet exists for user

**Solution:**
- Check tier limits: Silver (₹3,000), Gold (₹5,000), Platinum (₹10,000)
- Create wallet if missing
- Check transaction logs

## Insurance Tier Limits

### Silver Tier
- **Claim Limit:** ₹3,000
- **Priority:** HIGH
- **Badge:** 🛡️ ASP PROTECTED

### Gold Tier
- **Claim Limit:** ₹5,000
- **Priority:** HIGH
- **Badge:** 🛡️ ASP PROTECTED

### Platinum Tier
- **Claim Limit:** ₹10,000
- **Priority:** HIGH
- **Badge:** 🛡️ ASP PROTECTED

## Files Modified

1. **backend/routes/support.js**
   - Fixed field name mismatch (ownerId vs userId)
   - Added retroactive update for old tickets
   - Enhanced logging

2. **backend/models/SupportTicket.js**
   - Fixed tier enum (silver, gold, platinum)

3. **backend/routes/verification.js**
   - Fixed field name mismatch
   - Enhanced error messages with tier info

4. **frontend/admin-functions.js**
   - Already updated with visual indicators
   - No changes needed

## Testing Checklist

- [ ] Backend deployed to Render
- [ ] Render logs show no errors
- [ ] Admin panel hard refreshed
- [ ] Existing ticket shows green background
- [ ] Existing ticket shows 🛡️ badge
- [ ] Existing ticket shows HIGH ⚡ priority
- [ ] Existing ticket shows PLATINUM tier
- [ ] Ticket details modal shows insurance banner
- [ ] Can allocate insurance money
- [ ] Money credited to wallet with special message
- [ ] User can see credit in wallet
- [ ] New tickets automatically get HIGH priority

## Summary

The system now correctly detects ASP insurance by checking both `ownerId` and `userId` fields, uses the correct tier names (silver/gold/platinum), and automatically updates old tickets when the admin panel loads. After deploying to Render and refreshing the admin panel, all insurance indicators should appear correctly.
