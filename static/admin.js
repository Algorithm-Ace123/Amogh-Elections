document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    const msg = document.getElementById('login-msg');
    
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({password: pass})
        });
        
        if (res.ok) {
            showDashboard();
        } else {
            msg.innerHTML = '<span class="error-text">Incorrect Password</span>';
        }
    } catch (err) {
        msg.innerHTML = '<span class="error-text">Network error</span>';
    }
});

async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    document.getElementById('login-section').style.display = 'block';
    document.querySelectorAll('.admin-layout').forEach(el => el.style.display = 'none');
}

function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.querySelectorAll('.admin-layout').forEach(el => el.style.display = 'block');
    switchAdminTab('submissions');
}

function switchAdminTab(tabId, clickedBtn) {
    document.querySelectorAll('#admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    if (clickedBtn) clickedBtn.classList.add('active');
    
    document.querySelectorAll('.admin-tab-content').forEach(content => content.style.display = 'none');
    document.getElementById('tab-' + tabId).style.display = 'block';
    
    if (tabId === 'submissions') loadSubmissions('feedback');
    if (tabId === 'polls') loadAdminPolls();
    if (tabId === 'tasks') loadAdminTasks();
    if (tabId === 'announcements') loadAdminAnnouncements();
    if (tabId === 'pulse') loadAdminPulse();
    if (tabId === 'filter') loadFilterLogs();
}

// --- SUBMISSIONS MANAGER ---

let currentSubmissionsTable = 'feedback';

async function loadSubmissions(table) {
    currentSubmissionsTable = table;
    const tbody = document.getElementById('submissions-table-body');
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    
    // update inner tabs
    document.querySelectorAll('#tab-submissions .tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(table.split('_')[0])) btn.classList.add('active');
    });

    closeResponsePanel();

    try {
        let endpoint = '/api/admin/ideas';
        if (table === 'feedback') endpoint = '/api/admin/feedback';
        else if (table === 'lost_found') endpoint = '/api/lost_found';
        else if (table === 'study_groups') endpoint = '/api/study_groups';

        const res = await fetch(endpoint);
        const data = await res.json();
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No submissions found.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(i => {
            const id = i.case_id || i.idea_id || i.tracking_id || i.id;
            const content = i.message || i.description || i.item_name || i.topic || 'No description';
            const status = i.status || (i.type ? 'Active' : 'N/A');
            const priority = i.priority || 'Medium';
            const date = new Date(i.created_at || i.date_posted).toLocaleDateString();

            return `
                <tr class="${i.is_spam ? 'spam-row' : ''}">
                    <td><strong>${id}</strong><br><small class="text-muted">${date}</small></td>
                    <td>
                        ${i.title ? `<strong>${i.title}</strong><br>` : ''}
                        <small>${content.substring(0, 60)}...</small>
                    </td>
                    <td>
                        <span class="badge ${status==='Resolved'?'badge-fire':'badge-ice'}">${status}</span><br>
                        <span class="badge" style="background:transparent; border:1px solid #eee; margin-top:4px; color:var(--text-label); font-size:0.65rem;">${priority}</span>
                    </td>
                    <td>
                        <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.8rem; border-radius:10px;" onclick='openResponsePanel(${JSON.stringify(i).replace(/'/g, "&apos;")}, "${table}")'>Manage</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" class="error-text">Failed to load data.</td></tr>';
    }
}

function openResponsePanel(item, table) {
    const panel = document.getElementById('response-panel');
    panel.style.display = 'flex';
    
    const titleDisplay = item.case_id || item.tracking_id || item.idea_id || 'Entry';
    document.getElementById('panel-title').textContent = `Manage ${titleDisplay}`;
    
    // Show full message / description
    const fullContent = item.message || item.description || item.item_name || item.topic || 'No content details.';
    document.getElementById('panel-desc').textContent = fullContent;
    
    document.getElementById('r-table').value = table;
    document.getElementById('r-id').value = titleDisplay;
    document.getElementById('r-db-id').value = item.id;
    
    // Dynamically set status options based on table
    let statusOpts = '';
    if (table === 'feedback') statusOpts = '<option value="Received">Received</option><option value="Under Review">Under Review</option><option value="Escalated">Escalated</option><option value="Resolved">Resolved</option>';
    else if (table === 'ideas') statusOpts = '<option value="Received">Received</option><option value="Acknowledged">Acknowledged</option><option value="Being Explored">Being Explored</option><option value="Implemented">Implemented</option>';
    else if (table === 'lost_found') statusOpts = '<option value="Posted">Posted</option><option value="Active">Active</option><option value="Claimed">Claimed</option><option value="Expired">Expired</option>';
    else if (table === 'study_groups') statusOpts = '<option value="Posted">Posted</option><option value="Active">Active</option><option value="Matched">Matched</option><option value="Expired">Expired</option>';
    
    document.getElementById('r-status').innerHTML = statusOpts;
    document.getElementById('r-status').value = item.status || (table === 'feedback' || table === 'ideas' ? 'Received' : 'Active');
    
    document.getElementById('r-priority').value = item.priority || 'Medium';
    document.getElementById('r-response').value = item.admin_response || '';
    document.getElementById('r-result').textContent = '';
}

function closeResponsePanel() {
    document.getElementById('response-panel').style.display = 'none';
}

async function deleteSubmission() {
    const table = document.getElementById('r-table').value;
    const id = document.getElementById('r-db-id').value;
    const msg = document.getElementById('r-result');

    if (!confirm('Are you absolutely sure you want to delete this submission? This action cannot be undone.')) return;

    try {
        const res = await fetch(`/api/admin/submissions/${table}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            msg.innerHTML = '<span class="success-text">Deleted successfully.</span>';
            setTimeout(() => {
                closeResponsePanel();
                loadSubmissions(table);
            }, 1000);
        } else {
            msg.innerHTML = '<span class="error-text">Delete failed.</span>';
        }
    } catch (e) {
        msg.innerHTML = '<span class="error-text">Network error.</span>';
    }
}

document.getElementById('response-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const table = document.getElementById('r-table').value;
    const id = document.getElementById('r-db-id').value;
    const msg = document.getElementById('r-result');
    const btn = e.target.querySelector('button[type="submit"]');

    const payload = {
        status: document.getElementById('r-status').value,
        priority: document.getElementById('r-priority').value,
        admin_response: document.getElementById('r-response').value
    };

    console.log("Update payload:", payload);
    console.log("Table:", table, "ID:", id);

    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
        const res = await fetch(`/api/admin/submissions/${table}/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        console.log("Update response:", res.status, data);
        
        if (res.ok) {
            msg.innerHTML = '<span class="success-text">Update successful!</span>';
            setTimeout(() => {
                closeResponsePanel();
                loadSubmissions(table);
            }, 1000);
        } else {
            msg.innerHTML = `<span class="error-text">Update failed: ${data.error || 'Unknown error'}</span>`;
            console.error("Update failed:", data);
        }
    } catch (e) {
        msg.innerHTML = '<span class="error-text">Network error: ' + e.message + '</span>';
        console.error("Network error:", e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Update Submission';
    }
});

// --- POLLS MANAGER ---

function togglePollOptions(type) {
    const opts = document.getElementById('p-options-container');
    if (type === 'Yes-No') opts.style.display = 'none';
    else opts.style.display = 'block';
}

async function loadAdminPolls() {
    const tbody = document.getElementById('polls-table-body');
    try {
        const res = await fetch('/api/polls');
        const data = await res.json();
        if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No polls found.</td></tr>'; return; }
        
        tbody.innerHTML = data.map(p => {
            const total = p.options ? p.options.reduce((sum, o) => sum + (o.votes || 0), 0) : 0;
            return `
            <tr>
                <td><strong>${p.question}</strong><br><small class="text-muted">${new Date(p.created_at).toLocaleDateString()}</small></td>
                <td><span class="badge badge-info">${p.type}</span></td>
                <td><span class="badge ${p.status==='Active'?'badge-fire':''}">  ${p.status}</span></td>
                <td>${total}</td>
                <td>
                    <button class="btn" style="padding:4px 10px; font-size:0.75rem; border-color:#ef4444; color:#ef4444;" onclick="deletePoll('${p.id}')">Delete</button>
                </td>
            </tr>
        `}).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5">Error loading polls</td></tr>'; }
}

async function deletePoll(id) {
    if (!confirm('Delete this poll and all its options/votes? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/admin/polls/${id}`, { method: 'DELETE' });
        if (res.ok) loadAdminPolls();
        else alert('Failed to delete poll.');
    } catch(e) { alert('Network error.'); }
}

document.getElementById('create-poll-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('p-type').value;
    const optsInput = document.getElementById('p-options').value;
    let options = [];
    if (type === 'Yes-No') options = ['Yes', 'No'];
    else options = optsInput.split(',').map(s => s.trim()).filter(s => s);
    
    if (type !== 'Yes-No' && options.length < 2) {
        document.getElementById('p-result').innerHTML = '<span class="error-text">Provide at least 2 options</span>';
        return;
    }
    
    const payload = {
        question: document.getElementById('p-question').value,
        type: type,
        status: document.getElementById('p-status').value,
        options: options
    };
    
    try {
        const res = await fetch('/api/polls', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if (res.ok) {
            document.getElementById('create-poll-form').reset();
            document.getElementById('p-result').innerHTML = '<span class="success-text">Poll created!</span>';
            loadAdminPolls();
        }
    } catch(e) { document.getElementById('p-result').innerHTML = '<span class="error-text">Failed to create poll</span>'; }
});

// --- TASKS MANAGER ---

let currentEditTask = null;

async function loadAdminTasks() {
    const tbody = document.getElementById('tasks-table-body');
    try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No tasks found.</td></tr>'; return; }
        tbody.innerHTML = data.map(t => {
            const total = t.subtasks ? t.subtasks.length : 0;
            const done = t.subtasks ? t.subtasks.filter(s => s.is_completed).length : 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            let sb = t.status === 'Completed' ? 'badge-success' : 'badge-ice';
            if (t.status === 'Planned') sb = '';
            if (t.status === 'Blocked') sb = 'badge-fire';
            return `
            <tr>
                <td><strong>${t.title}</strong><br><small class="text-muted">${t.focus_area}</small></td>
                <td style="min-width:130px;">
                    ${total > 0 ? `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:var(--ice-color);border-radius:99px;"></div>
                        </div>
                        <small class="text-muted" style="white-space:nowrap;">${done}/${total}</small>
                    </div>` : '<small class="text-muted">No subtasks</small>'}
                </td>
                <td><span class="badge ${sb}">${t.status}</span></td>
                <td>${t.assignee || '—'}</td>
                <td><button class="btn btn-secondary" style="padding:5px 12px;font-size:0.78rem;border-radius:8px;" onclick='openTaskPanel(${JSON.stringify(t).replace(/'/g, "&apos;")})'>Edit</button></td>
            </tr>`;
        }).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5">Error loading tasks</td></tr>'; }
}

function openTaskPanel(task) {
    currentEditTask = task;
    document.getElementById('tk-edit-id').value = task.id;
    document.getElementById('tk-title').value = task.title;
    document.getElementById('tk-focus').value = task.focus_area;
    document.getElementById('tk-assignee').value = task.assignee || '';
    document.getElementById('tk-status').value = task.status;
    document.getElementById('task-panel-title').textContent = 'Edit Task';
    document.getElementById('tk-submit-btn').textContent = 'Save Changes';
    document.getElementById('tk-delete-btn').style.display = 'block';
    document.getElementById('task-panel-new-btn').style.display = 'block';
    document.getElementById('tk-create-subtasks').style.display = 'none';
    document.getElementById('tk-edit-subtasks').style.display = 'block';
    document.getElementById('tk-result').textContent = '';
    renderSubtaskChecklist(task.subtasks || []);
}

function resetTaskPanel() {
    currentEditTask = null;
    document.getElementById('task-form').reset();
    document.getElementById('tk-edit-id').value = '';
    document.getElementById('task-panel-title').textContent = 'Create Task';
    document.getElementById('tk-submit-btn').textContent = 'Create Task';
    document.getElementById('tk-delete-btn').style.display = 'none';
    document.getElementById('task-panel-new-btn').style.display = 'none';
    document.getElementById('tk-create-subtasks').style.display = 'block';
    document.getElementById('tk-edit-subtasks').style.display = 'none';
    document.getElementById('tk-result').textContent = '';
}

function renderSubtaskChecklist(subtasks) {
    const total = subtasks.length;
    const done = subtasks.filter(s => s.is_completed).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    document.getElementById('tk-progress-text').textContent = total > 0 ? `${done}/${total} done (${pct}%)` : '0 subtasks';
    document.getElementById('tk-progress-bar').style.width = pct + '%';
    const container = document.getElementById('tk-subtasks-checklist');
    if (!subtasks.length) {
        container.innerHTML = '<p style="color:var(--text-label);font-size:0.85rem;margin:0;">No subtasks yet. Add one below.</p>';
        return;
    }
    container.innerHTML = subtasks.map(st => `
        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.55rem 0.75rem;border-radius:10px;cursor:pointer;background:${st.is_completed?'#f0fdf4':'#f8fafc'};border:1px solid ${st.is_completed?'#bbf7d0':'#e2e8f0'};transition:all 0.2s;">
            <input type="checkbox" data-id="${st.id}" ${st.is_completed?'checked':''} onchange="toggleSubtask(this)" style="width:15px;height:15px;accent-color:var(--ice-color);cursor:pointer;flex-shrink:0;">
            <span style="font-size:0.88rem;${st.is_completed?'text-decoration:line-through;color:var(--text-label);':''}">${st.title}</span>
        </label>
    `).join('');
}

async function toggleSubtask(checkbox) {
    const id = checkbox.dataset.id;
    const done = checkbox.checked;
    try {
        await fetch('/api/tasks', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: currentEditTask.id, subtasks: [{ id, is_completed: done }] })
        });
        const st = currentEditTask.subtasks.find(s => s.id === id);
        if (st) st.is_completed = done;
        renderSubtaskChecklist(currentEditTask.subtasks);
        loadAdminTasks();
    } catch(e) { console.error('Subtask toggle failed', e); }
}

async function addSubtaskInline() {
    const input = document.getElementById('tk-new-subtask');
    const title = input.value.trim();
    if (!title || !currentEditTask) return;
    try {
        const res = await fetch(`/api/admin/tasks/${currentEditTask.id}/subtasks`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title })
        });
        if (res.ok) {
            const newSt = await res.json();
            currentEditTask.subtasks.push(newSt);
            renderSubtaskChecklist(currentEditTask.subtasks);
            loadAdminTasks();
            input.value = '';
        } else {
            const d = await res.json();
            alert('Failed to add subtask: ' + (d.error || 'Unknown error'));
        }
    } catch(e) { alert('Network error'); }
}

async function deleteTaskFromPanel() {
    if (!currentEditTask || !confirm('Delete this task and all subtasks? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/admin/tasks/${currentEditTask.id}`, { method: 'DELETE' });
        if (res.ok) { resetTaskPanel(); loadAdminTasks(); }
        else alert('Failed to delete task.');
    } catch(e) { alert('Network error.'); }
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('tk-edit-id').value;
    const msg = document.getElementById('tk-result');
    const btn = document.getElementById('tk-submit-btn');
    btn.disabled = true;

    const payload = {
        title: document.getElementById('tk-title').value,
        focus_area: document.getElementById('tk-focus').value,
        assignee: document.getElementById('tk-assignee').value,
        status: document.getElementById('tk-status').value,
    };

    try {
        if (editId) {
            // Update existing task details
            const res = await fetch(`/api/admin/tasks/${editId}/details`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                msg.innerHTML = '<span class="success-text">Saved!</span>';
                loadAdminTasks();
                if (currentEditTask) {
                    currentEditTask.title = payload.title;
                    currentEditTask.focus_area = payload.focus_area;
                    currentEditTask.assignee = payload.assignee;
                    currentEditTask.status = payload.status;
                }
                setTimeout(() => { msg.textContent = ''; }, 2000);
            } else {
                const d = await res.json();
                msg.innerHTML = `<span class="error-text">Error: ${d.error}</span>`;
            }
        } else {
            // Create new task
            const stInput = document.getElementById('tk-subtasks-input').value;
            payload.subtasks = stInput.split(',').map(s => s.trim()).filter(s => s);
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                document.getElementById('task-form').reset();
                msg.innerHTML = '<span class="success-text">Task created!</span>';
                loadAdminTasks();
                setTimeout(() => { msg.textContent = ''; }, 2000);
            } else {
                msg.innerHTML = '<span class="error-text">Failed to create task.</span>';
            }
        }
    } catch(e) {
        msg.innerHTML = '<span class="error-text">Network error.</span>';
    } finally {
        btn.disabled = false;
    }
});



// --- FILTER LOGS ---
async function loadFilterLogs() {
    const tbody = document.getElementById('filter-logs-body');
    try {
        const res = await fetch('/api/admin/filter_logs');
        const data = await res.json();
        if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No rejected logs.</td></tr>'; return; }
        
        tbody.innerHTML = data.map(log => `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${log.form_type}</td>
                <td><span style="color:var(--fire-color); font-weight:bold;">${log.reason}</span></td>
                <td>${log.flagged_tokens ? `<code>${log.flagged_tokens}</code>` : '-'}</td>
                <td><small>${log.truncated_text}</small></td>
                <td>
                    ${log.reason === 'Vernacular' ? 
                        `<button onclick="markFalsePositive('${log.flagged_tokens.split(',')[0].trim()}')" class="btn" style="padding:4px 8px; font-size:0.75rem;">False Positive</button>` 
                        : '-'}
                </td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6">Error loading filter logs.</td></tr>'; }
}

async function markFalsePositive(token) {
    if (!confirm(`Whitelist the token "${token}" so it won't be flagged as Vernacular again?`)) return;
    try {
        const res = await fetch('/api/admin/whitelist', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({token})
        });
        if (res.ok) {
            alert('Added to whitelist! It will take effect on next client load.');
            loadFilterLogs(); 
        } else {
            alert("Failed to whitelist.");
        }
    } catch(e) {
        alert("Network error.");
    }
}

// --- ANNOUNCEMENTS ---
async function loadAdminAnnouncements() {
    const tbody = document.getElementById('announcements-table-body');
    try {
        const res = await fetch('/api/admin/announcements');
        if (!res.ok) { tbody.innerHTML = '<tr><td colspan="4">Unauthorized.</td></tr>'; return; }
        const data = await res.json();
        if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4">No announcements yet.</td></tr>'; return; }
        tbody.innerHTML = data.map(a => `
            <tr>
                <td><small>${new Date(a.date || a.created_at).toLocaleDateString()}</small></td>
                <td><strong>${a.title}</strong></td>
                <td><small>${(a.description || '').substring(0, 80)}${a.description && a.description.length > 80 ? '...' : ''}</small></td>
                <td>
                    <button class="btn btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick='editAnnouncement(${JSON.stringify(a).replace(/'/g, "&apos;")})'>Edit</button>
                    <button class="btn" style="padding:4px 10px; font-size:0.75rem; border-color:#ef4444; color:#ef4444;" onclick="deleteAnnouncement('${a.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="4">Error loading.</td></tr>'; }
}

function editAnnouncement(ann) {
    document.getElementById('a-edit-id').value = ann.id;
    document.getElementById('a-title').value = ann.title;
    document.getElementById('a-desc').value = ann.description;
    document.getElementById('ann-form-title').textContent = 'Edit Announcement';
    document.getElementById('ann-submit-btn').textContent = 'Save Changes';
    document.getElementById('ann-cancel-edit').style.display = 'block';
    document.getElementById('announcement-msg').textContent = '';
}

function resetAnnouncementForm() {
    document.getElementById('announcement-form').reset();
    document.getElementById('a-edit-id').value = '';
    document.getElementById('ann-form-title').textContent = 'Post Announcement';
    document.getElementById('ann-submit-btn').textContent = 'Broadcast Announcement';
    document.getElementById('ann-cancel-edit').style.display = 'none';
    document.getElementById('announcement-msg').textContent = '';
}

async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/admin/announcements/${id}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });
        if (res.ok) {
            loadAdminAnnouncements();
            if (document.getElementById('a-edit-id').value === id) {
                resetAnnouncementForm();
            }
        } else {
            const data = await res.json().catch(() => ({}));
            alert(`Delete failed (${res.status}): ${data.error || 'Unknown error'}`);
        }
    } catch(e) { alert('Network error: ' + e.message); }
}

document.getElementById('announcement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('a-edit-id').value;
    const title = document.getElementById('a-title').value;
    const desc = document.getElementById('a-desc').value;
    const msg = document.getElementById('announcement-msg');
    const btn = document.getElementById('ann-submit-btn');
    btn.disabled = true;
    
    try {
        if (editId) {
            const res = await fetch(`/api/admin/announcements/${editId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title, description: desc})
            });
            if (res.ok) {
                msg.innerHTML = '<span class="success-text">Announcement Updated!</span>';
                resetAnnouncementForm();
                loadAdminAnnouncements();
                setTimeout(() => { msg.innerHTML = ''; }, 3000);
            } else {
                msg.innerHTML = '<span class="error-text">Failed to update</span>';
            }
        } else {
            const res = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title, description: desc})
            });
            if (res.ok) {
                msg.innerHTML = '<span class="success-text">Announcement Posted!</span>';
                document.getElementById('announcement-form').reset();
                loadAdminAnnouncements();
                setTimeout(() => { msg.innerHTML = ''; }, 3000);
            } else {
                msg.innerHTML = '<span class="error-text">Failed to post</span>';
            }
        }
    } catch (err) { msg.innerHTML = '<span class="error-text">Network error</span>'; }
    finally {
        btn.disabled = false;
    }
});

// --- PULSE ISSUES ---
async function loadAdminPulse() {
    const tbody = document.getElementById('pulse-table-body');
    try {
        const res = await fetch('/api/pulse');
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) { tbody.innerHTML = '<tr><td colspan="4">No pulse issues yet.</td></tr>'; return; }
        tbody.innerHTML = data.map(p => `
            <tr>
                <td><strong>${p.issue_name}</strong></td>
                <td><small>${p.description || '—'}</small></td>
                <td><span class="badge badge-ice">${p.votes || 0} votes</span></td>
                <td><button class="btn" style="padding:4px 10px; font-size:0.75rem; border-color:#ef4444; color:#ef4444;" onclick="deletePulse('${p.id}')">Delete</button></td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="4">Error loading pulse issues.</td></tr>'; }
}

async function deletePulse(id) {
    if (!confirm('Delete this pulse issue? All votes will be lost.')) return;
    try {
        const res = await fetch(`/api/admin/pulse/${id}`, { method: 'DELETE' });
        if (res.ok) loadAdminPulse();
        else alert('Failed to delete pulse issue.');
    } catch(e) { alert('Network error.'); }
}

document.getElementById('create-pulse-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const issue_name = document.getElementById('pulse-title').value;
    const msg = document.getElementById('pulse-result');
    try {
        const res = await fetch('/api/admin/pulse', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({issue_name})
        });
        if (res.ok) {
            msg.innerHTML = '<span class="success-text">Pulse issue created!</span>';
            document.getElementById('create-pulse-form').reset();
            loadAdminPulse();
            setTimeout(() => { msg.innerHTML = ''; }, 3000);
        } else {
            const d = await res.json();
            msg.innerHTML = `<span class="error-text">Failed: ${d.error || 'Unknown error'}</span>`;
        }
    } catch(err) { msg.innerHTML = '<span class="error-text">Network error</span>'; }
});
