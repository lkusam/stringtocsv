/**
 * ApplicationSettings - Global application settings panel
 * Handles theme, accessibility, and system-level settings
 */

export class ApplicationSettings {
  constructor(app) {
    this.app = app;
    this.element = null;
    this.isVisible = false;
    this.settings = app.settings;
  }

  /**
   * Create the settings panel element
   */
  createElement() {
    const panel = document.createElement("div");
    panel.id = "app-settings-panel";
    panel.className = "app-settings-panel hidden";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Application Settings");

    panel.innerHTML = `
      <div class="settings-overlay" id="settings-overlay"></div>
      <div class="settings-content">
        <div class="settings-header">
          <h2>Application Settings</h2>
          <button class="close-btn" id="close-settings" aria-label="Close settings">&times;</button>
        </div>
        
        <div class="settings-body">
          <!-- Theme Settings -->
          <div class="settings-section">
            <h3>Appearance</h3>
            <div class="setting-item">
              <label for="theme-select">Theme:</label>
              <select id="theme-select" class="setting-select">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="high-contrast" class="setting-checkbox">
                High contrast mode
              </label>
            </div>
          </div>

          <!-- Data Processing Settings -->
          <div class="settings-section">
            <h3>Data Processing</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="trim-whitespace" class="setting-checkbox">
                Trim whitespace by default
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="smart-detection" class="setting-checkbox">
                Enable smart format detection
              </label>
            </div>
            <div class="setting-item">
              <label for="default-separator">Default separator:</label>
              <select id="default-separator" class="setting-select">
                <option value="newline">New Line</option>
                <option value="comma">Comma</option>
                <option value="semicolon">Semicolon</option>
                <option value="tab">Tab</option>
                <option value="pipe">Pipe (|)</option>
              </select>
            </div>
          </div>

          <!-- Performance Settings -->
          <div class="settings-section">
            <h3>Performance</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="enable-streaming" class="setting-checkbox">
                Enable streaming for large files
              </label>
            </div>
            <div class="setting-item">
              <label for="worker-count">Worker threads:</label>
              <select id="worker-count" class="setting-select">
                <option value="1">1 (Single-threaded)</option>
                <option value="2">2 (Default)</option>
                <option value="4">4 (High performance)</option>
              </select>
            </div>
          </div>

          <!-- System Settings -->
          <div class="settings-section">
            <h3>System</h3>
            <div class="system-actions">
              <button id="reload-app-btn" class="action-btn reload-btn">
                <span class="action-icon">🔄</span>
                <div class="action-content">
                  <div class="action-title">Reload Application</div>
                  <div class="action-description">Restart the extension</div>
                </div>
              </button>
              <button id="report-issue-btn" class="action-btn report-btn">
                <span class="action-icon">🐛</span>
                <div class="action-content">
                  <div class="action-title">Report Issue</div>
                  <div class="action-description">Report a bug or problem</div>
                </div>
              </button>
              <button id="reset-settings-btn" class="action-btn danger-btn">
                <span class="action-icon">⚠️</span>
                <div class="action-content">
                  <div class="action-title">Reset All Settings</div>
                  <div class="action-description">Reset to default settings</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Debug Info (only show if there are errors) -->
          <div class="settings-section" id="debug-section" style="display: none;">
            <h3>Debug Information</h3>
            <div class="debug-info">
              <div class="debug-info-item">
                <span class="debug-info-label">Extension Version:</span>
                <span id="version-info">3.0.0</span>
              </div>
              <div class="debug-info-item">
                <span class="debug-info-label">Last Error:</span>
                <span id="last-error-info">None</span>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn-secondary" id="cancel-settings">Cancel</button>
          <button class="btn-primary" id="save-settings">Save Settings</button>
        </div>
      </div>
    `;

    return panel;
  }

  /**
   * Initialize the settings panel
   */
  initialize() {
    this.element = this.createElement();
    document.body.appendChild(this.element);
    this.setupEventListeners();
    this.loadCurrentSettings();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const overlay = this.element.querySelector("#settings-overlay");
    const closeBtn = this.element.querySelector("#close-settings");
    const cancelBtn = this.element.querySelector("#cancel-settings");
    const saveBtn = this.element.querySelector("#save-settings");
    const reloadBtn = this.element.querySelector("#reload-app-btn");
    const reportBtn = this.element.querySelector("#report-issue-btn");
    const resetBtn = this.element.querySelector("#reset-settings-btn");

    // Close handlers
    [overlay, closeBtn, cancelBtn].forEach((btn) => {
      if (btn) {
        btn.addEventListener("click", () => this.hide());
      }
    });

    // Save settings
    if (saveBtn) {
      saveBtn.addEventListener("click", () => this.saveSettings());
    }

    // System actions
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => this.reloadApplication());
    }

    if (reportBtn) {
      reportBtn.addEventListener("click", () => this.reportIssue());
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetSettings());
    }

    // ESC key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * Load current settings into the form
   */
  loadCurrentSettings() {
    const settings = this.settings;

    // Theme settings
    const themeSelect = this.element.querySelector("#theme-select");
    if (themeSelect) themeSelect.value = settings.ui?.theme || "light";

    const highContrast = this.element.querySelector("#high-contrast");
    if (highContrast) highContrast.checked = settings.ui?.highContrast || false;

    // Data processing settings
    const trimWhitespace = this.element.querySelector("#trim-whitespace");
    if (trimWhitespace) trimWhitespace.checked = settings.processing?.trimWhitespace || true;

    const smartDetection = this.element.querySelector("#smart-detection");
    if (smartDetection) smartDetection.checked = settings.processing?.smartDetection || true;

    const defaultSeparator = this.element.querySelector("#default-separator");
    if (defaultSeparator) defaultSeparator.value = settings.processing?.defaultSeparator || "newline";

    // Performance settings
    const enableStreaming = this.element.querySelector("#enable-streaming");
    if (enableStreaming) enableStreaming.checked = settings.performance?.enableStreaming || true;

    const workerCount = this.element.querySelector("#worker-count");
    if (workerCount) workerCount.value = settings.performance?.workerCount || 2;

    // Debug info
    this.updateDebugInfo();
  }

  /**
   * Update debug information
   */
  updateDebugInfo() {
    const debugSection = this.element.querySelector("#debug-section");
    const lastErrorInfo = this.element.querySelector("#last-error-info");

    if (window.lastError || window.moduleLoadErrors?.length > 0) {
      debugSection.style.display = "block";
      if (lastErrorInfo) {
        lastErrorInfo.textContent = window.lastError || "Check console for details";
      }
    }
  }

  /**
   * Save settings
   */
  async saveSettings() {
    const newSettings = {
      ui: {
        theme: this.element.querySelector("#theme-select")?.value || "light",
        highContrast: this.element.querySelector("#high-contrast")?.checked || false,
      },
      processing: {
        trimWhitespace: this.element.querySelector("#trim-whitespace")?.checked || true,
        smartDetection: this.element.querySelector("#smart-detection")?.checked || true,
        defaultSeparator: this.element.querySelector("#default-separator")?.value || "newline",
      },
      performance: {
        enableStreaming: this.element.querySelector("#enable-streaming")?.checked || true,
        workerCount: parseInt(this.element.querySelector("#worker-count")?.value) || 2,
      },
    };

    try {
      await this.app.updateSettings(newSettings);
      this.showNotification("Settings saved successfully!", "success");
      this.hide();
    } catch (error) {
      console.error("Failed to save settings:", error);
      this.showNotification("Failed to save settings", "error");
    }
  }

  /**
   * Reload application
   */
  reloadApplication() {
    if (confirm("Are you sure you want to reload the application? Any unsaved work will be lost.")) {
      window.location.reload();
    }
  }

  /**
   * Report issue
   */
  reportIssue() {
    // Use the same report issue functionality from ErrorBoundary
    if (window.handleReportIssue) {
      window.handleReportIssue();
    } else {
      // Fallback
      const reportText = `Chrome Extension Issue Report
Generated: ${new Date().toISOString()}
Browser: ${navigator.userAgent}
Version: 3.0.0

Please describe the issue:
[User description here]
`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(reportText).then(() => {
          alert("Issue report template copied to clipboard!");
        });
      } else {
        alert("Issue report:\n\n" + reportText);
      }
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings() {
    if (confirm("Are you sure you want to reset all settings to defaults? This cannot be undone.")) {
      try {
        await this.app.resetSettings();
        this.loadCurrentSettings();
        this.showNotification("Settings reset to defaults", "success");
      } catch (error) {
        console.error("Failed to reset settings:", error);
        this.showNotification("Failed to reset settings", "error");
      }
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = "info") {
    // Simple notification for now
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"};
      color: white;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Show the settings panel
   */
  show() {
    if (this.element) {
      this.element.classList.remove("hidden");
      this.isVisible = true;
      this.loadCurrentSettings();

      // Focus the first input
      const firstInput = this.element.querySelector("select, input, button");
      if (firstInput) firstInput.focus();
    }
  }

  /**
   * Hide the settings panel
   */
  hide() {
    if (this.element) {
      this.element.classList.add("hidden");
      this.isVisible = false;
    }
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Destroy the settings panel
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.isVisible = false;
  }
}
