// tools/build.sh stamps BUILD with the content-hashed asset folder (D5); locally it stays 'dev'.
const BUILD = 'dev';
const ASSETS = BUILD === 'dev' ? './' : `./${BUILD}/`;

// Production and every preview share one origin, so cache names carry the scope:
// a preview never deletes the live app's caches, or the other way round.
const SCOPE = self.registration.scope;
const SHELL_CACHE = `${SCOPE}|shell|${BUILD}`;
const SAMPLE_CACHE = `${SCOPE}|samples|v1`;

const SHELL = [
    './',
    './index.html',
    './manifest.json',
    ASSETS + 'app.js',
    ASSETS + 'styles.css'
];
const SAMPLES = ['C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4']
    .map(note => `./samples/${note}.mp3`);

self.addEventListener('install', event => {
    // 'reload' skips the browser's HTTP cache, which may still hold pages from before D5
    const fresh = urls => urls.map(url => new Request(url, { cache: 'reload' }));
    event.waitUntil(Promise.all([
        caches.open(SHELL_CACHE).then(cache => cache.addAll(fresh(SHELL))),
        caches.open(SAMPLE_CACHE).then(cache => cache.addAll(SAMPLES))
    ]));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => Promise.all(names
            .filter(name => name === 'lisear-v3' ||
                (name.startsWith(SCOPE + '|') && name !== SHELL_CACHE && name !== SAMPLE_CACHE))
            .map(name => caches.delete(name))))
    );
    self.clients.claim();
});

// Samples and content-hashed assets never change: cache-first. Pages are network-first so a
// deploy shows up on the next visit, with the cached copy as the offline fallback.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const path = new URL(event.request.url).pathname;
    const immutable = path.endsWith('.mp3') || /\/a-[0-9a-f]{8}\//.test(path);

    if (immutable) {
        const cacheName = path.endsWith('.mp3') ? SAMPLE_CACHE : SHELL_CACHE;
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
                const copy = response.clone();
                caches.open(cacheName).then(cache => cache.put(event.request, copy));
                return response;
            }))
        );
        return;
    }

    event.respondWith(
        fetch(event.request, { cache: 'no-cache' })
            .then(response => {
                const copy = response.clone();
                caches.open(SHELL_CACHE).then(cache => cache.put(event.request, copy));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
