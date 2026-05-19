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
    if (tabId === 'fests') loadAdminFests();
    if (tabId === 'registrations') loadAdminRegistrations();
    if (tabId === 'tasks') loadAdminTasks();
    if (tabId === 'announcements') loadAdminAnnouncements();
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
                        <span class="badge ${status==='Resolved'?'badge-primary':'badge-accent'}">${status}</span><br>
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

// --- FESTS & EVENTS MANAGER ---

async function loadAdminFests() {
    const tbody = document.getElementById('fests-table-body');
    if (!tbody) return;
    try {
        const res = await fetch('/api/fests');
        const fests = await res.json();
        
        if (fests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">No fests found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = fests.map(f => `
            <tr>
                <td><strong>${f.name}</strong></td>
                <td>
                    <button class="btn btn-primary" style="padding:4px 10px; font-size:0.75rem; margin-right:5px;" onclick="selectFest('${f.id}', '${f.name}')">Manage Events</button>
                    <button class="btn" style="padding:4px 10px; font-size:0.75rem; border-color:#ef4444; color:#ef4444;" onclick="deleteFest('${f.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="2">Error loading fests.</td></tr>';
    }
}

async function deleteFest(id) {
    if (!confirm('Are you sure you want to delete this fest and all its events and student registrations?')) return;
    try {
        const res = await fetch(`/api/fests/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminFests();
            const currentSelectedFestId = document.getElementById('selected-fest-id').value;
            if (currentSelectedFestId === id) {
                document.getElementById('fest-events-control').style.display = 'none';
                document.getElementById('no-fest-selected-msg').style.display = 'block';
            }
        } else {
            alert('Failed to delete fest.');
        }
    } catch (e) {
        alert('Network error.');
    }
}

function selectFest(id, name) {
    document.getElementById('no-fest-selected-msg').style.display = 'none';
    document.getElementById('fest-events-control').style.display = 'block';
    document.getElementById('selected-fest-title').textContent = `Events for: ${name}`;
    document.getElementById('selected-fest-id').value = id;
    
    // Clear result message
    document.getElementById('event-result').textContent = '';
    
    loadAdminEvents(id);
}

async function loadAdminEvents(festId) {
    const tbody = document.getElementById('events-table-body');
    if (!tbody) return;
    try {
        const res = await fetch(`/api/fests/${festId}/events`);
        const events = await res.json();
        
        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">No events found under this fest.</td></tr>';
            return;
        }
        
        tbody.innerHTML = events.map(e => `
            <tr>
                <td><strong>${e.name}</strong></td>
                <td>
                    <button class="btn" style="padding:4px 10px; font-size:0.75rem; border-color:#ef4444; color:#ef4444;" onclick="deleteEvent('${e.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="2">Error loading events.</td></tr>';
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event and all its registrations?')) return;
    const festId = document.getElementById('selected-fest-id').value;
    try {
        const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminEvents(festId);
        } else {
            alert('Failed to delete event.');
        }
    } catch (e) {
        alert('Network error.');
    }
}

// Form listeners for Fests and Events
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-fest-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('fest-name-input');
        const name = input.value.trim();
        const result = document.getElementById('fest-result');
        if (!name) return;
        try {
            const res = await fetch('/api/fests', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                input.value = '';
                result.innerHTML = '<span class="success-text">Fest created!</span>';
                loadAdminFests();
            } else {
                const data = await res.json();
                result.innerHTML = `<span class="error-text">${data.error || 'Failed to create fest'}</span>`;
            }
        } catch (e) {
            result.innerHTML = '<span class="error-text">Network error</span>';
        }
    });

    document.getElementById('create-event-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('event-name-input');
        const name = input.value.trim();
        const festId = document.getElementById('selected-fest-id').value;
        const result = document.getElementById('event-result');
        if (!name || !festId) return;
        try {
            const res = await fetch(`/api/fests/${festId}/events`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                input.value = '';
                result.innerHTML = '<span class="success-text">Event created!</span>';
                loadAdminEvents(festId);
            } else {
                const data = await res.json();
                result.innerHTML = `<span class="error-text">${data.error || 'Failed to create event'}</span>`;
            }
        } catch (e) {
            result.innerHTML = '<span class="error-text">Network error</span>';
        }
    });
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
            let sb = t.status === 'Completed' ? 'badge-success' : 'badge-accent';
            if (t.status === 'Planned') sb = '';
            if (t.status === 'Blocked') sb = 'badge-primary';
            return `
            <tr>
                <td><strong>${t.title}</strong><br><small class="text-muted">${t.focus_area}</small></td>
                <td style="min-width:130px;">
                    ${total > 0 ? `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:var(--primary-color);border-radius:99px;"></div>
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
            <input type="checkbox" data-id="${st.id}" ${st.is_completed?'checked':''} onchange="toggleSubtask(this)" style="width:15px;height:15px;accent-color:var(--primary-color);cursor:pointer;flex-shrink:0;">
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
                <td><span style="color:var(--primary-color); font-weight:bold;">${log.reason}</span></td>
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

// --- REGISTRATIONS ---
let allRegistrations = [];
let filteredRegistrations = [];
let registrationsFiltersInitialized = false;

function initRegistrationsFilters() {
    const searchInput = document.getElementById('reg-filter-search');
    const festSelect = document.getElementById('reg-filter-fest');
    const eventSelect = document.getElementById('reg-filter-event');
    const classSelect = document.getElementById('reg-filter-class');
    const sortSelect = document.getElementById('reg-filter-sort');
    const clearBtn = document.getElementById('btn-clear-reg-filters');
    
    if (searchInput) searchInput.addEventListener('input', applyRegistrationsFiltersAndSort);
    if (festSelect) festSelect.addEventListener('change', onFestFilterChange);
    if (eventSelect) eventSelect.addEventListener('change', applyRegistrationsFiltersAndSort);
    if (classSelect) classSelect.addEventListener('change', applyRegistrationsFiltersAndSort);
    if (sortSelect) sortSelect.addEventListener('change', applyRegistrationsFiltersAndSort);
    if (clearBtn) clearBtn.addEventListener('click', clearRegistrationsFilters);
    
    populateFestFilter();
}

async function populateFestFilter() {
    const festSelect = document.getElementById('reg-filter-fest');
    if (!festSelect) return;
    
    const selectedVal = festSelect.value;
    festSelect.innerHTML = '<option value="">All Fests</option>';
    
    try {
        const res = await fetch('/api/fests');
        const fests = await res.json();
        fests.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name;
            festSelect.appendChild(opt);
        });
        
        if (selectedVal && Array.from(festSelect.options).some(opt => opt.value === selectedVal)) {
            festSelect.value = selectedVal;
        }
    } catch (e) {
        console.error("Failed to load fests for filter", e);
    }
}

async function onFestFilterChange() {
    const festId = document.getElementById('reg-filter-fest').value;
    const eventSelect = document.getElementById('reg-filter-event');
    if (!eventSelect) return;
    
    eventSelect.innerHTML = '<option value="">All Events</option>';
    
    if (!festId) {
        eventSelect.disabled = true;
        eventSelect.innerHTML = '<option value="">All Events (Select Fest First)</option>';
        applyRegistrationsFiltersAndSort();
        return;
    }
    
    eventSelect.disabled = false;
    try {
        const res = await fetch(`/api/fests/${festId}/events`);
        const events = await res.json();
        events.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id;
            opt.textContent = e.name;
            eventSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Failed to load events for filter", e);
    }
    
    applyRegistrationsFiltersAndSort();
}

function clearRegistrationsFilters() {
    const searchInput = document.getElementById('reg-filter-search');
    const festSelect = document.getElementById('reg-filter-fest');
    const eventSelect = document.getElementById('reg-filter-event');
    const classSelect = document.getElementById('reg-filter-class');
    const sortSelect = document.getElementById('reg-filter-sort');
    
    if (searchInput) searchInput.value = '';
    if (festSelect) festSelect.value = '';
    if (eventSelect) {
        eventSelect.innerHTML = '<option value="">All Events (Select Fest First)</option>';
        eventSelect.value = '';
        eventSelect.disabled = true;
    }
    if (classSelect) classSelect.value = '';
    if (sortSelect) sortSelect.value = 'date-desc';
    
    applyRegistrationsFiltersAndSort();
}

function applyRegistrationsFiltersAndSort() {
    const searchVal = (document.getElementById('reg-filter-search')?.value || '').toLowerCase().trim();
    const festVal = document.getElementById('reg-filter-fest')?.value || '';
    const eventVal = document.getElementById('reg-filter-event')?.value || '';
    const classVal = document.getElementById('reg-filter-class')?.value || '';
    const sortVal = document.getElementById('reg-filter-sort')?.value || 'date-desc';
    
    filteredRegistrations = allRegistrations.filter(r => {
        // Search filter (Name or Phone number)
        const nameMatch = r.name && r.name.toLowerCase().includes(searchVal);
        const phoneMatch = r.phone_number && r.phone_number.toLowerCase().includes(searchVal);
        const searchMatch = !searchVal || nameMatch || phoneMatch;
        
        // Fest filter
        const festMatch = !festVal || String(r.fest_id) === String(festVal);
        
        // Event filter
        const eventMatch = !eventVal || String(r.event_id) === String(eventVal);
        
        // Class filter
        const classMatch = !classVal || String(r.class) === String(classVal);
        
        return searchMatch && festMatch && eventMatch && classMatch;
    });
    
    // Sort
    filteredRegistrations.sort((a, b) => {
        if (sortVal === 'date-desc') {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        } else if (sortVal === 'date-asc') {
            return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        } else if (sortVal === 'name-asc') {
            return (a.name || '').localeCompare(b.name || '');
        } else if (sortVal === 'name-desc') {
            return (b.name || '').localeCompare(a.name || '');
        } else if (sortVal === 'class-asc') {
            const classA = parseInt(a.class) || 0;
            const classB = parseInt(b.class) || 0;
            return classA - classB;
        } else if (sortVal === 'class-desc') {
            const classA = parseInt(a.class) || 0;
            const classB = parseInt(b.class) || 0;
            return classB - classA;
        }
        return 0;
    });
    
    // Update Stats
    const totalRegsEl = document.getElementById('stat-total-regs');
    const filteredRegsEl = document.getElementById('stat-filtered-regs');
    if (totalRegsEl) totalRegsEl.textContent = allRegistrations.length;
    if (filteredRegsEl) filteredRegsEl.textContent = filteredRegistrations.length;
    
    renderRegistrationsTable(filteredRegistrations);
}

function renderRegistrationsTable(data) {
    const tbody = document.getElementById('registrations-table-body');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 3rem; color: var(--text-label); font-weight: 500;">No registrations found matching the filters.</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(r => {
        const fest_name = r.fests ? r.fests.name : 'Unknown Fest';
        const event_name = r.events ? r.events.name : 'Unknown Event';
        const date = new Date(r.created_at).toLocaleDateString();
        
        const cv_html = r.cv_resume ? `<a href="${r.cv_resume}" target="_blank" class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; text-decoration:none; display:inline-block; margin-bottom:4px;">View CV</a>` : '<span class="text-muted">No CV</span>';
        const msg_html = r.message ? `<div style="max-width:200px; font-size:0.75rem; color:var(--text-label); white-space:normal; word-wrap:break-word;">${r.message}</div>` : '<span class="text-muted">—</span>';
        
        return `
            <tr>
                <td>
                    <strong>${r.name}</strong><br>
                    <small class="text-muted">Class ${r.class} - Sec ${r.section}</small>
                </td>
                <td>
                    <small><strong>Phone:</strong> ${r.phone_number}</small><br>
                    <small><strong>Parent:</strong> ${r.parent_phone_number}</small>
                </td>
                <td>
                    <span class="badge badge-accent">${fest_name}</span><br>
                    <small class="text-muted">${event_name}</small><br>
                    <small class="text-muted" style="font-size:0.7rem;">${date}</small>
                </td>
                <td>
                    ${cv_html}
                    ${msg_html}
                </td>
                <td>
                    <button class="btn" style="padding:4px 10px; font-size:0.75rem; border-color:#ef4444; color:#ef4444;" onclick="deleteRegistration('${r.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadAdminRegistrations() {
    const tbody = document.getElementById('registrations-table-body');
    if (!tbody) return;
    
    if (!registrationsFiltersInitialized) {
        initRegistrationsFilters();
        registrationsFiltersInitialized = true;
    } else {
        populateFestFilter();
    }
    
    tbody.innerHTML = '<tr><td colspan="5">Loading registrations...</td></tr>';
    try {
        const res = await fetch('/api/registrations');
        allRegistrations = await res.json();
        applyRegistrationsFiltersAndSort();
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5">Error loading registrations.</td></tr>';
    }
}

async function deleteRegistration(id) {
    if (!confirm('Are you sure you want to delete this student registration?')) return;
    try {
        const res = await fetch(`/api/admin/submissions/registrations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminRegistrations();
        } else {
            alert('Failed to delete registration.');
        }
    } catch (e) {
        alert('Network error.');
    }
}

function exportRegistrations(type) {
    const regsToExport = type === 'all' ? allRegistrations : filteredRegistrations;
    if (regsToExport.length === 0) {
        alert("No registrations to export.");
        return;
    }
    
    // Construct CSV
    const headers = ["Name", "Class", "Section", "Phone Number", "Parent Phone Number", "Fest", "Event", "CV/Resume", "Message", "Registered At"];
    const rows = regsToExport.map(r => {
        const fest_name = r.fests ? r.fests.name : 'Unknown Fest';
        const event_name = r.events ? r.events.name : 'Unknown Event';
        const date = new Date(r.created_at).toLocaleString();
        
        return [
            r.name,
            r.class,
            r.section,
            r.phone_number,
            r.parent_phone_number,
            fest_name,
            event_name,
            r.cv_resume || '',
            r.message || '',
            date
        ].map(val => {
            // Escape double quotes and wrap in quotes if contains comma, quote, or newline
            let cleanVal = String(val).replace(/"/g, '""');
            if (cleanVal.includes(',') || cleanVal.includes('"') || cleanVal.includes('\n') || cleanVal.includes('\r')) {
                cleanVal = `"${cleanVal}"`;
            }
            return cleanVal;
        });
    });
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = type === 'all' ? `registrations_all_${dateStr}.csv` : `registrations_filtered_${dateStr}.csv`;
    
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }
});
