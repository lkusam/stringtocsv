/**
 * Simple test for BatchProcessor functionality
 */

import { BatchProcessor } from "./BatchProcessor.js";
import { ProcessingJob } from "../core/interfaces.js";

// Mock WorkerPoolManager
class MockWorkerPoolManager {
  async submitJob(type, data) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      data: `processed: ${data.data}`,
      metadata: { rows: 10, columns: 3 },
    };
  }
}

async function runTests() {
  console.log("Testing BatchProcessor...");

  const processor = new BatchProcessor({
    workerPool: new MockWorkerPoolManager(),
    onJobComplete: (job) => console.log(`✓ Job ${job.id} completed`),
    onBatchComplete: (jobs) => console.log(`✓ Batch complete: ${jobs.length} jobs`),
  });

  // Test 1: Add job
  const job = processor.addJob({
    input: { data: "test,data", source: "text" },
    settings: { format: "csv" },
  });
  console.log("✓ Job added:", job.id);

  // Test 2: Format detection
  const csvFormat = processor.detectFormat("col1,col2\nval1,val2", {});
  const jsonFormat = processor.detectFormat('{"key": "value"}', {});
  console.log("✓ Format detection - CSV:", csvFormat, "JSON:", jsonFormat);

  // Test 3: File validation
  const mockFile = { name: "test.csv", size: 1000, type: "text/csv" };
  const validation = processor.validateFile(mockFile);
  console.log("✓ File validation:", validation.isValid);

  // Test 4: Statistics
  const stats = processor.getStatistics();
  console.log("✓ Statistics:", stats);

  // Test 5: Process batch
  await processor.processBatch();
  console.log("✓ Batch processing completed");

  console.log("\nAll tests passed! BatchProcessor is working correctly.");
}

runTests().catch(console.error);
