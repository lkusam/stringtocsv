#!/usr/bin/env bash
# Builds one folder per browser under dist/ and zips the Chrome and Firefox
# builds for store upload. dist/safari is what the Safari Xcode project packages.
set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)

rm -rf dist
for TARGET in chrome firefox safari; do
  OUT="dist/$TARGET"
  mkdir -p "$OUT/icons" "$OUT/vendor"
  cp index.html scripts.js styles.css "$OUT/"
  cp icons/icon-{16,32,48,96,128}.png "$OUT/icons/"
  cp -R vendor/fontawesome "$OUT/vendor/"

  if [ "$TARGET" = firefox ]; then
    cp manifest.json "$OUT/"
  else
    # browser_specific_settings is Firefox-only; Chrome warns about unknown keys
    python3 -c 'import json, sys; m = json.load(open(sys.argv[1])); m.pop("browser_specific_settings", None); json.dump(m, open(sys.argv[2], "w"), indent=2)' \
      manifest.json "$OUT/manifest.json"
  fi
done

for TARGET in chrome firefox; do
  (cd "dist/$TARGET" && zip -qrX "../string-to-csv-converter-$TARGET-v$VERSION.zip" . -x '.*')
done

echo "Built dist/{chrome,firefox,safari} and zips for v$VERSION:"
ls dist/*.zip
