/* ============================================================
   STUDYAI — STUDY GROUPS
   File: public/assets/js/groups.js
   ============================================================ */
'use strict';

const GR = { data:{} };

const GRAD_PIPS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
];

async function initGroups() {
  GR.data = await apiGet('/data').catch(() => ({}));
  _wireTabs();
  renderGroupsGrid();
}

/* ── Tabs ── */
function _wireTabs() {
  document.querySelectorAll('#gr-tabs .tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('#gr-tabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const v = tab.dataset.gv;
      ['groups','discuss','leaderboard','challenges'].forEach(x=>{
        const el=document.getElementById('gv-'+x);
        if(el) el.style.display = x===v?'block':'none';
      });
      if(v==='groups')      renderGroupsGrid();
      if(v==='discuss')     renderDiscussions();
      if(v==='leaderboard') renderLeaderboard();
      if(v==='challenges')  renderChallenges();
    };
  });
}

/* ════════════════════════════════════════════════════════════
   GROUPS GRID
   ════════════════════════════════════════════════════════════ */
function renderGroupsGrid() {
  const groups = GR.data.groups || [];
  const el     = document.getElementById('groups-grid');
  if (!el) return;

  if (!groups.length) {
    el.innerHTML = `<div style="grid-column:1/-1">${emptyState('👥','No groups yet','Create your first study group!')}</div>`;
    return;
  }

  el.innerHTML = groups.map(g => {
    const members  = g.members || [];
    const pipsHTML = members.slice(0,4).map((m,i)=>
      `<div class="mpip" style="background:${GRAD_PIPS[i%4]}" title="${escHtml(m)}">${m.charAt(0).toUpperCase()}</div>`
    ).join('') + (members.length>4
      ? `<div class="mpip" style="background:rgba(255,255,255,.1);color:var(--text-muted)">+${members.length-4}</div>`
      : '');

    return `
      <div class="group-card">
        <div class="group-emoji">${g.emoji||'📚'}</div>
        <div class="font-bold mb-1">${escHtml(g.name)}</div>
        <div class="text-xs text-dim clamp-2 mb-3" style="line-height:1.5">${escHtml(g.description||'')}</div>
        <div class="flex items-center between mb-3">
          <div class="mpips">${pipsHTML}</div>
          <span class="badge badge-purple">${escHtml(g.subject)}</span>
        </div>
        <div class="flex gap-3 text-xs text-muted mb-3">
          <span>💬 ${g.discussions||0}</span>
          <span>📄 ${g.sharedNotes||0}</span>
          <span>👥 ${members.length}</span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm flex-1" onclick="enterGroup('${g.id}')">Enter →</button>
          <button class="btn btn-secondary btn-sm" onclick="deleteGroup('${g.id}')">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function enterGroup(id) {
  const g = (GR.data.groups||[]).find(x=>x.id===id);
  if (!g) return;
  document.querySelectorAll('#gr-tabs .tab').forEach(t=>t.classList.remove('active'));
  const dt = document.querySelector('#gr-tabs .tab[data-gv="discuss"]');
  if (dt) dt.classList.add('active');
  ['groups','challenges','leaderboard'].forEach(v=>{const el=document.getElementById('gv-'+v);if(el)el.style.display='none';});
  const discEl = document.getElementById('gv-discuss');
  if (discEl) discEl.style.display='block';
  renderDiscussions();
  showToast(`Entered ${g.name} 👥`,'info');
}

async function createGroup() {
  const name = document.getElementById('g-name')?.value.trim();
  if (!name) return showToast('Group name is required.','error');
  const sub  = document.getElementById('g-subject')?.value||'General';
  const emojiMap = {OS:'💻',DBMS:'🗄️',DSA:'⚡',CN:'🌐',AI:'🤖',Math:'📐',General:'📚'};
  const user = getUser();

  GR.data.groups = [...(GR.data.groups||[]),{
    id:genId(), name, subject:sub,
    description:document.getElementById('g-desc')?.value.trim()||'',
    emoji:emojiMap[sub]||'📚',
    members:[user?.name||'You'],
    discussions:0, sharedNotes:0, created:Date.now(),
  }];
  await apiPost('/data/groups',{value:GR.data.groups});
  closeModal('modal-create-group');
  document.getElementById('g-name').value='';
  document.getElementById('g-desc').value='';
  renderGroupsGrid();
  showToast('Group created!','success');
}

async function deleteGroup(id) {
  if (!confirm('Delete this group?')) return;
  GR.data.groups = (GR.data.groups||[]).filter(g=>g.id!==id);
  await apiPost('/data/groups',{value:GR.data.groups});
  renderGroupsGrid();
  showToast('Group deleted.','info');
}

/* ════════════════════════════════════════════════════════════
   DISCUSSIONS
   ════════════════════════════════════════════════════════════ */
function renderDiscussions() {
  const discs = (GR.data.discussions||[]).sort((a,b)=>b.time-a.time);
  const el    = document.getElementById('disc-list');
  if (!el) return;

  if (!discs.length) {
    el.innerHTML = emptyState('💬','No discussions yet','Be the first to post a question!');
    return;
  }

  el.innerHTML = discs.map(d=>`
    <div class="disc-item" id="disc-${d.id}">
      <div class="disc-q">${escHtml(d.question)}</div>
      ${d.bestAnswer?`<div class="best-ans"><span style="font-size:.67rem;font-weight:700;display:block;margin-bottom:3px">✅ Best Answer</span>${escHtml(d.bestAnswer)}</div>`:''}
      <div class="disc-meta">
        <span>👤 ${escHtml(d.author)}</span>
        <span class="badge badge-purple" style="font-size:.62rem">${escHtml(d.subject)}</span>
        <span>💬 ${d.answers||0} answers</span>
        <span>👍 ${d.upvotes||0}</span>
        <span>${timeAgo(d.time)}</span>
      </div>
      <div class="flex gap-2 mt-3 flex-wrap">
        <button class="btn btn-secondary btn-sm" onclick="upvoteDisc('${d.id}')">👍 Upvote</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleReplyBox('${d.id}')">💬 Reply</button>
        <button class="btn btn-secondary btn-sm" onclick="askAIAbout('${escAttr(d.question)}')">🤖 Ask AI</button>
        ${d.author===(getUser()?.name||'')?`<button class="btn btn-secondary btn-sm" onclick="deleteDisc('${d.id}')">🗑️</button>`:''}
      </div>
      <div class="reply-box" id="reply-${d.id}">
        <textarea id="reply-txt-${d.id}" class="form-input mt-2" rows="2" placeholder="Write your answer…"></textarea>
        <div class="flex gap-2 mt-2">
          <button class="btn btn-primary btn-sm" onclick="submitReply('${d.id}')">Post Reply</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleReplyBox('${d.id}')">Cancel</button>
        </div>
      </div>
    </div>`).join('');
}

async function postDiscussion() {
  const q = document.getElementById('d-question')?.value.trim();
  if (!q) return showToast('Question is required.','error');
  const user = getUser();

  GR.data.discussions = [...(GR.data.discussions||[]),{
    id:genId(), question:q,
    subject:document.getElementById('d-subject')?.value||'General',
    author:user?.name||'You',
    upvotes:0, answers:0, time:Date.now(), bestAnswer:null,
  }];
  await apiPost('/data/discussions',{value:GR.data.discussions});
  closeModal('modal-post-disc');
  document.getElementById('d-question').value='';
  renderDiscussions();
  showToast('Question posted!','success');
}

async function upvoteDisc(id) {
  const discs = GR.data.discussions||[];
  const idx   = discs.findIndex(d=>d.id===id);
  if (idx<0) return;
  discs[idx].upvotes = (discs[idx].upvotes||0)+1;
  GR.data.discussions=discs;
  await apiPost('/data/discussions',{value:discs});
  renderDiscussions();
}

function toggleReplyBox(id) {
  const el = document.getElementById('reply-'+id);
  if (el) el.classList.toggle('open');
}

async function submitReply(id) {
  const ta  = document.getElementById('reply-txt-'+id);
  const ans = ta?.value.trim();
  if (!ans) return showToast('Reply cannot be empty.','error');
  const discs = GR.data.discussions||[];
  const idx   = discs.findIndex(d=>d.id===id);
  if (idx<0) return;
  discs[idx].answers    = (discs[idx].answers||0)+1;
  discs[idx].bestAnswer = discs[idx].bestAnswer||ans;
  GR.data.discussions   = discs;
  await apiPost('/data/discussions',{value:discs});
  renderDiscussions();
  showToast('Reply posted!','success');
}

async function deleteDisc(id) {
  GR.data.discussions = (GR.data.discussions||[]).filter(d=>d.id!==id);
  await apiPost('/data/discussions',{value:GR.data.discussions});
  renderDiscussions();
  showToast('Removed.','info');
}

function askAIAbout(question) {
  localStorage.setItem('sai_chat_prefill', question);
  window.location.href='/chat.html';
}

/* ════════════════════════════════════════════════════════════
   LEADERBOARD
   ════════════════════════════════════════════════════════════ */
function renderLeaderboard() {
  const el    = document.getElementById('lb-list');
  if (!el) return;
  const user  = getUser();
  const qr    = GR.data.quizResults||[];
  const myAvg = qr.length ? Math.round(qr.reduce((s,r)=>s+r.pct,0)/qr.length) : 0;
  const myStr = (GR.data.streak||{current:0}).current;
  const myXP  = myAvg + myStr*2;

  const peers = [
    {name:'Priya Sharma',   xp:94,  avg:88, streak:12},
    {name:'Arjun Mehta',    xp:89,  avg:82, streak:9},
    {name:'Neha Singh',     xp:85,  avg:78, streak:11},
    {name:'Vikram Rao',     xp:80,  avg:75, streak:7},
    {name:'Anjali Gupta',   xp:76,  avg:71, streak:8},
    {name:'Rahul Verma',    xp:70,  avg:65, streak:5},
    {name:'Sana Khan',      xp:65,  avg:60, streak:4},
  ];

  const board = [...peers, {name:user?.name||'You', xp:myXP, avg:myAvg, streak:myStr, isYou:true}]
    .sort((a,b)=>b.xp-a.xp).slice(0,9);

  const medals = ['🥇','🥈','🥉'];
  el.innerHTML = board.map((p,i)=>`
    <div class="lb-row ${p.isYou?'':''}">
      <div class="lb-rank">${medals[i]||'#'+(i+1)}</div>
      <div class="user-avatar" style="width:28px;height:28px;font-size:.7rem;border-radius:8px;flex-shrink:0">${p.name.charAt(0).toUpperCase()}</div>
      <div style="flex:1">
        <div class="font-bold text-sm">${escHtml(p.name)} ${p.isYou?'<span class="badge badge-purple" style="font-size:.6rem">You</span>':''}</div>
        <div class="text-xs text-muted">${p.avg}% avg · ${p.streak}🔥</div>
      </div>
      <div class="lb-score">${p.xp} XP</div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   CHALLENGES
   ════════════════════════════════════════════════════════════ */
function renderChallenges() {
  const el = document.getElementById('challenges-list');
  if (!el) return;
  const qr   = GR.data.quizResults||[];
  const notes= GR.data.notes||[];
  const fcs  = GR.data.flashcards||[];
  const sess = GR.data.sessions||[];
  const str  = (GR.data.streak||{current:0}).current;

  const challenges = [
    {
      title:'7-Day Streak',
      desc :'Study every day for 7 consecutive days.',
      reward:'🔥 Streak Master (+50 XP)',
      cur  : str,
      max  : 7,
      pct  : Math.min(100, Math.round((str/7)*100)),
    },
    {
      title:'Quiz Champion',
      desc :'Score 80%+ on 5 different quizzes.',
      reward:'🏆 Champion (+75 XP)',
      cur  : qr.filter(r=>r.pct>=80).length,
      max  : 5,
      pct  : Math.min(100,Math.round((qr.filter(r=>r.pct>=80).length/5)*100)),
    },
    {
      title:'Note Master',
      desc :'Create 10 study notes.',
      reward:'📝 Note Master (+60 XP)',
      cur  : notes.length,
      max  : 10,
      pct  : Math.min(100,Math.round((notes.length/10)*100)),
    },
    {
      title:'Flashcard Guru',
      desc :'Review 50 flashcards total.',
      reward:'🃏 Guru (+50 XP)',
      cur  : fcs.reduce((s,c)=>s+(c.reviews||0),0),
      max  : 50,
      pct  : Math.min(100,Math.round((fcs.reduce((s,c)=>s+(c.reviews||0),0)/50)*100)),
    },
    {
      title:'100-Hour Club',
      desc :'Accumulate 100 hours of study time.',
      reward:'⏱️ Century (+120 XP)',
      cur  : Math.round(sess.reduce((s,x)=>s+x.duration,0)/60),
      max  : 100,
      pct  : Math.min(100,Math.round((sess.reduce((s,x)=>s+x.duration,0)/60/100)*100)),
    },
  ];

  el.innerHTML = challenges.map(c=>{
    const done  = c.pct>=100;
    const color = done?'var(--green)':c.pct>=60?'var(--purple)':'var(--orange)';
    return `
      <div class="challenge-item">
        <div class="flex items-center between mb-2">
          <div>
            <div class="font-bold text-sm">${c.title}</div>
            <div class="text-xs text-dim mt-1">${c.desc}</div>
          </div>
          ${done?'<span class="badge badge-green">Completed ✓</span>':''}
        </div>
        <div class="flex items-center between text-xs mb-2">
          <span class="text-muted">Progress: ${c.cur} / ${c.max}</span>
          <span style="color:${color};font-weight:700">${c.pct}%</span>
        </div>
        <div class="progress mb-2" style="height:6px">
          <div class="progress-fill" style="width:${c.pct}%;background:${color};border-radius:3px;transition:width .6s"></div>
        </div>
        <div class="flex items-center between">
          <span class="text-xs" style="color:var(--orange)">🎁 ${c.reward}</span>
          <span class="badge ${done?'badge-green':'badge-purple'}" style="font-size:.62rem">${done?'🏅 Earned!':'In Progress'}</span>
        </div>
      </div>`;
  }).join('');
}