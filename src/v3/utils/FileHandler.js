/**
 * FileHandler - Utility class for handling file operations
 * Supports drag-and-drop, file selection, and URL imports
 */

export class FileHandler {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 15 * 1024 * 1024; // 15MB
    this.supportedTypes = options.supportedTypes || ["text/plain", "text/csv", "application/json", "text/tab-separated-values"];
    this.supportedExtensions = options.supportedExtensions || [".txt", ".csv", ".json", ".tsv"];

    // Event callbacks
    this.onFilesSelected = options.onFilesSelected || (() => {});
    this.onFileError = options.onFileError || (() => {});
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Set up drag and drop functionality for an element
   * @param {HTMLElement} element - Element to enable drag and drop on
   * @param {Object} options - Configuration options
   */
  setupDragAndDrop(element, options = {}) {
    const { dragOverClass = "drag-over", allowMultiple = true, onDragEnter = () => {}, onDragLeave = () => {}, onDrop = () => {} } = options;

    let dragCounter = 0;

    element.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        element.classList.add(dragOverClass);
        onDragEnter(e);
      }
    });

    element.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    element.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        element.classList.remove(dragOverClass);
        onDragLeave(e);
      }
    });

    element.addEventListener("drop", (e) => {
      e.preventDefault();
      dragCounter = 0;
      element.classList.remove(dragOverClass);

      const files = Array.from(e.dataTransfer.files);
      this.handleFiles(files, allowMultiple);
      onDrop(e, files);
    });
  }

  /**
   * Create a file input element for file selection
   * @param {Object} options - Configuration options
   * @returns {HTMLInputElement} File input element
   */
  createFileInput(options = {}) {
    const { multiple = true, accept = this.supportedExtensions.join(","), onChange = () => {} } = options;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    input.accept = accept;
    input.style.display = "none";

    input.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      this.handleFiles(files, multiple);
      onChange(e, files);
    });

    return input;
  }

  /**
   * Handle selected files with validation
   * @param {Array<File>} files - Selected files
   * @param {boolean} allowMultiple - Whether multiple files are allowed
   */
  handleFiles(files, allowMultiple = true) {
    if (!allowMultiple && files.length > 1) {
      this.onFileError(new Error("Only one file is allowed"));
      return;
    }

    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      const validation = this.validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push({
          file: file.name,
          errors: validation.errors,
        });
      }
    });

    if (validFiles.length > 0) {
      this.onFilesSelected(validFiles);
    }

    if (errors.length > 0) {
      errors.forEach((error) => {
        this.onFileError(new Error(`${error.file}: ${error.errors.join(", ")}`));
      });
    }
  }

  /**
   * Validate a file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];
    let isValid = true;

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File too large (${this.formatFileSize(file.size)}, max: ${this.formatFileSize(this.maxFileSize)})`);
      isValid = false;
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push("File is empty");
      isValid = false;
    }

    // Check file type
    const isValidType = this.supportedTypes.includes(file.type) || this.supportedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      errors.push(`Unsupported file type (${file.type || "unknown"})`);
      // Don't mark as invalid for type issues - might still be processable
    }

    return { isValid, errors };
  }

  /**
   * Import data from URL
   * @param {string} url - URL to import from
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import result
   */
  async importFromUrl(url, options = {}) {
    const { timeout = 30000, maxRedirects = 5, onProgress = () => {} } = options;

    try {
      // Validate URL
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported");
      }

      onProgress(0, "Connecting...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content length
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > this.maxFileSize) {
        throw new Error(`Content too large: ${this.formatFileSize(parseInt(contentLength))}`);
      }

      onProgress(50, "Downloading...");

      // Read response with progress tracking
      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;
      const totalLength = contentLength ? parseInt(contentLength) : 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Check size limit during download
        if (receivedLength > this.maxFileSize) {
          throw new Error(`Content too large: ${this.formatFileSize(receivedLength)}`);
        }

        if (totalLength > 0) {
          const progress = Math.round((receivedLength / totalLength) * 50) + 50;
          onProgress(progress, "Downloading...");
        }
      }

      // Combine chunks
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      // Decode text
      const decoder = new TextDecoder();
      const text = decoder.decode(allChunks);

      onProgress(100, "Complete");

      return {
        data: text,
        metadata: {
          url: url,
          size: receivedLength,
          contentType: response.headers.get("content-type"),
          lastModified: response.headers.get("last-modified"),
          etag: response.headers.get("etag"),
        },
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw error;
    }
  }

  /**
   * Read file content as text
   * @param {File} file - File to read
   * @param {Object} options - Read options
   * @returns {Promise<string>} File content
   */
  async readFileAsText(file, options = {}) {
    const { encoding = "utf-8", onProgress = () => {} } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        onProgress(100, "Complete");
        resolve(event.target.result);
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress, "Reading...");
        }
      };

      reader.readAsText(file, encoding);
    });
  }

  /**
   * Read multiple files concurrently
   * @param {Array<File>} files - Files to read
   * @param {Object} options - Read options
   * @returns {Promise<Array>} Array of file contents
   */
  async readMultipleFiles(files, options = {}) {
    const { maxConcurrent = 3, onFileProgress = () => {}, onOverallProgress = () => {} } = options;

    const results = [];
    let completed = 0;

    // Process files in batches
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (file, index) => {
        try {
          const content = await this.readFileAsText(file, {
            onProgress: (progress, status) => {
              onFileProgress(file, progress, status);
            },
          });

          completed++;
          onOverallProgress(completed, files.length);

          return {
            file: file.name,
            content,
            size: file.size,
            type: file.type,
            success: true,
          };
        } catch (error) {
          completed++;
          onOverallProgress(completed, files.length);

          return {
            file: file.name,
            error: error.message,
            success: false,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
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
   * Get file extension
   * @param {string} filename - Filename
   * @returns {string|null} File extension
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf(".");
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : null;
  }

  /**
   * Check if file type is supported
   * @param {File} file - File to check
   * @returns {boolean} True if supported
   */
  isFileSupported(file) {
    return this.supportedTypes.includes(file.type) || this.supportedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
  }

  /**
   * Create download link for data
   * @param {string} data - Data to download
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   * @returns {HTMLAnchorElement} Download link
   */
  createDownloadLink(data, filename, mimeType = "text/plain") {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    // Clean up URL after download
    link.addEventListener("click", () => {
      setTimeout(() => URL.revokeObjectURL(url), 100);
    });

    return link;
  }

  /**
   * Trigger file download
   * @param {string} data - Data to download
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  downloadFile(data, filename, mimeType = "text/plain") {
    const link = this.createDownloadLink(data, filename, mimeType);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
