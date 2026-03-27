/* ============================================================
   STUDYAI — sidebar-customiser.js  (Task 3)
   Users can hide nav items and drag to reorder them.
   Persisted to localStorage + server settings.
   ============================================================ */

const SidebarCustomiser = (function() {

  const STORAGE_KEY = 'sa_sidebar_layout';

  const ALL_ITEMS = [
    { id:'dashboard',  href:'/dashboard.html',  icon:'🏠', label:'Dashboard',    section:'Main',     required:true },
    { id:'notes',      href:'/notes.html',       icon:'📝', label:'My Notes',     section:'Main',     required:true },
    { id:'chat',       href:'/chat.html',        icon:'🤖', label:'AI Chat',      section:'Main' },
    { id:'summaries',  href:'/summaries.html',   icon:'📄', label:'Summaries',    section:'Main' },
    { id:'customise',  href:'/customise.html',   icon:'🎨', label:'Customise',    section:'Main' },
    { id:'quiz',       href:'/quiz.html',         icon:'🎯', label:'Quiz Zone',    section:'Practice' },
    { id:'flashcards', href:'/flashcards.html',  icon:'🃏', label:'Flashcards',   section:'Practice' },
    { id:'doubt',      href:'/doubt.html',        icon:'🔍', label:'Doubt Solver', section:'Practice' },
    { id:'revision',   href:'/revision.html',    icon:'🔄', label:'Revision',     section:'Practice' },
    { id:'planner',    href:'/planner.html',      icon:'📅', label:'Planner',      section:'Planning' },
    { id:'focus',      href:'/focus.html',        icon:'⚡', label:'Focus Mode',   section:'Planning' },
    { id:'groups',     href:'/groups.html',       icon:'👥', label:'Study Groups', section:'Planning' },
    { id:'analytics',  href:'/analytics.html',   icon:'📊', label:'Analytics',    section:'Insights' },
    { id:'achievements',href:'/achievements.html',icon:'🏆',label:'Achievements', section:'Insights' },
    { id:'settings',   href:'/settings.html',    icon:'⚙️', label:'Settings',     section:'Insights', required:true },
  ];

  // ── Load user layout ──────────────────────────────────
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return _defaultLayout();
      // Merge: ensure new items added to app appear in layout
      const savedIds = new Set(saved.map(i => i.id));
      const missing  = ALL_ITEMS.filter(i => !savedIds.has(i.id));
      return [...saved, ...missing.map(i => ({ id: i.id, visible: true }))];
    } catch { return _defaultLayout(); }
  }

  function _defaultLayout() {
    return ALL_ITEMS.map(i => ({ id: i.id, visible: true }));
  }

  // ── Save layout ───────────────────────────────────────
  function save(layout) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.sidebarLayout = layout; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }

  // ── Get ordered + filtered nav items ─────────────────
  function getNavItems() {
    const layout = load();
    return layout
      .map(l => {
        const def = ALL_ITEMS.find(i => i.id === l.id);
        if (!def) return null;
        return { ...def, visible: l.id === 'dashboard' || l.id === 'settings' ? true : l.visible };
      })
      .filter(Boolean)
      .filter(i => i.visible);
  }

  // ── Apply to sidebar DOM ──────────────────────────────
  function applyToSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    const items   = getNavItems();
    const sections = [...new Set(items.map(i => i.section))];
    const active  = window.location.pathname;

    let html = '';
    sections.forEach(sec => {
      html += `<div class="nav-section-label">${sec}</div>`;
      items.filter(i => i.section === sec).forEach(item => {
        const isActive = active.includes(item.href.replace('/', ''));
        html += `<a class="nav-item ${isActive ? 'active' : ''}" href="${item.href}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>`;
      });
    });
    nav.innerHTML = html;
  }

  // ── Show customiser modal ─────────────────────────────
  function showCustomiser() {
    const layout = load();
    const existing = document.getElementById('sidebar-customiser-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'sidebar-customiser-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span class="modal-title">🗂️ Customise Sidebar</span>
          <button class="modal-close" id="scm-close">✕</button>
        </div>
        <p class="text-sm text-muted mb-3">Show or hide nav items. Drag to reorder. Required items are locked.</p>
        <div id="scm-list" style="max-height:440px;overflow-y:auto"></div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-primary flex-1" id="scm-save" style="justify-content:center">Save Layout</button>
          <button class="btn btn-secondary" id="scm-reset">Reset</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    _renderList(layout);
    _bindDrag();

    document.getElementById('scm-close')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('scm-reset')?.addEventListener('click', () => {
      const def = _defaultLayout();
      _renderList(def);
    });
    document.getElementById('scm-save')?.addEventListener('click', () => {
      const items = document.querySelectorAll('#scm-list [data-item-id]');
      const newLayout = [...items].map(el => ({
        id     : el.dataset.itemId,
        visible: el.querySelector('input[type="checkbox"]')?.checked !== false,
      }));
      save(newLayout);
      applyToSidebar();
      modal.remove();
      if (typeof showToast === 'function') showToast('Sidebar saved!', 'success', 2000);
    });
  }

  function _renderList(layout) {
    const list = document.getElementById('scm-list');
    if (!list) return;

    list.innerHTML = layout.map(l => {
      const def = ALL_ITEMS.find(i => i.id === l.id);
      if (!def) return '';
      const isRequired = def.required;
      const isVisible  = isRequired ? true : l.visible;
      return `
        <div class="scm-item" data-item-id="${def.id}" style="
          display:flex;align-items:center;gap:12px;padding:10px 12px;
          border-radius:10px;margin-bottom:4px;cursor:${isRequired?'default':'grab'};
          background:rgba(255,255,255,.03);border:1px solid var(--border);
          transition:all .15s;
        ">
          <span style="font-size:1rem;opacity:.4;cursor:${isRequired?'default':'grab'}" class="drag-handle">⠿</span>
          <span style="font-size:1rem">${def.icon}</span>
          <span style="flex:1;font-size:.86rem;font-weight:500">${def.label}</span>
          <span class="badge badge-${def.section==='Main'?'purple':def.section==='Practice'?'cyan':def.section==='Planning'?'green':'orange'}" style="font-size:.62rem">${def.section}</span>
          ${isRequired
            ? `<span style="font-size:.7rem;color:var(--text-muted);padding:3px 8px;border-radius:100px;border:1px solid var(--border)">Required</span>`
            : `<label class="toggle" style="flex-shrink:0">
                <input type="checkbox" ${isVisible?'checked':''} />
                <div class="toggle-track"></div>
               </label>`
          }
        </div>`;
    }).join('');
  }

  function _bindDrag() {
    const list = document.getElementById('scm-list');
    if (!list) return;
    let dragEl = null, placeholder = null;

    list.addEventListener('mousedown', e => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      const item = handle.closest('[data-item-id]');
      const def  = ALL_ITEMS.find(i => i.id === item.dataset.itemId);
      if (!item || def?.required) return;

      dragEl = item;
      dragEl.style.opacity = '0.5';
      dragEl.style.cursor  = 'grabbing';

      placeholder = document.createElement('div');
      placeholder.style.cssText = `height:${item.offsetHeight}px;background:rgba(102,126,234,.1);border:1px dashed rgba(102,126,234,.3);border-radius:10px;margin-bottom:4px`;
      item.after(placeholder);

      const onMove = e => {
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-item-id]');
        if (el && el !== dragEl) {
          const rect = el.getBoundingClientRect();
          const mid  = rect.top + rect.height / 2;
          if (e.clientY < mid) el.before(placeholder);
          else el.after(placeholder);
        }
      };
      const onUp = () => {
        dragEl.style.opacity = '1';
        dragEl.style.cursor  = 'grab';
        placeholder.replaceWith(dragEl);
        placeholder = null; dragEl = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ── Init ──────────────────────────────────────────────
  function init() {
    // Override sidebar.js NAV_ITEMS with user layout
    if (document.querySelector('.sidebar-nav')) {
      applyToSidebar();
    }
  }

  return { load, save, getNavItems, applyToSidebar, showCustomiser, init, ALL_ITEMS };
})();

// Apply on sidebar build
document.addEventListener('DOMContentLoaded', () => SidebarCustomiser.init());
window.SidebarCustomiser = SidebarCustomiser;