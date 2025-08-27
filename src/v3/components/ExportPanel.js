/**
 * ExportPanel - UI component for export configuration and download functionality
 * Provides format selection, options configuration, and download management
 */

import { ExportEngine } from "../engines/ExportEngine.js";

export class ExportPanel {
  constructor(options = {}) {
    this.container = options.container;
    this.exportEngine = options.exportEngine || new ExportEngine();
    this.onExport = options.onExport || (() => {});
    this.onPreview = options.onPreview || (() => {});

    this.currentData = null;
    this.isExporting = false;
    this.exportHistory = [];
    this.previewData = null;

    this.initialize();
  }

  /**
   * Initialize the export panel
   */
  initialize() {
    this.createUI();
    this.setupEventListeners();
    this.populateFormats();
  }

  /**
   * Create the export panel UI
   */
  createUI() {
    this.container.innerHTML = `
      <div class="export-panel">
        <!-- Header -->
        <div class="export-header">
          <h3>Export Data</h3>
          <div class="export-status" id="export-status">
            <span class="status-indicator" id="status-indicator"></span>
            <span class="status-text" id="status-text">Ready to export</span>
          </div>
        </div>

        <!-- Format Selection -->
        <div class="format-section">
          <h4>Export Format</h4>
          <div class="format-grid" id="format-grid">
            <!-- Formats will be populated dynamically -->
          </div>
        </div>

        <!-- Options Section -->
        <div class="options-section" id="options-section">
          <h4>Export Options</h4>
          <div class="options-content" id="options-content">
            <!-- Options will be populated based on selected format -->
          </div>
        </div>

        <!-- Preview Section -->
        <div class="preview-section" id="preview-section" style="display: none;">
          <div class="preview-header">
            <h4>Preview</h4>
            <div class="preview-controls">
              <button class="refresh-preview-btn" id="refresh-preview">🔄 Refresh</button>
              <button class="close-preview-btn" id="close-preview">✕</button>
            </div>
          </div>
          <div class="preview-content" id="preview-content">
            <div class="preview-stats" id="preview-stats"></div>
            <div class="preview-data" id="preview-data"></div>
          </div>
        </div>

        <!-- Actions Section -->
        <div class="actions-section">
          <div class="action-buttons">
            <button class="preview-btn" id="preview-btn" disabled>
              <span class="btn-icon">👁️</span> Preview
            </button>
            <button class="export-btn" id="export-btn" disabled>
              <span class="btn-icon">⬇️</span> Export & Download
            </button>
          </div>
          
          <div class="export-progress" id="export-progress" style="display: none;">
            <div class="progress-header">
              <span class="progress-label">Exporting...</span>
              <span class="progress-percentage" id="progress-percentage">0%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
            <div class="progress-details" id="progress-details">
              <span class="progress-rows">0 / 0 rows</span>
              <button class="cancel-export-btn" id="cancel-export">Cancel</button>
            </div>
          </div>
        </div>

        <!-- History Section -->
        <div class="history-section" id="history-section" style="display: none;">
          <div class="history-header">
            <h4>Export History</h4>
            <button class="clear-history-btn" id="clear-history">Clear All</button>
          </div>
          <div class="history-list" id="history-list">
            <!-- History items will be populated dynamically -->
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Preview and export buttons
    const previewBtn = this.container.querySelector("#preview-btn");
    const exportBtn = this.container.querySelector("#export-btn");

    previewBtn.addEventListener("click", () => this.showPreview());
    exportBtn.addEventListener("click", () => this.exportData());

    // Preview controls
    const refreshPreviewBtn = this.container.querySelector("#refresh-preview");
    const closePreviewBtn = this.container.querySelector("#close-preview");

    refreshPreviewBtn.addEventListener("click", () => this.refreshPreview());
    closePreviewBtn.addEventListener("click", () => this.hidePreview());

    // Export progress
    const cancelExportBtn = this.container.querySelector("#cancel-export");
    cancelExportBtn.addEventListener("click", () => this.cancelExport());

    // History
    const clearHistoryBtn = this.container.querySelector("#clear-history");
    clearHistoryBtn.addEventListener("click", () => this.clearHistory());
  }

  /**
   * Populate available export formats
   */
  populateFormats() {
    const formatGrid = this.container.querySelector("#format-grid");
    const supportedFormats = this.exportEngine.getSupportedFormats();

    formatGrid.innerHTML = Object.entries(supportedFormats)
      .map(
        ([formatId, format]) => `
      <div class="format-card" data-format="${formatId}">
        <div class="format-icon">${this.getFormatIcon(formatId)}</div>
        <div class="format-info">
          <div class="format-name">${format.name}</div>
          <div class="format-extension">.${format.extension}</div>
          <div class="format-features">
            ${format.supportsStreaming ? '<span class="feature-tag">Streaming</span>' : ""}
          </div>
        </div>
        <div class="format-selector">
          <input type="radio" name="export-format" value="${formatId}" id="format-${formatId}">
          <label for="format-${formatId}"></label>
        </div>
      </div>
    `
      )
      .join("");

    // Add format selection listeners
    formatGrid.querySelectorAll('input[name="export-format"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectFormat(e.target.value);
        }
      });
    });

    // Select CSV by default
    const csvRadio = formatGrid.querySelector("#format-csv");
    if (csvRadio) {
      csvRadio.checked = true;
      this.selectFormat("csv");
    }
  }

  /**
   * Get icon for format
   * @param {string} formatId - Format identifier
   * @returns {string} Icon character
   */
  getFormatIcon(formatId) {
    const icons = {
      csv: "📊",
      tsv: "📋",
      json: "🔧",
      excel: "📈",
      jsonl: "📄",
    };
    return icons[formatId] || "📄";
  }

  /**
   * Select export format and update options
   * @param {string} formatId - Selected format ID
   */
  selectFormat(formatId) {
    this.selectedFormat = formatId;
    this.updateFormatSelection();
    this.populateOptions(formatId);
    this.updateActionButtons();
  }

  /**
   * Update visual format selection
   */
  updateFormatSelection() {
    this.container.querySelectorAll(".format-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.format === this.selectedFormat);
    });
  }

  /**
   * Populate options for selected format
   * @param {string} formatId - Format ID
   */
  populateOptions(formatId) {
    const optionsContent = this.container.querySelector("#options-content");
    const defaultOptions = this.exportEngine.getDefaultOptions(formatId);

    let optionsHTML = "";

    switch (formatId) {
      case "csv":
      case "tsv":
      case "excel":
        optionsHTML = this.createCSVOptions(defaultOptions);
        break;
      case "json":
        optionsHTML = this.createJSONOptions(defaultOptions);
        break;
      case "jsonl":
        optionsHTML = this.createJSONLOptions(defaultOptions);
        break;
      default:
        optionsHTML = '<p class="no-options">No additional options available for this format.</p>';
    }

    optionsContent.innerHTML = optionsHTML;
    this.setupOptionsListeners();
  }

  /**
   * Create CSV format options
   * @param {Object} defaults - Default options
   * @returns {string} Options HTML
   */
  createCSVOptions(defaults) {
    return `
      <div class="option-group">
        <label for="csv-delimiter">Field Delimiter:</label>
        <select id="csv-delimiter">
          <option value="," ${defaults.delimiter === "," ? "selected" : ""}>Comma (,)</option>
          <option value=";" ${defaults.delimiter === ";" ? "selected" : ""}>Semicolon (;)</option>
          <option value="|" ${defaults.delimiter === "|" ? "selected" : ""}>Pipe (|)</option>
          <option value="custom">Custom</option>
        </select>
        <input type="text" id="csv-delimiter-custom" placeholder="Enter delimiter" maxlength="1" style="display: none;">
      </div>

      <div class="option-group">
        <label for="csv-quote">Quote Character:</label>
        <select id="csv-quote">
          <option value='"' ${defaults.quote === '"' ? "selected" : ""}>Double Quote (")</option>
          <option value="'" ${defaults.quote === "'" ? "selected" : ""}>Single Quote (')</option>
        </select>
      </div>

      <div class="option-group">
        <label for="csv-line-ending">Line Endings:</label>
        <select id="csv-line-ending">
          <option value="\\n" ${defaults.lineEnding === "\n" ? "selected" : ""}>Unix (LF)</option>
          <option value="\\r\\n" ${defaults.lineEnding === "\r\n" ? "selected" : ""}>Windows (CRLF)</option>
          <option value="\\r">Classic Mac (CR)</option>
        </select>
      </div>

      <div class="option-group">
        <label class="checkbox-label">
          <input type="checkbox" id="csv-headers" ${defaults.includeHeaders ? "checked" : ""}>
          <span>Include column headers</span>
        </label>
      </div>

      <div class="option-group">
        <label class="checkbox-label">
          <input type="checkbox" id="csv-bom" ${defaults.bom ? "checked" : ""}>
          <span>Include BOM (Byte Order Mark)</span>
        </label>
      </div>

      <div class="option-group">
        <label for="csv-encoding">Text Encoding:</label>
        <select id="csv-encoding">
          <option value="utf-8" ${defaults.encoding === "utf-8" ? "selected" : ""}>UTF-8</option>
          <option value="utf-16">UTF-16</option>
          <option value="iso-8859-1">ISO-8859-1</option>
        </select>
      </div>
    `;
  }

  /**
   * Create JSON format options
   * @param {Object} defaults - Default options
   * @returns {string} Options HTML
   */
  createJSONOptions(defaults) {
    return `
      <div class="option-group">
        <label for="json-format">Data Structure:</label>
        <select id="json-format">
          <option value="array" ${defaults.format === "array" ? "selected" : ""}>Array of Arrays</option>
          <option value="objects" ${defaults.format === "objects" ? "selected" : ""}>Array of Objects</option>
        </select>
        <div class="option-help">
          <small>Array: [["col1", "col2"], ["val1", "val2"]]</small><br>
          <small>Objects: [{"col1": "val1", "col2": "val2"}]</small>
        </div>
      </div>

      <div class="option-group">
        <label for="json-indent">Indentation:</label>
        <select id="json-indent">
          <option value="0">Compact (no indentation)</option>
          <option value="2" ${defaults.indent === 2 ? "selected" : ""}>2 spaces</option>
          <option value="4" ${defaults.indent === 4 ? "selected" : ""}>4 spaces</option>
          <option value="tab">Tab characters</option>
        </select>
      </div>

      <div class="option-group">
        <label class="checkbox-label">
          <input type="checkbox" id="json-metadata" ${defaults.includeMetadata ? "checked" : ""}>
          <span>Include export metadata</span>
        </label>
      </div>

      <div class="option-group">
        <label for="json-encoding">Text Encoding:</label>
        <select id="json-encoding">
          <option value="utf-8" ${defaults.encoding === "utf-8" ? "selected" : ""}>UTF-8</option>
          <option value="utf-16">UTF-16</option>
        </select>
      </div>
    `;
  }

  /**
   * Create JSON Lines format options
   * @param {Object} defaults - Default options
   * @returns {string} Options HTML
   */
  createJSONLOptions(defaults) {
    return `
      <div class="option-group">
        <label class="checkbox-label">
          <input type="checkbox" id="jsonl-metadata" ${defaults.includeMetadata ? "checked" : ""}>
          <span>Include export metadata</span>
        </label>
      </div>

      <div class="option-group">
        <label for="jsonl-encoding">Text Encoding:</label>
        <select id="jsonl-encoding">
          <option value="utf-8" ${defaults.encoding === "utf-8" ? "selected" : ""}>UTF-8</option>
          <option value="utf-16">UTF-16</option>
        </select>
      </div>
    `;
  }

  /**
   * Setup options event listeners
   */
  setupOptionsListeners() {
    // Custom delimiter toggle
    const delimiterSelect = this.container.querySelector("#csv-delimiter");
    const customDelimiterInput = this.container.querySelector("#csv-delimiter-custom");

    if (delimiterSelect && customDelimiterInput) {
      delimiterSelect.addEventListener("change", (e) => {
        const isCustom = e.target.value === "custom";
        customDelimiterInput.style.display = isCustom ? "block" : "none";
        if (isCustom) {
          customDelimiterInput.focus();
        }
      });
    }

    // Update preview when options change
    this.container.querySelectorAll("#options-content input, #options-content select").forEach((element) => {
      element.addEventListener("change", () => {
        if (this.previewData) {
          this.refreshPreview();
        }
      });
    });
  }

  /**
   * Get current export options
   * @returns {Object} Current options
   */
  getCurrentOptions() {
    if (!this.selectedFormat) return {};

    const options = {};

    switch (this.selectedFormat) {
      case "csv":
      case "tsv":
      case "excel":
        options.delimiter = this.getDelimiterValue();
        options.quote = this.container.querySelector("#csv-quote")?.value || '"';
        options.lineEnding = this.getLineEndingValue();
        options.includeHeaders = this.container.querySelector("#csv-headers")?.checked ?? true;
        options.bom = this.container.querySelector("#csv-bom")?.checked ?? false;
        options.encoding = this.container.querySelector("#csv-encoding")?.value || "utf-8";
        break;

      case "json":
        options.format = this.container.querySelector("#json-format")?.value || "array";
        options.indent = this.getIndentValue();
        options.includeMetadata = this.container.querySelector("#json-metadata")?.checked ?? false;
        options.encoding = this.container.querySelector("#json-encoding")?.value || "utf-8";
        break;

      case "jsonl":
        options.includeMetadata = this.container.querySelector("#jsonl-metadata")?.checked ?? false;
        options.encoding = this.container.querySelector("#jsonl-encoding")?.value || "utf-8";
        break;
    }

    return options;
  }

  /**
   * Get delimiter value (handling custom input)
   * @returns {string} Delimiter character
   */
  getDelimiterValue() {
    const select = this.container.querySelector("#csv-delimiter");
    const customInput = this.container.querySelector("#csv-delimiter-custom");

    if (select?.value === "custom") {
      return customInput?.value || ",";
    }
    return select?.value || ",";
  }

  /**
   * Get line ending value
   * @returns {string} Line ending characters
   */
  getLineEndingValue() {
    const value = this.container.querySelector("#csv-line-ending")?.value || "\\n";
    return value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }

  /**
   * Get indent value for JSON
   * @returns {number|string} Indent value
   */
  getIndentValue() {
    const value = this.container.querySelector("#json-indent")?.value || "2";
    if (value === "tab") return "\t";
    return parseInt(value) || 0;
  }

  /**
   * Set data to export
   * @param {*} data - Data to export
   */
  setData(data) {
    this.currentData = data;
    this.updateActionButtons();
    this.hidePreview();
  }

  /**
   * Update action button states
   */
  updateActionButtons() {
    const previewBtn = this.container.querySelector("#preview-btn");
    const exportBtn = this.container.querySelector("#export-btn");

    const hasData = this.currentData && this.currentData.length > 0;
    const hasFormat = !!this.selectedFormat;

    previewBtn.disabled = !hasData || !hasFormat || this.isExporting;
    exportBtn.disabled = !hasData || !hasFormat || this.isExporting;
  }

  /**
   * Show export preview
   */
  async showPreview() {
    if (!this.currentData || !this.selectedFormat) return;

    try {
      this.updateStatus("generating", "Generating preview...");

      const options = this.getCurrentOptions();
      const previewData = this.currentData.slice(0, 100); // Limit preview to 100 rows

      const result = await this.exportEngine.export(previewData, this.selectedFormat, options);

      this.previewData = result.data;
      this.displayPreview(result);
      this.updateStatus("ready", "Preview generated");
    } catch (error) {
      console.error("Preview generation failed:", error);
      this.updateStatus("error", "Preview failed");
      this.showError("Failed to generate preview: " + error.message);
    }
  }

  /**
   * Display preview data
   * @param {Object} result - Export result
   */
  displayPreview(result) {
    const previewSection = this.container.querySelector("#preview-section");
    const previewStats = this.container.querySelector("#preview-stats");
    const previewData = this.container.querySelector("#preview-data");

    // Show preview section
    previewSection.style.display = "block";

    // Update stats
    previewStats.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Format:</span>
        <span class="stat-value">${this.selectedFormat.toUpperCase()}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Size:</span>
        <span class="stat-value">${this.formatFileSize(result.data.length)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Rows:</span>
        <span class="stat-value">${result.metadata.rows}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Columns:</span>
        <span class="stat-value">${result.metadata.columns}</span>
      </div>
    `;

    // Display preview data
    const maxLength = 2000; // Limit preview length
    let displayData = result.data;

    if (displayData.length > maxLength) {
      displayData = displayData.substring(0, maxLength) + "\n... (truncated)";
    }

    previewData.innerHTML = `
      <pre class="preview-text">${this.escapeHtml(displayData)}</pre>
    `;
  }

  /**
   * Refresh preview with current options
   */
  refreshPreview() {
    this.showPreview();
  }

  /**
   * Hide preview section
   */
  hidePreview() {
    this.container.querySelector("#preview-section").style.display = "none";
    this.previewData = null;
  }

  /**
   * Export and download data
   */
  async exportData() {
    if (!this.currentData || !this.selectedFormat) return;

    try {
      this.isExporting = true;
      this.updateActionButtons();
      this.showProgress();
      this.updateStatus("exporting", "Exporting data...");

      const options = this.getCurrentOptions();

      // Setup progress tracking for large datasets
      let progressCallback;
      if (this.currentData.length > 10000) {
        progressCallback = (processed, total) => {
          this.updateProgress(processed, total);
        };
      }

      const result = await this.exportEngine.export(this.currentData, this.selectedFormat, {
        ...options,
        onProgress: progressCallback,
      });

      // Generate filename and download
      const filename = this.exportEngine.generateFilename(this.selectedFormat, "export");
      this.downloadFile(result.data, filename, result.metadata);

      // Add to history
      this.addToHistory({
        filename,
        format: this.selectedFormat,
        size: result.data.length,
        rows: result.metadata.rows,
        timestamp: new Date().toISOString(),
        options: { ...options },
      });

      this.updateStatus("completed", "Export completed successfully");
      this.onExport(result);
    } catch (error) {
      console.error("Export failed:", error);
      this.updateStatus("error", "Export failed");
      this.showError("Export failed: " + error.message);
    } finally {
      this.isExporting = false;
      this.updateActionButtons();
      this.hideProgress();
    }
  }

  /**
   * Cancel ongoing export
   */
  cancelExport() {
    // Implementation would depend on ExportEngine supporting cancellation
    this.isExporting = false;
    this.updateActionButtons();
    this.hideProgress();
    this.updateStatus("cancelled", "Export cancelled");
  }

  /**
   * Download file
   * @param {string} data - File data
   * @param {string} filename - Filename
   * @param {Object} metadata - Export metadata
   */
  downloadFile(data, filename, metadata) {
    const blob = this.exportEngine.createBlob(data, this.selectedFormat, {
      mimeType: metadata.mimeType,
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL after download
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Show export progress
   */
  showProgress() {
    this.container.querySelector("#export-progress").style.display = "block";
  }

  /**
   * Hide export progress
   */
  hideProgress() {
    this.container.querySelector("#export-progress").style.display = "none";
  }

  /**
   * Update export progress
   * @param {number} processed - Processed rows
   * @param {number} total - Total rows
   */
  updateProgress(processed, total) {
    const percentage = Math.round((processed / total) * 100);

    this.container.querySelector("#progress-percentage").textContent = `${percentage}%`;
    this.container.querySelector("#progress-fill").style.width = `${percentage}%`;
    this.container.querySelector("#progress-details .progress-rows").textContent = `${processed.toLocaleString()} / ${total.toLocaleString()} rows`;
  }

  /**
   * Update export status
   * @param {string} status - Status type
   * @param {string} text - Status text
   */
  updateStatus(status, text) {
    const indicator = this.container.querySelector("#status-indicator");
    const statusText = this.container.querySelector("#status-text");

    indicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
  }

  /**
   * Add export to history
   * @param {Object} exportInfo - Export information
   */
  addToHistory(exportInfo) {
    this.exportHistory.unshift(exportInfo);

    // Limit history to 10 items
    if (this.exportHistory.length > 10) {
      this.exportHistory = this.exportHistory.slice(0, 10);
    }

    this.updateHistoryDisplay();
  }

  /**
   * Update history display
   */
  updateHistoryDisplay() {
    const historySection = this.container.querySelector("#history-section");
    const historyList = this.container.querySelector("#history-list");

    if (this.exportHistory.length === 0) {
      historySection.style.display = "none";
      return;
    }

    historySection.style.display = "block";

    historyList.innerHTML = this.exportHistory
      .map(
        (item, index) => `
      <div class="history-item">
        <div class="history-info">
          <div class="history-filename">${item.filename}</div>
          <div class="history-details">
            <span class="history-format">${item.format.toUpperCase()}</span>
            <span class="history-size">${this.formatFileSize(item.size)}</span>
            <span class="history-rows">${item.rows} rows</span>
            <span class="history-time">${this.formatTime(item.timestamp)}</span>
          </div>
        </div>
        <div class="history-actions">
          <button class="repeat-export-btn" data-index="${index}" title="Repeat export with same settings">
            🔄
          </button>
        </div>
      </div>
    `
      )
      .join("");

    // Add repeat export listeners
    historyList.querySelectorAll(".repeat-export-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        this.repeatExport(index);
      });
    });
  }

  /**
   * Repeat export with previous settings
   * @param {number} historyIndex - History item index
   */
  repeatExport(historyIndex) {
    const historyItem = this.exportHistory[historyIndex];
    if (!historyItem || !this.currentData) return;

    // Apply previous settings
    this.selectFormat(historyItem.format);
    this.applyOptions(historyItem.options);

    // Export with same settings
    setTimeout(() => this.exportData(), 100);
  }

  /**
   * Apply export options to UI
   * @param {Object} options - Options to apply
   */
  applyOptions(options) {
    // This would set the UI controls to match the provided options
    // Implementation depends on the specific option controls
    Object.entries(options).forEach(([key, value]) => {
      const element = this.container.querySelector(`#${this.selectedFormat}-${key}`);
      if (element) {
        if (element.type === "checkbox") {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    });
  }

  /**
   * Clear export history
   */
  clearHistory() {
    this.exportHistory = [];
    this.updateHistoryDisplay();
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format timestamp for display
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Formatted time
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  /**
   * Escape HTML characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // This could show a toast notification or modal
    console.error(message);
    alert(message); // Simple implementation
  }

  /**
   * Reset export panel
   */
  reset() {
    this.currentData = null;
    this.hidePreview();
    this.hideProgress();
    this.updateStatus("ready", "Ready to export");
    this.updateActionButtons();
  }

  /**
   * Get current export settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return {
      selectedFormat: this.selectedFormat,
      options: this.getCurrentOptions(),
      exportHistory: [...this.exportHistory],
    };
  }

  /**
   * Apply settings to panel
   * @param {Object} settings - Settings to apply
   */
  applySettings(settings) {
    if (settings.selectedFormat) {
      const formatRadio = this.container.querySelector(`#format-${settings.selectedFormat}`);
      if (formatRadio) {
        formatRadio.checked = true;
        this.selectFormat(settings.selectedFormat);
      }
    }

    if (settings.options) {
      this.applyOptions(settings.options);
    }

    if (settings.exportHistory) {
      this.exportHistory = settings.exportHistory;
      this.updateHistoryDisplay();
    }
  }
}
