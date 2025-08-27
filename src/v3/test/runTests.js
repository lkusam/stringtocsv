/**
 * Test runner script for Chrome Extension v3
 * Runs all test suites and generates reports
 */

import { testRunner } from "./TestRunner.js";

// Import all test suites
import "./unit/CoreTests.js";
import "./integration/IntegrationTests.js";
import "./accessibility/AccessibilityTests.js";

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("🚀 Starting Chrome Extension v3 Test Suite");
  console.log("Time:", new Date().toISOString());
  console.log("Environment:", typeof window !== "undefined" ? "Browser" : "Node.js");
  console.log("");

  try {
    const results = await testRunner.runAllTests();

    // Generate detailed report
    const report = testRunner.generateReport();

    // Save report if in Node.js environment
    if (typeof window === "undefined" && typeof require !== "undefined") {
      try {
        const fs = require("fs");
        const path = require("path");

        const reportPath = path.join(__dirname, "test-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Test report saved to: ${reportPath}`);
      } catch (error) {
        console.warn("Could not save test report:", error.message);
      }
    }

    // Exit with appropriate code
    const exitCode = results.failed > 0 ? 1 : 0;

    if (typeof process !== "undefined") {
      process.exit(exitCode);
    }

    return results;
  } catch (error) {
    console.error("💥 Test runner failed:", error);

    if (typeof process !== "undefined") {
      process.exit(1);
    }

    throw error;
  }
}

// Auto-run if this is the main module
if (typeof window !== "undefined") {
  // Browser environment
  document.addEventListener("DOMContentLoaded", runAllTests);
} else if (typeof module !== "undefined" && require.main === module) {
  // Node.js environment
  runAllTests();
}

export { runAllTests };
