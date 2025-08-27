/**
 * Main entry point for Chrome Extension v3
 * Initializes the application and sets up the core architecture
 */

import { TabManager } from "./managers/TabManager.js";
import { WorkerPoolManager } from "./workers/WorkerPoolManager.js";
import { AppSettings } from "./core/interfaces.js";
import { AccessibilityManager } from "./utils/AccessibilityManager.js";
import { StartupOptimizer } from "./utils/StartupOptimizer.js";
import { PerformanceMonitor } from "./utils/PerformanceMonitor.js";
import { MemoryManager } from "./utils/MemoryManager.js";
import { LazyLoader } from "./utils/LazyLoader.js";
import { SettingsMigration } from "./utils/SettingsMigration.js";
import { ApplicationSettings } from "./components/ApplicationSettings.js";

// Import tab components (with fallbacks for testing)
let SimpleTab, MultiColumnTab, BatchTab;
let MainInterface, ExportPanel, ValidationPanel, TemplateLibrary;

try {
  const simpleTabModule = await import("./tabs/SimpleTab.js");
  SimpleTab = simpleTabModule.SimpleTab;
  console.log("SimpleTab imported successfully");
} catch (e) {
  console.error("SimpleTab import failed:", e);
  console.warn("SimpleTab not available, using mock");
  SimpleTab = class MockSimpleTab {
    constructor() {
      this.id = "simple";
    }
    initialize() {
      return Promise.resolve();
    }
    activate() {
      return Promise.resolve();
    }
    deactivate() {
      return Promise.resolve();
    }
    destroy() {}
  };
}

try {
  const multiColumnTabModule = await import("./tabs/MultiColumnTab.js");
  MultiColumnTab = multiColumnTabModule.MultiColumnTab;
} catch (e) {
  console.warn("MultiColumnTab not available, using mock");
  MultiColumnTab = class MockMultiColumnTab {
    constructor() {
      this.id = "multi-column";
    }
    initialize() {
      return Promise.resolve();
    }
    activate() {
      return Promise.resolve();
    }
    deactivate() {
      return Promise.resolve();
    }
    destroy() {}
  };
}

try {
  const batchTabModule = await import("./tabs/BatchTab.js");
  BatchTab = batchTabModule.BatchTab;
} catch (e) {
  console.warn("BatchTab not available, using mock");
  BatchTab = class MockBatchTab {
    constructor() {
      this.id = "batch";
    }
    initialize() {
      return Promise.resolve();
    }
    activate() {
      return Promise.resolve();
    }
    deactivate() {
      return Promise.resolve();
    }
    destroy() {}
  };
}

try {
  const mainInterfaceModule = await import("./components/MainInterface.js");
  MainInterface = mainInterfaceModule.MainInterface;
} catch (e) {
  console.warn("MainInterface not available, using mock");
  MainInterface = class MockMainInterface {
    constructor() {}
    initialize() {
      return Promise.resolve();
    }
    destroy() {}
  };
}

/**
 * Main Application class for Chrome Extension v3
 */
export class ChromeExtensionV3 {
  constructor() {
    this.tabManager = null;
    this.workerPool = null;
    this.settings = null;
    this.accessibilityManager = null;
    this.startupOptimizer = null;
    this.performanceMonitor = null;
    this.memoryManager = null;
    this.lazyLoader = null;
    this.mainInterface = null;
    this.applicationSettings = null;
    this.isInitialized = false;
    this.version = "3.0.0";

    // Performance tracking
    this.startTime = performance.now();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("Application already initialized");
      return;
    }

    try {
      console.log(`🚀 Initializing Chrome Extension v${this.version}...`);

      // Mark startup phases
      this.startupOptimizer = new StartupOptimizer({
        targetStartupTime: 200,
        onStartupComplete: (data) => {
          console.log("Startup completed:", data);
          this.hideLoadingScreen();
        },
      });

      this.startupOptimizer.markPhaseStart("initialization");

      // Initialize performance monitoring
      this.performanceMonitor = new PerformanceMonitor({
        onPerformanceAlert: (alert) => console.warn("Performance alert:", alert),
        onOptimizationSuggestion: (suggestion) => console.log("Optimization suggestion:", suggestion),
      });

      // Initialize memory management
      this.memoryManager = new MemoryManager({
        maxMemoryUsage: 50 * 1024 * 1024, // 50MB
        onMemoryWarning: (warning) => console.warn("Memory warning:", warning),
      });

      // Initialize lazy loader
      this.lazyLoader = new LazyLoader({
        preloadDelay: 100,
        onComponentLoad: (name, component) => console.log(`Component loaded: ${name}`),
      });

      // Load settings
      console.log("📋 Loading settings...");
      await this.loadSettings();
      this.startupOptimizer.markPhaseEnd("initialization");

      // Initialize core systems
      console.log("⚙️ Initializing core systems...");
      this.startupOptimizer.markPhaseStart("core-systems");
      await this.initializeWorkerPool();
      await this.initializeTabManager();
      await this.initializeAccessibility();
      this.startupOptimizer.markPhaseEnd("core-systems");

      // Setup UI
      console.log("🎨 Setting up UI...");
      this.startupOptimizer.markPhaseStart("ui-setup");
      await this.setupMainInterface();
      await this.setupApplicationSettings();
      await this.registerComponents();
      await this.registerTabs();
      this.startupOptimizer.markPhaseEnd("ui-setup");

      // Activate default tab
      console.log("🎯 Activating default tab...");
      this.startupOptimizer.markPhaseStart("activation");
      const defaultTab = this.settings.ui.activeTab || "simple";
      console.log(`Attempting to switch to tab: ${defaultTab}`);
      console.log(`Available tabs:`, Array.from(this.tabManager.tabs.keys()));
      await this.tabManager.switchTab(defaultTab);
      console.log("✅ Tab switch completed");
      this.startupOptimizer.markPhaseEnd("activation");

      this.isInitialized = true;
      console.log("Chrome Extension v3 initialized successfully");

      // Complete startup
      console.log("🏁 Completing startup...");
      this.startupOptimizer.completeStartup();
      console.log("✅ Startup completed");

      // Ensure loading screen is hidden
      this.hideLoadingScreen();

      // Emit initialization complete event
      console.log("📡 Emitting initialized event...");
      this.emit("initialized");
      console.log("✅ Initialized event emitted");
    } catch (error) {
      console.error("Failed to initialize Chrome Extension v3:", error);
      this.showErrorBoundary(error);
      throw error;
    }
  }

  /**
   * Load application settings with migration support
   */
  async loadSettings() {
    try {
      let loadedSettings = null;

      // Try to load from Chrome storage
      if (chrome && chrome.storage && chrome.storage.sync) {
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(["settings"], resolve);
        });
        loadedSettings = result.settings;
      }

      if (loadedSettings) {
        // Check if migration is needed
        const migration = new SettingsMigration({
          onMigrationStart: (oldSettings) => console.log("Starting settings migration..."),
          onMigrationComplete: (newSettings, version) => console.log(`Settings migrated from v${version}`),
          onMigrationError: (error) => console.error("Settings migration failed:", error),
          onBackupCreated: (key) => console.log(`Settings backup created: ${key}`),
        });

        if (migration.needsMigration(loadedSettings)) {
          console.log("Settings migration required");
          this.settings = await migration.migrateSettings(loadedSettings);

          // Save migrated settings
          await this.saveSettings();
        } else {
          this.settings = new AppSettings(loadedSettings);
          console.log("Settings loaded from Chrome storage");
        }
      } else {
        this.settings = new AppSettings();
        console.log("Using default settings");
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.settings = new AppSettings();
    }
  }

  /**
   * Save application settings
   */
  async saveSettings() {
    try {
      if (chrome && chrome.storage && chrome.storage.sync) {
        await new Promise((resolve, reject) => {
          chrome.storage.sync.set({ settings: this.settings }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
        console.log("Settings saved to Chrome storage");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  /**
   * Initialize worker pool
   */
  async initializeWorkerPool() {
    const workerCount = this.settings.performance.workerCount;
    this.workerPool = new WorkerPoolManager(workerCount);
    await this.workerPool.initialize();
    console.log(`Worker pool initialized with ${workerCount} workers`);
  }

  /**
   * Initialize tab manager
   */
  async initializeTabManager() {
    const tabNavigation = document.getElementById("tab-navigation");
    const tabPanels = document.getElementById("tab-panels");

    console.log("DOM elements found:", { tabNavigation, tabPanels });

    if (!tabNavigation) {
      throw new Error("tab-navigation element not found");
    }
    if (!tabPanels) {
      throw new Error("tab-panels element not found");
    }

    try {
      this.tabManager = new TabManager({
        enableTabValidation: false,
        onTabSwitch: (fromTab, toTab) => {
          console.log(`Tab switched from ${fromTab} to ${toTab}`);
          this.updateSettings({ ui: { activeTab: toTab } });
        },
      });

      console.log("TabManager created:", this.tabManager);

      if (!this.tabManager) {
        throw new Error("TabManager constructor returned undefined");
      }

      // Initialize with DOM containers
      await this.tabManager.initialize(tabPanels, tabNavigation);
    } catch (error) {
      console.error("Error creating/initializing TabManager:", error);
      throw error;
    }

    console.log("Tab manager initialized");
  }

  /**
   * Initialize accessibility manager
   */
  async initializeAccessibility() {
    this.accessibilityManager = new AccessibilityManager({
      defaultTheme: this.settings.ui.theme || "classic",
      darkMode: this.settings.ui.darkMode || false,
      onSettingsChange: (key, value) => {
        this.updateSettings({ ui: { [key]: value } });
      },
      onShortcutAction: (action, args, event) => {
        this.handleShortcutAction(action, args, event);
      },
    });

    // Initialize the accessibility manager
    this.accessibilityManager.initialize();

    console.log("Accessibility manager initialized");
  }

  /**
   * Setup main interface
   */
  async setupMainInterface() {
    const appContainer = document.getElementById("app");

    this.mainInterface = new MainInterface({
      container: appContainer,
      tabManager: this.tabManager,
      settings: this.settings,
      onSettingsChange: (settings) => this.updateSettings(settings),
    });

    await this.mainInterface.initialize();

    // Setup status bar button handlers
    this.setupStatusBarHandlers();

    console.log("Main interface setup complete");
  }

  /**
   * Setup application settings
   */
  async setupApplicationSettings() {
    this.applicationSettings = new ApplicationSettings(this);
    this.applicationSettings.initialize();
    console.log("Application settings initialized");
  }

  /**
   * Setup status bar button handlers
   */
  setupStatusBarHandlers() {
    const helpButton = document.getElementById("help-button");
    const settingsToggle = document.getElementById("settings-toggle");

    if (helpButton) {
      helpButton.addEventListener("click", () => {
        this.showHelp();
      });
    }

    if (settingsToggle) {
      settingsToggle.addEventListener("click", () => {
        this.toggleSettings();
      });
    }
  }

  /**
   * Show help dialog
   */
  showHelp() {
    // For now, show a simple alert with keyboard shortcuts
    const helpText = `String to CSV Converter - Help

Keyboard Shortcuts:
• Ctrl/Cmd + Enter: Process conversion
• Ctrl/Cmd + S: Save current result
• Ctrl/Cmd + C: Copy result to clipboard
• Tab: Switch between tabs
• Escape: Close panels

Features:
• Simple Tab: Basic text to CSV conversion
• Multi-Column Tab: Advanced tabular data processing
• Batch Tab: Process multiple files at once

Templates:
• Save frequently used settings as templates
• Access templates from the template library
• Share templates with others`;

    alert(helpText);
  }

  /**
   * Toggle settings panel
   */
  toggleSettings() {
    if (this.applicationSettings) {
      this.applicationSettings.toggle();
    } else {
      console.warn("Application settings not initialized");
    }
  }

  /**
   * Register lazy-loaded components
   */
  async registerComponents() {
    // Register side panel components
    this.lazyLoader.registerComponent("export-panel", () => import("./components/ExportPanel.js"), {
      preload: false,
      critical: false,
    });

    this.lazyLoader.registerComponent("validation-panel", () => import("./components/ValidationPanel.js"), {
      preload: false,
      critical: false,
    });

    this.lazyLoader.registerComponent("template-library", () => import("./components/TemplateLibrary.js"), {
      preload: false,
      critical: false,
    });

    console.log("Components registered for lazy loading");
  }

  /**
   * Register tab components
   */
  async registerTabs() {
    // Register Simple tab (critical) - First position
    await this.tabManager.registerTab(
      "simple",
      new SimpleTab({
        workerPool: this.workerPool,
        settings: this.settings,
        memoryManager: this.memoryManager,
      }),
      {
        displayName: "Simple",
        description: "Convert text to CSV with instant results",
        order: 0,
        isEnabled: true,
        isVisible: true,
      }
    );

    // Register Multi-Column tab - Second position
    await this.tabManager.registerTab(
      "multi-column",
      new MultiColumnTab({
        workerPool: this.workerPool,
        settings: this.settings,
        memoryManager: this.memoryManager,
      }),
      {
        displayName: "Multi-Column",
        description: "Advanced multi-column data conversion",
        order: 1,
        isEnabled: true,
        isVisible: true,
      }
    );

    // Register Batch tab - Third position
    await this.tabManager.registerTab(
      "batch",
      new BatchTab({
        workerPool: this.workerPool,
        settings: this.settings,
        memoryManager: this.memoryManager,
      }),
      {
        displayName: "Batch",
        description: "Process multiple files at once",
        order: 2,
        isEnabled: true,
        isVisible: true,
      }
    );

    console.log("Tab components registered");
  }

  /**
   * Handle keyboard shortcut actions
   */
  handleShortcutAction(action, args, event) {
    switch (action) {
      case "newConversion":
        this.clearCurrentTab();
        break;
      case "openFile":
        this.openFileDialog();
        break;
      case "saveResult":
        this.saveCurrentResult();
        break;
      case "copyResult":
        this.copyCurrentResult();
        break;
      case "switchToTab":
        if (args && args[0]) {
          this.switchTab(args[0]);
        }
        break;
      case "processData":
        this.processCurrentData();
        break;
      default:
        console.log(`Unhandled shortcut action: ${action}`);
    }
  }

  /**
   * Hide loading screen and show app
   */
  hideLoadingScreen() {
    console.log("🎭 Hiding loading screen...");
    const loadingScreen = document.getElementById("loading-screen");
    const app = document.getElementById("app");

    console.log("Loading screen element:", loadingScreen ? "✅ Found" : "❌ Missing");
    console.log("App element:", app ? "✅ Found" : "❌ Missing");

    if (loadingScreen) {
      loadingScreen.classList.add("app-hidden");
      console.log("✅ Loading screen hidden");
    }

    if (app) {
      app.classList.remove("app-hidden");
      console.log("✅ App shown");
    }

    console.log("🎭 Loading screen hide complete");
  }

  /**
   * Show error boundary
   */
  showErrorBoundary(error) {
    const app = document.getElementById("app");
    const errorBoundary = document.getElementById("error-boundary");
    const errorMessage = document.getElementById("error-message");
    const loadingScreen = document.getElementById("loading-screen");

    if (app) app.classList.add("app-hidden");
    if (loadingScreen) loadingScreen.classList.add("app-hidden");
    if (errorBoundary) {
      errorBoundary.classList.remove("app-hidden");
      if (errorMessage) {
        errorMessage.textContent = error.message || "An unexpected error occurred.";
      }
    }
  }

  /**
   * Clear current tab data
   */
  clearCurrentTab() {
    const currentTab = this.tabManager?.getCurrentTab();
    if (currentTab && typeof currentTab.clear === "function") {
      currentTab.clear();
    }
  }

  /**
   * Open file dialog
   */
  openFileDialog() {
    const currentTab = this.tabManager?.getCurrentTab();
    if (currentTab && typeof currentTab.openFile === "function") {
      currentTab.openFile();
    }
  }

  /**
   * Save current result
   */
  saveCurrentResult() {
    const currentTab = this.tabManager?.getCurrentTab();
    if (currentTab && typeof currentTab.saveResult === "function") {
      currentTab.saveResult();
    }
  }

  /**
   * Copy current result
   */
  copyCurrentResult() {
    const currentTab = this.tabManager?.getCurrentTab();
    if (currentTab && typeof currentTab.copyResult === "function") {
      currentTab.copyResult();
    }
  }

  /**
   * Process current data
   */
  processCurrentData() {
    const currentTab = this.tabManager?.getCurrentTab();
    if (currentTab && typeof currentTab.process === "function") {
      currentTab.process();
    }
  }

  /**
   * Get application statistics
   */
  getStatistics() {
    return {
      version: this.version,
      isInitialized: this.isInitialized,
      tabManager: this.tabManager ? this.tabManager.getStatistics() : null,
      workerPool: this.workerPool ? this.workerPool.getStatistics() : null,
      settings: {
        theme: this.settings?.ui?.theme,
        darkMode: this.settings?.ui?.darkMode,
        activeTab: this.settings?.ui?.activeTab,
      },
    };
  }

  /**
   * Update application settings
   */
  async updateSettings(newSettings) {
    if (this.settings) {
      // Merge with existing settings
      this.settings = {
        ...this.settings,
        ...newSettings,
        ui: { ...this.settings.ui, ...newSettings.ui },
        processing: { ...this.settings.processing, ...newSettings.processing },
        performance: { ...this.settings.performance, ...newSettings.performance },
      };

      // Save settings
      await this.saveSettings();

      // Apply theme changes immediately
      if (newSettings.ui?.theme) {
        this.applyTheme(newSettings.ui.theme);
      }

      // Emit settings changed event
      this.emit("settingsChanged", newSettings);
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings() {
    this.settings = this.getDefaultSettings();
    await this.saveSettings();
    this.emit("settingsReset");
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      ui: {
        theme: "light",
        highContrast: false,
        activeTab: "simple",
      },
      processing: {
        trimWhitespace: true,
        smartDetection: true,
        defaultSeparator: "newline",
      },
      performance: {
        enableStreaming: true,
        workerCount: 2,
      },
    };
  }

  /**
   * Apply theme to the application
   */
  applyTheme(theme) {
    const body = document.body;

    // Remove existing theme classes
    body.classList.remove("theme-light", "theme-dark", "theme-auto");

    // Apply new theme
    if (theme === "auto") {
      // Use system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      body.classList.add(prefersDark ? "theme-dark" : "theme-light");
    } else {
      body.classList.add(`theme-${theme}`);
    }
  }

  /**
   * Get current settings
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Switch to a specific tab
   */
  async switchTab(tabId) {
    if (this.tabManager) {
      const success = await this.tabManager.switchTab(tabId);
      if (success) {
        // Update settings
        this.updateSettings({
          ui: { activeTab: tabId },
        });
      }
      return success;
    }
    return false;
  }

  /**
   * Process data using the worker pool
   */
  async processData(data, workerType = "conversion", priority = 0) {
    if (!this.workerPool) {
      throw new Error("Worker pool not initialized");
    }

    return await this.workerPool.executeJob(data, workerType, priority);
  }

  /**
   * Event system for application-wide events
   */
  emit(event, data = null) {
    // Simple event emission - can be enhanced later
    console.log(`App Event: ${event}`, data);

    // Dispatch custom event on document
    document.dispatchEvent(
      new CustomEvent(`chromeExtV3:${event}`, {
        detail: data,
      })
    );
  }

  /**
   * Cleanup and destroy the application
   */
  async destroy() {
    console.log("Destroying Chrome Extension v3...");

    try {
      // Save current settings
      await this.saveSettings();

      // Destroy main interface
      if (this.mainInterface) {
        this.mainInterface.destroy();
        this.mainInterface = null;
      }

      // Destroy accessibility manager
      if (this.accessibilityManager) {
        this.accessibilityManager.destroy();
        this.accessibilityManager = null;
      }

      // Destroy performance monitor
      if (this.performanceMonitor) {
        this.performanceMonitor.destroy();
        this.performanceMonitor = null;
      }

      // Destroy memory manager
      if (this.memoryManager) {
        this.memoryManager.destroy();
        this.memoryManager = null;
      }

      // Destroy lazy loader
      if (this.lazyLoader) {
        this.lazyLoader.destroy();
        this.lazyLoader = null;
      }

      // Destroy startup optimizer
      if (this.startupOptimizer) {
        this.startupOptimizer.destroy();
        this.startupOptimizer = null;
      }

      // Destroy tab manager
      if (this.tabManager) {
        this.tabManager.destroy();
        this.tabManager = null;
      }

      // Destroy worker pool
      if (this.workerPool) {
        await this.workerPool.destroy();
        this.workerPool = null;
      }

      // Reset state
      this.settings = null;
      this.isInitialized = false;

      console.log("Chrome Extension v3 destroyed");
    } catch (error) {
      console.error("Error during destruction:", error);
    }
  }
}

// Global instance
let appInstance = null;

/**
 * Get or create the global application instance
 */
export function getApp() {
  if (!appInstance) {
    appInstance = new ChromeExtensionV3();
  }
  return appInstance;
}

/**
 * Initialize the application when DOM is ready
 */
export async function initializeApp() {
  const app = getApp();

  if (document.readyState === "loading") {
    // Wait for DOM to be ready
    await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve);
    });
  }

  await app.initialize();
  return app;
}

// Auto-initialize when DOM is ready
if (typeof window !== "undefined" && window.document) {
  // Mark script loaded
  if (performance.mark) {
    performance.mark("script-loaded");
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initializeApp()
        .then((app) => {
          // Expose app instance for debugging
          window.chromeExtV3App = app;
          console.log("✅ Chrome Extension V3 initialized successfully");
        })
        .catch((error) => {
          console.error("Failed to initialize app:", error);
          window.moduleLoadErrors = window.moduleLoadErrors || [];
          window.moduleLoadErrors.push(error);

          // Show error boundary
          const errorBoundary = document.getElementById("error-boundary");
          const app = document.getElementById("app");
          const loadingScreen = document.getElementById("loading-screen");

          if (app) app.classList.add("app-hidden");
          if (loadingScreen) loadingScreen.classList.add("app-hidden");
          if (errorBoundary) errorBoundary.classList.remove("app-hidden");
        });
    });
  } else {
    // DOM already ready
    initializeApp()
      .then((app) => {
        window.chromeExtV3App = app;
        console.log("✅ Chrome Extension V3 initialized successfully");
      })
      .catch((error) => {
        console.error("Failed to initialize app:", error);
        window.moduleLoadErrors = window.moduleLoadErrors || [];
        window.moduleLoadErrors.push(error);
      });
  }
}
