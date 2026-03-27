/* ============================================================
   STUDYAI — AI DOUBT SOLVER
   File: public/assets/js/doubt.js
   ============================================================ */
'use strict';

const DS = {
  selectedSubject : 'General',
  currentImage    : null,  // base64 data URL
  currentFile     : null,
  currentSolution : null,
  history         : [],
  cameraStream    : null,
};

/* ── ENTRY ── */
async function initDoubt() {
  // Load history from server
  const data = await apiGet('/data').catch(() => ({}));
  DS.history = data.doubtHistory || [];
  _renderHistory();
}

/* ── Subject selector ── */
function selectSubject(chip) {
  document.querySelectorAll('.subject-chip').forEach(c => {
    c.style.background = 'transparent';
    c.classList.remove('active');
  });
  chip.style.background = chip.style.borderColor.replace(')', ', .12)').replace('rgb', 'rgba');
  chip.classList.add('active');
  DS.selectedSubject = chip.dataset.sub;
}

/* ── Drag & drop ── */
function dzOver(e) {
  e.preventDefault();
  document.getElementById('upload-zone')?.classList.add('drag');
}
function dzLeave(e) {
  document.getElementById('upload-zone')?.classList.remove('drag');
}
function dzDrop(e) {
  e.preventDefault();
  dzLeave(e);
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) _loadImageFile(file);
  else showToast('Please drop an image file.', 'warning');
}
function imageSelected(inp) {
  const file = inp.files?.[0];
  if (file) _loadImageFile(file);
  inp.value = '';
}

function _loadImageFile(file) {
  DS.currentFile = file;
  const reader   = new FileReader();
  reader.onload  = e => {
    DS.currentImage = e.target.result;
    _showImagePreview(DS.currentImage);
  };
  reader.readAsDataURL(file);
}

function _showImagePreview(src) {
  const zone    = document.getElementById('upload-zone');
  const preview = document.getElementById('img-preview');
  const wrap    = document.getElementById('img-preview-wrap');
  const solveBtn= document.getElementById('solve-btn');
  const clearBtn= document.getElementById('clear-btn');
  const dzText  = document.getElementById('dz-content');

  if (zone)     zone.classList.add('has-image');
  if (preview)  preview.src = src;
  if (wrap)     wrap.style.display = 'block';
  if (solveBtn) solveBtn.style.display = 'flex';
  if (clearBtn) clearBtn.style.display = 'inline-flex';
  if (dzText)   dzText.style.display   = 'none';
}

function clearDoubt() {
  DS.currentImage    = null;
  DS.currentFile     = null;
  DS.currentSolution = null;

  const zone    = document.getElementById('upload-zone');
  const wrap    = document.getElementById('img-preview-wrap');
  const solveBtn= document.getElementById('solve-btn');
  const clearBtn= document.getElementById('clear-btn');
  const dzText  = document.getElementById('dz-content');
  const solDisp = document.getElementById('solution-display');
  const solEmpty= document.getElementById('solution-empty');

  if (zone)     zone.classList.remove('has-image');
  if (wrap)     wrap.style.display    = 'none';
  if (solveBtn) solveBtn.style.display= 'none';
  if (clearBtn) clearBtn.style.display= 'none';
  if (dzText)   dzText.style.display  = 'block';
  if (solDisp)  solDisp.style.display = 'none';
  if (solEmpty) solEmpty.style.display= 'block';
}

/* ── Camera ── */
async function openCamera() {
  try {
    DS.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('camera-feed');
    if (video) { video.srcObject = DS.cameraStream; }
    document.getElementById('camera-modal').style.display = 'block';
  } catch (e) {
    showToast('Camera access denied. Please allow camera permission.', 'error');
  }
}

function capturePhoto() {
  const video  = document.getElementById('camera-feed');
  const canvas = document.getElementById('capture-canvas');
  if (!video || !canvas) return;
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  DS.currentImage = dataUrl;
  // Convert dataURL to Blob for upload
  canvas.toBlob(blob => { DS.currentFile = blob; }, 'image/jpeg', 0.92);
  _showImagePreview(dataUrl);
  closeCamera();
}

function closeCamera() {
  if (DS.cameraStream) { DS.cameraStream.getTracks().forEach(t => t.stop()); DS.cameraStream = null; }
  document.getElementById('camera-modal').style.display = 'none';
}

/* ════════════════════════════════════════════════════════════
   SOLVE
   ════════════════════════════════════════════════════════════ */
async function solveDoubt() {
  if (!DS.currentFile && !DS.currentImage) return showToast('Please upload an image first.', 'warning');

  const btn = document.getElementById('solve-btn');
  if (btn) { btn.textContent = '⏳ Solving…'; btn.disabled = true; }

  // Show overlay
  const overlay = document.getElementById('solving-overlay');
  const status  = document.getElementById('solve-status');
  if (overlay) overlay.classList.add('show');

  const steps = ['Reading question from image…', 'Analysing the problem…', 'Working through steps…', 'Writing explanation…'];
  let si = 0;
  const stepTimer = setInterval(() => {
    si = (si + 1) % steps.length;
    if (status) status.textContent = steps[si];
  }, 1800);

  try {
    const formData = new FormData();

    // Attach file
    if (DS.currentFile instanceof File || DS.currentFile instanceof Blob) {
      formData.append('image', DS.currentFile, DS.currentFile.name || 'question.jpg');
    } else if (DS.currentImage) {
      // Convert base64 to blob
      const res  = await fetch(DS.currentImage);
      const blob = await res.blob();
      formData.append('image', blob, 'question.jpg');
    }

    formData.append('subject',      DS.selectedSubject);
    formData.append('extraContext', document.getElementById('extra-context')?.value || '');

    const response = await fetch('/api/ai/solve-doubt', {
      method : 'POST',
      headers: { 'Authorization': 'Bearer ' + (getToken?.() || '') },
      body   : formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to solve');

    clearInterval(stepTimer);
    if (overlay) overlay.classList.remove('show');

    DS.currentSolution = data.solution;
    _showSolution(data.solution);

    // Save to history
    await _saveToHistory(DS.currentImage, data.solution);

  } catch (err) {
    clearInterval(stepTimer);
    if (overlay) overlay.classList.remove('show');
    showToast('Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.textContent = '🔍 Solve This Question'; btn.disabled = false; }
  }
}

function _showSolution(solution) {
  const empty   = document.getElementById('solution-empty');
  const display = document.getElementById('solution-display');
  const content = document.getElementById('solution-content');

  if (empty)   empty.style.display   = 'none';
  if (display) display.style.display = 'block';
  if (content) content.innerHTML     = mdToHtml(solution);

  // Scroll to solution
  display?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Solution ready! ✅', 'success');
  setTimeout(triggerMathJax, 150);
}

/* ── Save to notes ── */
async function saveToNotes() {
  if (!DS.currentSolution) return;

  const data  = await apiGet('/data').catch(() => ({}));
  const notes = data.notes || [];
  const now   = Date.now();
  notes.unshift({
    id       : now.toString(36) + Math.random().toString(36).slice(2,7),
    title    : `Doubt: ${DS.selectedSubject} — ${new Date().toLocaleDateString()}`,
    content  : DS.currentSolution,
    folder   : DS.selectedSubject,
    tags     : ['doubt', 'solved', DS.selectedSubject.toLowerCase()],
    pinned   : false, bookmarked: false,
    created  : now, updated: now,
  });
  await apiPost('/data/notes', { value: notes });
  showToast('Solution saved to Notes! 📝', 'success');
}

/* ── Copy ── */
function copyToClipboard() {
  if (!DS.currentSolution) return;
  navigator.clipboard.writeText(DS.currentSolution)
    .then(() => showToast('Copied to clipboard!', 'success'))
    .catch(() => showToast('Could not copy.', 'error'));
}

/* ── History ── */
async function _saveToHistory(imageDataUrl, solution) {
  const data    = await apiGet('/data').catch(() => ({}));
  const history = data.doubtHistory || [];
  history.unshift({
    id       : Date.now().toString(36),
    subject  : DS.selectedSubject,
    thumbnail: imageDataUrl?.substring(0, 200), // tiny preview
    solution,
    created  : Date.now(),
  });
  if (history.length > 20) history.pop();
  DS.history = history;
  await apiPost('/data/doubtHistory', { value: history });
  _renderHistory();
}

function _renderHistory() {
  const card = document.getElementById('history-card');
  const list = document.getElementById('doubt-history');
  if (!list || !DS.history.length) return;
  if (card) card.style.display = 'block';

  list.innerHTML = DS.history.slice(0, 5).map(h => `
    <div class="history-item" onclick="loadHistoryItem('${h.id}')">
      <div style="width:42px;height:42px;border-radius:8px;background:rgba(102,126,234,.15);
        display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">
        ${_subjectIcon(h.subject)}
      </div>
      <div style="flex:1;min-width:0">
        <div class="font-bold text-sm truncate">${h.subject} Question</div>
        <div class="text-xs text-muted mt-1">${timeAgo(h.created)}</div>
      </div>
      <span class="badge badge-green" style="font-size:.6rem">Solved ✓</span>
    </div>`).join('');
}

function loadHistoryItem(id) {
  const item = DS.history.find(h => h.id === id);
  if (!item) return;
  DS.currentSolution = item.solution;
  _showSolution(item.solution);
}

function _subjectIcon(s) {
  const m = { Math:'📐', Physics:'⚡', Chemistry:'🧪', DSA:'💻', OS:'🖥️', DBMS:'🗄️', General:'🧠' };
  return m[s] || '🧠';
}