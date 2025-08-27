/**
 * ValidationEngine - Core data validation system
 * Provides configurable validation rules, data type detection, and quality checks
 */

import { ValidationResult } from "../core/interfaces.js";

export class ValidationEngine {
  constructor(options = {}) {
    this.rules = new Map();
    this.customRules = new Map();
    this.options = {
      enablePIIDetection: options.enablePIIDetection ?? true,
      enableDuplicateDetection: options.enableDuplicateDetection ?? true,
      enableFormatValidation: options.enableFormatValidation ?? true,
      enableDataTypeDetection: options.enableDataTypeDetection ?? true,
      maxSampleSize: options.maxSampleSize || 1000,
      ...options,
    };

    this.initializeBuiltInRules();
  }

  /**
   * Initialize built-in validation rules
   */
  initializeBuiltInRules() {
    // Email validation
    this.addRule("email", {
      name: "Email Format",
      description: "Validates email address format",
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      validate: (value) => {
        if (!value || typeof value !== "string") return true;
        return this.rules.get("email").pattern.test(value.trim());
      },
      severity: "error",
      suggestion: "Check email format (example@domain.com)",
    });

    // Phone number validation
    this.addRule("phone", {
      name: "Phone Number",
      description: "Validates phone number format",
      pattern: /^[\+]?[1-9][\d]{0,15}$/,
      validate: (value) => {
        if (!value || typeof value !== "string") return true;
        const cleaned = value.replace(/[\s\-\(\)\.]/g, "");
        return this.rules.get("phone").pattern.test(cleaned);
      },
      severity: "warning",
      suggestion: "Use standard phone format (+1234567890)",
    });

    // URL validation
    this.addRule("url", {
      name: "URL Format",
      description: "Validates URL format",
      validate: (value) => {
        if (!value || typeof value !== "string") return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      severity: "error",
      suggestion: "Use valid URL format (https://example.com)",
    });

    // Date validation
    this.addRule("date", {
      name: "Date Format",
      description: "Validates date format",
      validate: (value) => {
        if (!value || typeof value !== "string") return true;
        const date = new Date(value);
        return !isNaN(date.getTime());
      },
      severity: "warning",
      suggestion: "Use standard date format (YYYY-MM-DD)",
    });

    // Number validation
    this.addRule("number", {
      name: "Numeric Value",
      description: "Validates numeric values",
      validate: (value) => {
        if (!value || value === "") return true;
        return !isNaN(parseFloat(value)) && isFinite(value);
      },
      severity: "error",
      suggestion: "Use valid numeric format",
    });

    // Required field validation
    this.addRule("required", {
      name: "Required Field",
      description: "Validates required fields are not empty",
      validate: (value) => {
        return value !== null && value !== undefined && value !== "";
      },
      severity: "error",
      suggestion: "This field is required",
    });

    // Length validation
    this.addRule("length", {
      name: "Length Validation",
      description: "Validates string length",
      validate: (value, options = {}) => {
        if (!value || typeof value !== "string") return true;
        const { min = 0, max = Infinity } = options;
        return value.length >= min && value.length <= max;
      },
      severity: "warning",
      suggestion: "Check field length requirements",
    });

    // PII detection patterns
    this.piiPatterns = {
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      creditCard: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
      ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      phoneNumber: /\b[\+]?[1-9][\d]{0,15}\b/g,
    };
  }

  /**
   * Add a validation rule
   * @param {string} ruleId - Unique rule identifier
   * @param {Object} rule - Rule configuration
   */
  addRule(ruleId, rule) {
    this.rules.set(ruleId, {
      id: ruleId,
      name: rule.name || ruleId,
      description: rule.description || "",
      validate: rule.validate,
      pattern: rule.pattern,
      severity: rule.severity || "error",
      suggestion: rule.suggestion || "",
      options: rule.options || {},
      enabled: rule.enabled !== false,
    });
  }

  /**
   * Add a custom validation rule
   * @param {string} ruleId - Unique rule identifier
   * @param {Function} validator - Validation function
   * @param {Object} options - Rule options
   */
  addCustomRule(ruleId, validator, options = {}) {
    this.customRules.set(ruleId, {
      id: ruleId,
      name: options.name || ruleId,
      description: options.description || "",
      validate: validator,
      severity: options.severity || "error",
      suggestion: options.suggestion || "",
      enabled: options.enabled !== false,
    });
  }

  /**
   * Remove a validation rule
   * @param {string} ruleId - Rule identifier to remove
   */
  removeRule(ruleId) {
    this.rules.delete(ruleId);
    this.customRules.delete(ruleId);
  }

  /**
   * Enable or disable a rule
   * @param {string} ruleId - Rule identifier
   * @param {boolean} enabled - Whether to enable the rule
   */
  toggleRule(ruleId, enabled) {
    const rule = this.rules.get(ruleId) || this.customRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Validate data with specified rules
   * @param {Array|Object} data - Data to validate
   * @param {Object} options - Validation options
   * @returns {ValidationResult} Validation result
   */
  validate(data, options = {}) {
    const result = new ValidationResult();
    const { rules = [], columns = [], enableBuiltInValidation = true, sampleSize = this.options.maxSampleSize } = options;

    try {
      // Parse data if it's a string
      const parsedData = this.parseData(data);

      // Detect data structure
      const structure = this.analyzeDataStructure(parsedData, sampleSize);
      result.updateStatistics(structure.statistics);

      // Validate data structure
      if (enableBuiltInValidation) {
        this.validateDataStructure(parsedData, structure, result);
      }

      // Apply specific validation rules
      if (rules.length > 0) {
        this.applyValidationRules(parsedData, rules, columns, result);
      }

      // Detect duplicates
      if (this.options.enableDuplicateDetection) {
        this.detectDuplicates(parsedData, result);
      }

      // Detect PII
      if (this.options.enablePIIDetection) {
        this.detectPII(parsedData, result);
      }

      // Validate data consistency
      if (this.options.enableFormatValidation) {
        this.validateDataConsistency(parsedData, structure, result);
      }
    } catch (error) {
      result.addError("system", "error", `Validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Parse input data into structured format
   * @param {*} data - Input data
   * @returns {Array} Parsed data rows
   */
  parseData(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data === "string") {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return [parsed];
      } catch {
        // Parse as CSV/text
        return this.parseCSVData(data);
      }
    }

    if (typeof data === "object" && data !== null) {
      return [data];
    }

    return [];
  }

  /**
   * Parse CSV data into rows
   * @param {string} csvData - CSV string
   * @returns {Array} Parsed rows
   */
  parseCSVData(csvData) {
    const lines = csvData.trim().split("\n");
    const rows = [];

    for (const line of lines) {
      if (line.trim()) {
        // Simple CSV parsing (can be enhanced)
        const row = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
        rows.push(row);
      }
    }

    return rows;
  }

  /**
   * Analyze data structure and detect patterns
   * @param {Array} data - Parsed data
   * @param {number} sampleSize - Maximum rows to analyze
   * @returns {Object} Structure analysis
   */
  analyzeDataStructure(data, sampleSize) {
    const sample = data.slice(0, sampleSize);
    const structure = {
      totalRows: data.length,
      sampleRows: sample.length,
      columns: [],
      statistics: {
        totalRows: data.length,
        totalColumns: 0,
        emptyValues: 0,
        duplicateRows: 0,
        dataTypes: {
          string: 0,
          number: 0,
          date: 0,
          boolean: 0,
          null: 0,
        },
      },
    };

    if (sample.length === 0) {
      return structure;
    }

    // Determine column count (use first row or most common count)
    const columnCounts = sample.map((row) => (Array.isArray(row) ? row.length : Object.keys(row).length));
    const maxColumns = Math.max(...columnCounts);
    structure.statistics.totalColumns = maxColumns;

    // Analyze each column
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const columnData = sample
        .map((row) => {
          if (Array.isArray(row)) {
            return row[colIndex];
          } else if (typeof row === "object") {
            const keys = Object.keys(row);
            return keys[colIndex] ? row[keys[colIndex]] : undefined;
          }
          return undefined;
        })
        .filter((val) => val !== undefined);

      const columnAnalysis = this.analyzeColumn(columnData, colIndex);
      structure.columns.push(columnAnalysis);

      // Update statistics
      Object.keys(columnAnalysis.dataTypes).forEach((type) => {
        structure.statistics.dataTypes[type] += columnAnalysis.dataTypes[type];
      });
      structure.statistics.emptyValues += columnAnalysis.emptyCount;
    }

    return structure;
  }

  /**
   * Analyze individual column data
   * @param {Array} columnData - Column values
   * @param {number} columnIndex - Column index
   * @returns {Object} Column analysis
   */
  analyzeColumn(columnData, columnIndex) {
    const analysis = {
      index: columnIndex,
      name: `Column ${columnIndex + 1}`,
      totalValues: columnData.length,
      emptyCount: 0,
      uniqueCount: 0,
      dataTypes: {
        string: 0,
        number: 0,
        date: 0,
        boolean: 0,
        null: 0,
      },
      patterns: [],
      suggestedType: "string",
      issues: [],
    };

    const uniqueValues = new Set();
    const typeVotes = { string: 0, number: 0, date: 0, boolean: 0 };

    for (const value of columnData) {
      if (value === null || value === undefined || value === "") {
        analysis.emptyCount++;
        analysis.dataTypes.null++;
        continue;
      }

      uniqueValues.add(value);
      const detectedType = this.detectDataType(value);
      analysis.dataTypes[detectedType]++;
      typeVotes[detectedType]++;
    }

    analysis.uniqueCount = uniqueValues.size;

    // Determine suggested type based on majority
    analysis.suggestedType = Object.keys(typeVotes).reduce((a, b) => (typeVotes[a] > typeVotes[b] ? a : b));

    // Detect patterns and issues
    this.detectColumnPatterns(columnData, analysis);
    this.detectColumnIssues(columnData, analysis);

    return analysis;
  }

  /**
   * Detect data type of a value
   * @param {*} value - Value to analyze
   * @returns {string} Detected type
   */
  detectDataType(value) {
    if (value === null || value === undefined) {
      return "null";
    }

    const strValue = String(value).trim();

    // Boolean
    if (["true", "false", "1", "0", "yes", "no"].includes(strValue.toLowerCase())) {
      return "boolean";
    }

    // Number
    if (!isNaN(parseFloat(strValue)) && isFinite(strValue)) {
      return "number";
    }

    // Date
    const date = new Date(strValue);
    if (!isNaN(date.getTime()) && strValue.length > 4) {
      return "date";
    }

    return "string";
  }

  /**
   * Detect patterns in column data
   * @param {Array} columnData - Column values
   * @param {Object} analysis - Column analysis object
   */
  detectColumnPatterns(columnData, analysis) {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+]?[1-9][\d]{0,15}$/,
      url: /^https?:\/\/.+/,
      zipCode: /^\d{5}(-\d{4})?$/,
      creditCard: /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/,
    };

    Object.entries(patterns).forEach(([patternName, regex]) => {
      const matches = columnData.filter((value) => value && typeof value === "string" && regex.test(value.trim())).length;

      if (matches > 0) {
        analysis.patterns.push({
          name: patternName,
          matches,
          percentage: (matches / columnData.length) * 100,
        });
      }
    });
  }

  /**
   * Detect issues in column data
   * @param {Array} columnData - Column values
   * @param {Object} analysis - Column analysis object
   */
  detectColumnIssues(columnData, analysis) {
    // Check for inconsistent formatting
    if (analysis.suggestedType === "date") {
      const dateFormats = new Set();
      columnData.forEach((value) => {
        if (value && !isNaN(new Date(value).getTime())) {
          // Detect common date patterns
          if (/^\d{4}-\d{2}-\d{2}/.test(value)) dateFormats.add("ISO");
          else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) dateFormats.add("US");
          else if (/^\d{1,2}-\d{1,2}-\d{4}/.test(value)) dateFormats.add("EU");
        }
      });

      if (dateFormats.size > 1) {
        analysis.issues.push({
          type: "inconsistent_format",
          message: "Mixed date formats detected",
          severity: "warning",
        });
      }
    }

    // Check for potential encoding issues
    const encodingIssues = columnData.filter((value) => value && typeof value === "string" && /[^\x00-\x7F]/.test(value)).length;

    if (encodingIssues > columnData.length * 0.1) {
      analysis.issues.push({
        type: "encoding",
        message: "Potential encoding issues detected",
        severity: "warning",
      });
    }
  }

  /**
   * Validate data structure consistency
   * @param {Array} data - Parsed data
   * @param {Object} structure - Structure analysis
   * @param {ValidationResult} result - Result object
   */
  validateDataStructure(data, structure, result) {
    // Check for inconsistent row lengths
    const rowLengths = data.map((row) => (Array.isArray(row) ? row.length : Object.keys(row).length));
    const uniqueLengths = [...new Set(rowLengths)];

    if (uniqueLengths.length > 1) {
      const mostCommon = uniqueLengths.reduce((a, b) => (rowLengths.filter((len) => len === a).length > rowLengths.filter((len) => len === b).length ? a : b));

      data.forEach((row, index) => {
        const rowLength = Array.isArray(row) ? row.length : Object.keys(row).length;
        if (rowLength !== mostCommon) {
          result.addError("structure", "warning", `Row ${index + 1} has ${rowLength} columns, expected ${mostCommon}`, { row: index + 1, column: null }, `Add missing columns or remove extra columns`);
        }
      });
    }

    // Check for completely empty rows
    data.forEach((row, index) => {
      const isEmpty = Array.isArray(row) ? row.every((cell) => !cell || cell.toString().trim() === "") : Object.values(row).every((val) => !val || val.toString().trim() === "");

      if (isEmpty) {
        result.addError("structure", "warning", `Row ${index + 1} is completely empty`, { row: index + 1, column: null }, "Remove empty row or add data");
      }
    });
  }

  /**
   * Apply specific validation rules to data
   * @param {Array} data - Parsed data
   * @param {Array} ruleIds - Rule IDs to apply
   * @param {Array} columns - Column configurations
   * @param {ValidationResult} result - Result object
   */
  applyValidationRules(data, ruleIds, columns, result) {
    const activeRules = ruleIds.map((ruleId) => this.rules.get(ruleId) || this.customRules.get(ruleId)).filter((rule) => rule && rule.enabled);

    data.forEach((row, rowIndex) => {
      const rowData = Array.isArray(row) ? row : Object.values(row);

      rowData.forEach((cellValue, colIndex) => {
        const columnConfig = columns[colIndex] || {};
        const columnRules = columnConfig.rules || ruleIds;

        columnRules.forEach((ruleId) => {
          const rule = activeRules.find((r) => r.id === ruleId);
          if (!rule) return;

          try {
            const isValid = rule.validate(cellValue, columnConfig.options);
            if (!isValid) {
              result.addError("data", rule.severity, `${rule.name}: ${rule.suggestion}`, { row: rowIndex + 1, column: colIndex + 1 }, rule.suggestion);
            }
          } catch (error) {
            result.addError("system", "error", `Rule '${rule.name}' failed: ${error.message}`, { row: rowIndex + 1, column: colIndex + 1 });
          }
        });
      });
    });
  }

  /**
   * Detect duplicate rows
   * @param {Array} data - Parsed data
   * @param {ValidationResult} result - Result object
   */
  detectDuplicates(data, result) {
    const seen = new Map();
    const duplicates = [];

    data.forEach((row, index) => {
      const rowKey = JSON.stringify(row);
      if (seen.has(rowKey)) {
        duplicates.push({
          current: index + 1,
          original: seen.get(rowKey) + 1,
        });
      } else {
        seen.set(rowKey, index);
      }
    });

    duplicates.forEach((dup) => {
      result.addError("data", "warning", `Duplicate row found (same as row ${dup.original})`, { row: dup.current, column: null }, "Remove duplicate or verify data");
    });

    // Update statistics
    result.statistics.duplicateRows = duplicates.length;
  }

  /**
   * Detect potentially sensitive information (PII)
   * @param {Array} data - Parsed data
   * @param {ValidationResult} result - Result object
   */
  detectPII(data, result) {
    const piiDetections = {
      ssn: [],
      creditCard: [],
      ipAddress: [],
      phoneNumber: [],
    };

    data.forEach((row, rowIndex) => {
      const rowData = Array.isArray(row) ? row : Object.values(row);

      rowData.forEach((cellValue, colIndex) => {
        if (!cellValue || typeof cellValue !== "string") return;

        Object.entries(this.piiPatterns).forEach(([piiType, pattern]) => {
          const matches = cellValue.match(pattern);
          if (matches) {
            piiDetections[piiType].push({
              row: rowIndex + 1,
              column: colIndex + 1,
              value: matches[0],
            });
          }
        });
      });
    });

    // Report PII findings
    Object.entries(piiDetections).forEach(([piiType, detections]) => {
      if (detections.length > 0) {
        detections.forEach((detection) => {
          result.addError("data", "warning", `Potential ${piiType.toUpperCase()} detected`, { row: detection.row, column: detection.column }, "Consider anonymizing or removing sensitive data");
        });
      }
    });
  }

  /**
   * Validate data consistency across columns
   * @param {Array} data - Parsed data
   * @param {Object} structure - Structure analysis
   * @param {ValidationResult} result - Result object
   */
  validateDataConsistency(data, structure, result) {
    structure.columns.forEach((column) => {
      // Report column-specific issues
      column.issues.forEach((issue) => {
        result.addError("format", issue.severity, `Column ${column.index + 1}: ${issue.message}`, { row: null, column: column.index + 1 }, "Standardize data format in this column");
      });

      // Check for low data quality indicators
      const emptyPercentage = (column.emptyCount / column.totalValues) * 100;
      if (emptyPercentage > 50) {
        result.addError("data", "warning", `Column ${column.index + 1} has ${emptyPercentage.toFixed(1)}% empty values`, { row: null, column: column.index + 1 }, "Consider removing column or filling missing values");
      }

      // Check for potential data type mismatches
      const typeConsistency = Math.max(...Object.values(column.dataTypes)) / column.totalValues;
      if (typeConsistency < 0.8 && column.totalValues > 10) {
        result.addError("format", "warning", `Column ${column.index + 1} has inconsistent data types`, { row: null, column: column.index + 1 }, `Consider standardizing as ${column.suggestedType} type`);
      }
    });
  }

  /**
   * Get all available validation rules
   * @returns {Array} List of available rules
   */
  getAvailableRules() {
    const allRules = [...this.rules.values(), ...this.customRules.values()];
    return allRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      enabled: rule.enabled,
    }));
  }

  /**
   * Get validation statistics
   * @param {ValidationResult} result - Validation result
   * @returns {Object} Statistics summary
   */
  getValidationStatistics(result) {
    const stats = {
      totalErrors: result.errors.length,
      errorsBySeverity: {
        error: 0,
        warning: 0,
        info: 0,
      },
      errorsByType: {
        data: 0,
        format: 0,
        structure: 0,
        system: 0,
      },
      dataQualityScore: 0,
    };

    result.errors.forEach((error) => {
      stats.errorsBySeverity[error.severity]++;
      stats.errorsByType[error.type]++;
    });

    // Calculate data quality score (0-100)
    const totalCells = result.statistics.totalRows * result.statistics.totalColumns;
    const errorWeight = {
      error: 3,
      warning: 1,
      info: 0.1,
    };

    const weightedErrors = result.errors.reduce((sum, error) => sum + (errorWeight[error.severity] || 1), 0);

    stats.dataQualityScore = Math.max(0, Math.min(100, 100 - (weightedErrors / Math.max(totalCells, 1)) * 100));

    return stats;
  }
}
