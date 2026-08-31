const CACHE_NAME = 'lisear-v3';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './app.js',
    './styles.css',
    './samples/C2.mp3',
    './samples/Ds2.mp3',
    './samples/Fs2.mp3',
    './samples/A2.mp3',
    './samples/C3.mp3',
    './samples/Ds3.mp3',
    './samples/Fs3.mp3',
    './samples/A3.mp3',
    './samples/C4.mp3',
    './samples/Ds4.mp3',
    './samples/Fs4.mp3',
    './samples/A4.mp3'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Samples never change, so serve them from the cache. Everything else is
// network-first so a deploy shows up without waiting for a cache-name bump.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const isSample = new URL(event.request.url).pathname.endsWith('.mp3');

    if (isSample) {
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return response;
            }))
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
