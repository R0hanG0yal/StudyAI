/* ============================================================
   STUDYAI — session.js  (Part 2)
   Session security:
   - Heartbeat: pings /api/ping every 5 min, auto-logs out on 401
   - Inactivity timeout: warns after 25 min, logs out after 30 min
   - Tab visibility: pauses heartbeat when tab hidden
   - Storage events: syncs logout across browser tabs
   ============================================================ */

(function initSession() {

  const HEARTBEAT_MS   = 5  * 60 * 1000; // 5 minutes
  const WARN_MS        = 25 * 60 * 1000; // warn at 25 min
  const TIMEOUT_MS     = 30 * 60 * 1000; // logout at 30 min
  const ACTIVITY_EVENTS = ['mousedown','keydown','touchstart','scroll','click'];

  let _heartbeatTimer = null;
  let _warnTimer      = null;
  let _timeoutTimer   = null;
  let _lastActivity   = Date.now();
  let _warnEl         = null;

  // Don't run on login page
  if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) return;

  // ── Start session management ────────────────────────────
  function start() {
    _scheduleHeartbeat();
    _resetInactivityTimers();
    _bindActivityEvents();
    _bindStorageSync();
    _bindVisibilityChange();
  }

  // ── Heartbeat: verify session is still valid ──────────
  function _scheduleHeartbeat() {
    clearTimeout(_heartbeatTimer);
    _heartbeatTimer = setTimeout(async () => {
      const token = localStorage.getItem('sa_token');
      if (!token) return; // Not logged in

      try {
        const res = await fetch('/api/ping', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          _forceLogout('Your session has expired. Please sign in again.');
          return;
        }
        // Schedule next heartbeat
        _scheduleHeartbeat();
      } catch {
        // Network error — keep session alive locally, retry
        _scheduleHeartbeat();
      }
    }, HEARTBEAT_MS);
  }

  // ── Inactivity: warn + timeout ─────────────────────────
  function _resetInactivityTimers() {
    clearTimeout(_warnTimer);
    clearTimeout(_timeoutTimer);
    _dismissWarning();

    _warnTimer = setTimeout(() => {
      _showInactivityWarning();
    }, WARN_MS);

    _timeoutTimer = setTimeout(() => {
      _forceLogout('You were logged out due to inactivity.');
    }, TIMEOUT_MS);
  }

  function _bindActivityEvents() {
    const reset = _debounce(() => {
      _lastActivity = Date.now();
      _resetInactivityTimers();
    }, 500);
    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, reset, { passive: true }));
  }

  // ── Tab visibility: pause timers when hidden ──────────
  function _bindVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimeout(_heartbeatTimer);
      } else {
        // Tab became visible — check if session still valid
        const token = localStorage.getItem('sa_token');
        if (!token) return;
        fetch('/api/ping', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => { if (r.status === 401) _forceLogout('Session expired. Please sign in again.'); })
          .catch(() => {});
        _scheduleHeartbeat();
        _resetInactivityTimers();
      }
    });
  }

  // ── Storage sync: logout across tabs ─────────────────
  function _bindStorageSync() {
    window.addEventListener('storage', e => {
      if (e.key === 'sa_token' && !e.newValue && e.oldValue) {
        // Token was removed in another tab
        window.location.href = '/index.html?reason=logout';
      }
      if (e.key === 'sa_force_logout') {
        const msg = e.newValue || 'You have been signed out.';
        localStorage.removeItem('sa_force_logout');
        _forceLogout(msg, false); // false = don't set storage again
      }
    });
  }

  // ── Warning modal ──────────────────────────────────────
  function _showInactivityWarning() {
    if (_warnEl) return;
    let countdown = Math.round((TIMEOUT_MS - WARN_MS) / 1000);

    _warnEl = document.createElement('div');
    _warnEl.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,.6);backdrop-filter:blur(6px);
      z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    _warnEl.innerHTML = `
      <div style="background:var(--bg-card,#12162c);border:1px solid rgba(245,158,11,.3);border-radius:20px;padding:32px;max-width:380px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.4)">
        <div style="font-size:3rem;margin-bottom:16px">⏰</div>
        <div style="font-family:inherit;font-size:1.1rem;font-weight:800;margin-bottom:10px">Still there?</div>
        <p style="color:#8b90b3;font-size:.88rem;line-height:1.6;margin-bottom:20px">
          You'll be logged out in <strong id="session-countdown" style="color:#f59e0b">${countdown}s</strong> due to inactivity.
        </p>
        <div style="display:flex;gap:10px;justify-content:center">
          <button id="session-stay" style="padding:11px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:.9rem;font-weight:700;cursor:pointer">Stay Signed In</button>
          <button id="session-leave" style="padding:11px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#8b90b3;font-size:.88rem;cursor:pointer">Sign Out</button>
        </div>
      </div>`;

    document.body.appendChild(_warnEl);

    const countEl = document.getElementById('session-countdown');
    const countTimer = setInterval(() => {
      countdown--;
      if (countEl) countEl.textContent = countdown + 's';
      if (countdown <= 0) clearInterval(countTimer);
    }, 1000);

    document.getElementById('session-stay')?.addEventListener('click', () => {
      clearInterval(countTimer);
      _dismissWarning();
      _resetInactivityTimers();
    });
    document.getElementById('session-leave')?.addEventListener('click', () => {
      clearInterval(countTimer);
      if (typeof doLogout === 'function') doLogout();
      else window.location.href = '/index.html';
    });
  }

  function _dismissWarning() {
    if (_warnEl) { _warnEl.remove(); _warnEl = null; }
  }

  // ── Force logout ───────────────────────────────────────
  function _forceLogout(message, broadcastToTabs = true) {
    clearTimeout(_heartbeatTimer);
    clearTimeout(_warnTimer);
    clearTimeout(_timeoutTimer);
    _dismissWarning();

    // Broadcast to other tabs
    if (broadcastToTabs) {
      localStorage.setItem('sa_force_logout', message);
      setTimeout(() => localStorage.removeItem('sa_force_logout'), 500);
    }

    // Clear session
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');

    // Redirect with message
    const url = new URL('/index.html', window.location.origin);
    url.searchParams.set('msg', message);
    window.location.href = url.toString();
  }

  // ── Debounce helper ───────────────────────────────────
  function _debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ── Init ──────────────────────────────────────────────
  // Only if user is logged in
  if (localStorage.getItem('sa_token')) {
    start();
  }

  // Expose for external use
  window.SessionManager = {
    reset: _resetInactivityTimers,
    forceLogout: _forceLogout,
  };

})();