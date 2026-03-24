/* ============================================================
   STUDYAI — PDF UPLOAD MODULE
   File: public/assets/js/pdf-upload.js
   Shared by: notes.html  chat.html  summaries.html

   Usage:
     showPDFUploader({
       onSuccess: (result) => { result.text, result.title, result.pages, result.wordCount }
       label    : 'optional custom label'
     })
   ============================================================ */
'use strict';

/* ── Inject PDF uploader overlay ── */
function showPDFUploader({ onSuccess, label = '' }) {
  // Remove any existing uploader
  document.getElementById('pdf-uploader-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id    = 'pdf-uploader-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;
    background:rgba(0,0,0,.7);
    backdrop-filter:blur(8px);
    z-index:800;
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    animation:toastIn .25s ease;
  `;

  overlay.innerHTML = `
    <div id="pdf-uploader-box" style="
      background:rgba(19,22,41,.98);
      border:1px solid rgba(102,126,234,.25);
      border-radius:20px;
      padding:32px;
      width:100%;max-width:480px;
      box-shadow:0 24px 60px rgba(0,0,0,.5);
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">
        <div>
          <div style="font-family:inherit;font-weight:800;font-size:1.05rem;
               background:linear-gradient(135deg,#667eea,#f093fb);
               -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
            📄 Upload PDF
          </div>
          ${label ? `<div style="font-size:.78rem;color:var(--text-muted,#9ca3c0);margin-top:2px">${escHtml(label)}</div>` : ''}
        </div>
        <button onclick="closePDFUploader()" style="
          width:30px;height:30px;border-radius:8px;
          background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;font-size:1rem;color:#9ca3c0;transition:.15s;
        " onmouseover="this.style.color='#f5576c'" onmouseout="this.style.color='#9ca3c0'">✕</button>
      </div>

      <!-- Drop zone -->
      <div id="pdf-drop-zone" style="
        border:2px dashed rgba(102,126,234,.35);
        border-radius:14px;
        padding:36px 24px;
        text-align:center;
        cursor:pointer;
        transition:all .2s;
        background:rgba(102,126,234,.04);
        position:relative;
      "
        ondragover="pdfDragOver(event)"
        ondragleave="pdfDragLeave(event)"
        ondrop="pdfDrop(event)"
        onclick="document.getElementById('pdf-file-input').click()"
      >
        <div style="font-size:2.8rem;margin-bottom:12px;opacity:.7">📄</div>
        <div style="font-size:.92rem;font-weight:600;color:#f0f2ff;margin-bottom:6px">
          Drop your PDF here
        </div>
        <div style="font-size:.78rem;color:#9ca3c0;margin-bottom:14px">
          or click to browse · Max 20MB
        </div>
        <div style="
          display:inline-flex;align-items:center;gap:6px;
          padding:7px 16px;border-radius:100px;
          background:linear-gradient(135deg,rgba(102,126,234,.2),rgba(240,147,251,.12));
          border:1px solid rgba(102,126,234,.3);
          font-size:.78rem;font-weight:600;color:#a78bfa;
        ">
          📁 Choose PDF
        </div>
        <input type="file" id="pdf-file-input" accept=".pdf,application/pdf" style="display:none"
               onchange="pdfFileSelected(this)"/>
      </div>

      <!-- Info -->
      <div style="margin-top:14px;font-size:.74rem;color:#6b7280;line-height:1.6">
        ✓ Extracts text from text-based PDFs (lecture notes, textbooks, papers)<br>
        ✗ Does not work on scanned image PDFs (use a text-based PDF)
      </div>

      <!-- Progress (hidden by default) -->
      <div id="pdf-progress" style="display:none;margin-top:16px">
        <div style="display:flex;align-items:center;gap:10px;color:#9ca3c0;font-size:.84rem;margin-bottom:10px">
          <div style="width:16px;height:16px;border:2px solid rgba(102,126,234,.2);border-top-color:#667eea;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0"></div>
          <span id="pdf-progress-text">Extracting text…</span>
        </div>
        <div style="height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden">
          <div id="pdf-progress-bar" style="height:100%;border-radius:3px;background:linear-gradient(90deg,#667eea,#f093fb);width:0%;transition:width .4s ease"></div>
        </div>
      </div>

      <!-- Result preview (hidden by default) -->
      <div id="pdf-result" style="display:none;margin-top:16px">
        <div style="background:rgba(67,233,123,.07);border:1px solid rgba(67,233,123,.18);border-radius:10px;padding:12px 14px">
          <div style="font-weight:600;color:#43e97b;margin-bottom:5px">✓ PDF extracted successfully!</div>
          <div id="pdf-result-info" style="font-size:.78rem;color:#9ca3c0;line-height:1.6"></div>
        </div>
        <button id="pdf-save-btn" onclick="pdfSaveAsNote()" style="
          width:100%;margin-top:10px;padding:10px;border-radius:10px;
          background:linear-gradient(135deg,#667eea,#f093fb);
          color:#fff;font-family:inherit;font-size:.88rem;font-weight:700;
          border:none;cursor:pointer;transition:.18s;
        " onmouseover="this.style.filter='brightness(1.08)'" onmouseout="this.style.filter=''">
          💾 Save as Note
        </button>
      </div>

      <!-- Error (hidden by default) -->
      <div id="pdf-error" style="display:none;margin-top:14px;
        background:rgba(245,87,108,.08);border:1px solid rgba(245,87,108,.22);
        border-radius:10px;padding:11px 14px;font-size:.82rem;color:#f5576c;line-height:1.5">
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Store callback
  window._pdfOnSuccess = onSuccess;
  window._pdfExtracted = null;
}

function closePDFUploader() {
  document.getElementById('pdf-uploader-overlay')?.remove();
  window._pdfOnSuccess  = null;
  window._pdfExtracted  = null;
}

/* ── Drag & Drop ── */
function pdfDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('pdf-drop-zone');
  if (dz) {
    dz.style.borderColor  = '#667eea';
    dz.style.background   = 'rgba(102,126,234,.1)';
    dz.style.transform    = 'scale(1.02)';
  }
}

function pdfDragLeave(e) {
  const dz = document.getElementById('pdf-drop-zone');
  if (dz) {
    dz.style.borderColor  = 'rgba(102,126,234,.35)';
    dz.style.background   = 'rgba(102,126,234,.04)';
    dz.style.transform    = '';
  }
}

function pdfDrop(e) {
  e.preventDefault();
  pdfDragLeave(e);
  const file = e.dataTransfer?.files?.[0];
  if (file) _processPDFFile(file);
}

function pdfFileSelected(inp) {
  const file = inp.files?.[0];
  if (file) _processPDFFile(file);
  inp.value = ''; // reset so same file can be re-selected
}

/* ── Process the PDF file ── */
async function _processPDFFile(file) {
  // Validate client-side first
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    _showPDFError('Please select a PDF file (.pdf).');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    _showPDFError('File is too large. Maximum size is 20MB.');
    return;
  }

  _showPDFProgress('Uploading PDF…', 15);

  try {
    // Build FormData
    const formData = new FormData();
    formData.append('pdf', file);

    _showPDFProgress('Extracting text…', 40);

    const response = await fetch('/api/upload/pdf', {
      method : 'POST',
      headers: { 'Authorization': 'Bearer ' + (getToken?.() || '') },
      body   : formData,
    });

    _showPDFProgress('Processing…', 75);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error during PDF extraction.');
    }

    _showPDFProgress('Done!', 100);

    // Store extracted data
    window._pdfExtracted = data;

    // Show result
    setTimeout(() => {
      _showPDFResult(data);
    }, 400);

  } catch (err) {
    _showPDFError(err.message || 'Failed to process PDF. Please try again.');
  }
}

/* ── Save extracted PDF text as a note ── */
async function pdfSaveAsNote() {
  const data = window._pdfExtracted;
  if (!data) return;

  const btn = document.getElementById('pdf-save-btn');
  if (btn) { btn.textContent = '⏳ Saving…'; btn.disabled = true; }

  try {
    // Load existing notes
    const existing = await fetch('/api/data/notes', {
      headers: { 'Authorization': 'Bearer ' + (getToken?.() || '') }
    }).then(r => r.json()).catch(() => ({ value: [] }));

    const notes = existing.value || [];
    const now   = Date.now();
    const newNote = {
      id      : now.toString(36) + Math.random().toString(36).slice(2,7),
      title   : data.title || 'PDF Note',
      content : data.text,
      folder  : 'General',
      tags    : ['pdf', 'imported'],
      pinned  : false,
      bookmarked: false,
      created : now,
      updated : now,
      source  : 'pdf',
      pdfMeta : { pages: data.pages, words: data.wordCount },
    };

    notes.unshift(newNote);

    await fetch('/api/data/notes', {
      method : 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+(getToken?.()|| '') },
      body   : JSON.stringify({ value: notes }),
    });

    // Call the page's callback
    if (typeof window._pdfOnSuccess === 'function') {
      window._pdfOnSuccess({ ...data, noteId: newNote.id, note: newNote });
    }

    closePDFUploader();
    showToast?.(`"${data.title}" saved as note! (${data.pages} page${data.pages!==1?'s':''}, ${data.wordCount.toLocaleString()} words)`, 'success', 5000);

  } catch (err) {
    _showPDFError('Failed to save note: ' + err.message);
    if (btn) { btn.textContent = '💾 Save as Note'; btn.disabled = false; }
  }
}

/* ── UI state helpers ── */
function _showPDFProgress(text, pct) {
  document.getElementById('pdf-result')?.style && (document.getElementById('pdf-result').style.display = 'none');
  document.getElementById('pdf-error')?.style  && (document.getElementById('pdf-error').style.display  = 'none');

  const prog = document.getElementById('pdf-progress');
  if (prog) prog.style.display = 'block';

  const ptxt = document.getElementById('pdf-progress-text');
  if (ptxt) ptxt.textContent = text;

  const pbar = document.getElementById('pdf-progress-bar');
  if (pbar) pbar.style.width = pct + '%';
}

function _showPDFResult(data) {
  document.getElementById('pdf-progress').style.display = 'none';
  document.getElementById('pdf-error').style.display    = 'none';

  const res = document.getElementById('pdf-result');
  if (res) res.style.display = 'block';

  const info = document.getElementById('pdf-result-info');
  if (info) info.innerHTML = `
    <strong style="color:#f0f2ff">${escHtml(data.title)}</strong><br>
    📄 ${data.pages} page${data.pages!==1?'s':''} &nbsp;·&nbsp;
    📝 ${(data.wordCount||0).toLocaleString()} words &nbsp;·&nbsp;
    🔤 ${(data.charCount||0).toLocaleString()} characters
  `;
}

function _showPDFError(msg) {
  document.getElementById('pdf-progress').style.display = 'none';
  document.getElementById('pdf-result').style.display   = 'none';

  const errEl = document.getElementById('pdf-error');
  if (errEl) { errEl.textContent = '⚠️ ' + msg; errEl.style.display = 'block'; }

  // Reset drop zone
  const dz = document.getElementById('pdf-drop-zone');
  if (dz) {
    dz.style.borderColor = 'rgba(245,87,108,.4)';
    setTimeout(() => { dz.style.borderColor = 'rgba(102,126,234,.35)'; }, 2500);
  }
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}