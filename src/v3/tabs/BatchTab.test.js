/**
 * Unit tests for BatchTab component
 */

import { BatchTab } from "./BatchTab.js";
import { BatchProcessor } from "../engines/BatchProcessor.js";

// Mock DOM environment
const mockDOM = () => {
  global.document = {
    createElement: jest.fn((tag) => ({
      tagName: tag.toUpperCase(),
      innerHTML: "",
      style: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn(),
        contains: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      click: jest.fn(),
    })),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
  };

  global.URL = {
    createObjectURL: jest.fn(() => "blob:mock-url"),
    revokeObjectURL: jest.fn(),
  };

  global.Blob = jest.fn();
};

// Mock File class
class MockFile {
  constructor(name, content, type = "text/plain") {
    this.name = name;
    this.content = content;
    this.type = type;
    this.size = content.length;
    this.lastModified = Date.now();
  }
}

// Mock WorkerPoolManager
class MockWorkerPoolManager {
  async submitJob(type, data) {
    return {
      data: `processed: ${data.data}`,
      metadata: { rows: 10, columns: 3 },
    };
  }
}

describe("BatchTab", () => {
  let batchTab;
  let mockContainer;
  let mockWorkerPool;

  beforeEach(() => {
    mockDOM();

    mockContainer = {
      innerHTML: "",
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      addEventListener: jest.fn(),
      style: {},
    };

    mockWorkerPool = new MockWorkerPoolManager();

    batchTab = new BatchTab({
      workerPool: mockWorkerPool,
      container: mockContainer,
    });
  });

  describe("Initialization", () => {
    test("should initialize with default options", () => {
      expect(batchTab.tabId).toBe("batch");
      expect(batchTab.batchProcessor).toBeInstanceOf(BatchProcessor);
      expect(batchTab.isProcessing).toBe(false);
      expect(batchTab.selectedFiles).toEqual([]);
    });

    test("should create UI elements on initialize", () => {
      batchTab.initialize();
      expect(mockContainer.innerHTML).toContain("batch-tab");
      expect(mockContainer.innerHTML).toContain("file-drop-zone");
      expect(mockContainer.innerHTML).toContain("job-queue");
    });
  });

  describe("File Handling", () => {
    beforeEach(() => {
      batchTab.initialize();
      // Mock DOM queries
      mockContainer.querySelector.mockImplementation((selector) => {
        const mockElement = {
          style: { display: "none" },
          innerHTML: "",
          textContent: "",
          value: "",
          checked: false,
          addEventListener: jest.fn(),
          querySelector: jest.fn(),
          querySelectorAll: jest.fn(() => []),
        };
        return mockElement;
      });
    });

    test("should handle files selected", async () => {
      const files = [new MockFile("test1.csv", "col1,col2\nval1,val2"), new MockFile("test2.txt", "line1\nline2")];

      await batchTab.handleFilesSelected(files);

      expect(batchTab.selectedFiles).toHaveLength(2);
      expect(batchTab.batchProcessor.getAllJobs()).toHaveLength(2);
    });

    test("should add URL job", () => {
      const url = "https://example.com/data.csv";
      batchTab.addUrlJob(url);

      const jobs = batchTab.batchProcessor.getAllJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].input.source).toBe("url");
      expect(jobs[0].input.metadata.url).toBe(url);
    });

    test("should remove file from selection", () => {
      const files = [new MockFile("test1.csv", "data1"), new MockFile("test2.csv", "data2")];

      batchTab.selectedFiles = [...files];
      batchTab.removeFile("test1.csv");

      expect(batchTab.selectedFiles).toHaveLength(1);
      expect(batchTab.selectedFiles[0].name).toBe("test2.csv");
    });
  });

  describe("Settings Management", () => {
    beforeEach(() => {
      batchTab.initialize();

      // Mock form elements
      const mockSelects = {
        "#output-format": { value: "csv" },
        "#separator-type": { value: "comma" },
      };

      const mockCheckboxes = {
        "#enable-validation": { checked: true },
        "#preserve-headers": { checked: true },
      };

      mockContainer.querySelector.mockImplementation((selector) => {
        return (
          mockSelects[selector] ||
          mockCheckboxes[selector] || {
            value: "",
            checked: false,
            style: {},
            innerHTML: "",
            textContent: "",
          }
        );
      });
    });

    test("should get processing settings", () => {
      const settings = batchTab.getProcessingSettings();

      expect(settings.format).toBe("csv");
      expect(settings.validation.enabled).toBe(true);
      expect(settings.headers).toBe(true);
    });

    test("should apply settings to UI", () => {
      const mockElements = {};
      mockContainer.querySelector.mockImplementation((selector) => {
        if (!mockElements[selector]) {
          mockElements[selector] = { value: "", checked: false };
        }
        return mockElements[selector];
      });

      const settings = {
        format: "json",
        validation: { enabled: false },
        headers: false,
      };

      batchTab.applySettings(settings);

      expect(mockElements["#output-format"].value).toBe("json");
      expect(mockElements["#enable-validation"].checked).toBe(false);
      expect(mockElements["#preserve-headers"].checked).toBe(false);
    });
  });

  describe("Batch Processing", () => {
    beforeEach(() => {
      batchTab.initialize();

      // Mock UI elements
      mockContainer.querySelector.mockReturnValue({
        style: { display: "none" },
        innerHTML: "",
        textContent: "",
        disabled: false,
      });

      mockContainer.querySelectorAll.mockReturnValue([]);
    });

    test("should start batch processing", async () => {
      // Add a job first
      batchTab.batchProcessor.addJob({
        input: { data: "test", source: "text" },
        settings: { format: "csv" },
      });

      expect(batchTab.isProcessing).toBe(false);

      const processPromise = batchTab.startBatch();
      expect(batchTab.isProcessing).toBe(true);

      await processPromise;
      expect(batchTab.isProcessing).toBe(false);
    });

    test("should clear job queue", () => {
      // Add some jobs
      batchTab.batchProcessor.addJob({
        input: { data: "test1", source: "text" },
      });
      batchTab.batchProcessor.addJob({
        input: { data: "test2", source: "text" },
      });
      batchTab.selectedFiles = [new MockFile("test.csv", "data")];

      expect(batchTab.batchProcessor.getAllJobs()).toHaveLength(2);
      expect(batchTab.selectedFiles).toHaveLength(1);

      batchTab.clearQueue();

      expect(batchTab.batchProcessor.getAllJobs()).toHaveLength(0);
      expect(batchTab.selectedFiles).toHaveLength(0);
    });
  });

  describe("Event Handling", () => {
    test("should handle job progress", () => {
      const mockJob = { id: "job-123" };
      const updateJobProgressSpy = jest.spyOn(batchTab, "updateJobProgress").mockImplementation();
      const updateOverallProgressSpy = jest.spyOn(batchTab, "updateOverallProgress").mockImplementation();

      // Individual job progress
      batchTab.handleJobProgress(mockJob, 50, 100);
      expect(updateJobProgressSpy).toHaveBeenCalledWith("job-123", 50);

      // Overall progress
      batchTab.handleJobProgress(null, 75, 100);
      expect(updateOverallProgressSpy).toHaveBeenCalledWith(75, 100);
    });

    test("should handle job completion", () => {
      const mockJob = {
        id: "job-123",
        output: { data: "result", metadata: { rows: 10 } },
      };

      const updateJobStatusSpy = jest.spyOn(batchTab, "updateJobStatus").mockImplementation();
      const addJobResultSpy = jest.spyOn(batchTab, "addJobResult").mockImplementation();
      const updateStatsSpy = jest.spyOn(batchTab, "updateStats").mockImplementation();

      batchTab.handleJobComplete(mockJob);

      expect(updateJobStatusSpy).toHaveBeenCalledWith("job-123", "completed");
      expect(addJobResultSpy).toHaveBeenCalledWith(mockJob);
      expect(updateStatsSpy).toHaveBeenCalled();
    });

    test("should handle job errors", () => {
      const mockJob = { id: "job-123" };
      const error = new Error("Processing failed");

      const updateJobStatusSpy = jest.spyOn(batchTab, "updateJobStatus").mockImplementation();
      const showErrorSpy = jest.spyOn(batchTab, "showError").mockImplementation();

      batchTab.handleJobError(mockJob, error);

      expect(updateJobStatusSpy).toHaveBeenCalledWith("job-123", "error");
      expect(showErrorSpy).toHaveBeenCalledWith("Processing failed");
    });

    test("should handle batch completion", () => {
      const jobs = [{ id: "job-1" }, { id: "job-2" }];

      const showResultsSpy = jest.spyOn(batchTab, "showResults").mockImplementation();
      const updateStatsSpy = jest.spyOn(batchTab, "updateStats").mockImplementation();
      const hideProgressSpy = jest.spyOn(batchTab, "hideProgress").mockImplementation();

      batchTab.handleBatchComplete(jobs);

      expect(showResultsSpy).toHaveBeenCalled();
      expect(updateStatsSpy).toHaveBeenCalled();
      expect(hideProgressSpy).toHaveBeenCalled();
    });
  });

  describe("Utility Methods", () => {
    test("should format file sizes correctly", () => {
      expect(batchTab.formatFileSize(1024)).toBe("1.0 KB");
      expect(batchTab.formatFileSize(1048576)).toBe("1.0 MB");
      expect(batchTab.formatFileSize(500)).toBe("500.0 B");
    });

    test("should get job display names", () => {
      const fileJob = {
        input: { metadata: { fileName: "data.csv" } },
      };
      const urlJob = {
        input: { metadata: { url: "https://example.com/path/data.csv" } },
      };
      const textJob = {
        id: "job-12345678",
        input: { metadata: {} },
      };

      expect(batchTab.getJobDisplayName(fileJob)).toBe("data.csv");
      expect(batchTab.getJobDisplayName(urlJob)).toBe("data.csv");
      expect(batchTab.getJobDisplayName(textJob)).toBe("Job 12345678");
    });

    test("should get correct MIME types", () => {
      expect(batchTab.getMimeType("csv")).toBe("text/csv");
      expect(batchTab.getMimeType("json")).toBe("application/json");
      expect(batchTab.getMimeType("tsv")).toBe("text/tab-separated-values");
      expect(batchTab.getMimeType("unknown")).toBe("text/plain");
    });
  });

  describe("State Management", () => {
    test("should get current state", () => {
      batchTab.selectedFiles = [new MockFile("test.csv", "data")];
      batchTab.isProcessing = true;

      const state = batchTab.getState();

      expect(state.selectedFiles).toHaveLength(1);
      expect(state.selectedFiles[0].name).toBe("test.csv");
      expect(state.isProcessing).toBe(true);
      expect(state.settings).toBeDefined();
    });

    test("should set state", () => {
      const state = {
        selectedFiles: [{ name: "test.csv", size: 100, type: "text/csv" }],
        settings: { format: "json", validation: { enabled: false } },
        isProcessing: false,
      };

      const applySettingsSpy = jest.spyOn(batchTab, "applySettings").mockImplementation();

      batchTab.setState(state);

      expect(applySettingsSpy).toHaveBeenCalledWith(state.settings);
    });
  });

  describe("Input Tab Switching", () => {
    beforeEach(() => {
      batchTab.initialize();

      // Mock tab elements
      const mockTabs = [
        { dataset: { tab: "files" }, classList: { toggle: jest.fn() } },
        { dataset: { tab: "urls" }, classList: { toggle: jest.fn() } },
        { dataset: { tab: "text" }, classList: { toggle: jest.fn() } },
      ];

      const mockContents = [
        { id: "files-tab", style: { display: "block" } },
        { id: "urls-tab", style: { display: "none" } },
        { id: "text-tab", style: { display: "none" } },
      ];

      mockContainer.querySelectorAll.mockImplementation((selector) => {
        if (selector === ".input-tab") return mockTabs;
        if (selector === ".input-content") return mockContents;
        return [];
      });
    });

    test("should switch input tabs correctly", () => {
      batchTab.switchInputTab("urls");

      // Should update tab buttons (mocked)
      expect(mockContainer.querySelectorAll).toHaveBeenCalledWith(".input-tab");
      expect(mockContainer.querySelectorAll).toHaveBeenCalledWith(".input-content");
    });
  });
});
