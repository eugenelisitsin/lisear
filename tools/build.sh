#!/bin/sh
# Build the deployable app into <outdir>: JS/CSS in a content-hashed folder (the server caches assets
# for a year, D5), the service worker stamped with that folder's name, everything else copied as is.
# Used by the GitHub Actions deploy and preview workflows. Prints the asset folder name.
set -e
cd "$(dirname "$0")/.."
OUT=${1:?usage: tools/build.sh <outdir>}
ASSETS=$(ls www/*.js www/*.css | grep -v '^www/sw\.js$')
HASH=$(cat $ASSETS | shasum | cut -c1-8)
rm -rf "$OUT"
mkdir -p "$OUT/a-$HASH"
cp -R www/. "$OUT/"
for f in $ASSETS; do mv "$OUT/${f#www/}" "$OUT/a-$HASH/"; done
for f in $ASSETS; do
  n=${f#www/}
  sed -i.bak -E "s#(href|src)=\"$n\"#\1=\"a-$HASH/$n\"#" "$OUT/index.html"
done
sed -i.bak "s#^const BUILD = 'dev';#const BUILD = 'a-$HASH';#" "$OUT/sw.js"
rm -f "$OUT"/*.bak "$OUT/.DS_Store" "$OUT"/*/.DS_Store
grep -q "a-$HASH/app.js" "$OUT/index.html" || { echo "build: app.js not re-pointed in index.html" >&2; exit 1; }
grep -q "const BUILD = 'a-$HASH';" "$OUT/sw.js" || { echo "build: sw.js not stamped" >&2; exit 1; }
chmod -R a+rX "$OUT"
echo "a-$HASH"
