/* ============================================================
   STUDYAI — pwa.js
   Service Worker registration, install prompt, update banner.
   Include on every page (after auth.js).
   ============================================================ */

(function initPWA() {

  // ── Register Service Worker ────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[PWA] SW registered, scope:', reg.scope);

        // ── Check for updates ──────────────────────────────
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              _showUpdateBanner(newWorker);
            }
          });
        });

        // ── Reload when new SW takes control ───────────────
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        // ── Listen for SW messages ─────────────────────────
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'SYNC_START') {
            _showToastIfAvailable('Syncing your data…', 'info', 2000);
          }
        });

      } catch (err) {
        console.warn('[PWA] SW registration failed:', err);
      }
    });
  }

  // ── Install Prompt ─────────────────────────────────────
  let _deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredPrompt = e;

    // Show install chip after 30 seconds if not already installed
    const alreadyDismissed = localStorage.getItem('sa_install_dismissed');
    if (!alreadyDismissed) {
      setTimeout(() => _showInstallChip(), 30000);
    }
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    localStorage.setItem('sa_installed', 'true');
    _removeInstallChip();
    _showToastIfAvailable('StudyAI installed! 🎉', 'success', 4000);
  });

  // ── Public: trigger install programmatically ───────────
  window.triggerPWAInstall = async function() {
    if (!_deferredPrompt) return false;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    return outcome === 'accepted';
  };

  // ── Offline / Online indicators ────────────────────────
  function _updateOnlineStatus() {
    const online = navigator.onLine;
    let indicator = document.getElementById('pwa-online-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pwa-online-indicator';
      indicator.style.cssText = `
        position:fixed;bottom:70px;right:20px;z-index:8888;
        padding:7px 14px;border-radius:100px;font-size:.74rem;font-weight:600;
        display:flex;align-items:center;gap:6px;
        box-shadow:0 4px 16px rgba(0,0,0,.3);
        transition:all .3s ease;
        pointer-events:none;
      `;
      document.body.appendChild(indicator);
    }

    if (!online) {
      indicator.style.background = 'rgba(239,68,68,.15)';
      indicator.style.border     = '1px solid rgba(239,68,68,.3)';
      indicator.style.color      = '#ef4444';
      indicator.style.opacity    = '1';
      indicator.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#ef4444;animation:pulse 1.5s infinite;display:inline-block"></span>Offline';
    } else {
      indicator.style.background = 'rgba(16,185,129,.12)';
      indicator.style.border     = '1px solid rgba(16,185,129,.25)';
      indicator.style.color      = '#10b981';
      indicator.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#10b981;display:inline-block"></span>Back online';
      setTimeout(() => { indicator.style.opacity = '0'; }, 3000);
    }
  }

  window.addEventListener('online',  _updateOnlineStatus);
  window.addEventListener('offline', _updateOnlineStatus);
  if (!navigator.onLine) setTimeout(_updateOnlineStatus, 1000);

  // ── Update available banner ────────────────────────────
  function _showUpdateBanner(newWorker) {
    const existing = document.getElementById('pwa-update-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:9900;
      padding:10px 20px;
      background:linear-gradient(135deg,rgba(102,126,234,.95),rgba(118,75,162,.95));
      backdrop-filter:blur(12px);
      color:#fff;font-size:.84rem;font-weight:600;
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      box-shadow:0 4px 20px rgba(0,0,0,.3);
      animation:slideDown .3s ease;
    `;
    banner.innerHTML = `
      <span>🆕 A new version of StudyAI is available!</span>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button id="pwa-update-now" style="padding:6px 14px;border-radius:8px;border:none;background:rgba(255,255,255,.25);color:#fff;font-size:.8rem;font-weight:700;cursor:pointer">Update Now</button>
        <button id="pwa-update-dismiss" style="padding:6px 10px;border-radius:8px;border:none;background:transparent;color:rgba(255,255,255,.7);font-size:.8rem;cursor:pointer">Later</button>
      </div>`;

    if (!document.getElementById('pwa-slide-style')) {
      const s = document.createElement('style');
      s.id = 'pwa-slide-style';
      s.textContent = '@keyframes slideDown{from{transform:translateY(-100%)}to{transform:none}}';
      document.head.appendChild(s);
    }

    document.body.prepend(banner);

    document.getElementById('pwa-update-now')?.addEventListener('click', () => {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      banner.remove();
    });
    document.getElementById('pwa-update-dismiss')?.addEventListener('click', () => {
      banner.remove();
    });
  }

  // ── Install chip (subtle bottom corner) ───────────────
  function _showInstallChip() {
    if (document.getElementById('pwa-install-chip')) return;
    if (localStorage.getItem('sa_installed') === 'true') return;

    const chip = document.createElement('div');
    chip.id = 'pwa-install-chip';
    chip.style.cssText = `
      position:fixed;bottom:20px;left:20px;z-index:8888;
      display:flex;align-items:center;gap:10px;
      padding:10px 16px;
      background:var(--bg-card,rgba(18,22,40,.95));
      border:1px solid rgba(102,126,234,.25);
      border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,.3);
      backdrop-filter:blur(16px);
      font-size:.82rem;
      animation:slideUp .3s ease;
      max-width:280px;
    `;
    chip.innerHTML = `
      <span style="font-size:1.4rem">📱</span>
      <div>
        <div style="font-weight:700;margin-bottom:2px">Install StudyAI</div>
        <div style="color:var(--text-muted,#8b90b3);font-size:.72rem">Study offline, faster access</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;margin-left:4px">
        <button id="pwa-install-yes" style="padding:5px 12px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:.76rem;font-weight:700;cursor:pointer;white-space:nowrap">Install</button>
        <button id="pwa-install-no"  style="padding:4px 8px;border-radius:6px;border:none;background:transparent;color:var(--text-muted,#8b90b3);font-size:.7rem;cursor:pointer">Not now</button>
      </div>`;

    if (!document.getElementById('pwa-slide-up-style')) {
      const s = document.createElement('style');
      s.id = 'pwa-slide-up-style';
      s.textContent = '@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}';
      document.head.appendChild(s);
    }

    document.body.appendChild(chip);

    document.getElementById('pwa-install-yes')?.addEventListener('click', async () => {
      chip.remove();
      const accepted = await window.triggerPWAInstall();
      if (!accepted) _showToastIfAvailable('Install cancelled', 'info', 2000);
    });
    document.getElementById('pwa-install-no')?.addEventListener('click', () => {
      chip.remove();
      localStorage.setItem('sa_install_dismissed', Date.now().toString());
    });
  }

  function _removeInstallChip() {
    document.getElementById('pwa-install-chip')?.remove();
  }

  // ── Toast helper (works even if utils.js not loaded yet) ─
  function _showToastIfAvailable(msg, type, duration) {
    if (typeof showToast === 'function') {
      showToast(msg, type, duration);
    }
  }

})();