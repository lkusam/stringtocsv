/**
 * MemoryManager - Minimal implementation for v3 memory management
 */

export class MemoryManager {
  constructor(options = {}) {
    this.maxMemoryUsage = options.maxMemoryUsage || 50 * 1024 * 1024; // 50MB
    this.onMemoryWarning = options.onMemoryWarning || (() => {});
    this.memoryUsage = 0;
  }

  trackMemoryUsage(size) {
    this.memoryUsage += size;
    if (this.memoryUsage > this.maxMemoryUsage) {
      this.onMemoryWarning({ usage: this.memoryUsage, limit: this.maxMemoryUsage });
    }
  }

  getMemoryUsage() {
    return this.memoryUsage;
  }

  cleanup() {
    this.memoryUsage = 0;
  }

  destroy() {
    this.cleanup();
  }
}
