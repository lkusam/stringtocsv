/**
 * MultiColumnProcessor - Engine for processing tabular data with configurable separators
 * Handles multi-column data conversion with automatic format detection and validation
 */

import { ProcessingEngine } from "./ProcessingEngine.js";
import { ValidationResult } from "../core/interfaces.js";

export class MultiColumnProcessor extends ProcessingEngine {
  constructor() {
    super("multi-column");

    // Multi-column specific configuration
    this.separatorDetectors = new Map();
    this.headerDetectors = new Map();
    this.columnAnalyzers = new Map();

    // Initialize built-in detectors
    this.initializeDetectors();
  }

  /**
   * Initialize the multi-column processor
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize base engine
      await super.initialize();

      // Initialize column-specific analyzers
      this.initializeColumnAnalyzers();

      this.isInitialized = true;
      console.log("MultiColumnProcessor initialized successfully");
    } catch (error) {
      console.error("Failed to initialize MultiColumnProcessor:", error);
      throw error;
    }
  }

  /**
   * Process tabular data with multi-column support
   */
  async process(job) {
    const { input, settings } = job;

    try {
      // Parse tabular data
      const parsedData = await this.parseTabularData(input.data, settings.separators?.row || "\n", settings.separators?.column || "\t");

      // Validate structure
      const validation = await this.validateStructure(parsedData, settings);
      if (!validation.isValid && settings.validation?.strict) {
        throw new Error(`Validation failed: ${validation.errors[0]?.message}`);
      }

      // Generate preview if requested
      let preview = null;
      if (settings.generatePreview) {
        preview = this.generatePreview(parsedData, settings);
      }

      // Convert to CSV
      const csvOutput = await this.convertToCSV(parsedData, settings);

      return {
        output: csvOutput,
        preview: preview,
        validation: validation,
        metadata: {
          rows: parsedData.length,
          columns: parsedData.length > 0 ? parsedData[0].length : 0,
          hasHeaders: this.detectHeaders(parsedData),
          dataTypes: this.analyzeDataTypes(parsedData),
          processingMode: "multi-column",
        },
      };
    } catch (error) {
      console.error("Multi-column processing failed:", error);
      throw error;
    }
  }

  /**
   * Parse tabular data with configurable separators
   */
  async parseTabularData(input, rowSeparator = "\n", columnSeparator = "\t") {
    if (!input || typeof input !== "string") {
      throw new Error("Input must be a non-empty string");
    }

    try {
      // Split into rows
      const rows = this.splitRows(input, rowSeparator);

      // Parse each row into columns
      const parsedRows = rows.map((row, index) => {
        try {
          return this.parseRow(row, columnSeparator, index);
        } catch (error) {
          console.warn(`Failed to parse row ${index + 1}: ${error.message}`);
          return [row]; // Fallback to single column
        }
      });

      // Normalize column counts
      const normalizedRows = this.normalizeColumnCounts(parsedRows);

      return normalizedRows;
    } catch (error) {
      console.error("Failed to parse tabular data:", error);
      throw error;
    }
  }

  /**
   * Split input into rows using various row separator strategies
   */
  splitRows(input, rowSeparator) {
    if (rowSeparator === "auto") {
      // Auto-detect row separator
      rowSeparator = this.detectRowSeparator(input);
    }

    // Handle different row separator types
    switch (rowSeparator) {
      case "\n":
      case "newline":
        return input.split(/\r?\n/);
      case "\r\n":
      case "crlf":
        return input.split("\r\n");
      case "\r":
      case "cr":
        return input.split("\r");
      case "double-newline":
        return input.split(/\r?\n\r?\n/);
      default:
        // Custom separator or regex
        if (rowSeparator.startsWith("/") && rowSeparator.endsWith("/")) {
          // Regex separator
          const regex = new RegExp(rowSeparator.slice(1, -1), "g");
          return input.split(regex);
        } else {
          // String separator
          return input.split(rowSeparator);
        }
    }
  }

  /**
   * Parse a single row into columns
   */
  parseRow(row, columnSeparator, rowIndex = 0) {
    if (!row || row.trim() === "") {
      return [];
    }

    if (columnSeparator === "auto") {
      // Auto-detect column separator for this row
      columnSeparator = this.detectColumnSeparator(row);
    }

    // Handle different column separator types
    switch (columnSeparator) {
      case "\t":
      case "tab":
        return this.parseTabSeparated(row);
      case ",":
      case "comma":
        return this.parseCommaSeparated(row);
      case ";":
      case "semicolon":
        return this.parseSemicolonSeparated(row);
      case "|":
      case "pipe":
        return this.parsePipeSeparated(row);
      case " ":
      case "space":
        return this.parseSpaceSeparated(row);
      case "whitespace":
        return this.parseWhitespaceSeparated(row);
      case "fixed-width":
        return this.parseFixedWidth(row, rowIndex);
      default:
        // Custom separator
        if (columnSeparator.startsWith("/") && columnSeparator.endsWith("/")) {
          // Regex separator
          const regex = new RegExp(columnSeparator.slice(1, -1), "g");
          return row.split(regex);
        } else {
          // String separator
          return row.split(columnSeparator);
        }
    }
  }

  /**
   * Parse tab-separated values
   */
  parseTabSeparated(row) {
    return row.split("\t").map((cell) => cell.trim());
  }

  /**
   * Parse comma-separated values (with quote handling)
   */
  parseCommaSeparated(row) {
    const result = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = null;
    let i = 0;

    while (i < row.length) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (!inQuotes && (char === '"' || char === "'")) {
        // Start of quoted field
        inQuotes = true;
        quoteChar = char;
        i++;
      } else if (inQuotes && char === quoteChar) {
        if (nextChar === quoteChar) {
          // Escaped quote
          current += quoteChar;
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          quoteChar = null;
          i++;
        }
      } else if (!inQuotes && char === ",") {
        // Field separator
        result.push(current.trim());
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
  }

  /**
   * Parse semicolon-separated values
   */
  parseSemicolonSeparated(row) {
    return row.split(";").map((cell) => cell.trim());
  }

  /**
   * Parse pipe-separated values
   */
  parsePipeSeparated(row) {
    return row.split("|").map((cell) => cell.trim());
  }

  /**
   * Parse space-separated values
   */
  parseSpaceSeparated(row) {
    return row.split(" ").filter((cell) => cell.trim() !== "");
  }

  /**
   * Parse whitespace-separated values (multiple spaces/tabs)
   */
  parseWhitespaceSeparated(row) {
    return row.split(/\s+/).filter((cell) => cell.trim() !== "");
  }

  /**
   * Parse fixed-width columns (requires column width configuration)
   */
  parseFixedWidth(row, rowIndex) {
    // This would require column width configuration
    // For now, fall back to whitespace separation
    return this.parseWhitespaceSeparated(row);
  }

  /**
   * Detect row separator automatically
   */
  detectRowSeparator(input) {
    const separators = ["\n", "\r\n", "\r"];
    const counts = {};

    separators.forEach((sep) => {
      counts[sep] = (input.match(new RegExp(sep.replace(/\r/g, "\\r").replace(/\n/g, "\\n"), "g")) || []).length;
    });

    // Return separator with highest count
    return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b)) || "\n";
  }

  /**
   * Detect column separator automatically
   */
  detectColumnSeparator(row) {
    const separators = ["\t", ",", ";", "|", " "];
    const scores = {};

    separators.forEach((sep) => {
      const parts = row.split(sep);
      // Score based on number of parts and consistency
      scores[sep] = parts.length > 1 ? parts.length : 0;
    });

    // Return separator with highest score
    return Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b)) || "\t";
  }

  /**
   * Detect separators for entire input
   */
  async detectSeparators(input) {
    const lines = input.split(/\r?\n/).slice(0, 10); // Analyze first 10 lines
    const rowSeparator = this.detectRowSeparator(input);

    // Analyze column separators across multiple lines
    const columnSeparatorCounts = {};
    const separators = ["\t", ",", ";", "|", " "];

    lines.forEach((line) => {
      if (line.trim()) {
        separators.forEach((sep) => {
          const parts = line.split(sep);
          if (parts.length > 1) {
            columnSeparatorCounts[sep] = (columnSeparatorCounts[sep] || 0) + parts.length;
          }
        });
      }
    });

    const bestColumnSeparator = Object.keys(columnSeparatorCounts).reduce((a, b) => ((columnSeparatorCounts[a] || 0) > (columnSeparatorCounts[b] || 0) ? a : b)) || "\t";

    return {
      row: rowSeparator,
      column: bestColumnSeparator,
      confidence: this.calculateSeparatorConfidence(input, rowSeparator, bestColumnSeparator),
    };
  }

  /**
   * Calculate confidence score for detected separators
   */
  calculateSeparatorConfidence(input, rowSep, colSep) {
    const rows = input.split(rowSep);
    const validRows = rows.filter((row) => row.trim());

    if (validRows.length < 2) return 0.1;

    // Check consistency of column counts
    const columnCounts = validRows.map((row) => row.split(colSep).length);
    const mostCommonCount = this.getMostCommon(columnCounts);
    const consistentRows = columnCounts.filter((count) => count === mostCommonCount).length;

    const consistency = consistentRows / validRows.length;
    const hasMultipleColumns = mostCommonCount > 1;

    return hasMultipleColumns ? Math.min(consistency * 0.9 + 0.1, 1.0) : 0.1;
  }

  /**
   * Get most common value in array
   */
  getMostCommon(arr) {
    const counts = {};
    arr.forEach((val) => (counts[val] = (counts[val] || 0) + 1));
    return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
  }

  /**
   * Normalize column counts across all rows
   */
  normalizeColumnCounts(rows) {
    if (rows.length === 0) return [];

    // Find maximum column count
    const maxColumns = Math.max(...rows.map((row) => row.length));

    // Pad rows with empty strings to match max columns
    return rows.map((row) => {
      const normalized = [...row];
      while (normalized.length < maxColumns) {
        normalized.push("");
      }
      return normalized;
    });
  }

  /**
   * Validate tabular data structure
   */
  async validateStructure(parsedData, settings = {}) {
    const result = new ValidationResult();

    if (parsedData.length === 0) {
      result.addError("structure", "error", "No data rows found");
      return result;
    }

    const columnCounts = parsedData.map((row) => row.length);
    const maxColumns = Math.max(...columnCounts);
    const minColumns = Math.min(...columnCounts);

    // Check for consistent column counts
    if (maxColumns !== minColumns) {
      const inconsistentRows = parsedData.map((row, index) => ({ index, count: row.length })).filter((item) => item.count !== maxColumns);

      inconsistentRows.forEach((item) => {
        result.addError("structure", "warning", `Row ${item.index + 1} has ${item.count} columns, expected ${maxColumns}`, { row: item.index + 1, column: 1 }, "Add missing columns or remove extra data");
      });
    }

    // Check for empty rows
    const emptyRows = parsedData.map((row, index) => ({ index, isEmpty: row.every((cell) => !cell.trim()) })).filter((item) => item.isEmpty);

    emptyRows.forEach((item) => {
      result.addError("data", "info", `Row ${item.index + 1} is empty`, { row: item.index + 1, column: 1 }, "Remove empty row or add data");
    });

    // Check for empty columns
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const columnValues = parsedData.map((row) => row[colIndex] || "");
      const emptyCount = columnValues.filter((val) => !val.trim()).length;

      if (emptyCount === parsedData.length) {
        result.addError("data", "warning", `Column ${colIndex + 1} is completely empty`, { row: 1, column: colIndex + 1 }, "Remove empty column or add data");
      } else if (emptyCount > parsedData.length * 0.5) {
        result.addError("data", "info", `Column ${colIndex + 1} is mostly empty (${emptyCount}/${parsedData.length} cells)`, { row: 1, column: colIndex + 1 }, "Consider filling missing values");
      }
    }

    // Update statistics
    result.updateStatistics({
      totalRows: parsedData.length,
      totalColumns: maxColumns,
      emptyRows: emptyRows.length,
      inconsistentRows: columnCounts.filter((count) => count !== maxColumns).length,
      dataQualityScore: this.calculateDataQualityScore(parsedData),
    });

    return result;
  }

  /**
   * Calculate data quality score
   */
  calculateDataQualityScore(parsedData) {
    if (parsedData.length === 0) return 0;

    let score = 100;
    const totalCells = parsedData.reduce((sum, row) => sum + row.length, 0);
    const emptyCells = parsedData.reduce((sum, row) => sum + row.filter((cell) => !cell.trim()).length, 0);

    // Deduct for empty cells
    score -= (emptyCells / totalCells) * 30;

    // Deduct for inconsistent structure
    const columnCounts = parsedData.map((row) => row.length);
    const maxColumns = Math.max(...columnCounts);
    const inconsistentRows = columnCounts.filter((count) => count !== maxColumns).length;
    score -= (inconsistentRows / parsedData.length) * 40;

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate preview of parsed data
   */
  generatePreview(parsedData, settings = {}) {
    const maxRows = settings.previewRows || 10;
    const maxColumns = settings.previewColumns || 10;

    const previewData = parsedData.slice(0, maxRows).map((row) => row.slice(0, maxColumns));

    return {
      data: previewData,
      totalRows: parsedData.length,
      totalColumns: parsedData.length > 0 ? parsedData[0].length : 0,
      hasMore: parsedData.length > maxRows || (parsedData.length > 0 && parsedData[0].length > maxColumns),
    };
  }

  /**
   * Detect if data has headers
   */
  detectHeaders(parsedData) {
    if (parsedData.length < 2) return false;

    const firstRow = parsedData[0];
    const secondRow = parsedData[1];

    // Check if first row contains mostly text while second row contains numbers
    let textInFirst = 0;
    let numbersInSecond = 0;

    for (let i = 0; i < Math.min(firstRow.length, secondRow.length); i++) {
      const firstCell = firstRow[i] || "";
      const secondCell = secondRow[i] || "";

      if (firstCell.trim() && isNaN(firstCell.trim())) {
        textInFirst++;
      }

      if (secondCell.trim() && !isNaN(secondCell.trim())) {
        numbersInSecond++;
      }
    }

    const textRatio = textInFirst / firstRow.length;
    const numberRatio = numbersInSecond / secondRow.length;

    return textRatio > 0.5 && numberRatio > 0.3;
  }

  /**
   * Analyze data types in columns
   */
  analyzeDataTypes(parsedData) {
    if (parsedData.length === 0) return {};

    const columnCount = parsedData[0].length;
    const dataTypes = {};

    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const columnValues = parsedData.map((row) => row[colIndex] || "").filter((val) => val.trim() !== "");

      if (columnValues.length === 0) {
        dataTypes[`column_${colIndex + 1}`] = { type: "empty", confidence: 1.0 };
        continue;
      }

      const typeAnalysis = this.analyzeColumnType(columnValues);
      dataTypes[`column_${colIndex + 1}`] = typeAnalysis;
    }

    return dataTypes;
  }

  /**
   * Analyze data type for a single column
   */
  analyzeColumnType(values) {
    const total = values.length;
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let emailCount = 0;
    let urlCount = 0;

    values.forEach((value) => {
      const trimmed = value.trim();

      if (this.isNumber(trimmed)) numberCount++;
      if (this.isDate(trimmed)) dateCount++;
      if (this.isBoolean(trimmed)) booleanCount++;
      if (this.isEmail(trimmed)) emailCount++;
      if (this.isUrl(trimmed)) urlCount++;
    });

    // Determine primary type based on highest ratio
    const ratios = {
      number: numberCount / total,
      date: dateCount / total,
      boolean: booleanCount / total,
      email: emailCount / total,
      url: urlCount / total,
    };

    const primaryType = Object.keys(ratios).reduce((a, b) => (ratios[a] > ratios[b] ? a : b));

    const confidence = ratios[primaryType];

    // If confidence is low, classify as string
    if (confidence < 0.6) {
      return { type: "string", confidence: 1.0 - confidence };
    }

    return { type: primaryType, confidence };
  }

  /**
   * Check if value is a number
   */
  isNumber(value) {
    return !isNaN(value) && !isNaN(parseFloat(value)) && isFinite(value);
  }

  /**
   * Check if value is a date
   */
  isDate(value) {
    if (value.length < 6) return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.match(/\d/);
  }

  /**
   * Check if value is boolean
   */
  isBoolean(value) {
    const lower = value.toLowerCase();
    return ["true", "false", "yes", "no", "1", "0", "on", "off"].includes(lower);
  }

  /**
   * Check if value is email
   */
  isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Check if value is URL
   */
  isUrl(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert parsed data to CSV format
   */
  async convertToCSV(parsedData, settings = {}) {
    const quoteChar = settings.quoting?.type === "single" ? "'" : '"';
    const delimiter = settings.delimiter || ",";
    const lineEnding = settings.lineEnding || "\n";
    const quoteAll = settings.quoteAll || false;

    const csvRows = parsedData.map((row) => {
      return row
        .map((cell) => {
          const cellValue = String(cell || "");

          if (quoteAll || this.needsQuoting(cellValue, delimiter)) {
            // Escape existing quotes
            const escaped = cellValue.replace(new RegExp(quoteChar, "g"), quoteChar + quoteChar);
            return quoteChar + escaped + quoteChar;
          }

          return cellValue;
        })
        .join(delimiter);
    });

    return csvRows.join(lineEnding);
  }

  /**
   * Check if cell value needs quoting
   */
  needsQuoting(value, delimiter) {
    return value.includes(delimiter) || value.includes("\n") || value.includes("\r") || value.includes('"') || value.includes("'");
  }

  /**
   * Initialize built-in detectors
   */
  initializeDetectors() {
    // Row separator detectors
    this.separatorDetectors.set("newline", /\r?\n/);
    this.separatorDetectors.set("crlf", /\r\n/);
    this.separatorDetectors.set("cr", /\r/);

    // Column separator detectors
    this.separatorDetectors.set("tab", /\t/);
    this.separatorDetectors.set("comma", /,/);
    this.separatorDetectors.set("semicolon", /;/);
    this.separatorDetectors.set("pipe", /\|/);
    this.separatorDetectors.set("space", / /);
  }

  /**
   * Initialize column analyzers
   */
  initializeColumnAnalyzers() {
    // Data type analyzers
    this.columnAnalyzers.set("number", this.isNumber.bind(this));
    this.columnAnalyzers.set("date", this.isDate.bind(this));
    this.columnAnalyzers.set("boolean", this.isBoolean.bind(this));
    this.columnAnalyzers.set("email", this.isEmail.bind(this));
    this.columnAnalyzers.set("url", this.isUrl.bind(this));
  }

  /**
   * Get default settings for multi-column processing
   */
  getDefaultSettings() {
    return {
      ...super.getDefaultSettings(),
      separators: {
        row: "\n",
        column: "\t",
      },
      quoting: {
        type: "double",
        escape: "double",
      },
      validation: {
        enabled: true,
        strict: false,
        rules: ["structure", "data-quality"],
      },
      preview: {
        enabled: true,
        maxRows: 10,
        maxColumns: 10,
      },
      headers: {
        autoDetect: true,
        preserve: true,
      },
    };
  }

  /**
   * Get processing statistics
   */
  getStatistics() {
    return {
      ...super.getStatistics(),
      supportedSeparators: {
        row: Array.from(this.separatorDetectors.keys()),
        column: Array.from(this.separatorDetectors.keys()),
      },
      supportedDataTypes: Array.from(this.columnAnalyzers.keys()),
    };
  }
}
