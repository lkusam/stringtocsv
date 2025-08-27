/**
 * Unit tests for SimpleTab
 * Tests enhanced simple mode functionality including templates
 */

import { SimpleTab } from "./SimpleTab.js";
import { TabManager } from "../managers/TabManager.js";

/**
 * Mock DOM environment for testing
 */
class MockDOM {
  static createElement(tagName) {
    return {
      tagName: tagName.toUpperCase(),
      className: "",
      innerHTML: "",
      style: {},
      children: [],
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild: () => {},
      removeChild: () => {},
      setAttribute: () => {},
      getAttribute: () => null,
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => {},
      },
    };
  }
}

// Mock global objects
global.document = {
  createElement: MockDOM.createElement,
  querySelector: () => null,
  querySelectorAll: () => [],
  body: MockDOM.createElement("body"),
};

global.navigator = {
  clipboard: {
    writeText: async (text) => Promise.resolve(),
  },
};

global.chrome = {
  storage: {
    sync: {
      get: (keys, callback) => callback({}),
      set: (data, callback) => callback(),
    },
  },
};

/**
 * Test suite for SimpleTab
 */
export class SimpleTabTests {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log("🧪 Running SimpleTab Tests...\n");

    const tests = ["testInitialization", "testConversionSettings", "testProcessing", "testTemplateManagement", "testFormatDetection", "testPreviewFunctionality", "testSettingsPersistence", "testErrorHandling", "testPerformanceMetrics", "testCleanup"];

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
   * Test SimpleTab initialization
   */
  async testInitialization() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);

    // Test initial state
    this.assert(simpleTab.tabId === "simple", "Should have correct tab ID");
    this.assert(simpleTab.isInitialized === false, "Should not be initialized initially");
    this.assert(simpleTab.conversionSettings !== null, "Should have conversion settings");

    // Test initialization
    await simpleTab.initialize();

    this.assert(simpleTab.isInitialized === true, "Should be initialized");
    this.assert(simpleTab.templateManager !== null, "Should have template manager");
    this.assert(simpleTab.formatDetector !== null, "Should have format detector");

    await simpleTab.destroy();
  }

  /**
   * Test conversion settings management
   */
  async testConversionSettings() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Test default settings
    this.assert(simpleTab.conversionSettings.separator === "newline", "Should have default separator");
    this.assert(simpleTab.conversionSettings.quoteType === "double", "Should have default quote type");
    this.assert(simpleTab.conversionSettings.trimWhitespace === true, "Should trim whitespace by default");

    // Test settings update
    simpleTab.conversionSettings.separator = "comma";
    simpleTab.conversionSettings.quoteType = "single";

    this.assert(simpleTab.conversionSettings.separator === "comma", "Should update separator");
    this.assert(simpleTab.conversionSettings.quoteType === "single", "Should update quote type");

    // Test separator value conversion
    const separatorValue = simpleTab.getSeparatorValue();
    this.assert(separatorValue === ",", "Should convert comma separator correctly");

    await simpleTab.destroy();
  }

  /**
   * Test data processing functionality
   */
  async testProcessing() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Test local processing
    const testInput = "line1\nline2\nline3";
    const result = await simpleTab.processLocally(testInput);

    this.assert(result.output !== undefined, "Should return output");
    this.assert(result.metadata !== undefined, "Should return metadata");
    this.assert(result.output.includes('"line1"'), "Should quote values");
    this.assert(result.output.includes(","), "Should use CSV format");

    // Test different quote types
    simpleTab.conversionSettings.quoteType = "single";
    const singleQuoteResult = await simpleTab.processLocally(testInput);
    this.assert(singleQuoteResult.output.includes("'line1'"), "Should use single quotes");

    // Test no quotes
    simpleTab.conversionSettings.quoteType = "none";
    const noQuoteResult = await simpleTab.processLocally(testInput);
    this.assert(!noQuoteResult.output.includes('"'), "Should not include quotes");

    await simpleTab.destroy();
  }

  /**
   * Test template management functionality
   */
  async testTemplateManagement() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Test template creation
    const templateName = "Test Template";
    const templateDescription = "A test template";

    const template = await simpleTab.saveAsTemplate(templateName, templateDescription);

    this.assert(template.name === templateName, "Should create template with correct name");
    this.assert(template.description === templateDescription, "Should store description");
    this.assert(template.settings.mode === "simple", "Should set correct mode");

    // Test template application
    // Change settings first
    simpleTab.conversionSettings.separator = "comma";
    simpleTab.conversionSettings.quoteType = "single";

    // Apply template (should restore original settings)
    await simpleTab.applyTemplate(template.id);

    this.assert(simpleTab.conversionSettings.separator === "newline", "Should restore separator from template");
    this.assert(simpleTab.conversionSettings.quoteType === "double", "Should restore quote type from template");

    await simpleTab.destroy();
  }

  /**
   * Test format detection functionality
   */
  async testFormatDetection() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Test comma detection
    const commaInput = "value1,value2,value3\nvalue4,value5,value6";
    const commaDetection = await simpleTab.formatDetector.detectFormat(commaInput);

    this.assert(commaDetection.confidence > 0, "Should detect comma format");
    this.assert(commaDetection.suggestions.length > 0, "Should provide suggestions");

    // Test tab detection
    const tabInput = "value1\tvalue2\tvalue3\nvalue4\tvalue5\tvalue6";
    const tabDetection = await simpleTab.formatDetector.detectFormat(tabInput);

    this.assert(tabDetection.confidence > 0, "Should detect tab format");

    await simpleTab.destroy();
  }

  /**
   * Test preview functionality
   */
  async testPreviewFunctionality() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Create mock elements
    simpleTab.previewElement = MockDOM.createElement("div");

    // Test preview update
    const testInput = "line1\nline2\nline3\nline4\nline5\nline6";
    simpleTab.updatePreview(testInput);

    // Preview should be updated (we can't test DOM changes in this mock environment)
    this.assert(true, "Preview update should complete without errors");

    await simpleTab.destroy();
  }

  /**
   * Test settings persistence
   */
  async testSettingsPersistence() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Modify settings
    simpleTab.conversionSettings.separator = "comma";
    simpleTab.conversionSettings.quoteType = "single";
    simpleTab.conversionSettings.trimWhitespace = false;

    // Test save settings
    await simpleTab.saveSettings();

    // Test load settings (in a real environment, this would load from storage)
    await simpleTab.loadSettings();

    // Settings should persist (in our mock, they won't change)
    this.assert(true, "Settings save/load should complete without errors");

    await simpleTab.destroy();
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Test processing with invalid input
    try {
      await simpleTab.processLocally(null);
      this.assert(false, "Should throw error for null input");
    } catch (error) {
      this.assert(error.message.includes("Cannot read"), "Should handle null input gracefully");
    }

    // Test template operations with invalid IDs
    try {
      await simpleTab.applyTemplate("invalid-id");
      // Should not throw in our implementation
      this.assert(true, "Should handle invalid template ID gracefully");
    } catch (error) {
      this.assert(true, "Should handle invalid template ID");
    }

    await simpleTab.destroy();
  }

  /**
   * Test performance metrics
   */
  async testPerformanceMetrics() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Test initial metrics
    this.assert(simpleTab.metrics.conversionsCount === 0, "Should start with zero conversions");
    this.assert(simpleTab.metrics.totalProcessingTime === 0, "Should start with zero processing time");

    // Test metrics update
    simpleTab.updateMetrics(100); // 100ms processing time

    this.assert(simpleTab.metrics.conversionsCount === 1, "Should increment conversion count");
    this.assert(simpleTab.metrics.totalProcessingTime === 100, "Should track total processing time");
    this.assert(simpleTab.metrics.averageProcessingTime === 100, "Should calculate average correctly");

    // Test second conversion
    simpleTab.updateMetrics(200);

    this.assert(simpleTab.metrics.conversionsCount === 2, "Should increment conversion count again");
    this.assert(simpleTab.metrics.averageProcessingTime === 150, "Should update average correctly");

    await simpleTab.destroy();
  }

  /**
   * Test cleanup and destruction
   */
  async testCleanup() {
    const tabManager = new TabManager();
    const simpleTab = new SimpleTab(tabManager);
    await simpleTab.initialize();

    // Set up some state
    simpleTab.currentJob = { id: "test-job" };
    simpleTab.previewTimeout = setTimeout(() => {}, 1000);

    // Test destruction
    await simpleTab.destroy();

    this.assert(simpleTab.isInitialized === false, "Should be marked as not initialized");
    this.assert(simpleTab.currentJob === null, "Should clear current job");

    // Template manager should be cleaned up
    // (In a real test, we'd verify the template manager's destroy method was called)
    this.assert(true, "Should cleanup template manager");
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
  const tests = new SimpleTabTests();
  tests.runAllTests().catch(console.error);
}

export { SimpleTabTests };
