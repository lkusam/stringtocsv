/**
 * ExportWorker - Specialized worker for file generation operations
 * Handles export to multiple formats with streaming support for large datasets
 */

// Worker script - runs in Web Worker context
(function () {
  "use strict";

  /**
   * Main export processing function
   */
  function processExport(data) {
    const { input, settings, jobId } = data;

    try {
      // Send progress update
      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 10, total: 100, message: "Starting export..." },
      });

      // Validate input
      if (!input || typeof input !== "string") {
        throw new Error("Invalid input: must be a non-empty string");
      }

      const exportFormat = settings.format || "csv";
      const exportOptions = settings.options || {};

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 30, total: 100, message: `Preparing ${exportFormat.toUpperCase()} export...` },
      });

      // Process export based on format
      let result;
      switch (exportFormat.toLowerCase()) {
        case "csv":
          result = exportToCSV(input, exportOptions);
          break;
        case "tsv":
          result = exportToTSV(input, exportOptions);
          break;
        case "json":
          result = exportToJSON(input, exportOptions);
          break;
        case "excel":
          result = exportToExcelCSV(input, exportOptions);
          break;
        case "txt":
          result = exportToText(input, exportOptions);
          break;
        default:
          throw new Error(`Unsupported export format: ${exportFormat}`);
      }

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 80, total: 100, message: "Generating download..." },
      });

      // Create blob and download URL
      const blob = createBlob(result.content, result.mimeType);
      const downloadUrl = URL.createObjectURL(blob);

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 100, total: 100, message: "Export complete" },
      });

      // Return export result
      postMessage({
        type: "result",
        jobId: jobId,
        result: {
          format: exportFormat,
          content: result.content,
          blob: blob,
          downloadUrl: downloadUrl,
          filename: result.filename,
          size: blob.size,
          metadata: {
            ...result.metadata,
            processingTime: Date.now() - data.startTime,
            format: exportFormat,
            encoding: result.encoding || "utf-8",
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
   * Export to CSV format
   */
  function exportToCSV(input, options) {
    const { delimiter = ",", lineEnding = "\n", encoding = "utf-8", includeHeaders = false, quoteAll = false, quoteChar = '"', escapeChar = '"' } = options;

    let content = input;

    // Process CSV-specific formatting
    if (quoteAll) {
      const lines = content.split("\n");
      content = lines
        .map((line) => {
          if (line.trim()) {
            const fields = line.split(",");
            return fields.map((field) => `${quoteChar}${field.replace(new RegExp(quoteChar, "g"), escapeChar + quoteChar)}${quoteChar}`).join(delimiter);
          }
          return line;
        })
        .join(lineEnding);
    }

    // Replace line endings if different
    if (lineEnding !== "\n") {
      content = content.replace(/\n/g, lineEnding);
    }

    // Replace delimiters if different
    if (delimiter !== ",") {
      content = content.replace(/,/g, delimiter);
    }

    return {
      content: content,
      mimeType: "text/csv",
      filename: `export_${Date.now()}.csv`,
      encoding: encoding,
      metadata: {
        delimiter: delimiter,
        lineEnding: lineEnding === "\n" ? "LF" : lineEnding === "\r\n" ? "CRLF" : "CR",
        rows: content.split(lineEnding).length,
        estimatedSize: new Blob([content]).size,
      },
    };
  }

  /**
   * Export to TSV (Tab-Separated Values) format
   */
  function exportToTSV(input, options) {
    const tsvOptions = {
      ...options,
      delimiter: "\t",
    };

    const result = exportToCSV(input, tsvOptions);

    return {
      ...result,
      mimeType: "text/tab-separated-values",
      filename: `export_${Date.now()}.tsv`,
      metadata: {
        ...result.metadata,
        delimiter: "TAB",
      },
    };
  }

  /**
   * Export to JSON format
   */
  function exportToJSON(input, options) {
    const {
      format = "array", // 'array' | 'objects' | 'lines'
      pretty = false,
      encoding = "utf-8",
      includeMetadata = false,
    } = options;

    let jsonData;
    const lines = input.split("\n").filter((line) => line.trim());

    switch (format) {
      case "array":
        // Simple array of strings
        jsonData = lines;
        break;

      case "objects":
        // Array of objects (assumes first line is headers)
        if (lines.length > 1) {
          const headers = parseCSVLine(lines[0]);
          jsonData = lines.slice(1).map((line) => {
            const values = parseCSVLine(line);
            const obj = {};
            headers.forEach((header, index) => {
              obj[header.replace(/"/g, "").trim()] = values[index] ? values[index].replace(/"/g, "").trim() : "";
            });
            return obj;
          });
        } else {
          jsonData = [];
        }
        break;

      case "lines":
        // JSON Lines format (one JSON object per line)
        const jsonLines = lines.map((line) => JSON.stringify({ value: line.replace(/"/g, "").trim() }));
        const content = jsonLines.join("\n");

        return {
          content: content,
          mimeType: "application/x-ndjson",
          filename: `export_${Date.now()}.jsonl`,
          encoding: encoding,
          metadata: {
            format: "JSON Lines",
            lines: jsonLines.length,
            estimatedSize: new Blob([content]).size,
          },
        };

      default:
        throw new Error(`Unknown JSON format: ${format}`);
    }

    // Add metadata if requested
    if (includeMetadata) {
      jsonData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: Array.isArray(jsonData) ? jsonData.length : 1,
          format: format,
        },
        data: jsonData,
      };
    }

    const content = pretty ? JSON.stringify(jsonData, null, 2) : JSON.stringify(jsonData);

    return {
      content: content,
      mimeType: "application/json",
      filename: `export_${Date.now()}.json`,
      encoding: encoding,
      metadata: {
        format: format,
        pretty: pretty,
        records: Array.isArray(jsonData) ? jsonData.length : 1,
        estimatedSize: new Blob([content]).size,
      },
    };
  }

  /**
   * Export to Excel-compatible CSV
   */
  function exportToExcelCSV(input, options) {
    const excelOptions = {
      ...options,
      delimiter: ",",
      lineEnding: "\r\n", // Excel prefers CRLF
      encoding: "utf-8",
      quoteAll: true,
      includeHeaders: true,
    };

    const result = exportToCSV(input, excelOptions);

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const content = bom + result.content;

    return {
      ...result,
      content: content,
      filename: `export_${Date.now()}_excel.csv`,
      metadata: {
        ...result.metadata,
        compatibility: "Excel",
        bom: true,
      },
    };
  }

  /**
   * Export to plain text format
   */
  function exportToText(input, options) {
    const { lineEnding = "\n", encoding = "utf-8", removeQuotes = false, addLineNumbers = false } = options;

    let content = input;

    // Remove quotes if requested
    if (removeQuotes) {
      content = content.replace(/"/g, "");
    }

    // Add line numbers if requested
    if (addLineNumbers) {
      const lines = content.split("\n");
      content = lines
        .map((line, index) => {
          if (line.trim()) {
            return `${(index + 1).toString().padStart(3, "0")}: ${line}`;
          }
          return line;
        })
        .join(lineEnding);
    }

    // Replace line endings if different
    if (lineEnding !== "\n") {
      content = content.replace(/\n/g, lineEnding);
    }

    return {
      content: content,
      mimeType: "text/plain",
      filename: `export_${Date.now()}.txt`,
      encoding: encoding,
      metadata: {
        lineEnding: lineEnding === "\n" ? "LF" : lineEnding === "\r\n" ? "CRLF" : "CR",
        lines: content.split(lineEnding).length,
        hasLineNumbers: addLineNumbers,
        estimatedSize: new Blob([content]).size,
      },
    };
  }

  /**
   * Parse CSV line handling quoted values
   */
  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

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
   * Create blob with proper MIME type
   */
  function createBlob(content, mimeType) {
    const options = { type: mimeType };

    // Handle different encodings
    if (mimeType.includes("charset=")) {
      return new Blob([content], options);
    } else {
      return new Blob([content], { ...options, type: `${mimeType};charset=utf-8` });
    }
  }

  /**
   * Stream large content processing (for future enhancement)
   */
  function processLargeContent(content, chunkSize = 1024 * 1024) {
    // For very large files, we could implement streaming processing
    // This is a placeholder for future enhancement
    const chunks = [];

    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * Validate export options
   */
  function validateExportOptions(format, options) {
    const validFormats = ["csv", "tsv", "json", "excel", "txt"];

    if (!validFormats.includes(format.toLowerCase())) {
      throw new Error(`Invalid export format: ${format}. Supported formats: ${validFormats.join(", ")}`);
    }

    // Format-specific validation
    switch (format.toLowerCase()) {
      case "json":
        if (options.format && !["array", "objects", "lines"].includes(options.format)) {
          throw new Error("Invalid JSON format. Supported: array, objects, lines");
        }
        break;

      case "csv":
      case "tsv":
        if (options.delimiter && options.delimiter.length !== 1) {
          throw new Error("Delimiter must be a single character");
        }
        break;
    }

    return true;
  }

  /**
   * Get export format capabilities
   */
  function getFormatCapabilities() {
    return {
      csv: {
        name: "Comma-Separated Values",
        extension: ".csv",
        mimeType: "text/csv",
        options: ["delimiter", "lineEnding", "quoteAll", "quoteChar", "escapeChar"],
      },
      tsv: {
        name: "Tab-Separated Values",
        extension: ".tsv",
        mimeType: "text/tab-separated-values",
        options: ["lineEnding", "quoteAll", "quoteChar"],
      },
      json: {
        name: "JavaScript Object Notation",
        extension: ".json",
        mimeType: "application/json",
        options: ["format", "pretty", "includeMetadata"],
      },
      excel: {
        name: "Excel-Compatible CSV",
        extension: ".csv",
        mimeType: "text/csv",
        options: ["includeHeaders"],
      },
      txt: {
        name: "Plain Text",
        extension: ".txt",
        mimeType: "text/plain",
        options: ["lineEnding", "removeQuotes", "addLineNumbers"],
      },
    };
  }

  /**
   * Message handler for worker communication
   */
  self.onmessage = function (event) {
    const data = event.data;

    if (data.type === "export") {
      // Validate options before processing
      try {
        validateExportOptions(data.settings.format, data.settings.options || {});
        processExport(data);
      } catch (error) {
        postMessage({
          type: "error",
          jobId: data.jobId,
          error: error.message,
        });
      }
    } else if (data.type === "getCapabilities") {
      postMessage({
        type: "capabilities",
        capabilities: getFormatCapabilities(),
      });
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
    workerType: "export",
    capabilities: ["csv", "tsv", "json", "excel", "txt"],
    timestamp: Date.now(),
  });
})();
