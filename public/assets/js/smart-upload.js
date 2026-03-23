/* ============================================================
   STUDYAI — SMART UNIVERSAL UPLOAD
   File: public/assets/js/smart-upload.js

   Handles: Images (JPG/PNG/WEBP/GIF), PDFs (text + scanned), DOCX
   AI reads and analyses everything via Groq Vision

   Usage:
     openSmartUpload({
       onSuccess : (result) => { result.text, result.title, result.type, ... }
       pageHint  : 'notes' | 'chat' | 'summaries' | 'quiz' | 'flashcards'
     });
   ============================================================ */
'use strict';

/* ── Accepted extensions + display names ── */
const SU_ACCEPT = '.pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.gif,.bmp';
const SU_TYPES  = {
  'image/jpeg':'🖼️ Image', 'image/jpg':'🖼️ Image',
  'image/png' :'🖼️ Image', 'image/webp':'🖼️ Image',
  'image/gif' :'🖼️ Image', 'image/bmp' :'🖼️ Image',
  'application/pdf':'📄 PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'📝 Word Doc',
  'application/msword':'📝 Word Doc',
};

/* ════════════════════════════════════════════════════════════
   OPEN MODAL
   ════════════════════════════════════════════════════════════ */
function openSmartUpload({ onSuccess, pageHint = 'notes' } = {}) {
  document.getElementById('su-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id    = 'su-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(10px);' +
    'z-index:800;display:flex;align-items:center;justify-content:center;padding:20px;' +
    'animation:toastIn .25s ease';

  overlay.innerHTML = `
<div id="su-box" style="
  background:rgba(12,15,35,.97);
  border:1px solid rgba(102,126,234,.22);
  border-radius:22px;
  padding:28px;
  width:100%;max-width:520px;
  box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 0 1px rgba(102,126,234,.08);
  position:relative;
">

  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
    <div>
      <div style="font-family:'Syne',var(--font-display,sans-serif);font-weight:800;font-size:1.05rem;
        background:linear-gradient(135deg,#667eea,#f093fb);-webkit-background-clip:text;
        -webkit-text-fill-color:transparent;background-clip:text;margin-bottom:3px">
        🧠 Smart File Upload
      </div>
      <div style="font-size:.74rem;color:#6b7280">
        AI reads images, scanned PDFs, Word docs — everything
      </div>
    </div>
    <button onclick="closeSmartUpload()" style="
      width:28px;height:28px;border-radius:8px;cursor:pointer;
      background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);
      display:flex;align-items:center;justify-content:center;
      color:#9ca3c0;font-size:1rem;flex-shrink:0;transition:.15s;
    " onmouseover="this.style.color='#f5576c'" onmouseout="this.style.color='#9ca3c0'">✕</button>
  </div>

  <!-- Supported types badges -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
    ${[['🖼️','Images','JPG·PNG·WEBP·GIF','rgba(79,172,254,.12)','rgba(79,172,254,.3)','#4facfe'],
       ['📄','PDF','Text + Scanned','rgba(102,126,234,.12)','rgba(102,126,234,.3)','#667eea'],
       ['📝','Word','DOCX · DOC','rgba(67,233,123,.1)','rgba(67,233,123,.25)','#43e97b']]
      .map(([ico,lbl,sub,bg,bc,tc])=>`
        <div style="padding:6px 11px;background:${bg};border:1px solid ${bc};border-radius:8px;font-size:.7rem">
          <span>${ico}</span>
          <span style="font-weight:700;color:${tc};margin:0 3px">${lbl}</span>
          <span style="color:#6b7280">${sub}</span>
        </div>`).join('')}
  </div>

  <!-- Drop zone -->
  <div id="su-dropzone" style="
    border:2px dashed rgba(102,126,234,.3);border-radius:14px;padding:32px 20px;
    text-align:center;cursor:pointer;transition:all .2s;
    background:rgba(102,126,234,.03);position:relative;
  "
    ondragover="suDragOver(event)" ondragleave="suDragLeave(event)" ondrop="suDrop(event)"
    onclick="document.getElementById('su-file-inp').click()"
  >
    <div id="su-dz-content">
      <div style="font-size:2.6rem;margin-bottom:10px">📂</div>
      <div style="font-size:.92rem;font-weight:600;color:#f0f2ff;margin-bottom:5px">
        Drop any file here
      </div>
      <div style="font-size:.76rem;color:#6b7280;margin-bottom:14px">
        or click to browse · Max 25MB
      </div>
      <div style="
        display:inline-flex;align-items:center;gap:6px;
        padding:7px 18px;border-radius:100px;
        background:linear-gradient(135deg,rgba(102,126,234,.2),rgba(240,147,251,.12));
        border:1px solid rgba(102,126,234,.3);
        font-size:.78rem;font-weight:600;color:#a78bfa;
      ">📁 Choose File</div>
    </div>
    <input type="file" id="su-file-inp"
      accept="${SU_ACCEPT}"
      style="display:none" onchange="suFileSelected(this)"/>
  </div>

  <!-- Image preview (hidden) -->
  <div id="su-img-preview" style="display:none;margin-top:12px;text-align:center">
    <img id="su-preview-img" style="max-width:100%;max-height:180px;border-radius:10px;object-fit:contain;border:1px solid rgba(255,255,255,.08)"/>
  </div>

  <!-- Progress (hidden) -->
  <div id="su-progress" style="display:none;margin-top:14px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:16px;height:16px;border:2px solid rgba(102,126,234,.15);border-top-color:#667eea;
        border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0"></div>
      <span id="su-progress-txt" style="font-size:.82rem;color:#9ca3c0"></span>
    </div>
    <div style="height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
      <div id="su-progress-bar" style="height:100%;border-radius:2px;width:0%;
        background:linear-gradient(90deg,#667eea,#f093fb);transition:width .4s ease"></div>
    </div>
  </div>

  <!-- Error (hidden) -->
  <div id="su-error" style="display:none;margin-top:12px;
    background:rgba(245,87,108,.08);border:1px solid rgba(245,87,108,.2);
    border-radius:10px;padding:11px 14px;font-size:.82rem;color:#f5576c;line-height:1.5">
  </div>

  <!-- Result (hidden) -->
  <div id="su-result" style="display:none;margin-top:14px">
    <!-- Info bar -->
    <div id="su-result-info" style="
      background:rgba(67,233,123,.07);border:1px solid rgba(67,233,123,.18);
      border-radius:10px;padding:11px 14px;margin-bottom:12px;
    "></div>

    <!-- AI analysis preview -->
    <div id="su-ai-analysis" style="display:none;
      background:rgba(102,126,234,.07);border:1px solid rgba(102,126,234,.18);
      border-radius:10px;padding:11px 14px;margin-bottom:12px;
      font-size:.8rem;color:#d1d5db;line-height:1.65;
    "></div>

    <!-- Text preview -->
    <div style="margin-bottom:12px">
      <div style="font-size:.72rem;font-weight:700;color:#6b7280;text-transform:uppercase;
        letter-spacing:.06em;margin-bottom:6px">Extracted Text Preview</div>
      <div id="su-text-preview" style="
        max-height:130px;overflow-y:auto;padding:10px 13px;
        background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
        border-radius:9px;font-size:.78rem;color:#9ca3c0;line-height:1.65;
        white-space:pre-wrap;word-break:break-word;font-family:inherit;
      "></div>
    </div>

    <!-- Action buttons -->
    <div style="font-size:.72rem;font-weight:700;color:#6b7280;text-transform:uppercase;
      letter-spacing:.06em;margin-bottom:8px">What do you want to do?</div>
    <div id="su-actions" style="display:flex;flex-direction:column;gap:7px"></div>
  </div>

</div>`;

  document.body.appendChild(overlay);

  // Store callback and hint
  window._suOnSuccess = onSuccess;
  window._suPageHint  = pageHint;
  window._suExtracted = null;

  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSmartUpload(); });
}

function closeSmartUpload() {
  document.getElementById('su-overlay')?.remove();
  window._suOnSuccess = null;
  window._suExtracted = null;
}

/* ════════════════════════════════════════════════════════════
   DRAG & DROP
   ════════════════════════════════════════════════════════════ */
function suDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('su-dropzone');
  if (dz) { dz.style.borderColor='#667eea'; dz.style.background='rgba(102,126,234,.08)'; dz.style.transform='scale(1.01)'; }
}
function suDragLeave(e) {
  const dz = document.getElementById('su-dropzone');
  if (dz) { dz.style.borderColor='rgba(102,126,234,.3)'; dz.style.background='rgba(102,126,234,.03)'; dz.style.transform=''; }
}
function suDrop(e) {
  e.preventDefault();
  suDragLeave(e);
  const file = e.dataTransfer?.files?.[0];
  if (file) _suProcess(file);
}
function suFileSelected(inp) {
  const file = inp.files?.[0];
  if (file) _suProcess(file);
  inp.value = '';
}

/* ════════════════════════════════════════════════════════════
   PROCESS FILE
   ════════════════════════════════════════════════════════════ */
async function _suProcess(file) {
  // Client validation
  if (file.size > 25 * 1024 * 1024) return _suError('File too large. Maximum is 25MB.');
  const ext = file.name.split('.').pop().toLowerCase();
  const validExts = ['pdf','docx','doc','jpg','jpeg','png','webp','gif','bmp','tiff'];
  if (!validExts.includes(ext)) return _suError(`File type ".${ext}" not supported. Use: ${validExts.join(', ')}`);

  // Show image preview
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => {
      const prev = document.getElementById('su-img-preview');
      const img  = document.getElementById('su-preview-img');
      if (prev && img) { img.src = e.target.result; prev.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  }

  // Update drop zone
  const dzContent = document.getElementById('su-dz-content');
  if (dzContent) dzContent.innerHTML = `
    <div style="font-size:1.4rem;margin-bottom:6px">${_suFileIcon(file.type, file.name)}</div>
    <div style="font-size:.86rem;font-weight:600;color:#f0f2ff;margin-bottom:2px">${_suEsc(file.name)}</div>
    <div style="font-size:.72rem;color:#6b7280">${(file.size/1024).toFixed(0)} KB · ${SU_TYPES[file.type]||'File'}</div>`;

  _suShowProgress('Uploading file…', 15);

  try {
    const formData = new FormData();
    formData.append('file', file);

    _suShowProgress(file.type.startsWith('image/') ? '🧠 AI is reading the image…' : '📄 Extracting content…', 35);

    const response = await fetch('/api/upload/smart', {
      method : 'POST',
      headers: { 'Authorization': 'Bearer ' + (getToken?.() || '') },
      body   : formData,
    });

    _suShowProgress('Processing results…', 80);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Server error');

    _suShowProgress('Done!', 100);
    window._suExtracted = data;

    setTimeout(() => _suShowResult(data, file), 400);

  } catch (err) {
    _suError(err.message || 'Failed to process file. Please try again.');
  }
}

/* ════════════════════════════════════════════════════════════
   SHOW RESULT
   ════════════════════════════════════════════════════════════ */
function _suShowResult(data, file) {
  document.getElementById('su-progress').style.display = 'none';
  document.getElementById('su-error').style.display    = 'none';
  document.getElementById('su-result').style.display   = 'block';

  const typeLabels = { image:'🖼️ Image', pdf:'📄 PDF', 'scanned-pdf':'📸 Scanned PDF', docx:'📝 Word Doc' };

  // Info bar
  const infoEl = document.getElementById('su-result-info');
  if (infoEl) infoEl.innerHTML = `
    <div style="font-weight:600;color:#43e97b;margin-bottom:4px">✓ File processed successfully!</div>
    <div style="font-size:.76rem;color:#9ca3c0;line-height:1.6">
      ${typeLabels[data.type]||'File'} &nbsp;·&nbsp;
      <strong style="color:#f0f2ff">${_suEsc(data.title)}</strong> &nbsp;·&nbsp;
      ${data.pages} page${data.pages!==1?'s':''} &nbsp;·&nbsp;
      ${(data.wordCount||0).toLocaleString()} words
    </div>`;

  // AI analysis
  if (data.aiAnalysis) {
    const aiEl = document.getElementById('su-ai-analysis');
    if (aiEl) {
      aiEl.style.display = 'block';
      aiEl.innerHTML = `<span style="font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a78bfa;display:block;margin-bottom:4px">🤖 AI Analysis</span>${_suEsc(data.aiAnalysis)}`;
    }
  }

  // Text preview
  const previewEl = document.getElementById('su-text-preview');
  if (previewEl) {
    const preview = (data.text || '').substring(0, 600);
    previewEl.textContent = preview + (data.text?.length > 600 ? '\n\n… [truncated, full text will be saved]' : '');
  }

  // Action buttons based on page hint
  _suBuildActions(data);
}

/* ════════════════════════════════════════════════════════════
   ACTION BUTTONS
   ════════════════════════════════════════════════════════════ */
function _suBuildActions(data) {
  const actEl = document.getElementById('su-actions');
  if (!actEl) return;

  const hint = window._suPageHint || 'notes';
  const actions = [];

  // Always offer: Save as note
  actions.push({
    label   : '📝 Save as Note',
    desc    : 'Extract text → create a new note you can edit, summarise and quiz from',
    gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
    shadow  : 'rgba(102,126,234,.4)',
    fn      : 'suSaveAsNote',
  });

  // Page-specific primary action
  if (hint === 'chat') {
    actions.push({
      label   : '💬 Ask AI About This',
      desc    : 'Save as note and open Chat with it pre-loaded as context',
      gradient: 'linear-gradient(135deg,#f093fb,#f5576c)',
      shadow  : 'rgba(240,147,251,.4)',
      fn      : 'suSendToChat',
    });
  }
  if (hint === 'summaries') {
    actions.push({
      label   : '📄 Generate Summary',
      desc    : 'Save as note then immediately generate an AI summary',
      gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)',
      shadow  : 'rgba(79,172,254,.4)',
      fn      : 'suGenSummary',
    });
  }
  if (hint === 'quiz') {
    actions.push({
      label   : '🎯 Generate Quiz',
      desc    : 'Save as note then immediately generate MCQ quiz questions',
      gradient: 'linear-gradient(135deg,#fa709a,#fee140)',
      shadow  : 'rgba(250,112,154,.4)',
      fn      : 'suGenQuiz',
    });
  }
  if (hint === 'flashcards') {
    actions.push({
      label   : '🃏 Generate Flashcards',
      desc    : 'Save as note then immediately generate spaced-repetition flashcards',
      gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)',
      shadow  : 'rgba(67,233,123,.4)',
      fn      : 'suGenFlashcards',
    });
  }

  actEl.innerHTML = actions.map(a => `
    <button onclick="${a.fn}()" style="
      width:100%;padding:11px 14px;border-radius:11px;border:none;cursor:pointer;
      background:${a.gradient};color:#fff;font-family:inherit;
      text-align:left;display:flex;align-items:center;gap:10px;
      box-shadow:0 4px 16px ${a.shadow};transition:all .2s;
    " onmouseover="this.style.filter='brightness(1.1)';this.style.transform='translateY(-1px)'"
      onmouseout="this.style.filter='';this.style.transform=''">
      <div style="flex:1">
        <div style="font-weight:700;font-size:.88rem">${a.label}</div>
        <div style="font-size:.71rem;opacity:.8;margin-top:1px">${a.desc}</div>
      </div>
      <span style="font-size:1.1rem;flex-shrink:0">→</span>
    </button>`).join('');
}

/* ════════════════════════════════════════════════════════════
   ACTION HANDLERS
   ════════════════════════════════════════════════════════════ */
async function suSaveAsNote() {
  const data = window._suExtracted;
  if (!data) return;

  const btn = document.querySelector('#su-actions button');
  if (btn) { btn.textContent = '⏳ Saving…'; btn.disabled = true; }

  try {
    const existing = await fetch('/api/data/notes', {
      headers: { 'Authorization': 'Bearer ' + (getToken?.() || '') },
    }).then(r => r.json()).catch(() => ({ value: [] }));

    const notes  = existing.value || [];
    const now    = Date.now();
    const newNote = {
      id        : now.toString(36) + Math.random().toString(36).slice(2, 7),
      title     : data.title || 'Uploaded File',
      content   : data.text  || '',
      folder    : 'General',
      tags      : ['uploaded', data.type || 'file'],
      pinned    : false,
      bookmarked: false,
      created   : now,
      updated   : now,
      source    : data.type,
      fileMeta  : { pages: data.pages, words: data.wordCount, type: data.type },
    };
    notes.unshift(newNote);

    await fetch('/api/data/notes', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken?.() || '') },
      body   : JSON.stringify({ value: notes }),
    });

    if (typeof window._suOnSuccess === 'function') {
      window._suOnSuccess({ ...data, noteId: newNote.id, note: newNote });
    }

    closeSmartUpload();
    showToast?.(`✓ "${data.title}" saved as note! (${(data.wordCount||0).toLocaleString()} words)`, 'success', 5000);

  } catch (err) {
    _suError('Failed to save: ' + err.message);
    if (btn) { btn.textContent = '📝 Save as Note'; btn.disabled = false; }
  }
}

async function suSendToChat() {
  await suSaveAsNote();
  // The onSuccess callback on chat.js will handle pre-filling
  // Also set prefill
  if (window._suExtracted) {
    localStorage.setItem('sai_chat_prefill', `Please analyse and explain the content from "${window._suExtracted.title}"`);
  }
}

async function suGenSummary() {
  await suSaveAsNote();
  setTimeout(() => openModal?.('modal-gen-sum'), 700);
}

async function suGenQuiz() {
  await suSaveAsNote();
  setTimeout(() => openModal?.('modal-gen-quiz'), 700);
}

async function suGenFlashcards() {
  await suSaveAsNote();
  setTimeout(() => openModal?.('modal-gen-fc'), 700);
}

/* ════════════════════════════════════════════════════════════
   UI STATE HELPERS
   ════════════════════════════════════════════════════════════ */
function _suShowProgress(txt, pct) {
  document.getElementById('su-result')?.style && (document.getElementById('su-result').style.display = 'none');
  document.getElementById('su-error')?.style  && (document.getElementById('su-error').style.display  = 'none');

  const prog = document.getElementById('su-progress');
  if (prog) prog.style.display = 'block';

  const ptxt = document.getElementById('su-progress-txt');
  if (ptxt) ptxt.textContent = txt;

  const pbar = document.getElementById('su-progress-bar');
  if (pbar) pbar.style.width = pct + '%';
}

function _suError(msg) {
  document.getElementById('su-progress')?.style && (document.getElementById('su-progress').style.display = 'none');
  const errEl = document.getElementById('su-error');
  if (errEl) { errEl.innerHTML = '⚠️ ' + _suEsc(msg); errEl.style.display = 'block'; }
  // Red border on dropzone
  const dz = document.getElementById('su-dropzone');
  if (dz) { dz.style.borderColor='rgba(245,87,108,.5)'; setTimeout(()=>{dz.style.borderColor='rgba(102,126,234,.3)';},2500); }
}

function _suFileIcon(mimeType, filename) {
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType?.includes('pdf') || filename?.endsWith('.pdf')) return '📄';
  if (mimeType?.includes('word') || filename?.match(/\.docx?$/i)) return '📝';
  return '📁';
}

function _suEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}