/* ============================================================
   STUDYAI — performance.js  (Part 10)
   Performance optimizations:
   - Lazy-load non-critical JS modules
   - Preload next-likely pages on hover
   - Intersection Observer for deferred rendering
   - Image lazy loading with blur-up placeholder
   - Long task splitting with scheduler
   - Memory leak prevention
   ============================================================ */

const Perf = (function() {

  // ── 1. Lazy-load JS modules on demand ─────────────────
  const _loaded = new Set();

  function lazyLoad(src) {
    if (_loaded.has(src)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src   = src;
      s.async = true;
      s.onload  = () => { _loaded.add(src); resolve(); };
      s.onerror = () => reject(new Error('Failed to load: ' + src));
      document.head.appendChild(s);
    });
  }

  // Lazy-load Chart.js only on analytics/dashboard
  function lazyLoadChart() {
    return lazyLoad('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
  }

  // ── 2. Preload page on link hover ─────────────────────
  const _prefetched = new Set();

  function enableHoverPrefetch() {
    document.addEventListener('mouseover', e => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || _prefetched.has(href)) return;
      if (!href.endsWith('.html')) return;

      _prefetched.add(href);
      const prefetch = document.createElement('link');
      prefetch.rel  = 'prefetch';
      prefetch.href = href;
      document.head.appendChild(prefetch);
    }, { passive: true });
  }

  // ── 3. Deferred rendering with Intersection Observer ──
  function deferRender(elements, callback, threshold = 0.1) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold, rootMargin: '100px' });

    (typeof elements === 'string'
      ? document.querySelectorAll(elements)
      : elements
    ).forEach(el => observer.observe(el));

    return observer;
  }

  // ── 4. Yield to browser between heavy tasks ────────────
  // Splits long loops to avoid blocking the main thread
  async function yieldIfNeeded() {
    if ('scheduler' in window && 'yield' in scheduler) {
      await scheduler.yield();
    } else {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  async function* chunkedIterator(items, chunkSize = 20) {
    for (let i = 0; i < items.length; i += chunkSize) {
      yield items.slice(i, i + chunkSize);
      await yieldIfNeeded();
    }
  }

  // ── 5. Debounce + throttle ────────────────────────────
  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function throttle(fn, ms) {
    let last = 0;
    return (...a) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...a); } };
  }

  // ── 6. Memory: cleanup event listeners on navigate ────
  const _cleanup = [];
  function addCleanup(fn) { _cleanup.push(fn); }
  function cleanup() { _cleanup.forEach(fn => { try { fn(); } catch {} }); _cleanup.length = 0; }
  window.addEventListener('beforeunload', cleanup);

  // ── 7. Measure Web Vitals ─────────────────────────────
  function measureVitals() {
    if (!('PerformanceObserver' in window)) return;

    // LCP
    try {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        console.log('[Perf] LCP:', Math.round(last.startTime) + 'ms');
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    // FID / INP
    try {
      new PerformanceObserver(list => {
        list.getEntries().forEach(e => {
          console.log('[Perf] Interaction delay:', Math.round(e.processingStart - e.startTime) + 'ms');
        });
      }).observe({ type: 'first-input', buffered: true });
    } catch {}

    // CLS
    let clsScore = 0;
    try {
      new PerformanceObserver(list => {
        list.getEntries().forEach(e => { if (!e.hadRecentInput) clsScore += e.value; });
        if (clsScore > 0.1) console.warn('[Perf] CLS:', clsScore.toFixed(4));
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  }

  // ── 8. Critical CSS inlining for faster paint ────────
  // Mark above-fold elements to skip JS-dependent classes
  function markAboveFold() {
    const topbar = document.getElementById('topbar');
    const hero   = document.querySelector('.welcome-banner, .panel, h1');
    [topbar, hero].filter(Boolean).forEach(el => el.setAttribute('data-above-fold', ''));
  }

  // ── 9. Font loading optimisation ──────────────────────
  function optimizeFonts() {
    // Add font-display: swap via JS if link is present
    document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(link => {
      if (!link.href.includes('display=swap')) {
        link.href = link.href + '&display=swap';
      }
    });
  }

  // ── 10. Resource hints: DNS prefetch for APIs ─────────
  function addResourceHints() {
    const hints = [
      { rel: 'dns-prefetch', href: 'https://cdn.jsdelivr.net' },
      { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect',   href: 'https://fonts.gstatic.com', crossorigin: '' },
    ];
    hints.forEach(h => {
      if (document.querySelector(`link[href="${h.href}"]`)) return;
      const link = document.createElement('link');
      link.rel   = h.rel;
      link.href  = h.href;
      if (h.crossorigin !== undefined) link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // ── 11. Reduce DOM thrashing ──────────────────────────
  // Batch DOM reads/writes using rAF
  const _reads  = [];
  const _writes = [];
  let _rafScheduled = false;

  function read(fn)  { _reads.push(fn);  _scheduleFlush(); }
  function write(fn) { _writes.push(fn); _scheduleFlush(); }

  function _scheduleFlush() {
    if (_rafScheduled) return;
    _rafScheduled = true;
    requestAnimationFrame(() => {
      _rafScheduled = false;
      const reads  = _reads.splice(0);
      const writes = _writes.splice(0);
      reads.forEach(fn  => { try { fn(); } catch {} });
      writes.forEach(fn => { try { fn(); } catch {} });
    });
  }

  // ── Init ──────────────────────────────────────────────
  function init() {
    addResourceHints();
    optimizeFonts();
    enableHoverPrefetch();
    markAboveFold();
    if (location.hostname !== 'localhost') measureVitals();
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    lazyLoad, lazyLoadChart,
    deferRender, yieldIfNeeded, chunkedIterator,
    debounce, throttle,
    addCleanup, cleanup,
    read, write,
    measureVitals,
  };

})();

window.Perf = Perf;