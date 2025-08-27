/**
 * Base ProcessingEngine class - Abstract base class for all data processing engines
 * Provides common functionality and interface for data processing operations
 */

import { ProcessingJob, ValidationResult } from "../core/interfaces.js";

export class ProcessingEngine {
  constructor(engineType) {
    if (new.target === ProcessingEngine) {
      throw new Error("ProcessingEngine is abstract and cannot be instantiated directly");
    }

    this.engineType = engineType;
    this.isInitialized = false;
    this.workerPool = null;
    this.eventListeners = new Map();
  }

  /**
   * Initialize the processing engine
   * Must be implemented by subclasses
   */
  async initialize() {
    throw new Error("initialize() must be implemented by subclass");
  }

  /**
   * Process data according to engine-specific logic
   * Must be implemented by subclasses
   */
  async process(job) {
    throw new Error("process() must be implemented by subclass");
  }

  /**
   * Validate input data
   * Can be overridden by subclasses
   */
  async validate(data, settings = {}) {
    const result = new ValidationResult();

    // Basic validation
    if (!data || typeof data !== "string") {
      result.addError("data", "error", "Input data must be a non-empty string");
      return result;
    }

    if (data.length === 0) {
      result.addError("data", "warning", "Input data is empty");
    }

    // Update basic statistics
    result.updateStatistics({
      totalRows: data.split("\n").length,
      totalColumns: 1, // Default for simple processing
    });

    return result;
  }

  /**
   * Detect format of input data
   * Can be overridden by subclasses
   */
  async detectFormat(data) {
    return {
      format: "text",
      confidence: 0.5,
      suggestions: {
        separator: "\n",
        quoting: "double",
      },
    };
  }

  /**
   * Create a new processing job
   */
  createJob(inputData, settings = {}) {
    return new ProcessingJob({
      type: this.engineType,
      input: {
        data: inputData,
        source: "text",
        metadata: {
          size: inputData.length,
          encoding: "utf-8",
        },
      },
      settings: {
        ...this.getDefaultSettings(),
        ...settings,
      },
    });
  }

  /**
   * Get default settings for this engine
   * Can be overridden by subclasses
   */
  getDefaultSettings() {
    return {
      separators: {
        row: "\n",
        column: ",",
      },
      quoting: {
        type: "double",
        escape: "double",
      },
      validation: {
        enabled: true,
        rules: [],
      },
      transformation: {
        rules: [],
      },
    };
  }

  /**
   * Process job with progress tracking
   */
  async processWithProgress(job, progressCallback = null) {
    try {
      job.status = "processing";

      if (progressCallback) {
        progressCallback(0, "Starting processing...");
      }

      // Validate input
      if (progressCallback) {
        progressCallback(10, "Validating input...");
      }

      const validationResult = await this.validate(job.input.data, job.settings);
      if (!validationResult.isValid) {
        const errors = validationResult.errors.filter((e) => e.severity === "error");
        if (errors.length > 0) {
          throw new Error(`Validation failed: ${errors[0].message}`);
        }
      }

      // Process data
      if (progressCallback) {
        progressCallback(30, "Processing data...");
      }

      const result = await this.process(job);

      if (progressCallback) {
        progressCallback(90, "Finalizing...");
      }

      // Complete job
      job.complete(result);

      if (progressCallback) {
        progressCallback(100, "Complete");
      }

      return job;
    } catch (error) {
      job.fail(error);
      if (progressCallback) {
        progressCallback(100, `Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Process multiple jobs in batch
   */
  async processBatch(jobs, progressCallback = null) {
    const results = [];
    const total = jobs.length;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      try {
        if (progressCallback) {
          progressCallback(Math.round((i / total) * 100), `Processing job ${i + 1} of ${total}...`);
        }

        const result = await this.processWithProgress(job);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process job ${i + 1}:`, error);
        results.push(job); // Include failed job in results
      }
    }

    if (progressCallback) {
      progressCallback(100, "Batch processing complete");
    }

    return results;
  }

  /**
   * Cancel processing operation
   */
  async cancel(jobId) {
    // Default implementation - subclasses can override
    console.log(`Cancelling job ${jobId}`);
    return true;
  }

  /**
   * Get processing statistics
   */
  getStatistics() {
    return {
      engineType: this.engineType,
      isInitialized: this.isInitialized,
      // Subclasses can add more statistics
    };
  }

  /**
   * Add event listener
   */
  addEventListener(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, handler) {
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event);
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.eventListeners.clear();
    this.isInitialized = false;
    this.workerPool = null;
    console.log(`${this.engineType} engine destroyed`);
  }

  /**
   * Utility method to escape CSV values
   */
  escapeCSVValue(value, quoteChar = '"') {
    if (typeof value !== "string") {
      value = String(value);
    }

    // Check if value needs quoting
    const needsQuoting = value.includes(",") || value.includes("\n") || value.includes("\r") || value.includes(quoteChar);

    if (needsQuoting) {
      // Escape quote characters by doubling them
      const escaped = value.replace(new RegExp(quoteChar, "g"), quoteChar + quoteChar);
      return quoteChar + escaped + quoteChar;
    }

    return value;
  }

  /**
   * Utility method to parse CSV line
   */
  parseCSVLine(line, separator = ",", quoteChar = '"') {
    const result = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === quoteChar) {
        if (inQuotes && nextChar === quoteChar) {
          // Escaped quote
          current += quoteChar;
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === separator && !inQuotes) {
        // Field separator
        result.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current);
    return result;
  }

  /**
   * Utility method to detect separator
   */
  detectSeparator(data, candidates = [",", "\t", ";", "|"]) {
    const lines = data.split("\n").slice(0, 10); // Check first 10 lines
    const scores = {};

    for (const separator of candidates) {
      let totalFields = 0;
      let consistentLines = 0;
      let firstLineFields = null;

      for (const line of lines) {
        if (line.trim()) {
          const fields = line.split(separator);
          totalFields += fields.length;

          if (firstLineFields === null) {
            firstLineFields = fields.length;
          } else if (fields.length === firstLineFields) {
            consistentLines++;
          }
        }
      }

      // Score based on consistency and field count
      const avgFields = totalFields / lines.length;
      const consistency = consistentLines / (lines.length - 1);
      scores[separator] = avgFields * consistency;
    }

    // Return separator with highest score
    return Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b));
  }
}
