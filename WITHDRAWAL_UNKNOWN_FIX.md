# Fix: Withdrawal Showing "Unknown" User

## Problem
Admin panel shows "Unknown" instead of user name when users request cash withdrawal.

## Root Cause
The backend endpoint `/api/wallet/admin/pending-withdrawals` only checks the `ParkingOwner` model for user details. However, users who register through the new verification system are stored in the `User` model, not `ParkingOwner`.

## Solution
Updated the endpoint to check BOTH models:
1. First checks `ParkingOwner` (for old users/providers)
2. If not found, checks `User` (for new verified users)
3. Returns user details from whichever model has the user

## Code Changes

### File: `backend/routes/wallet.js`

**Before:**
```javascript
const owner = await ParkingOwner.findById(w.ownerId);
return {
  ...w.toObject(),
  ownerId: owner ? {
    _id: owner._id,
    name: owner.name,
    email: owner.email
  } : {
    _id: w.ownerId,
    name: 'Unknown',
    email: ''
  }
};
```

**After:**
```javascript
// Try ParkingOwner first
let owner = await ParkingOwner.findById(w.ownerId);

if (!owner) {
  // If not found, try User model
  owner = await User.findById(w.ownerId);
}

if (owner) {
  return {
    ...w.toObject(),
    ownerId: {
      _id: owner._id,
      name: owner.name,
      email: owner.email
    }
  };
} else {
  return {
    ...w.toObject(),
    ownerId: {
      _id: w.ownerId,
      name: 'Unknown User',
      email: 'User not found in database'
    }
  };
}
```

## Enhanced Logging

Added detailed console logging to help debug:

```javascript
console.log("=== FETCHING PENDING WITHDRAWALS ===");
console.log(`Found ${withdrawals.length} pending withdrawals`);
console.log(`--- Processing Withdrawal ---`);
console.log(`Withdrawal ID: ${w._id}`);
console.log(`Owner ID: ${w.ownerId}`);
console.log(`Amount: ₹${w.amount}`);
console.log(`✅ Found in ParkingOwner: ${owner.name}`);
console.log(`❌ Not found in ParkingOwner, checking User model...`);
console.log(`✅ Found in User: ${owner.name}`);
console.log(`❌ Not found in User model either!`);
console.log(`⚠️ Owner ID ${w.ownerId} does not exist in any model`);
```

## Deployment Steps

### 1. Deploy Backend to Render

```bash
# Commit changes
git add backend/routes/wallet.js
git commit -m "Fix: Check both ParkingOwner and User models for withdrawals"
git push origin main
```

Render will auto-deploy (takes 2-3 minutes).

### 2. Verify Deployment

Check Render logs for:
```
✅ MongoDB Connected
🚀 Server started on port 3000
```

### 3. Test the Fix

1. **Open admin panel:**
   - URL: https://park-fbps-git-main-alen-nelsons-projects.vercel.app/admin.html
   - Password: asp2024admin

2. **Click "Withdrawals" section**

3. **Check the logs on Render:**
   - Go to Render dashboard → Your service → Logs
   - Should see:
   ```
   === FETCHING PENDING WITHDRAWALS ===
   Found 1 pending withdrawals
   --- Processing Withdrawal ---
   Withdrawal ID: ...
   Owner ID: ...
   Amount: ₹5000
   ❌ Not found in ParkingOwner, checking User model...
   ✅ Found in User: [User Name] ([email])
   ✅ Returning 1 withdrawals
   ```

4. **Check admin panel:**
   - Should now show user name instead of "Unknown"
   - Should show user email

## Why This Happens

### Two User Models:

1. **ParkingOwner Model** (`backend/models/ParkingOwner.js`)
   - Used for old users who registered before verification system
   - Used for parking space providers
   - No ID verification required

2. **User Model** (`backend/models/user.js`)
   - Used for new users who register with ID verification
   - Requires ID proof upload
   - Admin must approve before login

### Withdrawal Flow:

```
User registers → Stored in User model
   ↓
User lists parking space → Can earn money
   ↓
Money goes to wallet (linked by ownerId)
   ↓
User requests withdrawal → Creates Withdrawal document with ownerId
   ↓
Admin views withdrawals → Backend looks up user by ownerId
   ↓
OLD CODE: Only checked ParkingOwner → Not found → Shows "Unknown"
NEW CODE: Checks ParkingOwner, then User → Found → Shows name ✅
```

## Troubleshooting

### Still showing "Unknown" after deployment:

**Check 1: Deployment completed?**
- Go to Render dashboard
- Check if deployment finished
- Look for "Live" status

**Check 2: Backend logs**
```
=== FETCHING PENDING WITHDRAWALS ===
Found 1 pending withdrawals
--- Processing Withdrawal ---
Owner ID: 65f1234567890abcdef
❌ Not found in ParkingOwner, checking User model...
❌ Not found in User model either!
⚠️ Owner ID 65f1234567890abcdef does not exist in any model
```

If you see "not found in User model either", the user doesn't exist in database.

**Check 3: User exists in database?**
- Login to MongoDB Atlas
- Browse collections → users
- Search for the ownerId
- If not found, user was deleted or never created

**Check 4: Correct ownerId?**
- Check withdrawal document in MongoDB
- Verify ownerId field matches a real user
- If ownerId is wrong, withdrawal was created with wrong ID

### User exists but still shows "Unknown":

**Possible causes:**
1. Browser cache - Clear cache or use incognito
2. Old API response cached - Wait 1 minute and refresh
3. Backend not restarted - Check Render logs for restart
4. Wrong database - Check MongoDB connection string

## Testing Scenarios

### Scenario 1: New User (User Model)
```
1. User registers with ID verification
2. Gets approved by admin
3. Lists parking space
4. Earns money from bookings
5. Requests withdrawal
6. Admin sees: ✅ User Name (email@example.com)
```

### Scenario 2: Old User (ParkingOwner Model)
```
1. User registered before verification system
2. Already has parking spaces
3. Earns money from bookings
4. Requests withdrawal
5. Admin sees: ✅ Provider Name (email@example.com)
```

### Scenario 3: Deleted User
```
1. User registered and requested withdrawal
2. Admin deleted user account
3. Withdrawal still pending
4. Admin sees: ⚠️ Unknown User (User not found in database)
```

## Expected Backend Logs

### Success Case (User Found):
```
=== FETCHING PENDING WITHDRAWALS ===
Found 1 pending withdrawals

--- Processing Withdrawal ---
Withdrawal ID: 65f1234567890abcdef
Owner ID: 65f9876543210fedcba
Amount: ₹5000
❌ Not found in ParkingOwner, checking User model...
✅ Found in User: John Doe (john@example.com)

✅ Returning 1 withdrawals
=== END FETCHING WITHDRAWALS ===
```

### Failure Case (User Not Found):
```
=== FETCHING PENDING WITHDRAWALS ===
Found 1 pending withdrawals

--- Processing Withdrawal ---
Withdrawal ID: 65f1234567890abcdef
Owner ID: 65f9876543210fedcba
Amount: ₹5000
❌ Not found in ParkingOwner, checking User model...
❌ Not found in User model either!
⚠️ Owner ID 65f9876543210fedcba does not exist in any model
⚠️ Returning "Unknown User" for withdrawal 65f1234567890abcdef

✅ Returning 1 withdrawals
=== END FETCHING WITHDRAWALS ===
```

## Summary

✅ **Fixed:** Withdrawal endpoint now checks both user models
✅ **Enhanced:** Added detailed logging for debugging
✅ **Result:** Admin sees correct user names instead of "Unknown"

**Next Step:** Deploy to Render and test!

---

**File Changed:** `backend/routes/wallet.js`
**Status:** ✅ Ready to deploy
**Impact:** Admin can now see who requested withdrawals
