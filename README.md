# String to CSV Converter

A simple and efficient Chrome extension to convert a string of IDs or values into a CSV (Comma-Separated Values) formatted string.

## Features

- **Robust Live Conversion**: The output is updated automatically as you type or change settings. Optimized to handle large inputs efficiently without freezing the UI, and designed for a smooth startup experience.
- **Multiple Separators**: Supports splitting the input string by new lines, commas, or spaces.
- **Customizable CSV Formatting**:
  - Choose between single (`''`) or double (`""`) quotes for each item.
  - Option to trim leading/trailing whitespace from each item.
- **Dark Mode**: Toggle between light and dark themes for a comfortable viewing experience. Your preference is remembered.
- **One-Click Copy**: Easily copy the formatted CSV output to your clipboard.
- **Clear Output**: Quickly clear the output field.
- **Keyboard Shortcut**: Open the extension popup using `Command+Shift+D` (on Mac) or `Ctrl+Shift+D` (on Windows/Linux).
- **Persistent Settings**: Your last-used separator, quote type, trim preference, and dark mode setting are automatically saved and restored.

## How to Use

1.  **Open the Extension**:
    - Click on the extension icon in your browser's toolbar.
    - Or, use the keyboard shortcut: `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows).
2.  **Input String**: Paste or type your string of values into the "Input String" text area.
3.  **Configure Options**:
    - **Separator**: Select a predefined separator (New Line, Comma, Space) or choose "Custom..." to enter your own.
    - **Quote Type**: Choose whether to enclose items in single or double quotes.
    - **Trim Whitespace**: Check this box to remove any leading or trailing spaces from each item.
    - **Dark Mode**: Toggle this switch to switch between light and dark themes.
4.  **View Output**: The formatted CSV string appears automatically in the "CSV Output" area as you type or change settings. A loader will indicate processing for large inputs.
5.  **Copy**: Click the "Copy" button to copy the output to your clipboard.
6.  **Clear**: Click the "Clear" button to clear the output field.

## Installation

### For Development

To install this extension locally for development:

1.  Clone or download this repository.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" by toggling the switch in the top-right corner.
4.  Click on the "Load unpacked" button.
5.  Select the directory where you cloned or downloaded the extension files.
6.  The "String to CSV Converter" extension should now appear in your list of extensions and be ready to use.

## Privacy

Your privacy is important. This extension processes all data locally on your machine and does not collect, store, or transmit any of your data. For more details, please see our Privacy Policy.
