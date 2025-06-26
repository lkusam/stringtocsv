# String to CSV Converter

A simple and efficient Chrome extension to convert a string of IDs or values into a CSV (Comma-Separated Values) formatted string.

## Features

- **Multiple Separators**: Supports splitting the input string by new lines, commas, or spaces.
- **CSV Formatting**: Each value is trimmed, enclosed in single quotes, and separated by a comma and a new line.
- **One-Click Copy**: Easily copy the formatted CSV output to your clipboard.
- **Clear Output**: Quickly clear the output field.
- **Keyboard Shortcut**: Open the extension popup using `Command+Shift+D` (on Mac) or `Ctrl+Shift+D` (on Windows/Linux).

## How to Use

1.  **Open the Extension**:
    - Click on the extension icon in your browser's toolbar.
    - Or, use the keyboard shortcut: `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows).
2.  **Enter Your IDs**: Paste or type your string of IDs into the "Please enter your Ids" text area.
3.  **Select Separator**: Choose the separator that your input string uses from the dropdown menu (New Line, Comma, or Space).
4.  **Convert**: Click the "Convert" button. The formatted CSV string will appear in the "output" text area.
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
