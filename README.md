# String to CSV Converter

A modern and efficient browser extension for Chrome, Edge, Firefox and Safari to convert a string of IDs or values into a CSV (Comma-Separated Values) formatted string with advanced theming and customization options.

## Features

### Core Functionality

- **Robust Live Conversion**: The output is updated automatically as you type or change settings. Optimized to handle large inputs efficiently without freezing the UI, and designed for a smooth startup experience.
- **Multiple Separators**: Supports splitting the input string by new lines, commas, spaces, or custom separators.
- **Customizable CSV Formatting**:
  - Choose between single (`''`) or double (`""`) quotes for each item.
  - Option to trim leading/trailing whitespace from each item.
  - Custom separator support with visual feedback.

### User Interface & Experience

- **Modern Themes**: Choose between Classic and Material UI themes for different visual experiences.
- **Dark Mode**: Toggle between light and dark themes for comfortable viewing in any environment. Your preference is remembered.
- **Collapsible Settings**: Organized settings panel with expandable sections for better space utilization.
- **Visual Feedback**: Dynamic icons and indicators show current separator and quote type selections.
- **Resizable Interface**: Drag to resize the extension window to your preferred dimensions.
- **Input Counter**: Real-time character and line count display for input monitoring.

### Productivity Features

- **One-Click Copy**: Easily copy the formatted CSV output to your clipboard with visual confirmation.
- **Clear Output**: Quickly clear both input and output fields.
- **Keyboard Shortcuts**:
  - Open extension: `Command+Shift+D` (Mac) or `Ctrl+Shift+D` (Windows/Linux)
  - Resize window: `Ctrl/Cmd + +/-` to increase/decrease size, `Ctrl/Cmd + 0` to reset
- **Persistent Settings**: All preferences including separator, quote type, trim setting, theme, and window size are automatically saved and restored.

### Advanced Features

- **Material Design 3**: Modern Material UI theme with dynamic color system and proper accessibility.
- **Responsive Design**: Adapts to different window sizes and maintains usability across various screen dimensions.
- **Error Handling**: Graceful error handling with user-friendly error messages.
- **Performance Optimized**: Debounced input processing and efficient rendering for smooth performance.

## How to Use

### Basic Usage

1.  **Open the Extension**:

    - Click on the extension icon in your browser's toolbar.
    - Or, use the keyboard shortcut: `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows).

2.  **Input Your Data**: Paste or type your string of values into the "Input String" text area. The character and line count will update in real-time.

3.  **Configure Conversion Options** (click "Conversion Options" to expand):

    - **Separator**: Select how to split your input:
      - New Line (↵) - Split by line breaks
      - Comma (,) - Split by commas
      - Space (␣) - Split by spaces
      - Custom... - Enter your own separator
    - **Quote Type**: Choose the quote style:
      - Single Quotes (') - Wrap items in single quotes
      - Double Quotes (") - Wrap items in double quotes

4.  **Adjust Settings** (click the gear icon):

    - **Theme**: Choose between Classic or Material UI themes
    - **Dark Mode**: Toggle between light and dark appearance
    - **Trim Whitespace**: Remove leading/trailing spaces from each item

5.  **View Results**: The formatted CSV string appears automatically in the "CSV Output" area as you type or change settings.

6.  **Copy & Use**: Click the "Copy" button to copy the output to your clipboard. The button will show "Copied!" confirmation.

7.  **Clear**: Click the "Clear" button to reset both input and output fields.

### Advanced Features

- **Window Resizing**: Drag the resize handle in the bottom-right corner to adjust window size, or use keyboard shortcuts (`Ctrl/Cmd + +/-`)
- **Custom Separators**: When "Custom..." is selected, enter any character sequence up to 5 characters
- **Visual Indicators**: Icons next to selectors show your current separator and quote type choices
- **Persistent Preferences**: All your settings are automatically saved and restored between sessions

## Installation

### For Development

To install this extension locally for development:

1.  Clone or download this repository.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" by toggling the switch in the top-right corner.
4.  Click on the "Load unpacked" button.
5.  Select the directory where you cloned or downloaded the extension files.
6.  The "String to CSV Converter" extension should now appear in your list of extensions and be ready to use.

### Building for Chrome, Firefox and Safari

Run `./build.sh`. It creates one folder per browser under `dist/` and zips the Chrome and Firefox builds:

```
dist/
├── chrome/                                   # load unpacked in Chrome / Edge
├── firefox/                                  # includes the Firefox-only manifest settings
├── safari/                                   # packaged by the Safari Xcode project
├── string-to-csv-converter-chrome-v<version>.zip
└── string-to-csv-converter-firefox-v<version>.zip
```

- **Chrome / Edge**: load `dist/chrome` unpacked from `chrome://extensions` (Developer mode).
- **Firefox** (and LibreWolf, Zen, Waterfox, Floorp): open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** and pick `dist/firefox/manifest.json`.
- **Safari** (macOS and iOS): open `safari/String to CSV/String to CSV.xcodeproj` in Xcode. It packages the files in `dist/safari`, so run `./build.sh` before building or archiving.

## Releasing

Store uploads are manual. GitHub Actions only builds the zips.

1. Bump `version` in `manifest.json` and merge to `main`.
2. The **Build Release Zips** workflow runs `./build.sh` and creates a GitHub release `v<version>` with the Chrome and Firefox zips attached. If that version's release already exists, it builds but doesn't publish anything.
3. Download the zips from the release and upload them:

### Chrome

Chrome Web Store Developer Dashboard → select the item → **Package** → **Upload new package** → choose `string-to-csv-converter-chrome-v<version>.zip` → **Submit for review**.

### Firefox

addons.mozilla.org → Developer Hub → **My Add-ons** → String to CSV converter → **Upload New Version** → choose `string-to-csv-converter-firefox-v<version>.zip` → answer **No** to the source code question → add release notes → **Submit Version**.

### Safari

Each release is archived and uploaded from Xcode on a Mac.

One-time setup:

1. Join the Apple Developer Program.
2. In App Store Connect, create a new app for macOS and iOS with bundle ID `com.byteseed.StringToCSV`. Register `com.byteseed.StringToCSV` and `com.byteseed.StringToCSV.Extension` under Certificates, Identifiers & Profiles if they aren't offered.
3. The Xcode project is already set to the BYTESEED LLC team (`2RFAV6KVU4`) with automatic signing. Make sure Xcode → Settings → Accounts is signed in to an Apple ID on that team.

For each release:

1. Merge the version bump to `main` and pull it, then run `./build.sh`.
2. In Xcode, set **Version** (MARKETING_VERSION) to the manifest version on all four targets. Increase **Build** (CURRENT_PROJECT_VERSION) on all four targets; every upload needs a new build number.
3. Select the **String to CSV (macOS)** scheme, run **Product → Archive**, then in the Organizer choose **Distribute App → App Store Connect → Upload**.
4. Repeat with the **String to CSV (iOS)** scheme and the **Any iOS Device** destination.
5. In App Store Connect, complete the listing (screenshots, description, support URL, privacy policy `https://lkusam.github.io/stringtocsv/privacy.html`, App Privacy: Data Not Collected), select the uploaded build, and **Submit for Review**.

## Technical Details

### Browser Compatibility

- **Chrome / Edge**: Fully supported (Manifest V3)
- **Firefox**: Supported from Firefox 140 (also LibreWolf, Zen, Waterfox, Floorp)
- **Safari**: Supported on macOS and iOS via the Xcode project in `safari/`
- **Performance**: Optimized for inputs up to 15 million characters

### Architecture

- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: CSS3 with CSS Custom Properties for theming
- **Storage**: WebExtension `storage.sync` API for settings persistence
- **Performance**: Debounced input processing and efficient DOM manipulation

### File Structure

```
├── index.html          # Main popup interface
├── scripts.js          # Core functionality and event handling
├── styles.css          # Styling and theme definitions
├── manifest.json       # Extension configuration (Chrome, Firefox, Safari)
├── icons/              # Extension and app icons (icon.svg is the source)
├── vendor/fontawesome/ # Bundled Font Awesome icon font
├── build.sh            # Builds dist/<browser> folders and store zips
├── safari/             # Safari Web Extension Xcode project (macOS + iOS)
├── docs/privacy.html   # Privacy policy (served via GitHub Pages)
└── README.md           # Documentation
```

## Changelog

### v2.6

- **Firefox and Safari support**: Firefox add-on settings, Safari Xcode project, shared `build.sh`
- **Extension icons**: New toolbar and store icons
- **Offline icons**: Font Awesome is bundled instead of loaded from a CDN
- **Cleanup**: Removed debug logging (including logging of input text) and unused files

### v2.5

- **Enhanced UI/UX**: Added Material Design 3 theme with modern styling
- **Improved Accessibility**: Better contrast ratios and keyboard navigation
- **Resizable Interface**: Drag-to-resize functionality with size persistence
- **Visual Feedback**: Dynamic icons and real-time input counters
- **Performance Optimization**: Improved handling of large inputs
- **Settings Organization**: Collapsible sections for better space management
- **Theme System**: Comprehensive theming with light/dark mode support

### Previous Versions

- **v1.0**: Initial release with basic conversion functionality
- **v1.1**: Added dark mode and settings persistence
- **v1.2**: Introduced custom separators and improved error handling
- **v1.3**: Enhanced performance and added keyboard shortcuts

## Privacy & Security

Your privacy is important. This extension:

- **Processes all data locally** on your machine
- **Does not collect, store, or transmit** any of your data to external servers
- **Only uses the browser's extension storage API** to save your preferences locally
- **Requires no special permissions** beyond basic extension functionality
- **Open source** - all code is transparent and auditable

For more details, please see our Privacy Policy.
