/**
 * WorkerPoolManager - Manages multiple worker instances for parallel processing
 * Provides load balancing and worker lifecycle management
 */

export class WorkerPoolManager {
  constructor(maxWorkers = 2, options = {}) {
    this.maxWorkers = maxWorkers;
    this.workers = new Map();
    this.availableWorkers = [];
    this.busyWorkers = new Set();
    this.jobQueue = [];
    this.jobCounter = 0;
    this.isInitialized = false;

    // Enhanced configuration options
    this.options = {
      maxQueueSize: options.maxQueueSize || 100,
      workerTimeout: options.workerTimeout || 30000, // 30 seconds
      loadBalanceStrategy: options.loadBalanceStrategy || "round-robin", // 'round-robin' | 'least-busy' | 'random'
      autoScale: options.autoScale || false,
      minWorkers: options.minWorkers || 1,
      maxIdleTime: options.maxIdleTime || 60000, // 1 minute
      retryAttempts: options.retryAttempts || 3,
      ...options,
    };

    // Load balancing state
    this.roundRobinIndex = 0;
    this.workerMetrics = new Map();

    // Auto-scaling and cleanup timers
    this.cleanupInterval = null;
    this.metricsInterval = null;

    // Event listeners for monitoring
    this.eventListeners = new Map();
  }

  /**
   * Initialize the worker pool
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create initial workers (start with minimum)
      const initialWorkers = this.options.autoScale ? this.options.minWorkers : this.maxWorkers;

      for (let i = 0; i < initialWorkers; i++) {
        await this.createWorker(`worker-${i}`, "conversion");
      }

      // Start monitoring and cleanup intervals
      this.startMonitoring();

      this.isInitialized = true;
      console.log(`WorkerPoolManager initialized with ${initialWorkers} workers`);

      this.emit("initialized", {
        workerCount: initialWorkers,
        maxWorkers: this.maxWorkers,
        autoScale: this.options.autoScale,
      });
    } catch (error) {
      console.error("Failed to initialize WorkerPoolManager:", error);
      throw error;
    }
  }

  /**
   * Create a new worker instance
   */
  async createWorker(workerId, workerType = "conversion") {
    if (this.workers.has(workerId)) {
      throw new Error(`Worker with ID ${workerId} already exists`);
    }

    try {
      // Create actual Web Worker instance based on type
      const workerScript = this.getWorkerScript(workerType);
      let instance;

      try {
        instance = new Worker(workerScript);
      } catch (workerError) {
        console.warn(`Failed to create worker from ${workerScript}, using fallback:`, workerError);
        // Create a mock worker for development/testing
        instance = this.createMockWorker(workerType);
      }

      const worker = {
        id: workerId,
        type: workerType,
        instance: instance,
        isAvailable: true,
        currentJob: null,
        createdAt: new Date(),
        lastUsed: new Date(),
        jobsCompleted: 0,
        jobsFailed: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        isHealthy: true,
        retryCount: 0,
      };

      // Setup worker event handlers
      this.setupWorkerHandlers(worker);

      // Initialize worker metrics
      this.workerMetrics.set(workerId, {
        cpuUsage: 0,
        memoryUsage: 0,
        queueLength: 0,
        responseTime: 0,
        errorRate: 0,
      });

      this.workers.set(workerId, worker);
      this.availableWorkers.push(workerId);

      console.log(`Worker ${workerId} (${workerType}) created successfully`);
      this.emit("workerCreated", { workerId, workerType });

      return worker;
    } catch (error) {
      console.error(`Failed to create worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Get worker script URL based on worker type
   */
  getWorkerScript(workerType) {
    const workerScripts = {
      conversion: "src/v3/workers/ConversionWorker.js",
      validation: "src/v3/workers/ValidationWorker.js",
      export: "src/v3/workers/ExportWorker.js",
    };

    const script = workerScripts[workerType];
    if (!script) {
      throw new Error(`Unknown worker type: ${workerType}`);
    }

    // For Chrome extension, we need to use chrome.runtime.getURL
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL(script);
    }

    // Fallback for development/testing
    return script;
  }

  /**
   * Setup event handlers for a worker instance
   */
  setupWorkerHandlers(worker) {
    const { instance, id } = worker;

    instance.onmessage = (event) => {
      this.handleWorkerMessage(id, event.data);
    };

    instance.onerror = (error) => {
      this.handleWorkerError(id, error);
    };

    instance.onmessageerror = (error) => {
      this.handleWorkerError(id, new Error(`Message error: ${error.message}`));
    };
  }

  /**
   * Get an available worker for a job using load balancing strategy
   */
  getAvailableWorker(workerType = "conversion") {
    const availableWorkers = this.availableWorkers.map((id) => this.workers.get(id)).filter((worker) => worker && worker.isAvailable && worker.isHealthy);

    if (availableWorkers.length === 0) {
      return null;
    }

    // Filter by worker type if specified
    const typeFilteredWorkers = availableWorkers.filter((worker) => worker.type === workerType);
    const candidateWorkers = typeFilteredWorkers.length > 0 ? typeFilteredWorkers : availableWorkers;

    // Apply load balancing strategy
    switch (this.options.loadBalanceStrategy) {
      case "round-robin":
        return this.getRoundRobinWorker(candidateWorkers);
      case "least-busy":
        return this.getLeastBusyWorker(candidateWorkers);
      case "random":
        return this.getRandomWorker(candidateWorkers);
      default:
        return candidateWorkers[0];
    }
  }

  /**
   * Round-robin load balancing
   */
  getRoundRobinWorker(workers) {
    if (workers.length === 0) return null;

    const worker = workers[this.roundRobinIndex % workers.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % workers.length;
    return worker;
  }

  /**
   * Least-busy load balancing (based on job completion metrics)
   */
  getLeastBusyWorker(workers) {
    if (workers.length === 0) return null;

    return workers.reduce((leastBusy, current) => {
      const currentMetrics = this.workerMetrics.get(current.id);
      const leastBusyMetrics = this.workerMetrics.get(leastBusy.id);

      // Consider average processing time and current queue length
      const currentLoad = (currentMetrics?.responseTime || 0) + (currentMetrics?.queueLength || 0);
      const leastBusyLoad = (leastBusyMetrics?.responseTime || 0) + (leastBusyMetrics?.queueLength || 0);

      return currentLoad < leastBusyLoad ? current : leastBusy;
    });
  }

  /**
   * Random load balancing
   */
  getRandomWorker(workers) {
    if (workers.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * workers.length);
    return workers[randomIndex];
  }

  /**
   * Execute a job using the worker pool with enhanced error handling and retry logic
   */
  async executeJob(jobData, workerType = "conversion", priority = 0, timeout = null) {
    // Check queue size limit
    if (this.jobQueue.length >= this.options.maxQueueSize) {
      throw new Error(`Job queue is full (${this.options.maxQueueSize} jobs)`);
    }

    return new Promise((resolve, reject) => {
      const job = {
        id: `job-${++this.jobCounter}`,
        data: jobData,
        workerType,
        priority,
        resolve,
        reject,
        createdAt: new Date(),
        timeout: timeout || this.options.workerTimeout,
        retryCount: 0,
        maxRetries: this.options.retryAttempts,
        startTime: null,
        endTime: null,
      };

      // Set job timeout
      job.timeoutHandle = setTimeout(() => {
        this.handleJobTimeout(job);
      }, job.timeout);

      // Try to execute immediately if worker available
      const worker = this.getAvailableWorker(workerType);
      if (worker) {
        this.assignJobToWorker(job, worker);
      } else {
        // Auto-scale if enabled and under max workers
        if (this.options.autoScale && this.workers.size < this.maxWorkers) {
          this.scaleUp(workerType)
            .then(() => {
              const newWorker = this.getAvailableWorker(workerType);
              if (newWorker) {
                this.assignJobToWorker(job, newWorker);
              } else {
                this.queueJob(job);
              }
            })
            .catch(() => {
              this.queueJob(job);
            });
        } else {
          this.queueJob(job);
        }
      }
    });
  }

  /**
   * Handle job timeout
   */
  handleJobTimeout(job) {
    if (job.resolve && job.reject) {
      job.reject(new Error(`Job ${job.id} timed out after ${job.timeout}ms`));
      this.emit("jobTimeout", { jobId: job.id, timeout: job.timeout });
    }
  }

  /**
   * Queue a job for later execution
   */
  queueJob(job) {
    // Insert job in priority order
    let insertIndex = this.jobQueue.length;
    for (let i = 0; i < this.jobQueue.length; i++) {
      if (this.jobQueue[i].priority < job.priority) {
        insertIndex = i;
        break;
      }
    }

    this.jobQueue.splice(insertIndex, 0, job);
    console.log(`Job ${job.id} queued (position: ${insertIndex + 1})`);
  }

  /**
   * Assign a job to a specific worker with enhanced tracking
   */
  async assignJobToWorker(job, worker) {
    try {
      // Clear job timeout since it's now being processed
      if (job.timeoutHandle) {
        clearTimeout(job.timeoutHandle);
        job.timeoutHandle = null;
      }

      // Mark worker as busy
      worker.isAvailable = false;
      worker.currentJob = job;
      worker.lastUsed = new Date();
      job.startTime = new Date();

      this.busyWorkers.add(worker.id);

      // Remove from available workers
      const index = this.availableWorkers.indexOf(worker.id);
      if (index > -1) {
        this.availableWorkers.splice(index, 1);
      }

      console.log(`Assigned job ${job.id} to worker ${worker.id}`);
      this.emit("jobAssigned", { jobId: job.id, workerId: worker.id });

      // Execute the job
      const result = await this.executeJobOnWorker(job, worker);

      // Job completed successfully
      job.endTime = new Date();
      job.resolve(result);
      this.onJobCompleted(job, worker);
    } catch (error) {
      // Job failed
      job.endTime = new Date();

      // Check if we should retry
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        console.log(`Retrying job ${job.id} (attempt ${job.retryCount}/${job.maxRetries})`);

        // Reset worker state
        this.resetWorkerState(worker);

        // Retry the job
        setTimeout(() => {
          const retryWorker = this.getAvailableWorker(job.workerType);
          if (retryWorker) {
            this.assignJobToWorker(job, retryWorker);
          } else {
            this.queueJob(job);
          }
        }, 1000 * job.retryCount); // Exponential backoff
      } else {
        job.reject(error);
        this.onJobFailed(job, worker, error);
      }
    }
  }

  /**
   * Reset worker state after job completion or failure
   */
  resetWorkerState(worker) {
    worker.isAvailable = true;
    worker.currentJob = null;
    this.busyWorkers.delete(worker.id);

    if (!this.availableWorkers.includes(worker.id)) {
      this.availableWorkers.push(worker.id);
    }
  }

  /**
   * Execute job on worker (placeholder implementation)
   */
  async executeJobOnWorker(job, worker) {
    return new Promise((resolve, reject) => {
      // Store job callbacks for worker message handling
      worker.jobResolve = resolve;
      worker.jobReject = reject;

      // Prepare message for worker
      const message = {
        type: this.getWorkerMessageType(job.workerType),
        jobId: job.id,
        input: job.data.input || job.data,
        settings: job.data.settings || {},
        startTime: Date.now(),
      };

      // Send job to worker
      try {
        worker.instance.postMessage(message);
      } catch (error) {
        reject(new Error(`Failed to send message to worker: ${error.message}`));
      }
    });
  }

  /**
   * Get the appropriate message type for worker communication
   */
  getWorkerMessageType(workerType) {
    const messageTypes = {
      conversion: "process",
      validation: "validate",
      export: "export",
    };
    return messageTypes[workerType] || "process";
  }

  /**
   * Handle job completion with enhanced metrics tracking
   */
  onJobCompleted(job, worker) {
    // Calculate processing time
    const processingTime = job.endTime - job.startTime;

    // Update worker stats
    worker.jobsCompleted++;
    worker.totalProcessingTime += processingTime;
    worker.averageProcessingTime = worker.totalProcessingTime / worker.jobsCompleted;

    // Reset worker state
    this.resetWorkerState(worker);

    // Update metrics
    this.updateWorkerMetrics(worker.id, {
      responseTime: processingTime,
      queueLength: this.jobQueue.length,
    });

    console.log(`Job ${job.id} completed by worker ${worker.id} in ${processingTime}ms`);
    this.emit("jobCompleted", {
      jobId: job.id,
      workerId: worker.id,
      processingTime,
      retryCount: job.retryCount,
    });

    // Process next job in queue
    this.processNextJob();

    // Check if we should scale down
    if (this.options.autoScale) {
      this.checkScaleDown();
    }
  }

  /**
   * Handle job failure with enhanced error tracking
   */
  onJobFailed(job, worker, error) {
    console.error(`Job ${job.id} failed on worker ${worker.id}:`, error);

    // Update worker stats
    worker.jobsFailed++;

    // Check worker health
    const errorRate = worker.jobsFailed / (worker.jobsCompleted + worker.jobsFailed);
    if (errorRate > 0.5 && worker.jobsCompleted + worker.jobsFailed > 5) {
      worker.isHealthy = false;
      console.warn(`Worker ${worker.id} marked as unhealthy (error rate: ${errorRate})`);
    }

    // Reset worker state
    this.resetWorkerState(worker);

    // Update metrics
    this.updateWorkerMetrics(worker.id, {
      errorRate: errorRate,
      queueLength: this.jobQueue.length,
    });

    this.emit("jobFailed", {
      jobId: job.id,
      workerId: worker.id,
      error: error.message,
      retryCount: job.retryCount,
    });

    // Process next job in queue
    this.processNextJob();
  }

  /**
   * Process the next job in the queue
   */
  processNextJob() {
    if (this.jobQueue.length === 0) {
      return;
    }

    const nextJob = this.jobQueue.shift();
    const worker = this.getAvailableWorker(nextJob.workerType);

    if (worker) {
      this.assignJobToWorker(nextJob, worker);
    } else {
      // Put job back in queue if no worker available
      this.jobQueue.unshift(nextJob);
    }
  }

  /**
   * Get worker pool statistics
   */
  getStatistics() {
    const totalJobs = Array.from(this.workers.values()).reduce((sum, worker) => sum + worker.jobsCompleted, 0);

    return {
      totalWorkers: this.workers.size,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      queuedJobs: this.jobQueue.length,
      totalJobsCompleted: totalJobs,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Terminate a specific worker
   */
  async terminateWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      console.warn(`Worker ${workerId} not found`);
      return false;
    }

    try {
      // If worker has current job, handle it
      if (worker.currentJob) {
        worker.currentJob.reject(new Error("Worker terminated"));
      }

      // Clean up worker
      if (worker.instance && worker.instance.terminate) {
        worker.instance.terminate();
      }

      // Remove from collections
      this.workers.delete(workerId);
      this.busyWorkers.delete(workerId);

      const availableIndex = this.availableWorkers.indexOf(workerId);
      if (availableIndex > -1) {
        this.availableWorkers.splice(availableIndex, 1);
      }

      console.log(`Worker ${workerId} terminated`);
      return true;
    } catch (error) {
      console.error(`Failed to terminate worker ${workerId}:`, error);
      return false;
    }
  }

  /**
   * Start monitoring intervals for auto-scaling and cleanup
   */
  startMonitoring() {
    // Cleanup idle workers every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleWorkers();
    }, 60000);

    // Update metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 10000);
  }

  /**
   * Stop monitoring intervals
   */
  stopMonitoring() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Scale up by creating additional workers
   */
  async scaleUp(workerType = "conversion") {
    if (this.workers.size >= this.maxWorkers) {
      return false;
    }

    try {
      const workerId = `worker-${this.workers.size}`;
      await this.createWorker(workerId, workerType);
      console.log(`Scaled up: Created worker ${workerId}`);
      this.emit("scaledUp", { workerId, totalWorkers: this.workers.size });
      return true;
    } catch (error) {
      console.error("Failed to scale up:", error);
      return false;
    }
  }

  /**
   * Check if we should scale down
   */
  checkScaleDown() {
    if (this.workers.size <= this.options.minWorkers) {
      return;
    }

    // Scale down if queue is empty and we have idle workers
    if (this.jobQueue.length === 0 && this.availableWorkers.length > 1) {
      const idleWorkers = this.availableWorkers
        .map((id) => this.workers.get(id))
        .filter((worker) => {
          const idleTime = Date.now() - worker.lastUsed.getTime();
          return idleTime > this.options.maxIdleTime;
        });

      if (idleWorkers.length > 0) {
        const workerToRemove = idleWorkers[0];
        this.terminateWorker(workerToRemove.id);
        console.log(`Scaled down: Removed idle worker ${workerToRemove.id}`);
        this.emit("scaledDown", { workerId: workerToRemove.id, totalWorkers: this.workers.size });
      }
    }
  }

  /**
   * Cleanup idle workers
   */
  cleanupIdleWorkers() {
    const now = Date.now();
    const idleWorkers = [];

    for (const [workerId, worker] of this.workers) {
      if (worker.isAvailable && !worker.isHealthy) {
        idleWorkers.push(workerId);
      } else if (worker.isAvailable) {
        const idleTime = now - worker.lastUsed.getTime();
        if (idleTime > this.options.maxIdleTime * 2) {
          // Double the idle time for cleanup
          idleWorkers.push(workerId);
        }
      }
    }

    // Remove unhealthy or very idle workers (but keep minimum)
    for (const workerId of idleWorkers) {
      if (this.workers.size > this.options.minWorkers) {
        this.terminateWorker(workerId);
      }
    }
  }

  /**
   * Update worker metrics
   */
  updateWorkerMetrics(workerId, metrics) {
    const currentMetrics = this.workerMetrics.get(workerId) || {};
    this.workerMetrics.set(workerId, { ...currentMetrics, ...metrics });
  }

  /**
   * Update overall metrics
   */
  updateMetrics() {
    const stats = this.getStatistics();
    this.emit("metricsUpdated", stats);
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(workerId, data) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }

    switch (data.type) {
      case "ready":
        // Worker is ready for work
        console.log(`Worker ${workerId} (${data.workerType}) is ready`);
        this.emit("workerReady", { workerId, workerType: data.workerType });
        break;

      case "result":
        if (worker.jobResolve) {
          worker.jobResolve(data.result);
          worker.jobResolve = null;
          worker.jobReject = null;
        }
        break;

      case "error":
        if (worker.jobReject) {
          worker.jobReject(new Error(data.error));
          worker.jobResolve = null;
          worker.jobReject = null;
        }
        break;

      case "progress":
        this.emit("jobProgress", {
          jobId: data.jobId,
          workerId: workerId,
          progress: data.progress,
        });
        break;

      case "pong":
        // Health check response
        worker.lastPong = Date.now();
        this.emit("workerHealthCheck", { workerId, healthy: true });
        break;

      default:
        console.warn(`Unknown message type from worker ${workerId}:`, data.type);
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(workerId, error) {
    console.error(`Worker ${workerId} error:`, error);

    const worker = this.workers.get(workerId);
    if (worker) {
      worker.isHealthy = false;

      if (worker.currentJob) {
        worker.currentJob.reject(error);
        this.onJobFailed(worker.currentJob, worker, error);
      }
    }

    this.emit("workerError", { workerId, error: error.message });
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
   * Emit event
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
   * Get detailed worker statistics
   */
  getDetailedStatistics() {
    const workers = Array.from(this.workers.values()).map((worker) => ({
      id: worker.id,
      type: worker.type,
      isAvailable: worker.isAvailable,
      isHealthy: worker.isHealthy,
      jobsCompleted: worker.jobsCompleted,
      jobsFailed: worker.jobsFailed,
      averageProcessingTime: worker.averageProcessingTime,
      lastUsed: worker.lastUsed,
      metrics: this.workerMetrics.get(worker.id),
    }));

    return {
      ...this.getStatistics(),
      workers,
      options: this.options,
      queueDetails: this.jobQueue.map((job) => ({
        id: job.id,
        type: job.workerType,
        priority: job.priority,
        retryCount: job.retryCount,
        queueTime: Date.now() - job.createdAt.getTime(),
      })),
    };
  }

  /**
   * Perform health check on all workers
   */
  async performHealthCheck() {
    const healthPromises = [];

    for (const [workerId, worker] of this.workers) {
      if (worker.instance && worker.isHealthy) {
        const healthPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => {
            worker.isHealthy = false;
            resolve({ workerId, healthy: false, reason: "timeout" });
          }, 5000);

          const originalHandler = worker.instance.onmessage;
          worker.instance.onmessage = (event) => {
            if (event.data.type === "pong") {
              clearTimeout(timeout);
              worker.lastPong = Date.now();
              resolve({ workerId, healthy: true });
              worker.instance.onmessage = originalHandler;
            } else if (originalHandler) {
              originalHandler(event);
            }
          };

          worker.instance.postMessage({ type: "ping" });
        });

        healthPromises.push(healthPromise);
      }
    }

    const results = await Promise.all(healthPromises);
    this.emit("healthCheckComplete", results);
    return results;
  }

  /**
   * Get worker capabilities
   */
  async getWorkerCapabilities(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker || !worker.instance) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Capabilities request timeout"));
      }, 5000);

      const originalHandler = worker.instance.onmessage;
      worker.instance.onmessage = (event) => {
        if (event.data.type === "capabilities") {
          clearTimeout(timeout);
          resolve(event.data.capabilities);
          worker.instance.onmessage = originalHandler;
        } else if (originalHandler) {
          originalHandler(event);
        }
      };

      worker.instance.postMessage({ type: "getCapabilities" });
    });
  }

  /**
   * Create a mock worker for fallback when real workers fail
   */
  createMockWorker(workerType) {
    const mockWorker = {
      postMessage: (data) => {
        // Simulate async processing
        setTimeout(() => {
          let result;

          switch (data.type) {
            case "process":
              result = this.simulateConversion(data);
              break;
            case "validate":
              result = this.simulateValidation(data);
              break;
            case "export":
              result = this.simulateExport(data);
              break;
            default:
              result = { error: `Unknown message type: ${data.type}` };
          }

          if (result.error) {
            mockWorker.onerror({ message: result.error });
          } else {
            mockWorker.onmessage({ data: { type: "result", jobId: data.jobId, result } });
          }
        }, 100);
      },
      terminate: () => {
        // Mock termination
      },
      onmessage: null,
      onerror: null,
      onmessageerror: null,
    };

    // Send ready signal
    setTimeout(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: "ready",
            workerType: workerType,
            capabilities: ["mock"],
            timestamp: Date.now(),
          },
        });
      }
    }, 10);

    return mockWorker;
  }

  /**
   * Terminate all workers and cleanup
   */
  async destroy() {
    console.log("Destroying WorkerPoolManager...");

    // Stop monitoring
    this.stopMonitoring();

    // Reject all queued jobs
    for (const job of this.jobQueue) {
      if (job.timeoutHandle) {
        clearTimeout(job.timeoutHandle);
      }
      job.reject(new Error("WorkerPoolManager destroyed"));
    }
    this.jobQueue = [];

    // Terminate all workers
    const workerIds = Array.from(this.workers.keys());
    for (const workerId of workerIds) {
      await this.terminateWorker(workerId);
    }

    // Reset state
    this.workers.clear();
    this.availableWorkers = [];
    this.busyWorkers.clear();
    this.workerMetrics.clear();
    this.eventListeners.clear();
    this.isInitialized = false;

    console.log("WorkerPoolManager destroyed");
  }

  // Placeholder simulation methods (to be replaced with actual worker implementations)

  simulateConversion(data) {
    // Simulate string to CSV conversion
    const lines = data.input.split("\n");
    const converted = lines
      .filter((line) => line.trim())
      .map((line) => `"${line.trim()}"`)
      .join(",\n");

    return {
      output: converted,
      metadata: {
        inputLines: lines.length,
        outputLines: lines.filter((line) => line.trim()).length,
      },
    };
  }

  simulateValidation(data) {
    // Simulate data validation
    const lines = data.input.split("\n");
    const errors = [];

    lines.forEach((line, index) => {
      if (line.trim() === "") {
        errors.push({
          type: "data",
          severity: "warning",
          message: "Empty line detected",
          location: { row: index + 1, column: 1 },
        });
      }
    });

    return {
      isValid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
      statistics: {
        totalRows: lines.length,
        emptyRows: lines.filter((line) => line.trim() === "").length,
      },
    };
  }

  simulateExport(data) {
    // Simulate export processing
    return {
      format: data.format || "csv",
      size: data.content ? data.content.length : 0,
      downloadUrl: "blob:...", // Would be actual blob URL
    };
  }
}
