/**
 * SimpleTab - Enhanced simple mode tab for string to CSV conversion
 * Provides improved version of the current single-string conversion functionality
 */

import { TabComponent } from "../components/TabComponent.js";
import { ProcessingJob } from "../core/interfaces.js";
import { TemplateManager } from "../utils/TemplateManager.js";

export class SimpleTab extends TabComponent {
  constructor(options = {}) {
    super("simple", null, options);

    // Tab-specific state
    this.conversionSettings = {
      separator: "newline",
      customSeparator: "",
      quoteType: "double",
      trimWhitespace: true,
      smartDetection: true,
    };

    // UI elements
    this.element = null;
    this.inputElement = null;
    this.outputElement = null;
    this.settingsPanel = null;
    this.statusElement = null;

    // Processing state
    this.currentJob = null;
    this.processingTimeout = null;

    // Performance tracking
    this.metrics = {
      conversionsCount: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      lastConversionTime: 0,
    };

    // Template management
    this.templateManager = null;
    this.currentTemplate = null;
    this.templatePanel = null;

    // Bind methods
    this.handleInputChange = this.debounce(this.handleInputChange.bind(this), 300);
    this.handleSettingsChange = this.handleSettingsChange.bind(this);
    this.handleCopy = this.handleCopy.bind(this);
    this.handleClear = this.handleClear.bind(this);
  }

  /**
   * Debounce utility function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Initialize the simple tab
   */
  async onInitialize() {
    try {
      // Load saved settings
      await this.loadSettings();

      // Initialize format detector
      this.formatDetector = await this.initializeFormatDetector();

      // Initialize template manager
      this.templateManager = new TemplateManager();
      await this.templateManager.initialize();

      console.log("SimpleTab initialized successfully");
    } catch (error) {
      console.error("Failed to initialize SimpleTab:", error);
      throw error;
    }
  }

  /**
   * Activate the simple tab
   */
  async onActivate() {
    try {
      // Focus input element
      if (this.inputElement) {
        this.inputElement.focus();
      }

      // Update status
      this.updateStatus("Ready for input");

      // Emit activation event
      this.broadcastEvent("simpleTabActivated", {
        settings: this.conversionSettings,
        metrics: this.metrics,
      });

      console.log("SimpleTab activated");
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Deactivate the simple tab
   */
  async onDeactivate() {
    try {
      // Cancel any ongoing processing
      if (this.currentJob) {
        this.cancelProcessing();
      }

      // Save current settings
      await this.saveSettings();

      console.log("SimpleTab deactivated");
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Create the DOM element for the simple tab
   */
  createElement() {
    const container = document.createElement("div");
    container.className = "simple-tab-container";
    container.innerHTML = `
      <div class="simple-tab-content">
        <!-- Status Bar -->
        <div class="status-bar">
          <span class="status-text" id="simple-status">Ready</span>
          <div class="status-actions">
            <button class="btn-icon" id="simple-template-toggle" title="Templates">
              <i class="fas fa-bookmark"></i>
            </button>
            <button class="btn-icon" id="simple-settings-toggle" title="Settings">
              <i class="fas fa-cog"></i>
            </button>
          </div>
        </div>

        <!-- Settings Panel -->
        <div class="settings-panel collapsed" id="simple-settings">
          <div class="settings-header">
            <h3>Conversion Settings</h3>
            <button class="btn-close" id="simple-settings-close">&times;</button>
          </div>
          
          <div class="settings-content">
            <div class="setting-group">
              <label for="simple-separator">Separator</label>
              <select id="simple-separator" name="separator">
                <option value="newline">New Line (↵)</option>
                <option value="comma">Comma (,)</option>
                <option value="space">Space (␣)</option>
                <option value="tab">Tab (⇥)</option>
                <option value="custom">Custom...</option>
              </select>
              <div class="custom-separator-group hidden" id="simple-custom-separator">
                <input type="text" id="simple-custom-input" placeholder="Enter separator" maxlength="5">
              </div>
            </div>

            <div class="setting-group">
              <label for="simple-quote-type">Quote Type</label>
              <select id="simple-quote-type" name="quoteType">
                <option value="double">Double Quotes ("")</option>
                <option value="single">Single Quotes ('')</option>
                <option value="none">No Quotes</option>
              </select>
            </div>

            <div class="setting-group">
              <label class="checkbox-label">
                <input type="checkbox" id="simple-trim" name="trimWhitespace" checked>
                <span class="checkmark"></span>
                Trim Whitespace
              </label>
            </div>

            <div class="setting-group">
              <label class="checkbox-label">
                <input type="checkbox" id="simple-smart-detection" name="smartDetection" checked>
                <span class="checkmark"></span>
                Smart Format Detection
              </label>
            </div>


          </div>
        </div>

        <!-- Template Panel -->
        <div class="template-panel collapsed" id="simple-templates">
          <div class="template-header">
            <h3>Templates</h3>
            <div class="template-actions">
              <button class="btn-small" id="template-save">
                <i class="fas fa-save"></i> Save
              </button>
              <button class="btn-small" id="template-import">
                <i class="fas fa-upload"></i> Import
              </button>
            </div>
            <button class="btn-close" id="simple-templates-close">&times;</button>
          </div>
          
          <div class="template-content">
            <div class="template-search">
              <input type="text" id="template-search" placeholder="Search templates..." />
              <select id="template-category">
                <option value="">All Categories</option>
                <option value="user">User</option>
                <option value="system">System</option>
                <option value="imported">Imported</option>
              </select>
            </div>
            
            <div class="template-list" id="template-list">
              <div class="template-placeholder">
                No templates found. Save your current settings as a template to get started.
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
          <div class="input-section">
            <div class="section-header">
              <label for="simple-input">Input String</label>
              <div class="input-meta">
                <span class="char-count">0 chars</span>
                <span class="line-count">0 lines</span>
              </div>
            </div>
            <textarea 
              id="simple-input" 
              class="input-textarea"
              placeholder="Paste or type your data here..."
              rows="8"
            ></textarea>
          </div>

          <div class="output-section">
            <div class="section-header">
              <label for="simple-output">CSV Output</label>
              <div class="output-actions">
                <button class="btn-primary" id="simple-copy">
                  <i class="fas fa-copy"></i> Copy
                </button>
                <button class="btn-secondary" id="simple-clear">
                  <i class="fas fa-trash"></i> Clear
                </button>
              </div>
            </div>
            <textarea 
              id="simple-output" 
              class="output-textarea"
              readonly
              rows="8"
            ></textarea>
          </div>
        </div>

        <!-- Format Detection Panel -->
        <div class="detection-panel" id="simple-detection-panel">
          <div class="detection-header">
            <i class="fas fa-magic"></i>
            <span>Smart Detection Suggestions</span>
            <button class="btn-close" id="detection-close">&times;</button>
          </div>
          <div class="detection-content">
            <div class="detection-suggestions" id="detection-suggestions">
              <!-- Suggestions will be populated dynamically -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Store element references
    this.inputElement = container.querySelector("#simple-input");
    this.outputElement = container.querySelector("#simple-output");
    this.settingsPanel = container.querySelector("#simple-settings");
    this.templatePanel = container.querySelector("#simple-templates");
    this.statusElement = container.querySelector("#simple-status");

    // Setup event listeners
    this.setupTabSpecificListeners(container);

    this.element = container;
    return container;
  }

  /**
   * Get the tab's DOM element
   */
  getElement() {
    console.log(`SimpleTab getElement called, element exists: ${!!this.element}`);
    if (!this.element) {
      console.log("Creating SimpleTab element");
      this.element = this.createElement();
      console.log(`SimpleTab element created: ${!!this.element}`);
    }
    return this.element;
  }

  /**
   * Setup event listeners - override base implementation
   */
  setupEventListeners(container = null) {
    // Call parent implementation first
    super.setupEventListeners();

    // If container is provided, setup specific listeners
    if (container) {
      this.setupTabSpecificListeners(container);
    }
  }

  /**
   * Setup tab-specific event listeners
   */
  setupTabSpecificListeners(container) {
    // Input change handler
    this.addEventListener(this.inputElement, "input", this.handleInputChange);
    this.addEventListener(this.inputElement, "paste", (e) => {
      // Handle paste with delay to allow content to be pasted
      setTimeout(() => this.handleInputChange(e), 10);
    });

    // Settings handlers
    const settingsInputs = container.querySelectorAll("#simple-settings input, #simple-settings select");
    settingsInputs.forEach((input) => {
      this.addEventListener(input, "change", this.handleSettingsChange);
    });

    // Button handlers
    this.addEventListener(container.querySelector("#simple-copy"), "click", this.handleCopy);
    this.addEventListener(container.querySelector("#simple-clear"), "click", this.handleClear);

    // Settings panel toggle
    this.addEventListener(container.querySelector("#simple-settings-toggle"), "click", () => {
      this.toggleSettingsPanel();
    });
    this.addEventListener(container.querySelector("#simple-settings-close"), "click", () => {
      this.toggleSettingsPanel(false);
    });

    // Template panel toggle
    this.addEventListener(container.querySelector("#simple-template-toggle"), "click", () => {
      this.toggleTemplatePanel();
    });
    this.addEventListener(container.querySelector("#simple-templates-close"), "click", () => {
      this.toggleTemplatePanel(false);
    });

    // Template actions
    this.addEventListener(container.querySelector("#template-save"), "click", () => {
      this.showSaveTemplateDialog();
    });
    this.addEventListener(container.querySelector("#template-import"), "click", () => {
      this.showImportTemplateDialog();
    });

    // Template search and filter
    this.addEventListener(container.querySelector("#template-search"), "input", (e) => {
      this.filterTemplates(e.target.value);
    });
    this.addEventListener(container.querySelector("#template-category"), "change", (e) => {
      this.filterTemplates(null, e.target.value);
    });

    // Custom separator handling
    const separatorSelect = container.querySelector("#simple-separator");
    this.addEventListener(separatorSelect, "change", (e) => {
      const customGroup = container.querySelector("#simple-custom-separator");
      if (e.target.value === "custom") {
        customGroup.classList.remove("hidden");
        container.querySelector("#simple-custom-input").focus();
      } else {
        customGroup.classList.add("hidden");
      }
    });

    // Detection panel handlers
    this.addEventListener(container.querySelector("#detection-close"), "click", () => {
      this.hideDetectionPanel();
    });

    // Keyboard shortcuts
    this.addEventListener(this.inputElement, "keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "Enter":
            e.preventDefault();
            this.processConversion();
            break;
          case "k":
            e.preventDefault();
            this.handleClear();
            break;
        }
      }
    });
  }

  /**
   * Handle input change with smart detection
   */
  async handleInputChange(event) {
    const input = event.target.value;

    try {
      // Update input metadata
      this.updateInputMetadata(input);

      // Smart format detection
      if (this.conversionSettings.smartDetection && input.length > 10) {
        await this.performSmartDetection(input);
      }

      // Process conversion
      await this.processConversion(input);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle settings change
   */
  handleSettingsChange(event) {
    const { name, value, type, checked } = event.target;

    if (type === "checkbox") {
      this.conversionSettings[name] = checked;
    } else {
      this.conversionSettings[name] = value;
    }

    // Handle custom separator
    if (name === "separator" && value === "custom") {
      const customInput = document.querySelector("#simple-custom-input");
      if (customInput && customInput.value) {
        this.conversionSettings.customSeparator = customInput.value;
      }
    }

    // Re-process with new settings
    if (this.inputElement && this.inputElement.value) {
      this.processConversion(this.inputElement.value);
    }

    // Save settings
    this.saveSettings();
  }

  /**
   * Process conversion with current settings
   */
  async processConversion(input = null) {
    const inputText = input || (this.inputElement ? this.inputElement.value : "");

    if (!inputText.trim()) {
      this.outputElement.value = "";
      this.updateStatus("Ready for input");
      return;
    }

    try {
      const startTime = performance.now();
      this.updateStatus("Processing...");

      // Cancel previous job if running
      if (this.currentJob) {
        this.cancelProcessing();
      }

      // Create processing job
      this.currentJob = new ProcessingJob({
        type: "simple",
        input: {
          data: inputText,
          source: "text",
        },
        settings: this.getProcessingSettings(),
      });

      // Process using worker pool if available
      let result;
      if (this.tabManager && this.tabManager.workerPool) {
        result = await this.tabManager.workerPool.executeJob(
          {
            input: inputText,
            settings: this.getProcessingSettings(),
          },
          "conversion"
        );
      } else {
        // Fallback to local processing
        result = await this.processLocally(inputText);
      }

      // Update output
      this.outputElement.value = result.output || result;

      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime);

      // Update status
      const lines = result.metadata ? result.metadata.outputLines : inputText.split("\n").length;
      this.updateStatus(`Converted ${lines} lines in ${processingTime.toFixed(1)}ms`);

      this.currentJob = null;
    } catch (error) {
      this.handleError(error);
      this.updateStatus("Conversion failed");
      this.currentJob = null;
    }
  }

  /**
   * Process conversion locally (fallback)
   */
  async processLocally(input) {
    const separator = this.getSeparatorValue();
    const quoteChar = this.conversionSettings.quoteType === "single" ? "'" : '"';
    const shouldTrim = this.conversionSettings.trimWhitespace;

    const lines = input.split(separator);
    const processedLines = lines
      .filter((line) => line.trim() !== "")
      .map((line) => {
        let processed = shouldTrim ? line.trim() : line;

        if (this.conversionSettings.quoteType !== "none") {
          // Escape existing quotes
          processed = processed.replace(new RegExp(quoteChar, "g"), quoteChar + quoteChar);
          processed = quoteChar + processed + quoteChar;
        }

        return processed;
      });

    return {
      output: processedLines.join(",\n"),
      metadata: {
        inputLines: lines.length,
        outputLines: processedLines.length,
      },
    };
  }

  /**
   * Get separator value based on settings
   */
  getSeparatorValue() {
    const separatorMap = {
      newline: "\n",
      comma: ",",
      space: " ",
      tab: "\t",
      custom: this.conversionSettings.customSeparator || "\n",
    };

    return separatorMap[this.conversionSettings.separator] || "\n";
  }

  /**
   * Get processing settings for worker
   */
  getProcessingSettings() {
    return {
      mode: "simple",
      separators: {
        row: this.getSeparatorValue(),
        column: ",",
      },
      quoting: {
        type: this.conversionSettings.quoteType,
        escape: "double",
      },
      transformation: {
        trim: this.conversionSettings.trimWhitespace,
        rules: [],
      },
    };
  }

  /**
   * Perform smart format detection
   */
  async performSmartDetection(input) {
    try {
      if (!this.formatDetector) {
        return;
      }

      const detection = await this.formatDetector.detectFormat(input);

      if (detection.confidence > 0.7 && detection.suggestions) {
        this.showDetectionSuggestions(detection.suggestions);
      }
    } catch (error) {
      console.warn("Smart detection failed:", error);
    }
  }

  /**
   * Show format detection suggestions
   */
  showDetectionSuggestions(suggestions) {
    const panel = document.querySelector("#simple-detection-panel");
    const container = document.querySelector("#detection-suggestions");

    if (!panel || !container) return;

    container.innerHTML = "";

    suggestions.forEach((suggestion) => {
      const suggestionEl = document.createElement("div");
      suggestionEl.className = "detection-suggestion";
      suggestionEl.innerHTML = `
        <div class="suggestion-info">
          <strong>${suggestion.name}</strong>
          <span class="confidence">Confidence: ${(suggestion.confidence * 100).toFixed(0)}%</span>
        </div>
        <div class="suggestion-description">${suggestion.description}</div>
        <button class="btn-apply" data-suggestion='${JSON.stringify(suggestion.settings)}'>
          Apply
        </button>
      `;

      // Add click handler for apply button
      const applyBtn = suggestionEl.querySelector(".btn-apply");
      this.addEventListener(applyBtn, "click", () => {
        this.applySuggestion(suggestion.settings);
        this.hideDetectionPanel();
      });

      container.appendChild(suggestionEl);
    });

    panel.classList.add("visible");
  }

  /**
   * Apply detection suggestion
   */
  applySuggestion(settings) {
    Object.assign(this.conversionSettings, settings);
    this.updateSettingsUI();
    this.processConversion();
  }

  /**
   * Hide detection panel
   */
  hideDetectionPanel() {
    const panel = document.querySelector("#simple-detection-panel");
    if (panel) {
      panel.classList.remove("visible");
    }
  }

  /**
   * Update settings UI to reflect current settings
   */
  updateSettingsUI() {
    const container = this.getElement();
    if (!container) return;

    // Update separator
    const separatorSelect = container.querySelector("#simple-separator");
    if (separatorSelect) {
      separatorSelect.value = this.conversionSettings.separator;
    }

    // Update quote type
    const quoteSelect = container.querySelector("#simple-quote-type");
    if (quoteSelect) {
      quoteSelect.value = this.conversionSettings.quoteType;
    }

    // Update checkboxes
    const trimCheckbox = container.querySelector("#simple-trim");
    if (trimCheckbox) {
      trimCheckbox.checked = this.conversionSettings.trimWhitespace;
    }

    const smartCheckbox = container.querySelector("#simple-smart-detection");
    if (smartCheckbox) {
      smartCheckbox.checked = this.conversionSettings.smartDetection;
    }
  }

  /**
   * Update input metadata display
   */
  updateInputMetadata(input) {
    const container = this.getElement();
    if (!container) return;

    const charCount = container.querySelector(".char-count");
    const lineCount = container.querySelector(".line-count");

    if (charCount) {
      charCount.textContent = `${input.length} chars`;
    }

    if (lineCount) {
      const lines = input.split("\n").length;
      lineCount.textContent = `${lines} lines`;
    }
  }

  /**
   * Handle copy button click
   */
  async handleCopy() {
    if (!this.outputElement || !this.outputElement.value) {
      this.showError("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(this.outputElement.value);
      this.showSuccess("Copied to clipboard");

      // Visual feedback
      const copyBtn = document.querySelector("#simple-copy");
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = "✅ Copied!";
        copyBtn.classList.add("success");

        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove("success");
        }, 2000);
      }
    } catch (error) {
      this.showError("Failed to copy to clipboard");
    }
  }

  /**
   * Handle clear button click
   */
  handleClear() {
    if (this.inputElement) {
      this.inputElement.value = "";
    }
    if (this.outputElement) {
      this.outputElement.value = "";
    }

    this.updateInputMetadata("");
    this.updateStatus("Ready for input");
    this.hideDetectionPanel();

    // Focus input
    if (this.inputElement) {
      this.inputElement.focus();
    }
  }

  /**
   * Toggle settings panel
   */
  toggleSettingsPanel(show = null) {
    if (!this.settingsPanel) return;

    const isVisible = show !== null ? show : this.settingsPanel.classList.contains("collapsed");

    if (isVisible) {
      this.settingsPanel.classList.remove("collapsed");
    } else {
      this.settingsPanel.classList.add("collapsed");
    }
  }

  /**
   * Update status message
   */
  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }

  /**
   * Update performance metrics
   */
  updateMetrics(processingTime) {
    this.metrics.conversionsCount++;
    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.conversionsCount;
    this.metrics.lastConversionTime = processingTime;
  }

  /**
   * Cancel current processing
   */
  cancelProcessing() {
    if (this.currentJob && this.tabManager && this.tabManager.workerPool) {
      // Cancel worker job if possible
      // This would need to be implemented in the worker pool
    }

    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }

    this.currentJob = null;
    this.updateStatus("Processing cancelled");
  }

  /**
   * Initialize format detector
   */
  async initializeFormatDetector() {
    // Placeholder for format detector initialization
    // This would be implemented with the actual format detection logic
    return {
      detectFormat: async (input) => {
        // Simple format detection logic
        const lines = input.split("\n");
        const hasCommas = input.includes(",");
        const hasTabs = input.includes("\t");

        const suggestions = [];

        if (hasCommas && lines.length > 1) {
          suggestions.push({
            name: "Comma-separated values detected",
            description: "Input appears to contain comma-separated values",
            confidence: 0.8,
            settings: { separator: "comma" },
          });
        }

        if (hasTabs && lines.length > 1) {
          suggestions.push({
            name: "Tab-separated values detected",
            description: "Input appears to contain tab-separated values",
            confidence: 0.9,
            settings: { separator: "tab" },
          });
        }

        return {
          confidence: suggestions.length > 0 ? Math.max(...suggestions.map((s) => s.confidence)) : 0,
          suggestions,
        };
      },
    };
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(["simpleTabSettings"], resolve);
        });

        if (result.simpleTabSettings) {
          Object.assign(this.conversionSettings, result.simpleTabSettings);
        }
      }
    } catch (error) {
      console.warn("Failed to load settings:", error);
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        await new Promise((resolve, reject) => {
          chrome.storage.sync.set(
            {
              simpleTabSettings: this.conversionSettings,
            },
            () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            }
          );
        });
      }
    } catch (error) {
      console.warn("Failed to save settings:", error);
    }
  }

  /**
   * Get tab state for persistence
   */
  getState() {
    return {
      conversionSettings: this.conversionSettings,
      inputValue: this.inputElement ? this.inputElement.value : "",
      outputValue: this.outputElement ? this.outputElement.value : "",
      metrics: this.metrics,
    };
  }

  /**
   * Set tab state from persistence
   */
  setState(state) {
    if (state.conversionSettings) {
      this.conversionSettings = { ...this.conversionSettings, ...state.conversionSettings };
    }

    if (state.inputValue && this.inputElement) {
      this.inputElement.value = state.inputValue;
    }

    if (state.outputValue && this.outputElement) {
      this.outputElement.value = state.outputValue;
    }

    if (state.metrics) {
      this.metrics = { ...this.metrics, ...state.metrics };
    }

    // Update UI to reflect restored state
    this.updateSettingsUI();
  }

  /**
   * Validate tab state
   */
  validate() {
    const errors = [];

    if (!this.inputElement) {
      errors.push("Input element not found");
    }

    if (!this.outputElement) {
      errors.push("Output element not found");
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Clear tab data
   */
  clear() {
    this.handleClear();
  }

  /**
   * Open file dialog
   */
  openFile() {
    // Create file input
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".txt,.csv,.tsv";
    fileInput.style.display = "none";

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (this.inputElement) {
            this.inputElement.value = event.target.result;
            this.handleInputChange({ target: this.inputElement });
          }
        };
        reader.readAsText(file);
      }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  /**
   * Save current result
   */
  saveResult() {
    if (!this.outputElement || !this.outputElement.value) {
      this.showError("No output to save");
      return;
    }

    // Create download link
    const blob = new Blob([this.outputElement.value], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted_${Date.now()}.csv`;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showSuccess("File saved successfully");
  }

  /**
   * Copy current result
   */
  copyResult() {
    this.handleCopy();
  }

  /**
   * Process current data
   */
  process() {
    if (this.inputElement && this.inputElement.value) {
      this.processConversion(this.inputElement.value);
    }
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get tab state
   */
  getState() {
    return {
      ...super.getState(),
      conversionSettings: this.conversionSettings,
      metrics: this.metrics,
      inputValue: this.inputElement ? this.inputElement.value : "",
      outputValue: this.outputElement ? this.outputElement.value : "",
    };
  }

  /**
   * Set tab state from persistence
   */
  setState(state) {
    super.setState(state);

    if (state.conversionSettings) {
      Object.assign(this.conversionSettings, state.conversionSettings);
      this.updateSettingsUI();
    }

    if (state.metrics) {
      Object.assign(this.metrics, state.metrics);
    }

    if (state.inputValue && this.inputElement) {
      this.inputElement.value = state.inputValue;
      this.updateInputMetadata(state.inputValue);
    }

    if (state.outputValue && this.outputElement) {
      this.outputElement.value = state.outputValue;
    }
  }

  /**
   * Get tab metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      conversionsCount: this.metrics.conversionsCount,
      averageProcessingTime: this.metrics.averageProcessingTime,
      hasInput: this.inputElement ? this.inputElement.value.length > 0 : false,
      hasOutput: this.outputElement ? this.outputElement.value.length > 0 : false,
    };
  }

  /**
   * Toggle template panel
   */
  toggleTemplatePanel(show = null) {
    if (!this.templatePanel) return;

    const isVisible = show !== null ? show : this.templatePanel.classList.contains("collapsed");

    if (isVisible) {
      this.templatePanel.classList.remove("collapsed");
      this.loadTemplateList();
    } else {
      this.templatePanel.classList.add("collapsed");
    }
  }

  /**
   * Load and display template list
   */
  async loadTemplateList() {
    if (!this.templateManager) return;

    try {
      const templates = this.templateManager.searchTemplates("", {
        mode: "simple",
        sortBy: "modified",
        sortOrder: "desc",
      });

      this.displayTemplates(templates);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  /**
   * Display templates in the list
   */
  displayTemplates(templates) {
    const listContainer = document.querySelector("#template-list");
    if (!listContainer) return;

    if (templates.length === 0) {
      listContainer.innerHTML = `
        <div class="template-placeholder">
          No templates found. Save your current settings as a template to get started.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = templates
      .map(
        (template) => `
      <div class="template-item" data-template-id="${template.id}">
        <div class="template-info">
          <div class="template-name">${this.escapeHtml(template.name)}</div>
          <div class="template-description">${this.escapeHtml(template.description || "No description")}</div>
          <div class="template-meta">
            <span class="template-category">${template.category}</span>
            <span class="template-date">${new Date(template.modified).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="template-actions">
          <button class="btn-small template-apply" data-template-id="${template.id}" title="Apply Template">
            <i class="fas fa-play"></i>
          </button>
          <button class="btn-small template-edit" data-template-id="${template.id}" title="Edit Template">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-small template-clone" data-template-id="${template.id}" title="Clone Template">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn-small template-delete" data-template-id="${template.id}" title="Delete Template">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `
      )
      .join("");

    // Add event listeners for template actions
    listContainer.querySelectorAll(".template-apply").forEach((btn) => {
      this.addEventListener(btn, "click", (e) => {
        const templateId = e.target.closest("[data-template-id]").dataset.templateId;
        this.applyTemplate(templateId);
      });
    });

    listContainer.querySelectorAll(".template-edit").forEach((btn) => {
      this.addEventListener(btn, "click", (e) => {
        const templateId = e.target.closest("[data-template-id]").dataset.templateId;
        this.editTemplate(templateId);
      });
    });

    listContainer.querySelectorAll(".template-clone").forEach((btn) => {
      this.addEventListener(btn, "click", (e) => {
        const templateId = e.target.closest("[data-template-id]").dataset.templateId;
        this.cloneTemplate(templateId);
      });
    });

    listContainer.querySelectorAll(".template-delete").forEach((btn) => {
      this.addEventListener(btn, "click", (e) => {
        const templateId = e.target.closest("[data-template-id]").dataset.templateId;
        this.deleteTemplate(templateId);
      });
    });
  }

  /**
   * Save current settings as template
   */
  async saveAsTemplate(name, description = "") {
    if (!this.templateManager) {
      throw new Error("Template manager not initialized");
    }

    const settings = {
      mode: "simple",
      separators: {
        row: this.getSeparatorValue(),
        column: ",",
      },
      quoting: {
        type: this.conversionSettings.quoteType,
        escape: "double",
      },
      transformation: {
        trim: this.conversionSettings.trimWhitespace,
        rules: [],
      },
      // Store simple-specific settings
      simpleSettings: { ...this.conversionSettings },
    };

    const template = await this.templateManager.createTemplate(name, settings, {
      description,
      category: "user",
      tags: ["simple", "user-created"],
    });

    return template;
  }

  /**
   * Apply template to current settings
   */
  async applyTemplate(templateId) {
    if (!this.templateManager) return;

    try {
      const template = this.templateManager.getTemplate(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      // Apply simple-specific settings if available
      if (template.settings.simpleSettings) {
        Object.assign(this.conversionSettings, template.settings.simpleSettings);
      } else {
        // Fallback to converting from general settings
        this.conversionSettings.quoteType = template.settings.quoting?.type || "double";
        this.conversionSettings.trimWhitespace = template.settings.transformation?.trim !== false;

        // Convert separator
        const rowSep = template.settings.separators?.row || "\n";
        const separatorMap = { "\n": "newline", ",": "comma", " ": "space", "\t": "tab" };
        this.conversionSettings.separator = separatorMap[rowSep] || "custom";
        if (this.conversionSettings.separator === "custom") {
          this.conversionSettings.customSeparator = rowSep;
        }
      }

      // Update UI
      this.updateSettingsUI();

      // Re-process if there's input
      if (this.inputElement && this.inputElement.value) {
        await this.processConversion();
      }

      // Store current template reference
      this.currentTemplate = template;

      this.showSuccess(`Template "${template.name}" applied`);
      this.toggleTemplatePanel(false);
    } catch (error) {
      this.showError(`Failed to apply template: ${error.message}`);
    }
  }

  /**
   * Show save template dialog
   */
  async showSaveTemplateDialog() {
    const name = prompt("Enter template name:");
    if (!name || !name.trim()) return;

    const description = prompt("Enter template description (optional):") || "";

    try {
      await this.saveAsTemplate(name.trim(), description.trim());
      this.showSuccess(`Template "${name}" saved successfully`);
      this.loadTemplateList();
    } catch (error) {
      this.showError(`Failed to save template: ${error.message}`);
    }
  }

  /**
   * Show import template dialog
   */
  async showImportTemplateDialog() {
    // Create file input for template import
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.style.display = "none";

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const templateData = JSON.parse(text);

        const template = await this.templateManager.importTemplate(templateData);

        this.showSuccess(`Template "${template.name}" imported successfully`);
        this.loadTemplateList();
      } catch (error) {
        this.showError(`Failed to import template: ${error.message}`);
      }

      // Cleanup
      document.body.removeChild(fileInput);
    };

    document.body.appendChild(fileInput);
    fileInput.click();
  }

  /**
   * Filter templates based on search and category
   */
  async filterTemplates(searchQuery = null, category = null) {
    if (!this.templateManager) return;

    const currentSearch = searchQuery !== null ? searchQuery : document.querySelector("#template-search")?.value || "";
    const currentCategory = category !== null ? category : document.querySelector("#template-category")?.value || "";

    try {
      const templates = this.templateManager.searchTemplates(currentSearch, {
        mode: "simple",
        category: currentCategory || null,
        sortBy: "modified",
        sortOrder: "desc",
      });

      this.displayTemplates(templates);
    } catch (error) {
      console.error("Failed to filter templates:", error);
    }
  }

  /**
   * Edit template
   */
  async editTemplate(templateId) {
    if (!this.templateManager) return;

    try {
      const template = this.templateManager.getTemplate(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const newName = prompt("Enter new template name:", template.name);
      if (!newName || newName.trim() === "") return;

      const newDescription = prompt("Enter new description:", template.description || "");

      await this.templateManager.updateTemplate(templateId, {
        name: newName.trim(),
        description: newDescription || "",
      });

      this.showSuccess(`Template "${newName}" updated`);
      this.loadTemplateList();
    } catch (error) {
      this.showError(`Failed to edit template: ${error.message}`);
    }
  }

  /**
   * Clone template
   */
  async cloneTemplate(templateId) {
    if (!this.templateManager) return;

    try {
      const template = this.templateManager.getTemplate(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const newName = prompt("Enter name for cloned template:", `${template.name} (Copy)`);
      if (!newName || newName.trim() === "") return;

      const clonedTemplate = await this.templateManager.cloneTemplate(templateId, newName.trim());

      this.showSuccess(`Template cloned as "${clonedTemplate.name}"`);
      this.loadTemplateList();
    } catch (error) {
      this.showError(`Failed to clone template: ${error.message}`);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    if (!this.templateManager) return;

    try {
      const template = this.templateManager.getTemplate(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) {
        return;
      }

      await this.templateManager.deleteTemplate(templateId);

      this.showSuccess(`Template "${template.name}" deleted`);
      this.loadTemplateList();
    } catch (error) {
      this.showError(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Cancel any ongoing operations
    this.cancelProcessing();

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }

    // Save settings before destruction
    this.saveSettings().catch(console.error);

    // Cleanup template manager
    if (this.templateManager) {
      this.templateManager.destroy().catch(console.error);
    }

    // Call parent cleanup
    super.destroy();
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error(`SimpleTab Error: ${message}`);
    this.updateStatus(`Error: ${message}`);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    console.log(`SimpleTab Success: ${message}`);
    this.updateStatus(message);
  }

  /**
   * Toggle template panel
   */
  toggleTemplatePanel(show = null) {
    if (!this.templatePanel) return;

    const isVisible = show !== null ? show : this.templatePanel.classList.contains("collapsed");

    if (isVisible) {
      this.templatePanel.classList.remove("collapsed");
    } else {
      this.templatePanel.classList.add("collapsed");
    }
  }

  /**
   * Show save template dialog
   */
  showSaveTemplateDialog() {
    const name = prompt("Enter template name:");
    if (name) {
      this.saveTemplate(name);
    }
  }

  /**
   * Show import template dialog
   */
  showImportTemplateDialog() {
    // Simple implementation - could be enhanced with file picker
    alert("Import template functionality coming soon!");
  }

  /**
   * Save current settings as template
   */
  async saveTemplate(name) {
    try {
      console.log("💾 Saving template:", name);
      const template = {
        name,
        settings: { ...this.conversionSettings },
        created: new Date().toISOString(),
      };

      console.log("Template data:", template);

      // Save to storage (simplified)
      if (typeof chrome !== "undefined" && chrome.storage) {
        console.log("Using Chrome storage for template");
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(["templates"], resolve);
        });

        const templates = result.templates || [];
        templates.push(template);

        await new Promise((resolve, reject) => {
          chrome.storage.sync.set({ templates }, () => {
            if (chrome.runtime.lastError) {
              console.error("Chrome storage error:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log("✅ Template saved to Chrome storage");
              resolve();
            }
          });
        });
      } else {
        console.warn("Chrome storage not available, template not saved");
      }

      this.showSuccess(`Template "${name}" saved`);
    } catch (error) {
      this.showError(`Failed to save template: ${error.message}`);
    }
  }

  /**
   * Filter templates
   */
  filterTemplates(searchTerm = null, category = null) {
    // Simple implementation - could be enhanced
    console.log("Filtering templates:", { searchTerm, category });
  }
}
