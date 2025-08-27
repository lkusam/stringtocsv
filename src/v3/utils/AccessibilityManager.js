/**
 * AccessibilityManager - Minimal implementation for v3 accessibility features
 */

export class AccessibilityManager {
  constructor(options = {}) {
    this.defaultTheme = options.defaultTheme || "classic";
    this.darkMode = options.darkMode || false;
    this.onSettingsChange = options.onSettingsChange || (() => {});
    this.onShortcutAction = options.onShortcutAction || (() => {});
    this.shortcuts = new Map();
  }

  initialize() {
    // Apply initial theme
    this.applyTheme(this.defaultTheme);
    this.applyDarkMode(this.darkMode);

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  applyTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/g, "");
    document.body.classList.add(`theme-${theme}`);
  }

  applyDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      const key = this.getShortcutKey(e);
      if (this.shortcuts.has(key)) {
        e.preventDefault();
        const action = this.shortcuts.get(key);
        this.onShortcutAction(action.name, action.args, e);
      }
    });
  }

  getShortcutKey(event) {
    const parts = [];
    if (event.ctrlKey) parts.push("ctrl");
    if (event.altKey) parts.push("alt");
    if (event.shiftKey) parts.push("shift");
    if (event.metaKey) parts.push("meta");
    parts.push(event.key.toLowerCase());
    return parts.join("+");
  }

  registerShortcut(key, action, args = []) {
    this.shortcuts.set(key, { name: action, args });
  }

  destroy() {
    this.shortcuts.clear();
  }
}
