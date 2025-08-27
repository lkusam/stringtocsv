/**
 * ValidationPanel - UI component for displaying validation results and configuration
 * Provides interactive validation feedback with error highlighting and correction suggestions
 */

export class ValidationPanel {
  constructor(options = {}) {
    this.container = options.container;
    this.validationEngine = options.validationEngine;
    this.onRuleToggle = options.onRuleToggle || (() => {});
    this.onAutoFix = options.onAutoFix || (() => {});
    this.onValidationRun = options.onValidationRun || (() => {});

    this.currentResult = null;
    this.isExpanded = true;
    this.activeFilters = {
      severity: ["error", "warning", "info"],
      type: ["data", "format", "structure", "system"],
    };

    this.initialize();
  }

  /**
   * Initialize the validation panel
   */
  initialize() {
    this.createUI();
    this.setupEventListeners();
  }

  /**
   * Create the validation panel UI
   */
  createUI() {
    this.container.innerHTML = `
      <div class="validation-panel">
        <!-- Header -->
        <div class="validation-header">
          <div class="header-left">
            <button class="toggle-panel-btn" id="toggle-panel">
              <span class="toggle-icon">▼</span>
              <span class="panel-title">Data Validation</span>
            </button>
            <div class="validation-status" id="validation-status">
              <span class="status-indicator" id="status-indicator"></span>
              <span class="status-text" id="status-text">Ready</span>
            </div>
          </div>
          <div class="header-right">
            <button class="run-validation-btn" id="run-validation">
              <span class="btn-icon">🔍</span> Validate
            </button>
            <button class="validation-settings-btn" id="validation-settings">
              <span class="btn-icon">⚙️</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="validation-content" id="validation-content">
          <!-- Summary Section -->
          <div class="validation-summary" id="validation-summary" style="display: none;">
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-value" id="total-errors">0</span>
                <span class="stat-label">Issues</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" id="quality-score">100</span>
                <span class="stat-label">Quality Score</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" id="rows-validated">0</span>
                <span class="stat-label">Rows</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" id="columns-validated">0</span>
                <span class="stat-label">Columns</span>
              </div>
            </div>
            
            <div class="summary-actions">
              <button class="auto-fix-btn" id="auto-fix-btn" disabled>
                <span class="btn-icon">🔧</span> Auto-fix Issues
              </button>
              <button class="export-report-btn" id="export-report-btn" disabled>
                <span class="btn-icon">📄</span> Export Report
              </button>
            </div>
          </div>

          <!-- Filters Section -->
          <div class="validation-filters" id="validation-filters" style="display: none;">
            <div class="filter-group">
              <label>Severity:</label>
              <div class="filter-buttons">
                <button class="filter-btn active" data-filter="severity" data-value="error">
                  <span class="severity-icon error">●</span> Errors
                </button>
                <button class="filter-btn active" data-filter="severity" data-value="warning">
                  <span class="severity-icon warning">●</span> Warnings
                </button>
                <button class="filter-btn active" data-filter="severity" data-value="info">
                  <span class="severity-icon info">●</span> Info
                </button>
              </div>
            </div>
            
            <div class="filter-group">
              <label>Type:</label>
              <div class="filter-buttons">
                <button class="filter-btn active" data-filter="type" data-value="data">Data</button>
                <button class="filter-btn active" data-filter="type" data-value="format">Format</button>
                <button class="filter-btn active" data-filter="type" data-value="structure">Structure</button>
                <button class="filter-btn active" data-filter="type" data-value="system">System</button>
              </div>
            </div>
          </div>

          <!-- Issues List -->
          <div class="validation-issues" id="validation-issues">
            <div class="no-validation">
              <div class="no-validation-icon">🔍</div>
              <p>Run validation to check your data quality</p>
              <button class="run-validation-cta" id="run-validation-cta">Start Validation</button>
            </div>
          </div>

          <!-- Settings Panel -->
          <div class="validation-settings-panel" id="settings-panel" style="display: none;">
            <div class="settings-header">
              <h4>Validation Settings</h4>
              <button class="close-settings-btn" id="close-settings">×</button>
            </div>
            
            <div class="settings-content">
              <div class="settings-section">
                <h5>General Options</h5>
                <label class="setting-item">
                  <input type="checkbox" id="enable-pii-detection" checked>
                  <span>Detect potentially sensitive information (PII)</span>
                </label>
                <label class="setting-item">
                  <input type="checkbox" id="enable-duplicate-detection" checked>
                  <span>Detect duplicate rows</span>
                </label>
                <label class="setting-item">
                  <input type="checkbox" id="enable-format-validation" checked>
                  <span>Validate data format consistency</span>
                </label>
                <label class="setting-item">
                  <input type="checkbox" id="enable-type-detection" checked>
                  <span>Automatic data type detection</span>
                </label>
              </div>

              <div class="settings-section">
                <h5>Validation Rules</h5>
                <div class="rules-list" id="rules-list">
                  <!-- Rules will be populated dynamically -->
                </div>
              </div>

              <div class="settings-section">
                <h5>Performance</h5>
                <label class="setting-item">
                  <span>Sample size for large datasets:</span>
                  <input type="number" id="sample-size" value="1000" min="100" max="10000" step="100">
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Panel toggle
    const toggleBtn = this.container.querySelector("#toggle-panel");
    toggleBtn.addEventListener("click", () => this.togglePanel());

    // Validation actions
    const runValidationBtn = this.container.querySelector("#run-validation");
    const runValidationCta = this.container.querySelector("#run-validation-cta");

    runValidationBtn.addEventListener("click", () => this.runValidation());
    runValidationCta.addEventListener("click", () => this.runValidation());

    // Settings
    const settingsBtn = this.container.querySelector("#validation-settings");
    const closeSettingsBtn = this.container.querySelector("#close-settings");

    settingsBtn.addEventListener("click", () => this.showSettings());
    closeSettingsBtn.addEventListener("click", () => this.hideSettings());

    // Auto-fix and export
    const autoFixBtn = this.container.querySelector("#auto-fix-btn");
    const exportReportBtn = this.container.querySelector("#export-report-btn");

    autoFixBtn.addEventListener("click", () => this.autoFixIssues());
    exportReportBtn.addEventListener("click", () => this.exportReport());

    // Filter buttons
    this.container.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.toggleFilter(e.target));
    });

    // Settings changes
    this.container.querySelectorAll("#settings-panel input").forEach((input) => {
      input.addEventListener("change", () => this.updateSettings());
    });
  }

  /**
   * Toggle panel expanded/collapsed state
   */
  togglePanel() {
    this.isExpanded = !this.isExpanded;
    const content = this.container.querySelector("#validation-content");
    const toggleIcon = this.container.querySelector(".toggle-icon");

    content.style.display = this.isExpanded ? "block" : "none";
    toggleIcon.textContent = this.isExpanded ? "▼" : "▶";
  }

  /**
   * Run validation on current data
   */
  runValidation() {
    this.updateStatus("running", "Validating...");
    this.onValidationRun();
  }

  /**
   * Display validation results
   * @param {ValidationResult} result - Validation result to display
   */
  displayResults(result) {
    this.currentResult = result;

    // Update status
    const hasErrors = result.errors.length > 0;
    const status = hasErrors ? "issues" : "clean";
    const statusText = hasErrors ? `${result.errors.length} issues found` : "No issues found";
    this.updateStatus(status, statusText);

    // Show summary and filters
    this.showSummary();
    this.showFilters();

    // Update summary stats
    this.updateSummaryStats(result);

    // Display issues
    this.displayIssues(result.errors);

    // Enable action buttons
    const autoFixBtn = this.container.querySelector("#auto-fix-btn");
    const exportReportBtn = this.container.querySelector("#export-report-btn");

    autoFixBtn.disabled = !this.hasFixableIssues(result.errors);
    exportReportBtn.disabled = false;
  }

  /**
   * Update validation status
   * @param {string} status - Status type (ready, running, clean, issues)
   * @param {string} text - Status text
   */
  updateStatus(status, text) {
    const indicator = this.container.querySelector("#status-indicator");
    const statusText = this.container.querySelector("#status-text");

    indicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
  }

  /**
   * Show summary section
   */
  showSummary() {
    this.container.querySelector("#validation-summary").style.display = "block";
  }

  /**
   * Show filters section
   */
  showFilters() {
    this.container.querySelector("#validation-filters").style.display = "block";
  }

  /**
   * Update summary statistics
   * @param {ValidationResult} result - Validation result
   */
  updateSummaryStats(result) {
    const stats = this.validationEngine.getValidationStatistics(result);

    this.container.querySelector("#total-errors").textContent = stats.totalErrors;
    this.container.querySelector("#quality-score").textContent = Math.round(stats.dataQualityScore);
    this.container.querySelector("#rows-validated").textContent = result.statistics.totalRows;
    this.container.querySelector("#columns-validated").textContent = result.statistics.totalColumns;

    // Update quality score color
    const scoreElement = this.container.querySelector("#quality-score");
    const score = stats.dataQualityScore;
    if (score >= 90) {
      scoreElement.className = "stat-value excellent";
    } else if (score >= 70) {
      scoreElement.className = "stat-value good";
    } else if (score >= 50) {
      scoreElement.className = "stat-value fair";
    } else {
      scoreElement.className = "stat-value poor";
    }
  }

  /**
   * Display validation issues
   * @param {Array} errors - Array of validation errors
   */
  displayIssues(errors) {
    const issuesContainer = this.container.querySelector("#validation-issues");

    if (errors.length === 0) {
      issuesContainer.innerHTML = `
        <div class="no-issues">
          <div class="no-issues-icon">✅</div>
          <p>Great! No validation issues found.</p>
          <p class="no-issues-subtext">Your data appears to be clean and well-formatted.</p>
        </div>
      `;
      return;
    }

    // Filter errors based on active filters
    const filteredErrors = this.filterErrors(errors);

    if (filteredErrors.length === 0) {
      issuesContainer.innerHTML = `
        <div class="no-filtered-issues">
          <p>No issues match the current filters.</p>
          <button class="clear-filters-btn" id="clear-filters">Clear Filters</button>
        </div>
      `;

      this.container.querySelector("#clear-filters").addEventListener("click", () => {
        this.clearFilters();
      });
      return;
    }

    // Group errors by type and severity
    const groupedErrors = this.groupErrors(filteredErrors);

    issuesContainer.innerHTML = `
      <div class="issues-header">
        <span class="issues-count">${filteredErrors.length} of ${errors.length} issues</span>
        <div class="issues-actions">
          <button class="expand-all-btn" id="expand-all">Expand All</button>
          <button class="collapse-all-btn" id="collapse-all">Collapse All</button>
        </div>
      </div>
      <div class="issues-list">
        ${this.renderErrorGroups(groupedErrors)}
      </div>
    `;

    // Setup issue actions
    this.setupIssueActions();
  }

  /**
   * Filter errors based on active filters
   * @param {Array} errors - All errors
   * @returns {Array} Filtered errors
   */
  filterErrors(errors) {
    return errors.filter((error) => {
      return this.activeFilters.severity.includes(error.severity) && this.activeFilters.type.includes(error.type);
    });
  }

  /**
   * Group errors by severity and type
   * @param {Array} errors - Errors to group
   * @returns {Object} Grouped errors
   */
  groupErrors(errors) {
    const groups = {};

    errors.forEach((error) => {
      const groupKey = `${error.severity}-${error.type}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          severity: error.severity,
          type: error.type,
          errors: [],
        };
      }
      groups[groupKey].errors.push(error);
    });

    // Sort groups by severity priority
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return Object.values(groups).sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Render error groups HTML
   * @param {Array} groups - Error groups
   * @returns {string} HTML string
   */
  renderErrorGroups(groups) {
    return groups
      .map(
        (group) => `
      <div class="error-group">
        <div class="group-header" data-group="${group.severity}-${group.type}">
          <span class="group-toggle">▼</span>
          <span class="severity-icon ${group.severity}">●</span>
          <span class="group-title">${this.formatGroupTitle(group)}</span>
          <span class="group-count">${group.errors.length}</span>
        </div>
        <div class="group-content">
          ${group.errors.map((error) => this.renderError(error)).join("")}
        </div>
      </div>
    `
      )
      .join("");
  }

  /**
   * Format group title
   * @param {Object} group - Error group
   * @returns {string} Formatted title
   */
  formatGroupTitle(group) {
    const severityText = group.severity.charAt(0).toUpperCase() + group.severity.slice(1);
    const typeText = group.type.charAt(0).toUpperCase() + group.type.slice(1);
    return `${severityText} - ${typeText}`;
  }

  /**
   * Render individual error
   * @param {Object} error - Error object
   * @returns {string} HTML string
   */
  renderError(error) {
    const locationText = error.location && error.location.row ? `Row ${error.location.row}${error.location.column ? `, Column ${error.location.column}` : ""}` : "General";

    return `
      <div class="error-item" data-error-id="${this.generateErrorId(error)}">
        <div class="error-header">
          <div class="error-location">${locationText}</div>
          <div class="error-actions">
            ${error.suggestion ? `<button class="fix-btn" data-error-id="${this.generateErrorId(error)}">Fix</button>` : ""}
            <button class="ignore-btn" data-error-id="${this.generateErrorId(error)}">Ignore</button>
          </div>
        </div>
        <div class="error-message">${error.message}</div>
        ${error.suggestion ? `<div class="error-suggestion">💡 ${error.suggestion}</div>` : ""}
      </div>
    `;
  }

  /**
   * Generate unique error ID
   * @param {Object} error - Error object
   * @returns {string} Unique ID
   */
  generateErrorId(error) {
    return `error-${error.type}-${error.severity}-${error.location?.row || 0}-${error.location?.column || 0}`;
  }

  /**
   * Setup issue action event listeners
   */
  setupIssueActions() {
    // Group toggle
    this.container.querySelectorAll(".group-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        const content = header.nextElementSibling;
        const toggle = header.querySelector(".group-toggle");
        const isExpanded = content.style.display !== "none";

        content.style.display = isExpanded ? "none" : "block";
        toggle.textContent = isExpanded ? "▶" : "▼";
      });
    });

    // Expand/collapse all
    const expandAllBtn = this.container.querySelector("#expand-all");
    const collapseAllBtn = this.container.querySelector("#collapse-all");

    if (expandAllBtn) {
      expandAllBtn.addEventListener("click", () => this.expandAllGroups());
    }
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener("click", () => this.collapseAllGroups());
    }

    // Fix and ignore buttons
    this.container.querySelectorAll(".fix-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const errorId = e.target.dataset.errorId;
        this.fixError(errorId);
      });
    });

    this.container.querySelectorAll(".ignore-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const errorId = e.target.dataset.errorId;
        this.ignoreError(errorId);
      });
    });
  }

  /**
   * Toggle filter button
   * @param {HTMLElement} button - Filter button
   */
  toggleFilter(button) {
    const filterType = button.dataset.filter;
    const filterValue = button.dataset.value;

    button.classList.toggle("active");

    if (button.classList.contains("active")) {
      if (!this.activeFilters[filterType].includes(filterValue)) {
        this.activeFilters[filterType].push(filterValue);
      }
    } else {
      this.activeFilters[filterType] = this.activeFilters[filterType].filter((value) => value !== filterValue);
    }

    // Refresh issues display
    if (this.currentResult) {
      this.displayIssues(this.currentResult.errors);
    }
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.activeFilters = {
      severity: ["error", "warning", "info"],
      type: ["data", "format", "structure", "system"],
    };

    // Update filter buttons
    this.container.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.add("active");
    });

    // Refresh display
    if (this.currentResult) {
      this.displayIssues(this.currentResult.errors);
    }
  }

  /**
   * Expand all error groups
   */
  expandAllGroups() {
    this.container.querySelectorAll(".group-content").forEach((content) => {
      content.style.display = "block";
    });
    this.container.querySelectorAll(".group-toggle").forEach((toggle) => {
      toggle.textContent = "▼";
    });
  }

  /**
   * Collapse all error groups
   */
  collapseAllGroups() {
    this.container.querySelectorAll(".group-content").forEach((content) => {
      content.style.display = "none";
    });
    this.container.querySelectorAll(".group-toggle").forEach((toggle) => {
      toggle.textContent = "▶";
    });
  }

  /**
   * Fix individual error
   * @param {string} errorId - Error ID
   */
  fixError(errorId) {
    const errorElement = this.container.querySelector(`[data-error-id="${errorId}"]`);
    if (errorElement) {
      errorElement.classList.add("fixing");

      // Emit fix event
      this.onAutoFix({ errorId, type: "single" });

      // Simulate fix completion
      setTimeout(() => {
        errorElement.classList.remove("fixing");
        errorElement.classList.add("fixed");

        setTimeout(() => {
          errorElement.style.display = "none";
        }, 1000);
      }, 1500);
    }
  }

  /**
   * Ignore individual error
   * @param {string} errorId - Error ID
   */
  ignoreError(errorId) {
    const errorElement = this.container.querySelector(`[data-error-id="${errorId}"]`);
    if (errorElement) {
      errorElement.classList.add("ignored");
      setTimeout(() => {
        errorElement.style.display = "none";
      }, 300);
    }
  }

  /**
   * Auto-fix all fixable issues
   */
  autoFixIssues() {
    if (!this.currentResult) return;

    const fixableErrors = this.currentResult.errors.filter((error) => error.suggestion);

    if (fixableErrors.length === 0) {
      alert("No auto-fixable issues found.");
      return;
    }

    const confirmFix = confirm(`Auto-fix ${fixableErrors.length} issues? This action cannot be undone.`);
    if (!confirmFix) return;

    // Emit auto-fix event
    this.onAutoFix({
      errors: fixableErrors,
      type: "batch",
    });

    // Update UI to show fixing state
    this.updateStatus("fixing", "Auto-fixing issues...");

    // Simulate fix completion
    setTimeout(() => {
      this.updateStatus("clean", "Issues fixed successfully");

      // Remove fixed errors from display
      fixableErrors.forEach((error) => {
        const errorId = this.generateErrorId(error);
        const errorElement = this.container.querySelector(`[data-error-id="${errorId}"]`);
        if (errorElement) {
          errorElement.style.display = "none";
        }
      });
    }, 2000);
  }

  /**
   * Export validation report
   */
  exportReport() {
    if (!this.currentResult) return;

    const stats = this.validationEngine.getValidationStatistics(this.currentResult);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: stats.totalErrors,
        qualityScore: Math.round(stats.dataQualityScore),
        rowsValidated: this.currentResult.statistics.totalRows,
        columnsValidated: this.currentResult.statistics.totalColumns,
      },
      statistics: stats,
      issues: this.currentResult.errors.map((error) => ({
        type: error.type,
        severity: error.severity,
        message: error.message,
        location: error.location,
        suggestion: error.suggestion,
      })),
    };

    // Create and download report
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `validation-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Show settings panel
   */
  showSettings() {
    this.populateRulesList();
    this.container.querySelector("#settings-panel").style.display = "block";
  }

  /**
   * Hide settings panel
   */
  hideSettings() {
    this.container.querySelector("#settings-panel").style.display = "none";
  }

  /**
   * Populate validation rules list
   */
  populateRulesList() {
    const rulesList = this.container.querySelector("#rules-list");
    const availableRules = this.validationEngine.getAvailableRules();

    rulesList.innerHTML = availableRules
      .map(
        (rule) => `
      <label class="rule-item">
        <input type="checkbox" data-rule-id="${rule.id}" ${rule.enabled ? "checked" : ""}>
        <div class="rule-info">
          <span class="rule-name">${rule.name}</span>
          <span class="rule-description">${rule.description}</span>
          <span class="rule-severity ${rule.severity}">${rule.severity}</span>
        </div>
      </label>
    `
      )
      .join("");

    // Add rule toggle listeners
    rulesList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const ruleId = e.target.dataset.ruleId;
        const enabled = e.target.checked;
        this.onRuleToggle(ruleId, enabled);
      });
    });
  }

  /**
   * Update validation settings
   */
  updateSettings() {
    const settings = {
      enablePIIDetection: this.container.querySelector("#enable-pii-detection").checked,
      enableDuplicateDetection: this.container.querySelector("#enable-duplicate-detection").checked,
      enableFormatValidation: this.container.querySelector("#enable-format-validation").checked,
      enableDataTypeDetection: this.container.querySelector("#enable-type-detection").checked,
      maxSampleSize: parseInt(this.container.querySelector("#sample-size").value),
    };

    // Update validation engine options
    Object.assign(this.validationEngine.options, settings);
  }

  /**
   * Check if there are fixable issues
   * @param {Array} errors - Array of errors
   * @returns {boolean} True if there are fixable issues
   */
  hasFixableIssues(errors) {
    return errors.some((error) => error.suggestion);
  }

  /**
   * Reset validation panel
   */
  reset() {
    this.currentResult = null;
    this.updateStatus("ready", "Ready");

    // Hide summary and filters
    this.container.querySelector("#validation-summary").style.display = "none";
    this.container.querySelector("#validation-filters").style.display = "none";

    // Show initial state
    const issuesContainer = this.container.querySelector("#validation-issues");
    issuesContainer.innerHTML = `
      <div class="no-validation">
        <div class="no-validation-icon">🔍</div>
        <p>Run validation to check your data quality</p>
        <button class="run-validation-cta" id="run-validation-cta">Start Validation</button>
      </div>
    `;

    // Re-setup CTA listener
    this.container.querySelector("#run-validation-cta").addEventListener("click", () => {
      this.runValidation();
    });
  }

  /**
   * Get current validation settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return {
      enablePIIDetection: this.validationEngine.options.enablePIIDetection,
      enableDuplicateDetection: this.validationEngine.options.enableDuplicateDetection,
      enableFormatValidation: this.validationEngine.options.enableFormatValidation,
      enableDataTypeDetection: this.validationEngine.options.enableDataTypeDetection,
      maxSampleSize: this.validationEngine.options.maxSampleSize,
      activeFilters: { ...this.activeFilters },
      isExpanded: this.isExpanded,
    };
  }

  /**
   * Apply settings to the panel
   * @param {Object} settings - Settings to apply
   */
  applySettings(settings) {
    if (settings.enablePIIDetection !== undefined) {
      this.container.querySelector("#enable-pii-detection").checked = settings.enablePIIDetection;
    }
    if (settings.enableDuplicateDetection !== undefined) {
      this.container.querySelector("#enable-duplicate-detection").checked = settings.enableDuplicateDetection;
    }
    if (settings.enableFormatValidation !== undefined) {
      this.container.querySelector("#enable-format-validation").checked = settings.enableFormatValidation;
    }
    if (settings.enableDataTypeDetection !== undefined) {
      this.container.querySelector("#enable-type-detection").checked = settings.enableDataTypeDetection;
    }
    if (settings.maxSampleSize !== undefined) {
      this.container.querySelector("#sample-size").value = settings.maxSampleSize;
    }
    if (settings.activeFilters) {
      this.activeFilters = { ...settings.activeFilters };
    }
    if (settings.isExpanded !== undefined) {
      this.isExpanded = settings.isExpanded;
      if (!this.isExpanded) {
        this.togglePanel();
      }
    }

    this.updateSettings();
  }
}
