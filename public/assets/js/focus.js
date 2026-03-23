/* ============================================================
   STUDYAI — FOCUS MODE
   File: public/assets/js/focus.js
   Pomodoro · Full-screen overlay · Session logging
   ============================================================ */
'use strict';

/* ── State ── */
const FO = {
  handle      : null,
  running     : false,
  totalSecs   : 25 * 60,
  remaining   : 25 * 60,
  type        : 'focus',
  sessStart   : null,
  sessionsDone: 0,
  totalMins   : 0,
  overlayOpen : false,
  data        : {},
};

const RING_C    = 2 * Math.PI * 108;   // inline ring (r=108)
const RING_C_FO = 2 * Math.PI * 118;   // overlay ring (r=118)

const QUOTES = [
  'Every expert was once a beginner. Keep going! 🚀',
  'Focus is the bridge between goals and accomplishment.',
  'Small progress is still progress. One step at a time.',
  'Discipline is choosing what you want most over what you want now.',
  'Study hard. Work smart. Dream big. Repeat. 🔄',
  "An investment in knowledge pays the best interest. — Benjamin Franklin",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
  "It always seems impossible until it's done. — Nelson Mandela 🏆",
  "Don't watch the clock — do what it does. Keep going. ⏰",
  "Success is the sum of small efforts, repeated day after day. 💪",
];
let _qi = [];

/* ════════════════════════════════════════════════════════════
   ENTRY
   ════════════════════════════════════════════════════════════ */
async function initFocus() {
  FO.data = await apiGet('/data').catch(() => ({}));
  _populateTaskSelect();
  _renderTodayStats();
  _renderSessionHistory();
  _syncDisplays();
  newQuote();

  // Pre-fill chat if navigated from revision
  const prefill = localStorage.getItem('sai_chat_prefill');
  if (prefill) {
    localStorage.removeItem('sai_chat_prefill');
    // Don't auto-send, just set the input
    const inp = document.getElementById('chat-input');
    if (inp) inp.value = prefill;
  }

  // Save partial session on tab hide
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && FO.running && FO.type === 'focus') _logPartial();
  });
}

/* ── Task select ── */
function _populateTaskSelect() {
  const tasks = (FO.data.tasks||[]).filter(t=>!t.done);
  const sel   = document.getElementById('focus-task');
  if (!sel) return;
  sel.innerHTML = '<option value="">No task selected</option>' +
    tasks.map(t=>`<option value="${t.id}">[${escHtml(t.subject)}] ${escHtml(t.text.substring(0,48))}</option>`).join('');
}

/* ════════════════════════════════════════════════════════════
   PRESETS
   ════════════════════════════════════════════════════════════ */
function setPreset(minutes, type, btn) {
  if (FO.running && !confirm('Reset current timer?')) return;
  _stopTimer();
  FO.type      = type;
  FO.totalSecs = minutes * 60;
  FO.remaining = minutes * 60;
  _syncDisplays();
  _updateBtns(false);

  // Update active preset button
  document.querySelectorAll('.preset-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  showToast(`${minutes}m ${_typeName(type)} timer set.`, 'info');
}

/* ════════════════════════════════════════════════════════════
   CONTROLS
   ════════════════════════════════════════════════════════════ */
function startTimer() {
  if (FO.running) return;
  FO.running  = true;
  FO.sessStart= Date.now();

  FO.handle = setInterval(() => {
    if (FO.remaining <= 0) { _onComplete(); return; }
    FO.remaining--;
    _syncDisplays();
  }, 1000);

  _updateBtns(true);
}

function pauseTimer() {
  if (!FO.running) return;
  _stopTimer();
  if (FO.type === 'focus') _logPartial();
  _updateBtns(false);
  showToast('Timer paused.', 'info');
}

function resetTimer() {
  const was = FO.running;
  _stopTimer();
  if (was && FO.type === 'focus') _logPartial();
  FO.remaining = FO.totalSecs;
  _syncDisplays();
  _updateBtns(false);
}

function skipSession() {
  const was = FO.running;
  _stopTimer();
  if (was && FO.type === 'focus') _logPartial();
  _onComplete();
}

function _stopTimer() {
  if (FO.handle) { clearInterval(FO.handle); FO.handle = null; }
  FO.running = false;
}

/* ════════════════════════════════════════════════════════════
   ON COMPLETE
   ════════════════════════════════════════════════════════════ */
async function _onComplete() {
  _stopTimer();

  if (FO.type === 'focus') {
    const mins = Math.round(FO.totalSecs / 60);
    await _saveSession(mins);
    FO.sessionsDone++;
    FO.totalMins += mins;
    FO.sessStart  = null;

    // Flash page title
    _flashTitle('✅ Session Complete!');
    showToast(`🎉 Session complete! Take a ${FO.sessionsDone % 4 === 0 ? '15' : '5'}-min break.`, 'success', 5000);

    // Update overlay counters
    const ses = document.getElementById('fo-sessions');
    const tot = document.getElementById('fo-total');
    if (ses) ses.textContent = FO.sessionsDone;
    if (tot) tot.textContent = fmtMins(FO.totalMins);

    // Auto-load break
    const breakMins = FO.sessionsDone % 4 === 0 ? 15 : 5;
    const breakType = FO.sessionsDone % 4 === 0 ? 'long-break' : 'break';
    FO.type      = breakType;
    FO.totalSecs = breakMins * 60;
    FO.remaining = breakMins * 60;

    // Reload data and refresh
    FO.data = await apiGet('/data').catch(() => FO.data);
    _renderTodayStats();
    _renderSessionHistory();
    newQuote();

  } else {
    showToast('Break over! Ready for your next session? 💪', 'info', 4000);
    const s = FO.data.settings || {};
    FO.type      = 'focus';
    FO.totalSecs = (s.pomodoro || 25) * 60;
    FO.remaining = FO.totalSecs;
  }

  _syncDisplays();
  _updateBtns(false);
}

/* ════════════════════════════════════════════════════════════
   SYNC BOTH DISPLAYS (inline + overlay)
   ════════════════════════════════════════════════════════════ */
function _syncDisplays() {
  const timeStr = fmtTime(FO.remaining);
  const label   = _typeName(FO.type);
  const pct     = FO.remaining / FO.totalSecs;

  // ── Inline ──
  const disp = document.getElementById('timer-display');
  const lbl  = document.getElementById('timer-type-lbl');
  const ring = document.getElementById('timer-ring');
  const bar  = document.getElementById('timer-progress-bar');
  if (disp) disp.textContent = timeStr;
  if (lbl)  lbl.textContent  = label;
  if (ring) ring.style.strokeDashoffset = RING_C * (1 - pct);
  if (bar)  bar.style.width             = (pct * 100) + '%';

  // ── Overlay ──
  const foTime = document.getElementById('fo-time');
  const foSub  = document.getElementById('fo-sub');
  const foLbl  = document.getElementById('fo-label');
  const foRing = document.getElementById('fo-ring');
  if (foTime) foTime.textContent  = timeStr;
  if (foSub)  foSub.textContent   = label;
  if (foLbl)  foLbl.textContent   = label.toUpperCase();
  if (foRing) foRing.style.strokeDashoffset = RING_C_FO * (1 - pct);
}

/* ── Button visibility ── */
function _updateBtns(running) {
  const start1 = document.getElementById('btn-start');
  const pause1 = document.getElementById('btn-pause');
  const start2 = document.getElementById('fo-start');
  const pause2 = document.getElementById('fo-pause');
  if (start1) start1.style.display = running ? 'none'        : 'inline-flex';
  if (pause1) pause1.style.display = running ? 'inline-flex' : 'none';
  if (start2) start2.style.display = running ? 'none'        : 'inline-flex';
  if (pause2) pause2.style.display = running ? 'inline-flex' : 'none';
}

/* ════════════════════════════════════════════════════════════
   OVERLAY TOGGLE
   ════════════════════════════════════════════════════════════ */
function toggleOverlay() {
  FO.overlayOpen = !FO.overlayOpen;
  const ol = document.getElementById('focus-overlay');
  if (ol) ol.classList.toggle('on', FO.overlayOpen);

  // Update streak in overlay
  const streak = FO.data.streak || {current:0};
  const foSt   = document.getElementById('fo-streak');
  if (foSt) foSt.textContent = streak.current + '🔥';

  if (FO.overlayOpen) newQuote();
}

/* ════════════════════════════════════════════════════════════
   SESSION SAVING
   ════════════════════════════════════════════════════════════ */
async function _saveSession(minutes) {
  if (minutes < 1) return;
  const taskSel = document.getElementById('focus-task');
  const taskId  = taskSel?.value;
  let   subject = 'General';
  if (taskId) {
    const t = (FO.data.tasks||[]).find(x=>x.id===taskId);
    if (t) subject = t.subject;
  }
  const sess = {
    id      : genId(),
    subject,
    duration: minutes,
    type    : 'focus',
    date    : today(),
    created : Date.now(),
  };
  FO.data.sessions = [...(FO.data.sessions||[]), sess];
  await apiPost('/data/sessions', {value: FO.data.sessions});
}

function _logPartial() {
  if (!FO.sessStart) return;
  const elapsed = Math.floor((Date.now() - FO.sessStart) / 60000);
  if (elapsed >= 1) { _saveSession(elapsed); FO.totalMins += elapsed; }
  FO.sessStart = null;
}

/* ════════════════════════════════════════════════════════════
   TODAY'S STATS
   ════════════════════════════════════════════════════════════ */
function _renderTodayStats() {
  const el      = document.getElementById('today-stats');
  if (!el) return;
  const todaySess= (FO.data.sessions||[]).filter(s=>s.date===today());
  const todayMins= todaySess.reduce((s,r)=>s+r.duration,0);
  const streak   = FO.data.streak || {current:0};
  const goal     = (FO.data.settings||{}).dailyGoal || 4;
  const goalPct  = Math.min(100, Math.round((todayMins/60/goal)*100));

  el.innerHTML = [
    {val:fmtMins(todayMins),  lbl:'Studied Today'},
    {val:goalPct+'%',          lbl:'Daily Goal'},
    {val:streak.current+'d',   lbl:'Streak'},
    {val:todaySess.length,     lbl:'Sessions'},
  ].map(s=>`
    <div class="day-stat">
      <div class="day-stat-val">${s.val}</div>
      <div class="day-stat-lbl">${s.lbl}</div>
    </div>`).join('');

  // Overlay counters
  const foSess = document.getElementById('fo-sessions');
  const foTot  = document.getElementById('fo-total');
  if (foSess) foSess.textContent = FO.sessionsDone;
  if (foTot)  foTot.textContent  = fmtMins(FO.totalMins);
}

/* ════════════════════════════════════════════════════════════
   SESSION HISTORY
   ════════════════════════════════════════════════════════════ */
function _renderSessionHistory() {
  const el   = document.getElementById('session-history');
  const totEl= document.getElementById('total-today');
  if (!el) return;

  const subColors = {
    OS:'var(--purple)', DBMS:'var(--cyan)', DSA:'var(--green)',
    CN:'var(--orange)', AI:'var(--pink)',   Math:'var(--yellow)', General:'var(--text-dim)',
  };

  const allSess = (FO.data.sessions||[])
    .filter(s=>s.type==='focus')
    .sort((a,b)=>b.created-a.created)
    .slice(0,12);

  if (totEl) {
    const todayMins = allSess.filter(s=>s.date===today()).reduce((s,r)=>s+r.duration,0);
    totEl.textContent = fmtMins(todayMins) + ' today';
  }

  if (!allSess.length) {
    el.innerHTML = emptyState('⚡','No focus sessions yet','Start your first timer above!');
    return;
  }

  el.innerHTML = allSess.map(s=>{ const c = subColors[s.subject]||'var(--text-dim)'; return `
    <div class="sess-item">
      <div class="sess-dot" style="background:${c}"></div>
      <div style="flex:1"><span class="font-bold text-sm">${escHtml(s.subject)}</span></div>
      <span class="badge badge-purple">${fmtMins(s.duration)}</span>
      <span class="text-xs text-muted" style="width:70px;text-align:right">${timeAgo(s.created)}</span>
    </div>`;}).join('');
}

/* ════════════════════════════════════════════════════════════
   QUOTES
   ════════════════════════════════════════════════════════════ */
function newQuote() {
  if (_qi.length >= QUOTES.length) _qi = [];
  let i;
  do { i = Math.floor(Math.random() * QUOTES.length); } while (_qi.includes(i));
  _qi.push(i);
  const q = QUOTES[i];
  const qtEl  = document.getElementById('quote-text');
  const foqEl = document.getElementById('fo-quote');
  if (qtEl)  qtEl.textContent  = q;
  if (foqEl) foqEl.textContent = q;
}

/* ── Flash title ── */
function _flashTitle(msg) {
  const orig = document.title;
  let count  = 0;
  const id   = setInterval(() => {
    document.title = count % 2 === 0 ? msg : orig;
    if (++count >= 8) { clearInterval(id); document.title = orig; }
  }, 700);
}

/* ── Helpers ── */
function _typeName(t) {
  return {focus:'Focus Session', break:'Short Break', 'long-break':'Long Break'}[t] || 'Focus';
}