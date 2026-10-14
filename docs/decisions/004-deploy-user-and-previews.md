# D4. Deploy user and previews

- **Date:** 2026-10-15 (way of working)

GitHub Actions builds with `tools/build.sh` and rsyncs as the server's `deploy` user with a Lisear-only key, forced to
`rrsync -no-lock /var/www/apps` (it replaces the old scp deploy with a root key). Production: `/var/www/apps/lisear/`;
previews: `/var/www/apps/lisear-previews/pr-N/`. A deploy uploads the assets first and `index.html` + `sw.js` last,
so no visitor gets a page whose assets are not there yet.
