/* ============================================================
   STUDYAI — sw.js  (Service Worker)
   Strategy:
   - Static assets  → Cache First (CSS, JS, fonts)
   - API calls      → Network First with cache fallback
   - HTML pages     → Stale-While-Revalidate
   - AI endpoints   → Network only (no caching AI responses)
   ============================================================ */

const APP_VERSION   = 'studyai-v1.3';
const STATIC_CACHE  = `${APP_VERSION}-static`;
const DYNAMIC_CACHE = `${APP_VERSION}-dynamic`;
const API_CACHE     = `${APP_VERSION}-api`;

// ── Assets to pre-cache on install ───────────────────────
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/notes.html',
  '/chat.html',
  '/quiz.html',
  '/flashcards.html',
  '/focus.html',
  '/planner.html',
  '/doubt.html',
  '/revision.html',
  '/summaries.html',
  '/analytics.html',
  '/achievements.html',
  '/settings.html',
  '/groups.html',
  '/assets/css/global.css',
  '/assets/css/components.css',
  '/assets/css/mobile.css',
  '/assets/js/subjects.js',
  '/assets/js/auth.js',
  '/assets/js/utils.js',
  '/assets/js/sidebar.js',
  '/assets/js/storage.js',
  '/assets/js/events.js',
  '/assets/js/skeletons.js',
  '/assets/js/smart-upload.js',
  '/offline.html',
];

// ── AI endpoints — never cache ────────────────────────────
const NO_CACHE_PATTERNS = [
  '/api/ai/',
  '/api/upload/',
];

// ── API data endpoints — cache with short TTL ─────────────
const API_CACHE_PATTERNS = [
  '/api/data',
  '/api/ping',
];

// ── Install: pre-cache all static assets ─────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Pre-caching static assets');
      // Cache individually so one failure doesn't block all
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== API_CACHE)
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: route-based strategy ───────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin + CDN
  if (url.origin !== location.origin && !url.hostname.includes('jsdelivr.net') && !url.hostname.includes('googleapis.com')) {
    return; // Let browser handle cross-origin normally
  }

  // POST requests — always network (can't cache POST)
  if (request.method !== 'GET') return;

  // AI endpoints — network only, never cache
  if (NO_CACHE_PATTERNS.some(p => url.pathname.startsWith(p))) {
    event.respondWith(networkOnly(request));
    return;
  }

  // API data endpoints — network first, fallback to cache
  if (API_CACHE_PATTERNS.some(p => url.pathname.startsWith(p))) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 60)); // 60s TTL
    return;
  }

  // Static assets (CSS, JS, fonts, images) — cache first
  if (
    url.pathname.match(/\.(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|gif|ico)$/) ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages — stale while revalidate
  if (request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else — network first
  event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE, 300));
});

// ── Strategies ────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — asset not cached', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName, ttlSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // Store with timestamp header for TTL checking
      const cloned = response.clone();
      const headers = new Headers(cloned.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const ttlResponse = new Response(await cloned.blob(), { status: cloned.status, headers });
      cache.put(request, ttlResponse);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
      const age = (Date.now() - cachedAt) / 1000;
      if (age < ttlSeconds * 10) return cached; // Use stale cache up to 10x TTL when offline
    }
    return offlineFallback(request);
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'You are offline. Please check your connection.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  // Revalidate in background
  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  // Return cached immediately, or wait for network
  return cached || await networkFetch || offlineFallback(request);
}

async function offlineFallback(request) {
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    const offline = await caches.match('/offline.html');
    if (offline) return offline;
    return new Response(offlinePageHTML(), { headers: { 'Content-Type': 'text/html' } });
  }
  return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Inline offline page (fallback if offline.html not cached) ─
function offlinePageHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>StudyAI — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#080b14;color:#e8eaf6;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
    .icon{font-size:4rem;margin-bottom:20px}
    h1{font-size:1.6rem;font-weight:800;margin-bottom:10px;background:linear-gradient(135deg,#667eea,#f093fb);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    p{color:#8b90b3;margin-bottom:24px;line-height:1.6}
    button{padding:12px 28px;border-radius:12px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:.95rem;font-weight:700;cursor:pointer}
  </style>
</head>
<body>
  <div>
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>StudyAI needs an internet connection for AI features.<br>Your notes and data are saved locally.</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>`;
}

// ── Background Sync — queue failed saves ─────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncQueuedData());
  }
});

async function syncQueuedData() {
  // Notify clients that sync is happening
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_START' }));
  console.log('[SW] Background sync triggered');
}

// ── Push notifications (future use) ──────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'StudyAI', {
      body   : data.body    || 'You have a study reminder!',
      icon   : '/assets/icons/icon-192.png',
      badge  : '/assets/icons/icon-192.png',
      tag    : data.tag     || 'studyai-notif',
      data   : { url: data.url || '/dashboard.html' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/dashboard.html')
  );
});

// ── Message from client ───────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_URLS') {
    caches.open(DYNAMIC_CACHE).then(cache => cache.addAll(event.data.urls || []));
  }
});