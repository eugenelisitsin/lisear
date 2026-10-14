# D5. Content-hashed assets, pages that revalidate

- **Date:** 2026-10-15

Caddy sends `Cache-Control: max-age=1 year` for everything on apps.lisitsin.com. With `app.js` at a fixed URL a
phone could keep the old app long after a deploy. Now:

- `tools/build.sh` moves the JS and CSS into `a-<hash>/` and points `index.html` at it.
- Caddy sends `no-cache` for the Lisear pages, `sw.js` and `manifest.json` (production and previews).
- The service worker is stamped with the asset folder name, so every deploy installs a new one. It keeps two caches
  per scope: the app shell for this build, and the samples (kept across deploys). Samples and hashed assets are
  served cache-first, pages network-first with the cache as the offline fallback. Its first install fetches with
  `cache: 'reload'` to get past pages the browser cached before this change.
- Cache names include the service worker's scope: production and previews share one origin and must not delete
  each other's caches.

Locally nothing is hashed: `tools/serve.py` sends `no-store` and `sw.js` keeps `BUILD = 'dev'`.
