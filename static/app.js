// Navigation
function navigate(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });

    if (pageId === 'support') loadSupportStats();
    if (pageId === 'announcements') loadAnnouncements();
    if (pageId === 'registrations') loadRegistrationFests();
    if (pageId === 'progress') loadTasks();
    
    window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const pageId = link.getAttribute('data-page');
        if (pageId) {
            e.preventDefault();
            navigate(pageId);
        }
    });
});

// Feedback Submission
document.getElementById('feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-feedback-btn');
    const resultMsg = document.getElementById('feedback-result');
    
    btn.disabled = true;
    btn.textContent = "Submitting...";
    
    const payload = {
        category: document.getElementById('f-category').value,
        message: document.getElementById('f-message').value,
        urgency: document.getElementById('f-urgency').value,
        grade: document.getElementById('f-grade').value
    };



    try {
        const res = await fetch('/api/feedback', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            resultMsg.innerHTML = `<span class="success-text">Success! Your secure Case ID is: <b>${data.case_id}</b>. Please save this to track your case.</span>`;
            document.getElementById('feedback-form').reset();
        } else {
            resultMsg.innerHTML = `<span class="error-text">Error: ${data.error}</span>`;
        }
    } catch (err) {
        resultMsg.innerHTML = `<span class="error-text">Network error occurred.</span>`;
    }
    
    btn.disabled = false;
    btn.textContent = "Submit Feedback";
});

async function trackCase() {
    const caseId = document.getElementById('t-caseid').value.trim().toUpperCase();
    const box = document.getElementById('tracking-result');
    
    if (!caseId) return;
    
    box.style.display = 'block';
    box.innerHTML = 'Searching...';
    
    try {
        const res = await fetch(`/api/tracking/${caseId}`);
        const data = await res.json();
        
        if (res.ok) {
            let steps = [];
            const prefix = caseId.split('-')[0];
            if (prefix === 'SC' || prefix === 'FI') steps = ['Received', 'Under Review', 'Escalated', 'Resolved'];
            else if (prefix === 'ID') steps = ['Received', 'Acknowledged', 'Being Explored', 'Implemented'];
            else if (prefix === 'LF') steps = ['Posted', 'Active', 'Claimed', 'Expired'];
            else if (prefix === 'SG') steps = ['Posted', 'Active', 'Matched', 'Expired'];

            // Fallback if status is missing or not in steps
            let currentStatus = data.status || steps[0];
            let currentIndex = steps.indexOf(currentStatus);
            if (currentIndex === -1) currentIndex = 0;

            let stepperHtml = '<div class="stepper">';
            steps.forEach((step, idx) => {
                let statusClass = 'pending';
                let icon = '<div class="step-circle empty"></div>';
                
                // Logic for completed vs active vs pending
                if (idx < currentIndex) {
                    statusClass = 'completed';
                    icon = '<div class="step-circle filled"><i data-lucide="check" size="14"></i></div>';
                } else if (idx === currentIndex) {
                    statusClass = 'active';
                    icon = '<div class="step-circle pulsing"></div>';
                } else {
                    statusClass = 'pending';
                    icon = `<div class="step-circle">${idx + 1}</div>`;
                }
                
                stepperHtml += `
                    <div class="step ${statusClass}">
                        ${icon}
                        <span>${step}</span>
                    </div>
                `;
                if (idx < steps.length - 1) {
                    stepperHtml += `<div class="step-line ${idx < currentIndex ? 'filled' : ''}"></div>`;
                }
            });
            stepperHtml += '</div>';

            const adminResponse = data.admin_response ? `
                <div class="admin-response-card">
                    <div class="response-header">
                        <i data-lucide="shield-check" class="text-primary"></i>
                        <span>Response from the Student Council Team</span>
                        <small>${new Date(data.response_timestamp).toLocaleString()}</small>
                    </div>
                    <p>${data.admin_response}</p>
                </div>
            ` : `
                <div class="admin-response-card" style="text-align: center; background: #f8fafc; border-style: dashed;">
                    <p class="text-muted" style="margin:0;">No official update yet. Our team is currently reviewing this case.</p>
                </div>
            `;

            // Enhanced message preview to handle all table types
            let messagePreview = data.message || data.description || data.item_name || data.topic || data.subject || "No content details provided.";
            if (messagePreview.length > 120) messagePreview = messagePreview.substring(0, 120) + '...';

            box.innerHTML = `
                <div class="tracking-details">
                    <span class="badge badge-accent" style="margin-bottom: 1.5rem; display: inline-block; padding: 6px 16px;">${data.type_label}</span>
                    <h3 style="margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">${caseId}</h3>
                    <p class="text-muted text-sm" style="margin-bottom: 1.5rem;">Submitted on ${new Date(data.created_at || data.date_posted).toLocaleDateString()}</p>
                    
                    <div style="text-align: left; margin-bottom: 2rem;">
                        ${data.category ? `<p style="margin-bottom:0.5rem;"><strong>Category:</strong> ${data.category}</p>` : ''}
                        ${data.urgency ? `<p style="margin-bottom:0.5rem;"><strong>Urgency:</strong> ${data.urgency}</p>` : ''}
                        <div class="message-preview">"${messagePreview}"</div>
                    </div>

                    <div style="margin: 2.5rem 0 1.5rem; text-align: left;">
                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-label); letter-spacing: 0.1em;">PROGRESS STATUS</span>
                    </div>
                    ${stepperHtml}
                    
                    <div style="margin: 2.5rem 0 1rem; text-align: left; border-top: 1px solid #f1f5f9; padding-top: 2rem;">
                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-label); letter-spacing: 0.1em;">OFFICIAL UPDATES</span>
                    </div>
                    ${adminResponse}
                </div>
            `;
            lucide.createIcons();
        } else {
            box.innerHTML = `<span class="error-text">${data.error}</span>`;
        }
    } catch (err) {
        box.innerHTML = `<span class="error-text">Error fetching submission.</span>`;
    }
}

// Support Counter
async function loadSupportStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        document.getElementById('support-counter').textContent = data.count || 0;
    } catch (err) {}
}

async function pledgeSupport() {
    const btn = document.getElementById('pledge-btn');
    const msg = document.getElementById('support-msg');
    
    if (localStorage.getItem('supported_scis_portal')) {
        msg.innerHTML = '<span class="success-text">You have already supported!</span>';
        return;
    }
    
    btn.disabled = true;
    try {
        const res = await fetch('/api/support', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('support-counter').textContent = data.count;
            localStorage.setItem('supported_scis_portal', 'true');
            msg.innerHTML = '<span class="success-text">Thank you for your support!</span>';
        }
    } catch (err) {
        msg.innerHTML = '<span class="error-text">Failed to register support.</span>';
        btn.disabled = false;
    }
}

// Load Announcements
async function loadAnnouncements() {
    const list = document.getElementById('announcements-list');
    try {
        const res = await fetch('/api/announcements');
        const data = await res.json();
        if (data.length === 0) {
            list.innerHTML = '<p>No announcements yet.</p>';
            return;
        }
        list.innerHTML = data.map(a => `
            <div class="card" style="margin-bottom:1rem; padding: 1.5rem;">
                <h4>${a.title}</h4>
                <small style="color: #6b7280;">${new Date(a.date).toLocaleDateString()}</small>
                <p style="margin-top: 0.5rem;">${a.description}</p>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<p class="error-text">Failed to load announcements.</p>';
    }
}

// Load Action Board
async function loadActionBoard() {
    const tbody = document.getElementById('action-table-body');
    try {
        const res = await fetch('/api/action_board');
        const data = await res.json();
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">No active cases to display right now.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(item => {
            let statusClass = 'status-Received';
            if (item.status.includes('Review')) statusClass = 'status-Review';
            if (item.status === 'Escalated') statusClass = 'status-Escalated';
            if (item.status === 'Resolved') statusClass = 'status-Resolved';
            
            return `
            <tr>
                <td>${item.category} Case</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
            </tr>
        `}).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="2" class="error-text">Failed to load action board.</td></tr>';
    }
}

// --- NEW FEATURES LOGIC ---

// Call these loaders when navigating
const originalNavigate = navigate;
navigate = function(pageId) {
    originalNavigate(pageId);
    if (pageId === 'idea-box') loadIdeas();
    if (pageId === 'lost-found') { currentLFTab = 'Lost'; loadLF(); }
    if (pageId === 'study-groups') loadStudyGroups();
    
    // Close mobile nav on navigate
    document.getElementById('nav-menu').classList.remove('nav-open');
    setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 50);
}

// Initial Home Load
document.addEventListener("DOMContentLoaded", () => {
    // Setup registration form listener if present
    document.getElementById('registration-form')?.addEventListener('submit', handleRegistrationSubmit);
});

// Registrations Feature
async function loadRegistrationFests() {
    const select = document.getElementById('reg-fest');
    if (!select) return;
    try {
        const res = await fetch('/api/fests');
        const fests = await res.json();
        
        select.innerHTML = '<option value="">-- Choose Fest --</option>' + 
            fests.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
            
        // Reset event select
        const eventSelect = document.getElementById('reg-event');
        eventSelect.innerHTML = '<option value="">-- Select Fest First --</option>';
        eventSelect.disabled = true;
    } catch (e) {
        console.error('Error loading fests:', e);
    }
}

async function onFestChange(festId) {
    const eventSelect = document.getElementById('reg-event');
    if (!eventSelect) return;
    
    if (!festId) {
        eventSelect.innerHTML = '<option value="">-- Select Fest First --</option>';
        eventSelect.disabled = true;
        return;
    }
    
    try {
        const res = await fetch(`/api/fests/${festId}/events`);
        const events = await res.json();
        
        eventSelect.innerHTML = '<option value="">-- Choose Event --</option>' +
            events.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        eventSelect.disabled = false;
    } catch (e) {
        console.error('Error loading events:', e);
    }
}

async function handleRegistrationSubmit(e) {
    e.preventDefault();
    const resultMsg = document.getElementById('registration-result');
    const submitBtn = document.getElementById('submit-registration-btn');
    
    const payload = {
        name: document.getElementById('reg-name').value,
        class: document.getElementById('reg-class').value,
        section: document.getElementById('reg-section').value,
        phone_number: document.getElementById('reg-phone').value,
        parent_phone_number: document.getElementById('reg-parent-phone').value,
        fest_id: document.getElementById('reg-fest').value,
        event_id: document.getElementById('reg-event').value,
        cv_resume: document.getElementById('reg-cv').value,
        message: document.getElementById('reg-message').value
    };
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';
    
    try {
        const res = await fetch('/api/registrations', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            resultMsg.innerHTML = `<span class="success-text">Registration completed successfully!</span>`;
            document.getElementById('registration-form').reset();
            document.getElementById('reg-event').disabled = true;
        } else {
            resultMsg.innerHTML = `<span class="error-text">${data.error || 'Registration failed'}</span>`;
        }
    } catch (err) {
        resultMsg.innerHTML = `<span class="error-text">Network error</span>`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Registration';
    }
}

function observeAnimatedBars() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                const bar = entry.target;
                bar.style.width = bar.getAttribute('data-width');
                observer.unobserve(bar);
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.animated-bar').forEach(bar => observer.observe(bar));
}

// Idea Box
document.getElementById('idea-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(localStorage.getItem('idea_submitted')) {
        document.getElementById('idea-result').innerHTML = '<span class="error-text">You already submitted an idea recently.</span>';
        return;
    }
    const payload = {
        title: document.getElementById('i-title').value,
        description: document.getElementById('i-desc').value,
        category: document.getElementById('i-category').value,
        impact: document.getElementById('i-impact').value
    };


    try {
        const res = await fetch('/api/ideas', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('idea-result').innerHTML = `<span class="success-text">Idea Submitted! ID: ${data.idea_id}</span>`;
            localStorage.setItem('idea_submitted', 'true');
            document.getElementById('idea-form').reset();
        } else {
            document.getElementById('idea-result').innerHTML = `<span class="error-text">${data.error}</span>`;
        }
    } catch (err) {
        document.getElementById('idea-result').innerHTML = '<span class="error-text">Network error</span>';
    }
});

async function loadFeaturedIdeas() {
    const list = document.getElementById('featured-ideas-list');
    try {
        const res = await fetch('/api/ideas/featured');
        const data = await res.json();
        if (data.length === 0) { list.innerHTML = '<p>No featured ideas yet.</p>'; return; }
        list.innerHTML = data.map(i => `
            <div class="idea-card featured">
                <h4 style="margin-bottom: 0.5rem;">${i.title} <span class="impact-badge">${i.impact}</span></h4>
                <p style="font-size: 0.9rem;">${i.description}</p>
                <div class="idea-meta">Category: ${i.category} | Status: <strong style="color:var(--primary-color);">${i.status}</strong></div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = 'Error loading ideas.'; }
}

// Lost & Found
let currentLFTab = 'Lost';
function switchLFTab(tab) {
    currentLFTab = tab;
    document.querySelectorAll('#lost-found .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadLF();
}

document.getElementById('lf-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        type: document.getElementById('lf-type').value,
        item_name: document.getElementById('lf-item').value,
        location: document.getElementById('lf-loc').value,
        description: document.getElementById('lf-desc').value,
        contact: document.getElementById('lf-contact').value
    };
    try {
        const res = await fetch('/api/lost_found', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        if (res.ok) {
            document.getElementById('lf-result').innerHTML = '<span class="success-text">Posted!</span>';
            document.getElementById('lf-form').reset();
            loadLF();
        }
    } catch (err) {}
});

async function loadLF() {
    const list = document.getElementById('lf-list');
    try {
        const res = await fetch('/api/lost_found');
        const data = await res.json();
        const filtered = data.filter(i => i.type === currentLFTab);
        if (filtered.length === 0) { list.innerHTML = `<p>No ${currentLFTab} items.</p>`; return; }
        list.innerHTML = filtered.map(i => `
            <div class="lf-card">
                <h4>${i.item_name}</h4>
                <p style="font-size:0.9rem;"><strong>Location:</strong> ${i.location}</p>
                <p style="font-size:0.9rem;"><strong>Desc:</strong> ${i.description}</p>
                ${i.contact ? `<p style="font-size:0.9rem;"><strong>Contact:</strong> ${i.contact}</p>` : ''}
                <div class="idea-meta">Posted: ${new Date(i.date_posted).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (e) {}
}

// Study Groups
document.getElementById('sg-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        subject: document.getElementById('sg-subj').value,
        topic: document.getElementById('sg-topic').value,
        looking_for: document.getElementById('sg-look').value,
        grade: document.getElementById('sg-grade').value,
        preferred_time: document.getElementById('sg-time').value
    };
    try {
        const res = await fetch('/api/study_groups', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        if (res.ok) {
            document.getElementById('sg-result').innerHTML = '<span class="success-text">Posted!</span>';
            document.getElementById('sg-form').reset();
            loadStudyGroups();
        }
    } catch (err) {}
});

async function loadStudyGroups() {
    const list = document.getElementById('sg-list');
    try {
        const res = await fetch('/api/study_groups');
        const data = await res.json();
        if (data.length === 0) { list.innerHTML = '<p>No study groups posted.</p>'; list.classList.remove('pinboard'); return; }
        list.classList.add('pinboard');
        list.innerHTML = data.map(i => `
            <div class="pin-card">
                <h4 style="color:var(--primary-color);">${i.subject}</h4>
                <p style="font-size:0.9rem; font-weight:bold;">${i.topic}</p>
                <p style="font-size:0.85rem; margin-top:0.5rem;"><strong>Grade:</strong> ${i.grade}</p>
                <p style="font-size:0.85rem;"><strong>Looking for:</strong> ${i.looking_for}</p>
                <p style="font-size:0.85rem;"><strong>Time:</strong> ${i.preferred_time}</p>
            </div>
        `).join('');
    } catch (e) {}
}

// Progress Board
let allTasks = [];
let currentFocusArea = 'Student Safety';

async function loadTasks() {
    try {
        const res = await fetch('/api/tasks');
        allTasks = await res.json();
        
        // Calculate Overall
        const total = allTasks.length;
        const completed = allTasks.filter(t => t.status === 'Completed').length;
        const inProgress = allTasks.filter(t => t.status === 'In Progress').length;
        
        const pct = total > 0 ? (completed / total) * 100 : 0;
        if (document.getElementById('overall-progress-bar')) {
            document.getElementById('overall-progress-bar').style.width = pct + '%';
        }
        if (document.getElementById('stat-total')) {
            document.getElementById('stat-total').textContent = total;
        }
        if (document.getElementById('stat-active')) {
            document.getElementById('stat-active').textContent = inProgress;
        }
        if (document.getElementById('stat-completed')) {
            document.getElementById('stat-completed').textContent = completed;
        }
        
        renderTasksByFocus();
    } catch (e) { console.error('loadTasks error:', e); }
}

function switchProgressTab(area) {
    currentFocusArea = area;
    document.querySelectorAll('.progress-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderTasksByFocus();
}

function renderTasksByFocus() {
    const board = document.getElementById('progress-board-view');
    const tasks = allTasks.filter(t => t.focus_area === currentFocusArea);
    
    // Filter out completed tasks for grid rendering (Recently completed should be completely removed)
    const displayTasks = tasks.filter(t => t.status !== 'Completed');
    
    if (tasks.length === 0) {
        board.innerHTML = `<div class="card text-center text-muted" style="margin-top:2rem;">No tasks in this area yet.</div>`;
        return;
    }

    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    let html = `
        <div class="card card-mint" style="margin: 2rem 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem; align-items: center;">
                <h3 style="margin:0; font-size:1.3rem;">${currentFocusArea} Focus Area</h3>
                <span class="badge" style="background:var(--primary-color); color:white; font-size:0.85rem;">${pct}% Complete</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <p style="margin-top:0.75rem; font-size:0.85rem; color:var(--text-label);">${completed} of ${tasks.length} task${tasks.length !== 1 ? 's' : ''} completed</p>
        </div>
    `;

    if (displayTasks.length === 0) {
        html += `<div class="card text-center text-muted" style="margin-top:2rem; padding: 2rem;">All initiatives in this area are completed! 🎉</div>`;
    } else {
        html += `<div class="task-grid">`;
        displayTasks.forEach(t => {
            let statusBadge = '';
            if (t.status === 'Planned') statusBadge = '<span class="badge" style="background:#e7f5ff; color:#228be6;">Planned</span>';
            if (t.status === 'In Progress') statusBadge = '<span class="badge" style="background:var(--primary-color); color:white;"><span class="pulsing-dot"></span> In Progress</span>';
            if (t.status === 'Completed') statusBadge = '<span class="badge" style="background:#22c55e; color:white;"><i data-lucide="check" size="12"></i> Completed</span>';
            if (t.status === 'Blocked') statusBadge = '<span class="badge" style="background:#fff5f5; color:#fa5252;"><i data-lucide="alert-triangle" size="12"></i> Blocked</span>';

            html += `
                <div class="task-card" data-status="${t.status}" onclick="openTaskModal('${t.id}')">
                    <div class="task-card-summary">
                        <div class="task-meta">
                            ${statusBadge}
                        </div>
                        <h4 style="margin-bottom: 0.5rem;">${t.title}</h4>
                        <p>${t.description || 'No description provided.'}</p>
                        
                        <div class="view-details-hint">
                            <span>View Milestones & Details</span>
                            <i data-lucide="arrow-right" size="14"></i>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    board.innerHTML = html;
    lucide.createIcons();
}

function toggleTimeline() {
    const btn = document.getElementById('toggle-timeline-btn');
    const board = document.getElementById('progress-board-view');
    const timeline = document.getElementById('progress-timeline-view');
    const tabs = document.getElementById('progress-tabs-container');
    
    if (timeline.style.display === 'none') {
        board.style.display = 'none';
        tabs.style.display = 'none';
        timeline.style.display = 'block';
        btn.innerHTML = '<i data-lucide="layout-grid"></i> Switch to Board';
        timeline.innerHTML = `
            <div class="card text-center" style="margin-top:2rem;">
                <p>Gantt Timeline View is active (Displaying ${allTasks.length} total tasks scheduled across the semester).</p>
                <div style="height:200px; background:repeating-linear-gradient(90deg, transparent, transparent 49px, #f9f9f9 49px, #f9f9f9 50px); border:1px solid #eee; border-radius:8px; margin-top:2rem; position:relative; overflow:hidden;">
                    <div style="position:absolute; top:30px; left:10%; width:30%; height:24px; background:var(--primary-color); border-radius:4px; opacity:0.8;"></div>
                    <div style="position:absolute; top:70px; left:30%; width:40%; height:24px; background:var(--accent-color); border-radius:4px; opacity:0.8;"></div>
                    <div style="position:absolute; top:110px; left:60%; width:20%; height:24px; background:#4caf50; border-radius:4px; opacity:0.8;"></div>
                    <div style="position:absolute; top:0; bottom:0; left:45%; width:2px; background:var(--text-heading); z-index:10; opacity:0.3;"></div>
                    <div style="position:absolute; top:5px; left:45%; transform:translateX(-50%); font-size:0.7rem; color:var(--text-muted); font-weight:bold;">CURRENT WEEK</div>
                </div>
            </div>`;
    } else {
        board.style.display = 'block';
        tabs.style.display = 'flex';
        timeline.style.display = 'none';
        btn.innerHTML = '<i data-lucide="calendar"></i> Switch to Timeline';
    }
    lucide.createIcons();
}

function openTaskModal(taskId) {
    const t = allTasks.find(task => task.id == taskId);
    if (!t) return;

    const modal = document.getElementById('task-modal');
    const badgeContainer = document.getElementById('modal-task-badge');
    const body = document.getElementById('task-modal-body');

    let statusBadge = '';
    if (t.status === 'Planned') statusBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b;">Planned</span>';
    if (t.status === 'In Progress') statusBadge = '<span class="badge" style="background:var(--primary-color); color:white;">In Progress</span>';
    if (t.status === 'Completed') statusBadge = '<span class="badge" style="background:#22c55e; color:white;"><i data-lucide="check" size="12"></i> Completed</span>';
    
    badgeContainer.innerHTML = `
        <div style="display:flex; gap:0.75rem;">
            ${statusBadge}
        </div>
    `;

    let subtasksHtml = '';
    if (t.subtasks && t.subtasks.length > 0) {
        const stCompleted = t.subtasks.filter(st => st.is_completed).length;
        const stPct = (stCompleted / t.subtasks.length) * 100;
        subtasksHtml = `
            <div class="subtask-section" style="border:none; padding:0; margin-top:2.5rem;">
                <span class="modal-section-title">Execution Milestones — ${stCompleted}/${t.subtasks.length}</span>
                <div class="progress-bar-container" style="height:10px; margin-bottom:2rem; background: #f1f5f9;">
                    <div class="progress-bar-fill" style="width:${stPct}%; background: ${stPct === 100 ? '#22c55e' : 'var(--brand-gradient)'};"></div>
                </div>
                <ul class="subtask-list">
                    ${t.subtasks.map(st => `
                        <li class="subtask-item ${st.is_completed ? 'completed' : ''}" style="margin-bottom:1.25rem;">
                            <i data-lucide="${st.is_completed ? 'check-circle' : 'circle'}"></i>
                            <span style="font-size:1.05rem !important;">${st.title}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    body.innerHTML = `
        <h2 class="modal-task-title">${t.title}</h2>
        <p class="modal-task-desc">${t.description || 'No detailed description provided for this initiative.'}</p>
        
        ${t.impact_statement ? `
            <span class="modal-section-title">Impact Statement</span>
            <div style="background: rgba(0, 165, 81, 0.05); padding: 1.5rem; border-radius: 16px; border-left: 5px solid var(--primary-color); margin-bottom: 2.5rem;">
                <p style="font-size:1.1rem; color:var(--text-heading); font-weight:500; margin:0; line-height:1.6;">${t.impact_statement}</p>
            </div>
        ` : ''}

        ${subtasksHtml}

        <div style="margin-top: 3.5rem; padding-top: 2rem; border-top: 1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:1rem;">
                <div class="avatar-circle" style="width:40px; height:40px;">${t.assignee ? t.assignee.substring(0,2).toUpperCase() : 'AM'}</div>
                <div>
                    <span style="display:block; font-size:0.9rem; font-weight:700; color:var(--text-heading);">${t.assignee || 'Amogh'}</span>
                    <span style="display:block; font-size:0.75rem; color:var(--text-label);">Lead Coordinator</span>
                </div>
            </div>
            <div style="text-align:right;">
                <span style="display:block; font-size:0.75rem; color:var(--text-label); text-transform:uppercase; letter-spacing:0.1em; font-weight:800;">Initiated</span>
                <span style="display:block; font-size:0.9rem; font-weight:600; color:var(--text-heading);">${new Date(t.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal on background click
window.addEventListener('click', (e) => {
    const modal = document.getElementById('task-modal');
    if (e.target === modal) {
        closeTaskModal();
    }
});
