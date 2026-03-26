/* ============================================================
   STUDYAI — skeletons.js  (Part 9)
   Loading skeleton system — replaces all spinner-only states.
   ============================================================ */

// ── CSS injected once ─────────────────────────────────────
(function injectSkeletonCSS() {
  if (document.getElementById('skeleton-styles')) return;
  const style = document.createElement('style');
  style.id = 'skeleton-styles';
  style.textContent = `
    .skeleton {
      background: linear-gradient(90deg,
        rgba(255,255,255,.04) 0%,
        rgba(255,255,255,.1)  50%,
        rgba(255,255,255,.04) 100%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
      border-radius: 8px;
    }
    [data-theme="light"] .skeleton {
      background: linear-gradient(90deg, #e8eaf0 0%, #f5f6fb 50%, #e8eaf0 100%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 20px;
    }
    .sk-line   { height: 12px; margin-bottom: 10px; }
    .sk-line-sm{ height: 9px;  margin-bottom: 8px;  }
    .sk-line-lg{ height: 18px; margin-bottom: 12px; }
    .sk-circle { border-radius: 50%; }
    .sk-w-20 { width: 20%; }
    .sk-w-40 { width: 40%; }
    .sk-w-60 { width: 60%; }
    .sk-w-80 { width: 80%; }
    .sk-w-full{ width: 100%; }
    .sk-h-32 { height: 32px; }
    .sk-h-64 { height: 64px; }
    .sk-h-120{ height: 120px; }
  `;
  document.head.appendChild(style);
})();

// ── Skeleton templates ────────────────────────────────────

function skStatGrid(count = 4) {
  return Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton sk-line sk-w-20 mb-2"></div>
      <div class="skeleton sk-line-lg sk-w-60"></div>
      <div class="skeleton sk-line-sm sk-w-80"></div>
    </div>`).join('');
}

function skNoteList(count = 5) {
  return Array(count).fill(`
    <div style="padding:11px 13px;border-radius:10px;margin-bottom:3px">
      <div class="skeleton sk-line sk-w-80 mb-2" style="height:11px"></div>
      <div class="skeleton sk-line sk-w-full" style="height:9px;margin-bottom:5px"></div>
      <div class="skeleton sk-line sk-w-60" style="height:9px"></div>
    </div>`).join('');
}

function skTaskList(count = 4) {
  return Array(count).fill(`
    <div class="task-item">
      <div class="skeleton sk-circle" style="width:18px;height:18px;flex-shrink:0"></div>
      <div class="skeleton sk-line" style="flex:1;height:11px"></div>
      <div class="skeleton sk-line sk-w-20" style="height:18px;border-radius:100px"></div>
    </div>`).join('');
}

function skCardGrid(count = 6) {
  return Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton sk-h-64 w-full mb-3" style="border-radius:10px"></div>
      <div class="skeleton sk-line sk-w-80 mb-2"></div>
      <div class="skeleton sk-line sk-w-60"></div>
    </div>`).join('');
}

function skChat(count = 3) {
  const msgs = [];
  for (let i = 0; i < count; i++) {
    const isAI = i % 2 === 0;
    msgs.push(`
      <div class="msg-row ${isAI ? 'msg-ai' : 'msg-user'}">
        <div class="skeleton sk-circle" style="width:32px;height:32px;flex-shrink:0"></div>
        <div class="msg-content">
          <div class="skeleton sk-line ${isAI ? 'sk-w-80' : 'sk-w-60'} mb-1" style="height:10px"></div>
          <div class="skeleton sk-line ${isAI ? 'sk-w-full' : 'sk-w-80'}" style="height:10px"></div>
        </div>
      </div>`);
  }
  return msgs.join('');
}

function skFlashcard() {
  return `
    <div class="skeleton" style="width:100%;max-width:560px;height:280px;border-radius:20px;margin:0 auto"></div>`;
}

function skDashboard() {
  return {
    stats   : skStatGrid(6),
    tasks   : skTaskList(4),
    exams   : skTaskList(3),
    activity: skTaskList(3),
  };
}

// ── Show skeleton in an element ───────────────────────────
function showSkeleton(elementId, html) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = html;
}

// ── Replace skeleton with content ────────────────────────
function hideSkeleton(elementId, html) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.opacity = '0';
  el.innerHTML = html;
  requestAnimationFrame(() => {
    el.style.transition = 'opacity .3s ease';
    el.style.opacity = '1';
  });
}

// ── Progressive load helper ───────────────────────────────
// Shows skeleton immediately, loads data, replaces with content
async function progressiveLoad(elementId, skeletonHtml, loadFn) {
  showSkeleton(elementId, skeletonHtml);
  try {
    const html = await loadFn();
    hideSkeleton(elementId, html);
  } catch (err) {
    hideSkeleton(elementId, `<div class="text-sm text-muted" style="padding:12px">Failed to load. <a style="color:var(--purple);cursor:pointer" onclick="location.reload()">Retry</a></div>`);
  }
}