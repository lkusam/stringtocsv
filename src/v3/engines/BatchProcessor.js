/**
 * BatchProcessor - Manages multiple conversion jobs and file processing
 * Handles batch operations, file uploads, and URL imports
 */

import { ProcessingJob, ValidationResult } from "../core/interfaces.js";
import { WorkerPoolManager } from "../workers/WorkerPoolManager.js";

export class BatchProcessor {
  constructor(options = {}) {
    this.workerPool = options.workerPool || new WorkerPoolManager();
    this.maxConcurrentJobs = options.maxConcurrentJobs || 3;
    this.maxFileSize = options.maxFileSize || 15 * 1024 * 1024; // 15MB
    this.supportedFormats = ["txt", "csv", "json"];

    // Job management
    this.jobs = new Map();
    this.jobQueue = [];
    this.activeJobs = new Set();

    // Event handlers
    this.onJobProgress = options.onJobProgress || (() => {});
    this.onJobComplete = options.onJobComplete || (() => {});
    this.onJobError = options.onJobError || (() => {});
    this.onBatchComplete = options.onBatchComplete || (() => {});
  }

  /**
   * Add a new job to the batch processor
   * @param {Object} jobData - Job configuration
   * @returns {ProcessingJob} Created job instance
   */
  addJob(jobData) {
    const job = new ProcessingJob({
      ...jobData,
      type: "batch",
    });

    this.jobs.set(job.id, job);
    this.jobQueue.push(job.id);

    return job;
  }

  /**
   * Add multiple jobs from file inputs
   * @param {FileList|Array} files - Files to process
   * @param {Object} settings - Processing settings
   * @returns {Promise<Array>} Array of created jobs
   */
  async addFilesJobs(files, settings = {}) {
    const jobs = [];

    for (const file of files) {
      try {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.isValid) {
          throw new Error(`Invalid file ${file.name}: ${validation.errors.join(", ")}`);
        }

        // Create job for file
        const job = this.addJob({
          input: {
            data: null, // Will be loaded when processing
            source: "file",
            metadata: {
              fileName: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
            },
          },
          settings: {
            ...settings,
            file: file, // Store file reference
          },
        });

        jobs.push(job);
      } catch (error) {
        console.error(`Error adding file job for ${file.name}:`, error);
        // Create error job to track the failure
        const errorJob = this.addJob({
          input: {
            data: "",
            source: "file",
            metadata: { fileName: file.name, size: file.size },
          },
          settings,
        });
        errorJob.fail(error);
        jobs.push(errorJob);
      }
    }

    return jobs;
  }

  /**
   * Add job from URL import
   * @param {string} url - URL to import from
   * @param {Object} settings - Processing settings
   * @returns {ProcessingJob} Created job instance
   */
  addUrlJob(url, settings = {}) {
    return this.addJob({
      input: {
        data: null, // Will be loaded when processing
        source: "url",
        metadata: {
          url: url,
          size: 0, // Unknown until loaded
        },
      },
      settings: {
        ...settings,
        url: url,
      },
    });
  }

  /**
   * Start processing all queued jobs
   * @returns {Promise<void>}
   */
  async processBatch() {
    if (this.jobQueue.length === 0) {
      this.onBatchComplete([]);
      return;
    }

    const totalJobs = this.jobQueue.length;
    let completedJobs = 0;

    // Process jobs with concurrency limit
    while (this.jobQueue.length > 0 || this.activeJobs.size > 0) {
      // Start new jobs up to concurrency limit
      while (this.jobQueue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
        const jobId = this.jobQueue.shift();
        const job = this.jobs.get(jobId);

        if (job && job.status === "pending") {
          this.activeJobs.add(jobId);
          this.processJob(job).finally(() => {
            this.activeJobs.delete(jobId);
            completedJobs++;

            // Report overall batch progress
            const progress = Math.round((completedJobs / totalJobs) * 100);
            this.onJobProgress(null, progress, totalJobs);

            // Check if batch is complete
            if (completedJobs === totalJobs) {
              const results = Array.from(this.jobs.values());
              this.onBatchComplete(results);
            }
          });
        }
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Process a single job
   * @param {ProcessingJob} job - Job to process
   * @returns {Promise<void>}
   */
  async processJob(job) {
    try {
      job.status = "processing";
      this.onJobProgress(job, 0, 100);

      // Load input data based on source
      await this.loadJobData(job);
      this.onJobProgress(job, 25, 100);

      // Detect format if needed
      if (!job.settings.format) {
        job.settings.format = this.detectFormat(job.input.data, job.input.metadata);
      }
      this.onJobProgress(job, 50, 100);

      // Process the data using worker
      const result = await this.workerPool.submitJob("conversion", {
        data: job.input.data,
        settings: job.settings,
        jobId: job.id,
      });

      this.onJobProgress(job, 75, 100);

      // Update job with results
      job.output.data = result.data;
      job.output.metadata = result.metadata;
      job.complete();

      this.onJobProgress(job, 100, 100);
      this.onJobComplete(job);
    } catch (error) {
      job.fail(error);
      this.onJobError(job, error);
    }
  }

  /**
   * Load input data for a job based on its source
   * @param {ProcessingJob} job - Job to load data for
   * @returns {Promise<void>}
   */
  async loadJobData(job) {
    switch (job.input.source) {
      case "file":
        await this.loadFileData(job);
        break;
      case "url":
        await this.loadUrlData(job);
        break;
      case "text":
        // Data already loaded
        break;
      default:
        throw new Error(`Unsupported input source: ${job.input.source}`);
    }
  }

  /**
   * Load data from file
   * @param {ProcessingJob} job - Job with file to load
   * @returns {Promise<void>}
   */
  async loadFileData(job) {
    const file = job.settings.file;
    if (!file) {
      throw new Error("File not found in job settings");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        job.input.data = event.target.result;
        job.input.metadata.size = job.input.data.length;
        resolve();
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Load data from URL
   * @param {ProcessingJob} job - Job with URL to load
   * @returns {Promise<void>}
   */
  async loadUrlData(job) {
    const url = job.settings.url;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > this.maxFileSize) {
        throw new Error(`File too large: ${contentLength} bytes (max: ${this.maxFileSize})`);
      }

      job.input.data = await response.text();
      job.input.metadata.size = job.input.data.length;
      job.input.metadata.contentType = response.headers.get("content-type");
    } catch (error) {
      throw new Error(`Failed to load URL ${url}: ${error.message}`);
    }
  }

  /**
   * Validate a file before processing
   * @param {File} file - File to validate
   * @returns {ValidationResult} Validation result
   */
  validateFile(file) {
    const result = new ValidationResult();

    // Check file size
    if (file.size > this.maxFileSize) {
      result.addError("size", "error", `File too large: ${this.formatFileSize(file.size)} (max: ${this.formatFileSize(this.maxFileSize)})`);
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (extension && !this.supportedFormats.includes(extension)) {
      result.addError("format", "warning", `Unsupported file format: .${extension}. Supported formats: ${this.supportedFormats.join(", ")}`);
    }

    // Check if file is empty
    if (file.size === 0) {
      result.addError("content", "error", "File is empty");
    }

    return result;
  }

  /**
   * Detect input format based on content and metadata
   * @param {string} data - Input data
   * @param {Object} metadata - File metadata
   * @returns {string} Detected format
   */
  detectFormat(data, metadata) {
    // Try to detect from file extension first
    if (metadata.fileName) {
      const extension = this.getFileExtension(metadata.fileName);
      if (extension && this.supportedFormats.includes(extension)) {
        return extension;
      }
    }

    // Try to detect from content type
    if (metadata.contentType) {
      if (metadata.contentType.includes("json")) return "json";
      if (metadata.contentType.includes("csv")) return "csv";
    }

    // Analyze content structure
    const trimmed = data.trim();

    // Check for JSON
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        JSON.parse(trimmed);
        return "json";
      } catch (e) {
        // Not valid JSON
      }
    }

    // Check for CSV (look for common separators)
    const lines = trimmed.split("\n");
    if (lines.length > 1) {
      const firstLine = lines[0];
      if (firstLine.includes(",") || firstLine.includes("\t") || firstLine.includes(";")) {
        return "csv";
      }
    }

    // Default to text
    return "txt";
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string|null} File extension (without dot)
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf(".");
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : null;
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {ProcessingJob|null} Job instance
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   * @returns {Array<ProcessingJob>} All jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} True if job was cancelled
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job && (job.status === "pending" || job.status === "processing")) {
      job.status = "error";
      job.addError(new Error("Job cancelled by user"));

      // Remove from queue if pending
      const queueIndex = this.jobQueue.indexOf(jobId);
      if (queueIndex > -1) {
        this.jobQueue.splice(queueIndex, 1);
      }

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      return true;
    }
    return false;
  }

  /**
   * Clear all jobs
   */
  clearJobs() {
    this.jobs.clear();
    this.jobQueue.length = 0;
    this.activeJobs.clear();
  }

  /**
   * Get batch processing statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const jobs = Array.from(this.jobs.values());
    const stats = {
      total: jobs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      error: 0,
      totalSize: 0,
      processedSize: 0,
    };

    jobs.forEach((job) => {
      stats[job.status]++;
      stats.totalSize += job.input.metadata.size || 0;
      if (job.status === "completed") {
        stats.processedSize += job.input.metadata.size || 0;
      }
    });

    return stats;
  }
}
