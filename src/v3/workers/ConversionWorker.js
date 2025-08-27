/**
 * ConversionWorker - Specialized worker for data transformation tasks
 * Handles string to CSV conversion with various formatting options
 */

// Worker script - runs in Web Worker context
(function () {
  "use strict";

  /**
   * Main conversion processing function
   */
  function processConversion(data) {
    const { input, settings, jobId } = data;

    try {
      // Send progress update
      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 10, total: 100, message: "Starting conversion..." },
      });

      // Validate input
      if (!input || typeof input !== "string") {
        throw new Error("Invalid input: must be a non-empty string");
      }

      // Extract settings with defaults
      const separators = settings.separators || { row: "\n", column: "," };
      const quoting = settings.quoting || { type: "double", escape: "double" };
      const validation = settings.validation || { enabled: true };
      const transformation = settings.transformation || { rules: [] };

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 30, total: 100, message: "Processing data..." },
      });

      // Perform conversion based on mode
      let result;
      switch (settings.mode || "simple") {
        case "simple":
          result = processSimpleConversion(input, separators, quoting, transformation);
          break;
        case "multi-column":
          result = processMultiColumnConversion(input, separators, quoting, transformation);
          break;
        case "batch":
          result = processBatchConversion(input, separators, quoting, transformation);
          break;
        default:
          throw new Error(`Unknown conversion mode: ${settings.mode}`);
      }

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 80, total: 100, message: "Finalizing output..." },
      });

      // Apply post-processing transformations
      if (transformation.rules && transformation.rules.length > 0) {
        result.output = applyTransformationRules(result.output, transformation.rules);
      }

      postMessage({
        type: "progress",
        jobId: jobId,
        progress: { current: 100, total: 100, message: "Conversion complete" },
      });

      // Return successful result
      postMessage({
        type: "result",
        jobId: jobId,
        result: {
          output: result.output,
          metadata: {
            ...result.metadata,
            processingTime: Date.now() - data.startTime,
            mode: settings.mode || "simple",
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
   * Process simple string to CSV conversion
   */
  function processSimpleConversion(input, separators, quoting, transformation) {
    const lines = input.split(separators.row);
    const quoteChar = quoting.type === "single" ? "'" : '"';
    const shouldTrim = transformation.trim !== false;

    const processedLines = lines
      .filter((line) => line.trim() !== "") // Remove empty lines
      .map((line) => {
        let processedLine = shouldTrim ? line.trim() : line;

        // Apply custom transformations
        if (transformation.rules) {
          processedLine = applyLineTransformations(processedLine, transformation.rules);
        }

        // Quote the line
        return escapeCSVValue(processedLine, quoteChar);
      });

    return {
      output: processedLines.join(",\n"),
      metadata: {
        inputLines: lines.length,
        outputLines: processedLines.length,
        emptyLinesRemoved: lines.length - processedLines.length,
        quoteType: quoting.type,
      },
    };
  }

  /**
   * Process multi-column tabular data conversion
   */
  function processMultiColumnConversion(input, separators, quoting, transformation) {
    const rows = input.split(separators.row);
    const columnSeparator = separators.column || "\t";
    const quoteChar = quoting.type === "single" ? "'" : '"';

    const processedRows = [];
    let maxColumns = 0;
    let hasHeaders = false;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].trim();
      if (!row) continue;

      // Split into columns
      let columns = parseTabularRow(row, columnSeparator);

      // Track maximum columns
      maxColumns = Math.max(maxColumns, columns.length);

      // Apply transformations
      if (transformation.rules) {
        columns = columns.map((col) => applyLineTransformations(col, transformation.rules));
      }

      // Detect headers (first non-empty row with text-heavy content)
      if (i === 0 && columns.some((col) => isNaN(col) && col.length > 0)) {
        hasHeaders = true;
      }

      processedRows.push(columns);
    }

    // Normalize column counts (pad with empty values)
    const normalizedRows = processedRows.map((row) => {
      while (row.length < maxColumns) {
        row.push("");
      }
      return row;
    });

    // Convert to CSV format
    const csvRows = normalizedRows.map((row) => row.map((cell) => escapeCSVValue(cell, quoteChar)).join(","));

    return {
      output: csvRows.join("\n"),
      metadata: {
        inputRows: rows.length,
        outputRows: csvRows.length,
        columns: maxColumns,
        hasHeaders: hasHeaders,
        quoteType: quoting.type,
      },
    };
  }

  /**
   * Process batch conversion (multiple inputs)
   */
  function processBatchConversion(input, separators, quoting, transformation) {
    // For batch processing, input might be an array or delimited string
    let inputs;

    if (Array.isArray(input)) {
      inputs = input;
    } else {
      // Split by double newlines or other batch separator
      inputs = input.split("\n\n").filter((item) => item.trim());
    }

    const results = [];
    let totalProcessed = 0;

    for (const singleInput of inputs) {
      try {
        const result = processSimpleConversion(singleInput, separators, quoting, transformation);
        results.push(result.output);
        totalProcessed++;
      } catch (error) {
        // Continue processing other inputs even if one fails
        results.push(`# Error processing input: ${error.message}`);
      }
    }

    return {
      output: results.join("\n\n"),
      metadata: {
        totalInputs: inputs.length,
        successfullyProcessed: totalProcessed,
        failedInputs: inputs.length - totalProcessed,
        quoteType: quoting.type,
      },
    };
  }

  /**
   * Parse a tabular row with various column separators
   */
  function parseTabularRow(row, separator) {
    // Handle different separator types
    if (separator === "auto") {
      // Auto-detect separator
      const candidates = ["\t", "|", ";", ",", " "];
      separator = detectBestSeparator(row, candidates);
    }

    // Handle multiple consecutive separators
    if (separator === " ") {
      // For spaces, split on multiple spaces
      return row.split(/\s+/).filter((col) => col.length > 0);
    }

    return row.split(separator);
  }

  /**
   * Detect the best separator for a row
   */
  function detectBestSeparator(row, candidates) {
    let bestSeparator = candidates[0];
    let maxColumns = 0;

    for (const separator of candidates) {
      const columns = row.split(separator).length;
      if (columns > maxColumns) {
        maxColumns = columns;
        bestSeparator = separator;
      }
    }

    return bestSeparator;
  }

  /**
   * Apply transformation rules to a line
   */
  function applyLineTransformations(line, rules) {
    let result = line;

    for (const rule of rules) {
      switch (rule.type) {
        case "regex":
          if (rule.pattern && rule.replacement !== undefined) {
            const regex = new RegExp(rule.pattern, rule.flags || "g");
            result = result.replace(regex, rule.replacement);
          }
          break;
        case "trim":
          result = result.trim();
          break;
        case "uppercase":
          result = result.toUpperCase();
          break;
        case "lowercase":
          result = result.toLowerCase();
          break;
        case "removeEmpty":
          if (result.trim() === "") {
            return null; // Mark for removal
          }
          break;
      }
    }

    return result;
  }

  /**
   * Apply transformation rules to the entire output
   */
  function applyTransformationRules(output, rules) {
    let result = output;

    for (const rule of rules) {
      switch (rule.type) {
        case "sort":
          const lines = result.split("\n");
          lines.sort();
          result = lines.join("\n");
          break;
        case "deduplicate":
          const uniqueLines = [...new Set(result.split("\n"))];
          result = uniqueLines.join("\n");
          break;
        case "reverse":
          const reversedLines = result.split("\n").reverse();
          result = reversedLines.join("\n");
          break;
      }
    }

    return result;
  }

  /**
   * Escape CSV value with proper quoting
   */
  function escapeCSVValue(value, quoteChar = '"') {
    if (value === null || value === undefined) {
      return "";
    }

    const stringValue = String(value);

    // Check if value needs quoting
    const needsQuoting = stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes("\r") || stringValue.includes(quoteChar);

    if (needsQuoting) {
      // Escape quote characters by doubling them
      const escaped = stringValue.replace(new RegExp(quoteChar, "g"), quoteChar + quoteChar);
      return quoteChar + escaped + quoteChar;
    }

    return stringValue;
  }

  /**
   * Message handler for worker communication
   */
  self.onmessage = function (event) {
    const data = event.data;

    if (data.type === "process") {
      processConversion(data);
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
    workerType: "conversion",
    capabilities: ["simple", "multi-column", "batch"],
    timestamp: Date.now(),
  });
})();
