/**
 * ValidationWorker - Specialized worker for background data validation
 * Performs comprehensive data quality checks and validation
 */

// Worker script - runs in Web Worker context
(function () {
  "use strict";

  /**
   * Main validation processing function
   */
  function processValidation(data) {
    const { input, settings, jobId } = data;

    try {
      // Send progress update
      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 10, total: 100, message: "Starting validation..." },
      });

      // Validate input
      if (!input || typeof input !== "string") {
        throw new Error("Invalid input: must be a non-empty string");
      }

      const validationRules = settings.validation || {};
      const mode = settings.mode || "simple";

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 30, total: 100, message: "Analyzing data structure..." },
      });

      // Perform validation based on mode
      let result;
      switch (mode) {
        case "simple":
          result = validateSimpleData(input, validationRules);
          break;
        case "multi-column":
          result = validateTabularData(input, validationRules, settings.separators);
          break;
        case "batch":
          result = validateBatchData(input, validationRules);
          break;
        default:
          throw new Error(`Unknown validation mode: ${mode}`);
      }

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 80, total: 100, message: "Generating validation report..." },
      });

      // Generate comprehensive validation report
      const report = generateValidationReport(result, validationRules);

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 100, total: 100, message: "Validation complete" },
      });

      // Return validation result
      postMessage({
        type: "result",
        jobId: jobId,
        result: {
          isValid: result.isValid,
          errors: result.errors,
          warnings: result.warnings,
          statistics: result.statistics,
          report: report,
          metadata: {
            processingTime: Date.now() - data.startTime,
            mode: mode,
            rulesApplied: Object.keys(validationRules).length,
          },
        },
      });
    } catch (error) {
      postMessage({
        type: "error",
        jobId: jobId,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Validate simple string data
   */
  function validateSimpleData(input, rules) {
    const errors = [];
    const warnings = [];
    const lines = input.split("\n");

    // Basic statistics
    const statistics = {
      totalLines: lines.length,
      emptyLines: 0,
      totalCharacters: input.length,
      averageLineLength: 0,
      maxLineLength: 0,
      minLineLength: Infinity,
      duplicateLines: 0,
      uniqueLines: 0,
    };

    const lineSet = new Set();
    const duplicates = new Set();
    let totalLineLength = 0;

    // Analyze each line
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Track statistics
      if (trimmedLine === "") {
        statistics.emptyLines++;
      } else {
        statistics.maxLineLength = Math.max(statistics.maxLineLength, line.length);
        statistics.minLineLength = Math.min(statistics.minLineLength, line.length);
        totalLineLength += line.length;

        // Check for duplicates
        if (lineSet.has(trimmedLine)) {
          duplicates.add(trimmedLine);
          statistics.duplicateLines++;
        } else {
          lineSet.add(trimmedLine);
        }
      }

      // Apply validation rules
      if (rules.checkEmpty && trimmedLine === "") {
        warnings.push({
          type: "data",
          severity: "warning",
          message: "Empty line detected",
          location: { row: lineNumber, column: 1 },
          suggestion: "Consider removing empty lines",
        });
      }

      if (rules.checkLength && line.length > (rules.maxLineLength || 1000)) {
        warnings.push({
          type: "format",
          severity: "warning",
          message: `Line exceeds maximum length (${line.length} > ${rules.maxLineLength || 1000})`,
          location: { row: lineNumber, column: 1 },
          suggestion: "Consider splitting long lines",
        });
      }

      if (rules.checkCharacters) {
        validateCharacters(line, lineNumber, rules, errors, warnings);
      }

      if (rules.checkEmail && trimmedLine) {
        validateEmail(trimmedLine, lineNumber, errors, warnings);
      }

      if (rules.checkPII) {
        validatePII(trimmedLine, lineNumber, warnings);
      }
    });

    // Calculate final statistics
    statistics.averageLineLength = totalLineLength / (lines.length - statistics.emptyLines) || 0;
    statistics.uniqueLines = lineSet.size;
    statistics.minLineLength = statistics.minLineLength === Infinity ? 0 : statistics.minLineLength;

    // Check for overall data quality issues
    if (rules.checkDuplicates && duplicates.size > 0) {
      warnings.push({
        type: "data",
        severity: "info",
        message: `Found ${duplicates.size} duplicate entries`,
        suggestion: "Consider removing duplicates for cleaner data",
      });
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      statistics,
    };
  }

  /**
   * Validate tabular data
   */
  function validateTabularData(input, rules, separators) {
    const errors = [];
    const warnings = [];
    const rows = input.split(separators?.row || "\n");
    const columnSeparator = separators?.column || "\t";

    const statistics = {
      totalRows: rows.length,
      emptyRows: 0,
      totalColumns: 0,
      inconsistentColumns: 0,
      maxColumns: 0,
      minColumns: Infinity,
      hasHeaders: false,
      dataTypes: {},
    };

    const columnCounts = [];
    const columnData = [];

    // Analyze each row
    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      const trimmedRow = row.trim();

      if (trimmedRow === "") {
        statistics.emptyRows++;
        return;
      }

      // Parse columns
      const columns = parseColumns(trimmedRow, columnSeparator);
      columnCounts.push(columns.length);

      statistics.maxColumns = Math.max(statistics.maxColumns, columns.length);
      statistics.minColumns = Math.min(statistics.minColumns, columns.length);

      // Store column data for analysis
      columns.forEach((column, colIndex) => {
        if (!columnData[colIndex]) {
          columnData[colIndex] = [];
        }
        columnData[colIndex].push(column.trim());
      });

      // Validate row structure
      if (rules.checkStructure && index > 0) {
        const expectedColumns = columnCounts[0];
        if (columns.length !== expectedColumns) {
          statistics.inconsistentColumns++;
          errors.push({
            type: "structure",
            severity: "error",
            message: `Inconsistent column count: expected ${expectedColumns}, got ${columns.length}`,
            location: { row: rowNumber, column: 1 },
            suggestion: "Ensure all rows have the same number of columns",
          });
        }
      }

      // Validate individual columns
      columns.forEach((column, colIndex) => {
        if (rules.checkEmpty && column.trim() === "") {
          warnings.push({
            type: "data",
            severity: "warning",
            message: "Empty cell detected",
            location: { row: rowNumber, column: colIndex + 1 },
            suggestion: "Consider filling empty cells or using placeholder values",
          });
        }
      });
    });

    // Analyze column data types
    columnData.forEach((column, index) => {
      const dataType = analyzeColumnDataType(column);
      statistics.dataTypes[`column_${index + 1}`] = dataType;
    });

    // Detect headers
    if (columnData.length > 0) {
      statistics.hasHeaders = detectHeaders(columnData);
    }

    statistics.totalColumns = statistics.maxColumns;
    statistics.minColumns = statistics.minColumns === Infinity ? 0 : statistics.minColumns;

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      statistics,
    };
  }

  /**
   * Validate batch data
   */
  function validateBatchData(input, rules) {
    // Split input into individual items for batch processing
    const items = input.split("\n\n").filter((item) => item.trim());

    const errors = [];
    const warnings = [];
    const statistics = {
      totalItems: items.length,
      validItems: 0,
      invalidItems: 0,
      emptyItems: 0,
    };

    items.forEach((item, index) => {
      const itemNumber = index + 1;

      if (item.trim() === "") {
        statistics.emptyItems++;
        return;
      }

      // Validate each item as simple data
      const itemValidation = validateSimpleData(item, rules);

      if (itemValidation.isValid) {
        statistics.validItems++;
      } else {
        statistics.invalidItems++;

        // Add item-specific errors
        itemValidation.errors.forEach((error) => {
          errors.push({
            ...error,
            message: `Item ${itemNumber}: ${error.message}`,
            location: {
              item: itemNumber,
              row: error.location?.row,
              column: error.location?.column,
            },
          });
        });
      }

      // Add item-specific warnings
      itemValidation.warnings.forEach((warning) => {
        warnings.push({
          ...warning,
          message: `Item ${itemNumber}: ${warning.message}`,
          location: {
            item: itemNumber,
            row: warning.location?.row,
            column: warning.location?.column,
          },
        });
      });
    });

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      statistics,
    };
  }

  /**
   * Validate characters in a line
   */
  function validateCharacters(line, lineNumber, rules, errors, warnings) {
    // Check for invalid characters
    if (rules.allowedCharacters) {
      const allowedRegex = new RegExp(`[^${rules.allowedCharacters}]`, "g");
      const invalidChars = line.match(allowedRegex);

      if (invalidChars) {
        warnings.push({
          type: "format",
          severity: "warning",
          message: `Invalid characters found: ${[...new Set(invalidChars)].join(", ")}`,
          location: { row: lineNumber, column: 1 },
          suggestion: "Remove or replace invalid characters",
        });
      }
    }

    // Check for control characters
    const controlChars = line.match(/[\x00-\x1F\x7F]/g);
    if (controlChars) {
      warnings.push({
        type: "format",
        severity: "warning",
        message: "Control characters detected",
        location: { row: lineNumber, column: 1 },
        suggestion: "Remove control characters",
      });
    }
  }

  /**
   * Validate email format
   */
  function validateEmail(email, lineNumber, errors, warnings) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      errors.push({
        type: "format",
        severity: "error",
        message: "Invalid email format",
        location: { row: lineNumber, column: 1 },
        suggestion: "Ensure email follows format: user@domain.com",
      });
    }
  }

  /**
   * Check for potential PII (Personally Identifiable Information)
   */
  function validatePII(text, lineNumber, warnings) {
    const piiPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: "SSN" },
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, type: "Credit Card" },
      { pattern: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/, type: "Phone Number" },
    ];

    piiPatterns.forEach(({ pattern, type }) => {
      if (pattern.test(text)) {
        warnings.push({
          type: "privacy",
          severity: "warning",
          message: `Potential ${type} detected`,
          location: { row: lineNumber, column: 1 },
          suggestion: `Consider anonymizing or removing ${type} data`,
        });
      }
    });
  }

  /**
   * Parse columns from a row
   */
  function parseColumns(row, separator) {
    if (separator === "\t") {
      return row.split("\t");
    } else if (separator === "|") {
      return row.split("|");
    } else if (separator === ",") {
      // Handle CSV parsing with quoted values
      return parseCSVRow(row);
    } else {
      return row.split(separator);
    }
  }

  /**
   * Parse CSV row handling quoted values
   */
  function parseCSVRow(row) {
    const result = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < row.length) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Analyze column data type
   */
  function analyzeColumnDataType(columnData) {
    const nonEmptyData = columnData.filter((cell) => cell.trim() !== "");

    if (nonEmptyData.length === 0) {
      return { type: "empty", confidence: 1.0 };
    }

    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    nonEmptyData.forEach((cell) => {
      if (!isNaN(cell) && !isNaN(parseFloat(cell))) {
        numberCount++;
      } else if (isValidDate(cell)) {
        dateCount++;
      } else if (["true", "false", "yes", "no", "1", "0"].includes(cell.toLowerCase())) {
        booleanCount++;
      }
    });

    const total = nonEmptyData.length;
    const numberRatio = numberCount / total;
    const dateRatio = dateCount / total;
    const booleanRatio = booleanCount / total;

    if (numberRatio > 0.8) {
      return { type: "number", confidence: numberRatio };
    } else if (dateRatio > 0.8) {
      return { type: "date", confidence: dateRatio };
    } else if (booleanRatio > 0.8) {
      return { type: "boolean", confidence: booleanRatio };
    } else {
      return { type: "string", confidence: 1.0 - Math.max(numberRatio, dateRatio, booleanRatio) };
    }
  }

  /**
   * Check if a string is a valid date
   */
  function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.length > 6;
  }

  /**
   * Detect if first row contains headers
   */
  function detectHeaders(columnData) {
    if (columnData.length === 0 || columnData[0].length === 0) {
      return false;
    }

    const firstRow = columnData.map((col) => col[0]);

    // Check if first row contains mostly text while other rows contain numbers
    let textInFirst = 0;
    let numbersInRest = 0;
    let totalInRest = 0;

    firstRow.forEach((cell, index) => {
      if (isNaN(cell) && cell.trim() !== "") {
        textInFirst++;
      }

      // Check rest of the column
      for (let i = 1; i < columnData[index].length; i++) {
        const restCell = columnData[index][i];
        totalInRest++;
        if (!isNaN(restCell) && restCell.trim() !== "") {
          numbersInRest++;
        }
      }
    });

    const textRatio = textInFirst / firstRow.length;
    const numberRatio = totalInRest > 0 ? numbersInRest / totalInRest : 0;

    return textRatio > 0.5 && numberRatio > 0.3;
  }

  /**
   * Generate comprehensive validation report
   */
  function generateValidationReport(result, rules) {
    const { errors, warnings, statistics } = result;

    const report = {
      summary: {
        status: result.isValid ? "VALID" : "INVALID",
        errorCount: errors.length,
        warningCount: warnings.length,
        dataQualityScore: calculateDataQualityScore(result),
      },
      recommendations: generateRecommendations(result, rules),
      statistics: statistics,
    };

    return report;
  }

  /**
   * Calculate data quality score (0-100)
   */
  function calculateDataQualityScore(result) {
    const { errors, warnings, statistics } = result;

    let score = 100;

    // Deduct points for errors and warnings
    score -= errors.length * 10;
    score -= warnings.length * 2;

    // Deduct points for data quality issues
    if (statistics.emptyLines) {
      score -= (statistics.emptyLines / statistics.totalLines) * 20;
    }

    if (statistics.duplicateLines) {
      score -= (statistics.duplicateLines / statistics.totalLines) * 10;
    }

    if (statistics.inconsistentColumns) {
      score -= (statistics.inconsistentColumns / statistics.totalRows) * 30;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate recommendations based on validation results
   */
  function generateRecommendations(result, rules) {
    const recommendations = [];
    const { errors, warnings, statistics } = result;

    if (errors.length > 0) {
      recommendations.push("Fix all validation errors before proceeding with data processing");
    }

    if (statistics.emptyLines > 0) {
      recommendations.push("Consider removing empty lines to improve data quality");
    }

    if (statistics.duplicateLines > 0) {
      recommendations.push("Remove duplicate entries to ensure data uniqueness");
    }

    if (statistics.inconsistentColumns > 0) {
      recommendations.push("Standardize column structure across all rows");
    }

    if (warnings.some((w) => w.type === "privacy")) {
      recommendations.push("Review and anonymize any personally identifiable information");
    }

    return recommendations;
  }

  /**
   * Message handler for worker communication
   */
  self.onmessage = function (event) {
    const data = event.data;

    if (data.type === "validate") {
      processValidation(data);
    } else if (data.type === "ping") {
      // Health check
      postMessage({
        type: "pong",
        timestamp: Date.now(),
      });
    } else {
      postMessage({
        type: "error",
        error: `Unknown message type: ${data.type}`,
      });
    }
  };

  // Worker ready signal
  postMessage({
    type: "ready",
    workerType: "validation",
    capabilities: ["simple", "multi-column", "batch", "email", "pii", "structure"],
    timestamp: Date.now(),
  });
})();
