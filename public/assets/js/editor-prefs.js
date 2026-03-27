/* ============================================================
   STUDYAI — editor-prefs.js  (Task 5)
   Note editor preferences: width, spacing, toolbar items,
   autosave delay, spell check, word count visibility.
   ============================================================ */

const EditorPrefs = (function() {
  const KEY = 'sa_editor_prefs';

  const DEFAULTS = {
    width       : 'normal',    // 'compact'|'normal'|'wide'|'full'
    spacing     : 'comfy',     // 'compact'|'comfy'|'relaxed'
    autosaveMs  : 1500,        // autosave delay in ms
    spellCheck  : true,
    showWordCount: true,
    showToolbar : true,
    toolbarItems: ['bold','italic','underline','h1','h2','h3','bullet','code','table','pin','bookmark','summary','quiz','flash','export','delete'],
    lineNumbers : false,
    focusMode   : false,       // hide everything except editor body
  };

  const spacingMap = {
    compact : { padding:'12px 16px', lineHeight:'1.6' },
    comfy   : { padding:'20px 24px', lineHeight:'1.9' },
    relaxed : { padding:'32px 40px', lineHeight:'2.2' },
  };

  const widthMap = {
    compact : '520px',
    normal  : '760px',
    wide    : '1000px',
    full    : '100%',
  };

  function load() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  }

  function save(prefs) {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.editorPrefs = prefs; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }

  function apply(prefs = null) {
    const p = prefs || load();
    const root = document.documentElement;

    // Content width
    root.style.setProperty('--editor-max-width', widthMap[p.width] || widthMap.normal);

    // Spacing
    const sp = spacingMap[p.spacing] || spacingMap.comfy;
    const editorBody = document.querySelector('.editor-body');
    if (editorBody) {
      editorBody.style.padding = sp.padding;
      editorBody.style.lineHeight = sp.lineHeight;
    }

    // Textarea
    const noteBody = document.getElementById('note-body');
    if (noteBody) {
      noteBody.spellcheck = p.spellCheck;
      noteBody.style.lineHeight = sp.lineHeight;
    }

    // Word count visibility
    const footer = document.querySelector('.editor-footer');
    if (footer) footer.style.display = p.showWordCount ? 'flex' : 'none';

    // Toolbar visibility
    const toolbar = document.querySelector('.editor-toolbar');
    if (toolbar) toolbar.style.display = p.showToolbar ? 'flex' : 'none';

    // Focus mode
    if (p.focusMode) {
      document.querySelector('.notes-panel')?.classList.add('hidden-focus');
      document.querySelector('.editor-meta')?.classList.add('hidden-focus');
      document.body.classList.add('focus-mode');
    } else {
      document.querySelector('.notes-panel')?.classList.remove('hidden-focus');
      document.querySelector('.editor-meta')?.classList.remove('hidden-focus');
      document.body.classList.remove('focus-mode');
    }

    // Focus mode CSS
    if (!document.getElementById('focus-mode-style')) {
      const s = document.createElement('style');
      s.id = 'focus-mode-style';
      s.textContent = `
        body.focus-mode .notes-panel,
        body.focus-mode .editor-meta,
        body.focus-mode .editor-toolbar,
        body.focus-mode .editor-footer,
        body.focus-mode .sidebar,
        body.focus-mode .topbar { display:none!important; }
        body.focus-mode .editor-panel { border-radius:0; }
        body.focus-mode .editor-body { padding:60px max(60px,10vw)!important; }
        body.focus-mode #note-body { font-size:1.1rem!important; }
        body.focus-mode::after { content:'Press Esc to exit focus mode'; position:fixed; bottom:20px; left:50%; transform:translateX(-50%); color:rgba(255,255,255,.2); font-size:.76rem; pointer-events:none; }
      `;
      document.head.appendChild(s);
    }
  }

  function update(changes) {
    const current = load();
    const updated = { ...current, ...changes };
    apply(updated);
    save(updated);
    return updated;
  }

  // Show preferences modal
  function showPrefsModal() {
    const p = load();
    const existing = document.getElementById('editor-prefs-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'editor-prefs-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <span class="modal-title">✏️ Editor Preferences</span>
          <button class="modal-close" id="epm-close">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Content Width</label>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
            ${['compact','normal','wide','full'].map(v => `
              <button class="ep-width-btn ${p.width===v?'active':''}" data-val="${v}"
                style="padding:8px 4px;border-radius:9px;border:1.5px solid ${p.width===v?'rgba(102,126,234,.5)':'var(--border)'};
                background:${p.width===v?'rgba(102,126,234,.12)':'rgba(255,255,255,.04)'};
                font-size:.74rem;font-weight:600;cursor:pointer;transition:all .15s;color:${p.width===v?'var(--purple)':'var(--text-dim)'}">
                ${v[0].toUpperCase()+v.slice(1)}
              </button>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Line Spacing</label>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
            ${['compact','comfy','relaxed'].map(v => `
              <button class="ep-space-btn ${p.spacing===v?'active':''}" data-val="${v}"
                style="padding:8px 4px;border-radius:9px;border:1.5px solid ${p.spacing===v?'rgba(102,126,234,.5)':'var(--border)'};
                background:${p.spacing===v?'rgba(102,126,234,.12)':'rgba(255,255,255,.04)'};
                font-size:.74rem;font-weight:600;cursor:pointer;transition:all .15s;color:${p.spacing===v?'var(--purple)':'var(--text-dim)'}">
                ${v[0].toUpperCase()+v.slice(1)}
              </button>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Autosave Delay</label>
          <div style="display:flex;align-items:center;gap:12px">
            <input type="range" id="ep-autosave" min="500" max="5000" step="500" value="${p.autosaveMs}" style="flex:1;accent-color:var(--purple)"/>
            <span id="ep-autosave-lbl" style="font-family:var(--font-mono);font-size:.82rem;width:50px;text-align:right">${p.autosaveMs/1000}s</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
          ${[
            ['ep-spellcheck', 'Spell Check',        p.spellCheck],
            ['ep-wordcount',  'Show Word Count',     p.showWordCount],
            ['ep-toolbar',    'Show Toolbar',        p.showToolbar],
            ['ep-linenums',   'Line Numbers',        p.lineNumbers],
            ['ep-focus',      'Focus Mode (Zen)',    p.focusMode],
          ].map(([id, label, checked]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0">
              <span class="text-sm">${label}</span>
              <label class="toggle"><input type="checkbox" id="${id}" ${checked?'checked':''}><div class="toggle-track"></div></label>
            </div>`).join('')}
        </div>

        <button class="btn btn-primary btn-full" id="epm-save" style="justify-content:center">Apply Preferences</button>
      </div>`;
    document.body.appendChild(modal);

    // Width buttons
    modal.querySelectorAll('.ep-width-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.ep-width-btn').forEach(b => {
          b.style.borderColor='var(--border)'; b.style.background='rgba(255,255,255,.04)'; b.style.color='var(--text-dim)'; b.classList.remove('active');
        });
        btn.style.borderColor='rgba(102,126,234,.5)'; btn.style.background='rgba(102,126,234,.12)'; btn.style.color='var(--purple)'; btn.classList.add('active');
      });
    });

    // Spacing buttons
    modal.querySelectorAll('.ep-space-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.ep-space-btn').forEach(b => {
          b.style.borderColor='var(--border)'; b.style.background='rgba(255,255,255,.04)'; b.style.color='var(--text-dim)';
        });
        btn.style.borderColor='rgba(102,126,234,.5)'; btn.style.background='rgba(102,126,234,.12)'; btn.style.color='var(--purple)';
      });
    });

    // Autosave slider
    document.getElementById('ep-autosave')?.addEventListener('input', e => {
      document.getElementById('ep-autosave-lbl').textContent = (e.target.value/1000) + 's';
    });

    document.getElementById('epm-close')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('epm-save')?.addEventListener('click', () => {
      const widthBtn  = modal.querySelector('.ep-width-btn.active');
      const spaceBtn  = modal.querySelector('.ep-space-btn.active');
      update({
        width       : widthBtn?.dataset.val || p.width,
        spacing     : spaceBtn?.dataset.val || p.spacing,
        autosaveMs  : parseInt(document.getElementById('ep-autosave')?.value || p.autosaveMs),
        spellCheck  : document.getElementById('ep-spellcheck')?.checked,
        showWordCount: document.getElementById('ep-wordcount')?.checked,
        showToolbar : document.getElementById('ep-toolbar')?.checked,
        lineNumbers : document.getElementById('ep-linenums')?.checked,
        focusMode   : document.getElementById('ep-focus')?.checked,
      });
      modal.remove();
      showToast && showToast('Editor preferences saved!', 'success', 2000);
    });
  }

  // Escape key exits focus mode
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && load().focusMode) {
      update({ focusMode: false });
    }
  });

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.editor-panel')) apply();
  });

  return { load, save, apply, update, showPrefsModal, DEFAULTS, widthMap, spacingMap };
})();

window.EditorPrefs = EditorPrefs;