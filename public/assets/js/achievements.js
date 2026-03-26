/* ============================================================
   STUDYAI — achievements.js  (Part 7)
   Full achievements engine:
   - 30 real achievements with actual trigger conditions
   - XP system with 10 levels
   - Pop-up notifications when unlocked
   - Persistent storage in user data
   ============================================================ */

// ── Achievement definitions ───────────────────────────────
const ACHIEVEMENTS_DEF = [
  // Notes
  { id:'note_first',   cat:'Notes',    icon:'📝', name:'First Note',        desc:'Create your first note',              xp:10,  cond: d => (d.notes||[]).length >= 1 },
  { id:'note_5',       cat:'Notes',    icon:'📚', name:'Note Taker',        desc:'Create 5 notes',                      xp:20,  cond: d => (d.notes||[]).length >= 5 },
  { id:'note_20',      cat:'Notes',    icon:'🗒️', name:'Prolific Writer',   desc:'Create 20 notes',                     xp:50,  cond: d => (d.notes||[]).length >= 20 },
  { id:'note_50',      cat:'Notes',    icon:'📖', name:'Knowledge Base',    desc:'Create 50 notes',                     xp:100, cond: d => (d.notes||[]).length >= 50 },

  // Quizzes
  { id:'quiz_first',   cat:'Quizzes',  icon:'🎯', name:'First Quiz',        desc:'Complete your first quiz',            xp:15,  cond: d => (d.quizzes||[]).length >= 1 },
  { id:'quiz_10',      cat:'Quizzes',  icon:'🏹', name:'Quiz Enthusiast',   desc:'Complete 10 quizzes',                 xp:40,  cond: d => (d.quizzes||[]).length >= 10 },
  { id:'quiz_perfect', cat:'Quizzes',  icon:'💯', name:'Perfect Score',     desc:'Score 100% on a quiz',                xp:80,  cond: d => (d.quizzes||[]).some(q => (q.score||0) === 100) },
  { id:'quiz_avg80',   cat:'Quizzes',  icon:'🌟', name:'High Achiever',     desc:'Maintain 80%+ average across 5 quizzes', xp:60, cond: d => { const q=(d.quizzes||[]).slice(-5); return q.length>=5 && q.reduce((a,x)=>a+(x.score||0),0)/q.length >= 80; } },
  { id:'quiz_hard',    cat:'Quizzes',  icon:'💪', name:'Hard Mode',         desc:'Complete a hard difficulty quiz',     xp:50,  cond: d => (d.quizzes||[]).some(q => q.difficulty === 'hard') },

  // Flashcards
  { id:'fc_first',     cat:'Cards',    icon:'🃏', name:'Card Starter',      desc:'Review your first flashcard',         xp:10,  cond: d => (d.flashcards||[]).some(f => (f.reviews||0) > 0) },
  { id:'fc_50',        cat:'Cards',    icon:'🎴', name:'Card Collector',    desc:'Review 50 flashcards',                xp:35,  cond: d => (d.flashcards||[]).filter(f => (f.reviews||0) > 0).length >= 50 },
  { id:'fc_100',       cat:'Cards',    icon:'🃏', name:'Flashcard Master',  desc:'Review 100 flashcards',               xp:75,  cond: d => (d.flashcards||[]).filter(f => (f.reviews||0) > 0).length >= 100 },

  // Focus
  { id:'focus_first',  cat:'Focus',    icon:'⚡', name:'First Pomodoro',    desc:'Complete your first focus session',   xp:15,  cond: d => (d.focusSessions||[]).length >= 1 },
  { id:'focus_10',     cat:'Focus',    icon:'🔥', name:'Focus Warrior',     desc:'Complete 10 focus sessions',          xp:40,  cond: d => (d.focusSessions||[]).length >= 10 },
  { id:'focus_50',     cat:'Focus',    icon:'🧘', name:'Deep Focus',        desc:'Complete 50 focus sessions',          xp:100, cond: d => (d.focusSessions||[]).length >= 50 },
  { id:'focus_2h',     cat:'Focus',    icon:'⏳', name:'Marathon',          desc:'Study for 2 hours in a day',          xp:60,  cond: d => { const today=new Date().toISOString().split('T')[0]; const mins=(d.focusSessions||[]).filter(s=>s.date===today).reduce((a,s)=>a+(s.duration||0),0); return mins>=120; } },

  // Streak
  { id:'streak_3',     cat:'Streak',   icon:'🔥', name:'3-Day Streak',      desc:'Study 3 days in a row',               xp:30,  cond: d => _getStreak(d) >= 3 },
  { id:'streak_7',     cat:'Streak',   icon:'🏆', name:'Week Warrior',      desc:'Study 7 days in a row',               xp:70,  cond: d => _getStreak(d) >= 7 },
  { id:'streak_30',    cat:'Streak',   icon:'💫', name:'Monthly Champion',  desc:'Study 30 days in a row',              xp:200, cond: d => _getStreak(d) >= 30 },

  // AI Tools
  { id:'ai_summary',   cat:'AI',       icon:'📄', name:'AI Summariser',     desc:'Generate your first AI summary',      xp:15,  cond: d => (d.summaries||[]).length >= 1 },
  { id:'ai_youtube',   cat:'AI',       icon:'📺', name:'Lecture Notes',     desc:'Summarise a YouTube lecture',         xp:25,  cond: d => (d.summaries||[]).some(s => s.source === 'youtube') },
  { id:'ai_doubt',     cat:'AI',       icon:'🔍', name:'Doubt Destroyer',   desc:'Use the AI doubt solver',             xp:20,  cond: d => (d.doubts||[]).length >= 1 },
  { id:'ai_roadmap',   cat:'AI',       icon:'🗺️', name:'Road Mapper',       desc:'Generate a study roadmap',            xp:20,  cond: d => !!(d.roadmap) },

  // Planner
  { id:'task_first',   cat:'Planner',  icon:'✅', name:'Task Master',       desc:'Complete your first task',            xp:10,  cond: d => (d.tasks||[]).some(t => t.done) },
  { id:'task_20',      cat:'Planner',  icon:'📋', name:'Productive',        desc:'Complete 20 tasks',                   xp:50,  cond: d => (d.tasks||[]).filter(t => t.done).length >= 20 },
  { id:'exam_added',   cat:'Planner',  icon:'📅', name:'Planner Pro',       desc:'Add an exam to the planner',          xp:10,  cond: d => (d.exams||[]).length >= 1 },

  // Social
  { id:'group_join',   cat:'Social',   icon:'👥', name:'Team Player',       desc:'Create or join a study group',        xp:15,  cond: () => (JSON.parse(localStorage.getItem('sa_groups')||'[]')).length >= 1 },

  // Special
  { id:'early_bird',   cat:'Special',  icon:'🌅', name:'Early Bird',        desc:'Study before 8am',                    xp:25,  cond: d => (d.focusSessions||[]).some(s => { const h=new Date(s.ts||0).getHours(); return h>=5&&h<8; }) },
  { id:'night_owl',    cat:'Special',  icon:'🦉', name:'Night Owl',         desc:'Study after 11pm',                    xp:25,  cond: d => (d.focusSessions||[]).some(s => { const h=new Date(s.ts||0).getHours(); return h>=23||h<3; }) },
  { id:'all_tools',    cat:'Special',  icon:'🚀', name:'Power User',        desc:'Use 8 different features',            xp:150, cond: d => {
    let count = 0;
    if ((d.notes||[]).length>0)          count++;
    if ((d.quizzes||[]).length>0)        count++;
    if ((d.flashcards||[]).length>0)     count++;
    if ((d.focusSessions||[]).length>0)  count++;
    if ((d.summaries||[]).length>0)      count++;
    if ((d.tasks||[]).length>0)          count++;
    if ((d.revisions||[]).length>0)      count++;
    if ((d.exams||[]).length>0)          count++;
    return count >= 8;
  }},
];

// ── XP Level definitions ──────────────────────────────────
const LEVELS = [
  { level:1,  min:0,    name:'Beginner',    icon:'🌱' },
  { level:2,  min:50,   name:'Explorer',    icon:'🗺️' },
  { level:3,  min:120,  name:'Learner',     icon:'📚' },
  { level:4,  min:250,  name:'Student',     icon:'🎓' },
  { level:5,  min:450,  name:'Scholar',     icon:'🔬' },
  { level:6,  min:700,  name:'Expert',      icon:'💡' },
  { level:7,  min:1000, name:'Master',      icon:'🏆' },
  { level:8,  min:1400, name:'Champion',    icon:'⚡' },
  { level:9,  min:1900, name:'Legend',      icon:'🌟' },
  { level:10, min:2500, name:'Grandmaster', icon:'💫' },
];

function _getStreak(data) {
  const sessions = data.focusSessions || [];
  const dates = [...new Set(sessions.map(s=>s.date))].sort().reverse();
  let streak = 0;
  let d = new Date();
  for (let i = 0; i < dates.length; i++) {
    const ds = d.toISOString().split('T')[0];
    if (dates[i] === ds) { streak++; d.setDate(d.getDate()-1); }
    else if (i === 0 && dates[0] < ds) break;
    else break;
  }
  return streak;
}

function getLevel(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) level = l; }
  return level;
}

function getXPToNext(xp) {
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (xp < LEVELS[i+1].min) return { current: xp - LEVELS[i].min, needed: LEVELS[i+1].min - LEVELS[i].min, nextLevel: LEVELS[i+1] };
  }
  return { current: xp, needed: xp, nextLevel: null }; // Max level
}

// ── Check and unlock achievements ────────────────────────
async function checkAchievements(data) {
  const earned   = (data.achievements || []);
  const earnedIds = new Set(earned.map(a => a.id));
  const newlyUnlocked = [];

  for (const def of ACHIEVEMENTS_DEF) {
    if (earnedIds.has(def.id)) continue;
    try {
      if (def.cond(data)) {
        newlyUnlocked.push({ ...def, unlockedAt: Date.now() });
      }
    } catch {}
  }

  if (newlyUnlocked.length > 0) {
    const updated = [...earned, ...newlyUnlocked];
    data.achievements = updated;
    await apiPost('/api/data', { achievements: updated });
    // Show pop-ups
    for (const ach of newlyUnlocked) {
      await _showAchievementPopup(ach);
    }
  }

  return data;
}

// ── Achievement unlock pop-up ─────────────────────────────
function _showAchievementPopup(ach) {
  return new Promise(resolve => {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position:fixed;bottom:90px;right:24px;z-index:9998;
      background:var(--bg-card);border:1px solid rgba(102,126,234,.3);
      border-radius:16px;padding:16px 20px;
      display:flex;align-items:center;gap:14px;
      box-shadow:0 16px 48px rgba(0,0,0,.35);
      max-width:320px;width:calc(100vw - 48px);
      animation:achIn .4s cubic-bezier(.34,1.56,.64,1);
    `;
    popup.innerHTML = `
      <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,rgba(102,126,234,.2),rgba(240,147,251,.15));
        display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0">${ach.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--purple);margin-bottom:3px">Achievement Unlocked! 🎉</div>
        <div style="font-size:.9rem;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ach.name}</div>
        <div style="font-size:.75rem;color:var(--text-muted)">${ach.desc} · +${ach.xp} XP</div>
      </div>`;

    if (!document.getElementById('ach-popup-style')) {
      const s = document.createElement('style');
      s.id = 'ach-popup-style';
      s.textContent = '@keyframes achIn{from{opacity:0;transform:translateX(30px) scale(.9)}to{opacity:1;transform:none}} @keyframes achOut{to{opacity:0;transform:translateX(30px) scale(.9)}}';
      document.head.appendChild(s);
    }

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.style.animation = 'achOut .3s ease forwards';
      setTimeout(() => { popup.remove(); resolve(); }, 300);
    }, 3500);
  });
}

// ── Page init ─────────────────────────────────────────────
async function initAchievements() {
  const data   = await getData();
  const earned = data.achievements || [];
  const totalXP = earned.reduce((a, x) => a + (x.xp || 0), 0);
  const level  = getLevel(totalXP);
  const xpInfo = getXPToNext(totalXP);

  // ── Stat cards ──
  const sg = document.getElementById('ach-stats');
  if (sg) sg.innerHTML = `
    <div class="stat-card c1"><div class="stat-icon">🏆</div><div class="stat-val">${earned.length}</div><div class="stat-lbl">Earned</div></div>
    <div class="stat-card c2"><div class="stat-icon">⭐</div><div class="stat-val">${totalXP}</div><div class="stat-lbl">Total XP</div></div>
    <div class="stat-card c3"><div class="stat-icon">${level.icon}</div><div class="stat-val">${level.name}</div><div class="stat-lbl">Level ${level.level}</div></div>
    <div class="stat-card c4"><div class="stat-icon">🎯</div><div class="stat-val">${ACHIEVEMENTS_DEF.length - earned.length}</div><div class="stat-lbl">Remaining</div></div>`;

  // ── XP bar ──
  const xpBar  = document.getElementById('xp-bar');
  const xpText = document.getElementById('xp-text');
  const badge  = document.getElementById('level-badge');
  const pct    = xpInfo.needed > 0 ? Math.min(100, Math.round(xpInfo.current / xpInfo.needed * 100)) : 100;
  if (xpBar)  xpBar.style.width = pct + '%';
  if (xpText) xpText.textContent = totalXP + ' XP';
  if (badge)  badge.textContent  = `${level.icon} ${level.name}`;
  document.getElementById('xp-next-text') && (document.getElementById('xp-next-text').textContent = xpInfo.nextLevel ? `Next: ${xpInfo.nextLevel.name} at ${xpInfo.nextLevel.min} XP` : 'Max level reached!');
  document.getElementById('xp-level-desc') && (document.getElementById('xp-level-desc').textContent = `${pct}% to next level`);

  // ── Achievement grid ──
  const grid = document.getElementById('ach-grid');
  if (!grid) return;

  const earnedIds = new Set(earned.map(a => a.id));
  const categories = [...new Set(ACHIEVEMENTS_DEF.map(a => a.cat))];

  let html = '';
  for (const cat of categories) {
    html += `<div class="cat-header"><div class="cat-line"></div><div class="cat-label">${cat}</div><div class="cat-line"></div></div>`;
    const catAchs = ACHIEVEMENTS_DEF.filter(a => a.cat === cat);
    for (const ach of catAchs) {
      const isUnlocked = earnedIds.has(ach.id);
      const earnedData = earned.find(e => e.id === ach.id);
      html += `
        <div class="ach-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <span class="ach-icon">${ach.icon}</span>
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.desc}</div>
          <div style="margin-top:8px">
            <span class="badge ${isUnlocked ? 'badge-purple' : 'badge-cyan'}">${isUnlocked ? '+'+ach.xp+' XP ✓' : ach.xp+' XP'}</span>
          </div>
          ${isUnlocked && earnedData?.unlockedAt ? `<div style="font-size:.65rem;color:var(--text-muted);margin-top:5px">${new Date(earnedData.unlockedAt).toLocaleDateString()}</div>` : ''}
        </div>`;
    }
  }
  grid.innerHTML = html;

  // Check for new achievements
  await checkAchievements(data);
}

// ── Export for use in other pages ────────────────────────
window.AchievementsEngine = { check: checkAchievements, getLevel, ACHIEVEMENTS_DEF };