/**
 * Unit tests for TabManager
 * Tests tab registration, switching, state management, and lifecycle
 */

import { TabManager } from "./TabManager.js";
import { TabComponent } from "../components/TabComponent.js";

/**
 * Mock TabComponent for testing
 */
class MockTabComponent extends TabComponent {
  constructor(tabId) {
    super(tabId, null);
    this.initializeCalled = false;
    this.activateCalled = false;
    this.deactivateCalled = false;
    this.destroyCalled = false;
    this.mockState = { data: "test" };
  }

  async initialize() {
    this.initializeCalled = true;
    this.isInitialized = true;
  }

  async activate() {
    this.activateCalled = true;
    this.isActive = true;
  }

  async deactivate() {
    this.deactivateCalled = true;
    this.isActive = false;
  }

  createElement() {
    const element = document.createElement("div");
    element.className = "mock-tab-content";
    element.textContent = `Content for ${this.tabId}`;
    return element;
  }

  getState() {
    return this.mockState;
  }

  setState(state) {
    this.mockState = { ...this.mockState, ...state };
  }

  destroy() {
    this.destroyCalled = true;
    super.destroy();
  }
}

/**
 * Test suite for TabManager
 */
export class TabManagerTests {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log("🧪 Running TabManager Tests...\n");

    const tests = ["testInitialization", "testTabRegistration", "testTabSwitching", "testStateManagement", "testEventHandling", "testKeyboardNavigation", "testTabHistory", "testPerformanceMetrics", "testErrorHandling", "testAccessibility", "testCleanup"];

    for (const testName of tests) {
      try {
        await this[testName]();
        this.testResults.push({ test: testName, status: "PASS" });
        console.log(`✅ ${testName} - PASSED`);
      } catch (error) {
        this.testResults.push({ test: testName, status: "FAIL", error: error.message });
        console.error(`❌ ${testName} - FAILED:`, error.message);
      }
    }

    this.printSummary();
    return this.testResults;
  }

  /**
   * Test TabManager initialization
   */
  async testInitialization() {
    const tabManager = new TabManager({
      enableKeyboardNavigation: true,
      enableTabHistory: true,
      maxHistorySize: 5,
    });

    // Test initial state
    this.assert(tabManager.isInitialized === false, "Should not be initialized initially");
    this.assert(tabManager.tabs.size === 0, "Should have no tabs initially");
    this.assert(tabManager.activeTabId === null, "Should have no active tab initially");

    // Create mock DOM elements
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    // Test initialization
    tabManager.initialize(tabContainer, tabNavigation);

    this.assert(tabManager.isInitialized === true, "Should be initialized");
    this.assert(tabManager.tabContainer === tabContainer, "Should store tab container");
    this.assert(tabManager.tabNavigation === tabNavigation, "Should store tab navigation");
    this.assert(tabNavigation.getAttribute("role") === "tablist", "Should set navigation role");

    await tabManager.destroy();
  }

  /**
   * Test tab registration
   */
  async testTabRegistration() {
    const tabManager = new TabManager();
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    // Test registering a tab
    const mockTab = new MockTabComponent("test-tab");
    const metadata = {
      displayName: "Test Tab",
      description: "A test tab",
      order: 1,
    };

    const result = await tabManager.registerTab("test-tab", mockTab, metadata);

    this.assert(result === true, "Should return true on successful registration");
    this.assert(tabManager.tabs.has("test-tab"), "Should store the tab");
    this.assert(mockTab.initializeCalled === true, "Should initialize the tab");
    this.assert(tabManager.tabMetadata.has("test-tab"), "Should store tab metadata");
    this.assert(tabManager.tabStates.has("test-tab"), "Should create tab state");

    // Test duplicate registration
    try {
      await tabManager.registerTab("test-tab", mockTab);
      this.assert(false, "Should throw error for duplicate registration");
    } catch (error) {
      this.assert(error.message.includes("already registered"), "Should throw appropriate error");
    }

    await tabManager.destroy();
  }

  /**
   * Test tab switching
   */
  async testTabSwitching() {
    const tabManager = new TabManager();
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    // Register multiple tabs
    const tab1 = new MockTabComponent("tab1");
    const tab2 = new MockTabComponent("tab2");

    await tabManager.registerTab("tab1", tab1);
    await tabManager.registerTab("tab2", tab2);

    // Test switching to first tab
    const result1 = await tabManager.switchTab("tab1");

    this.assert(result1 === true, "Should successfully switch to tab1");
    this.assert(tabManager.activeTabId === "tab1", "Should set active tab ID");
    this.assert(tab1.activateCalled === true, "Should activate tab1");
    this.assert(tab1.isActive === true, "Tab1 should be active");

    // Test switching to second tab
    const result2 = await tabManager.switchTab("tab2");

    this.assert(result2 === true, "Should successfully switch to tab2");
    this.assert(tabManager.activeTabId === "tab2", "Should update active tab ID");
    this.assert(tab1.deactivateCalled === true, "Should deactivate tab1");
    this.assert(tab2.activateCalled === true, "Should activate tab2");
    this.assert(tab1.isActive === false, "Tab1 should be inactive");
    this.assert(tab2.isActive === true, "Tab2 should be active");

    // Test switching to non-existent tab
    const result3 = await tabManager.switchTab("non-existent");
    this.assert(result3 === false, "Should return false for non-existent tab");

    await tabManager.destroy();
  }

  /**
   * Test state management
   */
  async testStateManagement() {
    const tabManager = new TabManager({ enableStateSync: true });
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    const mockTab = new MockTabComponent("state-tab");
    await tabManager.registerTab("state-tab", mockTab);

    // Test global state
    tabManager.setGlobalState("testKey", "testValue");
    this.assert(tabManager.getGlobalState("testKey") === "testValue", "Should store global state");

    const allState = tabManager.getGlobalState();
    this.assert(allState.testKey === "testValue", "Should return all global state");

    // Test tab state
    const tabState = tabManager.getTabState("state-tab");
    this.assert(tabState !== null, "Should have tab state");
    this.assert(tabState.isActive === false, "Should track active state");
    this.assert(tabState.activationCount === 0, "Should track activation count");

    // Switch tab and check state updates
    await tabManager.switchTab("state-tab");
    const updatedState = tabManager.getTabState("state-tab");
    this.assert(updatedState.isActive === true, "Should update active state");
    this.assert(updatedState.activationCount === 1, "Should increment activation count");

    await tabManager.destroy();
  }

  /**
   * Test event handling
   */
  async testEventHandling() {
    const tabManager = new TabManager();
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    let eventReceived = false;
    let eventData = null;

    // Add event listener
    tabManager.addEventListener("tabChanged", (data) => {
      eventReceived = true;
      eventData = data;
    });

    const mockTab = new MockTabComponent("event-tab");
    await tabManager.registerTab("event-tab", mockTab);
    await tabManager.switchTab("event-tab");

    this.assert(eventReceived === true, "Should emit tabChanged event");
    this.assert(eventData.activeTab === "event-tab", "Should include correct tab ID in event");

    // Test event removal
    const handler = () => {};
    tabManager.addEventListener("test", handler);
    tabManager.removeEventListener("test", handler);

    await tabManager.destroy();
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    const tabManager = new TabManager({ enableKeyboardNavigation: true });
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    // Register tabs
    const tab1 = new MockTabComponent("kb-tab1");
    const tab2 = new MockTabComponent("kb-tab2");

    await tabManager.registerTab("kb-tab1", tab1);
    await tabManager.registerTab("kb-tab2", tab2);
    await tabManager.switchTab("kb-tab1");

    // Test next tab navigation
    tabManager.switchToNextTab();
    this.assert(tabManager.activeTabId === "kb-tab2", "Should switch to next tab");

    // Test previous tab navigation
    tabManager.switchToPreviousTab();
    this.assert(tabManager.activeTabId === "kb-tab1", "Should switch to previous tab");

    await tabManager.destroy();
  }

  /**
   * Test tab history
   */
  async testTabHistory() {
    const tabManager = new TabManager({
      enableTabHistory: true,
      maxHistorySize: 3,
    });
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    // Register tabs
    const tab1 = new MockTabComponent("hist-tab1");
    const tab2 = new MockTabComponent("hist-tab2");
    const tab3 = new MockTabComponent("hist-tab3");

    await tabManager.registerTab("hist-tab1", tab1);
    await tabManager.registerTab("hist-tab2", tab2);
    await tabManager.registerTab("hist-tab3", tab3);

    // Switch through tabs
    await tabManager.switchTab("hist-tab1");
    await tabManager.switchTab("hist-tab2");
    await tabManager.switchTab("hist-tab3");

    const history = tabManager.getTabHistory();
    this.assert(history.length === 3, "Should maintain history");
    this.assert(history[0] === "hist-tab3", "Should have most recent tab first");
    this.assert(history[1] === "hist-tab2", "Should maintain correct order");

    // Test last tab switching
    tabManager.switchToLastTab();
    this.assert(tabManager.activeTabId === "hist-tab2", "Should switch to last active tab");

    await tabManager.destroy();
  }

  /**
   * Test performance metrics
   */
  async testPerformanceMetrics() {
    const tabManager = new TabManager();
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    const mockTab = new MockTabComponent("perf-tab");
    await tabManager.registerTab("perf-tab", mockTab);

    // Perform tab switch
    await tabManager.switchTab("perf-tab");

    const metrics = tabManager.getPerformanceMetrics();
    this.assert(metrics.tabSwitches === 1, "Should track tab switches");
    this.assert(metrics.averageSwitchTime > 0, "Should track switch time");
    this.assert(metrics.totalSwitchTime > 0, "Should track total time");

    await tabManager.destroy();
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    const tabManager = new TabManager();
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    // Test registration without initialization
    try {
      const uninitializedManager = new TabManager();
      await uninitializedManager.registerTab("test", new MockTabComponent("test"));
      this.assert(false, "Should throw error for uninitialized manager");
    } catch (error) {
      this.assert(error.message.includes("initialized"), "Should throw initialization error");
    }

    // Test invalid tab component
    try {
      await tabManager.registerTab("invalid", null);
      this.assert(false, "Should throw error for invalid tab component");
    } catch (error) {
      this.assert(error.message.includes("valid object"), "Should throw validation error");
    }

    // Test disabled tab switching
    const mockTab = new MockTabComponent("disabled-tab");
    await tabManager.registerTab("disabled-tab", mockTab, { isEnabled: false });

    const result = await tabManager.switchTab("disabled-tab");
    this.assert(result === false, "Should not switch to disabled tab");

    await tabManager.destroy();
  }

  /**
   * Test accessibility features
   */
  async testAccessibility() {
    const tabManager = new TabManager();
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    // Check ARIA attributes
    this.assert(tabNavigation.getAttribute("role") === "tablist", "Should set tablist role");
    this.assert(tabNavigation.getAttribute("aria-label") === "Main navigation tabs", "Should set aria-label");
    this.assert(tabContainer.getAttribute("role") === "tabpanel", "Should set tabpanel role");

    // Register tab and check button attributes
    const mockTab = new MockTabComponent("a11y-tab");
    await tabManager.registerTab("a11y-tab", mockTab);

    const button = tabNavigation.querySelector('[data-tab-id="a11y-tab"]');
    this.assert(button.getAttribute("role") === "tab", "Should set tab role on button");
    this.assert(button.getAttribute("aria-selected") === "false", "Should set aria-selected");

    // Switch tab and check updated attributes
    await tabManager.switchTab("a11y-tab");
    this.assert(button.getAttribute("aria-selected") === "true", "Should update aria-selected");

    await tabManager.destroy();
  }

  /**
   * Test cleanup and destruction
   */
  async testCleanup() {
    const tabManager = new TabManager({ enableKeyboardNavigation: true });
    const tabContainer = document.createElement("div");
    const tabNavigation = document.createElement("div");

    tabManager.initialize(tabContainer, tabNavigation);

    // Register tabs
    const tab1 = new MockTabComponent("cleanup-tab1");
    const tab2 = new MockTabComponent("cleanup-tab2");

    await tabManager.registerTab("cleanup-tab1", tab1);
    await tabManager.registerTab("cleanup-tab2", tab2);
    await tabManager.switchTab("cleanup-tab1");

    // Test destruction
    await tabManager.destroy();

    this.assert(tabManager.isInitialized === false, "Should be marked as not initialized");
    this.assert(tabManager.tabs.size === 0, "Should clear all tabs");
    this.assert(tabManager.activeTabId === null, "Should clear active tab");
    this.assert(tab1.destroyCalled === true, "Should destroy tab1");
    this.assert(tab2.destroyCalled === true, "Should destroy tab2");
    this.assert(tabNavigation.innerHTML === "", "Should clear navigation");
    this.assert(tabContainer.innerHTML === "", "Should clear container");
  }

  /**
   * Assertion helper
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;

    console.log("\n📊 Test Summary:");
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults.filter((r) => r.status === "FAIL").forEach((r) => console.log(`  - ${r.test}: ${r.error}`));
    }
  }
}

/**
 * Run tests if this file is executed directly
 */
if (typeof window !== "undefined" || typeof global !== "undefined") {
  const tests = new TabManagerTests();
  tests.runAllTests().catch(console.error);
}

export { TabManagerTests };
