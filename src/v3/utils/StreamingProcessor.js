/**
 * StreamingProcessor - Handles streaming processing for large datasets
 * Implements memory-efficient processing with progress tracking
 */

export class StreamingProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB chunks
    this.maxMemoryUsage = options.maxMemoryUsage || 50 * 1024 * 1024; // 50MB
    this.processingDelay = options.processingDelay || 10; // ms between chunks

    // Memory tracking
    this.currentMemoryUsage = 0;
    this.memoryPool = new Map();
    this.activeStreams = new Set();

    // Event callbacks
    this.onProgress = options.onProgress || (() => {});
    this.onChunkProcessed = options.onChunkProcessed || (() => {});
    this.onMemoryWarning = options.onMemoryWarning || (() => {});
    this.onError = options.onError || (() => {});

    // Performance monitoring
    this.performanceMetrics = {
      totalProcessed: 0,
      averageChunkTime: 0,
      memoryPeakUsage: 0,
      gcCount: 0,
    };

    this.init();
  }

  /**
   * Initialize streaming processor
   */
  init() {
    this.setupMemoryMonitoring();
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    // Monitor memory usage periodically
    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Track performance metrics
    if (performance.mark) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.startsWith("streaming-chunk-")) {
            this.updatePerformanceMetrics(entry);
          }
        });
      });

      try {
        this.performanceObserver.observe({ entryTypes: ["measure"] });
      } catch (e) {
        console.warn("Performance Observer not supported");
      }
    }
  }

  /**
   * Process data in streaming fashion
   * @param {string|ArrayBuffer} data - Data to process
   * @param {Function} processor - Processing function
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processStream(data, processor, options = {}) {
    const streamId = this.generateStreamId();
    this.activeStreams.add(streamId);

    try {
      const result = await this.executeStreamingProcess(streamId, data, processor, options);
      return result;
    } finally {
      this.activeStreams.delete(streamId);
      this.cleanupStream(streamId);
    }
  }

  /**
   * Execute streaming process
   * @param {string} streamId - Stream identifier
   * @param {string|ArrayBuffer} data - Data to process
   * @param {Function} processor - Processing function
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async executeStreamingProcess(streamId, data, processor, options) {
    const startTime = performance.now();
    const dataSize = this.getDataSize(data);
    const chunks = this.createChunks(data, options.chunkSize || this.chunkSize);

    let processedSize = 0;
    let results = [];
    let metadata = {
      totalChunks: chunks.length,
      processedChunks: 0,
      startTime,
      errors: [],
      warnings: [],
    };

    // Initialize memory pool for this stream
    this.memoryPool.set(streamId, {
      chunks: [],
      results: [],
      tempData: new Map(),
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkStartTime = performance.now();

      try {
        // Check memory before processing
        await this.ensureMemoryAvailable(chunk.length);

        // Mark performance start
        if (performance.mark) {
          performance.mark(`streaming-chunk-${streamId}-${i}-start`);
        }

        // Process chunk
        const chunkResult = await this.processChunk(streamId, chunk, processor, {
          ...options,
          chunkIndex: i,
          totalChunks: chunks.length,
        });

        // Mark performance end
        if (performance.mark) {
          performance.mark(`streaming-chunk-${streamId}-${i}-end`);
          performance.measure(`streaming-chunk-${streamId}-${i}`, `streaming-chunk-${streamId}-${i}-start`, `streaming-chunk-${streamId}-${i}-end`);
        }

        results.push(chunkResult);
        processedSize += chunk.length;
        metadata.processedChunks++;

        // Report progress
        const progress = Math.round((processedSize / dataSize) * 100);
        this.onProgress(streamId, progress, {
          processedSize,
          totalSize: dataSize,
          chunkIndex: i,
          totalChunks: chunks.length,
          chunkTime: performance.now() - chunkStartTime,
        });

        this.onChunkProcessed(streamId, chunkResult, i);

        // Yield control to prevent blocking
        if (this.processingDelay > 0) {
          await this.delay(this.processingDelay);
        }

        // Cleanup processed chunk from memory
        this.releaseChunkMemory(streamId, i);
      } catch (error) {
        metadata.errors.push({
          chunkIndex: i,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        this.onError(streamId, error, { chunkIndex: i });

        // Continue processing other chunks unless critical error
        if (options.stopOnError) {
          throw error;
        }
      }
    }

    // Combine results
    const finalResult = await this.combineResults(results, options);

    metadata.endTime = performance.now();
    metadata.totalTime = metadata.endTime - startTime;
    metadata.averageChunkTime = metadata.totalTime / chunks.length;

    return {
      data: finalResult,
      metadata,
      streamId,
    };
  }

  /**
   * Create chunks from data
   * @param {string|ArrayBuffer} data - Data to chunk
   * @param {number} chunkSize - Size of each chunk
   * @returns {Array} Array of chunks
   */
  createChunks(data, chunkSize) {
    const chunks = [];

    if (typeof data === "string") {
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }
    } else if (data instanceof ArrayBuffer) {
      const view = new Uint8Array(data);
      for (let i = 0; i < view.length; i += chunkSize) {
        chunks.push(view.slice(i, i + chunkSize));
      }
    } else {
      throw new Error("Unsupported data type for streaming");
    }

    return chunks;
  }

  /**
   * Process a single chunk
   * @param {string} streamId - Stream identifier
   * @param {string|Uint8Array} chunk - Chunk to process
   * @param {Function} processor - Processing function
   * @param {Object} options - Processing options
   * @returns {Promise<*>} Processed chunk result
   */
  async processChunk(streamId, chunk, processor, options) {
    // Store chunk in memory pool temporarily
    const pool = this.memoryPool.get(streamId);
    if (pool) {
      pool.chunks[options.chunkIndex] = chunk;
      this.currentMemoryUsage += this.getDataSize(chunk);
    }

    try {
      // Process the chunk
      const result = await processor(chunk, options);

      // Store result in memory pool
      if (pool) {
        pool.results[options.chunkIndex] = result;
      }

      return result;
    } catch (error) {
      throw new Error(`Chunk processing failed at index ${options.chunkIndex}: ${error.message}`);
    }
  }

  /**
   * Combine processed results
   * @param {Array} results - Array of chunk results
   * @param {Object} options - Combination options
   * @returns {Promise<*>} Combined result
   */
  async combineResults(results, options) {
    if (options.combiner && typeof options.combiner === "function") {
      return await options.combiner(results);
    }

    // Default combination logic
    if (results.length === 0) {
      return "";
    }

    // If all results are strings, concatenate
    if (results.every((r) => typeof r === "string")) {
      return results.join("");
    }

    // If all results are arrays, flatten
    if (results.every((r) => Array.isArray(r))) {
      return results.flat();
    }

    // Otherwise return as array
    return results;
  }

  /**
   * Ensure memory is available for processing
   * @param {number} requiredMemory - Required memory in bytes
   * @returns {Promise<void>}
   */
  async ensureMemoryAvailable(requiredMemory) {
    if (this.currentMemoryUsage + requiredMemory > this.maxMemoryUsage) {
      // Try garbage collection
      await this.performGarbageCollection();

      // Check again after GC
      if (this.currentMemoryUsage + requiredMemory > this.maxMemoryUsage) {
        this.onMemoryWarning({
          current: this.currentMemoryUsage,
          required: requiredMemory,
          max: this.maxMemoryUsage,
        });

        // Force cleanup of oldest streams
        await this.forceMemoryCleanup();
      }
    }
  }

  /**
   * Perform garbage collection
   * @returns {Promise<void>}
   */
  async performGarbageCollection() {
    // Manual garbage collection hints
    if (window.gc) {
      window.gc();
    }

    // Clean up memory pools
    this.cleanupMemoryPools();

    // Update metrics
    this.performanceMetrics.gcCount++;

    // Yield to allow GC to run
    await this.delay(10);
  }

  /**
   * Force memory cleanup
   * @returns {Promise<void>}
   */
  async forceMemoryCleanup() {
    // Remove oldest inactive streams from memory pool
    const streamIds = Array.from(this.memoryPool.keys());
    const inactiveStreams = streamIds.filter((id) => !this.activeStreams.has(id));

    // Remove half of inactive streams
    const toRemove = inactiveStreams.slice(0, Math.ceil(inactiveStreams.length / 2));
    toRemove.forEach((streamId) => {
      this.cleanupStream(streamId);
    });

    await this.performGarbageCollection();
  }

  /**
   * Clean up memory pools
   */
  cleanupMemoryPools() {
    this.memoryPool.forEach((pool, streamId) => {
      if (!this.activeStreams.has(streamId)) {
        // Clean up old chunks and results
        pool.chunks = pool.chunks.filter((chunk, index) => {
          if (chunk) {
            this.currentMemoryUsage -= this.getDataSize(chunk);
            return false;
          }
          return true;
        });

        pool.tempData.clear();
      }
    });
  }

  /**
   * Release memory for a processed chunk
   * @param {string} streamId - Stream identifier
   * @param {number} chunkIndex - Chunk index
   */
  releaseChunkMemory(streamId, chunkIndex) {
    const pool = this.memoryPool.get(streamId);
    if (pool && pool.chunks[chunkIndex]) {
      this.currentMemoryUsage -= this.getDataSize(pool.chunks[chunkIndex]);
      delete pool.chunks[chunkIndex];
    }
  }

  /**
   * Clean up stream resources
   * @param {string} streamId - Stream identifier
   */
  cleanupStream(streamId) {
    const pool = this.memoryPool.get(streamId);
    if (pool) {
      // Release all chunk memory
      pool.chunks.forEach((chunk) => {
        if (chunk) {
          this.currentMemoryUsage -= this.getDataSize(chunk);
        }
      });

      // Clear temp data
      pool.tempData.clear();

      // Remove from memory pool
      this.memoryPool.delete(streamId);
    }
  }

  /**
   * Check current memory usage
   */
  checkMemoryUsage() {
    // Update peak usage
    if (this.currentMemoryUsage > this.performanceMetrics.memoryPeakUsage) {
      this.performanceMetrics.memoryPeakUsage = this.currentMemoryUsage;
    }

    // Warn if approaching limit
    const usagePercent = (this.currentMemoryUsage / this.maxMemoryUsage) * 100;
    if (usagePercent > 80) {
      this.onMemoryWarning({
        current: this.currentMemoryUsage,
        max: this.maxMemoryUsage,
        percentage: usagePercent,
      });
    }
  }

  /**
   * Update performance metrics
   * @param {PerformanceEntry} entry - Performance entry
   */
  updatePerformanceMetrics(entry) {
    const chunkTime = entry.duration;
    const totalChunks = this.performanceMetrics.totalProcessed + 1;

    this.performanceMetrics.averageChunkTime = (this.performanceMetrics.averageChunkTime * this.performanceMetrics.totalProcessed + chunkTime) / totalChunks;

    this.performanceMetrics.totalProcessed = totalChunks;
  }

  /**
   * Get data size in bytes
   * @param {*} data - Data to measure
   * @returns {number} Size in bytes
   */
  getDataSize(data) {
    if (typeof data === "string") {
      return new Blob([data]).size;
    } else if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (data instanceof Uint8Array) {
      return data.byteLength;
    } else if (data && typeof data === "object") {
      return new Blob([JSON.stringify(data)]).size;
    }
    return 0;
  }

  /**
   * Generate unique stream ID
   * @returns {string} Stream ID
   */
  generateStreamId() {
    return `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      currentMemoryUsage: this.currentMemoryUsage,
      maxMemoryUsage: this.maxMemoryUsage,
      activeStreams: this.activeStreams.size,
      memoryPoolSize: this.memoryPool.size,
    };
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory statistics
   */
  getMemoryStats() {
    const stats = {
      current: this.currentMemoryUsage,
      max: this.maxMemoryUsage,
      peak: this.performanceMetrics.memoryPeakUsage,
      percentage: (this.currentMemoryUsage / this.maxMemoryUsage) * 100,
      activeStreams: this.activeStreams.size,
      pooledStreams: this.memoryPool.size,
    };

    // Add pool breakdown
    stats.poolBreakdown = {};
    this.memoryPool.forEach((pool, streamId) => {
      let poolSize = 0;
      pool.chunks.forEach((chunk) => {
        if (chunk) poolSize += this.getDataSize(chunk);
      });
      stats.poolBreakdown[streamId] = poolSize;
    });

    return stats;
  }

  /**
   * Optimize processing parameters based on performance
   * @returns {Object} Optimization suggestions
   */
  getOptimizationSuggestions() {
    const metrics = this.getPerformanceMetrics();
    const suggestions = [];

    // Chunk size optimization
    if (metrics.averageChunkTime > 100) {
      suggestions.push({
        type: "chunkSize",
        current: this.chunkSize,
        suggested: Math.max(this.chunkSize / 2, 512 * 1024),
        reason: "Reduce chunk size to improve responsiveness",
      });
    } else if (metrics.averageChunkTime < 10) {
      suggestions.push({
        type: "chunkSize",
        current: this.chunkSize,
        suggested: Math.min(this.chunkSize * 2, 5 * 1024 * 1024),
        reason: "Increase chunk size to improve throughput",
      });
    }

    // Memory optimization
    if (metrics.memoryPeakUsage > this.maxMemoryUsage * 0.9) {
      suggestions.push({
        type: "memory",
        current: this.maxMemoryUsage,
        suggested: this.maxMemoryUsage * 1.5,
        reason: "Increase memory limit to reduce GC pressure",
      });
    }

    // Processing delay optimization
    if (metrics.gcCount > 10) {
      suggestions.push({
        type: "processingDelay",
        current: this.processingDelay,
        suggested: this.processingDelay + 5,
        reason: "Increase processing delay to reduce memory pressure",
      });
    }

    return suggestions;
  }

  /**
   * Apply optimization suggestions
   * @param {Array} suggestions - Optimization suggestions
   */
  applyOptimizations(suggestions) {
    suggestions.forEach((suggestion) => {
      switch (suggestion.type) {
        case "chunkSize":
          this.chunkSize = suggestion.suggested;
          break;
        case "memory":
          this.maxMemoryUsage = suggestion.suggested;
          break;
        case "processingDelay":
          this.processingDelay = suggestion.suggested;
          break;
      }
    });
  }

  /**
   * Destroy streaming processor
   */
  destroy() {
    // Clear intervals
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    // Disconnect performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    // Clean up all streams
    this.activeStreams.forEach((streamId) => {
      this.cleanupStream(streamId);
    });

    // Clear collections
    this.activeStreams.clear();
    this.memoryPool.clear();
    this.currentMemoryUsage = 0;
  }
}
