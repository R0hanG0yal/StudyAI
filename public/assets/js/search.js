/* ============================================================
   STUDYAI — search.js  (Part 6)
   Full-text search across all notes:
   - TF-IDF inspired ranking
   - Real-time results as you type
   - Result highlighting
   - Keyboard navigation (↑↓ Enter Escape)
   - Search across title, content, tags, folder
   ============================================================ */

const GlobalSearch = (function() {

  let _notes       = [];
  let _isOpen      = false;
  let _selectedIdx = -1;
  let _results     = [];
  let _ui          = null;
  let _debounceTimer = null;

  // ── Build search index ────────────────────────────────
  function buildIndex(notes) {
    _notes = (notes || []).map(note => ({
      id      : note.id,
      title   : note.title   || '',
      content : note.content || '',
      folder  : note.folder  || '',
      tags    : (note.tags || []).join(' '),
      updated : note.updated || note.created || 0,
      // Precomputed lowercased fields for fast search
      _titleLow  : (note.title   || '').toLowerCase(),
      _contentLow: (note.content || '').toLowerCase().slice(0, 5000),
      _tagsLow   : (note.tags || []).join(' ').toLowerCase(),
      _folderLow : (note.folder  || '').toLowerCase(),
    }));
  }

  // ── Search with TF-IDF style ranking ──────────────────
  function search(query, maxResults = 12) {
    if (!query || query.trim().length < 1) return [];

    const terms = query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const results = [];

    for (const note of _notes) {
      let score = 0;

      for (const term of terms) {
        // Title match — highest weight
        if (note._titleLow.includes(term)) {
          score += note._titleLow === term ? 100 : // Exact title match
                   note._titleLow.startsWith(term) ? 60 :
                   40;
        }
        // Tag match — high weight
        if (note._tagsLow.includes(term)) score += 30;
        // Folder match
        if (note._folderLow.includes(term)) score += 20;
        // Content match — lower weight, count occurrences
        const contentMatches = (note._contentLow.match(new RegExp(_escapeRegex(term), 'g')) || []).length;
        score += Math.min(contentMatches * 5, 25); // cap at 25 per term
      }

      // Recency boost (up to +10 for very recent notes)
      const ageMs = Date.now() - note.updated;
      const ageDays = ageMs / 86400000;
      if (ageDays < 1)  score += 10;
      else if (ageDays < 7)  score += 5;
      else if (ageDays < 30) score += 2;

      if (score > 0) {
        results.push({
          note,
          score,
          snippet: _buildSnippet(note._contentLow, terms),
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  // ── Build result snippet with highlighting ────────────
  function _buildSnippet(content, terms) {
    if (!content) return '';
    const MAX_LEN = 140;

    // Find best position (first term occurrence)
    let bestPos = 0;
    for (const term of terms) {
      const pos = content.indexOf(term);
      if (pos !== -1) { bestPos = Math.max(0, pos - 40); break; }
    }

    let snippet = content.slice(bestPos, bestPos + MAX_LEN);
    if (bestPos > 0) snippet = '…' + snippet;
    if (bestPos + MAX_LEN < content.length) snippet += '…';

    // Highlight terms
    for (const term of terms) {
      snippet = snippet.replace(
        new RegExp(`(${_escapeRegex(term)})`, 'gi'),
        '<mark style="background:rgba(102,126,234,.25);color:var(--purple);border-radius:3px;padding:0 2px">$1</mark>'
      );
    }

    return snippet;
  }

  function _highlightTitle(title, terms) {
    let result = escHtml ? escHtml(title) : title.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    for (const term of terms) {
      result = result.replace(
        new RegExp(`(${_escapeRegex(term)})`, 'gi'),
        '<mark style="background:rgba(102,126,234,.25);color:var(--purple);border-radius:3px;padding:0 2px">$1</mark>'
      );
    }
    return result;
  }

  function _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ── UI: create search overlay ─────────────────────────
  function createUI() {
    if (_ui) return;

    _ui = document.createElement('div');
    _ui.id = 'global-search-overlay';
    _ui.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,.6);backdrop-filter:blur(8px);
      z-index:10000;display:none;align-items:flex-start;justify-content:center;
      padding:80px 20px 20px;
    `;
    _ui.innerHTML = `
      <div id="gs-panel" style="
        background:var(--bg-card);border:1px solid var(--border);border-radius:20px;
        width:100%;max-width:600px;overflow:hidden;
        box-shadow:0 32px 80px rgba(0,0,0,.4);
        animation:gsIn .2s ease;
      ">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
          <span style="font-size:1.1rem;opacity:.5">🔍</span>
          <input id="gs-input" type="search" placeholder="Search notes, topics, tags…"
            style="flex:1;background:transparent;border:none;color:var(--text);font-size:1rem;outline:none;font-family:var(--font)"
            autocomplete="off" spellcheck="false"/>
          <div id="gs-count" style="font-size:.74rem;color:var(--text-muted);white-space:nowrap"></div>
          <button id="gs-close" style="background:rgba(100,110,160,.12);border:1px solid var(--border);color:var(--text-muted);width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:.78rem">✕</button>
        </div>
        <div id="gs-results" style="max-height:440px;overflow-y:auto;padding:8px"></div>
        <div id="gs-footer" style="padding:10px 18px;border-top:1px solid var(--border);display:flex;gap:12px;font-size:.7rem;color:var(--text-muted)">
          <span><kbd style="padding:1px 5px;background:rgba(255,255,255,.08);border-radius:4px">↑↓</kbd> navigate</span>
          <span><kbd style="padding:1px 5px;background:rgba(255,255,255,.08);border-radius:4px">Enter</kbd> open</span>
          <span><kbd style="padding:1px 5px;background:rgba(255,255,255,.08);border-radius:4px">Esc</kbd> close</span>
        </div>
      </div>`;

    // CSS animation
    const style = document.createElement('style');
    style.textContent = '@keyframes gsIn{from{opacity:0;transform:scale(.95) translateY(-10px)}to{opacity:1;transform:none}}';
    document.head.appendChild(style);

    document.body.appendChild(_ui);

    // Bind events
    document.getElementById('gs-close')?.addEventListener('click', close);
    _ui.addEventListener('click', e => { if (e.target === _ui) close(); });

    document.getElementById('gs-input')?.addEventListener('input', e => {
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => _runSearch(e.target.value), 150);
    });

    document.getElementById('gs-input')?.addEventListener('keydown', e => {
      if (e.key === 'Escape')    { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); _moveSelection(1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); _moveSelection(-1); }
      if (e.key === 'Enter')     { e.preventDefault(); _openSelected(); }
    });
  }

  // ── Run search and render ─────────────────────────────
  function _runSearch(query) {
    const terms   = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    _results      = search(query);
    _selectedIdx  = _results.length > 0 ? 0 : -1;

    const countEl   = document.getElementById('gs-count');
    const resultsEl = document.getElementById('gs-results');
    if (!resultsEl) return;

    if (!query.trim()) {
      resultsEl.innerHTML = _renderEmpty('Start typing to search your notes…', '🔍');
      if (countEl) countEl.textContent = '';
      return;
    }

    if (!_results.length) {
      resultsEl.innerHTML = _renderEmpty(`No notes found for "${query}"`, '📭');
      if (countEl) countEl.textContent = '';
      return;
    }

    if (countEl) countEl.textContent = `${_results.length} result${_results.length !== 1 ? 's' : ''}`;

    resultsEl.innerHTML = _results.map((r, i) => `
      <div class="gs-result ${i === 0 ? 'gs-selected' : ''}" data-idx="${i}" style="
        padding:12px 16px;border-radius:12px;cursor:pointer;transition:all .12s;margin-bottom:3px;
        background:${i === 0 ? 'rgba(102,126,234,.1)' : 'transparent'};
        border:1px solid ${i === 0 ? 'rgba(102,126,234,.2)' : 'transparent'};
      ">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">
          <span style="font-size:.78rem;padding:2px 8px;background:rgba(102,126,234,.1);border-radius:100px;color:var(--purple);white-space:nowrap">${r.note.folder || 'General'}</span>
          <div style="font-size:.88rem;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_highlightTitle(r.note.title || 'Untitled', terms)}</div>
        </div>
        ${r.snippet ? `<div style="font-size:.76rem;color:var(--text-muted);line-height:1.5">${r.snippet}</div>` : ''}
      </div>`).join('');

    resultsEl.querySelectorAll('.gs-result').forEach(el => {
      el.addEventListener('mouseenter', () => { _selectedIdx = parseInt(el.dataset.idx); _updateSelection(); });
      el.addEventListener('click', () => _openNote(_results[parseInt(el.dataset.idx)]?.note));
    });
  }

  function _renderEmpty(msg, icon) {
    return `<div style="padding:32px;text-align:center;color:var(--text-muted)">
      <div style="font-size:2.5rem;margin-bottom:12px;opacity:.3">${icon}</div>
      <div style="font-size:.86rem">${msg}</div>
    </div>`;
  }

  function _moveSelection(dir) {
    if (!_results.length) return;
    _selectedIdx = (_selectedIdx + dir + _results.length) % _results.length;
    _updateSelection();
    // Scroll into view
    const el = document.querySelector(`.gs-result[data-idx="${_selectedIdx}"]`);
    el?.scrollIntoView({ block:'nearest' });
  }

  function _updateSelection() {
    document.querySelectorAll('.gs-result').forEach((el, i) => {
      const isSelected = i === _selectedIdx;
      el.style.background = isSelected ? 'rgba(102,126,234,.1)' : 'transparent';
      el.style.borderColor = isSelected ? 'rgba(102,126,234,.2)' : 'transparent';
      if (isSelected) el.classList.add('gs-selected'); else el.classList.remove('gs-selected');
    });
  }

  function _openSelected() {
    if (_selectedIdx >= 0 && _results[_selectedIdx]) {
      _openNote(_results[_selectedIdx].note);
    }
  }

  function _openNote(note) {
    if (!note) return;
    close();
    // Navigate to notes page with note pre-selected
    const url = new URL('/notes.html', window.location.origin);
    url.searchParams.set('note', note.id);
    window.location.href = url.toString();
  }

  // ── Open / Close ──────────────────────────────────────
  async function open() {
    if (!_ui) createUI();

    // Load fresh notes
    const data = await getData().catch(() => ({}));
    buildIndex(data.notes || []);

    _ui.style.display = 'flex';
    _isOpen = true;
    setTimeout(() => document.getElementById('gs-input')?.focus(), 50);
    document.getElementById('gs-results').innerHTML = _renderEmpty('Start typing to search your notes…', '🔍');
    document.getElementById('gs-count').textContent = '';
    document.getElementById('gs-input').value = '';
  }

  function close() {
    if (_ui) _ui.style.display = 'none';
    _isOpen = false;
    _results = [];
    _selectedIdx = -1;
  }

  function isOpen() { return _isOpen; }

  // ── Keyboard shortcut: Ctrl/Cmd+F ────────────────────
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.target.matches('input,textarea')) {
      e.preventDefault();
      _isOpen ? close() : open();
    }
    if (e.key === 'Escape' && _isOpen) close();
  });

  return { open, close, isOpen, buildIndex, search };

})();

// ── Add search button to topbar (injected after sidebar builds) ─
document.addEventListener('DOMContentLoaded', () => {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  const searchBtn = document.createElement('button');
  searchBtn.id = 'topbar-search-btn';
  searchBtn.title = 'Search notes (Ctrl+F)';
  searchBtn.setAttribute('aria-label', 'Search notes');
  searchBtn.style.cssText = `
    background:rgba(100,110,160,.1);border:1px solid var(--border);border-radius:9px;
    padding:6px 12px;cursor:pointer;font-size:.78rem;color:var(--text-muted);
    transition:all .18s;display:flex;align-items:center;gap:6px;
  `;
  searchBtn.innerHTML = `🔍 <span style="opacity:.6">Ctrl+F</span>`;
  searchBtn.addEventListener('click', () => GlobalSearch.open());
  searchBtn.addEventListener('mouseenter', () => searchBtn.style.borderColor='rgba(102,126,234,.3)');
  searchBtn.addEventListener('mouseleave', () => searchBtn.style.borderColor='var(--border)');

  // Insert before theme toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) topbar.insertBefore(searchBtn, themeBtn);
  else topbar.appendChild(searchBtn);
});