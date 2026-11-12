const CACHE = '0bsidian-v13';
// Exact URLs, query strings included, so a new ?v= in index.html fetches fresh copies
const SHELL = [
  '/',
  '/styles.css?v=20',
  '/app.js?v=15',
  '/boot.js?v=1',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/fonts/bodoni-moda.woff2',
  '/fonts/bodoni-moda-italic.woff2',
  '/fonts/schibsted-grotesk.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Pictures and their list come from the worker, which sets its own caching
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for pages; offline, the saved copy of the homepage
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }

  const fromNetwork = () => fetch(e.request).then(res => {
    if (res && res.status === 200 && res.type === 'basic') {
      const clone = res.clone();
      e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, clone)));
    }
    return res;
  });

  // Cache-first for files that never change under the same address (?v= assets, fonts, icons)
  if (url.searchParams.has('v') || /^\/(fonts|icons)\//.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(cached => cached || fromNetwork()));
    return;
  }

  // Everything else: fresh from the network, the saved copy when offline
  e.respondWith(fromNetwork().catch(() => caches.match(e.request).then(cached => cached || Response.error())));
});

// Clicking a "timer ended" notification brings the tab back
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const client = list.find(c => new URL(c.url).origin === location.origin);
      return client ? client.focus() : self.clients.openWindow('/');
    })
  );
});
