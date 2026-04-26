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
    if (pageId === 'polls') loadPolls();
    if (pageId === 'progress') loadTasks();
    
    window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(e.target.getAttribute('data-page'));
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
            if (prefix === 'FI') steps = ['Received', 'Under Review', 'Escalated', 'Resolved'];
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
                        <i data-lucide="shield-check" class="text-fire"></i>
                        <span>Response from the Fire & Ice Team</span>
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
                    <span class="badge badge-ice" style="margin-bottom: 1.5rem; display: inline-block; padding: 6px 16px;">${data.type_label}</span>
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
    
    if (localStorage.getItem('supported_fire_ice')) {
        msg.innerHTML = '<span class="success-text">You have already supported!</span>';
        return;
    }
    
    btn.disabled = true;
    try {
        const res = await fetch('/api/support', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('support-counter').textContent = data.count;
            localStorage.setItem('supported_fire_ice', 'true');
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
    if (pageId === 'pulse') loadPulse();
    if (pageId === 'idea-box') loadFeaturedIdeas();
    if (pageId === 'lost-found') { currentLFTab = 'Lost'; loadLF(); }
    if (pageId === 'study-groups') loadStudyGroups();
    if (pageId === 'home') loadPulseSnapshot();
    
    // Close mobile nav on navigate
    document.getElementById('nav-menu').classList.remove('nav-open');
    setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 50);
}

// Mobile Menu
function toggleNav() {
    document.getElementById('nav-menu').classList.toggle('nav-open');
}

// Initial Home Load
document.addEventListener("DOMContentLoaded", () => {
    loadPulseSnapshot();
});

// Pulse
async function loadPulse() {
    const list = document.getElementById('pulse-list');
    try {
        const res = await fetch('/api/pulse');
        const data = await res.json();
        
        let totalVotes = data.reduce((sum, item) => sum + item.votes, 0) || 1; // avoid /0

        list.innerHTML = data.map((item, idx) => {
            const pct = Math.round((item.votes / totalVotes) * 100);
            const isTop3 = idx < 3;
            const hasVoted = localStorage.getItem('pulse_voted') === 'true';
            return `
            <div class="pulse-issue">
                <div class="pulse-info">
                    <strong>${item.issue_name}</strong> ${isTop3 ? '<span class="badge-priority">Priority</span>' : ''}
                    <div class="pulse-bar-bg"><div class="pulse-bar-fill animated-bar" data-width="${pct}%" style="width: 0%;"></div></div>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.8rem; color: var(--text-label); display:block;">${item.votes} votes</span>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" ${hasVoted ? 'disabled' : ''} onclick="votePulse('${item.id}')">Upvote</button>
                </div>
            </div>`;
        }).join('');
        
        observeAnimatedBars();
    } catch (e) {
        list.innerHTML = 'Error loading issues.';
    }
}

async function votePulse(id) {
    if (localStorage.getItem('pulse_voted')) return;
    try {
        const res = await fetch('/api/pulse/vote/' + id, {method: 'POST'});
        if (res.ok) {
            localStorage.setItem('pulse_voted', 'true');
            loadPulse();
            loadPulseSnapshot();
        }
    } catch (e) { alert("Failed to vote"); }
}

async function loadPulseSnapshot() {
    const list = document.getElementById('home-pulse-snapshot');
    if(!list) return;
    try {
        const res = await fetch('/api/pulse');
        const data = await res.json();
        const top3 = data.slice(0, 3);
        let totalVotes = data.reduce((sum, item) => sum + item.votes, 0) || 1;
        
        list.innerHTML = top3.map(item => {
            const pct = Math.round((item.votes / totalVotes) * 100);
            return `
            <div style="margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                    <span style="font-weight: 500;">${item.issue_name}</span><span style="color:var(--text-label);">${item.votes}</span>
                </div>
                <div class="pulse-bar-bg" style="height: 6px;"><div class="pulse-bar-fill animated-bar" data-width="${pct}%" style="width: 0%;"></div></div>
            </div>`;
        }).join('');
        
        observeAnimatedBars();
    } catch (e) {}
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
                <div class="idea-meta">Category: ${i.category} | Status: <strong style="color:var(--fire-color);">${i.status}</strong></div>
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
                <h4 style="color:var(--ice-color);">${i.subject}</h4>
                <p style="font-size:0.9rem; font-weight:bold;">${i.topic}</p>
                <p style="font-size:0.85rem; margin-top:0.5rem;"><strong>Grade:</strong> ${i.grade}</p>
                <p style="font-size:0.85rem;"><strong>Looking for:</strong> ${i.looking_for}</p>
                <p style="font-size:0.85rem;"><strong>Time:</strong> ${i.preferred_time}</p>
            </div>
        `).join('');
    } catch (e) {}
}

// --------------------------------------------------------
// NEW FEATURES: Polls & Progress
// --------------------------------------------------------

async function loadPolls() {
    try {
        const res = await fetch('/api/polls');
        const polls = await res.json();
        
        const activeContainer = document.getElementById('active-polls-list');
        const closedContainer = document.getElementById('closed-polls-list');
        const upcomingContainer = document.getElementById('upcoming-polls-list');
        
        activeContainer.innerHTML = ''; closedContainer.innerHTML = ''; upcomingContainer.innerHTML = '';
        
        polls.forEach(poll => {
            const hasVoted = localStorage.getItem('voted_poll_' + poll.id);
            if (poll.status === 'Active') {
                activeContainer.innerHTML += buildPollCard(poll, hasVoted);
            } else if (poll.status === 'Closed') {
                closedContainer.innerHTML += buildClosedPollCard(poll);
            } else if (poll.status === 'Draft') {
                upcomingContainer.innerHTML += `<div class="card"><h4 class="text-muted" style="margin-bottom:0.5rem;">${poll.question}</h4><span class="badge badge-warning" style="background:var(--fire-color); color:white;">Coming Soon</span></div>`;
            }
        });
        
        if (!activeContainer.innerHTML) activeContainer.innerHTML = '<p>No active polls.</p>';
        if (!closedContainer.innerHTML) closedContainer.innerHTML = '<p>No closed polls.</p>';
        if (!upcomingContainer.innerHTML) upcomingContainer.innerHTML = '<p>No upcoming polls.</p>';
        
        lucide.createIcons();
    } catch (e) {
        console.error(e);
    }
}

function buildPollCard(poll, hasVoted) {
    let optionsHtml = '';
    
    if (poll.type === 'Yes-No') {
        if (hasVoted) {
            const total = poll.options.reduce((sum, opt) => sum + opt.votes, 0) || 1;
            optionsHtml = poll.options.map(opt => `
                <div style="margin-bottom:0.5rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:0.2rem;">
                        <span>${opt.option_text}</span>
                        <span>${Math.round((opt.votes/total)*100)}% (${opt.votes})</span>
                    </div>
                    <div class="progress-bar-container" style="height:8px;">
                        <div class="progress-bar-fill ${opt.option_text==='Yes'?'bg-fire':'bg-ice'}" style="width:${(opt.votes/total)*100}%"></div>
                    </div>
                </div>
            `).join('');
        } else {
            optionsHtml = `<div style="display:flex; gap:1rem; margin-top:1.5rem;">`;
            poll.options.forEach(opt => {
                optionsHtml += `<button class="btn ${opt.option_text==='Yes'?'btn-primary':'btn-secondary'} w-100" onclick="submitVote('${poll.id}', '${poll.type}', '${opt.id}')">${opt.option_text}</button>`;
            });
            optionsHtml += `</div>`;
        }
    } else if (poll.type === 'Opinion') {
        if (hasVoted) {
            const total = poll.options.reduce((sum, opt) => sum + opt.votes, 0) || 1;
            optionsHtml = poll.options.map(opt => `
                <div style="margin-bottom:0.5rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:0.2rem;">
                        <span>${opt.option_text}</span>
                        <span>${Math.round((opt.votes/total)*100)}%</span>
                    </div>
                    <div class="progress-bar-container" style="height:8px;">
                        <div class="progress-bar-fill bg-ice" style="width:${(opt.votes/total)*100}%"></div>
                    </div>
                </div>
            `).join('');
        } else {
            optionsHtml = `<div class="poll-options-grid" style="margin-top:1rem; display:flex; flex-direction:column; gap:0.5rem;">`;
            poll.options.forEach(opt => {
                optionsHtml += `<button class="btn" style="background:#f4f4f4; color:#333; text-align:left; justify-content:flex-start;" onclick="submitVote('${poll.id}', '${poll.type}', '${opt.id}')">${opt.option_text}</button>`;
            });
            optionsHtml += `</div>`;
        }
    } else if (poll.type === 'Priority') {
        if (hasVoted) {
            const sorted = [...poll.options].sort((a,b) => a.average_rank - b.average_rank);
            optionsHtml = `<ol style="margin-left: 1.5rem; margin-top:1rem; font-size:0.9rem;">` + sorted.map(opt => `<li style="margin-bottom:0.2rem;">${opt.option_text} (Avg Rank: ${opt.average_rank.toFixed(1)})</li>`).join('') + `</ol>`;
        } else {
            // Simplified priority for UI - pick top priority
            optionsHtml = `<p class="text-sm text-muted" style="margin-top:1rem;">Select your #1 priority:</p><div class="poll-options-grid" style="margin-top:0.5rem; display:flex; flex-direction:column; gap:0.5rem;">`;
            poll.options.forEach(opt => {
                optionsHtml += `<button class="btn" style="background:#f4f4f4; color:#333; text-align:left; justify-content:flex-start;" onclick="submitPriorityVote('${poll.id}', '${opt.id}')">${opt.option_text}</button>`;
            });
            optionsHtml += `</div>`;
        }
    }

    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

    return `
        <div class="card poll-card card-info">
            <span class="badge ${poll.type==='Yes-No'?'badge-fire':'badge-ice'}" style="margin-bottom:0.5rem; display:inline-block; background:var(--ice-color); color:white;">${poll.type}</span>
            <h3 style="margin-bottom:0.5rem;">${poll.question}</h3>
            <p class="text-sm text-muted" style="margin-bottom:1rem;">${totalVotes} responses so far</p>
            ${optionsHtml}
            ${hasVoted ? '<p class="text-success text-sm" style="margin-top:1.5rem; text-align:center; color:#4caf50;"><i data-lucide="check-circle" size="14"></i> You have voted</p>' : ''}
        </div>
    `;
}

function buildClosedPollCard(poll) {
    return `<div class="card card-info" style="margin-bottom: 1rem; opacity: 0.8;">
        <h4>${poll.question}</h4>
        <p class="text-sm text-muted">Final Results available in Admin</p>
    </div>`;
}

async function submitVote(pollId, type, optionId) {
    try {
        await fetch('/api/polls/vote', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ poll_type: type, option_id: optionId })
        });
        localStorage.setItem('voted_poll_' + pollId, 'true');
        loadPolls();
    } catch(e) {}
}

async function submitPriorityVote(pollId, optionId) {
    try {
        await fetch('/api/polls/vote', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ poll_type: 'Priority', ranked_options: [{id: optionId, rank: 1}] })
        });
        localStorage.setItem('voted_poll_' + pollId, 'true');
        loadPolls();
    } catch(e) {}
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
        const planned = allTasks.filter(t => t.status === 'Planned').length;
        
        const pct = total > 0 ? (completed / total) * 100 : 0;
        document.getElementById('overall-progress-bar').style.width = pct + '%';
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('stat-in-progress').textContent = inProgress;
        document.getElementById('stat-planned').textContent = planned;
        
        // Load Wins Wall
        const wins = allTasks.filter(t => t.status === 'Completed').sort((a,b) => new Date(b.completed_at) - new Date(a.completed_at)).slice(0, 4);
        document.getElementById('wins-wall').innerHTML = wins.map(w => `
            <div class="task-card">
                <div class="task-meta">
                    <span class="badge" style="background:#4caf50; color:white;"><i data-lucide="check" size="12"></i> Done</span>
                </div>
                <h4>${w.title}</h4>
                ${w.impact_statement ? `<p class="text-sm"><em>"${w.impact_statement}"</em></p>` : ''}
            </div>
        `).join('');

        renderTasksByFocus();
    } catch (e) {}
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
    
    if (tasks.length === 0) {
        board.innerHTML = `<div class="card text-center text-muted" style="margin-top:2rem;">No tasks in this area yet.</div>`;
        return;
    }

    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    let html = `
        <div class="card" style="margin: 2rem 0; border: none; background: #f8fafc;">
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem; align-items: center;">
                <h3 style="margin:0;">${currentFocusArea} Focus</h3>
                <span class="badge badge-ice">${pct}% Complete</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
        </div>
        <div class="task-grid">
    `;

    tasks.forEach(t => {
        let statusBadge = '';
        if (t.status === 'Planned') statusBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b;">Planned</span>';
        if (t.status === 'In Progress') statusBadge = '<span class="badge" style="display:flex; align-items:center; gap:6px; background:var(--ice-color); color:white;"><div class="pulsing-dot" style="width:6px; height:6px; background:white; border-radius:50%; animation: pulse 1.5s infinite;"></div> In Progress</span>';
        if (t.status === 'Completed') statusBadge = '<span class="badge" style="background:#22c55e; color:white;"><i data-lucide="check" size="12"></i> Completed</span>';
        if (t.status === 'Blocked') statusBadge = '<span class="badge" style="background:#ef4444; color:white;"><i data-lucide="alert-triangle" size="12"></i> Blocked</span>';

        let subtasksHtml = '';
        if (t.subtasks && t.subtasks.length > 0) {
            const stCompleted = t.subtasks.filter(st => st.is_completed).length;
            const stPct = (stCompleted / t.subtasks.length) * 100;
            subtasksHtml = `
                <div class="subtask-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.75rem; font-weight:700; color:var(--text-label);">SUBTASKS</span>
                        <span style="font-size:0.75rem; font-weight:700; color:var(--text-label);">${stCompleted}/${t.subtasks.length}</span>
                    </div>
                    <div class="progress-bar-container" style="height:4px; margin-bottom:1rem;">
                        <div class="progress-bar-fill" style="width:${stPct}%"></div>
                    </div>
                    <ul class="subtask-list">
                        ${t.subtasks.map(st => `
                            <li class="subtask-item ${st.is_completed ? 'completed' : ''}">
                                <i data-lucide="${st.is_completed ? 'check-circle' : 'circle'}" size="14"></i>
                                ${st.title}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        html += `
            <div class="task-card">
                <div class="task-meta">
                    ${statusBadge}
                    <span class="badge" style="background:transparent; border:1px solid #e2e8f0; color:#94a3b8; font-size:0.7rem;">${t.priority}</span>
                </div>
                <h4>${t.title}</h4>
                <p>${t.description || ''}</p>
                ${subtasksHtml}
                <div class="task-footer">
                    <div class="avatar-circle" title="Assignee">${t.assignee ? t.assignee.substring(0,2).toUpperCase() : '?'}</div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
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
                    <div style="position:absolute; top:30px; left:10%; width:30%; height:24px; background:var(--fire-color); border-radius:4px; opacity:0.8;"></div>
                    <div style="position:absolute; top:70px; left:30%; width:40%; height:24px; background:var(--ice-color); border-radius:4px; opacity:0.8;"></div>
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
