/**
 * SearchFilterManager - Provides search and filter capabilities for large result sets
 * Handles text search, filtering, and result highlighting
 */

export class SearchFilterManager {
  constructor(options = {}) {
    this.searchTerm = "";
    this.filters = new Map();
    this.results = [];
    this.filteredResults = [];
    this.currentMatchIndex = -1;
    this.matches = [];

    // Configuration
    this.caseSensitive = options.caseSensitive || false;
    this.useRegex = options.useRegex || false;
    this.highlightClass = options.highlightClass || "search-highlight";
    this.currentMatchClass = options.currentMatchClass || "search-current";

    // Event callbacks
    this.onSearchChange = options.onSearchChange || (() => {});
    this.onFilterChange = options.onFilterChange || (() => {});
    this.onResultsUpdate = options.onResultsUpdate || (() => {});
  }

  /**
   * Set data to search and filter
   * @param {Array} data - Data array to search
   */
  setData(data) {
    this.results = Array.isArray(data) ? data : [];
    this.applyFilters();
  }

  /**
   * Set search term
   * @param {string} term - Search term
   */
  setSearchTerm(term) {
    this.searchTerm = term;
    this.currentMatchIndex = -1;
    this.applyFilters();
    this.onSearchChange(term, this.filteredResults);
  }

  /**
   * Add or update a filter
   * @param {string} key - Filter key
   * @param {Function|Object} filter - Filter function or configuration
   */
  addFilter(key, filter) {
    if (typeof filter === "function") {
      this.filters.set(key, { fn: filter, active: true });
    } else {
      this.filters.set(key, {
        fn: filter.fn,
        active: filter.active !== false,
        ...filter,
      });
    }
    this.applyFilters();
    this.onFilterChange(key, filter);
  }

  /**
   * Remove a filter
   * @param {string} key - Filter key
   */
  removeFilter(key) {
    this.filters.delete(key);
    this.applyFilters();
    this.onFilterChange(key, null);
  }

  /**
   * Toggle filter active state
   * @param {string} key - Filter key
   */
  toggleFilter(key) {
    const filter = this.filters.get(key);
    if (filter) {
      filter.active = !filter.active;
      this.applyFilters();
      this.onFilterChange(key, filter);
    }
  }

  /**
   * Apply all filters and search
   */
  applyFilters() {
    let filtered = [...this.results];

    // Apply filters
    this.filters.forEach((filter, key) => {
      if (filter.active && typeof filter.fn === "function") {
        filtered = filtered.filter(filter.fn);
      }
    });

    // Apply search
    if (this.searchTerm) {
      filtered = this.searchInData(filtered, this.searchTerm);
    }

    this.filteredResults = filtered;
    this.updateMatches();
    this.onResultsUpdate(this.filteredResults, this.matches);
  }

  /**
   * Search in data
   * @param {Array} data - Data to search
   * @param {string} term - Search term
   * @returns {Array} Filtered data
   */
  searchInData(data, term) {
    if (!term) return data;

    const searchRegex = this.createSearchRegex(term);
    const results = [];

    data.forEach((item, index) => {
      const searchableText = this.getSearchableText(item);
      if (searchRegex.test(searchableText)) {
        results.push({
          ...item,
          _originalIndex: index,
          _searchMatches: this.findMatches(searchableText, searchRegex),
        });
      }
    });

    return results;
  }

  /**
   * Create search regex from term
   * @param {string} term - Search term
   * @returns {RegExp} Search regex
   */
  createSearchRegex(term) {
    if (this.useRegex) {
      try {
        return new RegExp(term, this.caseSensitive ? "g" : "gi");
      } catch (e) {
        // Invalid regex, fall back to literal search
        return new RegExp(this.escapeRegex(term), this.caseSensitive ? "g" : "gi");
      }
    } else {
      return new RegExp(this.escapeRegex(term), this.caseSensitive ? "g" : "gi");
    }
  }

  /**
   * Escape regex special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Get searchable text from item
   * @param {*} item - Data item
   * @returns {string} Searchable text
   */
  getSearchableText(item) {
    if (typeof item === "string") {
      return item;
    } else if (typeof item === "object" && item !== null) {
      // Search in all string properties
      return Object.values(item)
        .filter((value) => typeof value === "string")
        .join(" ");
    } else {
      return String(item);
    }
  }

  /**
   * Find matches in text
   * @param {string} text - Text to search
   * @param {RegExp} regex - Search regex
   * @returns {Array} Array of match objects
   */
  findMatches(text, regex) {
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        text: match[0],
        index: match.index,
        length: match[0].length,
      });

      // Prevent infinite loop with global regex
      if (!regex.global) break;
    }

    return matches;
  }

  /**
   * Update matches array for navigation
   */
  updateMatches() {
    this.matches = [];

    this.filteredResults.forEach((item, itemIndex) => {
      if (item._searchMatches) {
        item._searchMatches.forEach((match, matchIndex) => {
          this.matches.push({
            itemIndex,
            matchIndex,
            item,
            match,
          });
        });
      }
    });
  }

  /**
   * Navigate to next match
   * @returns {Object|null} Current match object
   */
  nextMatch() {
    if (this.matches.length === 0) return null;

    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matches.length;
    return this.matches[this.currentMatchIndex];
  }

  /**
   * Navigate to previous match
   * @returns {Object|null} Current match object
   */
  previousMatch() {
    if (this.matches.length === 0) return null;

    this.currentMatchIndex = this.currentMatchIndex <= 0 ? this.matches.length - 1 : this.currentMatchIndex - 1;
    return this.matches[this.currentMatchIndex];
  }

  /**
   * Get current match
   * @returns {Object|null} Current match object
   */
  getCurrentMatch() {
    if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.matches.length) {
      return this.matches[this.currentMatchIndex];
    }
    return null;
  }

  /**
   * Highlight matches in HTML element
   * @param {HTMLElement} element - Element to highlight
   * @param {string} text - Text content
   * @param {Array} matches - Array of matches
   */
  highlightMatches(element, text, matches) {
    if (!matches || matches.length === 0) {
      element.textContent = text;
      return;
    }

    let highlightedHTML = "";
    let lastIndex = 0;

    matches.forEach((match, index) => {
      // Add text before match
      highlightedHTML += this.escapeHTML(text.substring(lastIndex, match.index));

      // Add highlighted match
      const isCurrent = this.currentMatchIndex >= 0 && this.matches[this.currentMatchIndex] && this.matches[this.currentMatchIndex].match === match;

      const className = isCurrent ? `${this.highlightClass} ${this.currentMatchClass}` : this.highlightClass;

      highlightedHTML += `<mark class="${className}">${this.escapeHTML(match.text)}</mark>`;

      lastIndex = match.index + match.length;
    });

    // Add remaining text
    highlightedHTML += this.escapeHTML(text.substring(lastIndex));

    element.innerHTML = highlightedHTML;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create search input component
   * @param {Object} options - Component options
   * @returns {HTMLElement} Search input element
   */
  createSearchInput(options = {}) {
    const container = document.createElement("div");
    container.className = "search-input-container";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "search-input";
    input.placeholder = options.placeholder || "Search...";
    input.value = this.searchTerm;

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "search-clear";
    clearButton.innerHTML = "&times;";
    clearButton.setAttribute("aria-label", "Clear search");

    const resultsInfo = document.createElement("div");
    resultsInfo.className = "search-results-info";
    resultsInfo.setAttribute("aria-live", "polite");

    // Event listeners
    input.addEventListener("input", (e) => {
      this.setSearchTerm(e.target.value);
      this.updateResultsInfo(resultsInfo);
    });

    clearButton.addEventListener("click", () => {
      input.value = "";
      this.setSearchTerm("");
      this.updateResultsInfo(resultsInfo);
      input.focus();
    });

    // Navigation buttons
    const navContainer = document.createElement("div");
    navContainer.className = "search-navigation";

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "search-prev";
    prevButton.innerHTML = "↑";
    prevButton.setAttribute("aria-label", "Previous match");
    prevButton.addEventListener("click", () => {
      this.previousMatch();
      this.updateResultsInfo(resultsInfo);
    });

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "search-next";
    nextButton.innerHTML = "↓";
    nextButton.setAttribute("aria-label", "Next match");
    nextButton.addEventListener("click", () => {
      this.nextMatch();
      this.updateResultsInfo(resultsInfo);
    });

    navContainer.appendChild(prevButton);
    navContainer.appendChild(nextButton);

    container.appendChild(input);
    container.appendChild(clearButton);
    container.appendChild(navContainer);
    container.appendChild(resultsInfo);

    this.updateResultsInfo(resultsInfo);

    return container;
  }

  /**
   * Update results info display
   * @param {HTMLElement} element - Results info element
   */
  updateResultsInfo(element) {
    const totalResults = this.filteredResults.length;
    const totalMatches = this.matches.length;
    const currentMatch = this.currentMatchIndex + 1;

    let text = "";
    if (this.searchTerm) {
      if (totalMatches > 0) {
        text = `${currentMatch > 0 ? currentMatch : 0} of ${totalMatches} matches in ${totalResults} results`;
      } else {
        text = `No matches found in ${totalResults} results`;
      }
    } else {
      text = `${totalResults} results`;
    }

    element.textContent = text;
  }

  /**
   * Create filter panel
   * @param {Array} filterConfigs - Filter configurations
   * @returns {HTMLElement} Filter panel element
   */
  createFilterPanel(filterConfigs = []) {
    const panel = document.createElement("div");
    panel.className = "filter-panel";

    const title = document.createElement("h3");
    title.textContent = "Filters";
    panel.appendChild(title);

    filterConfigs.forEach((config) => {
      const filterItem = document.createElement("div");
      filterItem.className = "filter-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `filter-${config.key}`;
      checkbox.checked = config.active !== false;

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = config.label || config.key;

      checkbox.addEventListener("change", () => {
        this.toggleFilter(config.key);
      });

      filterItem.appendChild(checkbox);
      filterItem.appendChild(label);
      panel.appendChild(filterItem);

      // Add the filter
      this.addFilter(config.key, config);
    });

    return panel;
  }

  /**
   * Get search and filter statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalResults: this.results.length,
      filteredResults: this.filteredResults.length,
      searchTerm: this.searchTerm,
      totalMatches: this.matches.length,
      currentMatch: this.currentMatchIndex + 1,
      activeFilters: Array.from(this.filters.entries())
        .filter(([key, filter]) => filter.active)
        .map(([key]) => key),
    };
  }

  /**
   * Clear all filters and search
   */
  clear() {
    this.searchTerm = "";
    this.filters.clear();
    this.currentMatchIndex = -1;
    this.applyFilters();
  }

  /**
   * Export search and filter state
   * @returns {Object} State object
   */
  exportState() {
    return {
      searchTerm: this.searchTerm,
      filters: Array.from(this.filters.entries()),
      caseSensitive: this.caseSensitive,
      useRegex: this.useRegex,
    };
  }

  /**
   * Import search and filter state
   * @param {Object} state - State object
   */
  importState(state) {
    this.searchTerm = state.searchTerm || "";
    this.caseSensitive = state.caseSensitive || false;
    this.useRegex = state.useRegex || false;

    this.filters.clear();
    if (state.filters) {
      state.filters.forEach(([key, filter]) => {
        this.filters.set(key, filter);
      });
    }

    this.applyFilters();
  }
}
