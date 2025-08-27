/**
 * Unit tests for ExportEngine
 */

import { ExportEngine } from "./ExportEngine.js";

describe("ExportEngine", () => {
  let exportEngine;

  beforeEach(() => {
    exportEngine = new ExportEngine();
  });

  describe("Initialization", () => {
    test("should initialize with default options", () => {
      expect(exportEngine.options.streamingThreshold).toBe(1048576);
      expect(exportEngine.options.chunkSize).toBe(10000);
      expect(exportEngine.supportedFormats).toHaveProperty("csv");
      expect(exportEngine.supportedFormats).toHaveProperty("json");
    });

    test("should accept custom options", () => {
      const customEngine = new ExportEngine({
        streamingThreshold: 500000,
        chunkSize: 5000,
      });

      expect(customEngine.options.streamingThreshold).toBe(500000);
      expect(customEngine.options.chunkSize).toBe(5000);
    });
  });

  describe("Data Normalization", () => {
    test("should normalize array data", () => {
      const data = [
        ["name", "age"],
        ["John", 25],
        ["Jane", 30],
      ];
      const normalized = exportEngine.normalizeData(data);

      expect(normalized).toEqual(data);
    });

    test("should normalize object data", () => {
      const data = { name: "John", age: 25 };
      const normalized = exportEngine.normalizeData(data);

      expect(normalized).toEqual([data]);
    });

    test("should normalize JSON string", () => {
      const jsonString = '[{"name": "John", "age": 25}]';
      const normalized = exportEngine.normalizeData(jsonString);

      expect(normalized).toEqual([{ name: "John", age: 25 }]);
    });

    test("should handle empty data", () => {
      expect(exportEngine.normalizeData(null)).toEqual([]);
      expect(exportEngine.normalizeData(undefined)).toEqual([]);
      expect(exportEngine.normalizeData([])).toEqual([]);
    });
  });

  describe("CSV Export", () => {
    test("should export simple CSV", async () => {
      const data = [
        ["name", "age", "city"],
        ["John", 25, "New York"],
        ["Jane", 30, "Boston"],
      ];

      const result = await exportEngine.export(data, "csv");

      expect(result.data).toContain("name,age,city");
      expect(result.data).toContain("John,25,New York");
      expect(result.data).toContain("Jane,30,Boston");
      expect(result.metadata.format).toBe("csv");
      expect(result.metadata.rows).toBe(3);
    });

    test("should handle CSV with quotes", async () => {
      const data = [
        ["name", "description"],
        ["John", "A person with, comma"],
        ["Jane", 'Another "quoted" person'],
      ];

      const result = await exportEngine.export(data, "csv");

      expect(result.data).toContain('"A person with, comma"');
      expect(result.data).toContain('"Another ""quoted"" person"');
    });

    test("should export CSV without headers", async () => {
      const data = [
        ["John", 25],
        ["Jane", 30],
      ];

      const result = await exportEngine.export(data, "csv", {
        includeHeaders: false,
      });

      expect(result.data).not.toContain("Column1,Column2");
      expect(result.data).toContain("John,25");
    });

    test("should export TSV format", async () => {
      const data = [
        ["name", "age"],
        ["John", 25],
      ];

      const result = await exportEngine.export(data, "tsv");

      expect(result.data).toContain("name\tage");
      expect(result.data).toContain("John\t25");
    });

    test("should export Excel-compatible CSV", async () => {
      const data = [
        ["name", "age"],
        ["John", 25],
      ];

      const result = await exportEngine.export(data, "excel");

      expect(result.data).toContain("\r\n"); // Windows line endings
      expect(result.data.startsWith("\uFEFF")).toBe(true); // BOM
    });
  });

  describe("JSON Export", () => {
    test("should export JSON array format", async () => {
      const data = [
        ["name", "age"],
        ["John", 25],
        ["Jane", 30],
      ];

      const result = await exportEngine.export(data, "json", {
        format: "array",
      });

      const parsed = JSON.parse(result.data);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual(["name", "age"]);
    });

    test("should export JSON objects format", async () => {
      const data = [
        ["name", "age"],
        ["John", 25],
        ["Jane", 30],
      ];

      const result = await exportEngine.export(data, "json", {
        format: "objects",
      });

      const parsed = JSON.parse(result.data);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toHaveProperty("Column1", "name");
      expect(parsed[1]).toHaveProperty("Column1", "John");
    });

    test("should export object data as JSON", async () => {
      const data = [
        { name: "John", age: 25 },
        { name: "Jane", age: 30 },
      ];

      const result = await exportEngine.export(data, "json");

      const parsed = JSON.parse(result.data);
      expect(parsed[0]).toEqual({ name: "John", age: 25 });
    });

    test("should include metadata in JSON export", async () => {
      const data = [["John", 25]];

      const result = await exportEngine.export(data, "json", {
        includeMetadata: true,
      });

      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveProperty("data");
      expect(parsed).toHaveProperty("metadata");
      expect(parsed.metadata).toHaveProperty("exportedAt");
    });
  });

  describe("JSON Lines Export", () => {
    test("should export JSONL format", async () => {
      const data = [
        ["name", "age"],
        ["John", 25],
        ["Jane", 30],
      ];

      const result = await exportEngine.export(data, "jsonl");

      const lines = result.data.split("\n");
      expect(lines).toHaveLength(3);

      const firstLine = JSON.parse(lines[0]);
      expect(firstLine).toEqual({ Column1: "name", Column2: "age" });
    });

    test("should export object data as JSONL", async () => {
      const data = [
        { name: "John", age: 25 },
        { name: "Jane", age: 30 },
      ];

      const result = await exportEngine.export(data, "jsonl");

      const lines = result.data.split("\n");
      expect(lines).toHaveLength(2);

      const firstLine = JSON.parse(lines[0]);
      expect(firstLine).toEqual({ name: "John", age: 25 });
    });
  });

  describe("Streaming Export", () => {
    test("should use streaming for large datasets", async () => {
      // Create large dataset
      const largeData = Array.from({ length: 50000 }, (_, i) => [`name${i}`, i, `city${i}`]);

      const result = await exportEngine.export(largeData, "csv");

      expect(result.metadata.streamingUsed).toBe(true);
      expect(result.metadata.chunksProcessed).toBeGreaterThan(1);
      expect(result.data).toContain("name0,0,city0");
      expect(result.data).toContain("name49999,49999,city49999");
    });

    test("should handle streaming JSON export", async () => {
      const largeData = Array.from({ length: 20000 }, (_, i) => ({
        id: i,
        name: `name${i}`,
      }));

      const result = await exportEngine.export(largeData, "json");

      expect(result.metadata.streamingUsed).toBe(true);
      const parsed = JSON.parse(result.data);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(20000);
    });
  });

  describe("Utility Methods", () => {
    test("should estimate data size correctly", () => {
      const smallData = [
        ["a", "b"],
        ["c", "d"],
      ];
      const size = exportEngine.estimateDataSize(smallData);

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe("number");
    });

    test("should get column count", () => {
      const arrayData = [["a", "b", "c"]];
      const objectData = [{ a: 1, b: 2, c: 3 }];

      expect(exportEngine.getColumnCount(arrayData)).toBe(3);
      expect(exportEngine.getColumnCount(objectData)).toBe(3);
      expect(exportEngine.getColumnCount([])).toBe(0);
    });

    test("should generate headers", () => {
      const headers = exportEngine.generateHeaders(3);

      expect(headers).toEqual(["Column1", "Column2", "Column3"]);
    });

    test("should get headers from data", () => {
      const arrayRow = ["a", "b", "c"];
      const objectRow = { name: "John", age: 25 };

      const arrayHeaders = exportEngine.getHeaders(arrayRow);
      const objectHeaders = exportEngine.getHeaders(objectRow);

      expect(arrayHeaders).toEqual(["Column1", "Column2", "Column3"]);
      expect(objectHeaders).toEqual(["name", "age"]);
    });

    test("should format CSV row correctly", () => {
      const values = ["John", "Doe, Jr.", 'New "York"'];
      const formatted = exportEngine.formatCSVRow(values, ",", '"', '"');

      expect(formatted).toBe('John,"Doe, Jr.","New ""York"""');
    });
  });

  describe("Options Validation", () => {
    test("should validate CSV options", () => {
      const validOptions = { delimiter: ",", quote: '"' };
      const invalidOptions = { delimiter: ",,", quote: '""' };

      const validResult = exportEngine.validateOptions("csv", validOptions);
      const invalidResult = exportEngine.validateOptions("csv", invalidOptions);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.warnings.length).toBeGreaterThan(0);
    });

    test("should validate JSON options", () => {
      const validOptions = { format: "objects", indent: 2 };
      const invalidOptions = { format: "invalid", indent: -1 };

      const validResult = exportEngine.validateOptions("json", validOptions);
      const invalidResult = exportEngine.validateOptions("json", invalidOptions);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    test("should reject unsupported format", () => {
      const result = exportEngine.validateOptions("unsupported", {});

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Unsupported format");
    });
  });

  describe("File Operations", () => {
    test("should create blob with correct MIME type", () => {
      const data = "test,data\n1,2";
      const blob = exportEngine.createBlob(data, "csv");

      expect(blob.type).toBe("text/csv");
      expect(blob.size).toBe(data.length);
    });

    test("should generate filename with timestamp", () => {
      const filename = exportEngine.generateFilename("csv", "mydata");

      expect(filename).toMatch(/^mydata-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
    });

    test("should calculate progress correctly", () => {
      const progress = exportEngine.getProgress(50, 100);

      expect(progress.percentage).toBe(50);
      expect(progress.processedRows).toBe(50);
      expect(progress.totalRows).toBe(100);
      expect(progress.remainingRows).toBe(50);
      expect(progress.isComplete).toBe(false);
    });
  });

  describe("Format Information", () => {
    test("should return supported formats", () => {
      const formats = exportEngine.getSupportedFormats();

      expect(formats).toHaveProperty("csv");
      expect(formats).toHaveProperty("json");
      expect(formats).toHaveProperty("tsv");
      expect(formats.csv.name).toBe("CSV (Comma-separated values)");
    });

    test("should return default options for format", () => {
      const csvDefaults = exportEngine.getDefaultOptions("csv");
      const jsonDefaults = exportEngine.getDefaultOptions("json");

      expect(csvDefaults.delimiter).toBe(",");
      expect(csvDefaults.includeHeaders).toBe(true);
      expect(jsonDefaults.format).toBe("array");
      expect(jsonDefaults.indent).toBe(2);
    });
  });

  describe("Error Handling", () => {
    test("should throw error for unsupported format", async () => {
      const data = [["test"]];

      await expect(exportEngine.export(data, "unsupported")).rejects.toThrow("Unsupported export format");
    });

    test("should handle empty data gracefully", async () => {
      const result = await exportEngine.export([], "csv");

      expect(result.data).toBe("");
      expect(result.metadata.rows).toBe(0);
    });

    test("should handle malformed JSON string", () => {
      const malformedJson = '{"invalid": json}';
      const normalized = exportEngine.normalizeData(malformedJson);

      expect(normalized).toEqual([[malformedJson]]);
    });
  });

  describe("Custom Options", () => {
    test("should use custom delimiter for CSV", async () => {
      const data = [
        ["a", "b"],
        ["1", "2"],
      ];

      const result = await exportEngine.export(data, "csv", {
        delimiter: "|",
      });

      expect(result.data).toContain("a|b");
      expect(result.data).toContain("1|2");
    });

    test("should use custom line endings", async () => {
      const data = [["a"], ["b"]];

      const result = await exportEngine.export(data, "csv", {
        lineEnding: "\r\n",
      });

      expect(result.data).toContain("\r\n");
    });

    test("should use custom JSON indentation", async () => {
      const data = [{ name: "John" }];

      const result = await exportEngine.export(data, "json", {
        indent: 4,
      });

      expect(result.data).toContain("    "); // 4 spaces
    });
  });
});
