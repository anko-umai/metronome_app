const CACHE_NAME = 'metronome-v5';
const ASSETS = [
  './',
  './index.html',
  './rhythm.html',
  './guide.html',
  './tips.html',
  './css/style.css',
  './js/app.js',
  './js/metronome.js',
  './js/ui.js',
  './js/staff-renderer.js',
  './js/rhythm-editor.js',
  './js/app-rhythm.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
