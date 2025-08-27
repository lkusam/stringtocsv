/**
 * TemplateManager - Manages conversion templates for reuse
 * Handles CRUD operations, serialization, and template sharing
 */

import { Template } from "../core/interfaces.js";

export class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.categories = new Map();
    this.isInitialized = false;
    this.eventListeners = new Map();
  }

  /**
   * Initialize the template manager
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load templates from storage
      await this.loadTemplates();

      // Initialize default categories
      this.initializeCategories();

      this.isInitialized = true;
      console.log("TemplateManager initialized successfully");

      this.emit("initialized", { templateCount: this.templates.size });
    } catch (error) {
      console.error("Failed to initialize TemplateManager:", error);
      throw error;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(name, settings, metadata = {}) {
    try {
      const template = new Template({
        name,
        settings,
        description: metadata.description || "",
        category: metadata.category || "user",
        tags: metadata.tags || [],
        isPublic: metadata.isPublic || false,
        author: metadata.author || "user",
      });

      // Validate template
      this.validateTemplate(template);

      // Store template
      this.templates.set(template.id, template);

      // Add to category
      this.addToCategory(template.category, template.id);

      // Save to storage
      await this.saveTemplates();

      console.log(`Template '${name}' created with ID: ${template.id}`);
      this.emit("templateCreated", { template });

      return template;
    } catch (error) {
      console.error("Failed to create template:", error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId, updates) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }

    try {
      // Update template properties
      if (updates.name !== undefined) template.name = updates.name;
      if (updates.description !== undefined) template.description = updates.description;
      if (updates.settings !== undefined) template.update(updates.settings);
      if (updates.category !== undefined) {
        // Move to new category
        this.removeFromCategory(template.category, templateId);
        template.category = updates.category;
        this.addToCategory(template.category, templateId);
      }
      if (updates.tags !== undefined) template.tags = updates.tags;

      // Validate updated template
      this.validateTemplate(template);

      // Save to storage
      await this.saveTemplates();

      console.log(`Template '${template.name}' updated`);
      this.emit("templateUpdated", { template, updates });

      return template;
    } catch (error) {
      console.error("Failed to update template:", error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }

    try {
      // Remove from category
      this.removeFromCategory(template.category, templateId);

      // Remove from templates
      this.templates.delete(templateId);

      // Save to storage
      await this.saveTemplates();

      console.log(`Template '${template.name}' deleted`);
      this.emit("templateDeleted", { templateId, template });

      return true;
    } catch (error) {
      console.error("Failed to delete template:", error);
      throw error;
    }
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category) {
    const categoryTemplates = this.categories.get(category) || new Set();
    return Array.from(categoryTemplates)
      .map((id) => this.templates.get(id))
      .filter(Boolean);
  }

  /**
   * Search templates
   */
  searchTemplates(query, options = {}) {
    const { category = null, tags = [], mode = null, sortBy = "name", sortOrder = "asc" } = options;

    let results = Array.from(this.templates.values());

    // Filter by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter((template) => template.name.toLowerCase().includes(lowerQuery) || template.description.toLowerCase().includes(lowerQuery) || (template.tags && template.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))));
    }

    // Filter by category
    if (category) {
      results = results.filter((template) => template.category === category);
    }

    // Filter by tags
    if (tags.length > 0) {
      results = results.filter((template) => template.tags && tags.some((tag) => template.tags.includes(tag)));
    }

    // Filter by mode
    if (mode) {
      results = results.filter((template) => template.settings.mode === mode);
    }

    // Sort results
    results.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "created":
          aValue = new Date(a.created);
          bValue = new Date(b.created);
          break;
        case "modified":
          aValue = new Date(a.modified);
          bValue = new Date(b.modified);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === "desc") {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return results;
  }

  /**
   * Clone a template
   */
  async cloneTemplate(templateId, newName = null) {
    const originalTemplate = this.templates.get(templateId);
    if (!originalTemplate) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }

    try {
      const clonedTemplate = originalTemplate.clone(newName);

      // Store cloned template
      this.templates.set(clonedTemplate.id, clonedTemplate);

      // Add to category
      this.addToCategory(clonedTemplate.category, clonedTemplate.id);

      // Save to storage
      await this.saveTemplates();

      console.log(`Template cloned: ${clonedTemplate.name}`);
      this.emit("templateCloned", { original: originalTemplate, clone: clonedTemplate });

      return clonedTemplate;
    } catch (error) {
      console.error("Failed to clone template:", error);
      throw error;
    }
  }

  /**
   * Export template to JSON
   */
  exportTemplate(templateId) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }

    return {
      version: "3.0",
      exportDate: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        settings: template.settings,
        category: template.category,
        tags: template.tags,
        version: template.version,
      },
    };
  }

  /**
   * Import template from JSON
   */
  async importTemplate(templateData, options = {}) {
    try {
      // Validate import data
      if (!templateData.template) {
        throw new Error("Invalid template data: missing template object");
      }

      const { template: templateInfo } = templateData;

      // Check for name conflicts
      const existingTemplate = Array.from(this.templates.values()).find((t) => t.name === templateInfo.name);

      let finalName = templateInfo.name;
      if (existingTemplate && !options.overwrite) {
        finalName = this.generateUniqueName(templateInfo.name);
      }

      // Create new template
      const template = await this.createTemplate(finalName, templateInfo.settings, {
        description: templateInfo.description,
        category: templateInfo.category || "imported",
        tags: templateInfo.tags || ["imported"],
      });

      console.log(`Template imported: ${template.name}`);
      this.emit("templateImported", { template, originalName: templateInfo.name });

      return template;
    } catch (error) {
      console.error("Failed to import template:", error);
      throw error;
    }
  }

  /**
   * Export multiple templates
   */
  exportTemplates(templateIds = null) {
    const templatesToExport = templateIds ? templateIds.map((id) => this.templates.get(id)).filter(Boolean) : Array.from(this.templates.values());

    return {
      version: "3.0",
      exportDate: new Date().toISOString(),
      templateCount: templatesToExport.length,
      templates: templatesToExport.map((template) => ({
        name: template.name,
        description: template.description,
        settings: template.settings,
        category: template.category,
        tags: template.tags,
        version: template.version,
      })),
    };
  }

  /**
   * Import multiple templates
   */
  async importTemplates(templatesData, options = {}) {
    if (!templatesData.templates || !Array.isArray(templatesData.templates)) {
      throw new Error("Invalid templates data: missing templates array");
    }

    const results = {
      imported: [],
      failed: [],
      skipped: [],
    };

    for (const templateData of templatesData.templates) {
      try {
        const template = await this.importTemplate({ template: templateData }, options);
        results.imported.push(template);
      } catch (error) {
        results.failed.push({
          name: templateData.name,
          error: error.message,
        });
      }
    }

    console.log(`Import completed: ${results.imported.length} imported, ${results.failed.length} failed`);
    this.emit("templatesImported", results);

    return results;
  }

  /**
   * Get template categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Create a new category
   */
  createCategory(name, metadata = {}) {
    if (this.categories.has(name)) {
      throw new Error(`Category '${name}' already exists`);
    }

    this.categories.set(name, new Set());

    console.log(`Category '${name}' created`);
    this.emit("categoryCreated", { name, metadata });

    return name;
  }

  /**
   * Delete a category
   */
  async deleteCategory(name, moveToCategory = "uncategorized") {
    if (!this.categories.has(name)) {
      throw new Error(`Category '${name}' not found`);
    }

    if (name === "default" || name === "system") {
      throw new Error(`Cannot delete system category '${name}'`);
    }

    try {
      // Move templates to another category
      const templateIds = Array.from(this.categories.get(name));
      for (const templateId of templateIds) {
        const template = this.templates.get(templateId);
        if (template) {
          template.category = moveToCategory;
          this.addToCategory(moveToCategory, templateId);
        }
      }

      // Delete category
      this.categories.delete(name);

      // Save changes
      await this.saveTemplates();

      console.log(`Category '${name}' deleted, templates moved to '${moveToCategory}'`);
      this.emit("categoryDeleted", { name, moveToCategory, templateCount: templateIds.length });

      return true;
    } catch (error) {
      console.error("Failed to delete category:", error);
      throw error;
    }
  }

  /**
   * Validate template structure
   */
  validateTemplate(template) {
    if (!template.name || template.name.trim() === "") {
      throw new Error("Template name is required");
    }

    if (!template.settings || typeof template.settings !== "object") {
      throw new Error("Template settings are required");
    }

    if (!template.settings.mode) {
      throw new Error("Template mode is required");
    }

    const validModes = ["simple", "multi-column", "batch"];
    if (!validModes.includes(template.settings.mode)) {
      throw new Error(`Invalid template mode: ${template.settings.mode}`);
    }

    return true;
  }

  /**
   * Generate unique name for template
   */
  generateUniqueName(baseName) {
    let counter = 1;
    let newName = `${baseName} (Copy)`;

    while (Array.from(this.templates.values()).some((t) => t.name === newName)) {
      counter++;
      newName = `${baseName} (Copy ${counter})`;
    }

    return newName;
  }

  /**
   * Initialize default categories
   */
  initializeCategories() {
    const defaultCategories = ["default", "user", "system", "imported", "shared", "uncategorized"];

    defaultCategories.forEach((category) => {
      if (!this.categories.has(category)) {
        this.categories.set(category, new Set());
      }
    });
  }

  /**
   * Add template to category
   */
  addToCategory(category, templateId) {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category).add(templateId);
  }

  /**
   * Remove template from category
   */
  removeFromCategory(category, templateId) {
    if (this.categories.has(category)) {
      this.categories.get(category).delete(templateId);
    }
  }

  /**
   * Load templates from storage
   */
  async loadTemplates() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(["templates", "templateCategories"], resolve);
        });

        // Load templates
        if (result.templates) {
          for (const templateData of result.templates) {
            const template = new Template(templateData);
            this.templates.set(template.id, template);
          }
        }

        // Load categories
        if (result.templateCategories) {
          for (const [category, templateIds] of Object.entries(result.templateCategories)) {
            this.categories.set(category, new Set(templateIds));
          }
        }

        console.log(`Loaded ${this.templates.size} templates from storage`);
      }
    } catch (error) {
      console.warn("Failed to load templates from storage:", error);
    }
  }

  /**
   * Save templates to storage
   */
  async saveTemplates() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        const templatesData = Array.from(this.templates.values());
        const categoriesData = {};

        for (const [category, templateIds] of this.categories.entries()) {
          categoriesData[category] = Array.from(templateIds);
        }

        await new Promise((resolve, reject) => {
          chrome.storage.sync.set(
            {
              templates: templatesData,
              templateCategories: categoriesData,
            },
            () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            }
          );
        });

        console.log(`Saved ${templatesData.length} templates to storage`);
      }
    } catch (error) {
      console.warn("Failed to save templates to storage:", error);
    }
  }

  /**
   * Get template statistics
   */
  getStatistics() {
    const stats = {
      totalTemplates: this.templates.size,
      categories: this.categories.size,
      templatesByCategory: {},
      templatesByMode: {},
      recentTemplates: [],
      popularTemplates: [],
      storageUsage: 0,
    };

    // Count by category
    for (const [category, templateIds] of this.categories.entries()) {
      stats.templatesByCategory[category] = templateIds.size;
    }

    // Count by mode and get recent templates
    const templates = Array.from(this.templates.values());
    templates.forEach((template) => {
      const mode = template.settings.mode;
      stats.templatesByMode[mode] = (stats.templatesByMode[mode] || 0) + 1;
    });

    // Get recent templates (last 5)
    stats.recentTemplates = templates
      .sort((a, b) => new Date(b.modified) - new Date(a.modified))
      .slice(0, 5)
      .map((t) => ({ id: t.id, name: t.name, modified: t.modified }));

    // Get popular templates (by usage count if available)
    stats.popularTemplates = templates
      .filter((t) => t.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5)
      .map((t) => ({ id: t.id, name: t.name, usageCount: t.usageCount }));

    // Calculate storage usage
    stats.storageUsage = JSON.stringify(templates).length;

    return stats;
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(templateId) {
    const template = this.templates.get(templateId);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
      template.lastUsed = new Date().toISOString();
      await this.saveTemplates();

      this.emit("templateUsed", { template });
    }
  }

  /**
   * Get template usage analytics
   */
  getUsageAnalytics() {
    const templates = Array.from(this.templates.values());

    return {
      totalUsage: templates.reduce((sum, t) => sum + (t.usageCount || 0), 0),
      averageUsage: templates.length > 0 ? templates.reduce((sum, t) => sum + (t.usageCount || 0), 0) / templates.length : 0,
      mostUsed: templates
        .filter((t) => t.usageCount > 0)
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 10),
      recentlyUsed: templates
        .filter((t) => t.lastUsed)
        .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
        .slice(0, 10),
      unusedTemplates: templates.filter((t) => !t.usageCount || t.usageCount === 0),
    };
  }

  /**
   * Backup templates to JSON file
   */
  async backupTemplates() {
    const backup = {
      version: "3.0",
      backupDate: new Date().toISOString(),
      templates: this.exportTemplates(),
      categories: Object.fromEntries(Array.from(this.categories.entries()).map(([name, ids]) => [name, Array.from(ids)])),
      statistics: this.getStatistics(),
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Restore templates from backup
   */
  async restoreFromBackup(backupData, options = {}) {
    try {
      const backup = typeof backupData === "string" ? JSON.parse(backupData) : backupData;

      if (!backup.templates || !backup.templates.templates) {
        throw new Error("Invalid backup format");
      }

      const { overwriteExisting = false, mergeCategories = true } = options;

      // Clear existing templates if overwrite is enabled
      if (overwriteExisting) {
        this.templates.clear();
        this.categories.clear();
        this.initializeCategories();
      }

      // Restore categories
      if (backup.categories && mergeCategories) {
        for (const [categoryName, templateIds] of Object.entries(backup.categories)) {
          if (!this.categories.has(categoryName)) {
            this.categories.set(categoryName, new Set());
          }
        }
      }

      // Import templates
      const results = await this.importTemplates(backup.templates, { overwrite: overwriteExisting });

      await this.saveTemplates();

      this.emit("templatesRestored", { results, backup });

      return results;
    } catch (error) {
      console.error("Failed to restore from backup:", error);
      throw error;
    }
  }

  /**
   * Validate template integrity
   */
  validateIntegrity() {
    const issues = [];

    // Check for orphaned templates (not in any category)
    for (const template of this.templates.values()) {
      let found = false;
      for (const templateIds of this.categories.values()) {
        if (templateIds.has(template.id)) {
          found = true;
          break;
        }
      }
      if (!found) {
        issues.push({
          type: "orphaned_template",
          templateId: template.id,
          templateName: template.name,
          message: "Template not assigned to any category",
        });
      }
    }

    // Check for invalid category references
    for (const [categoryName, templateIds] of this.categories.entries()) {
      for (const templateId of templateIds) {
        if (!this.templates.has(templateId)) {
          issues.push({
            type: "invalid_reference",
            categoryName,
            templateId,
            message: "Category references non-existent template",
          });
        }
      }
    }

    // Check for duplicate names
    const nameMap = new Map();
    for (const template of this.templates.values()) {
      if (nameMap.has(template.name)) {
        issues.push({
          type: "duplicate_name",
          templateId: template.id,
          templateName: template.name,
          duplicateId: nameMap.get(template.name),
          message: "Multiple templates with same name",
        });
      } else {
        nameMap.set(template.name, template.id);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      summary: {
        totalTemplates: this.templates.size,
        totalCategories: this.categories.size,
        orphanedTemplates: issues.filter((i) => i.type === "orphaned_template").length,
        invalidReferences: issues.filter((i) => i.type === "invalid_reference").length,
        duplicateNames: issues.filter((i) => i.type === "duplicate_name").length,
      },
    };
  }

  /**
   * Repair template integrity issues
   */
  async repairIntegrity() {
    const validation = this.validateIntegrity();
    const repairs = [];

    for (const issue of validation.issues) {
      try {
        switch (issue.type) {
          case "orphaned_template":
            // Add orphaned template to 'uncategorized' category
            this.addToCategory("uncategorized", issue.templateId);
            repairs.push({
              type: "orphaned_template",
              action: "moved_to_uncategorized",
              templateId: issue.templateId,
            });
            break;

          case "invalid_reference":
            // Remove invalid reference from category
            this.categories.get(issue.categoryName).delete(issue.templateId);
            repairs.push({
              type: "invalid_reference",
              action: "removed_reference",
              categoryName: issue.categoryName,
              templateId: issue.templateId,
            });
            break;

          case "duplicate_name":
            // Rename duplicate template
            const template = this.templates.get(issue.templateId);
            if (template) {
              const newName = this.generateUniqueName(template.name);
              template.name = newName;
              repairs.push({
                type: "duplicate_name",
                action: "renamed",
                templateId: issue.templateId,
                oldName: issue.templateName,
                newName,
              });
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to repair issue ${issue.type}:`, error);
      }
    }

    if (repairs.length > 0) {
      await this.saveTemplates();
      this.emit("integrityRepaired", { repairs });
    }

    return {
      repairsApplied: repairs.length,
      repairs,
    };
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
   * Cleanup and destroy
   */
  async destroy() {
    // Save templates before destruction
    await this.saveTemplates();

    // Clear collections
    this.templates.clear();
    this.categories.clear();
    this.eventListeners.clear();

    this.isInitialized = false;
    console.log("TemplateManager destroyed");
  }
}
