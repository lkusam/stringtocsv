/**
 * ThemeManager - Manages themes and accessibility features
 * Handles high contrast themes, dark mode, and visual customizations
 */

export class ThemeManager {
  constructor(options = {}) {
    this.themes = {
      classic: {
        name: "Classic",
        description: "Default theme with standard colors",
        colors: {
          primary: "#007cba",
          secondary: "#666666",
          background: "#ffffff",
          surface: "#f5f5f5",
          text: "#333333",
          textSecondary: "#666666",
          border: "#dddddd",
          success: "#28a745",
          warning: "#ffc107",
          error: "#dc3545",
          focus: "#007cba",
        },
      },
      material: {
        name: "Material",
        description: "Modern material design theme",
        colors: {
          primary: "#1976d2",
          secondary: "#757575",
          background: "#ffffff",
          surface: "#f5f5f5",
          text: "#212121",
          textSecondary: "#757575",
          border: "#e0e0e0",
          success: "#4caf50",
          warning: "#ff9800",
          error: "#f44336",
          focus: "#1976d2",
        },
      },
      highContrast: {
        name: "High Contrast",
        description: "High contrast theme for better accessibility",
        colors: {
          primary: "#000000",
          secondary: "#666666",
          background: "#ffffff",
          surface: "#f0f0f0",
          text: "#000000",
          textSecondary: "#333333",
          border: "#000000",
          success: "#006600",
          warning: "#cc6600",
          error: "#cc0000",
          focus: "#0000ff",
        },
      },
      darkHighContrast: {
        name: "Dark High Contrast",
        description: "Dark high contrast theme for accessibility",
        colors: {
          primary: "#ffffff",
          secondary: "#cccccc",
          background: "#000000",
          surface: "#1a1a1a",
          text: "#ffffff",
          textSecondary: "#cccccc",
          border: "#ffffff",
          success: "#00ff00",
          warning: "#ffff00",
          error: "#ff0000",
          focus: "#00ffff",
        },
      },
    };

    this.currentTheme = options.defaultTheme || "classic";
    this.darkMode = options.darkMode || false;
    this.highContrast = options.highContrast || false;
    this.reducedMotion = options.reducedMotion || false;

    // Event callbacks
    this.onThemeChange = options.onThemeChange || (() => {});

    this.init();
  }

  /**
   * Initialize theme manager
   */
  init() {
    // Check for system preferences
    this.detectSystemPreferences();

    // Apply initial theme
    this.applyTheme(this.currentTheme);

    // Listen for system preference changes
    this.setupSystemListeners();
  }

  /**
   * Detect system accessibility preferences
   */
  detectSystemPreferences() {
    if (window.matchMedia) {
      // Check for dark mode preference
      const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      if (darkModeQuery.matches && !this.darkMode) {
        this.darkMode = true;
      }

      // Check for high contrast preference
      const highContrastQuery = window.matchMedia("(prefers-contrast: high)");
      if (highContrastQuery.matches && !this.highContrast) {
        this.highContrast = true;
        this.currentTheme = this.darkMode ? "darkHighContrast" : "highContrast";
      }

      // Check for reduced motion preference
      const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (reducedMotionQuery.matches) {
        this.reducedMotion = true;
      }
    }
  }

  /**
   * Setup listeners for system preference changes
   */
  setupSystemListeners() {
    if (window.matchMedia) {
      // Dark mode changes
      const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      darkModeQuery.addEventListener("change", (e) => {
        this.setDarkMode(e.matches);
      });

      // High contrast changes
      const highContrastQuery = window.matchMedia("(prefers-contrast: high)");
      highContrastQuery.addEventListener("change", (e) => {
        this.setHighContrast(e.matches);
      });

      // Reduced motion changes
      const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      reducedMotionQuery.addEventListener("change", (e) => {
        this.setReducedMotion(e.matches);
      });
    }
  }

  /**
   * Apply a theme
   * @param {string} themeName - Theme to apply
   */
  applyTheme(themeName) {
    if (!this.themes[themeName]) {
      console.warn(`Theme "${themeName}" not found, using classic theme`);
      themeName = "classic";
    }

    const theme = this.themes[themeName];
    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply theme class
    document.body.className = document.body.className.replace(/theme-\w+/g, "");
    document.body.classList.add(`theme-${themeName}`);

    // Apply accessibility classes
    document.body.classList.toggle("dark-mode", this.darkMode);
    document.body.classList.toggle("high-contrast", this.highContrast);
    document.body.classList.toggle("reduced-motion", this.reducedMotion);

    this.currentTheme = themeName;
    this.onThemeChange(themeName, theme);
  }

  /**
   * Set theme
   * @param {string} themeName - Theme name
   */
  setTheme(themeName) {
    this.applyTheme(themeName);
  }

  /**
   * Toggle dark mode
   * @param {boolean} enabled - Enable dark mode
   */
  setDarkMode(enabled) {
    this.darkMode = enabled;

    // Switch to appropriate theme
    if (this.highContrast) {
      this.applyTheme(enabled ? "darkHighContrast" : "highContrast");
    } else {
      // Apply dark mode styling to current theme
      this.applyTheme(this.currentTheme);
    }
  }

  /**
   * Toggle high contrast mode
   * @param {boolean} enabled - Enable high contrast
   */
  setHighContrast(enabled) {
    this.highContrast = enabled;

    if (enabled) {
      this.applyTheme(this.darkMode ? "darkHighContrast" : "highContrast");
    } else {
      this.applyTheme("classic");
    }
  }

  /**
   * Set reduced motion preference
   * @param {boolean} enabled - Enable reduced motion
   */
  setReducedMotion(enabled) {
    this.reducedMotion = enabled;
    document.body.classList.toggle("reduced-motion", enabled);
  }

  /**
   * Get current theme
   * @returns {Object} Current theme object
   */
  getCurrentTheme() {
    return this.themes[this.currentTheme];
  }

  /**
   * Get all available themes
   * @returns {Object} All themes
   */
  getAvailableThemes() {
    return Object.keys(this.themes).map((key) => ({
      id: key,
      ...this.themes[key],
    }));
  }

  /**
   * Get current accessibility settings
   * @returns {Object} Accessibility settings
   */
  getAccessibilitySettings() {
    return {
      theme: this.currentTheme,
      darkMode: this.darkMode,
      highContrast: this.highContrast,
      reducedMotion: this.reducedMotion,
    };
  }

  /**
   * Apply accessibility settings
   * @param {Object} settings - Accessibility settings
   */
  applyAccessibilitySettings(settings) {
    if (settings.theme) {
      this.currentTheme = settings.theme;
    }
    if (typeof settings.darkMode === "boolean") {
      this.darkMode = settings.darkMode;
    }
    if (typeof settings.highContrast === "boolean") {
      this.highContrast = settings.highContrast;
    }
    if (typeof settings.reducedMotion === "boolean") {
      this.reducedMotion = settings.reducedMotion;
    }

    this.applyTheme(this.currentTheme);
  }

  /**
   * Create theme CSS
   * @returns {string} CSS string
   */
  generateThemeCSS() {
    const theme = this.getCurrentTheme();
    let css = ":root {\n";

    Object.entries(theme.colors).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`;
    });

    css += "}\n\n";

    // Add accessibility styles
    css += `
/* High contrast styles */
.high-contrast {
  --shadow: none;
  --border-width: 2px;
}

.high-contrast button,
.high-contrast input,
.high-contrast select,
.high-contrast textarea {
  border: 2px solid var(--color-border) !important;
}

.high-contrast button:focus,
.high-contrast input:focus,
.high-contrast select:focus,
.high-contrast textarea:focus {
  outline: 3px solid var(--color-focus) !important;
  outline-offset: 2px !important;
}

/* Reduced motion styles */
.reduced-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* Dark mode adjustments */
.dark-mode {
  --color-background: #1a1a1a;
  --color-surface: #2d2d2d;
  --color-text: #ffffff;
  --color-text-secondary: #cccccc;
  --color-border: #404040;
}

.dark-mode.high-contrast {
  --color-background: #000000;
  --color-surface: #1a1a1a;
  --color-text: #ffffff;
  --color-border: #ffffff;
}
`;

    return css;
  }
}
