// Load withdrawals
async function loadWithdrawals() {
  try {
    const response = await fetch(getApiUrl('/api/wallet/admin/pending-withdrawals'));
    const withdrawals = await response.json();
    
    const list = document.getElementById('withdrawalsList');
    
    if (withdrawals.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No pending withdrawals</p>';
      return;
    }
    
    list.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Amount</th>
            <th>Account Details</th>
            <th>Requested</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${withdrawals.map(w => `
            <tr>
              <td>
                <b>${w.ownerId?.name || 'Unknown'}</b><br>
                <small>${w.ownerId?.email || ''}</small>
              </td>
              <td><b>₹${w.amount}</b></td>
              <td>
                <small>
                  <b>Acc:</b> ${w.accountNumber}<br>
                  <b>IFSC:</b> ${w.ifscCode}<br>
                  ${w.upiId ? `<b>UPI:</b> ${w.upiId}` : ''}
                </small>
              </td>
              <td>${new Date(w.requestDate || w.createdAt).toLocaleDateString()}</td>
              <td><span class="status-badge status-${w.status}">${w.status}</span></td>
              <td>
                ${w.status === 'pending' ? `
                  <button class="btn btn-approve" onclick="approveWithdrawal('${w._id}', '${w.ownerId._id}', ${w.amount})">✓ Approve</button>
                  <button class="btn btn-reject" onclick="rejectWithdrawal('${w._id}')">✗ Reject</button>
                ` : '-'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load withdrawals error:', err);
  }
}

// Approve withdrawal
async function approveWithdrawal(withdrawalId, ownerId, amount) {
  if (!confirm(`Approve withdrawal of ₹${amount}?\n\nThis will deduct the amount from provider's wallet and mark as completed.`)) {
    return;
  }
  
  try {
    const response = await fetch(getApiUrl(`/api/wallet/admin/approve-withdrawal/${withdrawalId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: ownerId,
        amount: amount,
        adminNotes: 'Approved by admin'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Withdrawal approved!\n\nAmount deducted from wallet. Provider will receive payment within 1 business day.');
      loadWithdrawals();
      loadDashboard();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to approve withdrawal'));
    }
  } catch (err) {
    console.error('Approve withdrawal error:', err);
    alert('❌ Failed to approve withdrawal');
  }
}

// Reject withdrawal
async function rejectWithdrawal(withdrawalId) {
  const reason = prompt('Enter reason for rejection:');
  if (!reason) return;
  
  try {
    const response = await fetch(getApiUrl(`/api/wallet/admin/reject-withdrawal/${withdrawalId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminNotes: reason
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Withdrawal rejected');
      loadWithdrawals();
      loadDashboard();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to reject withdrawal'));
    }
  } catch (err) {
    console.error('Reject withdrawal error:', err);
    alert('❌ Failed to reject withdrawal');
  }
}

// Load reports
async function loadReports() {
  try {
    const response = await fetch(getApiUrl('/api/reports/admin/pending'));
    const data = await response.json();
    
    const list = document.getElementById('reportsList');
    
    if (!data.reports || data.reports.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No pending reports</p>';
      return;
    }
    
    list.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Reporter</th>
            <th>Provider</th>
            <th>Parking Space</th>
            <th>Rating</th>
            <th>Reasons</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.reports.map(r => `
            <tr>
              <td>
                <b>${r.reporterName}</b><br>
                <small>${r.reporterEmail}</small>
              </td>
              <td>
                <b>${r.providerId?.name || 'Unknown'}</b><br>
                <small>${r.providerId?.email || ''}</small>
              </td>
              <td><small>${r.parkingId?.notes || 'N/A'}</small></td>
              <td>${'⭐'.repeat(r.rating)}</td>
              <td><small>${r.reasons.join(', ')}</small></td>
              <td>${new Date(r.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewReport('${r._id}')">👁️ View</button>
                <button class="btn btn-delete" onclick="deleteProvider('${r.providerId._id}', '${r.providerId.name}')">🗑️ Delete Provider</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load reports error:', err);
  }
}

// View report details
async function viewReport(reportId) {
  try {
    const response = await fetch(getApiUrl(`/api/reports/admin/pending`));
    const data = await response.json();
    const report = data.reports.find(r => r._id === reportId);
    
    if (!report) {
      alert('Report not found');
      return;
    }
    
    const details = `
📋 Report Details

Reporter: ${report.reporterName} (${report.reporterEmail})
Provider: ${report.providerId?.name} (${report.providerId?.email})
Parking: ${report.parkingId?.notes || 'N/A'}

Rating: ${'⭐'.repeat(report.rating)}
Reasons: ${report.reasons.join(', ')}

Details: ${report.details || 'No additional details'}
Review Comment: ${report.reviewComment || 'No comment'}

Date: ${new Date(report.createdAt).toLocaleString()}
    `;
    
    alert(details);
  } catch (err) {
    console.error('View report error:', err);
  }
}

// Delete provider account
async function deleteProvider(providerId, providerName) {
  if (!confirm(`⚠️ DELETE PROVIDER ACCOUNT?\n\nProvider: ${providerName}\n\nThis will:\n- Delete the provider account\n- Remove all their parking spaces\n- Cancel active bookings\n\nThis action CANNOT be undone!`)) {
    return;
  }
  
  const confirmText = prompt('Type "DELETE" to confirm:');
  if (confirmText !== 'DELETE') {
    alert('Deletion cancelled');
    return;
  }
  
  try {
    const response = await fetch(getApiUrl(`/api/owner/admin/delete/${providerId}`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Multiple user reports - account terminated by admin'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Provider account deleted successfully');
      loadReports();
      loadDashboard();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to delete provider'));
    }
  } catch (err) {
    console.error('Delete provider error:', err);
    alert('❌ Failed to delete provider');
  }
}

// Load support tickets
async function loadSupportTickets() {
  try {
    const response = await fetch(getApiUrl('/api/support/admin/open'));
    const tickets = await response.json();
    
    const list = document.getElementById('ticketsList');
    
    if (tickets.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No open tickets</p>';
      return;
    }
    
    list.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Type</th>
            <th>Subject</th>
            <th>Priority</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map(t => `
            <tr>
              <td>
                <b>${t.userName}</b><br>
                <small>${t.userEmail}</small>
              </td>
              <td>${t.category === 'complaint' ? '🚨 Complaint' : '💬 Enquiry'}</td>
              <td>${t.subject}</td>
              <td><span class="status-badge status-${t.priority}">${t.priority}</span></td>
              <td>${new Date(t.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewTicket('${t._id}')">👁️ View</button>
                <button class="btn btn-resolve" onclick="resolveTicket('${t._id}')">✓ Resolve</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load tickets error:', err);
  }
}

// View ticket details
async function viewTicket(ticketId) {
  try {
    const response = await fetch(getApiUrl(`/api/support/ticket/${ticketId}`));
    const ticket = await response.json();
    
    if (!ticket) {
      alert('Ticket not found');
      return;
    }
    
    let details = `
🎫 Ticket #${ticket._id.substring(0, 8)}

User: ${ticket.userName} (${ticket.userEmail})
Type: ${ticket.category}
Priority: ${ticket.priority}
Subject: ${ticket.subject}

Description:
${ticket.description}

${ticket.bookingId ? `Booking ID: ${ticket.bookingId}` : ''}
${ticket.attachments && ticket.attachments.length > 0 ? `\nAttachments: ${ticket.attachments.length} images` : ''}

Date: ${new Date(ticket.createdAt).toLocaleString()}
    `;
    
    alert(details);
    
    // If it's a complaint with ASP insurance, ask about claim
    if (ticket.category === 'complaint') {
      handleInsuranceClaim(ticketId, ticket.userId);
    }
  } catch (err) {
    console.error('View ticket error:', err);
  }
}

// Handle insurance claim
async function handleInsuranceClaim(ticketId, userId) {
  // Check if user has ASP insurance
  try {
    const verifyRes = await fetch(getApiUrl(`/api/verification/status/${userId}`));
    const verifyData = await verifyRes.json();
    
    if (verifyData.verified) {
      const claimAmount = prompt(`User has ${verifyData.tier.toUpperCase()} insurance (Limit: ₹${verifyData.claimLimit})\n\nEnter claim amount to allocate (or 0 to skip):`);
      
      if (claimAmount && parseFloat(claimAmount) > 0) {
        const amount = parseFloat(claimAmount);
        
        if (amount > verifyData.claimLimit) {
          alert(`❌ Claim amount exceeds ${verifyData.tier} tier limit of ₹${verifyData.claimLimit}`);
          return;
        }
        
        // Process insurance claim
        const claimRes = await fetch(getApiUrl('/api/verification/process-claim'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            ticketId: ticketId,
            claimAmount: amount,
            reason: 'Damage claim approved by admin'
          })
        });
        
        const claimData = await claimRes.json();
        
        if (claimData.success) {
          alert(`✅ Insurance claim processed!\n\n₹${amount} credited to user's wallet`);
        } else {
          alert('❌ Failed to process claim: ' + (claimData.error || 'Unknown error'));
        }
      }
    } else {
      alert('ℹ️ User does not have ASP Insurance Protection');
    }
  } catch (err) {
    console.error('Insurance claim error:', err);
  }
}

// Resolve ticket
async function resolveTicket(ticketId) {
  const response = prompt('Enter resolution message:');
  if (!response) return;
  
  try {
    const res = await fetch(getApiUrl(`/api/support/admin/resolve/${ticketId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminResponse: response,
        resolvedBy: 'Admin'
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      alert('✅ Ticket resolved');
      loadSupportTickets();
      loadDashboard();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to resolve ticket'));
    }
  } catch (err) {
    console.error('Resolve ticket error:', err);
    alert('❌ Failed to resolve ticket');
  }
}

// Load users
async function loadUsers() {
  try {
    const response = await fetch(getApiUrl('/api/owner/all'));
    const users = await response.json();
    
    const list = document.getElementById('usersList');
    
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
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><b>${u.name}</b></td>
              <td>${u.email}</td>
              <td>${u.role || 'provider'}</td>
              <td>${new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewUser('${u._id}')">👁️ View</button>
                <button class="btn btn-delete" onclick="deleteProvider('${u._id}', '${u.name}')">🗑️ Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load users error:', err);
  }
}

// View user details
async function viewUser(userId) {
  try {
    const response = await fetch(getApiUrl(`/api/owner/${userId}`));
    const user = await response.json();
    
    if (!user) {
      alert('User not found');
      return;
    }
    
    const details = `
👤 User Details

Name: ${user.name}
Email: ${user.email}
Role: ${user.role || 'provider'}
Joined: ${new Date(user.createdAt || Date.now()).toLocaleDateString()}

ID: ${user._id}
    `;
    
    alert(details);
  } catch (err) {
    console.error('View user error:', err);
  }
}

// Logout
function logout() {
  if (confirm('Logout from admin panel?')) {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
  }
}

// Load dashboard on page load
loadDashboard();
