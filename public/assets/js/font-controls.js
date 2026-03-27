/* ============================================================
   STUDYAI — font-controls.js  (Task 2)
   Font size, family, line spacing, content width.
   Applies instantly everywhere via CSS variables.
   ============================================================ */

const FontSystem = (function() {

  const FONT_FAMILIES = {
    inter       : { name: 'Inter',          stack: "'Inter', system-ui, sans-serif",            preview: 'The quick brown fox' },
    jakarta     : { name: 'Jakarta',         stack: "'Plus Jakarta Sans', 'Inter', sans-serif",  preview: 'The quick brown fox' },
    georgia     : { name: 'Georgia',         stack: "Georgia, 'Times New Roman', serif",          preview: 'The quick brown fox' },
    mono        : { name: 'Monospace',       stack: "'JetBrains Mono', 'Fira Code', monospace",   preview: 'The quick brown fox' },
    nunito      : { name: 'Nunito',          stack: "'Nunito', 'Inter', sans-serif",              preview: 'The quick brown fox' },
    system      : { name: 'System Default',  stack: "system-ui, -apple-system, sans-serif",       preview: 'The quick brown fox' },
  };

  const DEFAULTS = {
    family      : 'inter',
    size        : 15,          // px, range 12–22
    lineHeight  : 1.7,         // range 1.4–2.2
    noteWidth   : 'normal',    // 'compact' | 'normal' | 'wide' | 'full'
    editorFont  : 'inter',
  };

  const widthMap = {
    compact : '560px',
    normal  : '780px',
    wide    : '1020px',
    full    : '100%',
  };

  // ── Load saved prefs ──────────────────────────────────
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem('sa_font_prefs') || '{}');
      return { ...DEFAULTS, ...saved };
    } catch { return { ...DEFAULTS }; }
  }

  // ── Save prefs ────────────────────────────────────────
  function save(prefs) {
    localStorage.setItem('sa_font_prefs', JSON.stringify(prefs));
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.fontPrefs = prefs; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }

  // ── Apply to DOM ──────────────────────────────────────
  function apply(prefs) {
    const root = document.documentElement;
    const p    = { ...DEFAULTS, ...prefs };

    // Font family
    const family = FONT_FAMILIES[p.family] || FONT_FAMILIES.inter;
    root.style.setProperty('--font', family.stack);
    root.style.setProperty('--font-size-base', p.size + 'px');
    document.body.style.fontSize = p.size + 'px';

    // Line height
    root.style.setProperty('--line-height', p.lineHeight);
    document.body.style.lineHeight = p.lineHeight;

    // Editor font
    const editorFamily = FONT_FAMILIES[p.editorFont] || FONT_FAMILIES.inter;
    root.style.setProperty('--font-editor', editorFamily.stack);
    const noteBody = document.getElementById('note-body');
    if (noteBody) noteBody.style.fontFamily = editorFamily.stack;

    // Note/content max-width
    root.style.setProperty('--content-max-width', widthMap[p.noteWidth] || widthMap.normal);
    document.querySelectorAll('.editor-body, .page-body').forEach(el => {
      if (p.noteWidth !== 'full') el.style.maxWidth = widthMap[p.noteWidth] || '';
    });
  }

  // ── Init on page load ─────────────────────────────────
  function init() {
    const prefs = load();
    apply(prefs);
    return prefs;
  }

  // ── Public update ─────────────────────────────────────
  function update(changes) {
    const current = load();
    const updated = { ...current, ...changes };
    apply(updated);
    save(updated);
    return updated;
  }

  return { FONT_FAMILIES, DEFAULTS, widthMap, load, save, apply, init, update };
})();

// Apply immediately on load
document.addEventListener('DOMContentLoaded', () => FontSystem.init());
// Also apply right away (before DOMContentLoaded for faster paint)
FontSystem.init();

window.FontSystem = FontSystem;