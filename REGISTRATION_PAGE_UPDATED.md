# Registration Page - Updated with ID Verification

## What Changed

The registration page (`frontend/register.html`) has been updated to include mandatory ID proof upload for user verification.

## New Fields Added

### 1. Phone Number Field
```html
<input id="phone" type="tel" placeholder="Phone Number" required>
```
- Required field
- Accepts phone numbers
- Used for user contact

### 2. ID Proof Type Selection
```html
<select id="idProofType" required>
  <option value="">Select ID Proof Type *</option>
  <option value="aadhaar">Aadhaar Card</option>
  <option value="passport">Passport</option>
  <option value="driving_license">Driving License</option>
  <option value="voter_id">Voter ID</option>
  <option value="pan_card">PAN Card</option>
</select>
```
- Dropdown selection
- Required field
- Supports multiple ID types

### 3. ID Proof File Upload
```html
<div class="file-upload-wrapper">
  <label class="file-upload-label">
    Upload ID Proof *
  </label>
  <input type="file" id="idProof" accept="image/*,application/pdf" required>
  <div class="file-info">
    📄 Accepted: JPG, PNG, PDF (Max 5MB)
  </div>
</div>
```
- File upload input
- Accepts images (JPG, PNG) and PDF
- Maximum 5MB file size
- Required field

## Updated Registration Form Layout

```
┌─────────────────────────────────────┐
│        Create Account               │
├─────────────────────────────────────┤
│ [Name                          ]    │
│ [Email                         ]    │
│ [Phone Number                  ]    │ ← NEW
│ [Password                  👁️ ]    │
│ [Re-enter Password         👁️ ]    │
│                                     │
│ [Select ID Proof Type ▼]           │ ← NEW
│                                     │
│ Upload ID Proof *                   │ ← NEW
│ [Choose File] No file chosen        │
│ 📄 Accepted: JPG, PNG, PDF (Max 5MB)│
│                                     │
│ [        Register        ]          │
└─────────────────────────────────────┘
```

## Validation Rules

### Client-Side Validation:
1. ✅ All fields must be filled
2. ✅ ID proof type must be selected
3. ✅ ID proof file must be uploaded
4. ✅ File size must be ≤ 5MB
5. ✅ Passwords must match

### Error Messages:
- "Please fill all fields" - If any field is empty
- "Please select ID proof type" - If dropdown not selected
- "⚠️ ID Proof Upload Required..." - If no file uploaded
- "File size too large! Please upload a file smaller than 5MB" - If file > 5MB
- "Passwords do not match" - If passwords don't match

## Registration Flow

### Step 1: User Fills Form
```
Name: John Doe
Email: john@example.com
Phone: 9876543210
Password: ********
Confirm: ********
ID Type: Aadhaar Card
ID File: aadhaar.jpg (2.3 MB)
```

### Step 2: Click Register
- Form validation runs
- If valid, shows loading animation
- Creates FormData with all fields
- Sends to backend with file

### Step 3: Backend Processing
```javascript
// Backend receives:
{
  name: "John Doe",
  email: "john@example.com",
  phone: "9876543210",
  password: "hashed_password",
  idProofType: "aadhaar",
  idProof: File (uploaded to uploads/ folder)
}

// Backend creates user:
{
  verificationStatus: "pending",
  idProof: "uploads/id-1234567890.jpg",
  idProofType: "aadhaar"
}
```

### Step 4: Success Response
```
✅ Registration Successful!

Your account is pending admin verification. You will be 
able to login once your ID proof is verified.

This usually takes 24-48 hours.

[Redirecting to login...]
```

## Updated JavaScript Function

The `register()` function now:

1. **Collects all fields** including phone, ID type, and file
2. **Validates file upload** - Shows specific error if missing
3. **Checks file size** - Max 5MB limit
4. **Creates FormData** - Required for file upload
5. **Uses async/await** - Better error handling
6. **Shows detailed messages** - Clear success/error feedback

## File Upload Details

### Accepted File Types:
- **Images**: JPG, JPEG, PNG
- **Documents**: PDF

### File Size Limit:
- Maximum: 5MB
- Enforced on both frontend and backend

### Storage:
- Files saved to: `backend/uploads/`
- Filename format: `id-{timestamp}.{extension}`
- Example: `id-1709123456789.jpg`

### Security:
- File type validation
- Size limit enforcement
- Unique filenames prevent overwriting
- Stored outside public web directory

## User Experience

### Before (Old Registration):
```
1. Fill name, email, password
2. Click Register
3. Account created immediately
4. Can login right away
```

### After (New Registration):
```
1. Fill name, email, phone, password
2. Select ID proof type
3. Upload ID proof file
4. Click Register
5. Account created with "pending" status
6. Cannot login until admin approves
7. Receive message about 24-48 hour wait
```

## Admin Verification Process

After user registers:

1. **Admin Dashboard** shows new pending verification
2. **Admin clicks** "View ID" to see uploaded document
3. **Admin reviews** user details and ID proof
4. **Admin decides**:
   - ✅ Approve → User can login
   - ❌ Reject → User cannot login, sees reason
   - 🚫 Ban → User permanently blocked
   - 🗑️ Delete → User account removed

## Benefits

### For Users:
- ✅ Clear process with visual feedback
- ✅ Knows account is pending verification
- ✅ Understands 24-48 hour timeline
- ✅ Can contact support if needed

### For Admin:
- ✅ Can verify user identity
- ✅ Prevents fake accounts
- ✅ Reduces fraud
- ✅ Maintains platform quality

### For ASP:
- ✅ KYC compliance
- ✅ Fraud prevention
- ✅ User accountability
- ✅ Legal protection
- ✅ Trust and credibility

## Testing Checklist

- [ ] Registration form displays all new fields
- [ ] Phone number field accepts input
- [ ] ID type dropdown shows all options
- [ ] File upload button works
- [ ] Can select image files (JPG, PNG)
- [ ] Can select PDF files
- [ ] Shows error if no file selected
- [ ] Shows error if file > 5MB
- [ ] Shows error if ID type not selected
- [ ] Loading animation appears on submit
- [ ] Success message shows after registration
- [ ] Redirects to login page after 2 seconds
- [ ] Backend receives all fields correctly
- [ ] File is saved to uploads folder
- [ ] User created with pending status
- [ ] Cannot login until approved

## Files Modified

1. ✅ `frontend/register.html` - Added phone, ID type, file upload fields
2. ✅ `backend/routes/auth.js` - Updated to handle file upload
3. ✅ `backend/models/user.js` - Added verification fields
4. ✅ `backend/models/ParkingOwner.js` - Added verification fields

## Next Steps

1. ✅ Registration page updated
2. ⏳ Update login page to handle verification status
3. ⏳ Add User Verification section to admin panel
4. ⏳ Test complete flow
5. ⏳ Deploy to production

## Summary

The registration page now requires users to upload government-issued ID proof during account creation. This ensures all users are verified before they can access ASP services, preventing fraud and maintaining platform security. The updated form includes phone number, ID type selection, and file upload with proper validation and user-friendly error messages.
