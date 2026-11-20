// Minimal Offline/Installation Service Worker for Personalized Bible Study PWA
const CACHE_NAME = 'personalised-bible-v5';
const BIBLE_CACHE = 'bible-translations-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/data/kjv.json?v=1769_v3',
  '/data/kjv.json',
  '/icon.svg',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {
        // If some assets fail in dev mode, don't crash
        console.log('Skipped non-existent assets in installation cache');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Keep both the app cache and bible translations cache
          if (key !== CACHE_NAME && key !== BIBLE_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // CACHE-FIRST for bible-api.com — read once, available offline forever
  if (url.hostname === 'bible-api.com') {
    event.respondWith(
      caches.open(BIBLE_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Serve from cache immediately (offline-friendly)
            return cachedResponse;
          }
          // Not cached yet — fetch from network and store
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // NETWORK-FIRST for everything else (app assets, API calls)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clonedResponse);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
