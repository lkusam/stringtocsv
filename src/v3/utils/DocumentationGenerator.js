/**
 * DocumentationGenerator - Generates user documentation and help system
 * Creates interactive help content and user guides
 */

export class DocumentationGenerator {
  constructor(options = {}) {
    this.version = options.version || "3.0.0";
    this.features = new Map();
    this.shortcuts = new Map();
    this.tutorials = new Map();

    this.setupDefaultContent();
  }

  /**
   * Setup default documentation content
   */
  setupDefaultContent() {
    // Add feature documentation
    this.addFeature("simple-mode", {
      title: "Simple Mode",
      description: "Convert single-line delimited text to CSV format",
      usage: "Paste your text data and select the appropriate separator",
      examples: [
        {
          input: "apple,banana,cherry",
          output: '"apple","banana","cherry"',
          description: "Comma-separated values",
        },
        {
          input: "line1\nline2\nline3",
          output: '"line1"\n"line2"\n"line3"',
          description: "Newline-separated values",
        },
      ],
    });

    this.addFeature("multi-column", {
      title: "Multi-Column Mode",
      description: "Process tabular data with configurable row and column separators",
      usage: "Configure separators and preview the parsed data before conversion",
      examples: [
        {
          input: "Name\tAge\tCity\nJohn\t25\tNew York\nJane\t30\tLondon",
          output: '"Name","Age","City"\n"John","25","New York"\n"Jane","30","London"',
          description: "Tab-separated tabular data",
        },
      ],
    });

    this.addFeature("batch-processing", {
      title: "Batch Processing",
      description: "Process multiple files or data sources simultaneously",
      usage: "Upload files or add multiple data sources to the batch queue",
      examples: [
        {
          description: "Upload multiple CSV files for batch conversion",
        },
      ],
    });

    // Add keyboard shortcuts
    this.addShortcut("Ctrl+N", "Start new conversion");
    this.addShortcut("Ctrl+O", "Open file");
    this.addShortcut("Ctrl+S", "Save result");
    this.addShortcut("Ctrl+C", "Copy result");
    this.addShortcut("Ctrl+1", "Switch to Simple tab");
    this.addShortcut("Ctrl+2", "Switch to Multi-Column tab");
    this.addShortcut("Ctrl+3", "Switch to Batch tab");
    this.addShortcut("F5", "Process data");
    this.addShortcut("Alt+H", "Show help");
    this.addShortcut("Alt+T", "Toggle theme");
    this.addShortcut("Alt+C", "Toggle high contrast");

    // Add tutorials
    this.addTutorial("getting-started", {
      title: "Getting Started",
      steps: ["Open the String to CSV Converter extension", "Choose your processing mode (Simple, Multi-Column, or Batch)", "Paste or upload your data", "Configure conversion settings", "Click Process to convert your data", "Copy or save the results"],
    });

    this.addTutorial("accessibility", {
      title: "Accessibility Features",
      steps: ["Use Tab to navigate between elements", "Press Alt+H to show keyboard shortcuts", "Use Alt+T to toggle between themes", "Enable high contrast mode with Alt+C", "All features work with screen readers", "Customize keyboard shortcuts in settings"],
    });
  }

  /**
   * Add feature documentation
   * @param {string} id - Feature ID
   * @param {Object} feature - Feature documentation
   */
  addFeature(id, feature) {
    this.features.set(id, {
      id,
      title: feature.title,
      description: feature.description,
      usage: feature.usage,
      examples: feature.examples || [],
      ...feature,
    });
  }

  /**
   * Add keyboard shortcut documentation
   * @param {string} shortcut - Keyboard shortcut
   * @param {string} description - Shortcut description
   */
  addShortcut(shortcut, description) {
    this.shortcuts.set(shortcut, description);
  }

  /**
   * Add tutorial
   * @param {string} id - Tutorial ID
   * @param {Object} tutorial - Tutorial content
   */
  addTutorial(id, tutorial) {
    this.tutorials.set(id, {
      id,
      title: tutorial.title,
      steps: tutorial.steps,
      ...tutorial,
    });
  }

  /**
   * Generate help dialog HTML
   * @returns {string} Help dialog HTML
   */
  generateHelpDialog() {
    const features = Array.from(this.features.values());
    const shortcuts = Array.from(this.shortcuts.entries());
    const tutorials = Array.from(this.tutorials.values());

    return `
      <div class="help-dialog" role="dialog" aria-labelledby="help-title" aria-modal="true">
        <div class="help-content">
          <header class="help-header">
            <h2 id="help-title">String to CSV Converter v${this.version} - Help</h2>
            <button class="help-close" aria-label="Close help dialog">&times;</button>
          </header>
          
          <nav class="help-nav" role="tablist">
            <button class="help-tab active" role="tab" aria-selected="true" data-tab="features">Features</button>
            <button class="help-tab" role="tab" aria-selected="false" data-tab="shortcuts">Shortcuts</button>
            <button class="help-tab" role="tab" aria-selected="false" data-tab="tutorials">Tutorials</button>
            <button class="help-tab" role="tab" aria-selected="false" data-tab="accessibility">Accessibility</button>
          </nav>
          
          <main class="help-main">
            <section id="features-panel" class="help-panel active" role="tabpanel" aria-labelledby="features-tab">
              <h3>Features</h3>
              ${features
                .map(
                  (feature) => `
                <article class="feature-doc">
                  <h4>${feature.title}</h4>
                  <p>${feature.description}</p>
                  <div class="feature-usage">
                    <strong>Usage:</strong> ${feature.usage}
                  </div>
                  ${
                    feature.examples.length > 0
                      ? `
                    <div class="feature-examples">
                      <strong>Examples:</strong>
                      ${feature.examples
                        .map(
                          (example) => `
                        <div class="example">
                          <p>${example.description}</p>
                          ${example.input ? `<div class="example-input"><strong>Input:</strong><br><code>${this.escapeHtml(example.input)}</code></div>` : ""}
                          ${example.output ? `<div class="example-output"><strong>Output:</strong><br><code>${this.escapeHtml(example.output)}</code></div>` : ""}
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  `
                      : ""
                  }
                </article>
              `
                )
                .join("")}
            </section>
            
            <section id="shortcuts-panel" class="help-panel" role="tabpanel" aria-labelledby="shortcuts-tab">
              <h3>Keyboard Shortcuts</h3>
              <div class="shortcuts-grid">
                ${shortcuts
                  .map(
                    ([shortcut, description]) => `
                  <div class="shortcut-item">
                    <kbd>${shortcut.replace(/\+/g, "</kbd> + <kbd>")}</kbd>
                    <span>${description}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </section>
            
            <section id="tutorials-panel" class="help-panel" role="tabpanel" aria-labelledby="tutorials-tab">
              <h3>Tutorials</h3>
              ${tutorials
                .map(
                  (tutorial) => `
                <article class="tutorial">
                  <h4>${tutorial.title}</h4>
                  <ol class="tutorial-steps">
                    ${tutorial.steps.map((step) => `<li>${step}</li>`).join("")}
                  </ol>
                </article>
              `
                )
                .join("")}
            </section>
            
            <section id="accessibility-panel" class="help-panel" role="tabpanel" aria-labelledby="accessibility-tab">
              <h3>Accessibility Features</h3>
              <div class="accessibility-info">
                <h4>Keyboard Navigation</h4>
                <ul>
                  <li>Use Tab to move forward through interactive elements</li>
                  <li>Use Shift+Tab to move backward</li>
                  <li>Use Enter or Space to activate buttons</li>
                  <li>Use Escape to close dialogs</li>
                </ul>
                
                <h4>Screen Reader Support</h4>
                <ul>
                  <li>All interactive elements have proper labels</li>
                  <li>Status changes are announced automatically</li>
                  <li>Progress updates are provided during processing</li>
                  <li>Error messages are clearly identified</li>
                </ul>
                
                <h4>Visual Accessibility</h4>
                <ul>
                  <li>High contrast themes available (Alt+C)</li>
                  <li>Adjustable font sizes in settings</li>
                  <li>Clear focus indicators</li>
                  <li>Reduced motion options</li>
                </ul>
                
                <h4>Customization</h4>
                <ul>
                  <li>Customizable keyboard shortcuts</li>
                  <li>Multiple theme options</li>
                  <li>Adjustable interface density</li>
                  <li>Persistent user preferences</li>
                </ul>
              </div>
            </section>
          </main>
          
          <footer class="help-footer">
            <p>Version ${this.version} | <a href="#" onclick="this.dispatchEvent(new CustomEvent('show-about'))">About</a></p>
          </footer>
        </div>
      </div>
    `;
  }

  /**
   * Generate quick start guide
   * @returns {string} Quick start HTML
   */
  generateQuickStart() {
    return `
      <div class="quick-start">
        <h3>Quick Start Guide</h3>
        <div class="quick-start-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h4>Choose Mode</h4>
              <p>Select Simple for basic conversion, Multi-Column for tabular data, or Batch for multiple files</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h4>Add Data</h4>
              <p>Paste text, upload files, or import from URLs</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h4>Configure</h4>
              <p>Set separators, quote types, and other options</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h4>Process</h4>
              <p>Click Process or press F5 to convert your data</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">5</div>
            <div class="step-content">
              <h4>Export</h4>
              <p>Copy results or save to file in your preferred format</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate troubleshooting guide
   * @returns {string} Troubleshooting HTML
   */
  generateTroubleshooting() {
    const commonIssues = [
      {
        problem: "Data not converting correctly",
        solutions: ["Check that the correct separator is selected", "Verify quote type settings match your data", "Use Multi-Column mode for tabular data", "Check for hidden characters or encoding issues"],
      },
      {
        problem: "Large files processing slowly",
        solutions: ["Use Batch mode for multiple files", "Enable streaming processing in settings", "Break large files into smaller chunks", "Close other browser tabs to free memory"],
      },
      {
        problem: "Keyboard shortcuts not working",
        solutions: ["Make sure the extension popup is focused", "Check for conflicts with browser shortcuts", "Customize shortcuts in accessibility settings", "Try using the mouse to access features"],
      },
      {
        problem: "Accessibility issues",
        solutions: ["Enable high contrast mode (Alt+C)", "Adjust font size in settings", "Use keyboard navigation (Tab/Shift+Tab)", "Enable screen reader announcements"],
      },
    ];

    return `
      <div class="troubleshooting">
        <h3>Troubleshooting</h3>
        <div class="issues-list">
          ${commonIssues
            .map(
              (issue) => `
            <div class="issue">
              <h4>${issue.problem}</h4>
              <ul class="solutions">
                ${issue.solutions.map((solution) => `<li>${solution}</li>`).join("")}
              </ul>
            </div>
          `
            )
            .join("")}
        </div>
        
        <div class="support-info">
          <h4>Still Need Help?</h4>
          <p>If you're still experiencing issues:</p>
          <ul>
            <li>Check the browser console for error messages</li>
            <li>Try refreshing the extension</li>
            <li>Restart your browser</li>
            <li>Report issues through the Chrome Web Store</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Generate about dialog
   * @returns {string} About dialog HTML
   */
  generateAboutDialog() {
    return `
      <div class="about-dialog" role="dialog" aria-labelledby="about-title" aria-modal="true">
        <div class="about-content">
          <header class="about-header">
            <h2 id="about-title">About String to CSV Converter</h2>
            <button class="about-close" aria-label="Close about dialog">&times;</button>
          </header>
          
          <main class="about-main">
            <div class="about-info">
              <h3>Version ${this.version}</h3>
              <p>A powerful, accessible data processing tool for converting various text formats to CSV.</p>
              
              <h4>Features</h4>
              <ul>
                <li>Multiple processing modes (Simple, Multi-Column, Batch)</li>
                <li>Advanced data transformation and validation</li>
                <li>Full accessibility support (WCAG 2.1 AA compliant)</li>
                <li>Customizable keyboard shortcuts</li>
                <li>High contrast and dark themes</li>
                <li>Template system for reusable configurations</li>
                <li>Performance optimized for large datasets</li>
              </ul>
              
              <h4>Privacy</h4>
              <p>All data processing happens locally in your browser. No data is sent to external servers.</p>
              
              <h4>Open Source</h4>
              <p>This extension is built with modern web technologies and follows accessibility best practices.</p>
            </div>
          </main>
          
          <footer class="about-footer">
            <p>&copy; 2024 String to CSV Converter v3. All rights reserved.</p>
          </footer>
        </div>
      </div>
    `;
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
   * Generate complete documentation package
   * @returns {Object} Documentation package
   */
  generateDocumentation() {
    return {
      helpDialog: this.generateHelpDialog(),
      quickStart: this.generateQuickStart(),
      troubleshooting: this.generateTroubleshooting(),
      aboutDialog: this.generateAboutDialog(),
      features: Array.from(this.features.values()),
      shortcuts: Array.from(this.shortcuts.entries()),
      tutorials: Array.from(this.tutorials.values()),
    };
  }
}
