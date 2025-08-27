/**
 * TemplateLibrary - UI component for template management
 * Provides template browsing, searching, and management functionality
 */

export class TemplateLibrary {
  constructor(options = {}) {
    this.container = options.container;
    this.templateManager = options.templateManager;
    this.onTemplateSelect = options.onTemplateSelect || (() => {});
    this.onTemplateApply = options.onTemplateApply || (() => {});

    this.currentView = "grid"; // 'grid' | 'list'
    this.currentCategory = "all";
    this.currentSort = { field: "name", order: "asc" };
    this.searchQuery = "";
    this.selectedTemplates = new Set();
    this.isEditMode = false;

    this.initialize();
  }

  /**
   * Initialize the template library
   */
  initialize() {
    this.createUI();
    this.setupEventListeners();
    this.loadTemplates();
  }

  /**
   * Create the template library UI
   */
  createUI() {
    this.container.innerHTML = `
      <div class="template-library">
        <!-- Header -->
        <div class="library-header">
          <div class="header-left">
            <h3>Template Library</h3>
            <div class="template-count" id="template-count">0 templates</div>
          </div>
          <div class="header-right">
            <button class="new-template-btn" id="new-template-btn">
              <span class="btn-icon">➕</span> New Template
            </button>
            <button class="import-btn" id="import-btn">
              <span class="btn-icon">📥</span> Import
            </button>
            <button class="export-btn" id="export-btn">
              <span class="btn-icon">📤</span> Export
            </button>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="library-toolbar">
          <div class="toolbar-left">
            <div class="search-box">
              <input type="text" id="search-input" placeholder="Search templates..." class="search-input">
              <button class="search-btn" id="search-btn">🔍</button>
            </div>
            
            <div class="filter-dropdown">
              <select id="category-filter" class="category-filter">
                <option value="all">All Categories</option>
                <!-- Categories will be populated dynamically -->
              </select>
            </div>
          </div>
          
          <div class="toolbar-right">
            <div class="sort-dropdown">
              <select id="sort-select" class="sort-select">
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="created-desc">Newest First</option>
                <option value="created-asc">Oldest First</option>
                <option value="modified-desc">Recently Modified</option>
                <option value="usage-desc">Most Used</option>
              </select>
            </div>
            
            <div class="view-toggle">
              <button class="view-btn active" data-view="grid" id="grid-view">⊞</button>
              <button class="view-btn" data-view="list" id="list-view">☰</button>
            </div>
            
            <button class="edit-mode-btn" id="edit-mode-btn">
              <span class="btn-icon">✏️</span> Edit
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="library-content">
          <!-- Sidebar -->
          <div class="library-sidebar" id="library-sidebar">
            <div class="sidebar-section">
              <h4>Categories</h4>
              <div class="category-list" id="category-list">
                <!-- Categories will be populated dynamically -->
              </div>
              <button class="add-category-btn" id="add-category-btn">+ Add Category</button>
            </div>
            
            <div class="sidebar-section">
              <h4>Quick Stats</h4>
              <div class="stats-list" id="stats-list">
                <!-- Stats will be populated dynamically -->
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="library-main" id="library-main">
            <div class="templates-container" id="templates-container">
              <!-- Templates will be populated dynamically -->
            </div>
            
            <div class="empty-state" id="empty-state" style="display: none;">
              <div class="empty-icon">📋</div>
              <h4>No Templates Found</h4>
              <p>Create your first template or adjust your search criteria.</p>
              <button class="create-first-btn" id="create-first-btn">Create Template</button>
            </div>
          </div>
        </div>

        <!-- Template Details Modal -->
        <div class="template-modal" id="template-modal" style="display: none;">
          <div class="modal-overlay" id="modal-overlay"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h4 id="modal-title">Template Details</h4>
              <button class="modal-close" id="modal-close">✕</button>
            </div>
            <div class="modal-body" id="modal-body">
              <!-- Modal content will be populated dynamically -->
            </div>
            <div class="modal-footer" id="modal-footer">
              <!-- Modal actions will be populated dynamically -->
            </div>
          </div>
        </div>

        <!-- Bulk Actions Bar -->
        <div class="bulk-actions-bar" id="bulk-actions-bar" style="display: none;">
          <div class="bulk-info">
            <span id="selected-count">0</span> templates selected
          </div>
          <div class="bulk-actions">
            <button class="bulk-btn" id="bulk-export">Export Selected</button>
            <button class="bulk-btn" id="bulk-category">Change Category</button>
            <button class="bulk-btn danger" id="bulk-delete">Delete Selected</button>
          </div>
          <button class="cancel-bulk-btn" id="cancel-bulk">Cancel</button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Header actions
    this.container.querySelector("#new-template-btn").addEventListener("click", () => this.showNewTemplateModal());
    this.container.querySelector("#import-btn").addEventListener("click", () => this.showImportModal());
    this.container.querySelector("#export-btn").addEventListener("click", () => this.exportAllTemplates());

    // Search and filters
    const searchInput = this.container.querySelector("#search-input");
    const searchBtn = this.container.querySelector("#search-btn");

    searchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.debounceSearch();
    });

    searchBtn.addEventListener("click", () => this.performSearch());

    this.container.querySelector("#category-filter").addEventListener("change", (e) => {
      this.currentCategory = e.target.value;
      this.loadTemplates();
    });

    // Sorting and view
    this.container.querySelector("#sort-select").addEventListener("change", (e) => {
      const [field, order] = e.target.value.split("-");
      this.currentSort = { field, order };
      this.loadTemplates();
    });

    this.container.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.currentView = e.target.dataset.view;
        this.updateViewToggle();
        this.renderTemplates();
      });
    });

    // Edit mode
    this.container.querySelector("#edit-mode-btn").addEventListener("click", () => this.toggleEditMode());

    // Modal
    this.container.querySelector("#modal-close").addEventListener("click", () => this.hideModal());
    this.container.querySelector("#modal-overlay").addEventListener("click", () => this.hideModal());

    // Bulk actions
    this.container.querySelector("#cancel-bulk").addEventListener("click", () => this.cancelBulkSelection());
    this.container.querySelector("#bulk-export").addEventListener("click", () => this.bulkExport());
    this.container.querySelector("#bulk-category").addEventListener("click", () => this.bulkChangeCategory());
    this.container.querySelector("#bulk-delete").addEventListener("click", () => this.bulkDelete());

    // Sidebar
    this.container.querySelector("#add-category-btn").addEventListener("click", () => this.showAddCategoryModal());

    // Empty state
    this.container.querySelector("#create-first-btn").addEventListener("click", () => this.showNewTemplateModal());

    // Template manager events
    if (this.templateManager) {
      this.templateManager.addEventListener("templateCreated", () => this.loadTemplates());
      this.templateManager.addEventListener("templateUpdated", () => this.loadTemplates());
      this.templateManager.addEventListener("templateDeleted", () => this.loadTemplates());
      this.templateManager.addEventListener("categoryCreated", () => this.loadCategories());
      this.templateManager.addEventListener("categoryDeleted", () => this.loadCategories());
    }
  }

  /**
   * Load and display templates
   */
  async loadTemplates() {
    if (!this.templateManager) return;

    try {
      const searchOptions = {
        category: this.currentCategory === "all" ? null : this.currentCategory,
        sortBy: this.currentSort.field,
        sortOrder: this.currentSort.order,
      };

      const templates = this.templateManager.searchTemplates(this.searchQuery, searchOptions);

      this.renderTemplates(templates);
      this.updateTemplateCount(templates.length);
      this.updateStats();
    } catch (error) {
      console.error("Failed to load templates:", error);
      this.showError("Failed to load templates");
    }
  }

  /**
   * Render templates in the current view
   */
  renderTemplates(templates = []) {
    const container = this.container.querySelector("#templates-container");
    const emptyState = this.container.querySelector("#empty-state");

    if (templates.length === 0) {
      container.style.display = "none";
      emptyState.style.display = "block";
      return;
    }

    container.style.display = "block";
    emptyState.style.display = "none";

    container.className = `templates-container ${this.currentView}-view`;

    if (this.currentView === "grid") {
      container.innerHTML = templates.map((template) => this.renderTemplateCard(template)).join("");
    } else {
      container.innerHTML = `
        <div class="templates-list">
          ${templates.map((template) => this.renderTemplateRow(template)).join("")}
        </div>
      `;
    }

    // Setup template event listeners
    this.setupTemplateEventListeners();
  }

  /**
   * Render template card for grid view
   */
  renderTemplateCard(template) {
    const isSelected = this.selectedTemplates.has(template.id);

    return `
      <div class="template-card ${isSelected ? "selected" : ""}" data-template-id="${template.id}">
        ${
          this.isEditMode
            ? `
          <div class="template-checkbox">
            <input type="checkbox" ${isSelected ? "checked" : ""}>
          </div>
        `
            : ""
        }
        
        <div class="template-icon">
          ${this.getTemplateIcon(template.settings.mode)}
        </div>
        
        <div class="template-info">
          <div class="template-name">${this.escapeHtml(template.name)}</div>
          <div class="template-description">${this.escapeHtml(template.description || "No description")}</div>
          <div class="template-meta">
            <span class="template-mode">${template.settings.mode}</span>
            <span class="template-category">${template.category}</span>
            ${template.usageCount ? `<span class="template-usage">Used ${template.usageCount} times</span>` : ""}
          </div>
          <div class="template-dates">
            <span class="template-modified">Modified ${this.formatDate(template.modified)}</span>
          </div>
        </div>
        
        <div class="template-actions">
          <button class="template-action-btn apply-btn" data-action="apply" title="Apply Template">
            <span class="btn-icon">✓</span>
          </button>
          <button class="template-action-btn edit-btn" data-action="edit" title="Edit Template">
            <span class="btn-icon">✏️</span>
          </button>
          <button class="template-action-btn clone-btn" data-action="clone" title="Clone Template">
            <span class="btn-icon">📋</span>
          </button>
          <button class="template-action-btn more-btn" data-action="more" title="More Actions">
            <span class="btn-icon">⋯</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render template row for list view
   */
  renderTemplateRow(template) {
    const isSelected = this.selectedTemplates.has(template.id);

    return `
      <div class="template-row ${isSelected ? "selected" : ""}" data-template-id="${template.id}">
        ${
          this.isEditMode
            ? `
          <div class="template-checkbox">
            <input type="checkbox" ${isSelected ? "checked" : ""}>
          </div>
        `
            : ""
        }
        
        <div class="template-icon">
          ${this.getTemplateIcon(template.settings.mode)}
        </div>
        
        <div class="template-name">${this.escapeHtml(template.name)}</div>
        <div class="template-mode">${template.settings.mode}</div>
        <div class="template-category">${template.category}</div>
        <div class="template-usage">${template.usageCount || 0}</div>
        <div class="template-modified">${this.formatDate(template.modified)}</div>
        
        <div class="template-actions">
          <button class="template-action-btn apply-btn" data-action="apply" title="Apply">✓</button>
          <button class="template-action-btn edit-btn" data-action="edit" title="Edit">✏️</button>
          <button class="template-action-btn clone-btn" data-action="clone" title="Clone">📋</button>
          <button class="template-action-btn more-btn" data-action="more" title="More">⋯</button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners for template items
   */
  setupTemplateEventListeners() {
    // Template selection (in edit mode)
    this.container.querySelectorAll(".template-checkbox input").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const templateId = e.target.closest("[data-template-id]").dataset.templateId;
        if (e.target.checked) {
          this.selectedTemplates.add(templateId);
        } else {
          this.selectedTemplates.delete(templateId);
        }
        this.updateBulkActions();
      });
    });

    // Template actions
    this.container.querySelectorAll(".template-action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = e.target.closest(".template-action-btn").dataset.action;
        const templateId = e.target.closest("[data-template-id]").dataset.templateId;
        this.handleTemplateAction(action, templateId);
      });
    });

    // Template card/row click (for details)
    this.container.querySelectorAll("[data-template-id]").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.closest(".template-actions") && !e.target.closest(".template-checkbox")) {
          const templateId = item.dataset.templateId;
          this.showTemplateDetails(templateId);
        }
      });
    });
  }

  /**
   * Handle template actions
   */
  async handleTemplateAction(action, templateId) {
    const template = this.templateManager.getTemplate(templateId);
    if (!template) return;

    try {
      switch (action) {
        case "apply":
          await this.templateManager.incrementUsage(templateId);
          this.onTemplateApply(template);
          break;

        case "edit":
          this.showEditTemplateModal(template);
          break;

        case "clone":
          await this.cloneTemplate(templateId);
          break;

        case "more":
          this.showTemplateContextMenu(templateId);
          break;
      }
    } catch (error) {
      console.error(`Failed to handle action ${action}:`, error);
      this.showError(`Failed to ${action} template`);
    }
  }

  /**
   * Show template details modal
   */
  showTemplateDetails(templateId) {
    const template = this.templateManager.getTemplate(templateId);
    if (!template) return;

    const modal = this.container.querySelector("#template-modal");
    const title = this.container.querySelector("#modal-title");
    const body = this.container.querySelector("#modal-body");
    const footer = this.container.querySelector("#modal-footer");

    title.textContent = template.name;

    body.innerHTML = `
      <div class="template-details">
        <div class="detail-section">
          <h5>Basic Information</h5>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Name:</label>
              <span>${this.escapeHtml(template.name)}</span>
            </div>
            <div class="detail-item">
              <label>Description:</label>
              <span>${this.escapeHtml(template.description || "No description")}</span>
            </div>
            <div class="detail-item">
              <label>Category:</label>
              <span>${template.category}</span>
            </div>
            <div class="detail-item">
              <label>Mode:</label>
              <span>${template.settings.mode}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h5>Usage Statistics</h5>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Usage Count:</label>
              <span>${template.usageCount || 0}</span>
            </div>
            <div class="detail-item">
              <label>Last Used:</label>
              <span>${template.lastUsed ? this.formatDate(template.lastUsed) : "Never"}</span>
            </div>
            <div class="detail-item">
              <label>Created:</label>
              <span>${this.formatDate(template.created)}</span>
            </div>
            <div class="detail-item">
              <label>Modified:</label>
              <span>${this.formatDate(template.modified)}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h5>Settings</h5>
          <pre class="settings-preview">${JSON.stringify(template.settings, null, 2)}</pre>
        </div>

        ${
          template.tags && template.tags.length > 0
            ? `
          <div class="detail-section">
            <h5>Tags</h5>
            <div class="tags-list">
              ${template.tags.map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    footer.innerHTML = `
      <button class="modal-btn secondary" id="modal-edit">Edit</button>
      <button class="modal-btn secondary" id="modal-clone">Clone</button>
      <button class="modal-btn secondary" id="modal-export">Export</button>
      <button class="modal-btn primary" id="modal-apply">Apply Template</button>
    `;

    // Setup modal action listeners
    footer.querySelector("#modal-edit").addEventListener("click", () => {
      this.hideModal();
      this.showEditTemplateModal(template);
    });

    footer.querySelector("#modal-clone").addEventListener("click", async () => {
      this.hideModal();
      await this.cloneTemplate(templateId);
    });

    footer.querySelector("#modal-export").addEventListener("click", () => {
      this.hideModal();
      this.exportTemplate(templateId);
    });

    footer.querySelector("#modal-apply").addEventListener("click", async () => {
      this.hideModal();
      await this.templateManager.incrementUsage(templateId);
      this.onTemplateApply(template);
    });

    modal.style.display = "block";
  }

  /**
   * Show new template modal
   */
  showNewTemplateModal() {
    const modal = this.container.querySelector("#template-modal");
    const title = this.container.querySelector("#modal-title");
    const body = this.container.querySelector("#modal-body");
    const footer = this.container.querySelector("#modal-footer");

    title.textContent = "Create New Template";

    body.innerHTML = `
      <form class="template-form" id="template-form">
        <div class="form-group">
          <label for="template-name">Template Name *</label>
          <input type="text" id="template-name" required>
        </div>
        
        <div class="form-group">
          <label for="template-description">Description</label>
          <textarea id="template-description" rows="3"></textarea>
        </div>
        
        <div class="form-group">
          <label for="template-category">Category</label>
          <select id="template-category">
            ${this.templateManager
              .getCategories()
              .map((cat) => `<option value="${cat}">${cat}</option>`)
              .join("")}
          </select>
        </div>
        
        <div class="form-group">
          <label for="template-mode">Mode *</label>
          <select id="template-mode" required>
            <option value="simple">Simple</option>
            <option value="multi-column">Multi-Column</option>
            <option value="batch">Batch</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="template-tags">Tags (comma-separated)</label>
          <input type="text" id="template-tags" placeholder="csv, export, data">
        </div>
      </form>
    `;

    footer.innerHTML = `
      <button class="modal-btn secondary" id="modal-cancel">Cancel</button>
      <button class="modal-btn primary" id="modal-save">Create Template</button>
    `;

    // Setup modal action listeners
    footer.querySelector("#modal-cancel").addEventListener("click", () => this.hideModal());
    footer.querySelector("#modal-save").addEventListener("click", () => this.saveNewTemplate());

    modal.style.display = "block";
  }

  /**
   * Save new template
   */
  async saveNewTemplate() {
    const form = this.container.querySelector("#template-form");
    const formData = new FormData(form);

    try {
      const name = this.container.querySelector("#template-name").value.trim();
      const description = this.container.querySelector("#template-description").value.trim();
      const category = this.container.querySelector("#template-category").value;
      const mode = this.container.querySelector("#template-mode").value;
      const tagsInput = this.container.querySelector("#template-tags").value.trim();

      if (!name) {
        throw new Error("Template name is required");
      }

      const tags = tagsInput
        ? tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const settings = {
        mode,
        // Add default settings based on mode
        separators: { row: "\n", column: "," },
        quoting: { type: "double" },
      };

      await this.templateManager.createTemplate(name, settings, {
        description,
        category,
        tags,
      });

      this.hideModal();
      this.showSuccess("Template created successfully");
    } catch (error) {
      console.error("Failed to create template:", error);
      this.showError(error.message);
    }
  }

  /**
   * Clone template
   */
  async cloneTemplate(templateId) {
    try {
      const cloned = await this.templateManager.cloneTemplate(templateId);
      this.showSuccess(`Template cloned as "${cloned.name}"`);
    } catch (error) {
      console.error("Failed to clone template:", error);
      this.showError("Failed to clone template");
    }
  }

  /**
   * Export template
   */
  exportTemplate(templateId) {
    try {
      const exported = this.templateManager.exportTemplate(templateId);
      const template = this.templateManager.getTemplate(templateId);

      const blob = new Blob([JSON.stringify(exported, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${template.name.replace(/[^a-z0-9]/gi, "_")}.json`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export template:", error);
      this.showError("Failed to export template");
    }
  }

  /**
   * Load and populate categories
   */
  loadCategories() {
    if (!this.templateManager) return;

    const categories = this.templateManager.getCategories();

    // Update category filter
    const categoryFilter = this.container.querySelector("#category-filter");
    categoryFilter.innerHTML = `
      <option value="all">All Categories</option>
      ${categories.map((cat) => `<option value="${cat}">${cat}</option>`).join("")}
    `;

    // Update sidebar categories
    const categoryList = this.container.querySelector("#category-list");
    categoryList.innerHTML = categories
      .map((category) => {
        const templates = this.templateManager.getTemplatesByCategory(category);
        return `
        <div class="category-item ${this.currentCategory === category ? "active" : ""}" 
             data-category="${category}">
          <span class="category-name">${category}</span>
          <span class="category-count">${templates.length}</span>
        </div>
      `;
      })
      .join("");

    // Setup category click listeners
    categoryList.querySelectorAll(".category-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.currentCategory = item.dataset.category;
        this.updateCategorySelection();
        this.loadTemplates();
      });
    });
  }

  /**
   * Update statistics display
   */
  updateStats() {
    if (!this.templateManager) return;

    const stats = this.templateManager.getStatistics();
    const statsList = this.container.querySelector("#stats-list");

    statsList.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Templates:</span>
        <span class="stat-value">${stats.totalTemplates}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Categories:</span>
        <span class="stat-value">${stats.categories}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Storage Used:</span>
        <span class="stat-value">${this.formatFileSize(stats.storageUsage)}</span>
      </div>
    `;
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;

    const editBtn = this.container.querySelector("#edit-mode-btn");
    editBtn.classList.toggle("active", this.isEditMode);
    editBtn.innerHTML = this.isEditMode ? '<span class="btn-icon">✓</span> Done' : '<span class="btn-icon">✏️</span> Edit';

    if (!this.isEditMode) {
      this.selectedTemplates.clear();
      this.updateBulkActions();
    }

    this.renderTemplates();
  }

  /**
   * Update bulk actions bar
   */
  updateBulkActions() {
    const bulkBar = this.container.querySelector("#bulk-actions-bar");
    const selectedCount = this.container.querySelector("#selected-count");

    if (this.selectedTemplates.size > 0) {
      bulkBar.style.display = "flex";
      selectedCount.textContent = this.selectedTemplates.size;
    } else {
      bulkBar.style.display = "none";
    }
  }

  /**
   * Utility methods
   */
  getTemplateIcon(mode) {
    const icons = {
      simple: "📄",
      "multi-column": "📊",
      batch: "📦",
    };
    return icons[mode] || "📄";
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  formatFileSize(bytes) {
    const units = ["B", "KB", "MB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  updateTemplateCount(count) {
    this.container.querySelector("#template-count").textContent = `${count} template${count !== 1 ? "s" : ""}`;
  }

  updateViewToggle() {
    this.container.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === this.currentView);
    });
  }

  updateCategorySelection() {
    this.container.querySelectorAll(".category-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.category === this.currentCategory);
    });
  }

  hideModal() {
    this.container.querySelector("#template-modal").style.display = "none";
  }

  showSuccess(message) {
    // Simple implementation - could be enhanced with toast notifications
    console.log("Success:", message);
  }

  showError(message) {
    // Simple implementation - could be enhanced with toast notifications
    console.error("Error:", message);
  }

  debounceSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.performSearch(), 300);
  }

  performSearch() {
    this.loadTemplates();
  }

  // Placeholder methods for bulk operations
  async bulkExport() {
    const templateIds = Array.from(this.selectedTemplates);
    const exported = this.templateManager.exportTemplates(templateIds);

    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `templates_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async bulkChangeCategory() {
    // Implementation for bulk category change
    console.log("Bulk change category for:", this.selectedTemplates);
  }

  async bulkDelete() {
    if (confirm(`Delete ${this.selectedTemplates.size} selected templates?`)) {
      for (const templateId of this.selectedTemplates) {
        await this.templateManager.deleteTemplate(templateId);
      }
      this.selectedTemplates.clear();
      this.updateBulkActions();
    }
  }

  cancelBulkSelection() {
    this.selectedTemplates.clear();
    this.updateBulkActions();
    this.renderTemplates();
  }

  showImportModal() {
    // Implementation for import modal
    console.log("Show import modal");
  }

  exportAllTemplates() {
    const exported = this.templateManager.exportTemplates();

    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `all_templates_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  showEditTemplateModal(template) {
    // Implementation for edit template modal
    console.log("Edit template:", template);
  }

  showTemplateContextMenu(templateId) {
    // Implementation for context menu
    console.log("Show context menu for:", templateId);
  }

  showAddCategoryModal() {
    // Implementation for add category modal
    console.log("Show add category modal");
  }
}
