#!/usr/bin/env bash
# Assembles the shippable extension into dist/ (used by CI, web-ext and the Safari Xcode project).
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist/icons dist/vendor
cp manifest.json index.html scripts.js styles.css dist/
cp icons/icon-{16,32,48,96,128}.png dist/icons/
cp -R vendor/fontawesome dist/vendor/
echo "Built dist/ (version $(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4))"
