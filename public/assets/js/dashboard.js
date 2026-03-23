/* ============================================================
   STUDYAI — DASHBOARD
   File: public/assets/js/dashboard.js
   ============================================================ */
'use strict';

let _weekChart = null;

/* ── ENTRY ── */
async function loadDashboard(user) {
  // Set greeting
  document.getElementById('greet-time').textContent = greetTime();
  document.getElementById('greet-name').textContent = (user.name || 'Student').split(' ')[0];

  // Load all in parallel
  const [data] = await Promise.all([
    apiGet('/data').catch(() => ({})),
  ]);

  _renderStats(data);
  _renderTasks(data);
  _renderExams(data);
  _renderRecs(data);
  _renderActivity(data);
  _renderWeak(data);
  _renderWeekChart(data);
}

/* ════════════════════════════════════════════════════════════
   STAT CARDS
   ════════════════════════════════════════════════════════════ */
function _renderStats(data) {
  const sessions = data.sessions || [];
  const notes    = data.notes    || [];
  const streak   = data.streak   || { current: 0, longest: 0 };
  const qr       = data.quizResults || [];
  const tasks    = data.tasks    || [];

  const totalMins = sessions.reduce((s, r) => s + (r.duration || 0), 0);
  const avgScore  = qr.length ? Math.round(qr.reduce((s, r) => s + r.pct, 0) / qr.length) : 0;
  const doneCount = tasks.filter(t => t.done).length;

  const stats = [
    { icon:'⏱️', cls:'purple', val: _fmtH(totalMins),   label:'Study Time',   change:`↑ ${sessions.length} sessions`,   up:true  },
    { icon:'🔥', cls:'orange', val: streak.current,      label:'Day Streak',   change:`Best: ${streak.longest} days`,    up:true  },
    { icon:'📝', cls:'blue',   val: notes.length,        label:'Notes',        change:'↑ All subjects',                  up:true  },
    { icon:'🎯', cls:'green',  val: avgScore + '%',      label:'Quiz Average', change:`${qr.length} quizzes taken`,      up:avgScore >= 60 },
    { icon:'✅', cls:'pink',   val: `${doneCount}/${tasks.length}`, label:'Tasks Done', change:'Today', up:doneCount > 0 },
  ];

  document.getElementById('stat-grid').innerHTML = stats.map(s => `
    <div class="stat-card ${s.cls}">
      <div class="stat-icon ${s.cls}">${s.icon}</div>
      <div class="stat-value">${s.val}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-change ${s.up ? 'up' : 'down'}">${s.change}</div>
    </div>`).join('');

  // Update streak in topbar
  updateTopbarStreak(streak.current);
}

/* ════════════════════════════════════════════════════════════
   TODAY'S TASKS
   ════════════════════════════════════════════════════════════ */
function _renderTasks(data) {
  const tasks   = (data.tasks || []).filter(t => t.date === today());
  const el      = document.getElementById('dash-tasks');
  if (!el) return;

  if (!tasks.length) {
    el.innerHTML = emptyState('✅', 'No tasks for today', 'Add one below!');
    return;
  }

  el.innerHTML = tasks.slice(0, 5).map(t => `
    <div class="task-item" id="dash-task-${t.id}">
      <div class="task-check ${t.done ? 'checked' : ''}"
           onclick="toggleDashTask('${t.id}')">${t.done ? '✓' : ''}</div>
      <div style="flex:1;min-width:0">
        <div class="task-text ${t.done ? 'done' : ''}">${escHtml(t.text)}</div>
        <div class="flex gap-2 mt-1 flex-wrap">
          <span class="badge badge-purple text-xs">${t.subject}</span>
        </div>
      </div>
      <div class="priority-dot priority-${t.priority || 'medium'}"></div>
    </div>`).join('');
}

async function toggleDashTask(id) {
  const data  = await apiGet('/data').catch(() => ({}));
  const tasks = data.tasks || [];
  const idx   = tasks.findIndex(t => t.id === id);
  if (idx < 0) return;
  tasks[idx].done = !tasks[idx].done;
  if (tasks[idx].done) tasks[idx].completedAt = Date.now();
  await apiPost('/data/tasks', { value: tasks });
  _renderTasks({ ...data, tasks });
  showToast(tasks[idx].done ? 'Task completed! ✓' : 'Task reopened.', 'success');
}

async function addTaskDash() {
  const text = document.getElementById('task-text')?.value.trim();
  if (!text) return showToast('Task description is required.', 'error');

  const data  = await apiGet('/data').catch(() => ({}));
  const tasks = data.tasks || [];
  tasks.push({
    id      : genId(),
    text,
    subject : document.getElementById('task-sub')?.value  || 'General',
    priority: document.getElementById('task-pri')?.value  || 'medium',
    date    : document.getElementById('task-date')?.value || today(),
    done    : false,
    created : Date.now(),
  });
  await apiPost('/data/tasks', { value: tasks });
  closeModal('modal-add-task');
  document.getElementById('task-text').value = '';
  _renderTasks({ ...data, tasks });
  showToast('Task added!', 'success');
}

/* ════════════════════════════════════════════════════════════
   UPCOMING EXAMS
   ════════════════════════════════════════════════════════════ */
function _renderExams(data) {
  const exams = (data.exams || [])
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const el = document.getElementById('dash-exams');
  if (!el) return;

  if (!exams.length) {
    el.innerHTML = emptyState('📅', 'No exams scheduled', 'Add one to start countdown!');
    return;
  }

  el.innerHTML = exams.slice(0, 3).map(e => {
    const d     = daysUntil(e.date);
    const color = d <= 7  ? 'var(--red)'    :
                  d <= 14 ? 'var(--orange)' : 'var(--green)';
    return `
      <div class="exam-countdown">
        <div>
          <div class="font-bold text-sm">${escHtml(e.subject)}</div>
          <div class="text-xs text-dim mt-1">${e.type} · ${formatDate(e.date)}</div>
        </div>
        <div class="text-center">
          <div class="exam-days-num" style="color:${color}">${d}</div>
          <div class="exam-days-lbl">days</div>
        </div>
      </div>`;
  }).join('');
}

async function addExamDash() {
  const sub = document.getElementById('exam-sub')?.value.trim();
  if (!sub) return showToast('Subject is required.', 'error');
  const date = document.getElementById('exam-date')?.value;
  if (!date) return showToast('Select an exam date.', 'error');
  if (new Date(date) < new Date()) return showToast('Date must be in the future.', 'error');

  const data  = await apiGet('/data').catch(() => ({}));
  const exams = data.exams || [];
  exams.push({
    id     : genId(),
    subject: sub,
    date,
    type   : document.getElementById('exam-type')?.value || 'Midterm',
    created: Date.now(),
  });
  await apiPost('/data/exams', { value: exams });
  closeModal('modal-add-exam');
  document.getElementById('exam-sub').value = '';
  _renderExams({ ...data, exams });
  showToast(`${sub} exam added!`, 'success');
}

/* ════════════════════════════════════════════════════════════
   AI RECOMMENDATIONS
   ════════════════════════════════════════════════════════════ */
function _renderRecs(data) {
  const el    = document.getElementById('dash-recs');
  if (!el) return;

  const qr    = data.quizResults  || [];
  const revs  = data.revisions    || [];
  const cards = data.flashcards   || [];
  const recs  = [];

  // Weak topic alert
  const weakMap = {};
  qr.forEach(r => {
    const s = r.subject || 'General';
    if (!weakMap[s]) weakMap[s] = { c:0, t:0 };
    weakMap[s].c += r.score; weakMap[s].t += r.total;
  });
  const weak = Object.entries(weakMap)
    .map(([topic, d]) => ({ topic, acc: Math.round((d.c/d.t)*100) }))
    .sort((a,b) => a.acc - b.acc);

  if (weak.length && weak[0].acc < 70)
    recs.push({ icon:'⚠️', text:`<strong>${weak[0].topic}</strong> needs attention — ${weak[0].acc}% quiz accuracy.`, href:'/revision.html', action:'Revise' });

  // Due revisions
  const dueRevs = revs.filter(r => !r.done && r.date <= today());
  if (dueRevs.length)
    recs.push({ icon:'🔄', text:`<strong>${dueRevs.length} revision${dueRevs.length>1?'s':''}</strong> due today. Stay on schedule!`, href:'/revision.html', action:'Start' });

  // Due flashcards
  const dueCards = cards.filter(c => !c.nextReview || c.nextReview <= today());
  if (dueCards.length)
    recs.push({ icon:'🃏', text:`<strong>${dueCards.length} flashcard${dueCards.length>1?'s':''}</strong> due for spaced-repetition review.`, href:'/flashcards.html', action:'Study' });

  // Default nudge
  if (!qr.length)
    recs.push({ icon:'🎯', text:'Take a <strong>practice quiz</strong> to identify your weak topics.', href:'/quiz.html', action:'Quiz Now' });

  recs.push({ icon:'💡', text:'Consistent daily study beats last-minute cramming. Even 30 minutes counts!', href:'/focus.html', action:'Focus' });

  el.innerHTML = recs.slice(0,4).map(r => `
    <div class="rec-card">
      <div class="rec-icon">${r.icon}</div>
      <div class="rec-text">${r.text}</div>
      <a href="${r.href}" class="btn btn-secondary btn-sm" style="flex-shrink:0">${r.action} →</a>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   RECENT ACTIVITY
   ════════════════════════════════════════════════════════════ */
function _renderActivity(data) {
  const el      = document.getElementById('dash-activity');
  if (!el) return;

  const sessions = (data.sessions     || []).sort((a,b) => b.created - a.created);
  const qr       = (data.quizResults  || []).sort((a,b) => b.timestamp - a.timestamp);
  const notes    = (data.notes        || []).sort((a,b) => b.updated - a.updated);

  const colMap = { OS:'var(--purple)', DBMS:'var(--cyan)', DSA:'var(--green)', CN:'var(--orange)', AI:'var(--pink)', Math:'var(--yellow)', General:'var(--text-dim)' };

  const items = [
    ...sessions.slice(0,2).map(s => ({ text:`Study: ${s.subject} — ${_fmtH(s.duration)}`,   time:s.created,    dot:colMap[s.subject]||'var(--purple)' })),
    ...qr.slice(0,2).map(r       => ({ text:`Quiz: ${r.title} — ${r.pct}%`,                  time:r.timestamp,  dot:r.pct>=70?'var(--green)':'var(--red)' })),
    ...notes.slice(0,2).map(n    => ({ text:`Note: ${truncate(n.title,40)}`,                  time:n.updated,    dot:'var(--cyan)' })),
  ].sort((a,b) => b.time - a.time).slice(0,5);

  el.innerHTML = items.length
    ? items.map(a => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${a.dot}"></div>
          <div><div class="activity-text">${escHtml(a.text)}</div><div class="activity-time">${timeAgo(a.time)}</div></div>
        </div>`).join('')
    : emptyState('⚡', 'No activity yet', 'Start studying to see your timeline!');
}

/* ════════════════════════════════════════════════════════════
   WEAK TOPICS
   ════════════════════════════════════════════════════════════ */
function _renderWeak(data) {
  const el = document.getElementById('dash-weak');
  if (!el) return;

  const qr = data.quizResults || [];
  const map = {};
  qr.forEach(r => {
    const s = r.subject || 'General';
    if (!map[s]) map[s] = { c:0, t:0 };
    map[s].c += r.score; map[s].t += r.total;
  });

  const weak = Object.entries(map)
    .map(([topic,d]) => ({ topic, acc: Math.round((d.c/d.t)*100) }))
    .sort((a,b) => a.acc - b.acc);

  if (!weak.length) { el.innerHTML = emptyState('🎉','No quiz data yet','Take quizzes to find weak topics!'); return; }

  el.innerHTML = weak.slice(0,5).map(t => {
    const c = t.acc<50?'var(--red)':t.acc<70?'var(--orange)':'var(--green)';
    return `
      <div class="mastery-row">
        <span class="mastery-label">${t.topic}</span>
        <div class="mastery-bar"><div class="mastery-fill" style="width:${t.acc}%;background:${c}"></div></div>
        <span class="mastery-pct">${t.acc}%</span>
      </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════
   WEEKLY STUDY CHART
   ════════════════════════════════════════════════════════════ */
function _renderWeekChart(data) {
  const cv = document.getElementById('week-chart');
  if (!cv) return;
  if (_weekChart) { _weekChart.destroy(); _weekChart = null; }

  const sessions = data.sessions || [];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d   = new Date();
    d.setDate(d.getDate() - 6 + i);
    const ds  = dateStr(d);
    const mins= sessions.filter(s => s.date === ds).reduce((s, x) => s + x.duration, 0);
    return { label: d.toLocaleDateString('en', { weekday: 'short' }), hours: Math.round(mins/60*10)/10 };
  });

  _weekChart = new Chart(cv, {
    type: 'bar',
    data: {
      labels  : days.map(d => d.label),
      datasets: [{
        data           : days.map(d => d.hours),
        backgroundColor: days.map(d => d.hours > 0
          ? 'rgba(102,126,234,.65)'
          : 'rgba(255,255,255,.04)'),
        borderColor    : 'rgba(102,126,234,.9)',
        borderWidth    : 1,
        borderRadius   : 6,
        borderSkipped  : false,
      }],
    },
    options: {
      responsive       : true,
      maintainAspectRatio: false,
      plugins: {
        legend : { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,15,26,.95)',
          titleColor: '#f0f2ff', bodyColor:'#9ca3c0',
          borderColor:'rgba(102,126,234,.3)', borderWidth:1,
          callbacks: { label: c => c.raw + 'h studied' },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid : { color:'rgba(255,255,255,.04)' },
          ticks: { color:'rgba(255,255,255,.3)', font:{size:11}, callback: v => v+'h' },
        },
        x: {
          grid : { display: false },
          ticks: { color:'rgba(255,255,255,.35)', font:{size:11} },
        },
      },
    },
  });
}

/* ── HELPERS ── */
function _fmtH(mins) {
  if (!mins) return '0m';
  if (mins < 60) return mins + 'm';
  return Math.round(mins/60*10)/10 + 'h';
}