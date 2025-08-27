/**
 * TabManager - Central controller for tab switching and state management
 * Manages the multi-tab interface and coordinates between different processing modes
 */

export class TabManager {
  constructor(options = {}) {
    this.tabs = new Map();
    this.activeTabId = null;
    this.tabContainer = null;
    this.tabNavigation = null;
    this.eventListeners = new Map();
    this.globalState = {};

    // Enhanced configuration options
    this.options = {
      enableKeyboardNavigation: options.enableKeyboardNavigation !== false,
      enableTabHistory: options.enableTabHistory !== false,
      maxHistorySize: options.maxHistorySize || 10,
      enableStateSync: options.enableStateSync !== false,
      enableTabValidation: options.enableTabValidation !== false,
      animationDuration: options.animationDuration || 200,
      ...options,
    };

    // Enhanced state management
    this.tabHistory = [];
    this.tabStates = new Map();
    this.tabMetadata = new Map();
    this.isInitialized = false;
    this.isTransitioning = false;

    // Performance monitoring
    this.performanceMetrics = {
      tabSwitches: 0,
      averageSwitchTime: 0,
      totalSwitchTime: 0,
      errors: 0,
    };

    // Bind methods for event listeners
    this.handleKeyboardNavigation = this.handleKeyboardNavigation.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initialize the tab manager with DOM containers and enhanced features
   */
  initialize(tabContainer, tabNavigation) {
    if (this.isInitialized) {
      console.warn("TabManager is already initialized");
      return this;
    }

    try {
      // Validate DOM containers
      if (!tabContainer || !tabNavigation) {
        throw new Error("Both tabContainer and tabNavigation are required");
      }

      this.tabContainer = tabContainer;
      this.tabNavigation = tabNavigation;

      // Setup enhanced navigation
      this.setupTabNavigation();
      this.setupKeyboardNavigation();
      this.setupVisibilityHandling();
      this.setupAccessibility();

      // Initialize state management
      this.initializeStateManagement();

      this.isInitialized = true;
      this.emit("initialized", { tabManager: this });

      console.log("TabManager initialized successfully");
      return this;
    } catch (error) {
      console.error("Failed to initialize TabManager:", error);
      throw error;
    }
  }

  /**
   * Register a new tab component with enhanced validation and metadata
   */
  async registerTab(tabId, tabComponent, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error("TabManager must be initialized before registering tabs");
    }

    if (this.tabs.has(tabId)) {
      throw new Error(`Tab with ID '${tabId}' is already registered`);
    }

    if (!tabComponent || typeof tabComponent !== "object") {
      throw new Error("Tab component must be a valid object");
    }

    try {
      const startTime = performance.now();

      // Validate tab component interface
      if (this.options.enableTabValidation) {
        this.validateTabComponent(tabComponent);
      }

      // Initialize the tab component
      if (!tabComponent.isInitialized) {
        try {
          await tabComponent.initialize();
          tabComponent.isInitialized = true;
        } catch (initError) {
          console.error(`Failed to initialize tab component '${tabId}':`, initError);
          // Continue with registration even if initialization fails
          tabComponent.isInitialized = false;
        }
      }

      // Store tab metadata
      this.tabMetadata.set(tabId, {
        displayName: metadata.displayName || this.getTabDisplayName(tabId),
        description: metadata.description || "",
        icon: metadata.icon || null,
        order: metadata.order || this.tabs.size,
        isEnabled: metadata.isEnabled !== false,
        isVisible: metadata.isVisible !== false,
        requiredPermissions: metadata.requiredPermissions || [],
        registeredAt: new Date(),
        ...metadata,
      });

      // Initialize tab state
      this.tabStates.set(tabId, {
        isActive: false,
        lastActivated: null,
        activationCount: 0,
        errors: [],
        warnings: [],
      });

      // Store the tab
      this.tabs.set(tabId, tabComponent);

      // Set the tabManager reference on the component
      tabComponent.tabManager = this;

      console.log(`Tab '${tabId}' stored successfully. Has getElement: ${typeof tabComponent.getElement === "function"}`);

      // Create navigation button
      this.createTabButton(tabId, tabComponent);

      // Update tab order
      this.updateTabOrder();

      const registrationTime = performance.now() - startTime;
      console.log(`Tab '${tabId}' registered successfully in ${registrationTime.toFixed(2)}ms`);

      this.emit("tabRegistered", {
        tabId,
        metadata: this.tabMetadata.get(tabId),
        registrationTime,
      });

      return true;
    } catch (error) {
      console.error(`Failed to register tab '${tabId}':`, error);
      this.performanceMetrics.errors++;
      throw error;
    }
  }

  /**
   * Validate tab component interface
   */
  validateTabComponent(tabComponent) {
    const requiredMethods = ["initialize", "activate", "deactivate", "getElement"];
    const missingMethods = requiredMethods.filter((method) => typeof tabComponent[method] !== "function");

    if (missingMethods.length > 0) {
      console.warn(`Tab component missing methods: ${missingMethods.join(", ")}. Adding fallbacks.`);

      // Add fallback methods
      missingMethods.forEach((method) => {
        if (method === "initialize") {
          tabComponent.initialize = async () => {
            console.log(`${tabComponent.tabId || "Unknown"} initialized (fallback)`);
          };
        } else if (method === "activate") {
          tabComponent.activate = async () => {
            console.log(`${tabComponent.tabId || "Unknown"} activated (fallback)`);
          };
        } else if (method === "deactivate") {
          tabComponent.deactivate = async () => {
            console.log(`${tabComponent.tabId || "Unknown"} deactivated (fallback)`);
          };
        } else if (method === "getElement") {
          tabComponent.getElement = () => {
            const div = document.createElement("div");
            div.className = `${tabComponent.tabId || "unknown"}-tab-fallback`;
            div.innerHTML = `
              <div style="padding: 20px; text-align: center;">
                <h3>${this.getTabDisplayName(tabComponent.tabId || "unknown")}</h3>
                <p>This tab is loading or not fully implemented yet.</p>
                <p style="color: #666; font-size: 0.9em;">Tab ID: ${tabComponent.tabId || "unknown"}</p>
              </div>
            `;
            return div;
          };
        }
      });
    }

    return true;
  }

  /**
   * Unregister a tab component
   */
  unregisterTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      console.warn(`Tab '${tabId}' not found for unregistration`);
      return false;
    }

    try {
      // Deactivate if currently active
      if (this.activeTabId === tabId) {
        this.switchTab(this.getFirstAvailableTab());
      }

      // Cleanup tab
      tab.destroy();
      this.tabs.delete(tabId);

      // Remove navigation button
      this.removeTabButton(tabId);

      console.log(`Tab '${tabId}' unregistered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to unregister tab '${tabId}':`, error);
      return false;
    }
  }

  /**
   * Switch to a specific tab
   */
  async switchTab(tabId, options = {}) {
    if (!this.isInitialized) {
      throw new Error("TabManager not initialized");
    }

    if (!tabId || !this.tabs.has(tabId)) {
      console.error(`Cannot switch to tab '${tabId}' - tab not found`);
      return false;
    }

    if (this.activeTabId === tabId && !options.force) {
      console.log(`Tab '${tabId}' is already active`);
      return true;
    }

    if (this.isTransitioning) {
      console.warn("Tab switch already in progress");
      return false;
    }

    // Check if tab is enabled
    const metadata = this.tabMetadata.get(tabId);
    if (metadata && !metadata.isEnabled) {
      console.warn(`Cannot switch to disabled tab '${tabId}'`);
      return false;
    }

    const startTime = performance.now();
    this.isTransitioning = true;

    try {
      const previousTabId = this.activeTabId;
      const currentTab = previousTabId ? this.tabs.get(previousTabId) : null;
      const newTab = this.tabs.get(tabId);

      // Emit before switch event
      this.emit("beforeTabSwitch", {
        from: previousTabId,
        to: tabId,
        options,
      });

      // Deactivate current tab
      if (currentTab && previousTabId) {
        try {
          await this.deactivateTab(previousTabId, currentTab);
        } catch (error) {
          console.error(`Error deactivating tab '${previousTabId}':`, error);
          // Continue with activation even if deactivation fails
        }
      }

      // Activate new tab
      await this.activateTab(tabId, newTab);

      // Show tab content
      this.showTabContent(tabId);

      // Update state and history
      this.updateTabState(tabId, previousTabId);
      this.updateTabHistory(tabId);

      // Update navigation UI
      this.updateTabNavigation(tabId, previousTabId);

      // Performance tracking
      const switchTime = performance.now() - startTime;
      this.updatePerformanceMetrics(switchTime);

      // Broadcast tab change event
      this.broadcastEvent("tabChanged", {
        activeTab: tabId,
        previousTab: previousTabId,
        switchTime: switchTime,
      });

      console.log(`Switched to tab '${tabId}' in ${switchTime.toFixed(2)}ms`);
      return true;
    } catch (error) {
      console.error(`Failed to switch to tab '${tabId}':`, error);
      this.performanceMetrics.errors++;

      // Emit error event
      this.emit("tabSwitchError", {
        tabId,
        error: error.message,
        previousTab: this.activeTabId,
      });

      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Get the currently active tab
   */
  getCurrentTab() {
    return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
  }

  /**
   * Get tab by ID
   */
  getTab(tabId) {
    return this.tabs.get(tabId);
  }

  /**
   * Get all registered tabs
   */
  getAllTabs() {
    return Array.from(this.tabs.values());
  }

  /**
   * Get all tab IDs
   */
  getTabIds() {
    return Array.from(this.tabs.keys());
  }

  /**
   * Broadcast event to all tabs (except sender)
   */
  broadcastEvent(event, data, senderTabId = null) {
    for (const [tabId, tab] of this.tabs) {
      if (tabId !== senderTabId) {
        try {
          if (typeof tab.handleEvent === "function") {
            tab.handleEvent(event, data);
          } else {
            // Fallback for tabs that don't implement handleEvent
            console.log(`Tab '${tabId}' received event: ${event}`, data);
          }
        } catch (error) {
          console.error(`Error broadcasting event '${event}' to tab '${tabId}':`, error);
        }
      }
    }
  }

  /**
   * Set global state that all tabs can access
   */
  setGlobalState(key, value) {
    this.globalState[key] = value;
    this.broadcastEvent("globalStateChanged", { key, value });
  }

  /**
   * Get global state
   */
  getGlobalState(key = null) {
    return key ? this.globalState[key] : { ...this.globalState };
  }

  /**
   * Create navigation button for a tab
   */
  createTabButton(tabId, tabComponent) {
    if (!this.tabNavigation) return;

    const button = document.createElement("button");
    button.className = "tab-button";
    button.dataset.tabId = tabId;
    button.textContent = this.getTabDisplayName(tabId);
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", "false");

    // Add click handler
    button.addEventListener("click", () => this.switchTab(tabId));

    // Add keyboard navigation
    button.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.switchTab(tabId);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        this.handleTabKeyNavigation(e);
      }
    });

    this.tabNavigation.appendChild(button);
  }

  /**
   * Remove navigation button for a tab
   */
  removeTabButton(tabId) {
    if (!this.tabNavigation) return;

    const button = this.tabNavigation.querySelector(`[data-tab-id="${tabId}"]`);
    if (button) {
      button.remove();
    }
  }

  /**
   * Update tab navigation visual state
   */
  updateTabNavigation(activeTabId, previousTabId) {
    if (!this.tabNavigation) return;

    // Update previous tab button
    if (previousTabId) {
      const prevButton = this.tabNavigation.querySelector(`[data-tab-id="${previousTabId}"]`);
      if (prevButton) {
        prevButton.classList.remove("active");
        prevButton.setAttribute("aria-selected", "false");
      }
    }

    // Update active tab button
    const activeButton = this.tabNavigation.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeButton) {
      activeButton.classList.add("active");
      activeButton.setAttribute("aria-selected", "true");
      activeButton.focus();
    }
  }

  /**
   * Show tab content
   */
  showTabContent(tabId) {
    console.log(`Showing content for tab: ${tabId}`);

    if (!this.tabContainer) {
      console.error("Tab container not found");
      return;
    }

    const tab = this.tabs.get(tabId);
    if (!tab) {
      console.error(`Tab ${tabId} not found in tabs map`);
      return;
    }

    // Clear existing content first
    this.tabContainer.innerHTML = "";

    // Only try to get element if the method exists
    if (typeof tab.getElement === "function") {
      console.log(`Getting element for tab ${tabId}`);
      const element = tab.getElement();
      if (element) {
        console.log(`Element found for tab ${tabId}, appending to container`);
        element.style.display = "block";
        element.setAttribute("aria-hidden", "false");
        this.tabContainer.appendChild(element);
      } else {
        console.error(`getElement returned null for tab ${tabId}`);
      }
    } else {
      console.warn(`Tab ${tabId} does not have getElement method, using fallback`);
      // Fallback content
      const fallbackDiv = document.createElement("div");
      fallbackDiv.innerHTML = `<p>Tab ${tabId} content not available</p>`;
      this.tabContainer.appendChild(fallbackDiv);
    }
  }

  /**
   * Hide tab content
   */
  hideTabContent(tabId) {
    if (!this.tabContainer) return;

    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Only try to get element if the method exists
    if (typeof tab.getElement === "function") {
      const element = tab.getElement();
      if (element) {
        element.style.display = "none";
        element.setAttribute("aria-hidden", "true");
      }
    }
  }

  /**
   * Setup tab navigation container
   */
  setupTabNavigation() {
    if (!this.tabNavigation) return;

    this.tabNavigation.setAttribute("role", "tablist");
    this.tabNavigation.className = "tab-navigation";
  }

  /**
   * Handle keyboard navigation between tabs
   */
  handleTabKeyNavigation(event) {
    const buttons = Array.from(this.tabNavigation.querySelectorAll(".tab-button"));
    const currentIndex = buttons.findIndex((btn) => btn === event.target);

    let nextIndex;
    if (event.key === "ArrowLeft") {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
    } else if (event.key === "ArrowRight") {
      nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
    }

    if (nextIndex !== undefined && buttons[nextIndex]) {
      event.preventDefault();
      buttons[nextIndex].focus();
    }
  }

  /**
   * Get display name for a tab
   */
  getTabDisplayName(tabId) {
    const displayNames = {
      simple: "Simple Mode",
      "multi-column": "Multi-Column",
      batch: "Batch Processing",
    };
    return displayNames[tabId] || tabId;
  }

  /**
   * Get first available tab ID
   */
  getFirstAvailableTab() {
    const tabIds = this.getTabIds();
    return tabIds.length > 0 ? tabIds[0] : null;
  }

  /**
   * Validate all tabs
   */
  validateAllTabs() {
    const results = {};
    for (const [tabId, tab] of this.tabs) {
      try {
        results[tabId] = tab.validate();
      } catch (error) {
        results[tabId] = {
          isValid: false,
          errors: [`Validation failed: ${error.message}`],
        };
      }
    }
    return results;
  }

  /**
   * Get tab manager statistics
   */
  getStatistics() {
    return {
      totalTabs: this.tabs.size,
      activeTab: this.activeTabId,
      initializedTabs: Array.from(this.tabs.values()).filter((tab) => tab.isInitialized).length,
      tabIds: this.getTabIds(),
    };
  }

  /**
   * Deactivate a tab with proper cleanup
   */
  async deactivateTab(tabId, tab) {
    const tabState = this.tabStates.get(tabId);

    try {
      // Save current state before deactivation
      if (this.options.enableStateSync && typeof tab.getState === "function") {
        const currentState = tab.getState();
        this.saveTabState(tabId, currentState);
      }

      await tab.deactivate();
      tab.isActive = false;

      if (tabState) {
        tabState.isActive = false;
      }

      this.hideTabContent(tabId);

      console.log(`Tab '${tabId}' deactivated`);
    } catch (error) {
      if (tabState) {
        tabState.errors.push({
          type: "deactivation",
          message: error.message,
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  /**
   * Activate a tab with proper initialization
   */
  async activateTab(tabId, tab) {
    const tabState = this.tabStates.get(tabId);

    try {
      // Restore saved state if available
      if (this.options.enableStateSync && typeof tab.setState === "function") {
        const savedState = this.loadTabState(tabId);
        if (savedState) {
          tab.setState(savedState);
        }
      }

      await tab.activate();
      tab.isActive = true;

      if (tabState) {
        tabState.isActive = true;
        tabState.lastActivated = new Date();
        tabState.activationCount++;
      }

      this.showTabContent(tabId);

      console.log(`Tab '${tabId}' activated`);
    } catch (error) {
      if (tabState) {
        tabState.errors.push({
          type: "activation",
          message: error.message,
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  /**
   * Update tab state after switching
   */
  updateTabState(newTabId, previousTabId) {
    this.activeTabId = newTabId;

    // Update global state
    this.setGlobalState("activeTab", newTabId);
    this.setGlobalState("previousTab", previousTabId);
    this.setGlobalState("lastSwitchTime", new Date());
  }

  /**
   * Update tab history
   */
  updateTabHistory(tabId) {
    if (!this.options.enableTabHistory) {
      return;
    }

    // Remove existing entry if present
    const existingIndex = this.tabHistory.indexOf(tabId);
    if (existingIndex > -1) {
      this.tabHistory.splice(existingIndex, 1);
    }

    // Add to front of history
    this.tabHistory.unshift(tabId);

    // Limit history size
    if (this.tabHistory.length > this.options.maxHistorySize) {
      this.tabHistory = this.tabHistory.slice(0, this.options.maxHistorySize);
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(switchTime) {
    this.performanceMetrics.tabSwitches++;
    this.performanceMetrics.totalSwitchTime += switchTime;
    this.performanceMetrics.averageSwitchTime = this.performanceMetrics.totalSwitchTime / this.performanceMetrics.tabSwitches;
  }

  /**
   * Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    if (!this.options.enableKeyboardNavigation) {
      return;
    }

    document.addEventListener("keydown", this.handleKeyboardNavigation);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(event) {
    // Ctrl/Cmd + Tab navigation
    if ((event.ctrlKey || event.metaKey) && event.key === "Tab") {
      event.preventDefault();

      if (event.shiftKey) {
        this.switchToPreviousTab();
      } else {
        this.switchToNextTab();
      }
    }

    // Ctrl/Cmd + Number keys for direct tab access
    if ((event.ctrlKey || event.metaKey) && /^[1-9]$/.test(event.key)) {
      event.preventDefault();
      const tabIndex = parseInt(event.key) - 1;
      const tabIds = this.getTabIds();

      if (tabIds[tabIndex]) {
        this.switchTab(tabIds[tabIndex]);
      }
    }
  }

  /**
   * Switch to next tab in order
   */
  switchToNextTab() {
    const tabIds = this.getTabIds();
    const currentIndex = tabIds.indexOf(this.activeTabId);
    const nextIndex = (currentIndex + 1) % tabIds.length;

    if (tabIds[nextIndex]) {
      this.switchTab(tabIds[nextIndex]);
    }
  }

  /**
   * Switch to previous tab in order
   */
  switchToPreviousTab() {
    const tabIds = this.getTabIds();
    const currentIndex = tabIds.indexOf(this.activeTabId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1;

    if (tabIds[prevIndex]) {
      this.switchTab(tabIds[prevIndex]);
    }
  }

  /**
   * Switch to last active tab from history
   */
  switchToLastTab() {
    if (this.tabHistory.length > 1) {
      // Skip current tab (index 0) and go to previous (index 1)
      const lastTabId = this.tabHistory[1];
      this.switchTab(lastTabId);
    }
  }

  /**
   * Setup visibility change handling
   */
  setupVisibilityHandling() {
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden - pause active tab if needed
      this.emit("pageHidden", { activeTab: this.activeTabId });
    } else {
      // Page is visible - resume active tab if needed
      this.emit("pageVisible", { activeTab: this.activeTabId });
    }
  }

  /**
   * Setup accessibility features
   */
  setupAccessibility() {
    if (this.tabNavigation) {
      this.tabNavigation.setAttribute("role", "tablist");
      this.tabNavigation.setAttribute("aria-label", "Main navigation tabs");
    }

    if (this.tabContainer) {
      this.tabContainer.setAttribute("role", "tabpanel");
    }
  }

  /**
   * Initialize state management
   */
  initializeStateManagement() {
    // Load saved states if available
    if (this.options.enableStateSync) {
      this.loadAllTabStates();
    }

    // Setup periodic state saving
    if (this.options.enableStateSync) {
      setInterval(() => {
        this.saveAllTabStates();
      }, 30000); // Save every 30 seconds
    }
  }

  /**
   * Save tab state to storage
   */
  saveTabState(tabId, state) {
    try {
      const key = `tabState_${tabId}`;
      const stateData = {
        state: state,
        timestamp: new Date().toISOString(),
        version: "3.0",
      };

      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ [key]: stateData });
      } else {
        localStorage.setItem(key, JSON.stringify(stateData));
      }
    } catch (error) {
      console.warn(`Failed to save state for tab ${tabId}:`, error);
    }
  }

  /**
   * Load tab state from storage
   */
  loadTabState(tabId) {
    try {
      const key = `tabState_${tabId}`;

      if (typeof chrome !== "undefined" && chrome.storage) {
        // Chrome storage is async, return null for now
        // In a real implementation, this would need to be async
        return null;
      } else {
        const stateData = localStorage.getItem(key);
        if (stateData) {
          const parsed = JSON.parse(stateData);
          return parsed.state;
        }
      }
    } catch (error) {
      console.warn(`Failed to load state for tab ${tabId}:`, error);
    }

    return null;
  }

  /**
   * Save all tab states
   */
  saveAllTabStates() {
    for (const [tabId, tab] of this.tabs) {
      if (typeof tab.getState === "function") {
        const state = tab.getState();
        this.saveTabState(tabId, state);
      }
    }
  }

  /**
   * Load all tab states
   */
  loadAllTabStates() {
    // Implementation would load states for all registered tabs
    // This is a placeholder for the actual implementation
  }

  /**
   * Update tab order based on metadata
   */
  updateTabOrder() {
    if (!this.tabNavigation) {
      return;
    }

    // Get tabs sorted by order
    const sortedTabs = Array.from(this.tabs.keys()).sort((a, b) => {
      const metaA = this.tabMetadata.get(a);
      const metaB = this.tabMetadata.get(b);
      return (metaA?.order || 0) - (metaB?.order || 0);
    });

    // Reorder navigation buttons
    sortedTabs.forEach((tabId) => {
      const button = this.tabNavigation.querySelector(`[data-tab-id="${tabId}"]`);
      if (button) {
        this.tabNavigation.appendChild(button);
      }
    });
  }

  /**
   * Enable or disable a tab
   */
  setTabEnabled(tabId, enabled) {
    const metadata = this.tabMetadata.get(tabId);
    if (metadata) {
      metadata.isEnabled = enabled;

      const button = this.tabNavigation?.querySelector(`[data-tab-id="${tabId}"]`);
      if (button) {
        button.disabled = !enabled;
        button.setAttribute("aria-disabled", !enabled);
      }

      this.emit("tabEnabledChanged", { tabId, enabled });
    }
  }

  /**
   * Show or hide a tab
   */
  setTabVisible(tabId, visible) {
    const metadata = this.tabMetadata.get(tabId);
    if (metadata) {
      metadata.isVisible = visible;

      const button = this.tabNavigation?.querySelector(`[data-tab-id="${tabId}"]`);
      if (button) {
        button.style.display = visible ? "" : "none";
      }

      this.emit("tabVisibilityChanged", { tabId, visible });
    }
  }

  /**
   * Get tab history
   */
  getTabHistory() {
    return [...this.tabHistory];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Get tab metadata
   */
  getTabMetadata(tabId) {
    return this.tabMetadata.get(tabId);
  }

  /**
   * Get tab state
   */
  getTabState(tabId) {
    return this.tabStates.get(tabId);
  }

  /**
   * Add event listener
   */
  addEventListener(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, handler) {
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      }
    }
  }

  /**
   * Cleanup all tabs and resources
   */
  async destroy() {
    console.log("Destroying TabManager...");

    try {
      // Save all tab states before destruction
      if (this.options.enableStateSync) {
        this.saveAllTabStates();
      }

      // Deactivate current tab
      if (this.activeTabId) {
        const currentTab = this.tabs.get(this.activeTabId);
        if (currentTab) {
          try {
            await currentTab.deactivate();
          } catch (error) {
            console.error("Error deactivating current tab:", error);
          }
        }
      }

      // Destroy all tabs
      for (const tab of this.tabs.values()) {
        try {
          if (typeof tab.destroy === "function") {
            tab.destroy();
          }
        } catch (error) {
          console.error("Error destroying tab:", error);
        }
      }

      // Remove event listeners
      if (this.options.enableKeyboardNavigation) {
        document.removeEventListener("keydown", this.handleKeyboardNavigation);
      }
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);

      // Clear collections
      this.tabs.clear();
      this.eventListeners.clear();
      this.tabStates.clear();
      this.tabMetadata.clear();
      this.tabHistory = [];
      this.globalState = {};

      // Reset state
      this.activeTabId = null;
      this.isInitialized = false;
      this.isTransitioning = false;

      // Clear DOM references
      if (this.tabNavigation) {
        this.tabNavigation.innerHTML = "";
        this.tabNavigation.removeAttribute("role");
        this.tabNavigation.removeAttribute("aria-label");
      }
      if (this.tabContainer) {
        this.tabContainer.innerHTML = "";
        this.tabContainer.removeAttribute("role");
      }

      console.log("TabManager destroyed successfully");
    } catch (error) {
      console.error("Error during TabManager destruction:", error);
    }
  }
}
