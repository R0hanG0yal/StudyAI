/* ============================================================
   STUDYAI — cache.js  (Part 5)
   Smart client-side API cache:
   - TTL-based cache per endpoint
   - In-flight request deduplication (prevents duplicate fetches)
   - Stale-while-revalidate for data endpoints
   - Instant responses from cache + background refresh
   ============================================================ */

const APICache = (function() {

  // ── Cache store ────────────────────────────────────────
  const _store    = new Map(); // key → { data, ts, etag }
  const _inflight = new Map(); // key → Promise (dedup)

  // ── TTL config per endpoint pattern (milliseconds) ────
  const TTL_CONFIG = {
    '/api/data'       : 30  * 1000,  // 30s  — user data changes often
    '/api/ping'       : 60  * 1000,  // 60s  — health check
    'jsdelivr.net'    : 24 * 3600 * 1000, // 24h — CDN assets
  };

  const DEFAULT_TTL = 15 * 1000; // 15s default

  function _getTTL(url) {
    for (const [pattern, ttl] of Object.entries(TTL_CONFIG)) {
      if (url.includes(pattern)) return ttl;
    }
    return DEFAULT_TTL;
  }

  // ── Cache key from request ─────────────────────────────
  function _key(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET') return null; // Only cache GETs
    return `${method}:${url}`;
  }

  // ── Check if cached entry is fresh ────────────────────
  function _isFresh(entry, url) {
    if (!entry) return false;
    const ttl = _getTTL(url);
    return (Date.now() - entry.ts) < ttl;
  }

  // ── Get from cache ─────────────────────────────────────
  function get(url) {
    const k = _key(url);
    if (!k) return null;
    return _store.get(k) || null;
  }

  // ── Set in cache ──────────────────────────────────────
  function set(url, data, etag = null) {
    const k = _key(url);
    if (!k) return;
    _store.set(k, { data, ts: Date.now(), etag });
  }

  // ── Invalidate cache entry ────────────────────────────
  function invalidate(urlPattern) {
    for (const key of _store.keys()) {
      if (key.includes(urlPattern)) _store.delete(key);
    }
  }

  // ── Clear all cache ───────────────────────────────────
  function clear() { _store.clear(); }

  // ── Cached fetch: cache-first + stale-while-revalidate ─
  async function cachedFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();

    // Never cache non-GETs or AI endpoints
    if (method !== 'GET' || url.includes('/api/ai/')) {
      return fetch(url, options);
    }

    const k = _key(url);
    const cached = _store.get(k);

    // ── Fresh cache: return immediately ──────────────────
    if (cached && _isFresh(cached, url)) {
      return new Response(JSON.stringify(cached.data), {
        status : 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    // ── In-flight deduplication ──────────────────────────
    if (_inflight.has(k)) {
      const result = await _inflight.get(k);
      return result.clone();
    }

    // ── Stale cache: return stale + revalidate in BG ─────
    if (cached) {
      // Start background revalidation
      const bgFetch = _doFetch(url, options, k);
      _inflight.set(k, bgFetch);
      bgFetch.finally(() => _inflight.delete(k));
      bgFetch.catch(() => {}); // Silence unhandled rejection for BG fetch

      // Return stale data immediately
      return new Response(JSON.stringify(cached.data), {
        status : 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'STALE' },
      });
    }

    // ── No cache: fetch and store ─────────────────────────
    const fetchPromise = _doFetch(url, options, k);
    _inflight.set(k, fetchPromise);
    try {
      const response = await fetchPromise;
      return response;
    } finally {
      _inflight.delete(k);
    }
  }

  async function _doFetch(url, options, cacheKey) {
    const cached = _store.get(cacheKey);

    // Add ETag/If-None-Match for conditional requests
    const headers = { ...(options.headers || {}) };
    if (cached?.etag) headers['If-None-Match'] = cached.etag;

    const response = await fetch(url, { ...options, headers });

    // 304 Not Modified — return cached data
    if (response.status === 304 && cached) {
      _store.set(cacheKey, { ...cached, ts: Date.now() }); // refresh timestamp
      return new Response(JSON.stringify(cached.data), {
        status : 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'REVALIDATED' },
      });
    }

    if (response.ok) {
      const cloned = response.clone();
      const data   = await cloned.json().catch(() => null);
      if (data !== null) {
        const etag = response.headers.get('ETag');
        _store.set(cacheKey, { data, ts: Date.now(), etag });
      }
    }

    return response;
  }

  // ── Cache stats (for debug) ───────────────────────────
  function stats() {
    const entries = [];
    for (const [key, val] of _store.entries()) {
      entries.push({ key, age: Math.round((Date.now()-val.ts)/1000)+'s', hasEtag: !!val.etag });
    }
    return { size: _store.size, inflight: _inflight.size, entries };
  }

  return { get, set, invalidate, clear, cachedFetch, stats };

})();

// ── Patch storage.js apiGet to use cache ──────────────────
// Override the global apiGet defined in utils.js to use cache
(function patchApiGet() {
  const _originalApiFetch = window.apiFetch;
  if (typeof _originalApiFetch !== 'function') return; // utils.js not loaded yet

  window.apiFetch = async function(method, path, body) {
    // Only intercept GET requests to /api/data
    if (method === 'GET' && path.startsWith('/api/data')) {
      const token = localStorage.getItem('sa_token');
      const url   = path;
      const opts  = {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      };
      const response = await APICache.cachedFetch(url, opts);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    }
    // All other requests pass through normally
    return _originalApiFetch(method, path, body);
  };
})();

// Re-patch when DOM is ready (in case utils.js loads after)
document.addEventListener('DOMContentLoaded', () => {
  if (typeof apiFetch === 'function') {
    const orig = apiFetch;
    window.apiFetch = async function(method, path, body) {
      if (method === 'GET' && path.startsWith('/api/data')) {
        const token = localStorage.getItem('sa_token');
        const opts  = { method, headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) } };
        const response = await APICache.cachedFetch(path, opts);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        // Invalidate cache after any write
        return data;
      }
      // POST writes should invalidate cache
      if (method === 'POST' && path.startsWith('/api/data')) {
        APICache.invalidate('/api/data');
      }
      return orig(method, path, body);
    };
  }
});