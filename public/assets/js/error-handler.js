/* ============================================================
   STUDYAI — error-handler.js  (Part 3)
   Global error boundary:
   - Catches all unhandled JS errors
   - Catches unhandled promise rejections
   - Logs errors to localStorage (last 50)
   - Shows user-friendly error UI instead of blank screen
   - Never shows raw stack traces to users
   ============================================================ */

(function initErrorHandler() {

  const MAX_LOG_ENTRIES = 50;
  const LOG_KEY = 'sa_error_log';

  // ── Log error to localStorage ─────────────────────────
  function logError(type, message, detail = '') {
    try {
      const log = _getLog();
      log.unshift({
        type,
        message: String(message).slice(0, 300),
        detail : String(detail).slice(0, 500),
        url    : window.location.pathname,
        ts     : Date.now(),
        ua     : navigator.userAgent.slice(0, 80),
      });
      localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, MAX_LOG_ENTRIES)));
    } catch {}
  }

  function _getLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
    catch { return []; }
  }

  // ── Public: get error log (for Settings/debug page) ───
  window.getErrorLog  = _getLog;
  window.clearErrorLog = () => localStorage.removeItem(LOG_KEY);

  // ── Show non-blocking error toast ─────────────────────
  function showErrorToast(message) {
    if (typeof showToast === 'function') {
      showToast(message, 'error', 5000);
      return;
    }
    // Fallback if utils.js not loaded
    const container = document.getElementById('toast-container') || document.body;
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;padding:12px 18px;border-radius:12px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#ef4444;font-size:.84rem;font-weight:500;max-width:360px;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    t.textContent = '❌ ' + message;
    container.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  }

  // ── Show full-page error (for critical failures) ───────
  function showCriticalError(message, canReload = true) {
    // Only show if the main content area exists and is blank
    const main = document.querySelector('.main-content, .page-body');
    if (!main) return;

    const existingErr = document.getElementById('critical-error-banner');
    if (existingErr) return; // Don't stack multiple

    const banner = document.createElement('div');
    banner.id = 'critical-error-banner';
    banner.style.cssText = 'padding:40px 24px;text-align:center;max-width:480px;margin:60px auto';
    banner.innerHTML = `
      <div style="font-size:3rem;margin-bottom:16px;opacity:.5">⚠️</div>
      <div style="font-weight:700;font-size:1rem;margin-bottom:8px;color:var(--text,#e8eaf6)">Something went wrong</div>
      <p style="color:var(--text-muted,#8b90b3);font-size:.86rem;line-height:1.6;margin-bottom:20px">${_sanitize(message)}</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        ${canReload ? '<button id="err-reload" style="padding:10px 22px;border-radius:10px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:.86rem;font-weight:700;cursor:pointer">Reload Page</button>' : ''}
        <a href="/dashboard.html" style="padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:var(--text-muted,#8b90b3);font-size:.84rem;text-decoration:none;display:inline-block">Go to Dashboard</a>
      </div>`;

    main.prepend(banner);

    document.getElementById('err-reload')?.addEventListener('click', () => location.reload());
  }

  // ── Sanitize: prevent XSS in error messages ───────────
  function _sanitize(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .slice(0, 200);
  }

  // ── Global JS error handler ────────────────────────────
  window.addEventListener('error', event => {
    const { message, filename, lineno, colno, error } = event;

    // Ignore browser extension errors and cross-origin errors
    if (!filename || filename.includes('extension') || filename.startsWith('chrome')) return;

    const shortMsg = String(message || 'Unknown error').slice(0, 150);
    const stack    = error?.stack || '';

    logError('js', shortMsg, stack);

    // User-friendly messages for common errors
    const userMsg = _friendlyMessage(shortMsg);
    if (userMsg) showErrorToast(userMsg);

    console.error('[ErrorHandler]', message, { filename, lineno, colno, stack });
  });

  // ── Unhandled Promise rejections ───────────────────────
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    const message = reason?.message || String(reason) || 'Promise rejected';

    // Don't log network errors loudly (expected when offline)
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      if (!navigator.onLine) return; // Expected — user is offline
    }

    logError('promise', message, reason?.stack || '');

    const userMsg = _friendlyMessage(message);
    if (userMsg) showErrorToast(userMsg);

    console.error('[ErrorHandler] Unhandled rejection:', reason);
    event.preventDefault(); // Prevent console noise for handled errors
  });

  // ── Friendly message mapping ───────────────────────────
  function _friendlyMessage(rawMsg) {
    const msg = rawMsg.toLowerCase();

    if (msg.includes('network') || msg.includes('failed to fetch'))
      return 'Network error. Check your connection.';
    if (msg.includes('401') || msg.includes('unauthorized'))
      return 'Session expired. Please sign in again.';
    if (msg.includes('403') || msg.includes('forbidden'))
      return 'Access denied.';
    if (msg.includes('429') || msg.includes('rate limit'))
      return 'Too many requests. Please wait a moment.';
    if (msg.includes('500') || msg.includes('internal server'))
      return 'Server error. Please try again shortly.';
    if (msg.includes('quota') || msg.includes('storage'))
      return 'Storage quota exceeded. Please free up space.';
    if (msg.includes('json') || msg.includes('parse'))
      return null; // Silent — usually internal
    if (msg.includes('cannot read') || msg.includes('undefined'))
      return null; // Silent — internal logic error
    if (msg.includes('groq') || msg.includes('api key'))
      return 'AI service unavailable. Check server configuration.';

    return null; // Don't show toast for unknown errors
  }

  // ── Resource load errors (img, script, link) ──────────
  document.addEventListener('error', event => {
    const el  = event.target;
    const tag = el?.tagName?.toLowerCase();

    if (tag === 'img') {
      // Replace broken images with placeholder
      el.style.cssText = 'background:rgba(100,110,160,.1);border-radius:8px;';
      el.removeAttribute('src');
    }

    if (tag === 'script' || tag === 'link') {
      const src = el.src || el.href || 'unknown';
      logError('resource', `Failed to load: ${src}`, tag);
      console.warn('[ErrorHandler] Resource failed:', src);
    }
  }, true);

  // ── API error interceptor ──────────────────────────────
  // Wrap fetch to auto-handle 401 and log API errors
  const _originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await _originalFetch(...args);

      // Auto-logout on 401 from API (not login endpoint)
      const url = String(args[0] || '');
      if (response.status === 401 && url.includes('/api/') && !url.includes('/api/login')) {
        localStorage.removeItem('sa_token');
        localStorage.removeItem('sa_user');
        const currentPage = window.location.pathname;
        if (!currentPage.includes('index.html') && currentPage !== '/') {
          window.location.href = '/index.html?msg=Session+expired';
        }
      }

      return response;
    } catch (err) {
      // Log network errors
      if (err.name !== 'AbortError') {
        logError('fetch', err.message, String(args[0] || '').slice(0, 100));
      }
      throw err;
    }
  };

  console.log('[ErrorHandler] Global error handling active.');

})();