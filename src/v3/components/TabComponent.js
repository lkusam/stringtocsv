/**
 * Base TabComponent class - Abstract base class for all tab implementations
 * Provides common functionality and interface for tab management
 */

export class TabComponent {
  constructor(tabId, tabManager, options = {}) {
    if (new.target === TabComponent) {
      throw new Error("TabComponent is abstract and cannot be instantiated directly");
    }

    this.tabId = tabId;
    this.tabManager = tabManager;
    this.isActive = false;
    this.isInitialized = false;
    this.element = null;
    this.eventListeners = new Map();

    // Enhanced state management
    this.state = {
      data: {},
      ui: {},
      settings: {},
      errors: [],
      warnings: [],
      ...options.initialState,
    };

    // Configuration options
    this.options = {
      enableStateSync: options.enableStateSync !== false,
      enableValidation: options.enableValidation !== false,
      enableErrorRecovery: options.enableErrorRecovery !== false,
      debounceDelay: options.debounceDelay || 300,
      maxRetries: options.maxRetries || 3,
      ...options,
    };

    // Lifecycle tracking
    this.lifecycle = {
      created: new Date(),
      initialized: null,
      firstActivated: null,
      lastActivated: null,
      activationCount: 0,
      deactivationCount: 0,
      errors: [],
    };

    // Performance metrics
    this.metrics = {
      initializationTime: 0,
      averageActivationTime: 0,
      totalActivationTime: 0,
      renderTime: 0,
      memoryUsage: 0,
    };

    // Validation rules
    this.validationRules = new Map();

    // Cleanup handlers
    this.cleanupHandlers = [];

    // Bind methods for consistent context
    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initialize the tab component - called once when tab is first created
   * Enhanced with lifecycle tracking and error handling
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn(`Tab ${this.tabId} is already initialized`);
      return;
    }

    const startTime = performance.now();

    try {
      // Call lifecycle hook
      await this.beforeInitialize();

      // Validate configuration
      if (this.options.enableValidation) {
        this.validateConfiguration();
      }

      // Setup event listeners
      this.setupEventListeners();

      // Call subclass implementation
      await this.onInitialize();

      // Mark as initialized
      this.isInitialized = true;
      this.lifecycle.initialized = new Date();
      this.metrics.initializationTime = performance.now() - startTime;

      // Call lifecycle hook
      await this.afterInitialize();

      console.log(`Tab ${this.tabId} initialized in ${this.metrics.initializationTime.toFixed(2)}ms`);
    } catch (error) {
      this.handleError("initialization", error);
      throw error;
    }
  }

  /**
   * Activate the tab - called when tab becomes active
   * Enhanced with performance tracking and state restoration
   */
  async activate() {
    if (this.isActive) {
      console.warn(`Tab ${this.tabId} is already active`);
      return;
    }

    const startTime = performance.now();

    try {
      // Call lifecycle hook
      await this.beforeActivate();

      // Restore state if needed
      if (this.options.enableStateSync) {
        await this.restoreState();
      }

      // Call subclass implementation
      await this.onActivate();

      // Update state and metrics
      this.isActive = true;
      this.lifecycle.activationCount++;
      this.lifecycle.lastActivated = new Date();

      if (!this.lifecycle.firstActivated) {
        this.lifecycle.firstActivated = new Date();
      }

      const activationTime = performance.now() - startTime;
      this.metrics.totalActivationTime += activationTime;
      this.metrics.averageActivationTime = this.metrics.totalActivationTime / this.lifecycle.activationCount;

      // Setup active state listeners
      this.setupActiveStateListeners();

      // Call lifecycle hook
      await this.afterActivate();

      console.log(`Tab ${this.tabId} activated in ${activationTime.toFixed(2)}ms`);
    } catch (error) {
      this.handleError("activation", error);

      // Attempt recovery if enabled
      if (this.options.enableErrorRecovery) {
        await this.attemptRecovery("activation", error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Deactivate the tab - called when tab becomes inactive
   * Enhanced with state preservation and cleanup
   */
  async deactivate() {
    if (!this.isActive) {
      console.warn(`Tab ${this.tabId} is not active`);
      return;
    }

    try {
      // Call lifecycle hook
      await this.beforeDeactivate();

      // Save state if needed
      if (this.options.enableStateSync) {
        await this.saveState();
      }

      // Cleanup active state listeners
      this.cleanupActiveStateListeners();

      // Call subclass implementation
      await this.onDeactivate();

      // Update state
      this.isActive = false;
      this.lifecycle.deactivationCount++;

      // Call lifecycle hook
      await this.afterDeactivate();

      console.log(`Tab ${this.tabId} deactivated`);
    } catch (error) {
      this.handleError("deactivation", error);

      // Force deactivation even if error occurs
      this.isActive = false;
      throw error;
    }
  }

  /**
   * Lifecycle hooks - can be overridden by subclasses
   */
  async beforeInitialize() {
    // Override in subclasses
  }

  async onInitialize() {
    throw new Error("onInitialize() must be implemented by subclass");
  }

  async afterInitialize() {
    // Override in subclasses
  }

  async beforeActivate() {
    // Override in subclasses
  }

  async onActivate() {
    throw new Error("onActivate() must be implemented by subclass");
  }

  async afterActivate() {
    // Override in subclasses
  }

  async beforeDeactivate() {
    // Override in subclasses
  }

  async onDeactivate() {
    throw new Error("onDeactivate() must be implemented by subclass");
  }

  async afterDeactivate() {
    // Override in subclasses
  }

  /**
   * Handle events from other tabs or the tab manager
   * Can be overridden by subclasses
   */
  handleEvent(event, data) {
    // Default implementation - subclasses can override
    console.log(`Tab ${this.tabId} received event: ${event}`, data);

    // Handle common events
    switch (event) {
      case "globalStateChanged":
        this.onGlobalStateChanged(data);
        break;
      case "tabChanged":
        this.onTabChanged(data);
        break;
      default:
        // Let subclasses handle unknown events
        break;
    }
  }

  /**
   * Handle global state changes
   */
  onGlobalStateChanged(data) {
    // Default implementation - subclasses can override
  }

  /**
   * Handle tab changes
   */
  onTabChanged(data) {
    // Default implementation - subclasses can override
  }

  /**
   * Get current tab state with optional filtering
   */
  getState(filter = null) {
    if (filter) {
      const filtered = {};
      for (const key of filter) {
        if (key in this.state) {
          filtered[key] = this.state[key];
        }
      }
      return filtered;
    }
    return { ...this.state };
  }

  /**
   * Set tab state with validation and change tracking
   */
  setState(newState, options = {}) {
    const previousState = { ...this.state };

    try {
      // Validate state if enabled
      if (this.options.enableValidation && !options.skipValidation) {
        this.validateState(newState);
      }

      // Merge state
      if (options.replace) {
        this.state = { ...newState };
      } else {
        this.state = this.deepMerge(this.state, newState);
      }

      // Track state changes
      const changes = this.getStateChanges(previousState, this.state);

      // Call change handler
      this.onStateChange(this.state, previousState, changes);

      // Emit state change event
      this.emit("stateChanged", {
        tabId: this.tabId,
        newState: this.state,
        previousState,
        changes,
      });
    } catch (error) {
      // Restore previous state on validation error
      this.state = previousState;
      this.handleError("stateChange", error);
      throw error;
    }
  }

  /**
   * Update specific state property with path support
   */
  updateState(path, value) {
    const pathArray = Array.isArray(path) ? path : path.split(".");
    const newState = { ...this.state };

    let current = newState;
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }

    current[pathArray[pathArray.length - 1]] = value;
    this.setState(newState);
  }

  /**
   * Get state property with path support
   */
  getStateProperty(path, defaultValue = undefined) {
    const pathArray = Array.isArray(path) ? path : path.split(".");
    let current = this.state;

    for (const key of pathArray) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Called when state changes - enhanced with change tracking
   */
  onStateChange(newState, previousState, changes) {
    // Default implementation - subclasses can override
    if (changes.length > 0) {
      console.log(`Tab ${this.tabId} state changed:`, changes);
    }
  }

  /**
   * Get differences between two state objects
   */
  getStateChanges(oldState, newState) {
    const changes = [];

    const compareObjects = (old, current, path = "") => {
      const allKeys = new Set([...Object.keys(old || {}), ...Object.keys(current || {})]);

      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        const oldValue = old?.[key];
        const newValue = current?.[key];

        if (oldValue !== newValue) {
          if (typeof oldValue === "object" && typeof newValue === "object" && oldValue !== null && newValue !== null) {
            compareObjects(oldValue, newValue, currentPath);
          } else {
            changes.push({
              path: currentPath,
              oldValue,
              newValue,
              type: oldValue === undefined ? "added" : newValue === undefined ? "removed" : "changed",
            });
          }
        }
      }
    };

    compareObjects(oldState, newState);
    return changes;
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Create the DOM element for this tab
   * Must be implemented by subclasses
   */
  createElement() {
    throw new Error("createElement() must be implemented by subclass");
  }

  /**
   * Get the tab's DOM element
   */
  getElement() {
    if (!this.element) {
      this.element = this.createElement();
    }
    return this.element;
  }

  /**
   * Add event listener with automatic cleanup
   */
  addEventListener(element, event, handler, options = {}) {
    const wrappedHandler = (e) => {
      try {
        handler(e);
      } catch (error) {
        console.error(`Error in ${this.tabId} event handler:`, error);
        this.handleError(error);
      }
    };

    element.addEventListener(event, wrappedHandler, options);

    // Store for cleanup
    const key = `${element.constructor.name}-${event}`;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key).push({
      element,
      event,
      handler: wrappedHandler,
      options,
    });

    return wrappedHandler;
  }

  /**
   * Remove all event listeners
   */
  removeAllEventListeners() {
    for (const listeners of this.eventListeners.values()) {
      for (const { element, event, handler, options } of listeners) {
        element.removeEventListener(event, handler, options);
      }
    }
    this.eventListeners.clear();
  }

  /**
   * Broadcast event to other tabs
   */
  broadcastEvent(event, data) {
    if (this.tabManager) {
      this.tabManager.broadcastEvent(event, data, this.tabId);
    }
  }

  /**
   * Validate tab configuration - can be overridden by subclasses
   */
  validate() {
    return { isValid: true, errors: [] };
  }

  /**
   * Get tab metadata
   */
  getMetadata() {
    return {
      id: this.tabId,
      isActive: this.isActive,
      isInitialized: this.isInitialized,
      hasErrors: false, // Can be overridden by subclasses
    };
  }

  /**
   * Validate tab configuration
   */
  validateConfiguration() {
    if (!this.tabId || typeof this.tabId !== "string") {
      throw new Error("Tab ID must be a non-empty string");
    }

    // Validate options
    const validOptions = ["enableStateSync", "enableValidation", "enableErrorRecovery", "debounceDelay", "maxRetries", "workerPool", "settings", "memoryManager"];
    for (const key in this.options) {
      if (!validOptions.includes(key)) {
        console.warn(`Unknown option: ${key}`);
      }
    }

    return true;
  }

  /**
   * Validate state object
   */
  validateState(state) {
    if (!state || typeof state !== "object") {
      throw new Error("State must be an object");
    }

    // Apply custom validation rules
    for (const [path, rule] of this.validationRules) {
      const value = this.getNestedValue(state, path);
      if (!rule.validator(value)) {
        throw new Error(`Validation failed for ${path}: ${rule.message}`);
      }
    }

    return true;
  }

  /**
   * Add validation rule
   */
  addValidationRule(path, validator, message) {
    this.validationRules.set(path, { validator, message });
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(path) {
    this.validationRules.delete(path);
  }

  /**
   * Get nested value from object using path
   */
  getNestedValue(obj, path) {
    const pathArray = Array.isArray(path) ? path : path.split(".");
    let current = obj;

    for (const key of pathArray) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Setup event listeners - base implementation
   */
  setupEventListeners() {
    // Base implementation - subclasses can override
    // This method is called during initialization to setup component-specific event listeners
  }

  /**
   * Setup event listeners for active state
   */
  setupActiveStateListeners() {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleResize);
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  /**
   * Cleanup active state listeners
   */
  cleanupActiveStateListeners() {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.handleResize);
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    this.onResize();
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.onHidden();
    } else {
      this.onVisible();
    }
  }

  /**
   * Lifecycle hooks for window events - can be overridden
   */
  onResize() {
    // Override in subclasses
  }

  onHidden() {
    // Override in subclasses
  }

  onVisible() {
    // Override in subclasses
  }

  /**
   * Save current state
   */
  async saveState() {
    if (this.tabManager && typeof this.tabManager.saveTabState === "function") {
      await this.tabManager.saveTabState(this.tabId, this.getState());
    }
  }

  /**
   * Restore saved state
   */
  async restoreState() {
    if (this.tabManager && typeof this.tabManager.loadTabState === "function") {
      const savedState = await this.tabManager.loadTabState(this.tabId);
      if (savedState) {
        this.setState(savedState, { skipValidation: true });
      }
    }
  }

  /**
   * Attempt error recovery
   */
  async attemptRecovery(operation, error) {
    const maxRetries = this.options.maxRetries;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`Attempting recovery for ${operation} (attempt ${retryCount + 1}/${maxRetries})`);

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));

        // Attempt recovery based on operation
        switch (operation) {
          case "activation":
            await this.onActivate();
            break;
          case "deactivation":
            await this.onDeactivate();
            break;
          default:
            throw new Error(`No recovery strategy for operation: ${operation}`);
        }

        console.log(`Recovery successful for ${operation}`);
        return;
      } catch (recoveryError) {
        retryCount++;
        console.error(`Recovery attempt ${retryCount} failed:`, recoveryError);

        if (retryCount >= maxRetries) {
          throw new Error(`Recovery failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Enhanced error handling - handles both single error and context+error calls
   */
  handleError(contextOrError, error = null) {
    // Handle both signatures: handleError(error) and handleError(context, error)
    let context, actualError;
    if (error === null) {
      // Single parameter call: handleError(error)
      context = "general";
      actualError = contextOrError;
    } else {
      // Two parameter call: handleError(context, error)
      context = contextOrError;
      actualError = error;
    }

    const errorInfo = {
      context,
      message: actualError.message || actualError,
      stack: actualError.stack,
      timestamp: new Date(),
      tabId: this.tabId,
      isActive: this.isActive,
      state: this.getState(),
    };

    // Add to lifecycle errors
    this.lifecycle.errors.push(errorInfo);

    // Add to state errors
    this.state.errors.push(errorInfo);

    // Emit error event
    this.emit("error", errorInfo);

    // Log error
    console.error(`Tab ${this.tabId} error in ${context}:`, actualError);
  }

  /**
   * Add cleanup handler
   */
  addCleanupHandler(handler) {
    if (typeof handler === "function") {
      this.cleanupHandlers.push(handler);
    }
  }

  /**
   * Get tab metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      lifecycle: { ...this.lifecycle },
      errorCount: this.lifecycle.errors.length,
      isHealthy:
        this.lifecycle.errors.length === 0 ||
        this.lifecycle.errors.every(
          (e) => Date.now() - e.timestamp.getTime() > 300000 // 5 minutes
        ),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      initializationTime: 0,
      averageActivationTime: 0,
      totalActivationTime: 0,
      renderTime: 0,
      memoryUsage: 0,
    };

    this.lifecycle.errors = [];
    this.state.errors = [];
  }

  /**
   * Emit event to tab manager
   */
  emit(event, data) {
    if (this.tabManager && typeof this.tabManager.emit === "function") {
      this.tabManager.emit(`tab:${event}`, {
        tabId: this.tabId,
        ...data,
      });
    }
  }

  /**
   * Show error message to user
   */
  showError(message) {
    console.error(`Tab ${this.tabId} error:`, message);
    // Default implementation - subclasses can override for better UI
    if (typeof window !== "undefined" && window.alert) {
      window.alert(`Error: ${message}`);
    }
  }

  /**
   * Show success message to user
   */
  showSuccess(message) {
    console.log(`Tab ${this.tabId} success:`, message);
    // Default implementation - subclasses can override for better UI
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Enhanced cleanup with error handling
   */
  destroy() {
    console.log(`Destroying tab ${this.tabId}...`);

    try {
      // Run cleanup handlers
      for (const handler of this.cleanupHandlers) {
        try {
          handler();
        } catch (error) {
          console.error("Error in cleanup handler:", error);
        }
      }

      // Remove all event listeners
      this.removeAllEventListeners();
      this.cleanupActiveStateListeners();

      // Remove DOM element
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }

      // Clear references
      this.element = null;
      this.tabManager = null;
      this.eventListeners.clear();
      this.validationRules.clear();
      this.cleanupHandlers = [];

      // Reset state
      this.state = {};
      this.isActive = false;
      this.isInitialized = false;

      console.log(`Tab ${this.tabId} destroyed successfully`);
    } catch (error) {
      console.error(`Error destroying tab ${this.tabId}:`, error);
    }
  }

  /**
   * Show loading state - utility method for subclasses
   */
  showLoading(message = "Processing...") {
    // Default implementation - subclasses can override
    console.log(`${this.tabId}: ${message}`);
  }

  /**
   * Hide loading state - utility method for subclasses
   */
  hideLoading() {
    // Default implementation - subclasses can override
  }

  /**
   * Show error message - utility method for subclasses
   */
  showError(message, error = null) {
    console.error(`${this.tabId} Error: ${message}`, error);
    // Default implementation - subclasses can override
  }

  /**
   * Show success message - utility method for subclasses
   */
  showSuccess(message) {
    console.log(`${this.tabId} Success: ${message}`);
    // Default implementation - subclasses can override
  }

  /**
   * Debounce utility for input handling
   */
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Throttle utility for performance-critical operations
   */
  throttle(func, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}
