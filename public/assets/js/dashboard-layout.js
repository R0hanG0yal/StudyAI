/* ============================================================
   STUDYAI — dashboard-layout.js  (Task 4)
   Users can show/hide and reorder dashboard widgets.
   ============================================================ */

const DashboardLayout = (function() {
  const STORAGE_KEY = 'sa_dash_layout';

  const WIDGETS = [
    { id:'welcome',     label:'Welcome Banner',   icon:'👋', required:true,  defaultVisible:true },
    { id:'stats',       label:'Stat Cards',       icon:'📊', required:false, defaultVisible:true },
    { id:'tasks',       label:"Today's Tasks",    icon:'✅', required:false, defaultVisible:true },
    { id:'exams',       label:'Upcoming Exams',   icon:'📅', required:false, defaultVisible:true },
    { id:'recs',        label:'AI Recommendations',icon:'🤖',required:false, defaultVisible:true },
    { id:'quickactions',label:'Quick Actions',    icon:'⚡', required:false, defaultVisible:true },
    { id:'activity',    label:'Recent Activity',  icon:'🕒', required:false, defaultVisible:true },
    { id:'weak',        label:'Weak Topics',      icon:'⚠️', required:false, defaultVisible:true },
    { id:'chart',       label:'Weekly Chart',     icon:'📈', required:false, defaultVisible:true },
  ];

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return _default();
      const savedIds = new Set(saved.map(w => w.id));
      const missing  = WIDGETS.filter(w => !savedIds.has(w.id)).map(w => ({ id:w.id, visible:w.defaultVisible }));
      return [...saved, ...missing];
    } catch { return _default(); }
  }

  function _default() {
    return WIDGETS.map(w => ({ id:w.id, visible:w.defaultVisible }));
  }

  function save(layout) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.dashLayout = layout; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }

  function isVisible(widgetId) {
    const layout = load();
    const entry  = layout.find(w => w.id === widgetId);
    if (!entry) return true;
    const def = WIDGETS.find(w => w.id === widgetId);
    return def?.required ? true : entry.visible;
  }

  // Apply visibility to dashboard DOM elements
  function applyToDashboard() {
    const layout = load();
    const idMap  = {
      welcome    : '.welcome-banner',
      stats      : '#stat-grid',
      tasks      : '#dash-tasks',
      exams      : '#dash-exams',
      recs       : '#dash-recs',
      quickactions: '.quick-add-grid',
      activity   : '#dash-activity',
      weak       : '#dash-weak',
      chart      : '#week-chart',
    };
    layout.forEach(entry => {
      const sel = idMap[entry.id];
      if (!sel) return;
      const def = WIDGETS.find(w => w.id === entry.id);
      const show = def?.required ? true : entry.visible;
      document.querySelectorAll(sel).forEach(el => {
        const card = el.closest('.card') || el.parentElement?.closest('.card') || el;
        if (card) card.style.display = show ? '' : 'none';
      });
    });
  }

  // Show customise modal
  function showCustomiser() {
    const layout = load();
    const existing = document.getElementById('dash-customiser-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'dash-customiser-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <span class="modal-title">📊 Customise Dashboard</span>
          <button class="modal-close" id="dcm-close">✕</button>
        </div>
        <p class="text-sm text-muted mb-3">Toggle which widgets appear on your dashboard.</p>
        <div id="dcm-list"></div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-primary flex-1" id="dcm-save" style="justify-content:center">Save</button>
          <button class="btn btn-secondary" id="dcm-reset">Reset</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    _renderList(layout);
    document.getElementById('dcm-close')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('dcm-reset')?.addEventListener('click', () => _renderList(_default()));
    document.getElementById('dcm-save')?.addEventListener('click', () => {
      const rows = document.querySelectorAll('#dcm-list [data-widget-id]');
      const newLayout = [...rows].map(r => ({ id: r.dataset.widgetId, visible: r.querySelector('input')?.checked !== false }));
      save(newLayout);
      applyToDashboard();
      modal.remove();
      showToast && showToast('Dashboard updated!', 'success', 2000);
    });
  }

  function _renderList(layout) {
    const list = document.getElementById('dcm-list');
    if (!list) return;
    list.innerHTML = layout.map(l => {
      const def = WIDGETS.find(w => w.id === l.id);
      if (!def) return '';
      const isReq = def.required;
      return `
        <div data-widget-id="${def.id}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;margin-bottom:4px;background:rgba(255,255,255,.03);border:1px solid var(--border)">
          <span>${def.icon}</span>
          <span style="flex:1;font-size:.86rem;font-weight:500">${def.label}</span>
          ${isReq
            ? `<span class="text-xs text-muted" style="padding:3px 8px;border-radius:100px;border:1px solid var(--border)">Always shown</span>`
            : `<label class="toggle"><input type="checkbox" ${l.visible?'checked':''}><div class="toggle-track"></div></label>`
          }
        </div>`;
    }).join('');
  }

  return { WIDGETS, load, save, isVisible, applyToDashboard, showCustomiser };
})();

window.DashboardLayout = DashboardLayout;