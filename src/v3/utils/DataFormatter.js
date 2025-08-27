/**
 * DataFormatter - Advanced data formatting and handling utilities
 * Supports custom date/time formats, number formatting, and structured data operations
 */

export class DataFormatter {
  constructor(options = {}) {
    this.locale = options.locale || "en-US";
    this.timezone = options.timezone || "UTC";
    this.currency = options.currency || "USD";

    // Format configurations
    this.dateFormats = new Map();
    this.numberFormats = new Map();
    this.customFormatters = new Map();

    // Data type handlers
    this.typeHandlers = new Map();

    // Nested data options
    this.nestedOptions = {
      maxDepth: options.maxDepth || 10,
      arrayIndexing: options.arrayIndexing !== false,
      preserveTypes: options.preserveTypes !== false,
      flattenArrays: options.flattenArrays || false,
    };

    this.init();
  }

  /**
   * Initialize data formatter
   */
  init() {
    this.setupBuiltInFormats();
    this.setupTypeHandlers();
  }

  /**
   * Setup built-in format configurations
   */
  setupBuiltInFormats() {
    // Date formats
    this.dateFormats.set("iso", "YYYY-MM-DD");
    this.dateFormats.set("us", "MM/DD/YYYY");
    this.dateFormats.set("eu", "DD/MM/YYYY");
    this.dateFormats.set("long", "MMMM DD, YYYY");
    this.dateFormats.set("short", "MMM DD, YY");
    this.dateFormats.set("timestamp", "YYYY-MM-DD HH:mm:ss");
    this.dateFormats.set("iso-full", "YYYY-MM-DDTHH:mm:ss.sssZ");

    // Number formats
    this.numberFormats.set("integer", { maximumFractionDigits: 0 });
    this.numberFormats.set("decimal", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.numberFormats.set("currency", { style: "currency", currency: this.currency });
    this.numberFormats.set("percent", { style: "percent", minimumFractionDigits: 1 });
    this.numberFormats.set("scientific", { notation: "scientific" });
    this.numberFormats.set("compact", { notation: "compact" });
  }

  /**
   * Setup type handlers
   */
  setupTypeHandlers() {
    this.typeHandlers.set("string", this.formatString.bind(this));
    this.typeHandlers.set("number", this.formatNumber.bind(this));
    this.typeHandlers.set("boolean", this.formatBoolean.bind(this));
    this.typeHandlers.set("date", this.formatDate.bind(this));
    this.typeHandlers.set("array", this.formatArray.bind(this));
    this.typeHandlers.set("object", this.formatObject.bind(this));
    this.typeHandlers.set("null", this.formatNull.bind(this));
    this.typeHandlers.set("undefined", this.formatUndefined.bind(this));
  }

  /**
   * Format data based on type and options
   * @param {*} data - Data to format
   * @param {Object} options - Formatting options
   * @returns {*} Formatted data
   */
  format(data, options = {}) {
    const type = this.getDataType(data);
    const handler = this.typeHandlers.get(type);

    if (handler) {
      return handler(data, options);
    }

    return data;
  }

  /**
   * Get data type
   * @param {*} data - Data to check
   * @returns {string} Data type
   */
  getDataType(data) {
    if (data === null) return "null";
    if (data === undefined) return "undefined";
    if (Array.isArray(data)) return "array";
    if (data instanceof Date) return "date";

    return typeof data;
  }

  /**
   * Format string data
   * @param {string} str - String to format
   * @param {Object} options - Format options
   * @returns {string} Formatted string
   */
  formatString(str, options = {}) {
    let result = String(str);

    if (options.trim) {
      result = result.trim();
    }

    if (options.case) {
      switch (options.case) {
        case "upper":
          result = result.toUpperCase();
          break;
        case "lower":
          result = result.toLowerCase();
          break;
        case "title":
          result = this.toTitleCase(result);
          break;
        case "sentence":
          result = this.toSentenceCase(result);
          break;
        case "camel":
          result = this.toCamelCase(result);
          break;
        case "pascal":
          result = this.toPascalCase(result);
          break;
        case "kebab":
          result = this.toKebabCase(result);
          break;
        case "snake":
          result = this.toSnakeCase(result);
          break;
      }
    }

    if (options.maxLength && result.length > options.maxLength) {
      result = result.substring(0, options.maxLength);
      if (options.ellipsis !== false) {
        result += "...";
      }
    }

    if (options.pad) {
      const { length, char = " ", direction = "end" } = options.pad;
      if (direction === "start") {
        result = result.padStart(length, char);
      } else {
        result = result.padEnd(length, char);
      }
    }

    if (options.replace) {
      const { search, replacement, global = false } = options.replace;
      const flags = global ? "g" : "";
      const regex = new RegExp(search, flags);
      result = result.replace(regex, replacement);
    }

    return result;
  }

  /**
   * Format number data
   * @param {number} num - Number to format
   * @param {Object} options - Format options
   * @returns {string} Formatted number
   */
  formatNumber(num, options = {}) {
    const number = Number(num);

    if (isNaN(number)) {
      return options.fallback || String(num);
    }

    if (options.format && this.numberFormats.has(options.format)) {
      const formatConfig = this.numberFormats.get(options.format);
      return new Intl.NumberFormat(this.locale, formatConfig).format(number);
    }

    // Custom formatting options
    const formatOptions = {
      minimumIntegerDigits: options.minIntegerDigits,
      minimumFractionDigits: options.minFractionDigits,
      maximumFractionDigits: options.maxFractionDigits,
      minimumSignificantDigits: options.minSignificantDigits,
      maximumSignificantDigits: options.maxSignificantDigits,
      style: options.style,
      currency: options.currency || this.currency,
      notation: options.notation,
      signDisplay: options.signDisplay,
      ...options.intlOptions,
    };

    // Remove undefined values
    Object.keys(formatOptions).forEach((key) => {
      if (formatOptions[key] === undefined) {
        delete formatOptions[key];
      }
    });

    try {
      return new Intl.NumberFormat(this.locale, formatOptions).format(number);
    } catch (error) {
      console.warn("Number formatting failed:", error);
      return String(number);
    }
  }

  /**
   * Format boolean data
   * @param {boolean} bool - Boolean to format
   * @param {Object} options - Format options
   * @returns {string} Formatted boolean
   */
  formatBoolean(bool, options = {}) {
    if (options.format) {
      switch (options.format) {
        case "yesno":
          return bool ? "Yes" : "No";
        case "onoff":
          return bool ? "On" : "Off";
        case "truefalse":
          return bool ? "True" : "False";
        case "numeric":
          return bool ? "1" : "0";
        case "custom":
          return bool ? options.trueValue || "true" : options.falseValue || "false";
      }
    }

    return String(bool);
  }

  /**
   * Format date data
   * @param {Date} date - Date to format
   * @param {Object} options - Format options
   * @returns {string} Formatted date
   */
  formatDate(date, options = {}) {
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
      return options.fallback || String(date);
    }

    if (options.format && this.dateFormats.has(options.format)) {
      const formatString = this.dateFormats.get(options.format);
      return this.formatDateWithPattern(dateObj, formatString, options);
    }

    if (options.pattern) {
      return this.formatDateWithPattern(dateObj, options.pattern, options);
    }

    // Use Intl.DateTimeFormat
    const formatOptions = {
      timeZone: options.timezone || this.timezone,
      year: options.year,
      month: options.month,
      day: options.day,
      hour: options.hour,
      minute: options.minute,
      second: options.second,
      weekday: options.weekday,
      era: options.era,
      timeZoneName: options.timeZoneName,
      ...options.intlOptions,
    };

    // Remove undefined values
    Object.keys(formatOptions).forEach((key) => {
      if (formatOptions[key] === undefined) {
        delete formatOptions[key];
      }
    });

    try {
      return new Intl.DateTimeFormat(this.locale, formatOptions).format(dateObj);
    } catch (error) {
      console.warn("Date formatting failed:", error);
      return dateObj.toISOString();
    }
  }

  /**
   * Format date with custom pattern
   * @param {Date} date - Date to format
   * @param {string} pattern - Format pattern
   * @param {Object} options - Additional options
   * @returns {string} Formatted date
   */
  formatDateWithPattern(date, pattern, options = {}) {
    const timezone = options.timezone || this.timezone;

    // Adjust for timezone if needed
    let workingDate = date;
    if (timezone !== "UTC") {
      // This is a simplified timezone handling
      // In production, you'd want to use a library like date-fns-tz
      workingDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
    }

    const tokens = {
      YYYY: workingDate.getFullYear(),
      YY: String(workingDate.getFullYear()).slice(-2),
      MMMM: workingDate.toLocaleString(this.locale, { month: "long" }),
      MMM: workingDate.toLocaleString(this.locale, { month: "short" }),
      MM: String(workingDate.getMonth() + 1).padStart(2, "0"),
      M: workingDate.getMonth() + 1,
      DDDD: workingDate.toLocaleString(this.locale, { weekday: "long" }),
      DDD: workingDate.toLocaleString(this.locale, { weekday: "short" }),
      DD: String(workingDate.getDate()).padStart(2, "0"),
      D: workingDate.getDate(),
      HH: String(workingDate.getHours()).padStart(2, "0"),
      H: workingDate.getHours(),
      hh: String(workingDate.getHours() % 12 || 12).padStart(2, "0"),
      h: workingDate.getHours() % 12 || 12,
      mm: String(workingDate.getMinutes()).padStart(2, "0"),
      m: workingDate.getMinutes(),
      ss: String(workingDate.getSeconds()).padStart(2, "0"),
      s: workingDate.getSeconds(),
      sss: String(workingDate.getMilliseconds()).padStart(3, "0"),
      A: workingDate.getHours() >= 12 ? "PM" : "AM",
      a: workingDate.getHours() >= 12 ? "pm" : "am",
      Z: this.getTimezoneOffset(workingDate),
      ZZ: this.getTimezoneOffset(workingDate, true),
    };

    let result = pattern;
    Object.entries(tokens).forEach(([token, value]) => {
      result = result.replace(new RegExp(token, "g"), String(value));
    });

    return result;
  }

  /**
   * Get timezone offset string
   * @param {Date} date - Date object
   * @param {boolean} colon - Include colon separator
   * @returns {string} Timezone offset
   */
  getTimezoneOffset(date, colon = false) {
    const offset = -date.getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? "+" : "-";
    const separator = colon ? ":" : "";

    return `${sign}${String(hours).padStart(2, "0")}${separator}${String(minutes).padStart(2, "0")}`;
  }

  /**
   * Format array data
   * @param {Array} arr - Array to format
   * @param {Object} options - Format options
   * @returns {*} Formatted array
   */
  formatArray(arr, options = {}) {
    if (options.join) {
      const separator = options.separator || ", ";
      const formatted = arr.map((item) => this.format(item, options.itemOptions || {}));
      return formatted.join(separator);
    }

    if (options.flatten && this.nestedOptions.flattenArrays) {
      return this.flattenArray(arr, options);
    }

    // Format each item in the array
    return arr.map((item) => this.format(item, options.itemOptions || {}));
  }

  /**
   * Format object data
   * @param {Object} obj - Object to format
   * @param {Object} options - Format options
   * @returns {*} Formatted object
   */
  formatObject(obj, options = {}) {
    if (options.flatten) {
      return this.flattenObject(obj, options);
    }

    if (options.expand) {
      return this.expandObject(obj, options);
    }

    // Format each property
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      const formattedKey = options.keyTransform ? this.transformKey(key, options.keyTransform) : key;
      result[formattedKey] = this.format(value, options.valueOptions || {});
    });

    return result;
  }

  /**
   * Format null values
   * @param {null} value - Null value
   * @param {Object} options - Format options
   * @returns {*} Formatted null
   */
  formatNull(value, options = {}) {
    return options.nullValue !== undefined ? options.nullValue : null;
  }

  /**
   * Format undefined values
   * @param {undefined} value - Undefined value
   * @param {Object} options - Format options
   * @returns {*} Formatted undefined
   */
  formatUndefined(value, options = {}) {
    return options.undefinedValue !== undefined ? options.undefinedValue : undefined;
  }

  /**
   * Flatten nested object
   * @param {Object} obj - Object to flatten
   * @param {Object} options - Flatten options
   * @returns {Object} Flattened object
   */
  flattenObject(obj, options = {}) {
    const { separator = ".", maxDepth = this.nestedOptions.maxDepth, preserveArrays = false, prefix = "" } = options;

    const result = {};

    const flatten = (current, depth = 0, currentPrefix = "") => {
      if (depth >= maxDepth) {
        result[currentPrefix || "value"] = current;
        return;
      }

      if (current === null || current === undefined) {
        result[currentPrefix || "value"] = current;
        return;
      }

      if (Array.isArray(current)) {
        if (preserveArrays) {
          result[currentPrefix || "value"] = current;
        } else {
          current.forEach((item, index) => {
            const key = currentPrefix ? `${currentPrefix}${separator}${index}` : String(index);
            flatten(item, depth + 1, key);
          });
        }
        return;
      }

      if (typeof current === "object") {
        Object.entries(current).forEach(([key, value]) => {
          const newKey = currentPrefix ? `${currentPrefix}${separator}${key}` : key;
          flatten(value, depth + 1, newKey);
        });
        return;
      }

      result[currentPrefix || "value"] = current;
    };

    flatten(obj, 0, prefix);
    return result;
  }

  /**
   * Expand flattened object
   * @param {Object} obj - Flattened object to expand
   * @param {Object} options - Expand options
   * @returns {Object} Expanded object
   */
  expandObject(obj, options = {}) {
    const { separator = ".", arrayIndicator = /^\d+$/ } = options;

    const result = {};

    Object.entries(obj).forEach(([key, value]) => {
      const keys = key.split(separator);
      let current = result;

      keys.forEach((k, index) => {
        const isLast = index === keys.length - 1;
        const isArrayIndex = arrayIndicator.test(k);
        const nextKey = keys[index + 1];
        const nextIsArrayIndex = nextKey && arrayIndicator.test(nextKey);

        if (isLast) {
          current[k] = value;
        } else {
          if (!current[k]) {
            current[k] = nextIsArrayIndex ? [] : {};
          }
          current = current[k];
        }
      });
    });

    return result;
  }

  /**
   * Flatten array
   * @param {Array} arr - Array to flatten
   * @param {Object} options - Flatten options
   * @returns {Array} Flattened array
   */
  flattenArray(arr, options = {}) {
    const { maxDepth = this.nestedOptions.maxDepth } = options;

    const flatten = (current, depth = 0) => {
      if (depth >= maxDepth) {
        return [current];
      }

      if (Array.isArray(current)) {
        return current.reduce((acc, item) => {
          return acc.concat(flatten(item, depth + 1));
        }, []);
      }

      return [current];
    };

    return flatten(arr);
  }

  /**
   * Transform object key
   * @param {string} key - Key to transform
   * @param {string} transform - Transform type
   * @returns {string} Transformed key
   */
  transformKey(key, transform) {
    switch (transform) {
      case "camel":
        return this.toCamelCase(key);
      case "pascal":
        return this.toPascalCase(key);
      case "kebab":
        return this.toKebabCase(key);
      case "snake":
        return this.toSnakeCase(key);
      case "upper":
        return key.toUpperCase();
      case "lower":
        return key.toLowerCase();
      default:
        return key;
    }
  }

  /**
   * Convert string to title case
   * @param {string} str - String to convert
   * @returns {string} Title case string
   */
  toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

  /**
   * Convert string to sentence case
   * @param {string} str - String to convert
   * @returns {string} Sentence case string
   */
  toSentenceCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Convert string to camel case
   * @param {string} str - String to convert
   * @returns {string} Camel case string
   */
  toCamelCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, "");
  }

  /**
   * Convert string to pascal case
   * @param {string} str - String to convert
   * @returns {string} Pascal case string
   */
  toPascalCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
        return word.toUpperCase();
      })
      .replace(/\s+/g, "");
  }

  /**
   * Convert string to kebab case
   * @param {string} str - String to convert
   * @returns {string} Kebab case string
   */
  toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  /**
   * Convert string to snake case
   * @param {string} str - String to convert
   * @returns {string} Snake case string
   */
  toSnakeCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/\s+/g, "_")
      .toLowerCase();
  }

  /**
   * Add custom date format
   * @param {string} name - Format name
   * @param {string} pattern - Format pattern
   */
  addDateFormat(name, pattern) {
    this.dateFormats.set(name, pattern);
  }

  /**
   * Add custom number format
   * @param {string} name - Format name
   * @param {Object} options - Intl.NumberFormat options
   */
  addNumberFormat(name, options) {
    this.numberFormats.set(name, options);
  }

  /**
   * Add custom formatter
   * @param {string} name - Formatter name
   * @param {Function} formatter - Formatter function
   */
  addCustomFormatter(name, formatter) {
    this.customFormatters.set(name, formatter);
  }

  /**
   * Use custom formatter
   * @param {string} name - Formatter name
   * @param {*} data - Data to format
   * @param {Object} options - Format options
   * @returns {*} Formatted data
   */
  useCustomFormatter(name, data, options = {}) {
    const formatter = this.customFormatters.get(name);
    if (formatter) {
      return formatter(data, options);
    }
    throw new Error(`Custom formatter "${name}" not found`);
  }

  /**
   * Batch format multiple values
   * @param {Array} data - Array of data to format
   * @param {Object} options - Format options
   * @returns {Array} Array of formatted data
   */
  batchFormat(data, options = {}) {
    return data.map((item) => this.format(item, options));
  }

  /**
   * Format data with multiple formatters
   * @param {*} data - Data to format
   * @param {Array} formatters - Array of formatter configurations
   * @returns {*} Formatted data
   */
  chainFormat(data, formatters) {
    return formatters.reduce((current, formatter) => {
      if (typeof formatter === "string") {
        return this.useCustomFormatter(formatter, current);
      } else if (typeof formatter === "object") {
        return this.format(current, formatter);
      } else if (typeof formatter === "function") {
        return formatter(current);
      }
      return current;
    }, data);
  }

  /**
   * Get available formats
   * @returns {Object} Available formats
   */
  getAvailableFormats() {
    return {
      dateFormats: Array.from(this.dateFormats.keys()),
      numberFormats: Array.from(this.numberFormats.keys()),
      customFormatters: Array.from(this.customFormatters.keys()),
    };
  }

  /**
   * Validate format options
   * @param {Object} options - Format options to validate
   * @returns {Object} Validation result
   */
  validateFormatOptions(options) {
    const errors = [];
    const warnings = [];

    // Validate date format
    if (options.format && options.format.includes("date")) {
      if (!this.dateFormats.has(options.format)) {
        errors.push(`Unknown date format: ${options.format}`);
      }
    }

    // Validate number format
    if (options.format && options.format.includes("number")) {
      if (!this.numberFormats.has(options.format)) {
        errors.push(`Unknown number format: ${options.format}`);
      }
    }

    // Validate custom formatter
    if (options.customFormatter && !this.customFormatters.has(options.customFormatter)) {
      errors.push(`Unknown custom formatter: ${options.customFormatter}`);
    }

    // Validate nested options
    if (options.maxDepth && options.maxDepth > 20) {
      warnings.push("Max depth > 20 may cause performance issues");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export formatter configuration
   * @returns {Object} Formatter configuration
   */
  exportConfig() {
    return {
      locale: this.locale,
      timezone: this.timezone,
      currency: this.currency,
      dateFormats: Object.fromEntries(this.dateFormats),
      numberFormats: Object.fromEntries(this.numberFormats),
      nestedOptions: this.nestedOptions,
      customFormatters: Array.from(this.customFormatters.keys()), // Functions can't be serialized
    };
  }

  /**
   * Import formatter configuration
   * @param {Object} config - Configuration to import
   */
  importConfig(config) {
    if (config.locale) this.locale = config.locale;
    if (config.timezone) this.timezone = config.timezone;
    if (config.currency) this.currency = config.currency;

    if (config.dateFormats) {
      Object.entries(config.dateFormats).forEach(([name, pattern]) => {
        this.dateFormats.set(name, pattern);
      });
    }

    if (config.numberFormats) {
      Object.entries(config.numberFormats).forEach(([name, options]) => {
        this.numberFormats.set(name, options);
      });
    }

    if (config.nestedOptions) {
      Object.assign(this.nestedOptions, config.nestedOptions);
    }
  }
}
