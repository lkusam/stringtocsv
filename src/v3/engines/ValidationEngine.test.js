/**
 * Unit tests for ValidationEngine
 */

import { ValidationEngine } from "./ValidationEngine.js";
import { ValidationResult } from "../core/interfaces.js";

describe("ValidationEngine", () => {
  let validationEngine;

  beforeEach(() => {
    validationEngine = new ValidationEngine();
  });

  describe("Initialization", () => {
    test("should initialize with default options", () => {
      expect(validationEngine.options.enablePIIDetection).toBe(true);
      expect(validationEngine.options.enableDuplicateDetection).toBe(true);
      expect(validationEngine.options.maxSampleSize).toBe(1000);
    });

    test("should initialize built-in rules", () => {
      const rules = validationEngine.getAvailableRules();
      expect(rules.length).toBeGreaterThan(0);

      const ruleNames = rules.map((rule) => rule.id);
      expect(ruleNames).toContain("email");
      expect(ruleNames).toContain("phone");
      expect(ruleNames).toContain("url");
      expect(ruleNames).toContain("date");
      expect(ruleNames).toContain("number");
      expect(ruleNames).toContain("required");
    });
  });

  describe("Rule Management", () => {
    test("should add custom rule", () => {
      const customValidator = (value) => value && value.length > 5;

      validationEngine.addCustomRule("minLength", customValidator, {
        name: "Minimum Length",
        description: "Value must be longer than 5 characters",
        severity: "warning",
      });

      const rules = validationEngine.getAvailableRules();
      const customRule = rules.find((rule) => rule.id === "minLength");

      expect(customRule).toBeDefined();
      expect(customRule.name).toBe("Minimum Length");
      expect(customRule.severity).toBe("warning");
    });

    test("should remove rule", () => {
      validationEngine.removeRule("email");

      const rules = validationEngine.getAvailableRules();
      const emailRule = rules.find((rule) => rule.id === "email");

      expect(emailRule).toBeUndefined();
    });

    test("should toggle rule enabled state", () => {
      validationEngine.toggleRule("email", false);

      const rules = validationEngine.getAvailableRules();
      const emailRule = rules.find((rule) => rule.id === "email");

      expect(emailRule.enabled).toBe(false);
    });
  });

  describe("Data Type Detection", () => {
    test("should detect string type", () => {
      expect(validationEngine.detectDataType("hello world")).toBe("string");
      expect(validationEngine.detectDataType("abc123")).toBe("string");
    });

    test("should detect number type", () => {
      expect(validationEngine.detectDataType("123")).toBe("number");
      expect(validationEngine.detectDataType("123.45")).toBe("number");
      expect(validationEngine.detectDataType("-67.89")).toBe("number");
    });

    test("should detect boolean type", () => {
      expect(validationEngine.detectDataType("true")).toBe("boolean");
      expect(validationEngine.detectDataType("false")).toBe("boolean");
      expect(validationEngine.detectDataType("yes")).toBe("boolean");
      expect(validationEngine.detectDataType("no")).toBe("boolean");
      expect(validationEngine.detectDataType("1")).toBe("boolean");
      expect(validationEngine.detectDataType("0")).toBe("boolean");
    });

    test("should detect date type", () => {
      expect(validationEngine.detectDataType("2023-12-25")).toBe("date");
      expect(validationEngine.detectDataType("12/25/2023")).toBe("date");
      expect(validationEngine.detectDataType("December 25, 2023")).toBe("date");
    });

    test("should detect null type", () => {
      expect(validationEngine.detectDataType(null)).toBe("null");
      expect(validationEngine.detectDataType(undefined)).toBe("null");
    });
  });

  describe("Data Parsing", () => {
    test("should parse array data", () => {
      const data = [
        ["name", "age"],
        ["John", "25"],
        ["Jane", "30"],
      ];
      const parsed = validationEngine.parseData(data);

      expect(parsed).toEqual(data);
    });

    test("should parse JSON string", () => {
      const jsonString = '[{"name": "John", "age": 25}, {"name": "Jane", "age": 30}]';
      const parsed = validationEngine.parseData(jsonString);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("John");
    });

    test("should parse CSV string", () => {
      const csvString = "name,age\nJohn,25\nJane,30";
      const parsed = validationEngine.parseData(csvString);

      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual(["name", "age"]);
      expect(parsed[1]).toEqual(["John", "25"]);
    });

    test("should parse single object", () => {
      const obj = { name: "John", age: 25 };
      const parsed = validationEngine.parseData(obj);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(obj);
    });
  });

  describe("Data Structure Analysis", () => {
    test("should analyze tabular data structure", () => {
      const data = [
        ["name", "age", "email"],
        ["John", "25", "john@example.com"],
        ["Jane", "30", "jane@example.com"],
        ["Bob", "invalid", "bob@invalid"],
      ];

      const structure = validationEngine.analyzeDataStructure(data, 1000);

      expect(structure.totalRows).toBe(4);
      expect(structure.statistics.totalColumns).toBe(3);
      expect(structure.columns).toHaveLength(3);

      // Check column analysis
      expect(structure.columns[0].suggestedType).toBe("string"); // name column
      expect(structure.columns[1].suggestedType).toBe("number"); // age column (mostly numbers)
      expect(structure.columns[2].patterns.some((p) => p.name === "email")).toBe(true); // email column
    });

    test("should handle empty data", () => {
      const structure = validationEngine.analyzeDataStructure([], 1000);

      expect(structure.totalRows).toBe(0);
      expect(structure.statistics.totalColumns).toBe(0);
      expect(structure.columns).toHaveLength(0);
    });

    test("should analyze object data", () => {
      const data = [
        { name: "John", age: 25, active: true },
        { name: "Jane", age: 30, active: false },
        { name: "Bob", age: "invalid", active: true },
      ];

      const structure = validationEngine.analyzeDataStructure(data, 1000);

      expect(structure.totalRows).toBe(3);
      expect(structure.statistics.totalColumns).toBe(3);
    });
  });

  describe("Built-in Validation Rules", () => {
    test("should validate email format", () => {
      const emailRule = validationEngine.rules.get("email");

      expect(emailRule.validate("test@example.com")).toBe(true);
      expect(emailRule.validate("valid.email@domain.co.uk")).toBe(true);
      expect(emailRule.validate("invalid-email")).toBe(false);
      expect(emailRule.validate("missing@domain")).toBe(false);
      expect(emailRule.validate("")).toBe(true); // Empty is valid (not required)
    });

    test("should validate phone numbers", () => {
      const phoneRule = validationEngine.rules.get("phone");

      expect(phoneRule.validate("+1234567890")).toBe(true);
      expect(phoneRule.validate("123-456-7890")).toBe(true);
      expect(phoneRule.validate("(123) 456-7890")).toBe(true);
      expect(phoneRule.validate("invalid-phone")).toBe(false);
      expect(phoneRule.validate("")).toBe(true); // Empty is valid
    });

    test("should validate URLs", () => {
      const urlRule = validationEngine.rules.get("url");

      expect(urlRule.validate("https://example.com")).toBe(true);
      expect(urlRule.validate("http://subdomain.example.com/path")).toBe(true);
      expect(urlRule.validate("invalid-url")).toBe(false);
      expect(urlRule.validate("ftp://example.com")).toBe(false); // Only http/https
    });

    test("should validate dates", () => {
      const dateRule = validationEngine.rules.get("date");

      expect(dateRule.validate("2023-12-25")).toBe(true);
      expect(dateRule.validate("12/25/2023")).toBe(true);
      expect(dateRule.validate("December 25, 2023")).toBe(true);
      expect(dateRule.validate("invalid-date")).toBe(false);
      expect(dateRule.validate("2023-13-45")).toBe(false); // Invalid date
    });

    test("should validate numbers", () => {
      const numberRule = validationEngine.rules.get("number");

      expect(numberRule.validate("123")).toBe(true);
      expect(numberRule.validate("123.45")).toBe(true);
      expect(numberRule.validate("-67.89")).toBe(true);
      expect(numberRule.validate("abc")).toBe(false);
      expect(numberRule.validate("")).toBe(true); // Empty is valid
    });

    test("should validate required fields", () => {
      const requiredRule = validationEngine.rules.get("required");

      expect(requiredRule.validate("some value")).toBe(true);
      expect(requiredRule.validate("0")).toBe(true);
      expect(requiredRule.validate("")).toBe(false);
      expect(requiredRule.validate(null)).toBe(false);
      expect(requiredRule.validate(undefined)).toBe(false);
    });
  });

  describe("Full Validation", () => {
    test("should validate simple CSV data", () => {
      const csvData = "name,email,age\nJohn,john@example.com,25\nJane,invalid-email,30";

      const result = validationEngine.validate(csvData, {
        rules: ["email"],
        columns: [
          {}, // name column - no specific rules
          { rules: ["email"] }, // email column
          {}, // age column
        ],
      });

      expect(result).toBeInstanceOf(ValidationResult);
      expect(result.errors.length).toBeGreaterThan(0);

      // Should find email validation error
      const emailError = result.errors.find((error) => error.message.includes("Email Format"));
      expect(emailError).toBeDefined();
      expect(emailError.location.row).toBe(3); // Jane's row
      expect(emailError.location.column).toBe(2); // Email column
    });

    test("should detect duplicate rows", () => {
      const data = [
        ["name", "age"],
        ["John", "25"],
        ["Jane", "30"],
        ["John", "25"], // Duplicate
      ];

      const result = validationEngine.validate(data);

      const duplicateError = result.errors.find((error) => error.message.includes("Duplicate row"));
      expect(duplicateError).toBeDefined();
      expect(duplicateError.location.row).toBe(4);
    });

    test("should detect PII", () => {
      const data = [
        ["name", "ssn", "phone"],
        ["John", "123-45-6789", "+1234567890"],
        ["Jane", "987-65-4321", "555-123-4567"],
      ];

      const result = validationEngine.validate(data);

      const piiErrors = result.errors.filter((error) => error.message.includes("SSN") || error.message.includes("phoneNumber"));
      expect(piiErrors.length).toBeGreaterThan(0);
    });

    test("should validate data structure consistency", () => {
      const data = [
        ["name", "age", "email"],
        ["John", "25"], // Missing email
        ["Jane", "30", "jane@example.com", "extra"], // Extra column
      ];

      const result = validationEngine.validate(data);

      const structureErrors = result.errors.filter((error) => error.type === "structure");
      expect(structureErrors.length).toBeGreaterThan(0);
    });

    test("should handle validation errors gracefully", () => {
      // Add a rule that throws an error
      validationEngine.addCustomRule("errorRule", () => {
        throw new Error("Test error");
      });

      const data = [["test"], ["value"]];
      const result = validationEngine.validate(data, {
        rules: ["errorRule"],
      });

      const systemError = result.errors.find((error) => error.type === "system" && error.message.includes("Test error"));
      expect(systemError).toBeDefined();
    });
  });

  describe("Validation Statistics", () => {
    test("should calculate validation statistics", () => {
      const result = new ValidationResult();

      // Add some test errors
      result.addError("data", "error", "Critical error");
      result.addError("format", "warning", "Format warning");
      result.addError("structure", "info", "Info message");

      result.updateStatistics({
        totalRows: 100,
        totalColumns: 5,
      });

      const stats = validationEngine.getValidationStatistics(result);

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsBySeverity.error).toBe(1);
      expect(stats.errorsBySeverity.warning).toBe(1);
      expect(stats.errorsBySeverity.info).toBe(1);
      expect(stats.errorsByType.data).toBe(1);
      expect(stats.errorsByType.format).toBe(1);
      expect(stats.errorsByType.structure).toBe(1);
      expect(stats.dataQualityScore).toBeGreaterThan(0);
      expect(stats.dataQualityScore).toBeLessThanOrEqual(100);
    });

    test("should calculate perfect quality score for clean data", () => {
      const result = new ValidationResult();
      result.updateStatistics({
        totalRows: 100,
        totalColumns: 5,
      });

      const stats = validationEngine.getValidationStatistics(result);
      expect(stats.dataQualityScore).toBe(100);
    });
  });

  describe("Column Pattern Detection", () => {
    test("should detect email patterns in column", () => {
      const columnData = ["john@example.com", "jane@domain.org", "invalid-email", "bob@company.co.uk"];

      const analysis = { patterns: [], issues: [] };
      validationEngine.detectColumnPatterns(columnData, analysis);

      const emailPattern = analysis.patterns.find((p) => p.name === "email");
      expect(emailPattern).toBeDefined();
      expect(emailPattern.matches).toBe(3); // 3 valid emails out of 4
      expect(emailPattern.percentage).toBe(75);
    });

    test("should detect phone patterns in column", () => {
      const columnData = ["+1234567890", "555-123-4567", "not-a-phone", "9876543210"];

      const analysis = { patterns: [], issues: [] };
      validationEngine.detectColumnPatterns(columnData, analysis);

      const phonePattern = analysis.patterns.find((p) => p.name === "phone");
      expect(phonePattern).toBeDefined();
      expect(phonePattern.matches).toBeGreaterThan(0);
    });
  });

  describe("Custom Validation Options", () => {
    test("should respect disabled options", () => {
      const engine = new ValidationEngine({
        enablePIIDetection: false,
        enableDuplicateDetection: false,
      });

      const data = [
        ["name", "ssn"],
        ["John", "123-45-6789"],
        ["John", "123-45-6789"], // Duplicate with PII
      ];

      const result = engine.validate(data);

      // Should not detect PII or duplicates
      const piiErrors = result.errors.filter((error) => error.message.includes("SSN"));
      const duplicateErrors = result.errors.filter((error) => error.message.includes("Duplicate"));

      expect(piiErrors.length).toBe(0);
      expect(duplicateErrors.length).toBe(0);
    });

    test("should respect sample size limit", () => {
      const largeData = Array.from({ length: 2000 }, (_, i) => [`row${i}`, i]);

      const engine = new ValidationEngine({
        maxSampleSize: 100,
      });

      const structure = engine.analyzeDataStructure(largeData, 100);

      expect(structure.totalRows).toBe(2000);
      expect(structure.sampleRows).toBe(100);
    });
  });
});
