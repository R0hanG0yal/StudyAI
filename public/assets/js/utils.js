/* ============================================================
   STUDYAI — SHARED UTILITIES
   File: public/assets/js/utils.js
   Included on: every page (after auth.js)
   ============================================================ */
'use strict';

/* ════════════════════════════════════════════════════════════
   DATE / TIME
   ════════════════════════════════════════════════════════════ */
function today()    { return new Date().toISOString().split('T')[0]; }
function dateStr(d) { return d.toISOString().split('T')[0]; }
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateStr(d);
}
function daysUntil(s) {
  return Math.ceil((new Date(s + 'T00:00:00') - new Date()) / 86400000);
}
function formatDate(s) {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
function formatDateShort(s) {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
function timeAgo(ts) {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60000)    return 'Just now';
  if (d < 3600000)  return Math.floor(d / 60000)   + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000)  + 'h ago';
  if (d < 604800000)return Math.floor(d / 86400000) + 'd ago';
  return formatDateShort(dateStr(new Date(ts)));
}
function fmtTime(seconds) {
  const s = Math.max(0, seconds);
  return String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
}
function fmtMins(mins) {
  if (!mins) return '0m';
  if (mins < 60) return mins + 'm';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'h' + (m ? m + 'm' : '');
}
function greetTime() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

/* ════════════════════════════════════════════════════════════
   STRING HELPERS
   ════════════════════════════════════════════════════════════ */
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(s) {
  return String(s || '').replace(/'/g,"&#39;").replace(/"/g,'&quot;');
}

function truncate(s, n = 80) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n) + '…' : s;
}

function slugify(s) {
  return (s || '').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
}

/* ════════════════════════════════════════════════════════════
   MARKDOWN → HTML  (lightweight)
   ════════════════════════════════════════════════════════════ */
function mdToHtml(md) {
  if (!md) return '';
  return md
    .replace(/^### (.+)$/gm,'<h3 style="margin:10px 0 5px;font-size:.93rem;color:var(--purple)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:12px 0 6px;font-size:1rem;font-weight:700">$1</h2>')
    .replace(/^# (.+)$/gm,  '<h1 style="margin:14px 0 8px;font-size:1.1rem;font-weight:800">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,   '<em>$1</em>')
    .replace(/`([^`\n]+)`/g, '<code style="background:rgba(255,255,255,.06);padding:1px 6px;border-radius:4px;font-family:var(--font-mono);font-size:.82rem;color:var(--cyan)">$1</code>')
    .replace(/^[•\-\*] (.+)$/gm,'<div style="margin:3px 0 3px 14px;display:flex;gap:6px"><span style="color:var(--purple);flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm,'<div style="margin:3px 0 3px 14px"><strong style="color:var(--cyan)">$1.</strong> $2</div>')
    .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--border);margin:10px 0"/>')
    .replace(/\n\n/g,'<br/><br/>').replace(/\n/g,'<br/>');
}

/**
 * Re-triggers MathJax to render all formulas on the page.
 * Call this after updating dynamic content (chat messages, notes).
 */
function triggerMathJax() {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    window.MathJax.typesetPromise().catch((err) => console.warn('MathJax Error:', err));
  }
}

/* ════════════════════════════════════════════════════════════
   MODAL
   ════════════════════════════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.querySelector('.modal')?.focus(); }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// Escape closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

/* ════════════════════════════════════════════════════════════
   LOADING SPINNER
   ════════════════════════════════════════════════════════════ */
function showPageLoader(msg = 'Loading…') {
  const existing = document.getElementById('page-loader');
  if (existing) return;
  const el = document.createElement('div');
  el.id = 'page-loader';
  el.className = 'loading-overlay';
  el.innerHTML = `
    <div style="width:48px;height:48px;background:var(--grad-1);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:16px;box-shadow:0 8px 24px rgba(102,126,234,.4)">🧠</div>
    <div class="loading-logo grad-text">StudyAI</div>
    <div class="spinner" style="margin-top:20px"></div>
    <div style="margin-top:12px;font-size:.8rem;color:var(--text-muted)">${msg}</div>`;
  document.body.appendChild(el);
}

function hidePageLoader() {
  const el = document.getElementById('page-loader');
  if (el) {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }
}

/* ════════════════════════════════════════════════════════════
   AUTO-RESIZE TEXTAREA
   ════════════════════════════════════════════════════════════ */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

/* ════════════════════════════════════════════════════════════
   DOWNLOAD HELPERS
   ════════════════════════════════════════════════════════════ */
function downloadMD(text, filename) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════
   EMPTY STATE HTML
   ════════════════════════════════════════════════════════════ */
function emptyState(icon, title, desc = '', action = '') {
  return `
    <div class="empty-state">
      <span class="empty-state-icon">${icon}</span>
      <h3>${title}</h3>
      <p>${desc}</p>
      ${action ? `<div style="margin-top:16px">${action}</div>` : ''}
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   SPINNER INLINE
   ════════════════════════════════════════════════════════════ */
function spinnerHTML(msg = '') {
  return `<div class="flex items-center gap-3" style="padding:20px;color:var(--text-muted)">
    <div class="spinner"></div>
    ${msg ? `<span class="text-sm">${escHtml(msg)}</span>` : ''}
  </div>`;
}

/* ════════════════════════════════════════════════════════════
   CONFETTI  (for achievements)
   ════════════════════════════════════════════════════════════ */
function burstConfetti() {
  const colors = ['#667eea','#f093fb','#4facfe','#43e97b','#fa709a','#fee140'];
  const burst  = document.createElement('div');
  burst.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;overflow:hidden';

  if (!document.getElementById('cfStyle')) {
    const s = document.createElement('style');
    s.id    = 'cfStyle';
    s.textContent = '@keyframes cf{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) translateX(var(--dx)) rotate(720deg);opacity:0}}';
    document.head.appendChild(s);
  }

  for (let i = 0; i < 55; i++) {
    const p  = document.createElement('div');
    const sz = 5 + Math.random() * 8;
    p.style.cssText = `position:absolute;left:${Math.random()*100}%;top:-10px;width:${sz}px;height:${sz}px;background:${colors[i%colors.length]};border-radius:${Math.random()>.5?'50%':'3px'};animation:cf ${1+Math.random()*1.5}s ${Math.random()*.5}s ease-in forwards;--dx:${(Math.random()-.5)*200}px`;
    burst.appendChild(p);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 3000);
}