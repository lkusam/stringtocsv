# String to CSV Converter

A modern and efficient Chrome extension to convert a string of IDs or values into a CSV (Comma-Separated Values) formatted string with advanced theming and customization options.

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

## Technical Details

### Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Compatible with Chromium-based Edge
- **Performance**: Optimized for inputs up to 15 million characters

### Architecture

- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: CSS3 with CSS Custom Properties for theming
- **Storage**: Chrome Extension Storage API for settings persistence
- **Performance**: Debounced input processing and efficient DOM manipulation

### File Structure

```
├── index.html          # Main popup interface
├── scripts.js          # Core functionality and event handling
├── styles.css          # Styling and theme definitions
├── manifest.json       # Extension configuration
└── README.md          # Documentation
```

## Changelog

### Latest Updates

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
- **Only uses Chrome Storage API** to save your preferences locally
- **Requires no special permissions** beyond basic extension functionality
- **Open source** - all code is transparent and auditable

For more details, please see our Privacy Policy.
