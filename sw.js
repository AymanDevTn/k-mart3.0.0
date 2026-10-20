/**
 * K-mart Market Tunisia — Service Worker (V2.3)
 * Strategies:
 *  - Navigations : Network-first, cache fallback, offline.html last resort
 *  - Static      : Cache-first (stale-while-revalidate for CSS/JS)
 *  - Images      : Cache-first with a capped LRU-ish eviction
 *  - API         : Network-first with short-lived cache
 */

const VERSION = 'v2.3.0';
const STATIC_CACHE = `kmart-static-${VERSION}`;
const RUNTIME_CACHE = `kmart-runtime-${VERSION}`;
const IMAGE_CACHE = `kmart-images-${VERSION}`;
const API_CACHE = `kmart-api-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/styles.css',
  '/assets/styles-v23.css',
  '/assets/app.js',
  '/assets/utils/i18n.js',
  '/assets/utils/storage.js',
  '/assets/utils/a11y.js',
  '/assets/utils/pwa.js',
  '/assets/data/catalog.js',
  '/assets/data/reviews.js',
  '/assets/i18n/fr.json',
  '/assets/i18n/ar.json',
  '/assets/i18n/en.json',
  '/assets/manifest.webmanifest',
  '/assets/kmart-brand-identity.png',
  '/assets/app-icon-192.png',
  '/assets/app-icon-512.png'
];

const MAX_IMAGE_ENTRIES = 60;
const API_TTL_MS = 60 * 1000; // 1 minute
const IMAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/* ------------------------------------------------------------------ */
/* Install / activate                                                   */
/* ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => console.warn('[sw] precache partial:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('kmart-') && ![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function isImage(request) {
  return request.destination === 'image';
}

function isApi(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(request) {
  return request.destination === 'style' || request.destination === 'script' ||
         request.destination === 'font' || request.destination === 'worker';
}

/** Evict oldest entries when the image cache grows past the cap. */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

/** Return a cached response only if it is still fresh. */
async function freshCacheMatch(request, cacheName, ttl) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (!cached) return null;
  const dateHeader = cached.headers.get('date');
  const storedAt = dateHeader ? new Date(dateHeader).getTime() : 0;
  if (ttl && Date.now() - storedAt > ttl) return null;
  return cached;
}

/* ------------------------------------------------------------------ */
/* Fetch strategies                                                      */
/* ------------------------------------------------------------------ */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const shell = await caches.match('/index.html');
    if (shell) return shell;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
      '<body style="font-family:sans-serif;padding:40px;text-align:center">' +
      '<h1>Vous êtes hors ligne</h1><p>Reconnectez-vous pour accéder à K-mart Market.</p></body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function handleImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in the background when stale
    fetch(request)
      .then((res) => { if (res && res.ok) cache.put(request, res.clone()); })
      .catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
    }
    return response;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}

async function handleStatic(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Stale-while-revalidate
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()));
        }
      })
      .catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 504 });
  }
}

async function handleApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await freshCacheMatch(request, API_CACHE, API_TTL_MS);
    if (cached) return cached;
    const stale = await cache.match(request);
    if (stale) {
      const headers = new Headers(stale.headers);
      headers.set('X-Kmart-Offline', '1');
      return new Response(stale.body, { status: stale.status, headers });
    }
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Network unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/* ------------------------------------------------------------------ */
/* Fetch router                                                         */
/* ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (isApi(request)) {
    event.respondWith(handleApi(request));
    return;
  }
  if (isImage(request)) {
    event.respondWith(handleImage(request));
    return;
  }
  if (isStaticAsset(request)) {
    event.respondWith(handleStatic(request));
  }
});

/* ------------------------------------------------------------------ */
/* Background sync for queued mutations                                 */
/* ------------------------------------------------------------------ */
self.addEventListener('sync', (event) => {
  if (event.tag === 'kmart-sync') {
    event.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  const cache = await caches.open('kmart-sync-queue');
  const requests = await cache.keys();
  const clients = await self.clients.matchAll();
  for (const request of requests) {
    try {
      const body = await request.text();
      await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: body || undefined
      });
      await cache.delete(request);
    } catch (err) {
      // keep it for the next sync
    }
  }
  clients.forEach((client) => client.postMessage({ type: 'SYNC_COMPLETE' }));
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(refreshCatalog());
  }
});

async function refreshCatalog() {
  try {
    const response = await fetch('/api/products?limit=48');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put('/api/products?limit=48', response.clone());
    }
  } catch (err) { /* offline */ }
}

/* ------------------------------------------------------------------ */
/* Push notifications                                                   */
/* ------------------------------------------------------------------ */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'K-mart Market';
  const options = {
    body: data.body || 'De nouvelles offres vous attendent.',
    icon: '/assets/app-icon-192.png',
    badge: '/assets/app-icon-192.png',
    tag: data.tag || 'kmart-promo',
    data: { url: data.url || '/' },
    vibrate: [120, 60, 120]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

/* ------------------------------------------------------------------ */
/* Message channel                                                      */
/* ------------------------------------------------------------------ */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
  if (data.type === 'CACHE_URLS' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) =>
        Promise.all(data.urls.map((u) => cache.add(u).catch(() => {})))
      )
    );
  }
});
