/* ============================================================
   STUDYAI — events.js
   Global event delegation — replaces ALL remaining inline handlers.
   Include this on every page AFTER utils.js and the page JS.

   Pattern: elements get data-action="actionName" instead of onclick="".
   This file handles ALL common actions centrally.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Modal close buttons (data-close="modal-id") ────────
  document.addEventListener('click', e => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) closeModal(closeBtn.dataset.close);
  });

  // ── 2. Modal open buttons (data-open="modal-id") ──────────
  document.addEventListener('click', e => {
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) openModal(openBtn.dataset.open);
  });

  // ── 3. Tab switching (data-tab-group + data-tab-target) ───
  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab-target]');
    if (!tab) return;
    const group  = tab.dataset.tabGroup;
    const target = tab.dataset.tabTarget;
    // Deactivate all tabs in group
    document.querySelectorAll(`[data-tab-group="${group}"]`).forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    // Show correct panel
    const panelGroup = tab.dataset.panelGroup || group + '-panels';
    document.querySelectorAll(`[data-panel-group="${panelGroup}"]`).forEach(p => {
      p.style.display = p.dataset.panel === target ? '' : 'none';
    });
  });

  // ── 4. Logout buttons (data-action="logout") ──────────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="logout"]');
    if (btn && typeof doLogout === 'function') doLogout();
  });

  // ── 5. Copy text (data-copy="text to copy") ───────────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-copy]');
    if (btn && typeof copyText === 'function') copyText(btn.dataset.copy);
  });

  // ── 6. Navigate (data-href="/page.html") ──────────────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-href]');
    if (btn) window.location.href = btn.dataset.href;
  });

  // ── 7. Toggle theme (data-action="toggle-theme") ──────────
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="toggle-theme"]');
    if (!btn) return;
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('sa_theme', t);
    btn.textContent = t === 'dark' ? '☀️' : '🌙';
  });

  // ── 8. Auto-resize textareas (data-autoresize) ────────────
  document.querySelectorAll('textarea[data-autoresize]').forEach(ta => {
    ta.addEventListener('input', function() { autoResize && autoResize(this); });
  });

  // ── 9. Keyboard shortcut: Ctrl+N → notes ──────────────────
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.target.matches('input,textarea')) {
      e.preventDefault();
      window.location.href = '/notes.html';
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.target.matches('input,textarea')) {
      e.preventDefault();
      window.location.href = '/chat.html';
    }
  });

});

/* ── Convenience wrappers used by HTML data-action buttons ── */
// These are thin wrappers that call the page's own functions safely.
function _safeCall(fnName, ...args) {
  if (typeof window[fnName] === 'function') window[fnName](...args);
  else console.warn(`[events.js] Function not found: ${fnName}`);
}