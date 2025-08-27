/**
 * Unit tests for core components
 */

import { testRunner } from "../TestRunner.js";
import { ProcessingJob, ValidationResult, Template, AppSettings } from "../../core/interfaces.js";
import { MemoryManager } from "../../utils/MemoryManager.js";
import { PerformanceMonitor } from "../../utils/PerformanceMonitor.js";
import { DataFormatter } from "../../utils/DataFormatter.js";
import { TransformationEngine } from "../../engines/TransformationEngine.js";

// Test ProcessingJob interface
testRunner.registerSuite("ProcessingJob Interface", (test) => {
  test.describe("ProcessingJob creation and methods", () => {
    test.it("should create a ProcessingJob with default values", () => {
      const job = new ProcessingJob();
      test.expect(job.type).toBe("simple");
      test.expect(job.status).toBe("pending");
      test.expect(job.id).toBeTruthy();
    });

    test.it("should create a ProcessingJob with custom data", () => {
      const jobData = {
        type: "batch",
        input: { data: "test data", source: "text" },
        settings: { format: "csv" },
      };
      const job = new ProcessingJob(jobData);
      test.expect(job.type).toBe("batch");
      test.expect(job.input.data).toBe("test data");
    });

    test.it("should update progress correctly", () => {
      const job = new ProcessingJob();
      job.updateProgress(50, 100);
      test.expect(job.progress.current).toBe(50);
      test.expect(job.progress.total).toBe(100);
    });

    test.it("should add errors correctly", () => {
      const job = new ProcessingJob();
      job.addError(new Error("Test error"));
      test.expect(job.errors.length).toBe(1);
      test.expect(job.errors[0].message).toBe("Test error");
    });

    test.it("should complete job correctly", () => {
      const job = new ProcessingJob();
      job.complete("output data");
      test.expect(job.status).toBe("completed");
      test.expect(job.output.data).toBe("output data");
      test.expect(job.completed).toBeTruthy();
    });
  });
});

// Test ValidationResult interface
testRunner.registerSuite("ValidationResult Interface", (test) => {
  test.describe("ValidationResult creation and methods", () => {
    test.it("should create a ValidationResult with default values", () => {
      const result = new ValidationResult();
      test.expect(result.isValid).toBe(true);
      test.expect(result.errors.length).toBe(0);
    });

    test.it("should add errors correctly", () => {
      const result = new ValidationResult();
      result.addError("format", "error", "Invalid format");
      test.expect(result.errors.length).toBe(1);
      test.expect(result.isValid).toBe(false);
    });

    test.it("should update statistics correctly", () => {
      const result = new ValidationResult();
      result.updateStatistics({ totalRows: 10, totalColumns: 3 });
      test.expect(result.statistics.totalRows).toBe(10);
      test.expect(result.statistics.totalColumns).toBe(3);
    });
  });
});

// Test Template interface
testRunner.registerSuite("Template Interface", (test) => {
  test.describe("Template creation and methods", () => {
    test.it("should create a Template with default values", () => {
      const template = new Template();
      test.expect(template.name).toBe("Untitled Template");
      test.expect(template.version).toBe("3.0");
      test.expect(template.id).toBeTruthy();
    });

    test.it("should update template correctly", () => {
      const template = new Template();
      const originalModified = template.modified;
      template.update({ mode: "batch" });
      test.expect(template.settings.mode).toBe("batch");
      test.expect(template.modified).not.toBe(originalModified);
    });

    test.it("should clone template correctly", () => {
      const template = new Template({ name: "Original" });
      const cloned = template.clone("Cloned");
      test.expect(cloned.name).toBe("Cloned");
      test.expect(cloned.id).not.toBe(template.id);
    });
  });
});

// Test AppSettings interface
testRunner.registerSuite("AppSettings Interface", (test) => {
  test.describe("AppSettings creation and methods", () => {
    test.it("should create AppSettings with default values", () => {
      const settings = new AppSettings();
      test.expect(settings.version).toBe("3.0");
      test.expect(settings.ui.theme).toBe("classic");
      test.expect(settings.ui.darkMode).toBe(false);
    });

    test.it("should add and remove templates correctly", () => {
      const settings = new AppSettings();
      const template = new Template({ name: "Test Template" });

      settings.addTemplate(template);
      test.expect(settings.templates.length).toBe(1);

      settings.removeTemplate(template.id);
      test.expect(settings.templates.length).toBe(0);
    });

    test.it("should update UI settings correctly", () => {
      const settings = new AppSettings();
      settings.updateUI({ theme: "material", darkMode: true });
      test.expect(settings.ui.theme).toBe("material");
      test.expect(settings.ui.darkMode).toBe(true);
    });
  });
});

// Test MemoryManager
testRunner.registerSuite("MemoryManager", (test) => {
  test.describe("Memory allocation and deallocation", () => {
    test.it("should allocate and deallocate memory correctly", () => {
      const memoryManager = new MemoryManager({ maxMemoryUsage: 1024 });

      const allocationId = memoryManager.allocate("string", 100, "test data");
      test.expect(allocationId).toBeTruthy();
      test.expect(memoryManager.allocatedMemory).toBe(100);

      const success = memoryManager.deallocate(allocationId);
      test.expect(success).toBe(true);
      test.expect(memoryManager.allocatedMemory).toBe(0);
    });

    test.it("should retrieve allocated data correctly", () => {
      const memoryManager = new MemoryManager();
      const testData = "test data";

      const allocationId = memoryManager.allocate("string", 100, testData);
      const retrievedData = memoryManager.get(allocationId);

      test.expect(retrievedData).toBe(testData);
    });

    test.it("should throw error when exceeding memory limit", () => {
      const memoryManager = new MemoryManager({ maxMemoryUsage: 100 });

      test
        .expect(() => {
          memoryManager.allocate("string", 200, "large data");
        })
        .toThrow();
    });
  });
});

// Test PerformanceMonitor
testRunner.registerSuite("PerformanceMonitor", (test) => {
  test.describe("Performance measurement", () => {
    test.it("should start and end measurements correctly", () => {
      const performanceMonitor = new PerformanceMonitor();

      const measurementId = performanceMonitor.startMeasurement("test-operation");
      test.expect(measurementId).toBeTruthy();

      // Simulate some work
      setTimeout(() => {
        performanceMonitor.endMeasurement(measurementId);
      }, 10);
    });

    test.it("should record processing times", () => {
      const performanceMonitor = new PerformanceMonitor();

      performanceMonitor.recordProcessingTime("test-op", 100);
      const metrics = performanceMonitor.getCurrentMetrics();

      test.expect(metrics.averageProcessingTime).toBe(100);
    });

    test.it("should calculate performance score", () => {
      const performanceMonitor = new PerformanceMonitor();

      const score = performanceMonitor.calculatePerformanceScore();
      test.expect(score).toBe(100); // Should start with perfect score
    });
  });
});

// Test DataFormatter
testRunner.registerSuite("DataFormatter", (test) => {
  test.describe("Data formatting", () => {
    test.it("should format strings correctly", () => {
      const formatter = new DataFormatter();

      const result = formatter.formatString("  test  ", { trim: true, case: "upper" });
      test.expect(result).toBe("TEST");
    });

    test.it("should format numbers correctly", () => {
      const formatter = new DataFormatter();

      const result = formatter.formatNumber(1234.567, { format: "decimal" });
      test.expect(result).toBeTruthy(); // Result will be locale-specific
    });

    test.it("should format dates correctly", () => {
      const formatter = new DataFormatter();
      const date = new Date("2023-01-01");

      const result = formatter.formatDate(date, { format: "iso" });
      test.expect(result).toBe("2023-01-01");
    });

    test.it("should flatten objects correctly", () => {
      const formatter = new DataFormatter();
      const obj = { a: { b: { c: "value" } } };

      const result = formatter.flattenObject(obj);
      test.expect(result["a.b.c"]).toBe("value");
    });
  });
});

// Test TransformationEngine
testRunner.registerSuite("TransformationEngine", (test) => {
  test.describe("Data transformation", () => {
    test.it("should add and execute rules correctly", async () => {
      const engine = new TransformationEngine();

      engine.addRule("uppercase", {
        type: "function",
        function: (data) => String(data).toUpperCase(),
      });

      const result = await engine.transform("hello world", { rules: ["uppercase"] });
      test.expect(result.transformedData).toBe("HELLO WORLD");
      test.expect(result.appliedRules.length).toBe(1);
    });

    test.it("should handle regex rules correctly", async () => {
      const engine = new TransformationEngine();

      engine.addRule("remove-spaces", {
        type: "regex",
        pattern: /\s+/g,
        replacement: "-",
      });

      const result = await engine.transform("hello world test", { rules: ["remove-spaces"] });
      test.expect(result.transformedData).toBe("hello-world-test");
    });

    test.it("should validate rule conditions", async () => {
      const engine = new TransformationEngine();

      engine.addRule("conditional", {
        type: "function",
        function: (data) => data + "!",
        conditions: [{ type: "contains", value: "hello" }],
      });

      const result1 = await engine.transform("hello world", { rules: ["conditional"] });
      test.expect(result1.transformedData).toBe("hello world!");

      const result2 = await engine.transform("goodbye world", { rules: ["conditional"] });
      test.expect(result2.transformedData).toBe("goodbye world");
    });
  });
});

console.log("✅ Core component unit tests registered");
