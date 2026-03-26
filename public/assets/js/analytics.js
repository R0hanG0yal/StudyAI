/* ============================================================
   STUDYAI — analytics.js  (Part 8)
   Real analytics from actual stored user data — NOT mock data.
   All charts and stats derived from focusSessions, quizzes,
   flashcards, notes, revisions stored in the user's account.
   ============================================================ */

let _charts = {};
let _period  = 7; // days
let _allData  = {};

async function initAnalytics() {
  showSkeletons();
  _allData = await getData();
  setPeriod(_period, document.querySelector('[data-days="7"]'));
}

function setPeriod(days, btn) {
  _period = days;
  document.querySelectorAll('[data-days]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAll();
}

function showSkeletons() {
  const el = document.getElementById('analytics-stats');
  if (el) el.innerHTML = Array(4).fill(`
    <div class="stat-card" style="animation:pulse 1.5s infinite">
      <div style="height:14px;background:rgba(255,255,255,.06);border-radius:6px;margin-bottom:10px;width:40%"></div>
      <div style="height:28px;background:rgba(255,255,255,.08);border-radius:6px;margin-bottom:6px;width:60%"></div>
      <div style="height:10px;background:rgba(255,255,255,.05);border-radius:6px;width:80%"></div>
    </div>`).join('');
}

function renderAll() {
  const data     = _allData;
  const sessions = data.focusSessions || [];
  const quizzes  = data.quizzes       || [];
  const notes    = data.notes         || [];
  const cards    = data.flashcards    || [];
  const events   = data.analytics     || [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - _period);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // Filter to period
  const periodSessions = sessions.filter(s => s.date >= cutoffStr);
  const periodQuizzes  = quizzes.filter(q  => q.created >= cutoff.getTime());
  const periodEvents   = events.filter(e   => e.date    >= cutoffStr);

  // ── Stat cards ──────────────────────────────────────────
  const totalMins  = periodSessions.reduce((a,s) => a + (s.duration||0), 0);
  const totalHrs   = (totalMins / 60).toFixed(1);
  const avgScore   = periodQuizzes.length
    ? Math.round(periodQuizzes.reduce((a,q) => a + (q.score||0), 0) / periodQuizzes.length)
    : 0;
  const daysStudied = [...new Set(periodSessions.map(s => s.date))].length;
  const cardsReviewed = cards.filter(c => c.reviews > 0).length;

  const statsEl = document.getElementById('analytics-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      ${_statCard('⏱️', totalHrs + 'h', 'Study Time', 'c1')}
      ${_statCard('🎯', avgScore + '%', 'Avg Quiz Score', 'c2')}
      ${_statCard('📅', daysStudied, 'Days Studied', 'c3')}
      ${_statCard('🃏', cardsReviewed, 'Cards Reviewed', 'c4')}`;
  }

  // ── Charts ───────────────────────────────────────────────
  _buildHoursChart(sessions, cutoffStr);
  _buildAccuracyChart(quizzes, cutoffStr);
  _buildSubjectsChart(periodSessions);
  _buildRevisionsChart(data.revisions || [], cutoffStr);
  _buildMasteryBars(quizzes);
  _buildInsights(data, periodSessions, periodQuizzes);
  _buildHeatmap(sessions);
}

// ── Stat card helper ──────────────────────────────────────
function _statCard(icon, val, label, cls) {
  return `<div class="stat-card ${cls}"><div class="stat-icon">${icon}</div><div class="stat-val">${val}</div><div class="stat-lbl">${label}</div></div>`;
}

// ── Hours per day chart ───────────────────────────────────
function _buildHoursChart(sessions, cutoffStr) {
  const ctx = document.getElementById('chart-hours');
  if (!ctx) return;
  if (_charts.hours) { _charts.hours.destroy(); }

  const labels = [], data = [];
  for (let i = _period - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    labels.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]);
    const mins = sessions.filter(s => s.date === ds).reduce((a,s) => a + (s.duration||0), 0);
    data.push(+(mins / 60).toFixed(2));
  }

  _charts.hours = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label:'Hours', data, backgroundColor:'rgba(102,126,234,.55)', borderColor:'#667eea', borderRadius:6, borderWidth:1 }] },
    options: _chartOpts('Study hours per day'),
  });
}

// ── Quiz accuracy trend ───────────────────────────────────
function _buildAccuracyChart(quizzes, cutoffStr) {
  const ctx = document.getElementById('chart-accuracy');
  if (!ctx) return;
  if (_charts.acc) { _charts.acc.destroy(); }

  const recent = quizzes
    .filter(q => q.created >= new Date(cutoffStr).getTime())
    .sort((a,b) => a.created - b.created)
    .slice(-20);

  if (!recent.length) {
    ctx.parentElement.innerHTML = '<div class="text-sm text-muted" style="padding:20px;text-align:center">No quiz data yet for this period.</div>';
    return;
  }

  _charts.acc = new Chart(ctx, {
    type: 'line',
    data: {
      labels: recent.map((_,i) => `Quiz ${i+1}`),
      datasets: [{
        label: 'Score %', data: recent.map(q => q.score || 0),
        borderColor: '#f093fb', backgroundColor: 'rgba(240,147,251,.1)',
        tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6,
      }],
    },
    options: { ..._chartOpts('Quiz accuracy trend'), scales: { y: { min: 0, max: 100, ..._yAxis() }, x: _xAxis() } },
  });
}

// ── Study time by subject ─────────────────────────────────
function _buildSubjectsChart(sessions) {
  const ctx = document.getElementById('chart-subjects');
  if (!ctx) return;
  if (_charts.subj) { _charts.subj.destroy(); }

  const bySubject = {};
  sessions.forEach(s => {
    const sub = s.subject || 'General';
    bySubject[sub] = (bySubject[sub] || 0) + (s.duration || 0);
  });

  const sorted = Object.entries(bySubject).sort((a,b) => b[1]-a[1]).slice(0,8);
  if (!sorted.length) {
    ctx.parentElement.innerHTML = '<div class="text-sm text-muted" style="padding:20px;text-align:center">No session data yet.</div>'; return;
  }

  const colors = ['#667eea','#f093fb','#4facfe','#43e97b','#fa709a','#fee140','#a18cd1','#fd7043'];

  _charts.subj = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(([s]) => s),
      datasets: [{ data: sorted.map(([,m]) => +(m/60).toFixed(1)), backgroundColor: colors, borderWidth: 2, borderColor: 'transparent' }],
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'rgba(200,200,255,.7)', font:{ size:11 } } } } },
  });
}

// ── Revision progress ─────────────────────────────────────
function _buildRevisionsChart(revisions, cutoffStr) {
  const ctx = document.getElementById('chart-revisions');
  if (!ctx) return;
  if (_charts.rev) { _charts.rev.destroy(); }

  const bySubject = {};
  revisions.forEach(r => {
    const sub = r.subject || 'General';
    if (!bySubject[sub]) bySubject[sub] = { done:0, pending:0 };
    if (r.done) bySubject[sub].done++;
    else bySubject[sub].pending++;
  });

  const labels = Object.keys(bySubject).slice(0,6);
  if (!labels.length) {
    ctx.parentElement.innerHTML = '<div class="text-sm text-muted" style="padding:20px;text-align:center">No revision data yet.</div>'; return;
  }

  _charts.rev = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Done',    data: labels.map(s => bySubject[s].done),    backgroundColor:'rgba(67,233,123,.6)',  borderRadius:4 },
        { label:'Pending', data: labels.map(s => bySubject[s].pending), backgroundColor:'rgba(245,87,108,.5)',  borderRadius:4 },
      ],
    },
    options: { ..._chartOpts('Revision by subject'), scales: { x: { stacked:true, ..._xAxis() }, y: { stacked:true, ..._yAxis() } } },
  });
}

// ── Topic mastery bars ────────────────────────────────────
function _buildMasteryBars(quizzes) {
  const el = document.getElementById('mastery-bars');
  if (!el) return;

  const bySubject = {};
  quizzes.forEach(q => {
    const s = q.subject || 'General';
    if (!bySubject[s]) bySubject[s] = [];
    bySubject[s].push(q.score || 0);
  });

  const entries = Object.entries(bySubject)
    .map(([s, scores]) => ({ subject:s, avg: Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) }))
    .sort((a,b) => b.avg - a.avg)
    .slice(0, 8);

  if (!entries.length) { el.innerHTML = '<div class="text-sm text-muted">Take some quizzes to see mastery data.</div>'; return; }

  el.innerHTML = entries.map(e => {
    const color = e.avg >= 85 ? 'var(--green)' : e.avg >= 70 ? 'var(--purple)' : e.avg >= 50 ? 'var(--orange)' : 'var(--red)';
    const status = e.avg >= 85 ? 'Excellent' : e.avg >= 70 ? 'Good' : e.avg >= 50 ? 'Improving' : 'Needs Work';
    return `
      <div class="mastery-subject">
        <span class="mastery-name">${e.subject}</span>
        <div class="mastery-bar"><div class="mastery-fill" style="width:${e.avg}%;background:${color}"></div></div>
        <span class="mastery-pct">${e.avg}%</span>
        <span class="mastery-status" style="color:${color}">${status}</span>
      </div>`;
  }).join('');
}

// ── AI Insights (derived from real data) ─────────────────
function _buildInsights(data, sessions, quizzes) {
  const el = document.getElementById('ai-insights');
  if (!el) return;

  const insights = [];
  const totalMins = sessions.reduce((a,s) => a+(s.duration||0), 0);

  // Best study day
  const byDay = {};
  sessions.forEach(s => {
    const d = new Date(s.date).getDay();
    byDay[d] = (byDay[d]||0) + (s.duration||0);
  });
  const bestDay = Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
  if (bestDay) {
    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][bestDay[0]];
    insights.push({ icon:'📅', bg:'rgba(102,126,234,.12)', col:'var(--purple)', text:`Your most productive day is <strong>${dayName}</strong> — try to schedule harder topics then.` });
  }

  // Weak subjects
  const subScores = {};
  quizzes.forEach(q => { const s=q.subject||'General'; if(!subScores[s])subScores[s]=[]; subScores[s].push(q.score||0); });
  const weak = Object.entries(subScores).map(([s,sc])=>({s,avg:Math.round(sc.reduce((a,b)=>a+b,0)/sc.length)})).filter(x=>x.avg<60).sort((a,b)=>a.avg-b.avg)[0];
  if (weak) insights.push({ icon:'⚠️', bg:'rgba(245,158,11,.12)', col:'var(--orange)', text:`<strong>${weak.s}</strong> needs attention (avg ${weak.avg}%). Schedule extra revision sessions.` });

  // Study consistency
  const uniqueDays = [...new Set(sessions.map(s=>s.date))].length;
  if (uniqueDays < 3 && _period >= 7) insights.push({ icon:'🔥', bg:'rgba(239,68,68,.1)', col:'var(--red)', text:`You studied on only <strong>${uniqueDays} day(s)</strong> this period. Consistency beats intensity — try daily 30-min sessions.` });
  else if (uniqueDays >= 5) insights.push({ icon:'🌟', bg:'rgba(67,233,123,.1)', col:'var(--green)', text:`Great consistency! You've studied on <strong>${uniqueDays} days</strong> this period. Keep it up!` });

  // Note count
  const notes = data.notes || [];
  if (notes.length < 3) insights.push({ icon:'📝', bg:'rgba(79,172,254,.1)', col:'var(--cyan)', text:`You have <strong>${notes.length} note(s)</strong>. Add more study material to unlock AI quizzes and flashcards.` });

  // Average session length
  if (sessions.length > 0) {
    const avgMins = Math.round(totalMins / sessions.length);
    if (avgMins < 20) insights.push({ icon:'⏱️', bg:'rgba(102,126,234,.1)', col:'var(--purple)', text:`Your average session is <strong>${avgMins} minutes</strong>. Try the Pomodoro method — 25-min focused blocks work best.` });
    else insights.push({ icon:'💪', bg:'rgba(67,233,123,.1)', col:'var(--green)', text:`Average session length: <strong>${avgMins} minutes</strong>. Solid focus blocks!` });
  }

  if (!insights.length) { el.innerHTML = '<div class="text-sm text-muted">Keep studying to generate personalised insights.</div>'; return; }

  el.innerHTML = insights.slice(0,4).map(i => `
    <div class="insight-card" style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:9px">
      <div class="insight-icon" style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;background:${i.bg};color:${i.col}">${i.icon}</div>
      <div class="text-sm text-dim" style="line-height:1.6">${i.text}</div>
    </div>`).join('');
}

// ── Study heatmap ─────────────────────────────────────────
function _buildHeatmap(sessions) {
  const el = document.getElementById('study-heatmap');
  if (!el) return;

  // Build 28-day grid
  const byDate = {};
  sessions.forEach(s => { byDate[s.date] = (byDate[s.date]||0) + (s.duration||0); });
  const maxMins = Math.max(...Object.values(byDate), 1);

  el.innerHTML = '';
  for (let i = 27; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const mins = byDate[ds] || 0;
    const intensity = mins / maxMins;
    const cell = document.createElement('div');
    cell.className = 'hmap-cell';
    cell.title = `${ds}: ${Math.round(mins)}min`;
    if (mins > 0) {
      cell.style.background = `rgba(102,126,234,${0.15 + intensity * 0.7})`;
    }
    el.appendChild(cell);
  }

  // Day labels
  const labEl = document.getElementById('heatmap-labels');
  if (labEl) {
    const days = ['4w ago','3w ago','2w ago','Last week','This week'];
    labEl.innerHTML = days.map(d => `<span class="text-xs text-muted">${d}</span>`).join('');
  }
}

// ── Chart option helpers ──────────────────────────────────
function _chartOpts(label) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend:{ display:false }, tooltip:{ backgroundColor:'rgba(10,12,26,.9)', titleColor:'#e8eaf6', bodyColor:'rgba(200,200,255,.8)', borderColor:'rgba(102,126,234,.2)', borderWidth:1 } },
    scales: { y: _yAxis(), x: _xAxis() },
  };
}
function _yAxis() {
  return { beginAtZero:true, grid:{ color:'rgba(100,110,160,.08)' }, ticks:{ color:'rgba(200,200,255,.5)', font:{ size:11 } } };
}
function _xAxis() {
  return { grid:{ display:false }, ticks:{ color:'rgba(200,200,255,.5)', font:{ size:11 } } };
}