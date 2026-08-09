/* Our Journey To You — service worker.
   Caches the app shell so the journal opens instantly and works fully
   offline once it has been visited once (pages & photos themselves live
   in IndexedDB on the device, so they need no network at all).

   Bump CACHE when you change index.html / styles.css / app.js so the
   new version replaces the old cache on the next visit. */
const CACHE = 'journey-journal-v45';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './chat-widget.js',
  './guide-data.js',
  './art-prompts.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Serve from cache first, refresh it in the background when online. */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* Google fonts — cache for offline use. */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  /* App shell (same origin). Photo blobs are served from blob: URLs and
     never hit the network, so everything here is static assets. */
  if (url.origin === location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
