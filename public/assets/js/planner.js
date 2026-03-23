/* ============================================================
   STUDYAI — STUDY PLANNER
   File: public/assets/js/planner.js
   ============================================================ */
'use strict';

const PL = {
  data    : {},
  year    : new Date().getFullYear(),
  month   : new Date().getMonth(),
  selDate : today(),
};

/* ── ENTRY ── */
async function initPlanner() {
  PL.data = await apiGet('/data').catch(() => ({}));
  renderCal();
  renderExams();
  renderAllTasks();
  renderGoal();
}

/* ════════════════════════════════════════════════════════════
   CALENDAR
   ════════════════════════════════════════════════════════════ */
function renderCal() {
  const y   = PL.year, m = PL.month;
  const lbl = document.getElementById('cal-label');
  if (lbl) lbl.textContent = new Date(y,m,1)
    .toLocaleDateString('en',{month:'long',year:'numeric'});

  const wds = document.getElementById('cal-weekdays');
  if (wds) wds.innerHTML = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    .map(d=>`<div class="cal-wd">${d}</div>`).join('');

  const first    = new Date(y,m,1).getDay();
  const daysInM  = new Date(y,m+1,0).getDate();
  const prevEnd  = new Date(y,m,0).getDate();
  const tasks    = PL.data.tasks || [];
  const exams    = PL.data.exams || [];
  const taskDates= new Set(tasks.map(t=>t.date));
  const examDates= new Set(exams.map(e=>e.date));
  const todayStr = today();
  let   html     = '';

  for (let i = first-1; i >= 0; i--)
    html += `<div class="cal-day dim">${prevEnd-i}</div>`;

  for (let d = 1; d <= daysInM; d++) {
    const ds  = dateStr(new Date(y,m,d));
    const cls = [
      ds===todayStr   ? 'today' : '',
      ds===PL.selDate ? 'sel'   : '',
      examDates.has(ds) ? 'has-e' : taskDates.has(ds) ? 'has-t' : '',
    ].filter(Boolean).join(' ');
    html += `<div class="cal-day ${cls}" onclick="selDate('${ds}')">${d}</div>`;
  }

  const rem = 42 - (first + daysInM);
  for (let d = 1; d <= rem; d++)
    html += `<div class="cal-day dim">${d}</div>`;

  const grid = document.getElementById('cal-grid');
  if (grid) grid.innerHTML = html;

  renderDayTasks(PL.selDate);
}

function selDate(ds) { PL.selDate = ds; renderCal(); }

function calNav(dir) {
  PL.month += dir;
  if (PL.month > 11) { PL.month = 0; PL.year++; }
  if (PL.month < 0)  { PL.month = 11; PL.year--; }
  renderCal();
}

/* ── Day tasks ── */
function renderDayTasks(ds) {
  const lbl = document.getElementById('day-label');
  if (lbl) lbl.textContent = ds===today()
    ? "Today's Tasks"
    : new Date(ds+'T00:00:00').toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric'});

  const tasks = (PL.data.tasks||[]).filter(t=>t.date===ds);
  const exams = (PL.data.exams||[]).filter(e=>e.date===ds);
  const el    = document.getElementById('day-tasks-list');
  if (!el) return;

  if (!tasks.length && !exams.length) {
    el.innerHTML = `<div class="text-xs text-muted" style="padding:8px 0">
      No tasks for this day.
      <a class="text-purple pointer" onclick="openModal('modal-add-task')"> Add one?</a>
    </div>`;
    return;
  }

  el.innerHTML = [
    ...exams.map(e=>`
      <div class="task-item" style="border-left:3px solid var(--red);margin-bottom:7px">
        <span>📅</span>
        <div style="flex:1">
          <div class="font-bold text-sm">${escHtml(e.subject)}</div>
          <div class="text-xs text-muted">${e.type}</div>
        </div>
        <button class="btn-icon" style="width:24px;height:24px;border-radius:6px"
                onclick="deleteExam('${e.id}')">✕</button>
      </div>`),
    ...tasks.map(t => _taskHTML(t, true)),
  ].join('');
}

/* ════════════════════════════════════════════════════════════
   ALL TASKS
   ════════════════════════════════════════════════════════════ */
function renderAllTasks() {
  const sub  = document.getElementById('filter-subject')?.value  || 'all';
  const stat = document.getElementById('filter-status')?.value   || 'all';
  const pri  = document.getElementById('filter-priority')?.value || 'all';
  let   tasks= [...(PL.data.tasks||[])];

  if (sub  !== 'all')     tasks = tasks.filter(t=>t.subject===sub);
  if (stat === 'pending') tasks = tasks.filter(t=>!t.done);
  if (stat === 'done')    tasks = tasks.filter(t=>t.done);
  if (pri  !== 'all')     tasks = tasks.filter(t=>(t.priority||'medium')===pri);

  const pw = {high:0,medium:1,low:2};
  tasks.sort((a,b)=>{
    if (!a.done && b.done) return -1;
    if (a.done && !b.done) return 1;
    const dateCmp = (a.date||'').localeCompare(b.date||'');
    if (dateCmp !== 0) return dateCmp;
    return (pw[a.priority||'medium']||1) - (pw[b.priority||'medium']||1);
  });

  const el = document.getElementById('all-tasks-list');
  if (!el) return;
  el.innerHTML = tasks.length
    ? tasks.map(t => _taskHTML(t, false)).join('')
    : emptyState('✅','No tasks found',
        'Try different filters or <a class="text-purple pointer" onclick="openModal(\'modal-add-task\')">add a task</a>.');
}

function _taskHTML(t, compact=true) {
  const priColor = {high:'var(--red)',medium:'var(--orange)',low:'var(--green)'}[t.priority||'medium'];
  const doneStyle= t.done ? 'text-decoration:line-through;color:var(--text-muted)' : '';
  const dateLabel= !compact && t.date
    ? (t.date===today()?'Today':t.date===addDays(1)?'Tomorrow':formatDate(t.date))
    : '';
  return `
    <div class="task-item" id="task-row-${t.id}">
      <div class="task-check ${t.done?'checked':''}" onclick="toggleTask('${t.id}')">${t.done?'✓':''}</div>
      <div style="flex:1;min-width:0">
        <div class="task-text" style="${doneStyle}">${escHtml(t.text)}</div>
        ${!compact?`<div class="flex gap-2 mt-1 flex-wrap">
          <span class="badge badge-purple" style="font-size:.62rem">${escHtml(t.subject||'General')}</span>
          ${dateLabel?`<span class="text-xs text-muted">${dateLabel}</span>`:''}
          ${t.duration?`<span class="text-xs text-muted">${t.duration}h</span>`:''}
        </div>`:''}
      </div>
      <div class="priority-dot" style="background:${priColor}" title="${t.priority||'medium'}"></div>
      <button class="btn-icon" style="width:24px;height:24px;border-radius:6px"
              onclick="deleteTask('${t.id}')">✕</button>
    </div>`;
}

/* ── ADD / TOGGLE / DELETE task ── */
async function addTask() {
  const text = document.getElementById('t-text')?.value.trim();
  if (!text) return showToast('Task description is required.','error');

  PL.data.tasks = [...(PL.data.tasks||[]), {
    id      : genId(), text,
    subject : document.getElementById('t-subject')?.value  || 'General',
    priority: document.getElementById('t-priority')?.value || 'medium',
    date    : document.getElementById('t-date')?.value     || today(),
    duration: parseFloat(document.getElementById('t-duration')?.value)||1,
    done    : false, created: Date.now(),
  }];
  await apiPost('/data/tasks',{value:PL.data.tasks});
  closeModal('modal-add-task');
  document.getElementById('t-text').value='';
  renderCal(); renderAllTasks();
  showToast('Task added!','success');
}

async function toggleTask(id) {
  const tasks = PL.data.tasks||[];
  const idx   = tasks.findIndex(t=>t.id===id);
  if (idx<0) return;
  tasks[idx].done = !tasks[idx].done;
  if (tasks[idx].done) tasks[idx].completedAt = Date.now();
  PL.data.tasks = tasks;
  await apiPost('/data/tasks',{value:tasks});
  renderDayTasks(PL.selDate);
  renderAllTasks();
  renderGoal();
  showToast(tasks[idx].done?'Task complete! ✓':'Task reopened.',tasks[idx].done?'success':'info');
}

async function deleteTask(id) {
  PL.data.tasks = (PL.data.tasks||[]).filter(t=>t.id!==id);
  await apiPost('/data/tasks',{value:PL.data.tasks});
  renderCal(); renderDayTasks(PL.selDate); renderAllTasks();
  showToast('Task removed.','info');
}

/* ════════════════════════════════════════════════════════════
   EXAMS
   ════════════════════════════════════════════════════════════ */
function renderExams() {
  const exams = (PL.data.exams||[])
    .filter(e => new Date(e.date) >= new Date())
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
  const el = document.getElementById('exam-list');
  if (!el) return;

  if (!exams.length) {
    el.innerHTML = emptyState('📅','No exams scheduled','Add one to start the countdown!');
    return;
  }

  el.innerHTML = exams.slice(0,5).map(e=>{
    const d  = daysUntil(e.date);
    const c  = d<=7 ? 'var(--red)' : d<=14 ? 'var(--orange)' : 'var(--green)';
    const ub = d<=7 ? 'badge-red'  : d<=14 ? 'badge-orange'  : 'badge-green';
    return `
      <div class="exam-cdown">
        <div>
          <div class="font-bold text-sm">${escHtml(e.subject)}</div>
          <div class="text-xs text-muted mt-1">${e.type} · ${formatDate(e.date)}</div>
          <div class="flex gap-2 mt-2">
            <span class="badge ${ub}" style="font-size:.64rem">${d<=7?'URGENT':d<=14?'SOON':'OK'}</span>
          </div>
        </div>
        <div style="text-align:center">
          <div class="exam-days-big" style="color:${c}">${d}</div>
          <div style="font-size:.62rem;color:var(--text-muted)">days</div>
        </div>
      </div>`;
  }).join('');
}

async function addExam() {
  const sub = document.getElementById('e-subject')?.value.trim();
  if (!sub) return showToast('Subject is required.','error');
  const date = document.getElementById('e-date')?.value;
  if (!date) return showToast('Select an exam date.','error');
  if (new Date(date)<new Date()) return showToast('Exam date must be in the future.','error');

  PL.data.exams = [...(PL.data.exams||[]), {
    id:genId(), subject:sub, date,
    type:document.getElementById('e-type')?.value||'Midterm',
    created:Date.now(),
  }];
  await apiPost('/data/exams',{value:PL.data.exams});
  closeModal('modal-add-exam');
  document.getElementById('e-subject').value='';
  renderExams(); renderCal();
  showToast(`${sub} exam added!`,'success');
}

async function deleteExam(id) {
  PL.data.exams = (PL.data.exams||[]).filter(e=>e.id!==id);
  await apiPost('/data/exams',{value:PL.data.exams});
  renderExams(); renderCal();
  showToast('Exam removed.','info');
}

/* ════════════════════════════════════════════════════════════
   DAILY GOAL
   ════════════════════════════════════════════════════════════ */
function renderGoal() {
  const s    = PL.data.settings || {};
  const goal = s.dailyGoal || 4;
  const gi   = document.getElementById('goal-input');
  if (gi) gi.value = goal;

  const sess  = (PL.data.sessions||[]).filter(x=>x.date===today());
  const mins  = sess.reduce((s,r)=>s+r.duration,0);
  const hrs   = Math.round(mins/60*10)/10;
  const pct   = Math.min(100, Math.round((hrs/goal)*100));
  const color = pct>=100?'var(--green)':pct>=60?'var(--purple)':'var(--orange)';

  const hEl = document.getElementById('goal-hrs-text');
  const bEl = document.getElementById('goal-bar');
  const pEl = document.getElementById('goal-pct-text');
  if (hEl) hEl.textContent = `${hrs}h / ${goal}h`;
  if (bEl) { bEl.style.width=pct+'%'; bEl.style.background=color; }
  if (pEl) pEl.textContent = pct>=100
    ? '🎉 Goal achieved! Excellent work!'
    : `${pct}% complete — ${Math.max(0,goal-hrs).toFixed(1)}h remaining`;
}

async function setGoal() {
  const val = parseFloat(document.getElementById('goal-input')?.value)||4;
  if (val<=0||val>24) return showToast('Enter a valid goal (0.5–24h).','error');
  const s = PL.data.settings||{};
  s.dailyGoal = val;
  PL.data.settings = s;
  await apiPost('/data/settings',{value:s});
  renderGoal();
  showToast(`Daily goal set to ${val}h! 🎯`,'success');
}