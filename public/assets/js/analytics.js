/* ============================================================
   STUDYAI — ANALYTICS
   File: public/assets/js/analytics.js
   ============================================================ */
'use strict';

const AN = { data:{}, days:7, charts:{} };

const CC = {
  purple : 'rgba(102,126,234,.75)',
  pink   : 'rgba(240,147,251,.75)',
  cyan   : 'rgba(79,172,254,.75)',
  green  : 'rgba(67,233,123,.75)',
  orange : 'rgba(250,130,49,.75)',
  red    : 'rgba(245,87,108,.75)',
  yellow : 'rgba(254,225,64,.75)',
  grid   : 'rgba(255,255,255,.05)',
  tick   : 'rgba(255,255,255,.3)',
};

const SUBJ_COLORS = [CC.purple,CC.cyan,CC.green,CC.orange,CC.pink,CC.yellow];

/* ── ENTRY ── */
async function initAnalytics() {
  AN.data = await apiGet('/data').catch(() => ({}));
  renderAnalytics();
}

function setPeriod(days, btn) {
  AN.days = days;
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  // Destroy old charts
  Object.values(AN.charts).forEach(c=>{ try{c.destroy();}catch(_){} });
  AN.charts = {};
  renderAnalytics();
}

/* ── MAIN RENDER ── */
function renderAnalytics() {
  const cutoff  = Date.now() - AN.days * 86400000;
  const sess    = (AN.data.sessions||[]).filter(s=>s.created>=cutoff);
  const qr      = (AN.data.quizResults||[]).filter(r=>r.timestamp>=cutoff);
  const revDone = (AN.data.revisions||[]).filter(r=>r.done&&(r.completedAt||0)>=cutoff);
  const streak  = AN.data.streak || {current:0,longest:0};

  _renderStats(sess, qr, revDone, streak);
  _renderHoursChart(sess);
  _renderAccuracyChart(qr);
  _renderSubjectsChart(sess);
  _renderRevisionChart();
  _renderMastery(qr);
  _renderInsights(sess, qr, revDone, streak);
  _renderHeatmap();
}

/* ════════════════════════════════════════════════════════════
   STAT CARDS
   ════════════════════════════════════════════════════════════ */
function _renderStats(sess, qr, revDone, streak) {
  const totalMins = sess.reduce((s,r)=>s+r.duration,0);
  const av        = qr.length ? Math.round(qr.reduce((s,r)=>s+r.pct,0)/qr.length) : 0;
  const el        = document.getElementById('analytics-stats');
  if (!el) return;

  el.innerHTML = [
    {icon:'⏱️',cls:'purple',val:fmtMins(totalMins),label:`Study Time (${AN.days}d)`,    chg:`${sess.length} sessions`},
    {icon:'🎯',cls:'blue',  val:av+'%',            label:'Quiz Average',                 chg:`${qr.length} quizzes`},
    {icon:'🔥',cls:'orange',val:streak.current+'d',label:'Current Streak',               chg:`Best: ${streak.longest}d`},
    {icon:'🔄',cls:'green', val:revDone.length,    label:'Revisions Done',               chg:`This period`},
    {icon:'📝',cls:'pink',  val:(AN.data.notes||[]).length, label:'Total Notes',         chg:'All subjects'},
  ].map(s=>`
    <div class="stat-card ${s.cls}">
      <div class="stat-icon ${s.cls}">${s.icon}</div>
      <div class="stat-value">${s.val}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-change up">↑ ${s.chg}</div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   CHART HELPERS
   ════════════════════════════════════════════════════════════ */
function _destroy(key) {
  if (AN.charts[key]) { try{AN.charts[key].destroy();}catch(_){} delete AN.charts[key]; }
}

function _baseOpts(yLabel='') {
  return {
    responsive:true, maintainAspectRatio:true,
    plugins:{
      legend:{display:false},
      tooltip:{
        backgroundColor:'rgba(10,12,26,.95)',
        titleColor:'#f0f2ff', bodyColor:'#9ca3c0',
        borderColor:'rgba(102,126,234,.25)', borderWidth:1, padding:10,
      },
    },
    scales:{
      y:{ beginAtZero:true, grid:{color:CC.grid}, ticks:{color:CC.tick, font:{size:10}, callback:yLabel?v=>v+yLabel:undefined} },
      x:{ grid:{display:false}, ticks:{color:CC.tick, font:{size:10}} },
    },
  };
}

function _noDataMsg(canvas, msg='No data for this period') {
  const ctx = canvas.getContext('2d');
  canvas.style.height = '140px';
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle    = 'rgba(255,255,255,.18)';
  ctx.font         = '13px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, canvas.width/2, 70);
}

/* ════════════════════════════════════════════════════════════
   CHART 1 — Study Hours
   ════════════════════════════════════════════════════════════ */
function _renderHoursChart(sess) {
  const cv = document.getElementById('chart-hours');
  if (!cv) return;
  _destroy('hours');

  const n    = Math.min(AN.days, 14);
  const data = Array.from({length:n},(_,i)=>{
    const d  = new Date(); d.setDate(d.getDate()-(n-1-i));
    const ds = dateStr(d);
    const m  = sess.filter(s=>s.date===ds).reduce((s,x)=>s+x.duration,0);
    return { label:d.toLocaleDateString('en',{weekday:'short'}), hours:Math.round(m/60*10)/10 };
  });

  if (data.every(d=>d.hours===0)) { _noDataMsg(cv,'No study sessions in this period'); return; }

  AN.charts.hours = new Chart(cv,{
    type:'bar',
    data:{
      labels:data.map(d=>d.label),
      datasets:[{
        data:data.map(d=>d.hours),
        backgroundColor:data.map(d=>d.hours>0?CC.purple:'rgba(255,255,255,.04)'),
        borderColor:'rgba(102,126,234,.9)',
        borderWidth:1, borderRadius:6, borderSkipped:false,
      }],
    },
    options:{
      ..._baseOpts('h'),
      plugins:{..._baseOpts().plugins, tooltip:{..._baseOpts().plugins.tooltip, callbacks:{label:c=>c.raw+'h studied'}}},
    },
  });
}

/* ════════════════════════════════════════════════════════════
   CHART 2 — Quiz Accuracy Trend
   ════════════════════════════════════════════════════════════ */
function _renderAccuracyChart(qr) {
  const cv = document.getElementById('chart-accuracy');
  if (!cv) return;
  _destroy('acc');

  const sorted = [...qr].sort((a,b)=>a.timestamp-b.timestamp);
  if (!sorted.length) { _noDataMsg(cv,'No quiz data for this period'); return; }

  AN.charts.acc = new Chart(cv,{
    type:'line',
    data:{
      labels:sorted.map(r=>new Date(r.timestamp).toLocaleDateString('en',{month:'short',day:'numeric'})),
      datasets:[{
        data:sorted.map(r=>r.pct),
        borderColor:'rgba(67,233,123,.9)',
        backgroundColor:'rgba(67,233,123,.07)',
        pointBackgroundColor:'rgba(67,233,123,1)',
        pointBorderColor:'#fff', pointRadius:4, pointHoverRadius:6,
        tension:0.35, fill:true, borderWidth:2,
      }],
    },
    options:{
      ..._baseOpts('%'),
      scales:{
        ..._baseOpts('%').scales,
        y:{..._baseOpts('%').scales.y, min:0, max:100},
      },
      plugins:{..._baseOpts().plugins, tooltip:{..._baseOpts().plugins.tooltip, callbacks:{
        label:c=>`Score: ${c.raw}%`,
        afterLabel:(c)=>{ const r=sorted[c.dataIndex]; return r?`${r.title} · ${r.score}/${r.total}`:''; },
      }}},
    },
  });
}

/* ════════════════════════════════════════════════════════════
   CHART 3 — Subject Distribution (Doughnut)
   ════════════════════════════════════════════════════════════ */
function _renderSubjectsChart(sess) {
  const cv = document.getElementById('chart-subjects');
  if (!cv) return;
  _destroy('subj');

  if (!sess.length) { _noDataMsg(cv,'No sessions in this period'); return; }

  const map = {};
  sess.forEach(s=>{ map[s.subject]=(map[s.subject]||0)+s.duration; });
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const labels = sorted.map(([s])=>s);
  const values = sorted.map(([,m])=>Math.round(m/60*10)/10);

  AN.charts.subj = new Chart(cv,{
    type:'doughnut',
    data:{
      labels,
      datasets:[{
        data:values,
        backgroundColor:SUBJ_COLORS.slice(0,labels.length),
        borderColor:'rgba(13,15,26,.8)',
        borderWidth:3, hoverOffset:6,
      }],
    },
    options:{
      responsive:true, cutout:'65%',
      plugins:{
        legend:{
          display:true, position:'bottom',
          labels:{color:CC.tick, font:{size:10}, padding:10, boxWidth:11, boxHeight:11},
        },
        tooltip:{
          backgroundColor:'rgba(10,12,26,.95)',
          titleColor:'#f0f2ff', bodyColor:'#9ca3c0',
          callbacks:{label:c=>` ${c.label}: ${c.raw}h`},
        },
      },
    },
  });
}

/* ════════════════════════════════════════════════════════════
   CHART 4 — Revision Progress (Horizontal stacked bar)
   ════════════════════════════════════════════════════════════ */
function _renderRevisionChart() {
  const cv = document.getElementById('chart-revisions');
  if (!cv) return;
  _destroy('rev');

  const all = AN.data.revisions || [];
  if (!all.length) { _noDataMsg(cv,'No revisions scheduled yet'); return; }

  const map = {};
  all.forEach(r=>{ const s=r.subject||'General'; if(!map[s]) map[s]={done:0,pending:0}; r.done?map[s].done++:map[s].pending++; });
  const labels  = Object.keys(map);
  const done    = labels.map(s=>map[s].done);
  const pending = labels.map(s=>map[s].pending);

  AN.charts.rev = new Chart(cv,{
    type:'bar',
    data:{
      labels,
      datasets:[
        {label:'Completed', data:done,    backgroundColor:CC.green,  borderRadius:4, borderSkipped:false},
        {label:'Pending',   data:pending, backgroundColor:'rgba(250,130,49,.55)', borderRadius:4, borderSkipped:false},
      ],
    },
    options:{
      indexAxis:'y', responsive:true,
      plugins:{
        legend:{display:true, position:'bottom', labels:{color:CC.tick, font:{size:10}, boxWidth:11, padding:10}},
        tooltip:{backgroundColor:'rgba(10,12,26,.95)', titleColor:'#f0f2ff', bodyColor:'#9ca3c0'},
      },
      scales:{
        x:{stacked:true, grid:{color:CC.grid}, ticks:{color:CC.tick, font:{size:10}, stepSize:1}, beginAtZero:true},
        y:{stacked:true, grid:{display:false}, ticks:{color:CC.tick, font:{size:10}}},
      },
    },
  });
}

/* ════════════════════════════════════════════════════════════
   MASTERY BARS
   ════════════════════════════════════════════════════════════ */
function _renderMastery(qr) {
  const el = document.getElementById('mastery-bars');
  if (!el) return;

  const subjects = ['OS','DBMS','DSA','CN','AI','Math'];
  const map      = {};
  (AN.data.quizResults||[]).forEach(r=>{
    const s=r.subject||'General';
    if(!map[s]) map[s]={c:0,t:0};
    map[s].c+=r.score; map[s].t+=r.total;
  });

  el.innerHTML = subjects.map(sub=>{
    const d = map[sub];
    if (!d) return `
      <div class="mastery-subject">
        <span class="mastery-name">${sub}</span>
        <div class="mastery-bar"><div class="mastery-fill" style="width:0%"></div></div>
        <span class="mastery-pct">—</span>
        <span class="mastery-status text-muted">No data</span>
      </div>`;

    const pct    = Math.round((d.c/d.t)*100);
    const color  = pct<50?'var(--red)':pct<70?'var(--orange)':pct<85?'var(--purple)':'var(--green)';
    const status = pct<50?'Needs Work':pct<70?'Improving':pct<85?'Good':'Excellent';
    return `
      <div class="mastery-subject">
        <span class="mastery-name font-bold text-sm">${sub}</span>
        <div class="mastery-bar">
          <div class="mastery-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="mastery-pct">${pct}%</span>
        <span class="mastery-status" style="color:${color}">${status}</span>
      </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════
   AI INSIGHTS
   ════════════════════════════════════════════════════════════ */
function _renderInsights(sess, qr, revDone, streak) {
  const el = document.getElementById('ai-insights');
  if (!el) return;

  const insights = [];
  const totalMins= sess.reduce((s,r)=>s+r.duration,0);
  const avgScore = qr.length ? Math.round(qr.reduce((s,r)=>s+r.pct,0)/qr.length) : 0;

  // Streak insight
  if (streak.current >= 7)
    insights.push({icon:'🔥',color:'rgba(250,130,49,.15)',c:'var(--orange)',title:'Impressive streak!',body:`${streak.current} days in a row. Keep the momentum going!`});
  else if (streak.current === 0)
    insights.push({icon:'⚠️',color:'rgba(245,87,108,.1)',c:'var(--red)',title:'Streak broken',body:'Study a little today to restart your streak!'});

  // Study time insight
  const avgDaily = totalMins / AN.days;
  if (avgDaily >= 60)
    insights.push({icon:'⏱️',color:'rgba(102,126,234,.12)',c:'var(--purple)',title:'Solid study time',body:`Averaging ${Math.round(avgDaily)}min/day. Consistent effort pays off!`});
  else
    insights.push({icon:'💡',color:'rgba(79,172,254,.1)',c:'var(--cyan)',title:'Increase study time',body:`Aim for 60+ min/day. Even short sessions make a big difference.`});

  // Quiz insight
  if (avgScore >= 80)
    insights.push({icon:'🏆',color:'rgba(67,233,123,.1)',c:'var(--green)',title:'Quiz performance',body:`${avgScore}% average — excellent! Try harder difficulty to challenge yourself.`});
  else if (avgScore > 0)
    insights.push({icon:'📚',color:'rgba(250,130,49,.1)',c:'var(--orange)',title:'Quiz score',body:`${avgScore}% average. Review explanations for wrong answers to improve.`});

  // Revision insight
  const dueRevs = (AN.data.revisions||[]).filter(r=>!r.done&&r.date<=today());
  if (dueRevs.length)
    insights.push({icon:'🔄',color:'rgba(240,147,251,.1)',c:'var(--pink)',title:`${dueRevs.length} revision${dueRevs.length>1?'s':''} overdue`,body:'Head to Revision Center to catch up on your schedule.'});

  // Default encouragement
  if (!insights.length)
    insights.push({icon:'🌟',color:'rgba(102,126,234,.1)',c:'var(--purple)',title:'Keep it up!',body:'You are on track. Consistency is the key to exam success.'});

  el.innerHTML = insights.map(i=>`
    <div class="insight-card">
      <div class="insight-icon" style="background:${i.color}">
        <span style="color:${i.c}">${i.icon}</span>
      </div>
      <div>
        <div class="font-bold text-sm mb-1" style="color:${i.c}">${i.title}</div>
        <div class="text-xs text-dim" style="line-height:1.55">${i.body}</div>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   STUDY HEATMAP (Last 28 days)
   ════════════════════════════════════════════════════════════ */
function _renderHeatmap() {
  const el = document.getElementById('study-heatmap');
  if (!el) return;

  const n    = 28;
  const sess = AN.data.sessions || [];
  const days = Array.from({length:n},(_,i)=>{
    const d  = new Date(); d.setDate(d.getDate()-(n-1-i));
    const ds = dateStr(d);
    const m  = sess.filter(s=>s.date===ds).reduce((s,x)=>s+x.duration,0);
    return { ds, label:d.toLocaleDateString('en',{weekday:'short', month:'short', day:'numeric'}), mins:m };
  });

  const maxMins = Math.max(...days.map(d=>d.mins), 60);

  el.innerHTML = days.map(d=>{
    const intensity = d.mins/maxMins;
    const bg = d.mins===0
      ? 'rgba(255,255,255,.04)'
      : `rgba(102,126,234,${0.15 + intensity*0.75})`;
    const tip = `${d.label}: ${d.mins?fmtMins(d.mins):'No study'}`;
    return `<div class="hmap-cell" style="background:${bg}" title="${tip}"></div>`;
  }).join('');

  // Weekday labels
  const lblEl = document.getElementById('heatmap-labels');
  if (lblEl) {
    const weeks = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    lblEl.innerHTML = weeks.map(w=>`<span class="text-xs text-muted" style="flex:1;text-align:center">${w}</span>`).join('');
    lblEl.style.display = 'grid';
    lblEl.style.gridTemplateColumns = 'repeat(7,1fr)';
    lblEl.style.gap = '3px';
  }
}