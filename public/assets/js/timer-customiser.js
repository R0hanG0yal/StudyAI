/* ============================================================
   STUDYAI — timer-customiser.js  (Task 7)
   Custom Pomodoro intervals, break durations, daily goals.
   ============================================================ */

const TimerCustomiser = (function() {
  const KEY = 'sa_timer_prefs';

  const DEFAULTS = {
    focusMin    : 25,
    shortBreak  : 5,
    longBreak   : 15,
    sessionsBeforeLong: 4,
    autoStartBreak: false,
    autoStartFocus: false,
    dailyGoalMin  : 120,     // 2 hours default
    presets: [
      { name:'Pomodoro',   focus:25, short:5,  long:15 },
      { name:'Deep Work',  focus:50, short:10, long:20 },
      { name:'Sprint',     focus:15, short:3,  long:10 },
      { name:'Custom',     focus:25, short:5,  long:15 },
    ],
    activePreset: 0,
  };

  function load() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  }

  function save(prefs) {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.timerPrefs = prefs; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }

  function update(changes) { const u = { ...load(), ...changes }; save(u); return u; }

  function showModal() {
    const p = load();
    const existing = document.getElementById('timer-prefs-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'timer-prefs-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <span class="modal-title">⏱️ Timer Settings</span>
          <button class="modal-close" id="tpm-close">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Quick Presets</label>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:4px">
            ${p.presets.slice(0,3).map((pr,i) => `
              <button class="tp-preset ${p.activePreset===i?'active':''}" data-idx="${i}"
                style="padding:10px 6px;border-radius:10px;border:1.5px solid ${p.activePreset===i?'rgba(102,126,234,.4)':'var(--border)'};
                background:${p.activePreset===i?'rgba(102,126,234,.1)':'transparent'};
                font-size:.76rem;font-weight:700;cursor:pointer;transition:all .15s;
                color:${p.activePreset===i?'var(--purple)':'var(--text-dim)'}">
                ${pr.name}<br/><span style="font-size:.68rem;opacity:.7">${pr.focus}/${pr.short}/${pr.long}m</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="grid-2" style="gap:10px">
          <div class="form-group"><label class="form-label">Focus (min)</label><input type="number" id="tp-focus" class="form-input" value="${p.focusMin}" min="1" max="90"/></div>
          <div class="form-group"><label class="form-label">Short Break</label><input type="number" id="tp-short" class="form-input" value="${p.shortBreak}" min="1" max="30"/></div>
        </div>
        <div class="grid-2" style="gap:10px">
          <div class="form-group"><label class="form-label">Long Break</label><input type="number" id="tp-long" class="form-input" value="${p.longBreak}" min="5" max="60"/></div>
          <div class="form-group"><label class="form-label">Sessions → Long</label><input type="number" id="tp-sessions" class="form-input" value="${p.sessionsBeforeLong}" min="1" max="10"/></div>
        </div>
        <div class="form-group"><label class="form-label">Daily Goal (minutes)</label><input type="number" id="tp-goal" class="form-input" value="${p.dailyGoalMin}" min="15" max="720"/></div>

        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0">
            <span class="text-sm">Auto-start breaks</span>
            <label class="toggle"><input type="checkbox" id="tp-autobreak" ${p.autoStartBreak?'checked':''}><div class="toggle-track"></div></label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0">
            <span class="text-sm">Auto-start focus after break</span>
            <label class="toggle"><input type="checkbox" id="tp-autofocus" ${p.autoStartFocus?'checked':''}><div class="toggle-track"></div></label>
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="tpm-save" style="justify-content:center">Save Timer Settings</button>
      </div>`;
    document.body.appendChild(modal);

    // Preset buttons
    modal.querySelectorAll('.tp-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const pr = p.presets[parseInt(btn.dataset.idx)];
        if (pr) {
          document.getElementById('tp-focus').value  = pr.focus;
          document.getElementById('tp-short').value  = pr.short;
          document.getElementById('tp-long').value   = pr.long;
        }
        modal.querySelectorAll('.tp-preset').forEach(b => {
          b.style.borderColor='var(--border)'; b.style.background='transparent'; b.style.color='var(--text-dim)';
        });
        btn.style.borderColor='rgba(102,126,234,.4)'; btn.style.background='rgba(102,126,234,.1)'; btn.style.color='var(--purple)';
      });
    });

    document.getElementById('tpm-close')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('tpm-save')?.addEventListener('click', () => {
      update({
        focusMin    : parseInt(document.getElementById('tp-focus')?.value)  || p.focusMin,
        shortBreak  : parseInt(document.getElementById('tp-short')?.value)  || p.shortBreak,
        longBreak   : parseInt(document.getElementById('tp-long')?.value)   || p.longBreak,
        sessionsBeforeLong: parseInt(document.getElementById('tp-sessions')?.value) || p.sessionsBeforeLong,
        dailyGoalMin: parseInt(document.getElementById('tp-goal')?.value)   || p.dailyGoalMin,
        autoStartBreak: document.getElementById('tp-autobreak')?.checked,
        autoStartFocus: document.getElementById('tp-autofocus')?.checked,
      });
      modal.remove();
      showToast && showToast('Timer settings saved!', 'success', 2000);
    });
  }

  return { load, save, update, showModal };
})();

window.TimerCustomiser = TimerCustomiser;


/* ============================================================
   STUDYAI — subject-colors.js  (Task 8)
   Custom colors and emojis per subject.
   ============================================================ */

const SubjectColors = (function() {
  const KEY = 'sa_subject_colors';

  const DEFAULT_COLORS = {
    OS      : { color:'#fee140', bg:'rgba(254,225,64,.12)',  icon:'🖥️' },
    DBMS    : { color:'#a78bfa', bg:'rgba(167,139,250,.12)', icon:'🗄️' },
    DSA     : { color:'#fa709a', bg:'rgba(250,112,154,.12)', icon:'💻' },
    CN      : { color:'#4facfe', bg:'rgba(79,172,254,.12)',  icon:'🌐' },
    AI      : { color:'#43e97b', bg:'rgba(67,233,123,.12)',  icon:'🧠' },
    Math    : { color:'#f093fb', bg:'rgba(240,147,251,.12)', icon:'📐' },
    Physics : { color:'#f48c06', bg:'rgba(244,140,6,.12)',   icon:'⚡' },
    Chemistry:{ color:'#52b788', bg:'rgba(82,183,136,.12)',  icon:'🧪' },
    English : { color:'#ff4d6d', bg:'rgba(255,77,109,.12)',  icon:'📖' },
    General : { color:'#667eea', bg:'rgba(102,126,234,.12)', icon:'📚' },
  };

  function load() {
    try { return { ...DEFAULT_COLORS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULT_COLORS }; }
  }

  function save(colors) {
    localStorage.setItem(KEY, JSON.stringify(colors));
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.subjectColors = colors; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }

  function getSubjectStyle(subjectName) {
    const colors = load();
    return colors[subjectName] || colors['General'] || { color:'#667eea', bg:'rgba(102,126,234,.12)', icon:'📚' };
  }

  // Apply subject badge color
  function styleSubjectBadge(element, subjectName) {
    if (!element) return;
    const style = getSubjectStyle(subjectName);
    element.style.color = style.color;
    element.style.background = style.bg;
    element.style.border = `1px solid ${style.color}40`;
  }

  function applyAllBadges() {
    document.querySelectorAll('[data-subject-badge]').forEach(el => {
      styleSubjectBadge(el, el.dataset.subjectBadge);
    });
  }

  function showModal() {
    const colors = load();
    const subjects = typeof getSubjects === 'function' ? getSubjects() : Object.keys(DEFAULT_COLORS);
    const existing = document.getElementById('subj-color-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'subj-color-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <span class="modal-title">🎨 Subject Colors</span>
          <button class="modal-close" id="scol-close">✕</button>
        </div>
        <p class="text-sm text-muted mb-3">Assign colors and icons to each subject.</p>
        <div id="scol-list" style="max-height:420px;overflow-y:auto"></div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-primary flex-1" id="scol-save" style="justify-content:center">Save Colors</button>
          <button class="btn btn-secondary" id="scol-reset">Reset</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    _renderSubjectList(subjects, colors);

    document.getElementById('scol-close')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('scol-reset')?.addEventListener('click', () => _renderSubjectList(subjects, DEFAULT_COLORS));
    document.getElementById('scol-save')?.addEventListener('click', () => {
      const newColors = {};
      document.querySelectorAll('#scol-list [data-subj]').forEach(row => {
        const subj  = row.dataset.subj;
        const color = row.querySelector('.scol-color')?.value || '#667eea';
        const icon  = row.querySelector('.scol-icon')?.value  || '📚';
        const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
        newColors[subj] = { color, icon, bg: `rgba(${r},${g},${b},.12)` };
      });
      save(newColors);
      applyAllBadges();
      modal.remove();
      showToast && showToast('Subject colors saved!', 'success', 2000);
    });
  }

  function _renderSubjectList(subjects, colors) {
    const list = document.getElementById('scol-list');
    if (!list) return;
    list.innerHTML = subjects.map(s => {
      const c = colors[s] || DEFAULT_COLORS['General'];
      return `
        <div data-subj="${s}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;margin-bottom:4px;background:rgba(255,255,255,.03);border:1px solid var(--border)">
          <input type="text" class="scol-icon" value="${c.icon}" maxlength="2"
            style="width:38px;text-align:center;font-size:1.2rem;background:transparent;border:1px solid var(--border);border-radius:8px;padding:4px"/>
          <span style="flex:1;font-size:.88rem;font-weight:600">${s}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="color" class="scol-color" value="${c.color}"
              style="width:32px;height:32px;border-radius:8px;border:none;cursor:pointer;padding:2px"/>
            <div class="scol-preview badge" style="color:${c.color};background:${c.bg};border:1px solid ${c.color}40">${c.icon} ${s}</div>
          </div>
        </div>`;
    }).join('');

    // Live preview on color change
    list.querySelectorAll('[data-subj]').forEach(row => {
      const colorInp = row.querySelector('.scol-color');
      const iconInp  = row.querySelector('.scol-icon');
      const preview  = row.querySelector('.scol-preview');
      const subj     = row.dataset.subj;
      const update = () => {
        const c = colorInp.value;
        const ico = iconInp.value || '📚';
        const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
        preview.style.color = c;
        preview.style.background = `rgba(${r},${g},${b},.12)`;
        preview.textContent = `${ico} ${subj}`;
      };
      colorInp.addEventListener('input', update);
      iconInp.addEventListener('input',  update);
    });
  }

  return { DEFAULT_COLORS, load, save, getSubjectStyle, styleSubjectBadge, applyAllBadges, showModal };
})();

window.SubjectColors = SubjectColors;