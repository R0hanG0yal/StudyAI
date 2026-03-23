/* ============================================================
   STUDYAI — REVISION CENTER
   File: public/assets/js/revision.js
   ============================================================ */
'use strict';

const RV = { data: {} };

/* ── ENTRY ── */
async function initRevision() {
  RV.data = await apiGet('/data').catch(() => ({}));
  _wireTabs();
  renderRevSchedule();
}

/* ── Tabs ── */
function _wireTabs() {
  document.querySelectorAll('#rev-tabs .tab').forEach(tab=>{
    tab.onclick = () => {
      document.querySelectorAll('#rev-tabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const v = tab.dataset.rv;
      ['schedule','weak','mistakes','history'].forEach(x=>{
        const el=document.getElementById('rv-'+x);
        if(el) el.style.display = x===v?'block':'none';
      });
      if (v==='schedule') renderRevSchedule();
      if (v==='weak')     renderWeakTopics();
      if (v==='mistakes') renderMistakes();
      if (v==='history')  renderHistory();
    };
  });
}

/* ════════════════════════════════════════════════════════════
   SCHEDULE
   ════════════════════════════════════════════════════════════ */
function renderRevSchedule() {
  const all = RV.data.revisions || [];

  const due      = all.filter(r=>!r.done && r.date<=today());
  const upcoming = all.filter(r=>!r.done && r.date>today())
    .sort((a,b)=>a.date.localeCompare(b.date))
    .filter(r=>daysUntil(r.date)<=7);
  const sorted   = [...all].sort((a,b)=>{
    if(!a.done && b.done) return -1;
    if(a.done && !b.done) return 1;
    return a.date.localeCompare(b.date);
  });

  const due1El = document.getElementById('rv-due-today');
  const upEl   = document.getElementById('rv-upcoming');
  const allEl  = document.getElementById('rv-all');

  if(due1El) due1El.innerHTML = due.length
    ? due.map(r=>_revCardHTML(r,'var(--red)')).join('')
    : emptyState('🎉','All caught up!','No revisions due today.');

  if(upEl) upEl.innerHTML = upcoming.length
    ? upcoming.map(r=>_revCardHTML(r,'var(--orange)')).join('')
    : emptyState('📅','No upcoming','Schedule some revisions!');

  if(allEl) allEl.innerHTML = sorted.length
    ? sorted.map(r=>{
        const d = daysUntil(r.date);
        const c = r.done ? 'var(--green)' : d<=0 ? 'var(--red)' : d<=3 ? 'var(--orange)' : 'var(--purple)';
        return _revCardHTML(r,c);
      }).join('')
    : emptyState('🔄','No revisions scheduled',
        '<a class="text-purple pointer" onclick="openModal(\'modal-add-rev\')">Schedule one</a>');
}

function _revCardHTML(r, barColor) {
  const d = daysUntil(r.date);
  const badge = r.done
    ? `<span class="badge badge-green">Done ✓</span>`
    : d<=0 ? `<span class="badge badge-red">Due Today</span>`
    : d===1 ? `<span class="badge badge-orange">Tomorrow</span>`
    : `<span class="badge badge-purple">In ${d}d</span>`;
  const priColor = {high:'var(--red)',medium:'var(--orange)',low:'var(--green)'}[r.priority||'medium'];

  return `
    <div class="rev-card">
      <div class="rev-bar" style="background:${barColor}"></div>
      <div style="flex:1;min-width:0">
        <div class="font-bold text-sm">${escHtml(r.topic)}</div>
        <div class="flex gap-2 mt-1 flex-wrap items-center">
          <span class="badge badge-purple" style="font-size:.62rem">${escHtml(r.subject)}</span>
          ${badge}
          <span class="text-xs" style="color:${priColor}">● ${r.priority||'medium'}</span>
          <span class="text-xs text-muted">${formatDate(r.date)}</span>
        </div>
      </div>
      <div class="flex gap-2">
        ${!r.done
          ? `<button class="btn btn-primary btn-sm" onclick="markDone('${r.id}')">✓ Done</button>
             <button class="btn btn-secondary btn-sm" onclick="studyTopic('${escAttr(r.topic)}','${escAttr(r.subject)}')">Study →</button>`
          : `<button class="btn btn-secondary btn-sm" onclick="undoDone('${r.id}')">Undo</button>`}
        <button class="btn-icon" style="width:26px;height:26px;border-radius:7px" onclick="deleteRevision('${r.id}')">✕</button>
      </div>
    </div>`;
}

/* ── Add revision ── */
async function addRevision() {
  const topic = document.getElementById('rv-topic')?.value.trim();
  if (!topic) return showToast('Topic is required.','error');
  const date = document.getElementById('rv-date')?.value;
  if (!date) return showToast('Select a date.','error');

  RV.data.revisions = [...(RV.data.revisions||[]),{
    id:genId(), topic,
    subject : document.getElementById('rv-subject')?.value  || 'General',
    priority: document.getElementById('rv-priority')?.value || 'medium',
    date, done:false, created:Date.now(),
  }];
  await apiPost('/data/revisions',{value:RV.data.revisions});
  closeModal('modal-add-rev');
  document.getElementById('rv-topic').value='';
  renderRevSchedule();
  showToast('Revision scheduled!','success');
}

/* ── Mark done ── */
async function markDone(id) {
  const revs = RV.data.revisions||[];
  const idx  = revs.findIndex(r=>r.id===id);
  if(idx<0) return;
  revs[idx].done=true; revs[idx].completedAt=Date.now();
  RV.data.revisions=revs;

  // Log a 30-min revision session
  const s = revs[idx];
  RV.data.sessions = [...(RV.data.sessions||[]),{
    id:genId(), subject:s.subject, duration:30, type:'revision', date:today(), created:Date.now()
  }];
  await apiPost('/data/revisions',{value:revs});
  await apiPost('/data/sessions',{value:RV.data.sessions});
  renderRevSchedule();
  showToast('Revision complete! ✓','success');
}

async function undoDone(id) {
  const revs = RV.data.revisions||[];
  const idx  = revs.findIndex(r=>r.id===id);
  if(idx<0) return;
  revs[idx].done=false; revs[idx].completedAt=null;
  RV.data.revisions=revs;
  await apiPost('/data/revisions',{value:revs});
  renderRevSchedule();
  showToast('Marked as pending.','info');
}

async function deleteRevision(id) {
  RV.data.revisions=(RV.data.revisions||[]).filter(r=>r.id!==id);
  await apiPost('/data/revisions',{value:RV.data.revisions});
  renderRevSchedule();
  showToast('Removed.','info');
}

function studyTopic(topic, subject) {
  // Navigate to AI chat with topic pre-filled
  localStorage.setItem('sai_chat_prefill', `Help me revise: ${topic} (${subject})`);
  window.location.href='/chat.html';
}

/* ════════════════════════════════════════════════════════════
   WEAK TOPICS
   ════════════════════════════════════════════════════════════ */
function renderWeakTopics() {
  const qr  = RV.data.quizResults||[];
  const map = {};
  qr.forEach(r=>{
    const s=r.subject||'General';
    if(!map[s]) map[s]={c:0,t:0,n:0};
    map[s].c+=r.score; map[s].t+=r.total; map[s].n++;
  });

  const weak = Object.entries(map)
    .map(([topic,d])=>({topic,acc:Math.round((d.c/d.t)*100),attempts:d.n}))
    .sort((a,b)=>a.acc-b.acc);

  const el = document.getElementById('weak-list');
  if(!el) return;
  if(!weak.length){ el.innerHTML=emptyState('🎯','No quiz data yet','Take quizzes to find weak topics!'); return; }

  el.innerHTML = weak.map(t=>{
    const c = t.acc<50?'var(--red)':t.acc<70?'var(--orange)':'var(--green)';
    const status = t.acc<50?'Needs Work':t.acc<70?'Improving':'Good';
    return `
      <div class="weak-row">
        <div style="flex:1;min-width:0">
          <div class="flex items-center between mb-2">
            <span class="font-bold text-sm">${escHtml(t.topic)}</span>
            <span style="font-family:var(--font-mono);font-weight:700;color:${c}">${t.acc}%</span>
          </div>
          <div class="progress mb-1" style="height:6px">
            <div class="progress-fill" style="width:${t.acc}%;background:${c};border-radius:3px"></div>
          </div>
          <div class="flex gap-2 mt-1">
            <span class="text-xs text-muted">${t.attempts} quiz${t.attempts!==1?'zes':''}</span>
            <span class="text-xs" style="color:${c}">${status}</span>
          </div>
        </div>
        <div class="flex gap-2" style="flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick="scheduleWeak('${escAttr(t.topic)}')">+ Schedule</button>
          <button class="btn btn-primary btn-sm"   onclick="studyTopic('${escAttr(t.topic)}','${escAttr(t.topic)}')">Study →</button>
        </div>
      </div>`;
  }).join('');
}

function scheduleWeak(topic) {
  document.getElementById('rv-topic').value=topic;
  document.getElementById('rv-priority').value='high';
  openModal('modal-add-rev');
}

/* ════════════════════════════════════════════════════════════
   MISTAKES
   ════════════════════════════════════════════════════════════ */
function renderMistakes() {
  const all = (RV.data.quizResults||[])
    .flatMap(r=>(r.mistakes||[]).map(m=>({...m,quizTitle:r.title,subject:r.subject,ts:r.timestamp})));
  const el  = document.getElementById('mistakes-list');
  const cnt = document.getElementById('mistakes-count');
  if(cnt) cnt.textContent = all.length + ' mistakes';

  if(!el) return;
  if(!all.length){ el.innerHTML=emptyState('✅','No mistakes recorded!','Complete quizzes to track errors.'); return; }

  // Group by subject
  const grouped = {};
  all.forEach(m=>{ const s=m.subject||'General'; if(!grouped[s]) grouped[s]=[]; grouped[s].push(m); });

  el.innerHTML = Object.entries(grouped).map(([subj,ms])=>`
    <div class="mb-4">
      <div class="flex items-center gap-2 mb-3">
        <span class="badge badge-purple">${escHtml(subj)}</span>
        <span class="text-xs text-muted">${ms.length} mistake${ms.length!==1?'s':''}</span>
      </div>
      ${ms.map(m=>`
        <div class="mistake-card">
          <div class="font-bold text-sm mb-2">❓ ${escHtml(m.q)}</div>
          <div class="text-xs mb-1" style="color:var(--red)">✕ You answered: ${escHtml(m.wrong||'Time expired')}</div>
          <div class="text-xs mb-2" style="color:var(--green)">✓ Correct: ${escHtml(m.correct)}</div>
          ${m.quizTitle?`<div class="text-xs text-muted">From: ${escHtml(m.quizTitle)}</div>`:''}
        </div>`).join('')}
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   HISTORY
   ════════════════════════════════════════════════════════════ */
function renderHistory() {
  const done = (RV.data.revisions||[])
    .filter(r=>r.done)
    .sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));
  const el = document.getElementById('history-list');
  if(!el) return;
  el.innerHTML = done.length
    ? done.map(r=>`
        <div class="rev-card">
          <div class="rev-bar" style="background:var(--green)"></div>
          <div style="flex:1">
            <div class="font-bold text-sm">${escHtml(r.topic)}</div>
            <div class="flex gap-2 mt-1 flex-wrap">
              <span class="badge badge-purple" style="font-size:.62rem">${escHtml(r.subject)}</span>
              <span class="badge badge-green" style="font-size:.62rem">Done ✓</span>
              ${r.completedAt?`<span class="text-xs text-muted">${timeAgo(r.completedAt)}</span>`:''}
            </div>
          </div>
        </div>`).join('')
    : emptyState('📜','No completed revisions yet','Mark revisions as done to build your history!');
}