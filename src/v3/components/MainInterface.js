/**
 * MainInterface - Main interface component for v3
 */

export class MainInterface {
  constructor(options = {}) {
    this.container = options.container;
    this.tabManager = options.tabManager;
    this.settings = options.settings;
    this.onSettingsChange = options.onSettingsChange || (() => {});
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Setup main interface
      this.setupInterface();
      this.isInitialized = true;
      console.log("MainInterface initialized");
    } catch (error) {
      console.error("Failed to initialize MainInterface:", error);
      throw error;
    }
  }

  setupInterface() {
    if (!this.container) {
      return;
    }

    // Add any main interface setup here
    this.container.classList.add("main-interface");
  }

  destroy() {
    this.isInitialized = false;
    console.log("MainInterface destroyed");
  }
}
