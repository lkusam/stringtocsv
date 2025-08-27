/**
 * Unit tests for BatchProcessor
 */

import { BatchProcessor } from "./BatchProcessor.js";
import { ProcessingJob } from "../core/interfaces.js";

// Mock WorkerPoolManager
class MockWorkerPoolManager {
  async submitJob(type, data) {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      data: `processed: ${data.data}`,
      metadata: {
        rows: 10,
        columns: 3,
        processedAt: new Date().toISOString(),
      },
    };
  }
}

// Mock File class for testing
class MockFile {
  constructor(name, content, type = "text/plain") {
    this.name = name;
    this.content = content;
    this.type = type;
    this.size = content.length;
    this.lastModified = Date.now();
  }
}

describe("BatchProcessor", () => {
  let batchProcessor;
  let mockWorkerPool;
  let jobProgressSpy;
  let jobCompleteSpy;
  let jobErrorSpy;
  let batchCompleteSpy;

  beforeEach(() => {
    mockWorkerPool = new MockWorkerPoolManager();
    jobProgressSpy = jest.fn();
    jobCompleteSpy = jest.fn();
    jobErrorSpy = jest.fn();
    batchCompleteSpy = jest.fn();

    batchProcessor = new BatchProcessor({
      workerPool: mockWorkerPool,
      maxConcurrentJobs: 2,
      onJobProgress: jobProgressSpy,
      onJobComplete: jobCompleteSpy,
      onJobError: jobErrorSpy,
      onBatchComplete: batchCompleteSpy,
    });
  });

  describe("Job Management", () => {
    test("should add a new job", () => {
      const job = batchProcessor.addJob({
        input: { data: "test data", source: "text" },
        settings: { format: "csv" },
      });

      expect(job).toBeInstanceOf(ProcessingJob);
      expect(job.type).toBe("batch");
      expect(job.status).toBe("pending");
      expect(batchProcessor.getAllJobs()).toHaveLength(1);
    });

    test("should add multiple jobs from files", async () => {
      const files = [new MockFile("test1.csv", "col1,col2\nval1,val2"), new MockFile("test2.txt", "line1\nline2")];

      const jobs = await batchProcessor.addFilesJobs(files, { format: "auto" });

      expect(jobs).toHaveLength(2);
      expect(jobs[0].input.metadata.fileName).toBe("test1.csv");
      expect(jobs[1].input.metadata.fileName).toBe("test2.txt");
    });

    test("should add URL job", () => {
      const job = batchProcessor.addUrlJob("https://example.com/data.csv", {
        format: "csv",
      });

      expect(job.input.source).toBe("url");
      expect(job.input.metadata.url).toBe("https://example.com/data.csv");
      expect(job.settings.url).toBe("https://example.com/data.csv");
    });

    test("should get job by ID", () => {
      const job = batchProcessor.addJob({
        input: { data: "test", source: "text" },
      });

      const retrieved = batchProcessor.getJob(job.id);
      expect(retrieved).toBe(job);
    });

    test("should cancel pending job", () => {
      const job = batchProcessor.addJob({
        input: { data: "test", source: "text" },
      });

      const cancelled = batchProcessor.cancelJob(job.id);
      expect(cancelled).toBe(true);
      expect(job.status).toBe("error");
      expect(job.errors).toHaveLength(1);
    });
  });

  describe("File Validation", () => {
    test("should validate file size", () => {
      const smallFile = new MockFile("small.txt", "small content");
      const largeFile = new MockFile("large.txt", "x".repeat(20 * 1024 * 1024)); // 20MB

      const smallResult = batchProcessor.validateFile(smallFile);
      const largeResult = batchProcessor.validateFile(largeFile);

      expect(smallResult.isValid).toBe(true);
      expect(largeResult.isValid).toBe(false);
      expect(largeResult.errors[0].type).toBe("size");
    });

    test("should validate file format", () => {
      const csvFile = new MockFile("data.csv", "col1,col2", "text/csv");
      const exeFile = new MockFile("virus.exe", "malicious content", "application/exe");

      const csvResult = batchProcessor.validateFile(csvFile);
      const exeResult = batchProcessor.validateFile(exeFile);

      expect(csvResult.isValid).toBe(true);
      expect(exeResult.errors.some((e) => e.type === "format")).toBe(true);
    });

    test("should detect empty files", () => {
      const emptyFile = new MockFile("empty.txt", "");
      const result = batchProcessor.validateFile(emptyFile);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe("content");
    });
  });

  describe("Format Detection", () => {
    test("should detect JSON format", () => {
      const jsonData = '{"key": "value"}';
      const format = batchProcessor.detectFormat(jsonData, {});
      expect(format).toBe("json");
    });

    test("should detect CSV format", () => {
      const csvData = "col1,col2,col3\nval1,val2,val3";
      const format = batchProcessor.detectFormat(csvData, {});
      expect(format).toBe("csv");
    });

    test("should detect format from file extension", () => {
      const format = batchProcessor.detectFormat("some data", {
        fileName: "data.json",
      });
      expect(format).toBe("json");
    });

    test("should default to txt for unknown format", () => {
      const format = batchProcessor.detectFormat("plain text data", {});
      expect(format).toBe("txt");
    });
  });

  describe("Batch Processing", () => {
    test("should process single job", async () => {
      const job = batchProcessor.addJob({
        input: { data: "test data", source: "text" },
        settings: { format: "csv" },
      });

      await batchProcessor.processBatch();

      expect(job.status).toBe("completed");
      expect(job.output.data).toBe("processed: test data");
      expect(jobCompleteSpy).toHaveBeenCalledWith(job);
      expect(batchCompleteSpy).toHaveBeenCalled();
    });

    test("should process multiple jobs concurrently", async () => {
      const job1 = batchProcessor.addJob({
        input: { data: "data1", source: "text" },
      });
      const job2 = batchProcessor.addJob({
        input: { data: "data2", source: "text" },
      });
      const job3 = batchProcessor.addJob({
        input: { data: "data3", source: "text" },
      });

      const startTime = Date.now();
      await batchProcessor.processBatch();
      const endTime = Date.now();

      // Should process concurrently (not sequentially)
      expect(endTime - startTime).toBeLessThan(300); // Less than 3 * 100ms
      expect(job1.status).toBe("completed");
      expect(job2.status).toBe("completed");
      expect(job3.status).toBe("completed");
    });

    test("should handle job errors gracefully", async () => {
      // Mock worker to throw error
      mockWorkerPool.submitJob = jest.fn().mockRejectedValue(new Error("Processing failed"));

      const job = batchProcessor.addJob({
        input: { data: "bad data", source: "text" },
      });

      await batchProcessor.processBatch();

      expect(job.status).toBe("error");
      expect(job.errors).toHaveLength(1);
      expect(jobErrorSpy).toHaveBeenCalledWith(job, expect.any(Error));
    });

    test("should report progress during batch processing", async () => {
      batchProcessor.addJob({ input: { data: "data1", source: "text" } });
      batchProcessor.addJob({ input: { data: "data2", source: "text" } });

      await batchProcessor.processBatch();

      // Should report individual job progress
      expect(jobProgressSpy).toHaveBeenCalledWith(expect.any(ProcessingJob), expect.any(Number), 100);

      // Should report overall batch progress
      expect(jobProgressSpy).toHaveBeenCalledWith(null, expect.any(Number), 2);
    });
  });

  describe("Statistics", () => {
    test("should calculate batch statistics", () => {
      const job1 = batchProcessor.addJob({
        input: { data: "data1", source: "text", metadata: { size: 100 } },
      });
      const job2 = batchProcessor.addJob({
        input: { data: "data2", source: "text", metadata: { size: 200 } },
      });

      job1.complete();
      job2.fail(new Error("Test error"));

      const stats = batchProcessor.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.error).toBe(1);
      expect(stats.totalSize).toBe(300);
      expect(stats.processedSize).toBe(100);
    });
  });

  describe("Utility Methods", () => {
    test("should format file sizes correctly", () => {
      expect(batchProcessor.formatFileSize(1024)).toBe("1.0 KB");
      expect(batchProcessor.formatFileSize(1048576)).toBe("1.0 MB");
      expect(batchProcessor.formatFileSize(500)).toBe("500.0 B");
    });

    test("should extract file extensions", () => {
      expect(batchProcessor.getFileExtension("file.csv")).toBe("csv");
      expect(batchProcessor.getFileExtension("data.json")).toBe("json");
      expect(batchProcessor.getFileExtension("noextension")).toBe(null);
    });

    test("should clear all jobs", () => {
      batchProcessor.addJob({ input: { data: "test", source: "text" } });
      batchProcessor.addJob({ input: { data: "test2", source: "text" } });

      expect(batchProcessor.getAllJobs()).toHaveLength(2);

      batchProcessor.clearJobs();

      expect(batchProcessor.getAllJobs()).toHaveLength(0);
    });
  });
});

// Mock global fetch for URL loading tests
global.fetch = jest.fn();

describe("BatchProcessor URL Loading", () => {
  let batchProcessor;

  beforeEach(() => {
    batchProcessor = new BatchProcessor({
      workerPool: new MockWorkerPoolManager(),
    });
    fetch.mockClear();
  });

  test("should load data from URL successfully", async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve("csv,data\nval1,val2"),
      headers: {
        get: (header) => {
          if (header === "content-length") return "20";
          if (header === "content-type") return "text/csv";
          return null;
        },
      },
    };

    fetch.mockResolvedValue(mockResponse);

    const job = new ProcessingJob({
      input: { source: "url" },
      settings: { url: "https://example.com/data.csv" },
    });

    await batchProcessor.loadUrlData(job);

    expect(job.input.data).toBe("csv,data\nval1,val2");
    expect(job.input.metadata.size).toBe(20);
    expect(job.input.metadata.contentType).toBe("text/csv");
  });

  test("should handle URL loading errors", async () => {
    fetch.mockRejectedValue(new Error("Network error"));

    const job = new ProcessingJob({
      input: { source: "url" },
      settings: { url: "https://example.com/data.csv" },
    });

    await expect(batchProcessor.loadUrlData(job)).rejects.toThrow("Failed to load URL");
  });

  test("should handle HTTP errors", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
    };

    fetch.mockResolvedValue(mockResponse);

    const job = new ProcessingJob({
      input: { source: "url" },
      settings: { url: "https://example.com/notfound.csv" },
    });

    await expect(batchProcessor.loadUrlData(job)).rejects.toThrow("HTTP 404: Not Found");
  });
});
