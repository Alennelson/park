// Load withdrawals
async function loadWithdrawals() {
  try {
    const response = await fetch(getApiUrl('/api/wallet/admin/pending-withdrawals'));
    const withdrawals = await response.json();
    
    console.log('Withdrawals loaded:', withdrawals);
    
    const list = document.getElementById('withdrawalsList');
    
    if (!withdrawals || withdrawals.length === 0) {
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
          ${withdrawals.map(w => {
            const ownerName = w.ownerId?.name || 'Unknown';
            const ownerEmail = w.ownerId?.email || '';
            const ownerId = w.ownerId?._id || w.ownerId;
            
            return `
            <tr>
              <td>
                <b>${ownerName}</b><br>
                <small>${ownerEmail}</small>
              </td>
              <td><b>₹${w.amount}</b></td>
              <td>
                <small>
                  <b>Acc:</b> ${w.accountNumber}<br>
                  <b>IFSC:</b> ${w.ifscCode}<br>
                  ${w.upiId ? `<b>UPI:</b> ${w.upiId}<br>` : ''}
                  ${w.branch ? `<b>Branch:</b> ${w.branch}` : ''}
                </small>
              </td>
              <td>${new Date(w.requestDate || w.createdAt).toLocaleDateString()}</td>
              <td><span class="status-badge status-${w.status}">${w.status}</span></td>
              <td>
                ${w.status === 'pending' ? `
                  <button class="btn btn-approve" onclick="approveWithdrawal('${w._id}', '${ownerId}', ${w.amount})">✓ Approve</button>
                  <button class="btn btn-reject" onclick="rejectWithdrawal('${w._id}')">✗ Reject</button>
                ` : '-'}
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load withdrawals error:', err);
    document.getElementById('withdrawalsList').innerHTML = '<p style="color: #f44336; text-align: center;">Failed to load withdrawals. Check console for errors.</p>';
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
    console.log('Loading reports...');
    const response = await fetch(getApiUrl('/api/reports/admin/pending'));
    const data = await response.json();
    
    console.log('Reports response:', data);
    
    const list = document.getElementById('reportsList');
    
    if (!data.success) {
      list.innerHTML = `<p style="color: #f44336; text-align: center; padding: 20px;">Error: ${data.error || 'Failed to load reports'}</p>`;
      return;
    }
    
    if (!data.reports || data.reports.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No pending reports</p>';
      return;
    }
    
    console.log(`Displaying ${data.reports.length} reports`);
    
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
          ${data.reports.map(r => {
            const providerName = r.providerId?.name || 'Unknown Provider';
            const providerEmail = r.providerId?.email || '';
            const providerId = r.providerId?._id || r.providerId;
            const parkingNotes = r.parkingId?.notes || 'N/A';
            
            return `
            <tr>
              <td>
                <b>${r.reporterName}</b><br>
                <small>${r.reporterEmail}</small>
              </td>
              <td>
                <b>${providerName}</b><br>
                <small>${providerEmail}</small>
              </td>
              <td><small>${parkingNotes}</small></td>
              <td>${'⭐'.repeat(r.rating)}</td>
              <td><small>${r.reasons.join(', ')}</small></td>
              <td>${new Date(r.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewReport('${r._id}')">👁️ View</button>
                ${providerId ? `<button class="btn btn-delete" onclick="deleteProvider('${providerId}', '${providerName}')">🗑️ Delete Provider</button>` : ''}
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load reports error:', err);
    document.getElementById('reportsList').innerHTML = '<p style="color: #f44336; text-align: center; padding: 20px;">Failed to load reports. Check console for errors.</p>';
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
    
    // Create a modal to show ticket details with images
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
      overflow-y: auto;
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
    
    let imagesHtml = '';
    if (ticket.attachments && ticket.attachments.length > 0) {
      imagesHtml = `
        <div style="margin: 20px 0;">
          <h4 style="color: #f44336; margin-bottom: 10px;">📷 Attached Images (${ticket.attachments.length})</h4>
          <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Click images to view full size</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
            ${ticket.attachments.map(img => `
              <img 
                src="${getApiUrl('/' + img)}" 
                onclick="window.open('${getApiUrl('/' + img)}', '_blank')"
                style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid #ddd;"
                onerror="this.style.display='none'"
                title="Click to view full size">
            `).join('')}
          </div>
        </div>
      `;
    }
    
    modalContent.innerHTML = `
      <h2 style="color: #333; margin-bottom: 20px;">🎫 Ticket Details</h2>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p><b>Ticket ID:</b> ${ticket._id.substring(0, 8)}</p>
        <p><b>User:</b> ${ticket.userName} (${ticket.userEmail})</p>
        <p><b>Type:</b> ${ticket.category === 'complaint' ? '🚨 Complaint' : '💬 Enquiry'}</p>
        <p><b>Priority:</b> <span style="color: ${ticket.priority === 'high' ? '#f44336' : '#ff9800'}">${ticket.priority}</span></p>
        <p><b>Date:</b> ${new Date(ticket.createdAt).toLocaleString()}</p>
        ${ticket.bookingId ? `<p><b>Booking ID:</b> ${ticket.bookingId}</p>` : ''}
      </div>
      
      <div style="margin: 15px 0;">
        <h4 style="color: #333;">Subject:</h4>
        <p style="font-size: 16px; font-weight: bold;">${ticket.subject}</p>
      </div>
      
      <div style="margin: 15px 0;">
        <h4 style="color: #333;">Description:</h4>
        <p style="line-height: 1.6; white-space: pre-wrap;">${ticket.description}</p>
      </div>
      
      ${imagesHtml}
      
      ${ticket.adminResponse ? `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 15px 0;">
          <h4 style="color: #1976d2;">Admin Response:</h4>
          <p style="line-height: 1.6;">${ticket.adminResponse}</p>
          ${ticket.resolvedAt ? `<small style="color: #666;">Resolved: ${new Date(ticket.resolvedAt).toLocaleString()}</small>` : ''}
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn btn-view" onclick="this.closest('.modal-wrapper').remove()">Close</button>
      </div>
    `;
    
    modal.className = 'modal-wrapper';
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // If it's a complaint with ASP insurance, ask about claim
    if (ticket.category === 'complaint' && ticket.status !== 'resolved') {
      setTimeout(() => {
        handleInsuranceClaim(ticketId, ticket.userId);
      }, 500);
    }
  } catch (err) {
    console.error('View ticket error:', err);
    alert('Failed to load ticket details');
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
