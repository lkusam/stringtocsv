/**
 * Unit tests for WorkerPoolManager
 * Tests worker pool functionality, load balancing, and lifecycle management
 */

import { WorkerPoolManager } from "./WorkerPoolManager.js";

/**
 * Mock Web Worker for testing
 */
class MockWorker {
  constructor(script) {
    this.script = script;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
    this.terminated = false;
  }

  postMessage(data) {
    // Simulate async processing
    setTimeout(() => {
      if (this.onmessage && !this.terminated) {
        this.onmessage({
          data: {
            type: "result",
            result: { output: "processed", metadata: { processed: true } },
          },
        });
      }
    }, 10);
  }

  terminate() {
    this.terminated = true;
  }
}

// Mock global Worker
global.Worker = MockWorker;

/**
 * Test suite for WorkerPoolManager
 */
export class WorkerPoolManagerTests {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log("🧪 Running WorkerPoolManager Tests...\n");

    const tests = ["testInitialization", "testWorkerCreation", "testJobExecution", "testLoadBalancing", "testAutoScaling", "testErrorHandling", "testRetryLogic", "testMetrics", "testCleanup"];

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
   * Test pool initialization
   */
  async testInitialization() {
    const pool = new WorkerPoolManager(2, {
      autoScale: true,
      minWorkers: 1,
      maxWorkers: 4,
    });

    // Test initial state
    this.assert(pool.isInitialized === false, "Pool should not be initialized initially");
    this.assert(pool.workers.size === 0, "Should have no workers initially");

    // Test initialization
    await pool.initialize();

    this.assert(pool.isInitialized === true, "Pool should be initialized");
    this.assert(pool.workers.size === 1, "Should create minimum workers when auto-scaling");
    this.assert(pool.availableWorkers.length === 1, "Should have available workers");

    await pool.destroy();
  }

  /**
   * Test worker creation and management
   */
  async testWorkerCreation() {
    const pool = new WorkerPoolManager(3);
    await pool.initialize();

    // Test worker creation
    this.assert(pool.workers.size === 3, "Should create specified number of workers");

    // Test worker properties
    const worker = Array.from(pool.workers.values())[0];
    this.assert(worker.id !== undefined, "Worker should have ID");
    this.assert(worker.type === "conversion", "Worker should have default type");
    this.assert(worker.isAvailable === true, "Worker should be available initially");
    this.assert(worker.isHealthy === true, "Worker should be healthy initially");

    // Test creating worker with specific type
    await pool.createWorker("test-worker", "validation");
    const validationWorker = pool.workers.get("test-worker");
    this.assert(validationWorker.type === "validation", "Should create worker with specified type");

    await pool.destroy();
  }

  /**
   * Test job execution
   */
  async testJobExecution() {
    const pool = new WorkerPoolManager(2);
    await pool.initialize();

    // Test basic job execution
    const jobData = { input: "test data" };
    const result = await pool.executeJob(jobData, "conversion", 1);

    this.assert(result !== undefined, "Should return result");
    this.assert(result.output === "processed", "Should process job correctly");

    // Test job statistics
    const stats = pool.getStatistics();
    this.assert(stats.totalJobsCompleted >= 1, "Should track completed jobs");

    await pool.destroy();
  }

  /**
   * Test load balancing strategies
   */
  async testLoadBalancing() {
    // Test round-robin
    const roundRobinPool = new WorkerPoolManager(3, { loadBalanceStrategy: "round-robin" });
    await roundRobinPool.initialize();

    const worker1 = roundRobinPool.getRoundRobinWorker(Array.from(roundRobinPool.workers.values()));
    const worker2 = roundRobinPool.getRoundRobinWorker(Array.from(roundRobinPool.workers.values()));

    this.assert(worker1.id !== worker2.id, "Round-robin should return different workers");

    // Test least-busy
    const leastBusyPool = new WorkerPoolManager(2, { loadBalanceStrategy: "least-busy" });
    await leastBusyPool.initialize();

    const workers = Array.from(leastBusyPool.workers.values());
    const selectedWorker = leastBusyPool.getLeastBusyWorker(workers);

    this.assert(selectedWorker !== null, "Should select a worker with least-busy strategy");

    await roundRobinPool.destroy();
    await leastBusyPool.destroy();
  }

  /**
   * Test auto-scaling functionality
   */
  async testAutoScaling() {
    const pool = new WorkerPoolManager(4, {
      autoScale: true,
      minWorkers: 1,
      maxWorkers: 4,
    });
    await pool.initialize();

    const initialWorkerCount = pool.workers.size;

    // Test scale up
    const scaleUpResult = await pool.scaleUp("conversion");
    this.assert(scaleUpResult === true, "Should successfully scale up");
    this.assert(pool.workers.size === initialWorkerCount + 1, "Should increase worker count");

    // Test scale up limit
    while (pool.workers.size < pool.maxWorkers) {
      await pool.scaleUp("conversion");
    }

    const limitResult = await pool.scaleUp("conversion");
    this.assert(limitResult === false, "Should not scale beyond max workers");

    await pool.destroy();
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    const pool = new WorkerPoolManager(2);
    await pool.initialize();

    // Test job timeout (using very short timeout)
    try {
      await pool.executeJob({ input: "test" }, "conversion", 0, 1); // 1ms timeout
      this.assert(false, "Should have thrown timeout error");
    } catch (error) {
      this.assert(error.message.includes("timed out"), "Should throw timeout error");
    }

    // Test worker error handling
    const worker = Array.from(pool.workers.values())[0];
    pool.handleWorkerError(worker.id, new Error("Test error"));

    this.assert(worker.isHealthy === false, "Worker should be marked unhealthy after error");

    await pool.destroy();
  }

  /**
   * Test retry logic
   */
  async testRetryLogic() {
    const pool = new WorkerPoolManager(1, { retryAttempts: 2 });
    await pool.initialize();

    // Create a job that will fail initially
    let attemptCount = 0;
    const originalExecute = pool.executeJobOnWorker;

    pool.executeJobOnWorker = async (job, worker) => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error("Simulated failure");
      }
      return { output: "success after retry" };
    };

    const result = await pool.executeJob({ input: "test" });
    this.assert(result.output === "success after retry", "Should succeed after retry");
    this.assert(attemptCount === 2, "Should retry the correct number of times");

    // Restore original method
    pool.executeJobOnWorker = originalExecute;
    await pool.destroy();
  }

  /**
   * Test metrics collection
   */
  async testMetrics() {
    const pool = new WorkerPoolManager(2);
    await pool.initialize();

    // Execute some jobs to generate metrics
    await pool.executeJob({ input: "test1" });
    await pool.executeJob({ input: "test2" });

    const stats = pool.getStatistics();
    this.assert(stats.totalJobsCompleted >= 2, "Should track job completion");
    this.assert(stats.totalWorkers === 2, "Should track worker count");

    const detailedStats = pool.getDetailedStatistics();
    this.assert(detailedStats.workers.length === 2, "Should provide detailed worker stats");
    this.assert(detailedStats.workers[0].jobsCompleted >= 0, "Should track individual worker stats");

    await pool.destroy();
  }

  /**
   * Test cleanup and destruction
   */
  async testCleanup() {
    const pool = new WorkerPoolManager(2);
    await pool.initialize();

    // Add some jobs to queue
    const job1Promise = pool.executeJob({ input: "test1" });
    const job2Promise = pool.executeJob({ input: "test2" });

    // Wait for jobs to complete
    await Promise.all([job1Promise, job2Promise]);

    // Test destruction
    await pool.destroy();

    this.assert(pool.isInitialized === false, "Should be marked as not initialized");
    this.assert(pool.workers.size === 0, "Should have no workers after destruction");
    this.assert(pool.availableWorkers.length === 0, "Should have no available workers");
    this.assert(pool.jobQueue.length === 0, "Should have empty job queue");
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
  const tests = new WorkerPoolManagerTests();
  tests.runAllTests().catch(console.error);
}

export { WorkerPoolManagerTests };
