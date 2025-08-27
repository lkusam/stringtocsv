/**
 * Unit tests for TemplateManager
 */

import { TemplateManager } from "./TemplateManager.js";
import { Template } from "../core/interfaces.js";

// Mock Chrome storage API
const mockChromeStorage = {
  sync: {
    get: jest.fn(),
    set: jest.fn(),
  },
};

global.chrome = {
  storage: mockChromeStorage,
  runtime: {
    lastError: null,
  },
};

describe("TemplateManager", () => {
  let templateManager;

  beforeEach(() => {
    templateManager = new TemplateManager();

    // Reset mocks
    mockChromeStorage.sync.get.mockClear();
    mockChromeStorage.sync.set.mockClear();

    // Mock successful storage operations
    mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
      callback({});
    });

    mockChromeStorage.sync.set.mockImplementation((data, callback) => {
      callback();
    });
  });

  describe("Initialization", () => {
    test("should initialize successfully", async () => {
      await templateManager.initialize();

      expect(templateManager.isInitialized).toBe(true);
      expect(templateManager.getCategories()).toContain("default");
      expect(templateManager.getCategories()).toContain("user");
    });

    test("should not initialize twice", async () => {
      await templateManager.initialize();
      const firstInitTime = templateManager.isInitialized;

      await templateManager.initialize();
      expect(templateManager.isInitialized).toBe(firstInitTime);
    });

    test("should load existing templates from storage", async () => {
      const existingTemplates = [
        {
          id: "template-1",
          name: "Test Template",
          settings: { mode: "simple", delimiter: "," },
          category: "user",
        },
      ];

      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        callback({
          templates: existingTemplates,
          templateCategories: { user: ["template-1"] },
        });
      });

      await templateManager.initialize();

      expect(templateManager.getAllTemplates()).toHaveLength(1);
      expect(templateManager.getTemplate("template-1")).toBeDefined();
    });
  });

  describe("Template CRUD Operations", () => {
    beforeEach(async () => {
      await templateManager.initialize();
    });

    test("should create a new template", async () => {
      const settings = {
        mode: "simple",
        separators: { row: "\n", column: "," },
        quoting: { type: "double" },
      };

      const template = await templateManager.createTemplate("Test Template", settings, {
        description: "A test template",
        category: "user",
      });

      expect(template).toBeInstanceOf(Template);
      expect(template.name).toBe("Test Template");
      expect(template.settings.mode).toBe("simple");
      expect(templateManager.getTemplate(template.id)).toBe(template);
    });

    test("should update an existing template", async () => {
      const template = await templateManager.createTemplate("Original Name", {
        mode: "simple",
      });

      const updatedTemplate = await templateManager.updateTemplate(template.id, {
        name: "Updated Name",
        description: "Updated description",
        settings: { mode: "multi-column" },
      });

      expect(updatedTemplate.name).toBe("Updated Name");
      expect(updatedTemplate.description).toBe("Updated description");
      expect(updatedTemplate.settings.mode).toBe("multi-column");
    });

    test("should delete a template", async () => {
      const template = await templateManager.createTemplate("To Delete", {
        mode: "simple",
      });

      const deleted = await templateManager.deleteTemplate(template.id);

      expect(deleted).toBe(true);
      expect(templateManager.getTemplate(template.id)).toBeUndefined();
    });

    test("should throw error when updating non-existent template", async () => {
      await expect(templateManager.updateTemplate("non-existent", {})).rejects.toThrow("Template with ID 'non-existent' not found");
    });

    test("should throw error when deleting non-existent template", async () => {
      await expect(templateManager.deleteTemplate("non-existent")).rejects.toThrow("Template with ID 'non-existent' not found");
    });
  });

  describe("Template Validation", () => {
    beforeEach(async () => {
      await templateManager.initialize();
    });

    test("should validate template with required fields", () => {
      const validTemplate = new Template({
        name: "Valid Template",
        settings: { mode: "simple" },
      });

      expect(() => templateManager.validateTemplate(validTemplate)).not.toThrow();
    });

    test("should reject template without name", () => {
      const invalidTemplate = new Template({
        name: "",
        settings: { mode: "simple" },
      });

      expect(() => templateManager.validateTemplate(invalidTemplate)).toThrow("Template name is required");
    });

    test("should reject template without settings", () => {
      const invalidTemplate = new Template({
        name: "Invalid Template",
      });
      invalidTemplate.settings = null;

      expect(() => templateManager.validateTemplate(invalidTemplate)).toThrow("Template settings are required");
    });

    test("should reject template with invalid mode", () => {
      const invalidTemplate = new Template({
        name: "Invalid Template",
        settings: { mode: "invalid-mode" },
      });

      expect(() => templateManager.validateTemplate(invalidTemplate)).toThrow("Invalid template mode: invalid-mode");
    });
  });

  describe("Template Search and Filtering", () => {
    beforeEach(async () => {
      await templateManager.initialize();

      // Create test templates
      await templateManager.createTemplate("CSV Template", { mode: "simple", format: "csv" }, { category: "user", tags: ["csv", "export"] });

      await templateManager.createTemplate("JSON Template", { mode: "multi-column", format: "json" }, { category: "system", tags: ["json", "api"] });

      await templateManager.createTemplate("Batch Template", { mode: "batch", format: "csv" }, { category: "user", tags: ["batch", "bulk"] });
    });

    test("should search templates by name", () => {
      const results = templateManager.searchTemplates("CSV");

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("CSV Template");
    });

    test("should search templates by description", () => {
      // First update a template with description
      const templates = templateManager.getAllTemplates();
      templates[0].description = "Export data to CSV format";

      const results = templateManager.searchTemplates("export data");

      expect(results.length).toBeGreaterThan(0);
    });

    test("should filter templates by category", () => {
      const results = templateManager.searchTemplates("", { category: "user" });

      expect(results).toHaveLength(2);
      expect(results.every((t) => t.category === "user")).toBe(true);
    });

    test("should filter templates by mode", () => {
      const results = templateManager.searchTemplates("", { mode: "simple" });

      expect(results).toHaveLength(1);
      expect(results[0].settings.mode).toBe("simple");
    });

    test("should filter templates by tags", () => {
      const results = templateManager.searchTemplates("", { tags: ["csv"] });

      expect(results).toHaveLength(2);
      expect(results.every((t) => t.tags && t.tags.includes("csv"))).toBe(true);
    });

    test("should sort templates by name", () => {
      const results = templateManager.searchTemplates("", {
        sortBy: "name",
        sortOrder: "asc",
      });

      expect(results[0].name).toBe("Batch Template");
      expect(results[1].name).toBe("CSV Template");
      expect(results[2].name).toBe("JSON Template");
    });

    test("should sort templates by creation date", () => {
      const results = templateManager.searchTemplates("", {
        sortBy: "created",
        sortOrder: "desc",
      });

      // Most recently created should be first
      expect(new Date(results[0].created) >= new Date(results[1].created)).toBe(true);
    });
  });

  describe("Template Cloning", () => {
    beforeEach(async () => {
      await templateManager.initialize();
    });

    test("should clone a template with default name", async () => {
      const original = await templateManager.createTemplate("Original Template", {
        mode: "simple",
        delimiter: ",",
      });

      const clone = await templateManager.cloneTemplate(original.id);

      expect(clone.name).toBe("Original Template (Copy)");
      expect(clone.settings).toEqual(original.settings);
      expect(clone.id).not.toBe(original.id);
    });

    test("should clone a template with custom name", async () => {
      const original = await templateManager.createTemplate("Original Template", {
        mode: "simple",
      });

      const clone = await templateManager.cloneTemplate(original.id, "Custom Clone Name");

      expect(clone.name).toBe("Custom Clone Name");
    });

    test("should generate unique names for multiple clones", async () => {
      const original = await templateManager.createTemplate("Original Template", {
        mode: "simple",
      });

      const clone1 = await templateManager.cloneTemplate(original.id);
      const clone2 = await templateManager.cloneTemplate(original.id);

      expect(clone1.name).toBe("Original Template (Copy)");
      expect(clone2.name).toBe("Original Template (Copy 2)");
    });

    test("should throw error when cloning non-existent template", async () => {
      await expect(templateManager.cloneTemplate("non-existent")).rejects.toThrow("Template with ID 'non-existent' not found");
    });
  });

  describe("Template Import/Export", () => {
    beforeEach(async () => {
      await templateManager.initialize();
    });

    test("should export a template", async () => {
      const template = await templateManager.createTemplate(
        "Export Test",
        {
          mode: "simple",
          delimiter: ",",
        },
        {
          description: "Test template for export",
        }
      );

      const exported = templateManager.exportTemplate(template.id);

      expect(exported.version).toBe("3.0");
      expect(exported.template.name).toBe("Export Test");
      expect(exported.template.settings.mode).toBe("simple");
      expect(exported.exportDate).toBeDefined();
    });

    test("should import a template", async () => {
      const templateData = {
        version: "3.0",
        template: {
          name: "Imported Template",
          description: "Imported from external source",
          settings: { mode: "multi-column", delimiter: "\t" },
          category: "imported",
          tags: ["imported"],
        },
      };

      const imported = await templateManager.importTemplate(templateData);

      expect(imported.name).toBe("Imported Template");
      expect(imported.settings.mode).toBe("multi-column");
      expect(imported.category).toBe("imported");
    });

    test("should handle name conflicts during import", async () => {
      // Create existing template
      await templateManager.createTemplate("Existing Template", { mode: "simple" });

      const templateData = {
        template: {
          name: "Existing Template",
          settings: { mode: "multi-column" },
        },
      };

      const imported = await templateManager.importTemplate(templateData);

      expect(imported.name).toBe("Existing Template (Copy)");
    });

    test("should export multiple templates", async () => {
      await templateManager.createTemplate("Template 1", { mode: "simple" });
      await templateManager.createTemplate("Template 2", { mode: "multi-column" });

      const exported = templateManager.exportTemplates();

      expect(exported.templateCount).toBe(2);
      expect(exported.templates).toHaveLength(2);
    });

    test("should import multiple templates", async () => {
      const templatesData = {
        templates: [
          {
            name: "Bulk Import 1",
            settings: { mode: "simple" },
          },
          {
            name: "Bulk Import 2",
            settings: { mode: "multi-column" },
          },
        ],
      };

      const results = await templateManager.importTemplates(templatesData);

      expect(results.imported).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
    });

    test("should handle import failures gracefully", async () => {
      const templatesData = {
        templates: [
          {
            name: "Valid Template",
            settings: { mode: "simple" },
          },
          {
            name: "", // Invalid - empty name
            settings: { mode: "simple" },
          },
        ],
      };

      const results = await templateManager.importTemplates(templatesData);

      expect(results.imported).toHaveLength(1);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain("Template name is required");
    });
  });

  describe("Category Management", () => {
    beforeEach(async () => {
      await templateManager.initialize();
    });

    test("should create a new category", () => {
      const categoryName = templateManager.createCategory("Custom Category");

      expect(categoryName).toBe("Custom Category");
      expect(templateManager.getCategories()).toContain("Custom Category");
    });

    test("should not create duplicate categories", () => {
      templateManager.createCategory("Unique Category");

      expect(() => templateManager.createCategory("Unique Category")).toThrow("Category 'Unique Category' already exists");
    });

    test("should delete a category and move templates", async () => {
      // Create category and template
      templateManager.createCategory("Temporary Category");
      const template = await templateManager.createTemplate("Test Template", { mode: "simple" }, { category: "Temporary Category" });

      await templateManager.deleteCategory("Temporary Category", "user");

      expect(templateManager.getCategories()).not.toContain("Temporary Category");
      expect(template.category).toBe("user");
    });

    test("should not delete system categories", async () => {
      await expect(templateManager.deleteCategory("default")).rejects.toThrow("Cannot delete system category 'default'");
    });

    test("should get templates by category", async () => {
      await templateManager.createTemplate("User Template", { mode: "simple" }, { category: "user" });

      await templateManager.createTemplate("System Template", { mode: "simple" }, { category: "system" });

      const userTemplates = templateManager.getTemplatesByCategory("user");
      const systemTemplates = templateManager.getTemplatesByCategory("system");

      expect(userTemplates).toHaveLength(1);
      expect(userTemplates[0].name).toBe("User Template");
      expect(systemTemplates).toHaveLength(1);
      expect(systemTemplates[0].name).toBe("System Template");
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await templateManager.initialize();
    });

    test("should calculate template statistics", async () => {
      await templateManager.createTemplate("Simple Template", { mode: "simple" });
      await templateManager.createTemplate("Multi Template", { mode: "multi-column" });
      await templateManager.createTemplate("Batch Template", { mode: "batch" });

      const stats = templateManager.getStatistics();

      expect(stats.totalTemplates).toBe(3);
      expect(stats.templatesByMode.simple).toBe(1);
      expect(stats.templatesByMode["multi-column"]).toBe(1);
      expect(stats.templatesByMode.batch).toBe(1);
      expect(stats.recentTemplates).toHaveLength(3);
    });

    test("should track recent templates", async () => {
      const template1 = await templateManager.createTemplate("First", { mode: "simple" });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const template2 = await templateManager.createTemplate("Second", { mode: "simple" });

      const stats = templateManager.getStatistics();

      expect(stats.recentTemplates[0].name).toBe("Second"); // Most recent first
      expect(stats.recentTemplates[1].name).toBe("First");
    });
  });

  describe("Event System", () => {
    beforeEach(async () => {
      await templateManager.initialize();
    });

    test("should emit events for template operations", async () => {
      const createdHandler = jest.fn();
      const updatedHandler = jest.fn();
      const deletedHandler = jest.fn();

      templateManager.addEventListener("templateCreated", createdHandler);
      templateManager.addEventListener("templateUpdated", updatedHandler);
      templateManager.addEventListener("templateDeleted", deletedHandler);

      const template = await templateManager.createTemplate("Event Test", { mode: "simple" });
      await templateManager.updateTemplate(template.id, { name: "Updated Name" });
      await templateManager.deleteTemplate(template.id);

      expect(createdHandler).toHaveBeenCalledWith({ template });
      expect(updatedHandler).toHaveBeenCalledWith({
        template,
        updates: { name: "Updated Name" },
      });
      expect(deletedHandler).toHaveBeenCalledWith({
        templateId: template.id,
        template,
      });
    });

    test("should remove event listeners", async () => {
      const handler = jest.fn();

      templateManager.addEventListener("templateCreated", handler);
      templateManager.removeEventListener("templateCreated", handler);

      await templateManager.createTemplate("Test", { mode: "simple" });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Storage Operations", () => {
    beforeEach(async () => {
      await templateManager.initialize();
    });

    test("should save templates to Chrome storage", async () => {
      await templateManager.createTemplate("Storage Test", { mode: "simple" });

      expect(mockChromeStorage.sync.set).toHaveBeenCalled();

      const lastCall = mockChromeStorage.sync.set.mock.calls[mockChromeStorage.sync.set.mock.calls.length - 1];
      const [data] = lastCall;

      expect(data.templates).toBeDefined();
      expect(data.templateCategories).toBeDefined();
    });

    test("should handle storage errors gracefully", async () => {
      // Mock storage error
      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        chrome.runtime.lastError = new Error("Storage quota exceeded");
        callback();
        chrome.runtime.lastError = null;
      });

      // Should not throw error
      await expect(templateManager.createTemplate("Test", { mode: "simple" })).resolves.toBeDefined();
    });
  });

  describe("Cleanup", () => {
    test("should cleanup resources on destroy", async () => {
      await templateManager.initialize();
      await templateManager.createTemplate("Test", { mode: "simple" });

      await templateManager.destroy();

      expect(templateManager.isInitialized).toBe(false);
      expect(templateManager.getAllTemplates()).toHaveLength(0);
    });
  });
});
