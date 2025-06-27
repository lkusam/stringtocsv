#!/bin/bash

# Create directories for each browser
mkdir -p dist/chrome dist/firefox dist/safari

# Copy common files to all directories
cp index.html styles.css scripts.js dist/chrome/
cp index.html styles.css scripts.js dist/firefox/
cp index.html styles.css scripts.js dist/safari/

# Copy browser-specific manifest files
cp manifest.json dist/chrome/
cp manifest.firefox.json dist/firefox/manifest.json
cp manifest.safari.json dist/safari/manifest.json

# Create zip files for each browser
cd dist/chrome && zip -r ../../extension-chrome.zip . && cd ../..
cd dist/firefox && zip -r ../../extension-firefox.zip . && cd ../..
cd dist/safari && zip -r ../../extension-safari.zip . && cd ../..

echo "Build complete! Extension packages created for Chrome, Firefox, and Safari."