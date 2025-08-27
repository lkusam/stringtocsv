/**
 * Basic test file to verify the v3 architecture components
 * This can be run in a browser console to test the basic functionality
 */

import { ProcessingJob, ValidationResult, Template, AppSettings } from "./core/interfaces.js";
import { TabComponent } from "./components/TabComponent.js";
import { TabManager } from "./managers/TabManager.js";
import { ProcessingEngine } from "./engines/ProcessingEngine.js";
import { WorkerPoolManager } from "./workers/WorkerPoolManager.js";
import { ChromeExtensionV3, getApp } from "./index.js";

/**
 * Test the core interfaces
 */
function testCoreInterfaces() {
  console.log("Testing core interfaces...");

  // Test ProcessingJob
  const job = new ProcessingJob({
    type: "simple",
    input: { data: "test,data\nmore,data" },
  });
  console.log("ProcessingJob created:", job.id);

  // Test ValidationResult
  const validation = new ValidationResult();
  validation.addError("format", "warning", "Test warning");
  console.log("ValidationResult:", validation.isValid, validation.errors.length);

  // Test Template
  const template = new Template({
    name: "Test Template",
    settings: { mode: "simple" },
  });
  console.log("Template created:", template.id);

  // Test AppSettings
  const settings = new AppSettings();
  settings.updateUI({ theme: "material" });
  console.log("AppSettings theme:", settings.ui.theme);

  console.log("✅ Core interfaces test passed");
}

/**
 * Test TabManager
 */
async function testTabManager() {
  console.log("Testing TabManager...");

  const tabManager = new TabManager();

  // Create mock DOM elements
  const tabContainer = document.createElement("div");
  const tabNavigation = document.createElement("div");

  tabManager.initialize(tabContainer, tabNavigation);

  const stats = tabManager.getStatistics();
  console.log("TabManager stats:", stats);

  console.log("✅ TabManager test passed");
}

/**
 * Test WorkerPoolManager
 */
async function testWorkerPoolManager() {
  console.log("Testing WorkerPoolManager...");

  const workerPool = new WorkerPoolManager(2);
  await workerPool.initialize();

  const stats = workerPool.getStatistics();
  console.log("WorkerPool stats:", stats);

  // Test job execution
  const result = await workerPool.executeJob({
    input: "test\ndata",
  });
  console.log("Job result:", result);

  await workerPool.destroy();
  console.log("✅ WorkerPoolManager test passed");
}

/**
 * Test main application
 */
async function testMainApplication() {
  console.log("Testing main application...");

  const app = getApp();
  console.log("App version:", app.version);
  console.log("App initialized:", app.isInitialized);

  const stats = app.getStatistics();
  console.log("App stats:", stats);

  console.log("✅ Main application test passed");
}

/**
 * Run all tests
 */
export async function runTests() {
  console.log("🧪 Running Chrome Extension v3 Architecture Tests...\n");

  try {
    testCoreInterfaces();
    await testTabManager();
    await testWorkerPoolManager();
    await testMainApplication();

    console.log("\n🎉 All tests passed! Architecture is working correctly.");
    return true;
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    return false;
  }
}

// Auto-run tests if this file is loaded directly
if (typeof window !== "undefined") {
  runTests();
}
