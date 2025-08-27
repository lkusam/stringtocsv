# Chrome Extension V3 - Debugging Guide

## Quick Start

1. **Load the extension in Chrome:**

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select this folder

2. **Test the extension:**

   - Click the extension icon in the toolbar
   - Or use the keyboard shortcut: `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)

3. **Debug using the test page:**
   - Open `test-extension.html` in your browser
   - Check the console for any errors

## Common Issues & Solutions

### Issue: Extension doesn't load

- **Check:** Manifest.json syntax
- **Solution:** Validate JSON syntax, ensure all required fields are present

### Issue: Popup doesn't open

- **Check:** Console errors in extension popup
- **Solution:** Right-click extension icon → "Inspect popup" to see console

### Issue: Workers fail to load

- **Check:** Console for worker loading errors
- **Solution:** Extension falls back to mock workers automatically

### Issue: Tab switching doesn't work

- **Check:** DOM elements are present (`tab-navigation`, `tab-panels`)
- **Solution:** Ensure HTML structure is correct

## Debug Commands

Open the extension popup, then press F12 to open DevTools. Run these commands in the console:

```javascript
// Check app status
window.chromeExtV3App?.getStatistics();

// Check tab manager
window.chromeExtV3App?.tabManager?.getStatistics();

// Check worker pool
window.chromeExtV3App?.workerPool?.getStatistics();

// Test simple conversion
window.chromeExtV3App?.processData({
  input: "apple\nbanana\ncherry",
  settings: { mode: "simple" },
});
```

## File Structure

```
├── manifest.json           # Extension manifest
├── index-v3.html          # Main popup HTML
├── src/v3/
│   ├── index.js           # Main entry point
│   ├── managers/
│   │   └── TabManager.js  # Tab management
│   ├── tabs/
│   │   ├── SimpleTab.js   # Simple conversion tab
│   │   ├── MultiColumnTab.js
│   │   └── BatchTab.js
│   ├── workers/
│   │   ├── ConversionWorker.js
│   │   ├── ValidationWorker.js
│   │   └── ExportWorker.js
│   └── utils/             # Utility classes
├── test-extension.html    # Test page
└── debug-extension.js     # Debug script
```

## Development Tips

1. **Use the test page** (`test-extension.html`) for quick testing without loading as extension
2. **Check the console** for detailed error messages and initialization logs
3. **Use Chrome DevTools** to inspect the popup (right-click extension icon → Inspect popup)
4. **Reload the extension** after making changes (chrome://extensions → reload button)

## Known Limitations

- Workers may fall back to mock implementations if loading fails
- Some features are simplified for v3 compatibility
- Template system is basic (saves to console only)

## Getting Help

If you encounter issues:

1. Check the console for error messages
2. Run the debug script commands above
3. Verify all files are present and properly structured
4. Test with the included test page first
