# User Verification System - Complete Implementation Guide

## Overview
This system requires all new users to upload government-issued ID proof during registration. Admin must verify and approve accounts before users can login and access ASP services.

## What Has Been Implemented

### ✅ Backend Changes Complete

1. **User Model Enhanced** (`backend/models/user.js`)
   - Added `verificationStatus` (pending/approved/rejected)
   - Added `idProof` (file path)
   - Added `idProofType` (aadhaar/passport/etc)
   - Added `phone` field
   - Added verification tracking fields

2. **ParkingOwner Model Enhanced** (`backend/models/ParkingOwner.js`)
   - Same verification fields as User model

3. **Registration Endpoint Updated** (`backend/routes/auth.js`)
   - Now accepts ID proof file upload
   - Requires phone number
   - Sets status to 'pending'
   - Returns message about pending verification

4. **Login Endpoint Updated** (`backend/routes/auth.js`)
   - Checks verification status
   - Blocks pending users with message
   - Blocks rejected users with reason
   - Blocks banned users

5. **Admin Endpoints Added** (`backend/routes/auth.js`)
   - GET `/api/auth/admin/pending-verifications` - List pending users
   - GET `/api/auth/admin/all-users` - List all users
   - POST `/api/auth/admin/approve-user/:userId` - Approve user
   - POST `/api/auth/admin/reject-user/:userId` - Reject user
   - POST `/api/auth/admin/ban-user/:userId` - Ban user
   - DELETE `/api/auth/admin/delete-user/:userId` - Delete user

## Frontend Changes Needed

### 1. Update Registration Page (`frontend/register.html`)

Add these fields to the registration form:

```html
<!-- Phone Number Field -->
<div class="input-group">
  <input type="tel" id="phone" placeholder="Phone Number" required>
</div>

<!-- ID Proof Type Selection -->
<div class="input-group">
  <select id="idProofType" required>
    <option value="">Select ID Proof Type</option>
    <option value="aadhaar">Aadhaar Card</option>
    <option value="passport">Passport</option>
    <option value="driving_license">Driving License</option>
    <option value="voter_id">Voter ID</option>
    <option value="pan_card">PAN Card</option>
  </select>
</div>

<!-- ID Proof Upload -->
<div class="input-group">
  <label for="idProof" style="display: block; margin-bottom: 5px;">
    Upload ID Proof (Required) *
  </label>
  <input type="file" id="idProof" accept="image/*,application/pdf" required>
  <small style="color: #666; font-size: 12px;">
    Accepted: JPG, PNG, PDF (Max 5MB)
  </small>
</div>
```

Update the registration JavaScript:

```javascript
async function register() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const phone = document.getElementById('phone').value;
  const idProofType = document.getElementById('idProofType').value;
  const idProofFile = document.getElementById('idProof').files[0];
  
  if (!name || !email || !password || !phone || !idProofType || !idProofFile) {
    alert('All fields including ID proof upload are required');
    return;
  }
  
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('name', name);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('phone', phone);
  formData.append('idProofType', idProofType);
  formData.append('idProof', idProofFile);
  
  try {
    const response = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      body: formData // Don't set Content-Type header, browser will set it with boundary
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Registration Successful!\n\nYour account is pending admin verification. You will be able to login once your ID proof is verified.\n\nThis usually takes 24-48 hours.');
      window.location.href = 'login.html';
    } else {
      alert('Registration failed: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Registration error:', err);
    alert('Server error. Please try again.');
  }
}
```

### 2. Update Login Page (`frontend/login.html`)

Add handling for pending and rejected status:

```javascript
.then(data => {
  console.log("Server response:", data);

  // Check if account is banned
  if (data.banned || data.error === "ACCOUNT_BANNED") {
    document.getElementById("loadingOverlay").classList.remove("active");
    const banMessage = data.banReason || 'Your account has been banned';
    alert(`⛔ ACCOUNT BANNED\n\n${banMessage}\n\nContact ASP support if you believe this is a mistake.`);
    return;
  }

  // Check if verification is pending
  if (data.pending || data.error === "VERIFICATION_PENDING") {
    document.getElementById("loadingOverlay").classList.remove("active");
    alert('⏳ Account Pending Verification\n\nYour account is currently under review by our admin team. You will be able to login once your ID proof is verified.\n\nThis usually takes 24-48 hours. Thank you for your patience!');
    return;
  }

  // Check if verification was rejected
  if (data.rejected || data.error === "VERIFICATION_REJECTED") {
    document.getElementById("loadingOverlay").classList.remove("active");
    const rejectionReason = data.rejectionReason || 'Your account verification was rejected';
    alert(`❌ Account Verification Rejected\n\n${rejectionReason}\n\nPlease contact ASP support for more information.`);
    return;
  }

  if (!data.ownerId) {
    document.getElementById("loadingOverlay").classList.remove("active");
    alert("Login failed: wrong email or password");
    return;
  }

  // Continue with normal login...
})
```

### 3. Add User Verification Section to Admin Panel

Add to `frontend/admin.html` sidebar:

```html
<div class="menu-item" onclick="showSection('verificationSection')">
  <span class="menu-icon">✅</span> User Verification
</div>
```

Add section content:

```html
<!-- User Verification Section -->
<div id="verificationSection" class="section">
  <div class="header">
    <h1>✅ User Verification</h1>
    <p>Review and approve new user registrations</p>
  </div>

  <div class="card">
    <h3>Pending Verifications</h3>
    <div id="pendingVerificationsList"></div>
  </div>

  <div class="card">
    <h3>All Users</h3>
    <div id="allUsersList"></div>
  </div>
</div>
```

### 4. Add Admin Functions (`frontend/admin-functions.js`)

```javascript
// Load pending verifications
async function loadPendingVerifications() {
  try {
    const response = await fetch(getApiUrl('/api/auth/admin/pending-verifications'));
    const users = await response.json();
    
    const list = document.getElementById('pendingVerificationsList');
    
    if (users.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No pending verifications</p>';
      return;
    }
    
    list.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>ID Type</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><b>${u.name}</b></td>
              <td>${u.email}</td>
              <td>${u.phone || 'N/A'}</td>
              <td>${u.idProofType || 'N/A'}</td>
              <td>${new Date(u.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewUserVerification('${u._id}')">👁️ View ID</button>
                <button class="btn btn-approve" onclick="approveUser('${u._id}', '${u.name}')">✓ Approve</button>
                <button class="btn btn-reject" onclick="rejectUser('${u._id}', '${u.name}')">✗ Reject</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load pending verifications error:', err);
  }
}

// View user ID proof
async function viewUserVerification(userId) {
  try {
    const response = await fetch(getApiUrl('/api/auth/admin/all-users'));
    const users = await response.json();
    const user = users.find(u => u._id === userId);
    
    if (!user) {
      alert('User not found');
      return;
    }
    
    // Create modal to show ID proof
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      padding: 20px;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 15px;
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    `;
    
    modalContent.innerHTML = `
      <h2 style="color: #333; margin-bottom: 20px;">👤 User Verification Details</h2>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p><b>Name:</b> ${user.name}</p>
        <p><b>Email:</b> ${user.email}</p>
        <p><b>Phone:</b> ${user.phone || 'N/A'}</p>
        <p><b>ID Type:</b> ${user.idProofType || 'N/A'}</p>
        <p><b>Status:</b> <span style="color: ${user.verificationStatus === 'pending' ? '#ff9800' : user.verificationStatus === 'approved' ? '#4CAF50' : '#f44336'}">${user.verificationStatus.toUpperCase()}</span></p>
        <p><b>Registered:</b> ${new Date(user.createdAt).toLocaleString()}</p>
      </div>
      
      <div style="margin: 20px 0;">
        <h4 style="color: #333; margin-bottom: 10px;">📄 Uploaded ID Proof:</h4>
        ${user.idProof ? `
          ${user.idProof.endsWith('.pdf') ? 
            `<a href="${getApiUrl('/' + user.idProof)}" target="_blank" style="display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px;">📄 View PDF Document</a>` :
            `<img src="${getApiUrl('/' + user.idProof)}" style="max-width: 100%; border-radius: 8px; border: 2px solid #ddd;" onclick="window.open('${getApiUrl('/' + user.idProof)}', '_blank')" title="Click to view full size">`
          }
        ` : '<p style="color: #999;">No ID proof uploaded</p>'}
      </div>
      
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn btn-approve" onclick="approveUser('${user._id}', '${user.name}'); this.closest('.modal-wrapper').remove();">✓ Approve</button>
        <button class="btn btn-reject" onclick="rejectUser('${user._id}', '${user.name}'); this.closest('.modal-wrapper').remove();">✗ Reject</button>
        <button class="btn btn-view" onclick="this.closest('.modal-wrapper').remove()">Close</button>
      </div>
    `;
    
    modal.className = 'modal-wrapper';
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  } catch (err) {
    console.error('View user verification error:', err);
    alert('Failed to load user details');
  }
}

// Approve user
async function approveUser(userId, userName) {
  if (!confirm(`Approve user: ${userName}?\n\nThis will allow them to login and use ASP services.`)) {
    return;
  }
  
  try {
    const response = await fetch(getApiUrl(`/api/auth/admin/approve-user/${userId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ User approved: ${userName}\n\nThey can now login and use ASP services.`);
      loadPendingVerifications();
      loadAllUsers();
      loadDashboard();
    } else {
      alert('Error: ' + (data.error || 'Failed to approve user'));
    }
  } catch (err) {
    console.error('Approve user error:', err);
    alert('Failed to approve user');
  }
}

// Reject user
async function rejectUser(userId, userName) {
  const reason = prompt(`Reject user: ${userName}?\n\nEnter rejection reason:`);
  if (!reason) return;
  
  try {
    const response = await fetch(getApiUrl(`/api/auth/admin/reject-user/${userId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`❌ User rejected: ${userName}\n\nReason: ${reason}`);
      loadPendingVerifications();
      loadAllUsers();
      loadDashboard();
    } else {
      alert('Error: ' + (data.error || 'Failed to reject user'));
    }
  } catch (err) {
    console.error('Reject user error:', err);
    alert('Failed to reject user');
  }
}

// Load all users
async function loadAllUsers() {
  try {
    const response = await fetch(getApiUrl('/api/auth/admin/all-users'));
    const users = await response.json();
    
    const list = document.getElementById('allUsersList');
    
    if (users.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No users found</p>';
      return;
    }
    
    list.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr style="${u.isBanned ? 'background: #ffebee;' : u.verificationStatus === 'approved' ? 'background: #e8f5e9;' : ''}">
              <td><b>${u.name}</b></td>
              <td>${u.email}</td>
              <td>${u.phone || 'N/A'}</td>
              <td>
                ${u.isBanned ? '<span class="status-badge" style="background: #f44336;">BANNED</span>' : ''}
                <span class="status-badge status-${u.verificationStatus}">${u.verificationStatus.toUpperCase()}</span>
              </td>
              <td>${new Date(u.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewUserVerification('${u._id}')">👁️ View</button>
                ${u.verificationStatus === 'pending' ? `
                  <button class="btn btn-approve" onclick="approveUser('${u._id}', '${u.name}')">✓ Approve</button>
                ` : ''}
                ${!u.isBanned ? `
                  <button class="btn btn-delete" onclick="banUserAccount('${u._id}', '${u.name}')">🚫 Ban</button>
                ` : ''}
                <button class="btn btn-delete" onclick="deleteUserAccount('${u._id}', '${u.name}')">🗑️ Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load all users error:', err);
  }
}

// Ban user account
async function banUserAccount(userId, userName) {
  const reason = prompt(`Ban user: ${userName}?\n\nEnter ban reason:`);
  if (!reason) return;
  
  try {
    const response = await fetch(getApiUrl(`/api/auth/admin/ban-user/${userId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`🚫 User banned: ${userName}\n\nReason: ${reason}\n\nThey can no longer login.`);
      loadAllUsers();
      loadDashboard();
    } else {
      alert('Error: ' + (data.error || 'Failed to ban user'));
    }
  } catch (err) {
    console.error('Ban user error:', err);
    alert('Failed to ban user');
  }
}

// Delete user account
async function deleteUserAccount(userId, userName) {
  if (!confirm(`⚠️ DELETE USER: ${userName}?\n\nThis will permanently delete the user account.\n\nThis action CANNOT be undone!`)) {
    return;
  }
  
  const confirmText = prompt('Type "DELETE" to confirm:');
  if (confirmText !== 'DELETE') {
    alert('Deletion cancelled');
    return;
  }
  
  try {
    const response = await fetch(getApiUrl(`/api/auth/admin/delete-user/${userId}`), {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`🗑️ User deleted: ${userName}`);
      loadAllUsers();
      loadPendingVerifications();
      loadDashboard();
    } else {
      alert('Error: ' + (data.error || 'Failed to delete user'));
    }
  } catch (err) {
    console.error('Delete user error:', err);
    alert('Failed to delete user');
  }
}

// Update dashboard to include verification stats
async function loadDashboard() {
  try {
    // ... existing dashboard code ...
    
    // Add pending verifications count
    const verifyRes = await fetch(getApiUrl('/api/auth/admin/pending-verifications'));
    const pendingUsers = await verifyRes.json();
    document.getElementById('statPendingVerifications').innerText = pendingUsers.length || 0;
    
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}
```

### 5. Update Admin Dashboard Stats

Add to `frontend/admin.html` stats grid:

```html
<div class="stat-card">
  <div class="stat-label">Pending Verifications</div>
  <div class="stat-value" id="statPendingVerifications">0</div>
</div>
```

## User Flow

### Registration Flow:
1. User goes to register page
2. Fills name, email, password, phone
3. Selects ID proof type
4. Uploads ID proof (image or PDF)
5. Clicks Register
6. Account created with status "pending"
7. Message: "Your account is pending verification"

### Login Flow (Pending User):
1. User tries to login
2. Backend checks verification status
3. Returns "VERIFICATION_PENDING" error
4. Frontend shows: "⏳ Account Pending Verification"
5. User cannot access system

### Admin Verification Flow:
1. Admin logs into admin panel
2. Sees "User Verification" section
3. Clicks to view pending verifications
4. Reviews user details and ID proof
5. Either:
   - Approves → User can now login
   - Rejects → User cannot login, sees rejection reason
   - Bans → User permanently blocked
   - Deletes → User account removed

### Login Flow (Approved User):
1. User tries to login
2. Backend checks verification status = "approved"
3. Login successful
4. User can access all ASP features

## Security Features

1. **Mandatory ID Upload**: Cannot register without ID proof
2. **Admin Approval Required**: No automatic approval
3. **Multiple Verification States**: pending/approved/rejected
4. **Ban System**: Separate from rejection for fraud cases
5. **Audit Trail**: Tracks who verified and when
6. **File Validation**: Only images and PDF allowed
7. **Size Limit**: 5MB maximum file size

## Testing Checklist

- [ ] Registration requires all fields including ID
- [ ] Cannot register without ID upload
- [ ] Pending users cannot login
- [ ] Pending users see appropriate message
- [ ] Admin can see pending verifications
- [ ] Admin can view uploaded ID proof
- [ ] Admin can approve users
- [ ] Approved users can login
- [ ] Admin can reject users
- [ ] Rejected users cannot login
- [ ] Rejected users see rejection reason
- [ ] Admin can ban users
- [ ] Banned users cannot login
- [ ] Admin can delete users
- [ ] All users list shows correct statuses
- [ ] Dashboard shows pending count

## Files Modified

1. ✅ `backend/models/user.js` - Added verification fields
2. ✅ `backend/models/ParkingOwner.js` - Added verification fields
3. ✅ `backend/routes/auth.js` - Updated registration, login, added admin endpoints
4. ⏳ `frontend/register.html` - Need to add ID upload fields
5. ⏳ `frontend/login.html` - Need to add verification status handling
6. ⏳ `frontend/admin.html` - Need to add verification section
7. ⏳ `frontend/admin-functions.js` - Need to add verification functions

## Next Steps

1. Update `frontend/register.html` with ID upload form
2. Update `frontend/login.html` with verification status handling
3. Add User Verification section to `frontend/admin.html`
4. Add verification functions to `frontend/admin-functions.js`
5. Test complete flow
6. Deploy to production

## Summary

Backend is complete and ready. Frontend needs updates to registration form, login handling, and admin panel. Once frontend is updated, the complete verification system will be functional with mandatory ID proof upload and admin approval before users can access ASP services.
