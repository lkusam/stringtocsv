#!/usr/bin/env bash
# Renders the store screenshots from desktop.html and mobile.html into screenshots/<store>/.
# Requires macOS (uses WebKit via snap.swift). Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")/../.."

./build.sh >/dev/null

PORT=8767
python3 -m http.server "$PORT" -d . >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1

NAMES=(paste-list separators big-lists private)
mkdir -p screenshots/mac-app-store screenshots/iphone-app-store screenshots/ipad-app-store \
  screenshots/chrome-web-store screenshots/firefox-addons
for i in 1 2 3 4; do
  N="0$i-${NAMES[$((i - 1))]}"
  RAW="screenshots/mac-app-store/$N-2880x1800.png"
  swift screenshots/tools/snap.swift "http://localhost:$PORT/screenshots/tools/desktop.html?scene=$i" 1440 900 2 "$RAW" 2>/dev/null
  sips -z 800 1280 "$RAW" --out "screenshots/chrome-web-store/$N-1280x800.png" >/dev/null
  cp "screenshots/chrome-web-store/$N-1280x800.png" "screenshots/firefox-addons/$N-1280x800.png"
  # iPhone 6.9" accepts 1320x2868 / 1290x2796; 6.5" accepts 1284x2778 / 1242x2688 (all rendered at 3x)
  for VIEW in 440x956 430x932 428x926 414x896; do
    W=${VIEW%x*}; H=${VIEW#*x}
    swift screenshots/tools/snap.swift "http://localhost:$PORT/screenshots/tools/mobile.html?device=phone&scene=$i" "$W" "$H" 3 \
      "screenshots/iphone-app-store/$N-$((W * 3))x$((H * 3)).png" 2>/dev/null
  done
  # iPad 13" accepts 2064x2752 / 2048x2732 (rendered at 2x)
  for VIEW in 1032x1376 1024x1366; do
    W=${VIEW%x*}; H=${VIEW#*x}
    swift screenshots/tools/snap.swift "http://localhost:$PORT/screenshots/tools/mobile.html?device=tablet&scene=$i" "$W" "$H" 2 \
      "screenshots/ipad-app-store/$N-$((W * 2))x$((H * 2)).png" 2>/dev/null
  done
  echo "rendered $N"
done

# App Store Connect rejects screenshots with an alpha channel; flatten them all.
for F in screenshots/*/*.png; do
  sips -s format jpeg -s formatOptions best "$F" --out "$F.jpg" >/dev/null
  sips -s format png "$F.jpg" --out "$F" >/dev/null
  rm "$F.jpg"
done
