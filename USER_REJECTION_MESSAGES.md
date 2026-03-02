# User Rejection Messages - Complete Guide

## Overview
When admin rejects a user's account verification, the user will see the rejection reason when they try to login. This provides clear communication about why their account was not approved.

## How It Works

### Step 1: Admin Rejects User

**Admin Action:**
1. Admin opens Users section in admin panel
2. Clicks "View ID" to review user's ID proof
3. Clicks "✗ Reject" button
4. System prompts: "Enter rejection reason:"

**Admin Types Reason:**
```
Examples:
- "ID proof is not clear. Please submit a clearer image."
- "ID proof does not match the name provided."
- "Submitted document is not a valid government ID."
- "ID proof appears to be fake or tampered."
- "Unable to verify identity. Please contact support."
```

**Backend Saves:**
```javascript
user.verificationStatus = 'rejected';
user.rejectionReason = "ID proof is not clear. Please submit a clearer image.";
user.verifiedAt = new Date();
user.verifiedBy = 'Admin';
```

### Step 2: User Tries to Login

**User Action:**
1. User goes to login page
2. Enters email and password
3. Clicks "Login"

**Backend Check:**
```javascript
if (user.verificationStatus === 'rejected') {
  return {
    error: "VERIFICATION_REJECTED",
    rejected: true,
    rejectionReason: user.rejectionReason,
    message: "Account verification rejected..."
  };
}
```

**Frontend Display:**
```
❌ ACCOUNT VERIFICATION REJECTED

ID proof is not clear. Please submit a clearer image.

Your account cannot be activated. Please contact ASP 
support at support@asp.com for more information or to 
appeal this decision.

[OK]
```

## Message Types

### 1. Pending Verification Message
**When:** User tries to login before admin reviews
**Message:**
```
⏳ ACCOUNT PENDING VERIFICATION

Your account is currently under review by our admin team.

You will be able to login once your ID proof is verified. 
This usually takes 24-48 hours.

Thank you for your patience!
```

### 2. Rejected Verification Message
**When:** Admin rejects user with reason
**Message:**
```
❌ ACCOUNT VERIFICATION REJECTED

[Admin's rejection reason here]

Your account cannot be activated. Please contact ASP 
support at support@asp.com for more information or to 
appeal this decision.
```

### 3. Banned Account Message
**When:** Admin bans user
**Message:**
```
⛔ ACCOUNT BANNED

[Admin's ban reason here]

Banned on: [Date]

Your parking spaces have been removed and you can no 
longer access ASP services.

If you believe this is a mistake, please contact ASP 
support at support@asp.com
```

## Common Rejection Reasons

### ID Quality Issues:
- "ID proof image is too blurry. Please upload a clear, high-resolution image."
- "ID proof is not fully visible. Please upload complete document."
- "Image quality is poor. Please take a new photo in good lighting."

### ID Validity Issues:
- "Submitted document is not a valid government-issued ID."
- "ID proof has expired. Please submit a current, valid ID."
- "This type of ID is not accepted. Please submit Aadhaar, Passport, or Driving License."

### Information Mismatch:
- "Name on ID does not match registration name."
- "ID proof does not match the information provided."
- "Unable to verify the details on the ID proof."

### Fraud/Security Issues:
- "ID proof appears to be tampered or fake."
- "Document authenticity could not be verified."
- "Security concerns with submitted ID. Please contact support."

### Technical Issues:
- "Unable to open the uploaded file. Please resubmit in JPG, PNG, or PDF format."
- "File is corrupted. Please upload again."

## User Experience Flow

### Scenario 1: Clear ID Rejection

**Admin Action:**
```
Rejection Reason: "ID proof image is too blurry. Please upload a clear photo."
```

**User Sees:**
```
❌ ACCOUNT VERIFICATION REJECTED

ID proof image is too blurry. Please upload a clear photo.

Your account cannot be activated. Please contact ASP 
support at support@asp.com for more information or to 
appeal this decision.
```

**User Can:**
- Contact support@asp.com
- Explain the situation
- Request to resubmit with better quality ID
- Appeal the decision

### Scenario 2: Fraud Detection

**Admin Action:**
```
Rejection Reason: "ID proof appears to be fake. Account flagged for security review."
```

**User Sees:**
```
❌ ACCOUNT VERIFICATION REJECTED

ID proof appears to be fake. Account flagged for security review.

Your account cannot be activated. Please contact ASP 
support at support@asp.com for more information or to 
appeal this decision.
```

**User Can:**
- Contact support to explain
- Provide additional verification
- Submit different ID proof

### Scenario 3: Information Mismatch

**Admin Action:**
```
Rejection Reason: "Name on ID (John Smith) does not match registration name (John Doe)."
```

**User Sees:**
```
❌ ACCOUNT VERIFICATION REJECTED

Name on ID (John Smith) does not match registration name (John Doe).

Your account cannot be activated. Please contact ASP 
support at support@asp.com for more information or to 
appeal this decision.
```

**User Can:**
- Explain name discrepancy
- Provide name change documents
- Correct registration information

## Backend Implementation

### Login Endpoint Check:
```javascript
// Check verification status
if (user.verificationStatus === 'rejected') {
  console.log(`❌ Rejected user attempted login: ${email}`);
  return res.json({
    error: "VERIFICATION_REJECTED",
    rejected: true,
    rejectionReason: user.rejectionReason || 'Your account verification was rejected',
    message: `❌ Account Verification Rejected\n\n${user.rejectionReason}...`
  });
}
```

### Rejection Endpoint:
```javascript
router.post("/admin/reject-user/:userId", async (req, res) => {
  const { reason } = req.body;
  
  user.verificationStatus = 'rejected';
  user.rejectionReason = reason || 'ID verification failed';
  user.verifiedAt = new Date();
  user.verifiedBy = 'Admin';
  await user.save();
  
  console.log(`❌ User rejected: ${user.name} - Reason: ${reason}`);
});
```

## Frontend Implementation

### Login Page Handling:
```javascript
// Check if verification was rejected
if (data.rejected || data.error === "VERIFICATION_REJECTED") {
  document.getElementById("loadingOverlay").classList.remove("active");
  const rejectionReason = data.rejectionReason || 'Your account verification was rejected by admin';
  alert(`❌ ACCOUNT VERIFICATION REJECTED\n\n${rejectionReason}\n\nYour account cannot be activated. Please contact ASP support...`);
  return;
}
```

## Admin Best Practices

### Writing Good Rejection Reasons:

**✅ Good Examples:**
- Clear and specific
- Actionable (user knows what to do)
- Professional tone
- Includes next steps

```
"ID proof image is blurry. Please upload a clear, well-lit photo of your Aadhaar card."
"Name mismatch: ID shows 'John Smith' but registration shows 'John Doe'. Please contact support to correct."
"Driving license has expired (valid until 2023). Please submit a current, valid ID."
```

**❌ Bad Examples:**
- Vague or unclear
- Rude or unprofessional
- No guidance on next steps

```
"Bad ID"
"Rejected"
"Not acceptable"
"Fake"
```

### Rejection Reason Template:
```
[Issue Description] + [What user should do]

Examples:
"ID proof is not clear. Please submit a high-quality image."
"Document type not accepted. Please submit Aadhaar, Passport, or Driving License."
"Information mismatch detected. Please contact support at support@asp.com."
```

## Console Logs

### Backend Logs (Render):

**When user is rejected:**
```
POST /api/auth/admin/reject-user/123abc
❌ User rejected: John Doe (john@example.com) - Reason: ID proof is not clear
```

**When rejected user tries to login:**
```
POST /api/auth/login
Login request: { email: 'john@example.com' }
❌ Rejected user attempted login: john@example.com
```

### Frontend Logs (Browser Console):

**When rejected user tries to login:**
```
Login clicked { email: 'john@example.com', password: '***' }
Response status: 200
Server response: { 
  error: 'VERIFICATION_REJECTED', 
  rejected: true, 
  rejectionReason: 'ID proof is not clear. Please submit a clearer image.'
}
```

## Testing Checklist

- [ ] Admin can reject user with custom reason
- [ ] Rejection reason is saved in database
- [ ] Rejected user cannot login
- [ ] Rejected user sees rejection reason in alert
- [ ] Message includes support contact info
- [ ] Message is clear and professional
- [ ] User can understand what went wrong
- [ ] Console logs show rejection activity
- [ ] Different rejection reasons display correctly
- [ ] Long rejection reasons display properly

## Support Contact Information

All rejection messages include:
```
Please contact ASP support at support@asp.com for more 
information or to appeal this decision.
```

This allows users to:
- Ask questions about rejection
- Provide additional information
- Appeal the decision
- Resubmit with corrections

## Database Schema

### User Model Fields:
```javascript
{
  verificationStatus: 'rejected',
  rejectionReason: 'ID proof is not clear. Please submit a clearer image.',
  verifiedAt: Date,
  verifiedBy: 'Admin'
}
```

## Files Modified

1. ✅ `frontend/login.html` - Added rejection message handling
2. ✅ `backend/routes/auth.js` - Returns rejection reason on login
3. ✅ `frontend/admin-functions.js` - Admin can enter rejection reason
4. ✅ `backend/models/user.js` - Stores rejection reason

## Summary

The system now provides clear communication when users are rejected:

1. **Admin rejects** with specific reason
2. **Reason is saved** in database
3. **User tries to login** and is blocked
4. **User sees rejection reason** in alert message
5. **User knows what to do** (contact support)

This creates transparency and allows users to understand why their account was not approved and what steps they can take to resolve the issue.
