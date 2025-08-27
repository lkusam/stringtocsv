/**
 * Unit tests for AccessibilityManager
 */

import { AccessibilityManager } from "./AccessibilityManager.js";

// Mock DOM methods
global.document = {
  createElement: jest.fn(() => ({
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn(),
    },
    style: {},
    textContent: "",
    innerHTML: "",
  })),
  documentElement: {
    style: {
      setProperty: jest.fn(),
    },
  },
  body: {
    appendChild: jest.fn(),
    insertBefore: jest.fn(),
    removeChild: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn(() => false),
    },
    className: "",
  },
  head: {
    appendChild: jest.fn(),
  },
  addEventListener: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getElementById: jest.fn(),
};

global.window = {
  matchMedia: jest.fn(() => ({
    matches: false,
    addEventListener: jest.fn(),
  })),
};

describe("AccessibilityManager", () => {
  let accessibilityManager;
  let mockOnSettingsChange;
  let mockOnShortcutAction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnSettingsChange = jest.fn();
    mockOnShortcutAction = jest.fn();

    accessibilityManager = new AccessibilityManager({
      onSettingsChange: mockOnSettingsChange,
      onShortcutAction: mockOnShortcutAction,
    });
  });

  describe("Initialization", () => {
    test("should initialize with default settings", () => {
      expect(accessibilityManager.settings.announceChanges).toBe(true);
      expect(accessibilityManager.settings.skipLinks).toBe(true);
      expect(accessibilityManager.settings.focusIndicators).toBe(true);
      expect(accessibilityManager.settings.fontSize).toBe("medium");
    });

    test("should setup ARIA live regions", () => {
      expect(document.createElement).toHaveBeenCalledWith("div");
      expect(accessibilityManager.politeRegion).toBeDefined();
      expect(accessibilityManager.assertiveRegion).toBeDefined();
    });

    test("should setup event listeners", () => {
      expect(document.addEventListener).toHaveBeenCalledWith("focusin", expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith("focusout", expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith("mousedown", expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    });
  });

  describe("Announcements", () => {
    test("should announce text to screen readers", () => {
      const mockRegion = { textContent: "" };
      accessibilityManager.politeRegion = mockRegion;

      accessibilityManager.announce("Test announcement", "polite");

      expect(mockRegion.textContent).toBe("Test announcement");
    });

    test("should use assertive region for urgent announcements", () => {
      const mockRegion = { textContent: "" };
      accessibilityManager.assertiveRegion = mockRegion;

      accessibilityManager.announce("Urgent announcement", "assertive");

      expect(mockRegion.textContent).toBe("Urgent announcement");
    });

    test("should not announce when announceChanges is disabled", () => {
      accessibilityManager.settings.announceChanges = false;
      const mockRegion = { textContent: "" };
      accessibilityManager.politeRegion = mockRegion;

      accessibilityManager.announce("Test announcement", "polite");

      expect(mockRegion.textContent).toBe("");
    });
  });

  describe("Element Labels", () => {
    test("should get aria-label", () => {
      const element = {
        hasAttribute: jest.fn((attr) => attr === "aria-label"),
        getAttribute: jest.fn(() => "Test Label"),
      };

      const label = accessibilityManager.getElementLabel(element);
      expect(label).toBe("Test Label");
    });

    test("should get label from aria-labelledby", () => {
      const element = {
        hasAttribute: jest.fn((attr) => attr === "aria-labelledby"),
        getAttribute: jest.fn(() => "label-id"),
      };

      const labelElement = { textContent: "  Label Text  " };
      document.getElementById.mockReturnValue(labelElement);

      const label = accessibilityManager.getElementLabel(element);
      expect(label).toBe("Label Text");
    });

    test("should get label from associated label element", () => {
      const element = {
        hasAttribute: jest.fn(() => false),
        id: "input-id",
      };

      const labelElement = { textContent: "Associated Label" };
      document.querySelector.mockReturnValue(labelElement);

      const label = accessibilityManager.getElementLabel(element);
      expect(label).toBe("Associated Label");
    });

    test("should get title attribute as fallback", () => {
      const element = {
        hasAttribute: jest.fn((attr) => attr === "title"),
        getAttribute: jest.fn(() => "Title Text"),
        id: null,
      };

      document.querySelector.mockReturnValue(null);

      const label = accessibilityManager.getElementLabel(element);
      expect(label).toBe("Title Text");
    });
  });

  describe("Theme Management", () => {
    test("should toggle theme", () => {
      const mockThemes = [
        { id: "classic", name: "Classic" },
        { id: "material", name: "Material" },
      ];

      accessibilityManager.themeManager.getAvailableThemes = jest.fn(() => mockThemes);
      accessibilityManager.themeManager.currentTheme = "classic";
      accessibilityManager.themeManager.setTheme = jest.fn();

      accessibilityManager.toggleTheme();

      expect(accessibilityManager.themeManager.setTheme).toHaveBeenCalledWith("material");
    });

    test("should toggle high contrast", () => {
      accessibilityManager.themeManager.setHighContrast = jest.fn();
      accessibilityManager.announce = jest.fn();

      accessibilityManager.toggleHighContrast();

      expect(accessibilityManager.settings.highContrast).toBe(true);
      expect(accessibilityManager.themeManager.setHighContrast).toHaveBeenCalledWith(true);
      expect(mockOnSettingsChange).toHaveBeenCalledWith("highContrast", true);
      expect(accessibilityManager.announce).toHaveBeenCalledWith("High contrast enabled", "assertive");
    });
  });

  describe("Font Size Management", () => {
    test("should increase font size", () => {
      accessibilityManager.settings.fontSize = "medium";
      accessibilityManager.applyAccessibilitySettings = jest.fn();
      accessibilityManager.announce = jest.fn();

      accessibilityManager.adjustFontSize(1);

      expect(accessibilityManager.settings.fontSize).toBe("large");
      expect(accessibilityManager.applyAccessibilitySettings).toHaveBeenCalled();
      expect(mockOnSettingsChange).toHaveBeenCalledWith("fontSize", "large");
      expect(accessibilityManager.announce).toHaveBeenCalledWith("Font size changed to large", "polite");
    });

    test("should decrease font size", () => {
      accessibilityManager.settings.fontSize = "large";
      accessibilityManager.applyAccessibilitySettings = jest.fn();
      accessibilityManager.announce = jest.fn();

      accessibilityManager.adjustFontSize(-1);

      expect(accessibilityManager.settings.fontSize).toBe("medium");
    });

    test("should not go below minimum font size", () => {
      accessibilityManager.settings.fontSize = "small";
      accessibilityManager.applyAccessibilitySettings = jest.fn();
      accessibilityManager.announce = jest.fn();

      accessibilityManager.adjustFontSize(-1);

      expect(accessibilityManager.settings.fontSize).toBe("small");
      expect(accessibilityManager.applyAccessibilitySettings).not.toHaveBeenCalled();
    });

    test("should not go above maximum font size", () => {
      accessibilityManager.settings.fontSize = "xlarge";
      accessibilityManager.applyAccessibilitySettings = jest.fn();
      accessibilityManager.announce = jest.fn();

      accessibilityManager.adjustFontSize(1);

      expect(accessibilityManager.settings.fontSize).toBe("xlarge");
      expect(accessibilityManager.applyAccessibilitySettings).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Shortcuts", () => {
    test("should handle toggle theme shortcut", () => {
      accessibilityManager.toggleTheme = jest.fn();

      accessibilityManager.handleShortcut("toggleTheme", [], {});

      expect(accessibilityManager.toggleTheme).toHaveBeenCalled();
    });

    test("should handle toggle contrast shortcut", () => {
      accessibilityManager.toggleHighContrast = jest.fn();

      accessibilityManager.handleShortcut("toggleContrast", [], {});

      expect(accessibilityManager.toggleHighContrast).toHaveBeenCalled();
    });

    test("should handle show help shortcut", () => {
      accessibilityManager.showAccessibilityHelp = jest.fn();

      accessibilityManager.handleShortcut("showHelp", [], {});

      expect(accessibilityManager.showAccessibilityHelp).toHaveBeenCalled();
    });

    test("should handle font size shortcuts", () => {
      accessibilityManager.adjustFontSize = jest.fn();

      accessibilityManager.handleShortcut("increaseFontSize", [], {});
      expect(accessibilityManager.adjustFontSize).toHaveBeenCalledWith(1);

      accessibilityManager.handleShortcut("decreaseFontSize", [], {});
      expect(accessibilityManager.adjustFontSize).toHaveBeenCalledWith(-1);
    });

    test("should delegate unknown shortcuts", () => {
      const mockEvent = { key: "Enter" };

      accessibilityManager.handleShortcut("unknownAction", ["arg1"], mockEvent);

      expect(mockOnShortcutAction).toHaveBeenCalledWith("unknownAction", ["arg1"], mockEvent);
    });
  });

  describe("Settings Management", () => {
    test("should get current settings", () => {
      accessibilityManager.themeManager.currentTheme = "material";
      accessibilityManager.themeManager.darkMode = true;

      const settings = accessibilityManager.getSettings();

      expect(settings.theme).toBe("material");
      expect(settings.darkMode).toBe(true);
      expect(settings.fontSize).toBe("medium");
    });

    test("should apply settings", () => {
      accessibilityManager.themeManager.setTheme = jest.fn();
      accessibilityManager.themeManager.setDarkMode = jest.fn();
      accessibilityManager.applyAccessibilitySettings = jest.fn();

      const newSettings = {
        theme: "highContrast",
        darkMode: true,
        fontSize: "large",
        announceChanges: false,
      };

      accessibilityManager.applySettings(newSettings);

      expect(accessibilityManager.themeManager.setTheme).toHaveBeenCalledWith("highContrast");
      expect(accessibilityManager.themeManager.setDarkMode).toHaveBeenCalledWith(true);
      expect(accessibilityManager.settings.fontSize).toBe("large");
      expect(accessibilityManager.settings.announceChanges).toBe(false);
      expect(mockOnSettingsChange).toHaveBeenCalledWith("all", accessibilityManager.settings);
    });

    test("should export settings", () => {
      accessibilityManager.keyboardManager.exportShortcuts = jest.fn(() => ({ "Ctrl+T": { action: "test" } }));

      const exported = accessibilityManager.exportSettings();

      expect(exported.shortcuts).toEqual({ "Ctrl+T": { action: "test" } });
      expect(exported.fontSize).toBe("medium");
    });

    test("should import settings", () => {
      accessibilityManager.keyboardManager.importShortcuts = jest.fn();
      accessibilityManager.applySettings = jest.fn();

      const settings = {
        shortcuts: { "Ctrl+T": { action: "test" } },
        fontSize: "large",
      };

      accessibilityManager.importSettings(settings);

      expect(accessibilityManager.keyboardManager.importShortcuts).toHaveBeenCalledWith(settings.shortcuts);
      expect(accessibilityManager.applySettings).toHaveBeenCalledWith(settings);
    });
  });

  describe("Help Dialog", () => {
    test("should show accessibility help", () => {
      accessibilityManager.createAccessibilityHelpDialog = jest.fn(() => document.createElement("div"));
      accessibilityManager.announce = jest.fn();

      accessibilityManager.showAccessibilityHelp();

      expect(accessibilityManager.createAccessibilityHelpDialog).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(accessibilityManager.announce).toHaveBeenCalledWith("Accessibility help dialog opened", "assertive");
    });

    test("should create help dialog with proper structure", () => {
      const dialog = accessibilityManager.createAccessibilityHelpDialog();

      expect(dialog.getAttribute("role")).toBe("dialog");
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.innerHTML).toContain("Accessibility Features");
    });
  });

  describe("Settings Panel", () => {
    test("should create settings panel", () => {
      accessibilityManager.themeManager.getAvailableThemes = jest.fn(() => [
        { id: "classic", name: "Classic" },
        { id: "material", name: "Material" },
      ]);
      accessibilityManager.themeManager.currentTheme = "classic";

      const panel = accessibilityManager.createSettingsPanel();

      expect(panel.getAttribute("role")).toBe("group");
      expect(panel.innerHTML).toContain("Accessibility Settings");
      expect(panel.innerHTML).toContain("Theme:");
      expect(panel.innerHTML).toContain("High contrast mode");
    });
  });
});
