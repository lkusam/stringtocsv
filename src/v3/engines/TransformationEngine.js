/**
 * TransformationEngine - Advanced data transformation with custom rules
 * Supports regex patterns, custom transformations, and rule categorization
 */

export class TransformationEngine {
  constructor(options = {}) {
    this.rules = new Map();
    this.ruleCategories = new Map();
    this.ruleChains = new Map();
    this.previewMode = options.previewMode || false;

    // Built-in rule types
    this.ruleTypes = {
      REGEX: "regex",
      FUNCTION: "function",
      REPLACE: "replace",
      FORMAT: "format",
      VALIDATE: "validate",
      CONDITIONAL: "conditional",
    };

    // Transformation context
    this.context = {
      variables: new Map(),
      functions: new Map(),
      counters: new Map(),
    };

    // Performance tracking
    this.executionStats = {
      totalTransformations: 0,
      totalExecutionTime: 0,
      ruleExecutionCounts: new Map(),
      ruleExecutionTimes: new Map(),
      errors: [],
    };

    // Event callbacks
    this.onRuleExecuted = options.onRuleExecuted || (() => {});
    this.onTransformationComplete = options.onTransformationComplete || (() => {});
    this.onError = options.onError || (() => {});
    this.onPreview = options.onPreview || (() => {});

    this.init();
  }

  /**
   * Initialize transformation engine
   */
  init() {
    this.setupBuiltInFunctions();
    this.setupBuiltInRules();
  }

  /**
   * Setup built-in transformation functions
   */
  setupBuiltInFunctions() {
    // String functions
    this.context.functions.set("uppercase", (str) => String(str).toUpperCase());
    this.context.functions.set("lowercase", (str) => String(str).toLowerCase());
    this.context.functions.set("capitalize", (str) => {
      const s = String(str);
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    });
    this.context.functions.set("trim", (str) => String(str).trim());
    this.context.functions.set("reverse", (str) => String(str).split("").reverse().join(""));

    // Number functions
    this.context.functions.set("round", (num, decimals = 0) => {
      return Number(Math.round(num + "e" + decimals) + "e-" + decimals);
    });
    this.context.functions.set("abs", (num) => Math.abs(Number(num)));
    this.context.functions.set("min", (...args) => Math.min(...args.map(Number)));
    this.context.functions.set("max", (...args) => Math.max(...args.map(Number)));

    // Date functions
    this.context.functions.set("now", () => new Date().toISOString());
    this.context.functions.set("formatDate", (date, format = "YYYY-MM-DD") => {
      const d = new Date(date);
      return this.formatDate(d, format);
    });

    // Utility functions
    this.context.functions.set("length", (str) => String(str).length);
    this.context.functions.set("substring", (str, start, end) => String(str).substring(start, end));
    this.context.functions.set("replace", (str, search, replace) => String(str).replace(search, replace));
    this.context.functions.set("split", (str, separator) => String(str).split(separator));
    this.context.functions.set("join", (arr, separator = ",") => (Array.isArray(arr) ? arr.join(separator) : String(arr)));

    // Counter functions
    this.context.functions.set("counter", (name = "default") => {
      const current = this.context.counters.get(name) || 0;
      this.context.counters.set(name, current + 1);
      return current + 1;
    });
    this.context.functions.set("resetCounter", (name = "default") => {
      this.context.counters.set(name, 0);
      return 0;
    });
  }

  /**
   * Setup built-in transformation rules
   */
  setupBuiltInRules() {
    // Email validation and formatting
    this.addRule("email-validation", {
      type: this.ruleTypes.REGEX,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      action: "validate",
      category: "validation",
      description: "Validate email addresses",
    });

    // Phone number formatting
    this.addRule("phone-us-format", {
      type: this.ruleTypes.REGEX,
      pattern: /(\d{3})(\d{3})(\d{4})/,
      replacement: "($1) $2-$3",
      category: "formatting",
      description: "Format US phone numbers",
    });

    // Date formatting
    this.addRule("date-iso-format", {
      type: this.ruleTypes.FUNCTION,
      function: (value) => {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toISOString().split("T")[0];
      },
      category: "formatting",
      description: "Convert dates to ISO format (YYYY-MM-DD)",
    });

    // Text cleaning
    this.addRule("remove-extra-spaces", {
      type: this.ruleTypes.REGEX,
      pattern: /\s+/g,
      replacement: " ",
      category: "cleaning",
      description: "Remove extra whitespace",
    });

    // Number formatting
    this.addRule("currency-format", {
      type: this.ruleTypes.FUNCTION,
      function: (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? value : `$${num.toFixed(2)}`;
      },
      category: "formatting",
      description: "Format numbers as currency",
    });
  }

  /**
   * Add a transformation rule
   * @param {string} name - Rule name
   * @param {Object} rule - Rule configuration
   */
  addRule(name, rule) {
    const ruleConfig = {
      name,
      type: rule.type || this.ruleTypes.FUNCTION,
      enabled: rule.enabled !== false,
      priority: rule.priority || 0,
      category: rule.category || "custom",
      description: rule.description || "",
      conditions: rule.conditions || [],
      ...rule,
    };

    // Validate rule
    this.validateRule(ruleConfig);

    // Store rule
    this.rules.set(name, ruleConfig);

    // Add to category
    this.addRuleToCategory(ruleConfig.category, name);

    // Initialize execution stats
    this.executionStats.ruleExecutionCounts.set(name, 0);
    this.executionStats.ruleExecutionTimes.set(name, 0);
  }

  /**
   * Validate rule configuration
   * @param {Object} rule - Rule to validate
   */
  validateRule(rule) {
    if (!rule.name) {
      throw new Error("Rule name is required");
    }

    switch (rule.type) {
      case this.ruleTypes.REGEX:
        if (!rule.pattern) {
          throw new Error("Regex rule requires pattern");
        }
        if (!(rule.pattern instanceof RegExp)) {
          throw new Error("Pattern must be a RegExp object");
        }
        break;

      case this.ruleTypes.FUNCTION:
        if (!rule.function || typeof rule.function !== "function") {
          throw new Error("Function rule requires a function");
        }
        break;

      case this.ruleTypes.REPLACE:
        if (rule.search === undefined || rule.replacement === undefined) {
          throw new Error("Replace rule requires search and replacement");
        }
        break;

      case this.ruleTypes.FORMAT:
        if (!rule.format) {
          throw new Error("Format rule requires format string");
        }
        break;
    }
  }

  /**
   * Add rule to category
   * @param {string} category - Category name
   * @param {string} ruleName - Rule name
   */
  addRuleToCategory(category, ruleName) {
    if (!this.ruleCategories.has(category)) {
      this.ruleCategories.set(category, {
        name: category,
        rules: new Set(),
        enabled: true,
        description: "",
      });
    }

    this.ruleCategories.get(category).rules.add(ruleName);
  }

  /**
   * Remove a rule
   * @param {string} name - Rule name
   * @returns {boolean} True if removed
   */
  removeRule(name) {
    const rule = this.rules.get(name);
    if (rule) {
      // Remove from category
      const category = this.ruleCategories.get(rule.category);
      if (category) {
        category.rules.delete(name);
      }

      // Remove from rules
      this.rules.delete(name);

      // Clean up stats
      this.executionStats.ruleExecutionCounts.delete(name);
      this.executionStats.ruleExecutionTimes.delete(name);

      return true;
    }
    return false;
  }

  /**
   * Enable/disable a rule
   * @param {string} name - Rule name
   * @param {boolean} enabled - Enable state
   */
  toggleRule(name, enabled) {
    const rule = this.rules.get(name);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Enable/disable a category
   * @param {string} category - Category name
   * @param {boolean} enabled - Enable state
   */
  toggleCategory(category, enabled) {
    const cat = this.ruleCategories.get(category);
    if (cat) {
      cat.enabled = enabled;

      // Update all rules in category
      cat.rules.forEach((ruleName) => {
        const rule = this.rules.get(ruleName);
        if (rule) {
          rule.enabled = enabled;
        }
      });
    }
  }

  /**
   * Create a rule chain
   * @param {string} name - Chain name
   * @param {Array<string>} ruleNames - Rule names in order
   */
  createRuleChain(name, ruleNames) {
    // Validate all rules exist
    const invalidRules = ruleNames.filter((ruleName) => !this.rules.has(ruleName));
    if (invalidRules.length > 0) {
      throw new Error(`Invalid rules in chain: ${invalidRules.join(", ")}`);
    }

    this.ruleChains.set(name, {
      name,
      rules: ruleNames,
      enabled: true,
    });
  }

  /**
   * Transform data using rules
   * @param {*} data - Data to transform
   * @param {Object} options - Transformation options
   * @returns {Promise<Object>} Transformation result
   */
  async transform(data, options = {}) {
    const startTime = performance.now();

    try {
      const result = await this.performTransformation(data, options);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Update stats
      this.executionStats.totalTransformations++;
      this.executionStats.totalExecutionTime += executionTime;

      const transformationResult = {
        originalData: data,
        transformedData: result.data,
        appliedRules: result.appliedRules,
        executionTime,
        errors: result.errors,
        warnings: result.warnings,
        preview: this.previewMode,
      };

      this.onTransformationComplete(transformationResult);

      return transformationResult;
    } catch (error) {
      this.onError(error);
      throw error;
    }
  }

  /**
   * Perform the actual transformation
   * @param {*} data - Data to transform
   * @param {Object} options - Transformation options
   * @returns {Promise<Object>} Transformation result
   */
  async performTransformation(data, options) {
    const { rules = [], categories = [], chains = [], skipValidation = false } = options;

    let transformedData = this.cloneData(data);
    const appliedRules = [];
    const errors = [];
    const warnings = [];

    // Determine which rules to apply
    const rulesToApply = this.determineRulesToApply(rules, categories, chains);

    // Sort rules by priority
    rulesToApply.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Apply rules
    for (const rule of rulesToApply) {
      if (!rule.enabled) continue;

      try {
        // Check conditions
        if (!this.checkRuleConditions(rule, transformedData)) {
          continue;
        }

        const ruleStartTime = performance.now();
        const ruleResult = await this.applyRule(rule, transformedData, options);
        const ruleEndTime = performance.now();

        if (ruleResult.applied) {
          transformedData = ruleResult.data;
          appliedRules.push({
            name: rule.name,
            type: rule.type,
            executionTime: ruleEndTime - ruleStartTime,
            changes: ruleResult.changes || 0,
          });

          // Update rule stats
          const currentCount = this.executionStats.ruleExecutionCounts.get(rule.name) || 0;
          const currentTime = this.executionStats.ruleExecutionTimes.get(rule.name) || 0;

          this.executionStats.ruleExecutionCounts.set(rule.name, currentCount + 1);
          this.executionStats.ruleExecutionTimes.set(rule.name, currentTime + (ruleEndTime - ruleStartTime));

          this.onRuleExecuted(rule, ruleResult);
        }

        if (ruleResult.warnings) {
          warnings.push(...ruleResult.warnings);
        }
      } catch (error) {
        errors.push({
          rule: rule.name,
          error: error.message,
          stack: error.stack,
        });

        this.onError(error, { rule: rule.name });
      }
    }

    return {
      data: transformedData,
      appliedRules,
      errors,
      warnings,
    };
  }

  /**
   * Determine which rules to apply
   * @param {Array} rules - Specific rules
   * @param {Array} categories - Rule categories
   * @param {Array} chains - Rule chains
   * @returns {Array} Rules to apply
   */
  determineRulesToApply(rules, categories, chains) {
    const rulesToApply = new Set();

    // Add specific rules
    rules.forEach((ruleName) => {
      const rule = this.rules.get(ruleName);
      if (rule) {
        rulesToApply.add(rule);
      }
    });

    // Add rules from categories
    categories.forEach((categoryName) => {
      const category = this.ruleCategories.get(categoryName);
      if (category && category.enabled) {
        category.rules.forEach((ruleName) => {
          const rule = this.rules.get(ruleName);
          if (rule) {
            rulesToApply.add(rule);
          }
        });
      }
    });

    // Add rules from chains
    chains.forEach((chainName) => {
      const chain = this.ruleChains.get(chainName);
      if (chain && chain.enabled) {
        chain.rules.forEach((ruleName) => {
          const rule = this.rules.get(ruleName);
          if (rule) {
            rulesToApply.add(rule);
          }
        });
      }
    });

    // If no specific rules/categories/chains, apply all enabled rules
    if (rules.length === 0 && categories.length === 0 && chains.length === 0) {
      this.rules.forEach((rule) => {
        if (rule.enabled) {
          rulesToApply.add(rule);
        }
      });
    }

    return Array.from(rulesToApply);
  }

  /**
   * Check if rule conditions are met
   * @param {Object} rule - Rule to check
   * @param {*} data - Current data
   * @returns {boolean} True if conditions are met
   */
  checkRuleConditions(rule, data) {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    return rule.conditions.every((condition) => {
      switch (condition.type) {
        case "dataType":
          return typeof data === condition.value;
        case "contains":
          return String(data).includes(condition.value);
        case "matches":
          return new RegExp(condition.value).test(String(data));
        case "length":
          return String(data).length >= (condition.min || 0) && String(data).length <= (condition.max || Infinity);
        default:
          return true;
      }
    });
  }

  /**
   * Apply a single rule
   * @param {Object} rule - Rule to apply
   * @param {*} data - Data to transform
   * @param {Object} options - Options
   * @returns {Promise<Object>} Rule result
   */
  async applyRule(rule, data, options) {
    switch (rule.type) {
      case this.ruleTypes.REGEX:
        return this.applyRegexRule(rule, data);
      case this.ruleTypes.FUNCTION:
        return this.applyFunctionRule(rule, data);
      case this.ruleTypes.REPLACE:
        return this.applyReplaceRule(rule, data);
      case this.ruleTypes.FORMAT:
        return this.applyFormatRule(rule, data);
      case this.ruleTypes.VALIDATE:
        return this.applyValidationRule(rule, data);
      case this.ruleTypes.CONDITIONAL:
        return this.applyConditionalRule(rule, data);
      default:
        throw new Error(`Unknown rule type: ${rule.type}`);
    }
  }

  /**
   * Apply regex rule
   * @param {Object} rule - Regex rule
   * @param {*} data - Data to transform
   * @returns {Object} Rule result
   */
  applyRegexRule(rule, data) {
    if (Array.isArray(data)) {
      return this.applyRuleToArray(rule, data);
    }

    const str = String(data);
    let changes = 0;
    let result = str;

    if (rule.action === "validate") {
      const isValid = rule.pattern.test(str);
      return {
        applied: true,
        data: data,
        changes: 0,
        warnings: isValid ? [] : [`Validation failed for rule ${rule.name}`],
      };
    } else if (rule.replacement !== undefined) {
      const matches = str.match(rule.pattern);
      if (matches) {
        result = str.replace(rule.pattern, rule.replacement);
        changes = matches.length;
      }
    }

    return {
      applied: changes > 0,
      data: result,
      changes,
    };
  }

  /**
   * Apply function rule
   * @param {Object} rule - Function rule
   * @param {*} data - Data to transform
   * @returns {Object} Rule result
   */
  applyFunctionRule(rule, data) {
    if (Array.isArray(data)) {
      return this.applyRuleToArray(rule, data);
    }

    try {
      const result = rule.function(data, this.context);
      return {
        applied: result !== data,
        data: result,
        changes: result !== data ? 1 : 0,
      };
    } catch (error) {
      throw new Error(`Function rule ${rule.name} failed: ${error.message}`);
    }
  }

  /**
   * Apply replace rule
   * @param {Object} rule - Replace rule
   * @param {*} data - Data to transform
   * @returns {Object} Rule result
   */
  applyReplaceRule(rule, data) {
    if (Array.isArray(data)) {
      return this.applyRuleToArray(rule, data);
    }

    const str = String(data);
    const result = str.replace(rule.search, rule.replacement);
    const changes = str !== result ? 1 : 0;

    return {
      applied: changes > 0,
      data: result,
      changes,
    };
  }

  /**
   * Apply format rule
   * @param {Object} rule - Format rule
   * @param {*} data - Data to transform
   * @returns {Object} Rule result
   */
  applyFormatRule(rule, data) {
    if (Array.isArray(data)) {
      return this.applyRuleToArray(rule, data);
    }

    try {
      const result = this.formatValue(data, rule.format);
      return {
        applied: result !== data,
        data: result,
        changes: result !== data ? 1 : 0,
      };
    } catch (error) {
      throw new Error(`Format rule ${rule.name} failed: ${error.message}`);
    }
  }

  /**
   * Apply validation rule
   * @param {Object} rule - Validation rule
   * @param {*} data - Data to validate
   * @returns {Object} Rule result
   */
  applyValidationRule(rule, data) {
    const isValid = rule.validator(data);

    return {
      applied: true,
      data: data,
      changes: 0,
      warnings: isValid ? [] : [`Validation failed: ${rule.message || "Invalid data"}`],
    };
  }

  /**
   * Apply conditional rule
   * @param {Object} rule - Conditional rule
   * @param {*} data - Data to transform
   * @returns {Object} Rule result
   */
  applyConditionalRule(rule, data) {
    const condition = rule.condition(data);

    if (condition) {
      return this.applyRule(rule.trueRule, data);
    } else if (rule.falseRule) {
      return this.applyRule(rule.falseRule, data);
    }

    return {
      applied: false,
      data: data,
      changes: 0,
    };
  }

  /**
   * Apply rule to array data
   * @param {Object} rule - Rule to apply
   * @param {Array} data - Array data
   * @returns {Object} Rule result
   */
  applyRuleToArray(rule, data) {
    let totalChanges = 0;
    const result = data.map((item) => {
      const itemResult = this.applyRule(rule, item);
      if (itemResult.applied) {
        totalChanges += itemResult.changes;
      }
      return itemResult.data;
    });

    return {
      applied: totalChanges > 0,
      data: result,
      changes: totalChanges,
    };
  }

  /**
   * Format value using format string
   * @param {*} value - Value to format
   * @param {string} format - Format string
   * @returns {*} Formatted value
   */
  formatValue(value, format) {
    // Simple format string implementation
    return format.replace(/\{(\w+)\}/g, (match, key) => {
      if (key === "value") {
        return value;
      } else if (this.context.functions.has(key)) {
        return this.context.functions.get(key)(value);
      }
      return match;
    });
  }

  /**
   * Format date
   * @param {Date} date - Date to format
   * @param {string} format - Format string
   * @returns {string} Formatted date
   */
  formatDate(date, format) {
    const map = {
      YYYY: date.getFullYear(),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      DD: String(date.getDate()).padStart(2, "0"),
      HH: String(date.getHours()).padStart(2, "0"),
      mm: String(date.getMinutes()).padStart(2, "0"),
      ss: String(date.getSeconds()).padStart(2, "0"),
    };

    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (match) => map[match]);
  }

  /**
   * Preview transformation
   * @param {*} data - Data to preview
   * @param {Object} options - Preview options
   * @returns {Promise<Object>} Preview result
   */
  async preview(data, options = {}) {
    const originalPreviewMode = this.previewMode;
    this.previewMode = true;

    try {
      const result = await this.transform(data, options);
      this.onPreview(result);
      return result;
    } finally {
      this.previewMode = originalPreviewMode;
    }
  }

  /**
   * Clone data for transformation
   * @param {*} data - Data to clone
   * @returns {*} Cloned data
   */
  cloneData(data) {
    if (data === null || typeof data !== "object") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.cloneData(item));
    }

    if (data instanceof Date) {
      return new Date(data.getTime());
    }

    const cloned = {};
    Object.keys(data).forEach((key) => {
      cloned[key] = this.cloneData(data[key]);
    });

    return cloned;
  }

  /**
   * Get all rules
   * @returns {Array} All rules
   */
  getAllRules() {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   * @param {string} category - Category name
   * @returns {Array} Rules in category
   */
  getRulesByCategory(category) {
    const cat = this.ruleCategories.get(category);
    if (!cat) return [];

    return Array.from(cat.rules)
      .map((name) => this.rules.get(name))
      .filter(Boolean);
  }

  /**
   * Get all categories
   * @returns {Array} All categories
   */
  getAllCategories() {
    return Array.from(this.ruleCategories.values());
  }

  /**
   * Get execution statistics
   * @returns {Object} Execution statistics
   */
  getExecutionStats() {
    return {
      ...this.executionStats,
      averageExecutionTime: this.executionStats.totalTransformations > 0 ? this.executionStats.totalExecutionTime / this.executionStats.totalTransformations : 0,
      ruleStats: Array.from(this.rules.keys()).map((name) => ({
        name,
        executions: this.executionStats.ruleExecutionCounts.get(name) || 0,
        totalTime: this.executionStats.ruleExecutionTimes.get(name) || 0,
        averageTime: (this.executionStats.ruleExecutionCounts.get(name) || 0) > 0 ? (this.executionStats.ruleExecutionTimes.get(name) || 0) / (this.executionStats.ruleExecutionCounts.get(name) || 1) : 0,
      })),
    };
  }

  /**
   * Export rules configuration
   * @returns {Object} Rules configuration
   */
  exportRules() {
    const rules = {};
    const categories = {};
    const chains = {};

    // Export rules
    this.rules.forEach((rule, name) => {
      rules[name] = {
        ...rule,
        // Convert RegExp to string for serialization
        pattern: rule.pattern instanceof RegExp ? rule.pattern.toString() : rule.pattern,
        // Convert function to string
        function: typeof rule.function === "function" ? rule.function.toString() : rule.function,
      };
    });

    // Export categories
    this.ruleCategories.forEach((category, name) => {
      categories[name] = {
        ...category,
        rules: Array.from(category.rules),
      };
    });

    // Export chains
    this.ruleChains.forEach((chain, name) => {
      chains[name] = chain;
    });

    return { rules, categories, chains };
  }

  /**
   * Import rules configuration
   * @param {Object} config - Rules configuration
   */
  importRules(config) {
    const { rules = {}, categories = {}, chains = {} } = config;

    // Clear existing
    this.rules.clear();
    this.ruleCategories.clear();
    this.ruleChains.clear();

    // Import rules
    Object.entries(rules).forEach(([name, rule]) => {
      // Convert string pattern back to RegExp
      if (typeof rule.pattern === "string" && rule.pattern.startsWith("/")) {
        const match = rule.pattern.match(/^\/(.+)\/([gimuy]*)$/);
        if (match) {
          rule.pattern = new RegExp(match[1], match[2]);
        }
      }

      // Convert string function back to function
      if (typeof rule.function === "string") {
        try {
          rule.function = new Function("return " + rule.function)();
        } catch (e) {
          console.warn(`Failed to parse function for rule ${name}:`, e);
        }
      }

      this.addRule(name, rule);
    });

    // Import categories
    Object.entries(categories).forEach(([name, category]) => {
      this.ruleCategories.set(name, {
        ...category,
        rules: new Set(category.rules),
      });
    });

    // Import chains
    Object.entries(chains).forEach(([name, chain]) => {
      this.ruleChains.set(name, chain);
    });
  }

  /**
   * Reset execution statistics
   */
  resetStats() {
    this.executionStats = {
      totalTransformations: 0,
      totalExecutionTime: 0,
      ruleExecutionCounts: new Map(),
      ruleExecutionTimes: new Map(),
      errors: [],
    };

    // Reinitialize rule stats
    this.rules.forEach((rule, name) => {
      this.executionStats.ruleExecutionCounts.set(name, 0);
      this.executionStats.ruleExecutionTimes.set(name, 0);
    });
  }

  /**
   * Destroy transformation engine
   */
  destroy() {
    this.rules.clear();
    this.ruleCategories.clear();
    this.ruleChains.clear();
    this.context.variables.clear();
    this.context.functions.clear();
    this.context.counters.clear();
    this.resetStats();
  }
}
