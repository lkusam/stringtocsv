# String to CSV Converter

A browser extension that converts strings to CSV format with various separator options.

## Browser Support

This extension supports:
- Chrome and Chromium-based browsers:
  - Google Chrome
  - Microsoft Edge
  - Brave
  - Arc
  - Opera
  - Vivaldi
- Firefox
- Safari

## Installation Instructions

### Chrome and Chromium-based browsers
- Install from the [Chrome Web Store](https://chrome.google.com/webstore/detail/your-extension-id)
- Edge users can also install from the [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/)
- Or load unpacked from the `dist/chrome` directory

### Firefox
- Install from [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/your-addon-id)
- Or load temporarily from `about:debugging` using the `dist/firefox` directory

### Safari
- Safari extension requires additional packaging with Xcode
- Use the `dist/safari` directory as the base for Safari extension project

## Development

### Setup
```
npm install
```

### Build for all browsers
```
./build.sh
```

This will create:
- `extension-chrome.zip` - For Chrome, Edge, and other Chromium browsers
- `extension-firefox.zip` - For Firefox
- `extension-safari.zip` - Base files for Safari extension

## Publishing

### Chrome Web Store
Automatically published via GitHub Actions workflow

### Firefox Add-ons
Manual upload required to [AMO Developer Hub](https://addons.mozilla.org/developers/)

### Safari App Store
Requires additional packaging with Xcode and submission through App Store Connect

## Key Differences Between Browser Extensions

### Manifest Version
- Chrome/Edge: Manifest V3
- Firefox: Manifest V2 (transitioning to V3)
- Safari: Manifest V3

### Browser Action
- Chrome/Edge: `action`
- Firefox: `browser_action` (in Manifest V2)
- Safari: `action`

### Extension ID
- Firefox requires explicit ID in the manifest