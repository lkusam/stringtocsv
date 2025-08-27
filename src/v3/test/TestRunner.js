/**
 * TestRunner - Comprehensive test suite for Chrome Extension v3
 * Runs unit tests, integration tests, and performance tests
 */

export class TestRunner {
  constructor(options = {}) {
    this.testSuites = new Map();
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      performance: {},
    };

    this.options = {
      verbose: options.verbose || false,
      stopOnFailure: options.stopOnFailure || false,
      timeout: options.timeout || 5000,
      ...options,
    };

    this.setupTestEnvironment();
  }

  /**
   * Setup test environment
   */
  setupTestEnvironment() {
    // Mock Chrome APIs for testing
    if (typeof chrome === "undefined") {
      global.chrome = {
        storage: {
          sync: {
            get: (keys, callback) => callback({}),
            set: (items, callback) => callback && callback(),
          },
          local: {
            get: (keys, callback) => callback({}),
            set: (items, callback) => callback && callback(),
            remove: (keys, callback) => callback && callback(),
          },
        },
        runtime: {
          getManifest: () => ({ version: "3.0.0", name: "Test Extension" }),
          lastError: null,
        },
      };
    }

    // Mock DOM if not available
    if (typeof document === "undefined") {
      global.document = {
        createElement: (tag) => ({
          tagName: tag.toUpperCase(),
          classList: {
            add: () => {},
            remove: () => {},
            contains: () => false,
          },
          addEventListener: () => {},
          removeEventListener: () => {},
          setAttribute: () => {},
          getAttribute: () => null,
          appendChild: () => {},
          removeChild: () => {},
          querySelector: () => null,
          querySelectorAll: () => [],
        }),
        getElementById: () => null,
        addEventListener: () => {},
        body: { appendChild: () => {}, removeChild: () => {} },
        head: { appendChild: () => {} },
      };
    }

    // Mock performance API
    if (typeof performance === "undefined") {
      global.performance = {
        now: () => Date.now(),
        mark: () => {},
        measure: () => {},
        clearMarks: () => {},
        clearMeasures: () => {},
      };
    }
  }

  /**
   * Register a test suite
   * @param {string} name - Suite name
   * @param {Function} testFunction - Test function
   * @param {Object} options - Test options
   */
  registerSuite(name, testFunction, options = {}) {
    this.testSuites.set(name, {
      name,
      testFunction,
      options: {
        timeout: options.timeout || this.options.timeout,
        skip: options.skip || false,
        only: options.only || false,
        ...options,
      },
    });
  }

  /**
   * Run all test suites
   * @returns {Promise<Object>} Test results
   */
  async runAllTests() {
    console.log("🧪 Starting Chrome Extension v3 Test Suite");
    console.log("=".repeat(50));

    const startTime = performance.now();

    // Reset results
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      performance: {},
    };

    // Check for 'only' tests
    const onlyTests = Array.from(this.testSuites.values()).filter((suite) => suite.options.only);
    const suitesToRun = onlyTests.length > 0 ? onlyTests : Array.from(this.testSuites.values());

    // Run test suites
    for (const suite of suitesToRun) {
      if (suite.options.skip) {
        this.results.skipped++;
        console.log(`⏭️  Skipped: ${suite.name}`);
        continue;
      }

      try {
        await this.runTestSuite(suite);
      } catch (error) {
        if (this.options.stopOnFailure) {
          break;
        }
      }
    }

    const endTime = performance.now();
    this.results.performance.totalTime = endTime - startTime;

    this.printResults();
    return this.results;
  }

  /**
   * Run a single test suite
   * @param {Object} suite - Test suite
   */
  async runTestSuite(suite) {
    const suiteStartTime = performance.now();

    try {
      console.log(`\n🔍 Running: ${suite.name}`);

      // Create test context
      const testContext = this.createTestContext(suite.name);

      // Run test with timeout
      await this.runWithTimeout(() => suite.testFunction(testContext), suite.options.timeout);

      const suiteEndTime = performance.now();
      const duration = suiteEndTime - suiteStartTime;

      if (testContext.hasFailures()) {
        this.results.failed++;
        console.log(`❌ Failed: ${suite.name} (${duration.toFixed(2)}ms)`);
        this.results.errors.push(...testContext.getErrors());
      } else {
        this.results.passed++;
        console.log(`✅ Passed: ${suite.name} (${duration.toFixed(2)}ms)`);
      }

      this.results.total++;
      this.results.performance[suite.name] = duration;
    } catch (error) {
      this.results.failed++;
      this.results.total++;
      console.log(`💥 Error: ${suite.name} - ${error.message}`);
      this.results.errors.push({
        suite: suite.name,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Create test context for a suite
   * @param {string} suiteName - Suite name
   * @returns {Object} Test context
   */
  createTestContext(suiteName) {
    const errors = [];

    return {
      // Assertion methods
      expect: (actual) => ({
        toBe: (expected) => {
          if (actual !== expected) {
            errors.push({
              suite: suiteName,
              type: "assertion",
              message: `Expected ${actual} to be ${expected}`,
              actual,
              expected,
            });
          }
        },
        toEqual: (expected) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            errors.push({
              suite: suiteName,
              type: "assertion",
              message: `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
              actual,
              expected,
            });
          }
        },
        toBeTruthy: () => {
          if (!actual) {
            errors.push({
              suite: suiteName,
              type: "assertion",
              message: `Expected ${actual} to be truthy`,
              actual,
            });
          }
        },
        toBeFalsy: () => {
          if (actual) {
            errors.push({
              suite: suiteName,
              type: "assertion",
              message: `Expected ${actual} to be falsy`,
              actual,
            });
          }
        },
        toThrow: () => {
          let threw = false;
          try {
            if (typeof actual === "function") {
              actual();
            }
          } catch (e) {
            threw = true;
          }
          if (!threw) {
            errors.push({
              suite: suiteName,
              type: "assertion",
              message: "Expected function to throw an error",
              actual,
            });
          }
        },
      }),

      // Test utilities
      describe: (description, testFn) => {
        console.log(`  📝 ${description}`);
        testFn();
      },

      it: (description, testFn) => {
        try {
          testFn();
          console.log(`    ✓ ${description}`);
        } catch (error) {
          console.log(`    ✗ ${description}`);
          errors.push({
            suite: suiteName,
            test: description,
            type: "test",
            message: error.message,
            stack: error.stack,
          });
        }
      },

      // Mock utilities
      mock: (obj, method, implementation) => {
        const original = obj[method];
        obj[method] = implementation;
        return () => {
          obj[method] = original;
        };
      },

      // Async utilities
      waitFor: (condition, timeout = 1000) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const check = () => {
            if (condition()) {
              resolve();
            } else if (Date.now() - startTime > timeout) {
              reject(new Error("Timeout waiting for condition"));
            } else {
              setTimeout(check, 10);
            }
          };
          check();
        });
      },

      // Error tracking
      hasFailures: () => errors.length > 0,
      getErrors: () => errors,
    };
  }

  /**
   * Run function with timeout
   * @param {Function} fn - Function to run
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Promise that resolves/rejects
   */
  runWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn()).then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  /**
   * Print test results
   */
  printResults() {
    console.log("\n" + "=".repeat(50));
    console.log("📊 Test Results Summary");
    console.log("=".repeat(50));

    const passRate = this.results.total > 0 ? ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;

    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log(`⏱️  Total Time: ${this.results.performance.totalTime?.toFixed(2) || 0}ms`);

    if (this.results.errors.length > 0) {
      console.log("\n💥 Errors:");
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.suite}: ${error.message}`);
        if (this.options.verbose && error.stack) {
          console.log(`   Stack: ${error.stack}`);
        }
      });
    }

    if (this.options.verbose && Object.keys(this.results.performance).length > 1) {
      console.log("\n⏱️  Performance Breakdown:");
      Object.entries(this.results.performance).forEach(([suite, time]) => {
        if (suite !== "totalTime") {
          console.log(`  ${suite}: ${time.toFixed(2)}ms`);
        }
      });
    }

    console.log("\n" + (this.results.failed === 0 ? "🎉 All tests passed!" : "❌ Some tests failed"));
  }

  /**
   * Generate test report
   * @returns {Object} Detailed test report
   */
  generateReport() {
    return {
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        passRate: this.results.total > 0 ? (this.results.passed / this.results.total) * 100 : 0,
        totalTime: this.results.performance.totalTime || 0,
      },
      errors: this.results.errors,
      performance: this.results.performance,
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Node.js",
        platform: typeof navigator !== "undefined" ? navigator.platform : process.platform,
      },
    };
  }
}

// Export singleton instance
export const testRunner = new TestRunner();
