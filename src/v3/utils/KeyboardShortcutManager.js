/**
 * KeyboardShortcutManager - Manages customizable keyboard shortcuts
 * Provides keyboard navigation and customizable shortcuts for accessibility
 */

export class KeyboardShortcutManager {
  constructor(options = {}) {
    this.shortcuts = new Map();
    this.activeElement = null;
    this.focusableElements = [];
    this.currentFocusIndex = -1;

    // Default shortcuts
    this.defaultShortcuts = {
      // Navigation
      Tab: { action: "focusNext", description: "Move to next element" },
      "Shift+Tab": { action: "focusPrevious", description: "Move to previous element" },
      Escape: { action: "closeFocused", description: "Close current dialog or panel" },
      Enter: { action: "activateFocused", description: "Activate focused element" },
      Space: { action: "activateFocused", description: "Activate focused element" },

      // Application shortcuts
      "Ctrl+N": { action: "newConversion", description: "Start new conversion" },
      "Ctrl+O": { action: "openFile", description: "Open file" },
      "Ctrl+S": { action: "saveResult", description: "Save conversion result" },
      "Ctrl+C": { action: "copyResult", description: "Copy result to clipboard" },
      "Ctrl+V": { action: "pasteInput", description: "Paste into input field" },
      "Ctrl+Z": { action: "undo", description: "Undo last action" },
      "Ctrl+Y": { action: "redo", description: "Redo last action" },

      // Tab navigation
      "Ctrl+1": { action: "switchToTab", args: ["simple"], description: "Switch to Simple tab" },
      "Ctrl+2": { action: "switchToTab", args: ["multi-column"], description: "Switch to Multi-Column tab" },
      "Ctrl+3": { action: "switchToTab", args: ["batch"], description: "Switch to Batch tab" },
      "Ctrl+4": { action: "switchToTab", args: ["settings"], description: "Switch to Settings tab" },

      // Processing shortcuts
      F5: { action: "processData", description: "Process/convert data" },
      F6: { action: "validateData", description: "Validate data" },
      F7: { action: "previewData", description: "Preview conversion" },
      F8: { action: "exportData", description: "Export data" },

      // Search and filter
      "Ctrl+F": { action: "openSearch", description: "Open search/filter" },
      F3: { action: "findNext", description: "Find next match" },
      "Shift+F3": { action: "findPrevious", description: "Find previous match" },

      // Accessibility
      "Alt+H": { action: "showHelp", description: "Show help and shortcuts" },
      "Alt+T": { action: "toggleTheme", description: "Toggle theme" },
      "Alt+C": { action: "toggleContrast", description: "Toggle high contrast" },
    };

    // Event handlers
    this.onShortcut = options.onShortcut || (() => {});
    this.onFocusChange = options.onFocusChange || (() => {});

    this.init();
  }

  /**
   * Initialize keyboard shortcut manager
   */
  init() {
    // Load default shortcuts
    this.loadDefaultShortcuts();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize focus management
    this.updateFocusableElements();
  }

  /**
   * Load default shortcuts
   */
  loadDefaultShortcuts() {
    Object.entries(this.defaultShortcuts).forEach(([key, config]) => {
      this.shortcuts.set(key, config);
    });
  }

  /**
   * Setup keyboard event listeners
   */
  setupEventListeners() {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));
    document.addEventListener("focusin", this.handleFocusIn.bind(this));
    document.addEventListener("focusout", this.handleFocusOut.bind(this));

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(() => {
      this.updateFocusableElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["tabindex", "disabled", "hidden"],
    });
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    const shortcutKey = this.getShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut) {
      // Check if we should handle this shortcut
      if (this.shouldHandleShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();

        this.executeShortcut(shortcut, event);
      }
    }
  }

  /**
   * Handle keyup events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyUp(event) {
    // Handle any keyup-specific logic
  }

  /**
   * Handle focus in events
   * @param {FocusEvent} event - Focus event
   */
  handleFocusIn(event) {
    this.activeElement = event.target;
    this.currentFocusIndex = this.focusableElements.indexOf(event.target);
    this.onFocusChange(event.target, "in");
  }

  /**
   * Handle focus out events
   * @param {FocusEvent} event - Focus event
   */
  handleFocusOut(event) {
    this.onFocusChange(event.target, "out");
  }

  /**
   * Get shortcut key string from keyboard event
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string} Shortcut key string
   */
  getShortcutKey(event) {
    const parts = [];

    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    if (event.metaKey) parts.push("Meta");

    // Handle special keys
    let key = event.key;
    if (key === " ") key = "Space";
    if (key === "ArrowUp") key = "Up";
    if (key === "ArrowDown") key = "Down";
    if (key === "ArrowLeft") key = "Left";
    if (key === "ArrowRight") key = "Right";

    parts.push(key);

    return parts.join("+");
  }

  /**
   * Check if shortcut should be handled
   * @param {KeyboardEvent} event - Keyboard event
   * @param {Object} shortcut - Shortcut configuration
   * @returns {boolean} True if should handle
   */
  shouldHandleShortcut(event, shortcut) {
    // Don't handle shortcuts in input fields unless specifically allowed
    const activeElement = document.activeElement;
    const isInputElement = activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.contentEditable === "true");

    if (isInputElement && !shortcut.allowInInput) {
      // Allow some shortcuts in input fields
      const allowedInInput = ["Ctrl+A", "Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+Z", "Ctrl+Y"];
      return allowedInInput.includes(this.getShortcutKey(event));
    }

    return true;
  }

  /**
   * Execute a shortcut
   * @param {Object} shortcut - Shortcut configuration
   * @param {KeyboardEvent} event - Keyboard event
   */
  executeShortcut(shortcut, event) {
    try {
      this.onShortcut(shortcut.action, shortcut.args, event);
    } catch (error) {
      console.error("Error executing shortcut:", error);
    }
  }

  /**
   * Add or update a shortcut
   * @param {string} key - Shortcut key combination
   * @param {Object} config - Shortcut configuration
   */
  addShortcut(key, config) {
    this.shortcuts.set(key, {
      action: config.action,
      args: config.args || [],
      description: config.description || "",
      allowInInput: config.allowInInput || false,
      ...config,
    });
  }

  /**
   * Remove a shortcut
   * @param {string} key - Shortcut key combination
   */
  removeShortcut(key) {
    this.shortcuts.delete(key);
  }

  /**
   * Get all shortcuts
   * @returns {Array} Array of shortcuts
   */
  getAllShortcuts() {
    return Array.from(this.shortcuts.entries()).map(([key, config]) => ({
      key,
      ...config,
    }));
  }

  /**
   * Update focusable elements list
   */
  updateFocusableElements() {
    const focusableSelectors = ["button:not([disabled])", "input:not([disabled])", "select:not([disabled])", "textarea:not([disabled])", "a[href]", '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]'];

    this.focusableElements = Array.from(document.querySelectorAll(focusableSelectors.join(", "))).filter((element) => {
      return (
        element.offsetParent !== null && // Element is visible
        !element.hasAttribute("hidden") &&
        window.getComputedStyle(element).display !== "none"
      );
    });
  }

  /**
   * Focus next element
   */
  focusNext() {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  /**
   * Focus previous element
   */
  focusPrevious() {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex = this.currentFocusIndex <= 0 ? this.focusableElements.length - 1 : this.currentFocusIndex - 1;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  /**
   * Focus element by selector
   * @param {string} selector - CSS selector
   */
  focusElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      this.currentFocusIndex = this.focusableElements.indexOf(element);
    }
  }

  /**
   * Set focus trap for modal dialogs
   * @param {HTMLElement} container - Container element
   */
  setFocusTrap(container) {
    const focusableElements = container.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event) => {
      if (event.key === "Tab") {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);
    firstElement.focus();

    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  }

  /**
   * Announce text to screen readers
   * @param {string} text - Text to announce
   * @param {string} priority - Priority level ('polite' or 'assertive')
   */
  announceToScreenReader(text, priority = "polite") {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = text;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Create keyboard shortcut help dialog
   * @returns {HTMLElement} Help dialog element
   */
  createShortcutHelpDialog() {
    const dialog = document.createElement("div");
    dialog.className = "shortcut-help-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-labelledby", "shortcut-help-title");
    dialog.setAttribute("aria-modal", "true");

    const shortcuts = this.getAllShortcuts();
    const categories = {
      Navigation: shortcuts.filter((s) => ["focusNext", "focusPrevious", "closeFocused", "activateFocused"].includes(s.action)),
      Application: shortcuts.filter((s) => ["newConversion", "openFile", "saveResult", "copyResult", "pasteInput"].includes(s.action)),
      Tabs: shortcuts.filter((s) => s.action === "switchToTab"),
      Processing: shortcuts.filter((s) => ["processData", "validateData", "previewData", "exportData"].includes(s.action)),
      Search: shortcuts.filter((s) => ["openSearch", "findNext", "findPrevious"].includes(s.action)),
      Accessibility: shortcuts.filter((s) => ["showHelp", "toggleTheme", "toggleContrast"].includes(s.action)),
    };

    let html = `
      <div class="shortcut-help-content">
        <h2 id="shortcut-help-title">Keyboard Shortcuts</h2>
        <button class="shortcut-help-close" aria-label="Close help dialog">&times;</button>
    `;

    Object.entries(categories).forEach(([category, categoryShortcuts]) => {
      if (categoryShortcuts.length > 0) {
        html += `<h3>${category}</h3><dl class="shortcut-list">`;
        categoryShortcuts.forEach((shortcut) => {
          html += `
            <dt><kbd>${shortcut.key.replace(/\+/g, "</kbd> + <kbd>")}</kbd></dt>
            <dd>${shortcut.description}</dd>
          `;
        });
        html += "</dl>";
      }
    });

    html += "</div>";
    dialog.innerHTML = html;

    // Setup close functionality
    const closeButton = dialog.querySelector(".shortcut-help-close");
    closeButton.addEventListener("click", () => {
      document.body.removeChild(dialog);
    });

    // Setup focus trap
    const removeFocusTrap = this.setFocusTrap(dialog);

    // Close on escape
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        document.body.removeChild(dialog);
        document.removeEventListener("keydown", handleEscape);
        removeFocusTrap();
      }
    };
    document.addEventListener("keydown", handleEscape);

    return dialog;
  }

  /**
   * Show keyboard shortcut help
   */
  showShortcutHelp() {
    const existingDialog = document.querySelector(".shortcut-help-dialog");
    if (existingDialog) {
      existingDialog.remove();
    }

    const dialog = this.createShortcutHelpDialog();
    document.body.appendChild(dialog);
  }

  /**
   * Export shortcuts configuration
   * @returns {Object} Shortcuts configuration
   */
  exportShortcuts() {
    const shortcuts = {};
    this.shortcuts.forEach((config, key) => {
      shortcuts[key] = config;
    });
    return shortcuts;
  }

  /**
   * Import shortcuts configuration
   * @param {Object} shortcuts - Shortcuts configuration
   */
  importShortcuts(shortcuts) {
    this.shortcuts.clear();
    Object.entries(shortcuts).forEach(([key, config]) => {
      this.shortcuts.set(key, config);
    });
  }
}
