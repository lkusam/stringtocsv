/**
 * PerformanceMonitor - Minimal implementation for v3 performance tracking
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    this.onPerformanceAlert = options.onPerformanceAlert || (() => {});
    this.onOptimizationSuggestion = options.onOptimizationSuggestion || (() => {});
    this.metrics = new Map();
  }

  recordMetric(name, value) {
    this.metrics.set(name, value);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  destroy() {
    this.metrics.clear();
  }
}
