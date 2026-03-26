/* ============================================================
   STUDYAI — groups.js  (Part 10)
   Functional study groups — localStorage based (single-user).
   Discussion Q&A, leaderboard from real quiz data, challenges.
   ============================================================ */

const GR = {
  groups: [], discussions: [], challenges: [],
  currentTab: 'groups',
};

async function initGroups() {
  // Inject page structure
  const layout = document.querySelector('.app-layout .main-content');
  if (layout && !document.getElementById('gr-page-body')) {
    layout.innerHTML = `
      <div class="page-body" id="gr-page-body">
        <div class="page-header">
          <div class="page-header-left"><h1>👥 Study Groups</h1><p>Collaborate, discuss and track your progress</p></div>
          <div class="page-header-right"><button class="btn btn-primary" id="btn-create-group">+ Create Group</button></div>
        </div>

        <div class="tabs" id="gr-tabs">
          <div class="tab active" data-gr-tab="groups">👥 My Groups</div>
          <div class="tab" data-gr-tab="discuss">💬 Discussions</div>
          <div class="tab" data-gr-tab="leaderboard">🏆 Leaderboard</div>
          <div class="tab" data-gr-tab="challenges">⚔️ Challenges</div>
        </div>

        <div id="gv-groups"><div class="grid-3" id="groups-grid"></div></div>
        <div id="gv-discuss" style="display:none">
          <div class="card">
            <div class="card-header"><span class="card-title">💬 Discussions</span><button class="btn btn-primary btn-sm" id="btn-post-disc">+ Post Question</button></div>
            <div id="disc-list"></div>
          </div>
        </div>
        <div id="gv-leaderboard" style="display:none">
          <div class="card"><div class="card-title">🏆 Your Subject Leaderboard</div><div id="lb-list"></div></div>
        </div>
        <div id="gv-challenges" style="display:none">
          <div class="card">
            <div class="card-header"><span class="card-title">⚔️ Study Challenges</span><span class="badge badge-orange">Active</span></div>
            <div id="challenges-list"></div>
          </div>
        </div>
      </div>`;
  }

  // Load data from server via storage.js
  await loadAllData();
  GR.groups      = getOrDefault('groups', []);
  GR.discussions = getOrDefault('discussions', []);
  GR.challenges  = getOrDefault('challenges', []);

  // Seed default challenges if empty
  if (!GR.challenges.length) {
    GR.challenges = [
      { id: 'c1', title: '7-Day Study Streak',     desc:'Study every day for 7 days', points:100, type:'streak',   target:7,  progress:0, joined:false },
      { id: 'c2', title: '5 Quizzes This Week',    desc:'Complete 5 quizzes this week', points:75, type:'quiz',    target:5,  progress:0, joined:false },
      { id: 'c3', title: '50 Flashcards Reviewed', desc:'Review 50 flashcards',        points:60, type:'flash',   target:50, progress:0, joined:false },
      { id: 'c4', title: 'Perfect Quiz Score',     desc:'Score 100% on any quiz',       points:150,type:'perfect', target:1,  progress:0, joined:false },
    ];
    _saveChallenges();
  }

  // Bind tab events
  document.querySelectorAll('[data-gr-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-gr-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ['groups','discuss','leaderboard','challenges'].forEach(v => {
        const el = document.getElementById(`gv-${v}`);
        if (el) el.style.display = v === tab.dataset.grTab ? 'block' : 'none';
      });
      GR.currentTab = tab.dataset.grTab;
      if (v => v === 'leaderboard') renderLeaderboard();
      renderTab(tab.dataset.grTab);
    });
  });

  document.getElementById('btn-create-group')?.addEventListener('click', showCreateGroupModal);
  document.getElementById('btn-post-disc')?.addEventListener('click', showPostDiscModal);

  // Initial render
  renderTab('groups');
  _updateChallengeProgress();
}

// ── Tab renders ───────────────────────────────────────────
function renderTab(tab) {
  if (tab === 'groups')      renderGroups();
  if (tab === 'discuss')     renderDiscussions();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'challenges')  renderChallenges();
}

// ── Groups ────────────────────────────────────────────────
function renderGroups() {
  const el = document.getElementById('groups-grid');
  if (!el) return;
  if (!GR.groups.length) {
    el.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;padding:40px">
      <div style="font-size:3rem;margin-bottom:14px;opacity:.3">👥</div>
      <div style="font-weight:700;margin-bottom:8px">No groups yet</div>
      <div class="text-sm text-muted mb-4">Create your first study group to collaborate with friends.</div>
      <button class="btn btn-primary" id="btn-create-first">+ Create Group</button>
    </div>`;
    document.getElementById('btn-create-first')?.addEventListener('click', showCreateGroupModal);
    return;
  }
  el.innerHTML = GR.groups.map(g => `
    <div class="card" style="cursor:pointer;transition:all .2s" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
      <div style="font-size:2rem;margin-bottom:10px">${g.emoji || '📚'}</div>
      <div style="font-weight:700;margin-bottom:6px">${escapeHtml(g.name)}</div>
      <div class="badge badge-purple mb-3">${escapeHtml(g.subject)}</div>
      <div class="text-sm text-muted mb-3">${escapeHtml(g.desc || 'No description')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="text-xs text-muted">Created ${timeAgo(g.created)}</span>
        <button class="btn btn-danger btn-sm" data-delete-group="${g.id}">Leave</button>
      </div>
    </div>`).join('');

  el.querySelectorAll('[data-delete-group]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      GR.groups = GR.groups.filter(g => g.id !== btn.dataset.deleteGroup);
      _saveGroups();
      renderGroups();
    });
  });
}

// ── Discussions ───────────────────────────────────────────
function renderDiscussions() {
  const el = document.getElementById('disc-list');
  if (!el) return;
  if (!GR.discussions.length) {
    el.innerHTML = '<div class="text-sm text-muted" style="padding:20px;text-align:center">No discussions yet. Post the first question!</div>';
    return;
  }
  el.innerHTML = GR.discussions.slice().reverse().map(d => `
    <div class="card mb-3" style="border-radius:12px">
      <div style="font-size:.86rem;font-weight:600;margin-bottom:6px">${escapeHtml(d.question)}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <span class="badge badge-purple">${escapeHtml(d.subject)}</span>
        <span class="text-xs text-muted">${timeAgo(d.created)}</span>
      </div>
      ${d.answers?.length ? `
        <div style="background:rgba(67,233,123,.06);border:1px solid rgba(67,233,123,.15);border-radius:10px;padding:10px 14px;font-size:.82rem;color:var(--green);margin-bottom:10px">
          <strong>Best answer:</strong> ${escapeHtml(d.answers[0])}
        </div>` : ''}
      <div style="display:flex;gap:8px">
        <input class="form-input" style="flex:1;font-size:.82rem" placeholder="Add your answer…" id="ans-inp-${d.id}"/>
        <button class="btn btn-secondary btn-sm" data-answer-to="${d.id}">Reply</button>
      </div>
    </div>`).join('');

  el.querySelectorAll('[data-answer-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(`ans-inp-${btn.dataset.answerTo}`);
      const ans = inp?.value.trim();
      if (!ans) return;
      const disc = GR.discussions.find(d => d.id === btn.dataset.answerTo);
      if (disc) {
        if (!disc.answers) disc.answers = [];
        disc.answers.unshift(ans);
        _saveDiscussions();
        renderDiscussions();
        showToast('Answer posted!', 'success');
      }
    });
  });
}

// ── Leaderboard (from real quiz data) ────────────────────
async function renderLeaderboard() {
  const el = document.getElementById('lb-list');
  if (!el) return;
  const data = await getData();
  const quizzes = data.quizzes || [];

  const bySubject = {};
  quizzes.forEach(q => {
    const s = q.subject || 'General';
    if (!bySubject[s]) bySubject[s] = { subject:s, best:0, avg:0, count:0, scores:[] };
    bySubject[s].scores.push(q.score||0);
    bySubject[s].best = Math.max(bySubject[s].best, q.score||0);
    bySubject[s].count++;
  });
  Object.values(bySubject).forEach(s => { s.avg = Math.round(s.scores.reduce((a,b)=>a+b,0)/s.scores.length); });

  const sorted = Object.values(bySubject).sort((a,b) => b.avg - a.avg);
  const user = getUser();

  if (!sorted.length) { el.innerHTML = '<div class="text-sm text-muted" style="padding:20px">Take quizzes to appear on the leaderboard!</div>'; return; }

  el.innerHTML = `
    <div style="margin-bottom:12px;padding:12px 14px;background:rgba(102,126,234,.08);border:1px solid rgba(102,126,234,.15);border-radius:12px;font-size:.82rem">
      📊 Your personal leaderboard based on real quiz performance. Share your scores to compete with friends!
    </div>` +
    sorted.map((s, i) => {
      const medal = ['🥇','🥈','🥉'][i] || `#${i+1}`;
      const col = s.avg >= 80 ? 'var(--green)' : s.avg >= 60 ? 'var(--orange)' : 'var(--red)';
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;margin-bottom:4px;background:rgba(255,255,255,.03)">
          <span style="font-size:1.1rem;width:32px;text-align:center">${medal}</span>
          <div style="flex:1">
            <div style="font-size:.86rem;font-weight:600">${s.subject}</div>
            <div class="text-xs text-muted">${s.count} quiz${s.count!==1?'zes':''} taken</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--font-mono);font-weight:700;color:${col}">${s.avg}%</div>
            <div class="text-xs text-muted">avg · best ${s.best}%</div>
          </div>
        </div>`;
    }).join('');
}

// ── Challenges ────────────────────────────────────────────
function renderChallenges() {
  const el = document.getElementById('challenges-list');
  if (!el) return;
  el.innerHTML = GR.challenges.map(c => `
    <div class="card mb-3" style="border-radius:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-weight:700;font-size:.92rem">${c.title}</div>
          <div class="text-sm text-muted">${c.desc}</div>
        </div>
        <div class="badge badge-orange">${c.points} XP</div>
      </div>
      <div class="progress mb-2" style="height:8px">
        <div class="progress-fill" style="width:${Math.min(100, Math.round(c.progress/c.target*100))}%;background:${c.joined?'var(--grad-1)':'rgba(255,255,255,.1)'}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="text-xs text-muted">${c.progress} / ${c.target}</span>
        <button class="btn ${c.joined?'btn-success':'btn-secondary'} btn-sm" data-challenge="${c.id}">
          ${c.progress >= c.target ? '✅ Completed!' : c.joined ? '✓ Joined' : 'Join Challenge'}
        </button>
      </div>
    </div>`).join('');

  el.querySelectorAll('[data-challenge]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = GR.challenges.find(c => c.id === btn.dataset.challenge);
      if (ch && !ch.joined) {
        ch.joined = true;
        _saveChallenges();
        renderChallenges();
        showToast(`Joined "${ch.title}"!`, 'success');
      }
    });
  });
}

// ── Modals ────────────────────────────────────────────────
function showCreateGroupModal() {
  const subjects = getSubjects();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">👥 Create Group</span><button class="modal-close" id="close-grp-modal">✕</button></div>
      <div class="form-group"><label class="form-label">Group Name</label><input id="g-name" class="form-input" placeholder="e.g. OS Study Squad"/></div>
      <div class="form-group"><label class="form-label">Subject</label>
        <select id="g-subject" class="form-input">${subjects.map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Description</label><textarea id="g-desc" class="form-input" rows="2" placeholder="What will this group study?"></textarea></div>
      <div class="form-group"><label class="form-label">Emoji</label>
        <select id="g-emoji" class="form-input"><option value="📚">📚 Books</option><option value="🧠">🧠 Brain</option><option value="💡">💡 Ideas</option><option value="🎯">🎯 Target</option><option value="🔬">🔬 Science</option></select>
      </div>
      <button class="btn btn-primary btn-full" id="btn-save-grp">Create Group</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('close-grp-modal')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('btn-save-grp')?.addEventListener('click', () => {
    const name = document.getElementById('g-name')?.value.trim();
    if (!name) { showToast('Enter a group name', 'warning'); return; }
    GR.groups.push({ id: uid('grp'), name, subject: document.getElementById('g-subject')?.value, desc: document.getElementById('g-desc')?.value.trim(), emoji: document.getElementById('g-emoji')?.value, created: Date.now() });
    _saveGroups();
    modal.remove();
    renderGroups();
    showToast(`Group "${name}" created!`, 'success');
  });
}

function showPostDiscModal() {
  const subjects = getSubjects();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">💬 Post a Question</span><button class="modal-close" id="close-disc-modal">✕</button></div>
      <div class="form-group"><label class="form-label">Question</label><textarea id="d-question" class="form-input" rows="3" placeholder="e.g. What is the difference between semaphore and mutex?"></textarea></div>
      <div class="form-group"><label class="form-label">Subject</label>
        <select id="d-subject" class="form-input">${subjects.map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary btn-full" id="btn-save-disc">Post Question</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('close-disc-modal')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.getElementById('btn-save-disc')?.addEventListener('click', () => {
    const q = document.getElementById('d-question')?.value.trim();
    if (!q) { showToast('Enter a question', 'warning'); return; }
    GR.discussions.push({ id: uid('disc'), question: q, subject: document.getElementById('d-subject')?.value, answers: [], created: Date.now() });
    _saveDiscussions();
    modal.remove();
    renderDiscussions();
    showToast('Question posted!', 'success');
    // Switch to discuss tab
    document.querySelector('[data-gr-tab="discuss"]')?.click();
  });
}

// ── Challenge progress from real data ────────────────────
async function _updateChallengeProgress() {
  const data = await getData();
  const quizzes = data.quizzes || [];
  const sessions = data.focusSessions || [];
  const cards = data.flashcards || [];

  GR.challenges.forEach(c => {
    if (!c.joined) return;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
    if (c.type === 'quiz') {
      c.progress = quizzes.filter(q => q.created >= weekAgo.getTime()).length;
    } else if (c.type === 'streak') {
      const uniqueDays = [...new Set(sessions.map(s=>s.date))];
      c.progress = uniqueDays.length;
    } else if (c.type === 'flash') {
      c.progress = cards.filter(c => c.reviews > 0).length;
    } else if (c.type === 'perfect') {
      c.progress = quizzes.filter(q => q.score === 100).length;
    }
  });
  _saveChallenges();
}

// ── Storage helpers ───────────────────────────────────────
function _saveGroups()      { setData('groups', GR.groups); }
function _saveDiscussions() { setData('discussions', GR.discussions); }
function _saveChallenges()  { setData('challenges', GR.challenges); }