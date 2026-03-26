/* ============================================================
   STUDYAI — NOTES MODULE
   File: public/assets/js/notes.js
   ============================================================ */
'use strict';

/* ── State ── */
const NS = { id: null, notes: [], saveTimer: null, searchQ: '' };

/* ════════════════════════════════════════════════════════════
   ENTRY
   ════════════════════════════════════════════════════════════ */
async function initNotes() {
  await _loadNotes();
  _wireNoteTabs();

  // Open first note or show empty state
  if (NS.notes.length) _openNote(NS.notes[0].id);
  else _showEmptyEditor();
}

/* ── Load notes from server ── */
async function _loadNotes(forceReload = false) {
  if (forceReload && typeof loadAllData === 'function') await loadAllData();
  const data = typeof getData === 'function' && !forceReload ? { notes: Notes.getAll() } : await apiGet('/data').catch(() => ({}));
  NS.notes = (data.notes || []).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.updated || 0) - (a.updated || 0);
  });
  _buildNoteList();
  _populateFolderFilter();
}

/* ════════════════════════════════════════════════════════════
   NOTE LIST
   ════════════════════════════════════════════════════════════ */
function _buildNoteList(notes = null) {
  const list = document.getElementById('notes-list');
  if (!list) return;

  let items = notes || NS.notes;

  // Apply search
  if (NS.searchQ) {
    const q = NS.searchQ.toLowerCase();
    items = items.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // Apply folder filter
  const ff = document.getElementById('folder-filter')?.value || 'all';
  if (ff !== 'all') items = items.filter(n => (n.folder || 'General') === ff);

  if (!items.length) {
    list.innerHTML = `
      <div class="empty-state" style="padding:30px 16px">
        <span class="empty-state-icon" style="font-size:2rem">📝</span>
        <h3 style="font-size:.88rem">No notes found</h3>
        <p>${NS.searchQ ? 'Try a different search' : 'Create your first note!'}</p>
      </div>`;
    return;
  }

  list.innerHTML = items.map(n => {
    const preview = (n.content || '').replace(/[#*`_=~\[\]]/g, '').substring(0, 90);
    const isActive = n.id === NS.id;
    return `
      <div class="note-item ${isActive ? 'active' : ''}" onclick="_openNote('${n.id}')">
        <div class="note-item-title">
          ${n.pinned ? '📌 ' : ''}${n.bookmarked ? '🔖 ' : ''}${escHtml(n.title || 'Untitled')}
        </div>
        <div class="note-item-preview">${escHtml(preview || 'Empty note')}</div>
        <div class="note-item-meta">
          <span class="badge badge-purple" style="font-size:.6rem">${n.folder || 'General'}</span>
          ${(n.tags || []).slice(0, 2).map(t => `<span class="badge badge-cyan" style="font-size:.6rem">${escHtml(t)}</span>`).join('')}
          <span class="text-xs text-muted" style="margin-left:auto">${timeAgo(n.updated || n.created)}</span>
        </div>
      </div>`;
  }).join('');
}

function _populateFolderFilter() {
  const ff = document.getElementById('folder-filter');
  if (!ff) return;
  const folders = ['General', ...new Set(NS.notes.map(n => n.folder).filter(Boolean))];
  const cur = ff.value;
  ff.innerHTML = '<option value="all">All Folders</option>' +
    folders.map(f => `<option value="${f}" ${f === cur ? 'selected' : ''}>${f}</option>`).join('');
}

function filterNotes() { _buildNoteList(); }
function searchNotes(q) { NS.searchQ = q; _buildNoteList(); }

/* ════════════════════════════════════════════════════════════
   OPEN NOTE IN EDITOR
   ════════════════════════════════════════════════════════════ */
function _openNote(id) {
  const n = NS.notes.find(x => x.id === id);
  if (!n) return;
  NS.id = id;

  const titleEl = document.getElementById('note-title');
  const bodyEl = document.getElementById('note-body');
  const folderEl = document.getElementById('note-folder');
  const tagsEl = document.getElementById('note-tags');

  if (titleEl) titleEl.value = n.title || '';
  if (bodyEl) bodyEl.value = n.content || '';
  if (folderEl) folderEl.value = n.folder || 'General';
  if (tagsEl) tagsEl.value = (n.tags || []).join(', ');

  _updateCounts();
  _renderTagsDisplay(n.tags || []);
  _setSaveStatus('Saved');
  _buildNoteList();

  // Switch to editor view if not already there
  const activeTab = document.querySelector('#notes-tabs .tab.active');
  if (activeTab && activeTab.dataset.tabTarget !== 'editor') {
    _switchView('editor');
  }
}

function _showEmptyEditor() {
  ['note-title', 'note-body', 'note-tags'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _updateCounts();
  _renderTagsDisplay([]);
}

/* ════════════════════════════════════════════════════════════
   CREATE / DELETE
   ════════════════════════════════════════════════════════════ */
async function createNote() {
  const n = {
    id: genId(), title: 'New Note', content: '', folder: 'General',
    tags: [], pinned: false, bookmarked: false,
    created: Date.now(), updated: Date.now(),
  };
  NS.notes.unshift(n);
  await _saveAllNotes();
  NS.id = n.id;
  _buildNoteList();
  _openNote(n.id);
  document.getElementById('note-title')?.focus();
  showToast('Note created!', 'success');
}

async function deleteNote() {
  if (!NS.id) return showToast('No note selected.', 'warning');
  const n = NS.notes.find(x => x.id === NS.id);
  if (!confirm(`Delete "${n?.title || 'this note'}"? This cannot be undone.`)) return;
  NS.notes = NS.notes.filter(x => x.id !== NS.id);
  NS.id = null;
  await _saveAllNotes();
  _buildNoteList();
  _populateFolderFilter();
  if (NS.notes.length) _openNote(NS.notes[0].id);
  else _showEmptyEditor();
  showToast('Note deleted.', 'info');
}

/* ════════════════════════════════════════════════════════════
   AUTO-SAVE
   ════════════════════════════════════════════════════════════ */
function onNoteInput() {
  _updateCounts();
  _setSaveStatus('Unsaved…');
  clearTimeout(NS.saveTimer);
  NS.saveTimer = setTimeout(saveNote, 900);
}

async function saveNote() {
  if (!NS.id) return;
  const idx = NS.notes.findIndex(n => n.id === NS.id);
  if (idx < 0) return;

  const title = document.getElementById('note-title')?.value.trim() || 'Untitled';
  const content = document.getElementById('note-body')?.value || '';
  const folder = document.getElementById('note-folder')?.value || 'General';
  const tagsRaw = document.getElementById('note-tags')?.value || '';
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  // Version history (keep 5)
  const prev = NS.notes[idx];
  const history = prev.history || [];
  if (prev.content && prev.content !== content) {
    history.unshift({ content: prev.content, saved: prev.updated });
    if (history.length > 5) history.pop();
  }

  NS.notes[idx] = { ...prev, title, content, folder, tags, history, updated: Date.now() };
  await _saveAllNotes();
  _renderTagsDisplay(tags);
  _setSaveStatus('Saved ✓');
  _buildNoteList();
  _populateFolderFilter();
}

async function _saveAllNotes() {
  if (typeof setData === 'function') {
    setData('notes', NS.notes);
  } else {
    await apiPost('/data/notes', { value: NS.notes }).catch(e => {
      console.error('Save failed:', e);
    });
  }
}

/* ── Counts ── */
function _updateCounts() {
  const body = document.getElementById('note-body');
  const wc = document.getElementById('word-count');
  const cc = document.getElementById('char-count');
  if (!body) return;
  const words = body.value.trim().split(/\s+/).filter(Boolean).length;
  if (wc) wc.textContent = words + ' words';
  if (cc) cc.textContent = body.value.length + ' chars';
}

function _setSaveStatus(m) {
  const el = document.getElementById('save-status');
  if (el) el.textContent = m;
}

function _renderTagsDisplay(tags) {
  const el = document.getElementById('note-tags-display');
  if (!el) return;
  el.innerHTML = tags.map(t => `<span class="badge badge-purple" style="font-size:.65rem">${escHtml(t)}</span>`).join('');
}

/* ════════════════════════════════════════════════════════════
   PIN / BOOKMARK
   ════════════════════════════════════════════════════════════ */
async function pinNote() {
  if (!NS.id) return;
  const idx = NS.notes.findIndex(n => n.id === NS.id);
  if (idx < 0) return;
  NS.notes[idx].pinned = !NS.notes[idx].pinned;
  await _saveAllNotes();
  showToast(NS.notes[idx].pinned ? 'Pinned 📌' : 'Unpinned', 'success');
  _buildNoteList();
}

async function bookmarkNote() {
  if (!NS.id) return;
  const idx = NS.notes.findIndex(n => n.id === NS.id);
  if (idx < 0) return;
  NS.notes[idx].bookmarked = !NS.notes[idx].bookmarked;
  await _saveAllNotes();
  showToast(NS.notes[idx].bookmarked ? 'Bookmarked 🔖' : 'Bookmark removed', 'success');
  _buildNoteList();
}

/* ════════════════════════════════════════════════════════════
   TOOLBAR FORMATTING
   ════════════════════════════════════════════════════════════ */
function fmt(style) {
  const ta = document.getElementById('note-body');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.substring(s, e);
  const w = { bold: '**', italic: '*', underline: '__' }[style];
  if (!w) return;
  const ins = sel ? `${w}${sel}${w}` : `${w}text${w}`;
  ta.value = ta.value.substring(0, s) + ins + ta.value.substring(e);
  ta.selectionStart = s; ta.selectionEnd = s + ins.length;
  ta.focus(); onNoteInput();
}

function insH(l) {
  const ta = document.getElementById('note-body');
  if (!ta) return;
  const p = ta.selectionStart;
  const ins = '\n' + '#'.repeat(l) + ' ';
  ta.value = ta.value.substring(0, p) + ins + ta.value.substring(p);
  ta.selectionStart = ta.selectionEnd = p + ins.length;
  ta.focus(); onNoteInput();
}

function insBullet() {
  const ta = document.getElementById('note-body');
  if (!ta) return;
  const p = ta.selectionStart;
  ta.value = ta.value.substring(0, p) + '\n- ' + ta.value.substring(p);
  ta.selectionStart = ta.selectionEnd = p + 3;
  ta.focus(); onNoteInput();
}

function insCode() {
  const ta = document.getElementById('note-body');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.substring(s, e);
  const ins = sel ? `\`\`\`\n${sel}\n\`\`\`` : '`code here`';
  ta.value = ta.value.substring(0, s) + ins + ta.value.substring(e);
  ta.selectionStart = s; ta.selectionEnd = s + ins.length;
  ta.focus(); onNoteInput();
}

function insTable() {
  const ta = document.getElementById('note-body');
  if (!ta) return;
  const p = ta.selectionStart;
  const ins = '\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n';
  ta.value = ta.value.substring(0, p) + ins + ta.value.substring(p);
  ta.selectionStart = ta.selectionEnd = p + ins.length;
  ta.focus(); onNoteInput();
}

/* ════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════ */
function exportNote() {
  if (!NS.id) return showToast('No note selected.', 'warning');
  const n = NS.notes.find(x => x.id === NS.id);
  if (!n) return;
  const text = `# ${n.title}\n\nFolder: ${n.folder}\nTags: ${(n.tags || []).join(', ') || 'none'}\nUpdated: ${new Date(n.updated).toLocaleString()}\n\n---\n\n${n.content || ''}`;
  downloadMD(text, (n.title || 'note').replace(/\s+/g, '_') + '.md');
  showToast('Note exported!', 'success');
}

/* ════════════════════════════════════════════════════════════
   FILE UPLOAD
   ════════════════════════════════════════════════════════════ */
function triggerUpload() { document.getElementById('file-upload')?.click(); }

async function handleFileUpload(inp) {
  const file = inp.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const n = {
      id: genId(),
      title: file.name.replace(/\.(txt|md)$/, '').replace(/_/g, ' '),
      content: e.target.result,
      folder: 'General', tags: ['imported'],
      pinned: false, bookmarked: false,
      created: Date.now(), updated: Date.now(),
    };
    NS.notes.unshift(n);
    await _saveAllNotes();
    NS.id = n.id;
    _buildNoteList();
    _openNote(n.id);
    showToast(`"${n.title}" imported!`, 'success');
  };
  reader.readAsText(file);
  inp.value = '';
}

/* ════════════════════════════════════════════════════════════
   AI ACTIONS (call real backend)
   ════════════════════════════════════════════════════════════ */
async function aiSummaryFromNote() {
  if (!NS.id) return showToast('Open a note first.', 'warning');
  const n = NS.notes.find(x => x.id === NS.id);
  if (!n?.content?.trim()) return showToast('Note is empty.', 'warning');

  const titleEl = document.getElementById('modal-summary-title');
  const bodyEl = document.getElementById('modal-summary-body');
  if (titleEl) titleEl.textContent = `Summary: ${n.title}`;
  if (bodyEl) bodyEl.innerHTML = spinnerHTML('Generating summary with AI…');
  openModal('modal-summary');

  try {
    const data = await apiPost('/ai/summarise', { text: n.content, type: 'general', noteTitle: n.title });
    if (bodyEl) bodyEl.innerHTML = mdToHtml(data.summary);

    // Save to summaries
    const d = await apiGet('/data').catch(() => ({}));
    const sums = d.summaries || [];
    sums.unshift({ id: genId(), noteId: n.id, noteTitle: n.title, type: 'general', content: data.summary, topics: [], created: Date.now() });
    await apiPost('/data/summaries', { value: sums });
    showToast('Summary generated!', 'success');
  } catch (e) {
    if (bodyEl) bodyEl.innerHTML = `<div style="color:var(--red)">Error: ${escHtml(e.message)}</div>`;
    showToast('AI Error: ' + e.message, 'error');
  }
}

function exportSummaryView() {
  const title = document.getElementById('modal-summary-title')?.textContent || 'Summary';
  const body = document.getElementById('modal-summary-body')?.innerText || '';
  if (!body.trim()) return;
  downloadMD(`# ${title}\n\n${body}`, title.replace(/\s+/g, '_') + '.md');
  showToast('Exported!', 'success');
}

function aiQuizFromNote() {
  if (!NS.id) return showToast('Open a note first.', 'warning');
  window.location.href = `/quiz.html?noteId=${NS.id}`;
}

function aiFlashFromNote() {
  if (!NS.id) return showToast('Open a note first.', 'warning');
  window.location.href = `/flashcards.html?noteId=${NS.id}`;
}

/* ════════════════════════════════════════════════════════════
   GRID VIEWS
   ════════════════════════════════════════════════════════════ */
function _buildGridView(containerId, notes) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!notes.length) {
    el.innerHTML = emptyState('📝', 'Nothing here yet', '');
    return;
  }
  el.innerHTML = notes.map(n => `
    <div class="note-grid-card" onclick="_openNote('${n.id}');_switchView('editor')">
      <div class="note-grid-title">${n.pinned ? '📌 ' : ''}${escHtml(n.title || 'Untitled')}</div>
      <div class="note-grid-preview">${escHtml((n.content || '').replace(/[#*`_]/g, '').substring(0, 200) || 'Empty note')}</div>
      <div class="note-item-meta" style="margin-top:10px">
        <span class="badge badge-purple" style="font-size:.6rem">${n.folder || 'General'}</span>
        <span class="text-xs text-muted" style="margin-left:auto">${timeAgo(n.updated || n.created)}</span>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   TAB SWITCHER
   ════════════════════════════════════════════════════════════ */
function _wireNoteTabs() {
  document.querySelectorAll('#notes-tabs .tab').forEach(tab => {
    tab.onclick = () => _switchView(tab.dataset.tabTarget, tab);
  });
}

function _switchView(view, tabEl) {
  // Update tabs
  document.querySelectorAll('#notes-tabs .tab').forEach(t => t.classList.remove('active'));
  const active = tabEl || document.querySelector(`#notes-tabs .tab[data-tab-target="${view}"]`);
  if (active) active.classList.add('active');

  // Show/hide views
  const views = { editor: 'view-editor', grid: 'view-grid', pinned: 'view-pinned', bookmarks: 'view-bookmarks' };
  Object.entries(views).forEach(([v, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = v === view ? (v === 'editor' ? 'flex' : 'block') : 'none';
  });

  // Build grid views
  if (view === 'grid') _buildGridView('notes-grid-container', NS.notes);
  if (view === 'pinned') _buildGridView('notes-pinned-container', NS.notes.filter(n => n.pinned));
  if (view === 'bookmarks') _buildGridView('notes-bookmarks-container', NS.notes.filter(n => n.bookmarked));
}

/* ── PDF Upload (added by pdf-upload.js) ── */
function openPDFUpload() {
  showPDFUploader({
    label: 'PDF text will be saved as a new note',
    onSuccess: (result) => {
      // Reload notes list and open the new note
      _loadNotes().then(() => {
        if (result.noteId) _openNote(result.noteId);
      });
    },
  });
}