/* ============================================================
   STUDYAI — ACHIEVEMENTS
   File: public/assets/js/achievements.js
   ============================================================ */
'use strict';

const ACH_DEFS = [
  {id:'a1',  icon:'🚀', name:'First Launch',    desc:'Opened StudyAI.',             xp:10,  cat:'Getting Started', cond:d=>true},
  {id:'a2',  icon:'📝', name:'Note Taker',      desc:'Created your first note.',     xp:20,  cat:'Getting Started', cond:d=>(d.notes||[]).length>=1},
  {id:'a3',  icon:'🎯', name:'Quiz Starter',    desc:'Completed your first quiz.',   xp:30,  cat:'Quizzes',         cond:d=>(d.quizResults||[]).length>=1},
  {id:'a4',  icon:'🃏', name:'Card Collector',  desc:'Generated 5+ flashcards.',     xp:25,  cat:'Flashcards',      cond:d=>(d.flashcards||[]).length>=5},
  {id:'a5',  icon:'🔥', name:'On Fire',         desc:'Maintained 7-day streak.',     xp:50,  cat:'Streaks',         cond:d=>(d.streak||{current:0}).current>=7},
  {id:'a6',  icon:'📄', name:'Summarizer',      desc:'Generated first AI summary.',  xp:25,  cat:'AI Tools',        cond:d=>(d.summaries||[]).length>=1},
  {id:'a7',  icon:'⚡', name:'Focus Master',    desc:'Completed a Pomodoro.',        xp:35,  cat:'Focus',           cond:d=>(d.sessions||[]).some(s=>s.type==='focus'&&s.duration>=25)},
  {id:'a8',  icon:'📅', name:'Planner Pro',     desc:'Added 5+ tasks.',              xp:30,  cat:'Planning',        cond:d=>(d.tasks||[]).length>=5},
  {id:'a9',  icon:'🏆', name:'Quiz Champion',   desc:'Scored 90%+ on any quiz.',     xp:75,  cat:'Quizzes',         cond:d=>(d.quizResults||[]).some(r=>r.pct>=90)},
  {id:'a10', icon:'📚', name:'Bookworm',        desc:'Created 10 study notes.',      xp:60,  cat:'Notes',           cond:d=>(d.notes||[]).length>=10},
  {id:'a11', icon:'🔄', name:'Reviser',         desc:'Completed 10 revisions.',      xp:70,  cat:'Revision',        cond:d=>(d.revisions||[]).filter(r=>r.done).length>=10},
  {id:'a12', icon:'🌙', name:'Night Owl',       desc:'Used One-Night Mode.',         xp:50,  cat:'AI Tools',        cond:d=>false},
  {id:'a13', icon:'🔥', name:'Inferno',         desc:'30-day study streak.',         xp:150, cat:'Streaks',         cond:d=>(d.streak||{current:0}).current>=30},
  {id:'a14', icon:'👥', name:'Team Player',     desc:'Created a study group.',       xp:40,  cat:'Social',          cond:d=>(d.groups||[]).length>=1},
  {id:'a15', icon:'💯', name:'Perfect Score',   desc:'Got 100% on a quiz.',          xp:100, cat:'Quizzes',         cond:d=>(d.quizResults||[]).some(r=>r.pct===100)},
  {id:'a16', icon:'🧠', name:'Know-It-All',    desc:'Studied all 6 subjects.',      xp:120, cat:'Special',         cond:d=>{const s=new Set((d.notes||[]).map(n=>n.folder));return ['OS','DBMS','DSA','CN','AI','Math'].every(x=>s.has(x));}},
  {id:'a17', icon:'⏱️', name:'Century Club',    desc:'100+ hours of study time.',    xp:200, cat:'Special',         cond:d=>(d.sessions||[]).reduce((s,x)=>s+x.duration,0)>=6000},
  {id:'a18', icon:'🌟', name:'All-Rounder',     desc:'Used 8+ different features.',  xp:80,  cat:'Special',         cond:d=>{const has=[...((d.notes||[]).length>0?['notes']:[]),...((d.quizResults||[]).length>0?['quiz']:[]),...((d.flashcards||[]).length>0?['fc']:[]),...((d.summaries||[]).length>0?['sum']:[]),...((d.sessions||[]).length>0?['sess']:[]),...((d.revisions||[]).length>0?['rev']:[]),...((d.tasks||[]).length>0?['task']:[]),...((d.groups||[]).length>0?['group']:[])];return has.length>=6;}},
];

const LEVELS = [
  {level:1, name:'Beginner',     min:0,    emoji:'🌱'},
  {level:2, name:'Learner',      min:50,   emoji:'📖'},
  {level:3, name:'Student',      min:150,  emoji:'🎓'},
  {level:4, name:'Scholar',      min:300,  emoji:'⭐'},
  {level:5, name:'Expert',       min:500,  emoji:'🔥'},
  {level:6, name:'Master',       min:750,  emoji:'🏆'},
  {level:7, name:'Legend',       min:1000, emoji:'👑'},
];

async function initAchievements() {
  const data = await apiGet('/data').catch(() => ({}));
  await _checkAndUnlock(data);
  _renderStats(data);
  _renderXPBar(data);
  _renderGrid(data);
}

async function _checkAndUnlock(data) {
  const stored = data.achievements || [];
  let changed  = false;
  const newlyUnlocked = [];

  ACH_DEFS.forEach(def => {
    const existing = stored.find(a=>a.id===def.id);
    if (existing?.unlocked) return;
    try {
      if (def.cond(data)) {
        const idx = stored.findIndex(a=>a.id===def.id);
        if (idx>=0) { stored[idx].unlocked=true; stored[idx].unlockedAt=Date.now(); }
        else stored.push({id:def.id, unlocked:true, unlockedAt:Date.now()});
        newlyUnlocked.push(def);
        changed = true;
      }
    } catch(_) {}
  });

  if (changed) {
    await apiPost('/data/achievements',{value:stored});
    newlyUnlocked.forEach(def => {
      setTimeout(() => {
        showToast(`🏆 Achievement: <strong>${def.name}</strong> +${def.xp} XP`,'success',5000);
        burstConfetti();
      }, 500);
    });
  }
}

function _getUnlocked(data) {
  const stored = data.achievements || [];
  return ACH_DEFS.map(def=>{
    const s = stored.find(a=>a.id===def.id);
    return {...def, unlocked:s?.unlocked||false, unlockedAt:s?.unlockedAt||null};
  });
}

function _calcXP(all) {
  return all.filter(a=>a.unlocked).reduce((s,a)=>s+(a.xp||0),0);
}

function _getLevel(xp) {
  let cur=LEVELS[0], nxt=LEVELS[1];
  LEVELS.forEach((l,i)=>{ if(xp>=l.min){cur=l; nxt=LEVELS[i+1]||null;} });
  const pct = nxt ? Math.round(((xp-cur.min)/(nxt.min-cur.min))*100) : 100;
  return {cur,nxt,pct,xp};
}

function _renderStats(data) {
  const all      = _getUnlocked(data);
  const unlocked = all.filter(a=>a.unlocked);
  const xp       = _calcXP(all);
  const streak   = data.streak||{current:0,longest:0};
  const qr       = data.quizResults||[];
  const avgScore = qr.length ? Math.round(qr.reduce((s,r)=>s+r.pct,0)/qr.length) : 0;
  const el       = document.getElementById('ach-stats');
  if (!el) return;

  el.innerHTML = [
    {icon:'🏆',cls:'orange',val:`${unlocked.length}/${all.length}`,label:'Badges Earned',  chg:`${all.length-unlocked.length} remaining`},
    {icon:'⭐',cls:'purple',val:xp+' XP',                          label:'Total Experience',chg:`${Math.round((unlocked.length/all.length)*100)}% complete`},
    {icon:'🔥',cls:'pink',  val:streak.current+'d',                label:'Streak',          chg:`Best: ${streak.longest}d`},
    {icon:'🎯',cls:'blue',  val:avgScore+'%',                      label:'Quiz Average',    chg:`${qr.length} quizzes`},
  ].map(s=>`
    <div class="stat-card ${s.cls}">
      <div class="stat-icon ${s.cls}">${s.icon}</div>
      <div class="stat-value">${s.val}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-change up">↑ ${s.chg}</div>
    </div>`).join('');
}

function _renderXPBar(data) {
  const all   = _getUnlocked(data);
  const xp    = _calcXP(all);
  const lvl   = _getLevel(xp);
  const badge = document.getElementById('level-badge');
  const xpTxt = document.getElementById('xp-text');
  const xpNxt = document.getElementById('xp-next-text');
  const bar   = document.getElementById('xp-bar');
  const desc  = document.getElementById('xp-level-desc');

  if (badge) { badge.textContent = `${lvl.cur.emoji} ${lvl.cur.name}`; }
  if (xpTxt) xpTxt.textContent = xp+' XP';
  if (xpNxt) xpNxt.textContent = lvl.nxt ? `Next: ${lvl.nxt.name} at ${lvl.nxt.min} XP` : '🎉 Max level reached!';
  if (bar)   bar.style.width   = lvl.pct+'%';
  if (desc)  desc.textContent  = lvl.nxt
    ? `${lvl.nxt.min - xp} XP to reach ${lvl.nxt.name}`
    : 'You have reached the highest level — Legend! 👑';
}

function _renderGrid(data) {
  const all = _getUnlocked(data);
  const el  = document.getElementById('ach-grid');
  if (!el) return;
  el.style.display = 'grid';
  el.innerHTML = '';

  const cats = [...new Set(ACH_DEFS.map(d=>d.cat))];
  cats.forEach(cat => {
    const items = all.filter(a=>a.cat===cat);
    if (!items.length) return;

    const hdr = document.createElement('div');
    hdr.className = 'cat-header';
    hdr.innerHTML = `
      <span class="cat-label">${cat}</span>
      <div class="cat-line"></div>
      <span class="text-xs text-muted">${items.filter(a=>a.unlocked).length}/${items.length}</span>`;
    el.appendChild(hdr);

    items.forEach(a => {
      const card = document.createElement('div');
      card.className = `ach-card ${a.unlocked?'unlocked':'locked'}`;
      card.onclick   = () => _showDetail(a);
      card.innerHTML = `
        <span class="ach-icon">${a.icon}</span>
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
        <div class="flex items-center jcenter mt-3">
          <span class="badge ${a.unlocked?'badge-green':'badge-purple'}">${a.unlocked?'✓ Earned':a.xp+' XP'}</span>
          ${a.unlocked&&a.unlockedAt?`<span class="text-xs text-muted" style="margin-left:8px">${timeAgo(a.unlockedAt)}</span>`:''}
        </div>`;
      el.appendChild(card);
    });
  });
}

function _showDetail(a) {
  const status = a.unlocked
    ? `Earned ${a.unlockedAt?timeAgo(a.unlockedAt):''} · +${a.xp} XP`
    : `Locked — earn ${a.xp} XP by completing the condition.`;
  showToast(`${a.icon} ${a.name} — ${a.desc}<br><span style="opacity:.7;font-size:.74rem">${status}</span>`, a.unlocked?'success':'info', 4500);
}