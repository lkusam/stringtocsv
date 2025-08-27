/**
 * Core interfaces and data models for Chrome Extension v3
 * These interfaces define the structure for all major components
 */

/**
 * Processing Job interface - represents a data conversion task
 */
export class ProcessingJob {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.type = data.type || "simple"; // 'simple' | 'multi-column' | 'batch'
    this.status = data.status || "pending"; // 'pending' | 'processing' | 'completed' | 'error'
    this.input = {
      data: data.input?.data || "",
      source: data.input?.source || "text", // 'text' | 'file' | 'url'
      metadata: {
        size: data.input?.metadata?.size || 0,
        encoding: data.input?.metadata?.encoding || "utf-8",
        ...data.input?.metadata,
      },
    };
    this.settings = {
      separators: {
        row: data.settings?.separators?.row || "\n",
        column: data.settings?.separators?.column || ",",
      },
      quoting: {
        type: data.settings?.quoting?.type || "double", // 'single' | 'double'
        escape: data.settings?.quoting?.escape || "double",
      },
      validation: {
        enabled: data.settings?.validation?.enabled ?? true,
        rules: data.settings?.validation?.rules || [],
      },
      transformation: {
        rules: data.settings?.transformation?.rules || [],
      },
      ...data.settings,
    };
    this.output = {
      data: data.output?.data || "",
      format: data.output?.format || "csv", // 'csv' | 'tsv' | 'json'
      metadata: {
        rows: data.output?.metadata?.rows || 0,
        columns: data.output?.metadata?.columns || 0,
        ...data.output?.metadata,
      },
    };
    this.progress = {
      current: data.progress?.current || 0,
      total: data.progress?.total || 100,
    };
    this.errors = data.errors || [];
    this.warnings = data.warnings || [];
    this.created = data.created || new Date().toISOString();
    this.completed = data.completed || null;
  }

  generateId() {
    return "job-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  updateProgress(current, total = null) {
    this.progress.current = current;
    if (total !== null) {
      this.progress.total = total;
    }
  }

  addError(error) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message || error,
      stack: error.stack,
      ...error,
    });
  }

  addWarning(warning) {
    this.warnings.push({
      timestamp: new Date().toISOString(),
      message: warning.message || warning,
      ...warning,
    });
  }

  complete(outputData = null) {
    this.status = "completed";
    this.completed = new Date().toISOString();
    this.progress.current = this.progress.total;
    if (outputData) {
      this.output.data = outputData;
    }
  }

  fail(error) {
    this.status = "error";
    this.addError(error);
  }
}

/**
 * Validation Result interface - represents validation outcome
 */
export class ValidationResult {
  constructor(data = {}) {
    this.isValid = data.isValid ?? true;
    this.errors = data.errors || [];
    this.statistics = {
      totalRows: data.statistics?.totalRows || 0,
      totalColumns: data.statistics?.totalColumns || 0,
      emptyValues: data.statistics?.emptyValues || 0,
      duplicateRows: data.statistics?.duplicateRows || 0,
      dataTypes: {
        string: 0,
        number: 0,
        date: 0,
        boolean: 0,
        ...data.statistics?.dataTypes,
      },
    };
  }

  addError(type, severity, message, location = null, suggestion = null) {
    this.errors.push({
      type, // 'format' | 'data' | 'structure'
      severity, // 'error' | 'warning' | 'info'
      message,
      location, // { row: number, column: number }
      suggestion,
    });
    if (severity === "error") {
      this.isValid = false;
    }
  }

  updateStatistics(stats) {
    Object.assign(this.statistics, stats);
  }
}

/**
 * Template interface - represents saved conversion settings
 */
export class Template {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || "Untitled Template";
    this.description = data.description || "";
    this.version = data.version || "3.0";
    this.settings = {
      mode: data.settings?.mode || "simple", // 'simple' | 'multi-column' | 'batch'
      separators: {
        row: data.settings?.separators?.row || "\n",
        column: data.settings?.separators?.column || "\t",
      },
      quoting: {
        type: data.settings?.quoting?.type || "double",
        escapeMethod: data.settings?.quoting?.escapeMethod || "double",
      },
      validation: {
        enabled: data.settings?.validation?.enabled ?? true,
        rules: data.settings?.validation?.rules || [],
      },
      export: {
        format: data.settings?.export?.format || "csv",
        options: data.settings?.export?.options || {},
      },
      ...data.settings,
    };
    this.created = data.created || new Date().toISOString();
    this.modified = data.modified || new Date().toISOString();
  }

  generateId() {
    return "template-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  }

  update(newSettings) {
    Object.assign(this.settings, newSettings);
    this.modified = new Date().toISOString();
  }

  clone(newName = null) {
    const cloned = new Template({
      ...this,
      id: undefined, // Will generate new ID
      name: newName || `${this.name} (Copy)`,
      created: undefined, // Will use current timestamp
      modified: undefined,
    });
    return cloned;
  }
}

/**
 * Settings Storage Schema interface
 */
export class AppSettings {
  constructor(data = {}) {
    this.version = data.version || "3.0";
    this.ui = {
      theme: data.ui?.theme || "classic", // 'classic' | 'material'
      darkMode: data.ui?.darkMode ?? false,
      compactMode: data.ui?.compactMode ?? false,
      windowSize: {
        width: data.ui?.windowSize?.width || 400,
        height: data.ui?.windowSize?.height || 600,
      },
      activeTab: data.ui?.activeTab || "simple",
      collapsedSections: data.ui?.collapsedSections || [],
    };
    this.defaults = {
      simple: {
        separator: data.defaults?.simple?.separator || "newline",
        quoting: data.defaults?.simple?.quoting || "double",
        trim: data.defaults?.simple?.trim ?? true,
      },
      multiColumn: {
        rowSep: data.defaults?.multiColumn?.rowSep || "\n",
        colSep: data.defaults?.multiColumn?.colSep || "\t",
        headers: data.defaults?.multiColumn?.headers ?? true,
      },
      batch: {
        autoDetect: data.defaults?.batch?.autoDetect ?? true,
        validation: data.defaults?.batch?.validation ?? true,
      },
    };
    this.templates = data.templates || [];
    this.performance = {
      workerCount: data.performance?.workerCount || 2,
      streamingThreshold: data.performance?.streamingThreshold || 1048576, // 1MB
      previewLimit: data.performance?.previewLimit || 1000,
    };
  }

  addTemplate(template) {
    this.templates.push(template);
  }

  removeTemplate(templateId) {
    this.templates = this.templates.filter((t) => t.id !== templateId);
  }

  getTemplate(templateId) {
    return this.templates.find((t) => t.id === templateId);
  }

  updateUI(uiSettings) {
    Object.assign(this.ui, uiSettings);
  }

  updateDefaults(mode, settings) {
    if (this.defaults[mode]) {
      Object.assign(this.defaults[mode], settings);
    }
  }
}
