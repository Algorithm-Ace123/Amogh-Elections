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

function switchAdminTab(tabId) {
    document.querySelectorAll('#admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.admin-tab-content').forEach(content => content.style.display = 'none');
    document.getElementById('tab-' + tabId).style.display = 'block';
    
    if (tabId === 'submissions') loadSubmissions('feedback');
    if (tabId === 'polls') loadAdminPolls();
    if (tabId === 'tasks') loadAdminTasks();
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
                <tr style="${i.is_spam ? 'opacity: 0.5; background: #fee2e2;' : ''}">
                    <td><strong>${id}</strong><br><small class="text-muted">${date}</small></td>
                    <td style="max-width: 250px;">
                        ${i.title ? `<strong>${i.title}</strong><br>` : ''}
                        <small>${content.substring(0, 60)}...</small>
                    </td>
                    <td>
                        <span class="badge ${status==='Resolved'?'badge-success':'badge-ice'}">${status}</span><br>
                        <span class="badge" style="background:transparent; border:1px solid #ccc; margin-top:4px;">${priority}</span>
                    </td>
                    <td>
                        <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.8rem;" onclick='openResponsePanel(${JSON.stringify(i).replace(/'/g, "&apos;")}, "${table}")'>Manage</button>
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
    const title = document.getElementById('panel-title');
    const desc = document.getElementById('panel-desc');
    
    document.getElementById('r-table').value = table;
    document.getElementById('r-id').value = item.id;
    
    document.getElementById('r-priority').value = item.priority || 'Medium';
    
    let statusOpts = '';
    if (table === 'feedback') statusOpts = '<option value="Received">Received</option><option value="Under Review">Under Review</option><option value="Escalated">Escalated</option><option value="Resolved">Resolved</option>';
    else if (table === 'ideas') statusOpts = '<option value="Received">Received</option><option value="Acknowledged">Acknowledged</option><option value="Being Explored">Being Explored</option><option value="Implemented">Implemented</option>';
    else if (table === 'lost_found') statusOpts = '<option value="Posted">Posted</option><option value="Active">Active</option><option value="Claimed">Claimed</option><option value="Expired">Expired</option>';
    else if (table === 'study_groups') statusOpts = '<option value="Posted">Posted</option><option value="Active">Active</option><option value="Matched">Matched</option><option value="Expired">Expired</option>';
    
    document.getElementById('r-status').innerHTML = statusOpts;
    document.getElementById('r-status').value = item.status || 'Active';
    document.getElementById('r-response').value = item.admin_response || '';
    
    const idDisplay = item.case_id || item.idea_id || item.tracking_id || item.id;
    title.textContent = `Manage ${idDisplay}`;
    desc.textContent = item.message || item.description || item.item_name || item.topic || '';
    
    panel.style.display = 'flex';
    document.getElementById('r-result').innerHTML = '';
}

function closeResponsePanel() {
    document.getElementById('response-panel').style.display = 'none';
}

document.getElementById('response-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const table = document.getElementById('r-table').value;
    const id = document.getElementById('r-id').value;
    const payload = {
        priority: document.getElementById('r-priority').value,
        status: document.getElementById('r-status').value,
        admin_response: document.getElementById('r-response').value
    };
    
    const btn = e.target.querySelector('button');
    btn.textContent = 'Updating...';
    try {
        const res = await fetch(`/api/admin/submissions/${table}/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('r-result').innerHTML = '<span class="success-text">Updated successfully!</span>';
            setTimeout(() => { loadSubmissions(currentSubmissionsTable); }, 1000);
        } else {
            document.getElementById('r-result').innerHTML = '<span class="error-text">Failed to update</span>';
        }
    } catch (e) {
        document.getElementById('r-result').innerHTML = '<span class="error-text">Network error</span>';
    }
    btn.textContent = 'Update Submission';
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
        if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="4">No polls found.</td></tr>'; return; }
        
        tbody.innerHTML = data.map(p => {
            const total = p.options ? p.options.reduce((sum, o) => sum + (o.votes || 0), 0) : 0;
            return `
            <tr>
                <td><strong>${p.question}</strong><br><small class="text-muted">${new Date(p.created_at).toLocaleDateString()}</small></td>
                <td><span class="badge badge-info">${p.type}</span></td>
                <td><span class="badge ${p.status==='Active'?'badge-fire':''}">${p.status}</span></td>
                <td>${total}</td>
            </tr>
        `}).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="4">Error loading polls</td></tr>'; }
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

async function loadAdminTasks() {
    const tbody = document.getElementById('tasks-table-body');
    try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No tasks found.</td></tr>'; return; }
        
        tbody.innerHTML = data.map(t => {
            let statusBadge = t.status === 'Completed' ? 'badge-success' : 'badge-ice';
            if (t.status === 'Planned') statusBadge = '';
            if (t.status === 'Blocked') statusBadge = 'badge-fire';
            return `
            <tr>
                <td><strong>${t.title}</strong></td>
                <td>${t.focus_area}</td>
                <td><span class="badge ${statusBadge}">${t.status}</span></td>
                <td>${t.assignee || 'Unassigned'}</td>
                <td>
                    <select onchange="updateTaskStatus('${t.id}', this.value)" style="padding:4px;">
                        <option value="Planned" ${t.status==='Planned'?'selected':''}>Planned</option>
                        <option value="In Progress" ${t.status==='In Progress'?'selected':''}>In Progress</option>
                        <option value="Blocked" ${t.status==='Blocked'?'selected':''}>Blocked</option>
                        <option value="Completed" ${t.status==='Completed'?'selected':''}>Completed</option>
                    </select>
                </td>
            </tr>
        `}).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5">Error loading tasks</td></tr>'; }
}

async function updateTaskStatus(id, status) {
    try {
        await fetch('/api/tasks', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id, status})});
    } catch(e) { alert("Failed to update task"); }
}

document.getElementById('create-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const stInput = document.getElementById('tk-subtasks').value;
    const subtasks = stInput.split(',').map(s => s.trim()).filter(s => s);
    
    const payload = {
        title: document.getElementById('tk-title').value,
        focus_area: document.getElementById('tk-focus').value,
        assignee: document.getElementById('tk-assignee').value,
        status: document.getElementById('tk-status').value,
        subtasks: subtasks
    };
    
    try {
        const res = await fetch('/api/tasks', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if (res.ok) {
            document.getElementById('create-task-form').reset();
            document.getElementById('tk-result').innerHTML = '<span class="success-text">Task created!</span>';
            loadAdminTasks();
        }
    } catch(e) { document.getElementById('tk-result').innerHTML = '<span class="error-text">Failed to create task</span>'; }
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

document.getElementById('announcement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('a-title').value;
    const desc = document.getElementById('a-desc').value;
    const msg = document.getElementById('announcement-msg');
    try {
        const res = await fetch('/api/admin/announcements', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title, description: desc})
        });
        if (res.ok) {
            msg.innerHTML = '<span class="success-text">Announcement Posted!</span>';
            document.getElementById('announcement-form').reset();
            setTimeout(() => { msg.innerHTML = ''; }, 3000);
        } else {
            msg.innerHTML = '<span class="error-text">Failed to post</span>';
        }
    } catch (err) { msg.innerHTML = '<span class="error-text">Network error</span>'; }
});
