/**
 * ExportEngine - Multi-format export system with streaming support
 * Supports CSV, TSV, JSON, and Excel formats with configurable options
 */

export class ExportEngine {
  constructor(options = {}) {
    this.options = {
      streamingThreshold: options.streamingThreshold || 1048576, // 1MB
      chunkSize: options.chunkSize || 10000, // rows per chunk
      maxMemoryUsage: options.maxMemoryUsage || 50 * 1024 * 1024, // 50MB
      ...options,
    };

    this.supportedFormats = {
      csv: {
        name: "CSV (Comma-separated values)",
        extension: "csv",
        mimeType: "text/csv",
        supportsStreaming: true,
      },
      tsv: {
        name: "TSV (Tab-separated values)",
        extension: "tsv",
        mimeType: "text/tab-separated-values",
        supportsStreaming: true,
      },
      json: {
        name: "JSON (JavaScript Object Notation)",
        extension: "json",
        mimeType: "application/json",
        supportsStreaming: true,
      },
      excel: {
        name: "Excel CSV (Excel-compatible)",
        extension: "csv",
        mimeType: "text/csv",
        supportsStreaming: true,
      },
      jsonl: {
        name: "JSON Lines (Newline-delimited JSON)",
        extension: "jsonl",
        mimeType: "application/x-jsonlines",
        supportsStreaming: true,
      },
    };

    this.defaultOptions = {
      csv: {
        delimiter: ",",
        quote: '"',
        escape: '"',
        lineEnding: "\n",
        includeHeaders: true,
        encoding: "utf-8",
        bom: false,
      },
      tsv: {
        delimiter: "\t",
        quote: '"',
        escape: '"',
        lineEnding: "\n",
        includeHeaders: true,
        encoding: "utf-8",
        bom: false,
      },
      json: {
        format: "array", // 'array' | 'objects'
        indent: 2,
        encoding: "utf-8",
        includeMetadata: false,
      },
      excel: {
        delimiter: ",",
        quote: '"',
        escape: '"',
        lineEnding: "\r\n",
        includeHeaders: true,
        encoding: "utf-8",
        bom: true,
      },
      jsonl: {
        encoding: "utf-8",
        includeMetadata: false,
      },
    };
  }

  /**
   * Export data in specified format
   * @param {Array|Object} data - Data to export
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async export(data, format, options = {}) {
    if (!this.supportedFormats[format]) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const exportOptions = {
      ...this.defaultOptions[format],
      ...options,
    };

    // Normalize data structure
    const normalizedData = this.normalizeData(data);

    // Determine if streaming is needed
    const dataSize = this.estimateDataSize(normalizedData);
    const useStreaming = dataSize > this.options.streamingThreshold;

    let result;
    if (useStreaming && this.supportedFormats[format].supportsStreaming) {
      result = await this.exportWithStreaming(normalizedData, format, exportOptions);
    } else {
      result = await this.exportInMemory(normalizedData, format, exportOptions);
    }

    return {
      data: result.data,
      metadata: {
        format,
        size: result.data.length,
        rows: normalizedData.length,
        columns: this.getColumnCount(normalizedData),
        encoding: exportOptions.encoding,
        compressed: result.compressed || false,
        streamingUsed: useStreaming,
        exportTime: result.exportTime,
        ...result.metadata,
      },
    };
  }

  /**
   * Export data in memory (for smaller datasets)
   * @param {Array} data - Normalized data
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportInMemory(data, format, options) {
    const startTime = Date.now();
    let exportedData;

    switch (format) {
      case "csv":
      case "tsv":
      case "excel":
        exportedData = this.exportCSV(data, options);
        break;
      case "json":
        exportedData = this.exportJSON(data, options);
        break;
      case "jsonl":
        exportedData = this.exportJSONL(data, options);
        break;
      default:
        throw new Error(`Export method not implemented for format: ${format}`);
    }

    // Add BOM if required
    if (options.bom && options.encoding === "utf-8") {
      exportedData = "\uFEFF" + exportedData;
    }

    return {
      data: exportedData,
      exportTime: Date.now() - startTime,
      metadata: {},
    };
  }

  /**
   * Export data with streaming (for larger datasets)
   * @param {Array} data - Normalized data
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportWithStreaming(data, format, options) {
    const startTime = Date.now();
    const chunks = [];
    let totalSize = 0;

    // Add BOM if required
    if (options.bom && options.encoding === "utf-8") {
      chunks.push("\uFEFF");
      totalSize += 3;
    }

    // Export headers if needed
    if (this.needsHeaders(format, options)) {
      const headers = this.exportHeaders(data, format, options);
      chunks.push(headers);
      totalSize += headers.length;
    }

    // Export data in chunks
    const chunkSize = this.options.chunkSize;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const exportedChunk = await this.exportChunk(chunk, format, options, i > 0);

      chunks.push(exportedChunk);
      totalSize += exportedChunk.length;

      // Yield control to prevent blocking
      if (i % (chunkSize * 5) === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Check memory usage
      if (totalSize > this.options.maxMemoryUsage) {
        throw new Error("Export exceeds maximum memory usage limit");
      }
    }

    // Add closing elements if needed
    const closing = this.getClosingElements(format, options);
    if (closing) {
      chunks.push(closing);
    }

    return {
      data: chunks.join(""),
      exportTime: Date.now() - startTime,
      metadata: {
        chunksProcessed: Math.ceil(data.length / chunkSize),
      },
    };
  }

  /**
   * Export CSV format
   * @param {Array} data - Data to export
   * @param {Object} options - CSV options
   * @returns {string} CSV string
   */
  exportCSV(data, options) {
    if (data.length === 0) return "";

    const { delimiter, quote, escape, lineEnding, includeHeaders } = options;
    const lines = [];

    // Add headers if requested
    if (includeHeaders && data.length > 0) {
      const headers = this.getHeaders(data[0]);
      lines.push(this.formatCSVRow(headers, delimiter, quote, escape));
    }

    // Add data rows
    for (const row of data) {
      const values = Array.isArray(row) ? row : this.getRowValues(row, data[0]);
      lines.push(this.formatCSVRow(values, delimiter, quote, escape));
    }

    return lines.join(lineEnding);
  }

  /**
   * Export JSON format
   * @param {Array} data - Data to export
   * @param {Object} options - JSON options
   * @returns {string} JSON string
   */
  exportJSON(data, options) {
    const { format, indent, includeMetadata } = options;
    let exportData;

    if (format === "objects" && data.length > 0) {
      // Convert arrays to objects if needed
      if (Array.isArray(data[0])) {
        const headers = this.generateHeaders(data[0].length);
        exportData = data.map((row) => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      } else {
        exportData = data;
      }
    } else {
      exportData = data;
    }

    const result = {
      data: exportData,
    };

    if (includeMetadata) {
      result.metadata = {
        exportedAt: new Date().toISOString(),
        rowCount: data.length,
        columnCount: this.getColumnCount(data),
        format: "json",
      };
    }

    return JSON.stringify(includeMetadata ? result : exportData, null, indent);
  }

  /**
   * Export JSON Lines format
   * @param {Array} data - Data to export
   * @param {Object} options - JSONL options
   * @returns {string} JSONL string
   */
  exportJSONL(data, options) {
    const lines = [];

    for (const row of data) {
      let obj;
      if (Array.isArray(row)) {
        // Convert array to object
        const headers = this.generateHeaders(row.length);
        obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
      } else {
        obj = row;
      }

      lines.push(JSON.stringify(obj));
    }

    return lines.join("\n");
  }

  /**
   * Export chunk of data
   * @param {Array} chunk - Data chunk
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @param {boolean} skipHeaders - Whether to skip headers
   * @returns {string} Exported chunk
   */
  async exportChunk(chunk, format, options, skipHeaders = false) {
    const chunkOptions = { ...options };

    // Skip headers for subsequent chunks
    if (skipHeaders) {
      chunkOptions.includeHeaders = false;
    }

    switch (format) {
      case "csv":
      case "tsv":
      case "excel":
        return this.exportCSV(chunk, chunkOptions);
      case "json":
        // For JSON streaming, export as array elements
        return this.exportJSONChunk(chunk, chunkOptions, skipHeaders);
      case "jsonl":
        return this.exportJSONL(chunk, chunkOptions);
      default:
        throw new Error(`Chunk export not implemented for format: ${format}`);
    }
  }

  /**
   * Export JSON chunk for streaming
   * @param {Array} chunk - Data chunk
   * @param {Object} options - Export options
   * @param {boolean} skipHeaders - Whether this is not the first chunk
   * @returns {string} JSON chunk
   */
  exportJSONChunk(chunk, options, skipHeaders) {
    const { format, indent } = options;
    let exportData;

    if (format === "objects" && chunk.length > 0) {
      if (Array.isArray(chunk[0])) {
        const headers = this.generateHeaders(chunk[0].length);
        exportData = chunk.map((row) => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      } else {
        exportData = chunk;
      }
    } else {
      exportData = chunk;
    }

    const jsonString = JSON.stringify(exportData, null, indent);

    // Remove array brackets for streaming (except first and last chunks)
    if (skipHeaders) {
      // Remove opening bracket and add comma
      return "," + jsonString.slice(1, -1);
    } else {
      // Remove closing bracket for first chunk
      return jsonString.slice(0, -1);
    }
  }

  /**
   * Format CSV row
   * @param {Array} values - Row values
   * @param {string} delimiter - Field delimiter
   * @param {string} quote - Quote character
   * @param {string} escape - Escape character
   * @returns {string} Formatted CSV row
   */
  formatCSVRow(values, delimiter, quote, escape) {
    return values
      .map((value) => {
        let stringValue = String(value || "");

        // Check if quoting is needed
        const needsQuoting = stringValue.includes(delimiter) || stringValue.includes(quote) || stringValue.includes("\n") || stringValue.includes("\r");

        if (needsQuoting) {
          // Escape quotes
          stringValue = stringValue.replace(new RegExp(quote, "g"), escape + quote);
          // Wrap in quotes
          stringValue = quote + stringValue + quote;
        }

        return stringValue;
      })
      .join(delimiter);
  }

  /**
   * Normalize data structure
   * @param {*} data - Input data
   * @returns {Array} Normalized array of rows
   */
  normalizeData(data) {
    if (!data) return [];

    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Treat as single text value
        return [[data]];
      }
    }

    if (typeof data === "object") {
      return [data];
    }

    return [[data]];
  }

  /**
   * Estimate data size in bytes
   * @param {Array} data - Data to estimate
   * @returns {number} Estimated size in bytes
   */
  estimateDataSize(data) {
    if (data.length === 0) return 0;

    // Sample first few rows to estimate average row size
    const sampleSize = Math.min(10, data.length);
    let totalSize = 0;

    for (let i = 0; i < sampleSize; i++) {
      const row = data[i];
      if (Array.isArray(row)) {
        totalSize += row.join(",").length + 1; // +1 for line ending
      } else if (typeof row === "object") {
        totalSize += JSON.stringify(row).length + 1;
      } else {
        totalSize += String(row).length + 1;
      }
    }

    const averageRowSize = totalSize / sampleSize;
    return Math.ceil(averageRowSize * data.length);
  }

  /**
   * Get column count from data
   * @param {Array} data - Data array
   * @returns {number} Column count
   */
  getColumnCount(data) {
    if (data.length === 0) return 0;

    const firstRow = data[0];
    if (Array.isArray(firstRow)) {
      return firstRow.length;
    } else if (typeof firstRow === "object") {
      return Object.keys(firstRow).length;
    }

    return 1;
  }

  /**
   * Get headers from first row
   * @param {*} firstRow - First data row
   * @returns {Array} Headers array
   */
  getHeaders(firstRow) {
    if (Array.isArray(firstRow)) {
      return firstRow.map((_, index) => `Column${index + 1}`);
    } else if (typeof firstRow === "object") {
      return Object.keys(firstRow);
    }

    return ["Value"];
  }

  /**
   * Generate default headers
   * @param {number} count - Number of columns
   * @returns {Array} Generated headers
   */
  generateHeaders(count) {
    return Array.from({ length: count }, (_, index) => `Column${index + 1}`);
  }

  /**
   * Get row values in consistent format
   * @param {*} row - Data row
   * @param {*} template - Template row for structure
   * @returns {Array} Row values
   */
  getRowValues(row, template) {
    if (Array.isArray(row)) {
      return row;
    } else if (typeof row === "object") {
      const keys = Array.isArray(template) ? this.getHeaders(template) : Object.keys(template);
      return keys.map((key) => row[key]);
    }

    return [row];
  }

  /**
   * Check if format needs headers
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {boolean} True if headers are needed
   */
  needsHeaders(format, options) {
    return ["csv", "tsv", "excel"].includes(format) && options.includeHeaders;
  }

  /**
   * Export headers for streaming
   * @param {Array} data - Data array
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {string} Headers string
   */
  exportHeaders(data, format, options) {
    if (data.length === 0) return "";

    const headers = this.getHeaders(data[0]);

    switch (format) {
      case "csv":
      case "tsv":
      case "excel":
        return this.formatCSVRow(headers, options.delimiter, options.quote, options.escape) + options.lineEnding;
      case "json":
        return "[";
      default:
        return "";
    }
  }

  /**
   * Get closing elements for streaming formats
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {string} Closing elements
   */
  getClosingElements(format, options) {
    switch (format) {
      case "json":
        return "]";
      default:
        return "";
    }
  }

  /**
   * Get supported formats
   * @returns {Object} Supported formats info
   */
  getSupportedFormats() {
    return { ...this.supportedFormats };
  }

  /**
   * Get default options for format
   * @param {string} format - Export format
   * @returns {Object} Default options
   */
  getDefaultOptions(format) {
    return { ...this.defaultOptions[format] };
  }

  /**
   * Validate export options
   * @param {string} format - Export format
   * @param {Object} options - Options to validate
   * @returns {Object} Validation result
   */
  validateOptions(format, options) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!this.supportedFormats[format]) {
      result.isValid = false;
      result.errors.push(`Unsupported format: ${format}`);
      return result;
    }

    const defaults = this.defaultOptions[format];

    // Validate format-specific options
    switch (format) {
      case "csv":
      case "tsv":
      case "excel":
        if (options.delimiter && options.delimiter.length !== 1) {
          result.warnings.push("Delimiter should be a single character");
        }
        if (options.quote && options.quote.length !== 1) {
          result.warnings.push("Quote character should be a single character");
        }
        break;

      case "json":
        if (options.format && !["array", "objects"].includes(options.format)) {
          result.errors.push('JSON format must be "array" or "objects"');
          result.isValid = false;
        }
        if (options.indent && (typeof options.indent !== "number" || options.indent < 0)) {
          result.warnings.push("JSON indent should be a non-negative number");
        }
        break;
    }

    return result;
  }

  /**
   * Create download blob
   * @param {string} data - Export data
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {Blob} Download blob
   */
  createBlob(data, format, options = {}) {
    const formatInfo = this.supportedFormats[format];
    const mimeType = options.mimeType || formatInfo.mimeType;

    return new Blob([data], { type: mimeType });
  }

  /**
   * Generate filename for export
   * @param {string} format - Export format
   * @param {string} baseName - Base filename
   * @returns {string} Generated filename
   */
  generateFilename(format, baseName = "export") {
    const formatInfo = this.supportedFormats[format];
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

    return `${baseName}-${timestamp}.${formatInfo.extension}`;
  }

  /**
   * Get export progress for streaming operations
   * @param {number} processedRows - Number of processed rows
   * @param {number} totalRows - Total number of rows
   * @returns {Object} Progress information
   */
  getProgress(processedRows, totalRows) {
    const percentage = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0;

    return {
      percentage,
      processedRows,
      totalRows,
      remainingRows: totalRows - processedRows,
      isComplete: processedRows >= totalRows,
    };
  }
}
