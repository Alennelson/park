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
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Reports response:', data);
    
    const list = document.getElementById('reportsList');
    
    // Check if response has error
    if (data.success === false) {
      list.innerHTML = `<p style="color: #f44336; text-align: center; padding: 20px;">Error: ${data.error || 'Failed to load reports'}</p>`;
      return;
    }
    
    // Check if reports array exists and has items
    if (!data.reports || data.reports.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No pending reports</p>';
      return;
    }
    
    console.log(`Displaying ${data.reports.length} reports`);
    
    // Build table HTML
    list.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Reporter</th>
            <th>Provider Account</th>
            <th>Parking Space</th>
            <th>Rating</th>
            <th>Reasons</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.reports.map(r => {
            console.log('Processing report:', r);
            
            // Safe property access with fallbacks
            const reporterName = r.reporterName || 'Unknown';
            const reporterEmail = r.reporterEmail || '';
            
            // Try to get provider info from populated data or use the ID directly
            let providerName = 'Unknown Provider';
            let providerEmail = '';
            let providerId = '';
            
            if (r.providerId) {
              if (typeof r.providerId === 'object' && r.providerId._id) {
                // Provider data is populated
                providerName = r.providerId.name || 'Unknown Provider';
                providerEmail = r.providerId.email || '';
                providerId = r.providerId._id;
              } else if (typeof r.providerId === 'string') {
                // Only ID is available (provider might be deleted)
                providerId = r.providerId;
                providerName = '⚠️ Provider Account';
                providerEmail = 'ID: ' + providerId.substring(0, 8) + '...';
              }
            }
            
            const parkingNotes = r.parkingId?.notes || 'N/A';
            
            const rating = r.rating || 1;
            const reasons = Array.isArray(r.reasons) ? r.reasons.join(', ') : 'No reasons';
            const createdAt = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Unknown';
            
            return `
            <tr>
              <td>
                <b>${reporterName}</b><br>
                <small style="color: #666;">${reporterEmail}</small>
              </td>
              <td>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                  <div>
                    <b>${providerName}</b><br>
                    <small style="color: #666;">${providerEmail}</small>
                  </div>
                  ${providerId ? `
                    <button 
                      class="btn btn-delete" 
                      style="font-size: 12px; padding: 5px 10px; width: 100%;"
                      onclick="deleteProviderFromReport('${providerId}', '${providerName.replace(/'/g, "\\'")}', '${r._id}')">
                      🚫 Ban Provider Account
                    </button>
                  ` : '<small style="color: #999;">No provider ID available</small>'}
                </div>
              </td>
              <td><small>${parkingNotes}</small></td>
              <td>${'⭐'.repeat(rating)}</td>
              <td><small>${reasons}</small></td>
              <td><small>${createdAt}</small></td>
              <td>
                <button class="btn btn-view" onclick="viewReport('${r._id}')">👁️ View Details</button>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load reports error:', err);
    document.getElementById('reportsList').innerHTML = `<p style="color: #f44336; text-align: center; padding: 20px;">Failed to load reports: ${err.message}<br><small>Check console for details</small></p>`;
  }
}

// View report details
async function viewReport(reportId) {
  try {
    console.log('Viewing report:', reportId);
    const response = await fetch(getApiUrl(`/api/reports/admin/pending`));
    const data = await response.json();
    
    console.log('All reports:', data);
    
    if (!data.success || !data.reports) {
      alert('Failed to load report details');
      return;
    }
    
    const report = data.reports.find(r => r._id === reportId);
    
    if (!report) {
      alert('Report not found');
      return;
    }
    
    console.log('Found report:', report);
    
    // Safe property access
    const reporterName = report.reporterName || 'Unknown';
    const reporterEmail = report.reporterEmail || '';
    const providerName = report.providerId?.name || 'Unknown Provider';
    const providerEmail = report.providerId?.email || '';
    const parkingNotes = report.parkingId?.notes || 'N/A';
    const rating = report.rating || 1;
    const reasons = Array.isArray(report.reasons) ? report.reasons.join(', ') : 'No reasons';
    const details = report.details || 'No additional details';
    const reviewComment = report.reviewComment || 'No comment';
    const createdAt = report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Unknown';
    
    const detailsText = `
📋 Report Details

Reporter: ${reporterName} (${reporterEmail})
Provider: ${providerName} (${providerEmail})
Parking: ${parkingNotes}

Rating: ${'⭐'.repeat(rating)}
Reasons: ${reasons}

Details: ${details}
Review Comment: ${reviewComment}

Date: ${createdAt}
    `;
    
    alert(detailsText);
  } catch (err) {
    console.error('View report error:', err);
    alert('Failed to view report: ' + err.message);
  }
}

// Delete provider account from report
async function deleteProviderFromReport(providerId, providerName, reportId) {
  if (!providerId) {
    alert('❌ Cannot ban: Provider ID not available');
    return;
  }
  
  if (!confirm(`⚠️ BAN PROVIDER ACCOUNT?\n\nProvider: ${providerName}\nProvider ID: ${providerId}\n\nThis will:\n✓ Ban the provider account permanently\n✓ Deactivate all their parking spaces\n✓ Cancel all active bookings\n✓ Mark this report as resolved\n✓ Provider cannot login anymore\n\nThis action CANNOT be undone!`)) {
    return;
  }
  
  const confirmText = prompt('Type "BAN" in capital letters to confirm:');
  if (confirmText !== 'BAN') {
    alert('❌ Ban cancelled - confirmation text did not match');
    return;
  }
  
  try {
    console.log(`Banning provider ${providerId} from report ${reportId}`);
    
    // Ban the provider account
    const deleteResponse = await fetch(getApiUrl(`/api/owner/admin/delete/${providerId}`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: `Account banned by admin due to user report (Report ID: ${reportId})`
      })
    });
    
    const deleteData = await deleteResponse.json();
    
    if (!deleteData.success) {
      alert('❌ Error banning provider: ' + (deleteData.error || 'Unknown error'));
      return;
    }
    
    console.log('Provider banned successfully, now updating report status');
    
    // Mark the report as resolved
    const reportResponse = await fetch(getApiUrl(`/api/reports/admin/update/${reportId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'resolved',
        actionTaken: 'removal',
        adminNotes: `Provider account banned by admin on ${new Date().toLocaleString()}`,
        resolvedBy: 'Admin'
      })
    });
    
    const reportData = await reportResponse.json();
    
    if (reportData.success) {
      alert('✅ SUCCESS!\n\n✓ Provider account banned\n✓ All parking spaces deactivated\n✓ Active bookings cancelled\n✓ Report marked as resolved\n✓ Provider cannot login anymore');
    } else {
      alert('⚠️ Provider banned but failed to update report status: ' + (reportData.error || 'Unknown error'));
    }
    
    // Reload the reports and dashboard
    loadReports();
    loadDashboard();
    
  } catch (err) {
    console.error('Ban provider from report error:', err);
    alert('❌ Failed to ban provider: ' + err.message);
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
          ${tickets.map(t => {
            // Check if user has ASP insurance
            const insuranceBadge = t.hasInsurance ? 
              `<span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 5px;">🛡️ ASP PROTECTED</span>` : '';
            
            const priorityColor = t.priority === 'high' || t.priority === 'urgent' ? '#f44336' : 
                                 t.priority === 'medium' ? '#ff9800' : '#999';
            
            return `
            <tr style="${t.hasInsurance ? 'background: #e8f5e9;' : ''}">
              <td>
                <b>${t.userName}</b>${insuranceBadge}<br>
                <small>${t.userEmail}</small>
              </td>
              <td>${t.category === 'complaint' ? '🚨 Complaint' : '💬 Enquiry'}</td>
              <td>${t.subject}</td>
              <td>
                <span class="status-badge" style="background: ${priorityColor}; color: white;">
                  ${t.priority.toUpperCase()}${t.hasInsurance ? ' ⚡' : ''}
                </span>
              </td>
              <td>${new Date(t.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewTicket('${t._id}')">👁️ View</button>
                <button class="btn btn-resolve" onclick="resolveTicket('${t._id}')">✓ Resolve</button>
              </td>
            </tr>
          `}).join('')}
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
    
    // Insurance badge
    let insuranceBadge = '';
    if (ticket.hasInsurance) {
      insuranceBadge = `
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 15px; border-radius: 10px; margin: 15px 0; color: white; text-align: center;">
          <h3 style="margin: 0; font-size: 18px;">🛡️ ASP INSURANCE PROTECTED</h3>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Tier: ${ticket.insuranceTier ? ticket.insuranceTier.toUpperCase() : 'N/A'} | Priority: HIGH ⚡</p>
          ${ticket.insuranceClaimProcessed ? 
            `<p style="margin: 5px 0 0 0; font-size: 14px; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 5px;">
              ✅ Insurance Claim Processed: ₹${ticket.insuranceClaimAmount}
            </p>` : 
            `<p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">Eligible for insurance claim up to tier limit</p>`
          }
        </div>
      `;
    }
    
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
      
      ${insuranceBadge}
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p><b>Ticket ID:</b> ${ticket._id.substring(0, 8)}</p>
        <p><b>User:</b> ${ticket.userName} (${ticket.userEmail})</p>
        <p><b>Type:</b> ${ticket.category === 'complaint' ? '🚨 Complaint' : '💬 Enquiry'}</p>
        <p><b>Priority:</b> <span style="color: ${ticket.priority === 'high' ? '#f44336' : '#ff9800'}">${ticket.priority.toUpperCase()}</span></p>
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
    
    // If it's a complaint with ASP insurance and not yet processed, ask about claim
    if (ticket.category === 'complaint' && ticket.hasInsurance && !ticket.insuranceClaimProcessed && ticket.status !== 'resolved') {
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


/* ================= USER VERIFICATION FUNCTIONS ================= */

// Load pending verifications
async function loadPendingVerifications() {
  try {
    console.log("=== LOADING PENDING VERIFICATIONS ===");
    const apiUrl = getApiUrl('/api/auth/admin/pending-verifications');
    console.log("API URL:", apiUrl);
    
    const response = await fetch(apiUrl);
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const users = await response.json();
    console.log("Pending verifications received:", users);
    console.log("Count:", users.length);
    
    const list = document.getElementById('pendingVerificationsList');
    
    if (!users || users.length === 0) {
      console.log("No pending verifications found");
      list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">✅ No pending verifications<br><small>All users have been reviewed</small></p>';
      return;
    }
    
    console.log(`Displaying ${users.length} pending verifications`);
    
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
          ${users.map(u => {
            console.log("Processing user:", u);
            return `
            <tr style="background: #fff3cd;">
              <td><b>${u.name}</b></td>
              <td>${u.email}</td>
              <td>${u.phone || 'N/A'}</td>
              <td>${u.idProofType || 'N/A'}</td>
              <td>${new Date(u.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewUserVerification('${u._id}')">👁️ View ID</button>
                <button class="btn btn-approve" onclick="approveUser('${u._id}', '${u.name.replace(/'/g, "\\'")}')">✓ Approve</button>
                <button class="btn btn-reject" onclick="rejectUser('${u._id}', '${u.name.replace(/'/g, "\\'")}')">✗ Reject</button>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    `;
    
    console.log("✅ Pending verifications loaded successfully");
  } catch (err) {
    console.error("=== LOAD PENDING VERIFICATIONS ERROR ===");
    console.error("Error:", err);
    console.error("Stack:", err.stack);
    document.getElementById('pendingVerificationsList').innerHTML = `
      <p style="color: #f44336; text-align: center; padding: 20px;">
        ❌ Failed to load pending verifications
        <br><small>${err.message}</small>
        <br><small>Check console for details</small>
      </p>
    `;
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
      overflow-y: auto;
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
    
    const statusColor = user.verificationStatus === 'pending' ? '#ff9800' : 
                       user.verificationStatus === 'approved' ? '#4CAF50' : '#f44336';
    
    modalContent.innerHTML = `
      <h2 style="color: #333; margin-bottom: 20px;">👤 User Verification Details</h2>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p><b>Name:</b> ${user.name}</p>
        <p><b>Email:</b> ${user.email}</p>
        <p><b>Phone:</b> ${user.phone || 'N/A'}</p>
        <p><b>ID Type:</b> ${user.idProofType || 'N/A'}</p>
        <p><b>Status:</b> <span style="color: ${statusColor}; font-weight: bold;">${user.verificationStatus.toUpperCase()}</span></p>
        <p><b>Registered:</b> ${new Date(user.createdAt).toLocaleString()}</p>
        ${user.verifiedAt ? `<p><b>Verified:</b> ${new Date(user.verifiedAt).toLocaleString()}</p>` : ''}
        ${user.rejectionReason ? `<p><b>Rejection Reason:</b> ${user.rejectionReason}</p>` : ''}
      </div>
      
      <div style="margin: 20px 0;">
        <h4 style="color: #333; margin-bottom: 10px;">📷 Uploaded ID Proof Photo:</h4>
        ${user.idProof ? `
          <img 
            src="${user.idProof.startsWith('data:') ? user.idProof : getApiUrl('/' + user.idProof)}" 
            style="max-width: 100%; border-radius: 8px; border: 2px solid #ddd; cursor: pointer;" 
            onclick="window.open('${user.idProof.startsWith('data:') ? user.idProof : getApiUrl('/' + user.idProof)}', '_blank')" 
            title="Click to view full size"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
          <p style="color: #f44336; display: none;">❌ Image failed to load.</p>
          <p style="color: #4CAF50; font-size: 12px; margin-top: 10px;">
            ${user.idProof.startsWith('data:') ? '✅ Image stored permanently in database' : '⚠️ Image stored in temporary filesystem'}
          </p>
        ` : '<p style="color: #999;">No ID proof uploaded</p>'}
      </div>
      
      <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
        ${user.verificationStatus === 'pending' ? `
          <button class="btn btn-approve" onclick="approveUser('${user._id}', '${user.name.replace(/'/g, "\\'")}'); this.closest('.modal-wrapper').remove();">✓ Approve User</button>
          <button class="btn btn-reject" onclick="rejectUser('${user._id}', '${user.name.replace(/'/g, "\\'")}'); this.closest('.modal-wrapper').remove();">✗ Reject User</button>
        ` : ''}
        ${!user.isBanned ? `
          <button class="btn btn-delete" onclick="banUserAccount('${user._id}', '${user.name.replace(/'/g, "\\'")}'); this.closest('.modal-wrapper').remove();">🚫 Ban User</button>
        ` : ''}
        <button class="btn btn-delete" onclick="deleteUserAccount('${user._id}', '${user.name.replace(/'/g, "\\'")}'); this.closest('.modal-wrapper').remove();">🗑️ Delete User</button>
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
  if (!confirm(`✅ Approve user: ${userName}?\n\nThis will allow them to login and use ASP services.`)) {
    return;
  }
  
  try {
    const response = await fetch(getApiUrl(`/api/auth/admin/approve-user/${userId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ User Approved: ${userName}\n\nThey can now login and use ASP services.`);
      loadPendingVerifications();
      loadUsers();
      loadDashboard();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to approve user'));
    }
  } catch (err) {
    console.error('Approve user error:', err);
    alert('❌ Failed to approve user');
  }
}

// Reject user
async function rejectUser(userId, userName) {
  const reason = prompt(`❌ Reject user: ${userName}?\n\nEnter rejection reason:`);
  if (!reason) return;
  
  try {
    const response = await fetch(getApiUrl(`/api/auth/admin/reject-user/${userId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`❌ User Rejected: ${userName}\n\nReason: ${reason}\n\nThey will see this reason when trying to login.`);
      loadPendingVerifications();
      loadUsers();
      loadDashboard();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to reject user'));
    }
  } catch (err) {
    console.error('Reject user error:', err);
    alert('❌ Failed to reject user');
  }
}

// Ban user account
async function banUserAccount(userId, userName) {
  const reason = prompt(`🚫 Ban user: ${userName}?\n\nEnter ban reason:`);
  if (!reason) return;
  
  try {
    const response = await fetch(getApiUrl(`/api/auth/admin/ban-user/${userId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`🚫 User Banned: ${userName}\n\nReason: ${reason}\n\nThey can no longer login.`);
      loadUsers();
      loadPendingVerifications();
      loadDashboard();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to ban user'));
    }
  } catch (err) {
    console.error('Ban user error:', err);
    alert('❌ Failed to ban user');
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
      alert(`🗑️ User Deleted: ${userName}`);
      loadUsers();
      loadPendingVerifications();
      loadDashboard();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to delete user'));
    }
  } catch (err) {
    console.error('Delete user error:', err);
    alert('❌ Failed to delete user');
  }
}

// Update loadUsers to show verification status
async function loadUsers() {
  try {
    const response = await fetch(getApiUrl('/api/auth/admin/all-users'));
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
            <th>Phone</th>
            <th>Status</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => {
            const bgColor = u.isBanned ? '#ffebee' : 
                           u.verificationStatus === 'approved' ? '#e8f5e9' : 
                           u.verificationStatus === 'pending' ? '#fff3cd' : '#fce4ec';
            
            return `
            <tr style="background: ${bgColor};">
              <td><b>${u.name}</b></td>
              <td>${u.email}</td>
              <td>${u.phone || 'N/A'}</td>
              <td>
                ${u.isBanned ? '<span class="status-badge" style="background: #f44336; color: white;">BANNED</span>' : ''}
                <span class="status-badge status-${u.verificationStatus}">${u.verificationStatus.toUpperCase()}</span>
              </td>
              <td>${new Date(u.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-view" onclick="viewUserVerification('${u._id}')">👁️ View</button>
                ${u.verificationStatus === 'pending' ? `
                  <button class="btn btn-approve" onclick="approveUser('${u._id}', '${u.name.replace(/'/g, "\\'")}')">✓ Approve</button>
                ` : ''}
                ${!u.isBanned ? `
                  <button class="btn btn-delete" onclick="banUserAccount('${u._id}', '${u.name.replace(/'/g, "\\'")}')">🚫 Ban</button>
                ` : ''}
                <button class="btn btn-delete" onclick="deleteUserAccount('${u._id}', '${u.name.replace(/'/g, "\\'")}')">🗑️ Delete</button>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Load users error:', err);
    document.getElementById('usersList').innerHTML = '<p style="color: #f44336; text-align: center;">Failed to load users</p>';
  }
}
