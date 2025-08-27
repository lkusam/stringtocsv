/**
 * VirtualScrollManager - Implements virtual scrolling for large datasets
 * Optimizes rendering performance by only rendering visible items
 */

export class VirtualScrollManager {
  constructor(container, options = {}) {
    this.container = container;
    this.items = [];
    this.visibleItems = [];

    // Configuration
    this.itemHeight = options.itemHeight || 40;
    this.bufferSize = options.bufferSize || 5; // Items to render outside viewport
    this.overscan = options.overscan || 3; // Additional items for smooth scrolling
    this.estimatedItemHeight = options.estimatedItemHeight || this.itemHeight;
    this.variableHeight = options.variableHeight || false;

    // Viewport state
    this.scrollTop = 0;
    this.containerHeight = 0;
    this.totalHeight = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this.visibleStartIndex = 0;
    this.visibleEndIndex = 0;

    // Height tracking for variable height items
    this.itemHeights = new Map();
    this.measuredItems = new Set();
    this.averageItemHeight = this.itemHeight;

    // Performance optimization
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.rafId = null;
    this.lastScrollTime = 0;
    this.scrollVelocity = 0;

    // DOM elements
    this.scrollContainer = null;
    this.contentContainer = null;
    this.spacerTop = null;
    this.spacerBottom = null;

    // Event callbacks
    this.onItemRender = options.onItemRender || (() => {});
    this.onItemUnmount = options.onItemUnmount || (() => {});
    this.onScrollStart = options.onScrollStart || (() => {});
    this.onScrollEnd = options.onScrollEnd || (() => {});
    this.onVisibleRangeChange = options.onVisibleRangeChange || (() => {});

    this.init();
  }

  /**
   * Initialize virtual scroll manager
   */
  init() {
    this.setupDOM();
    this.setupEventListeners();
    this.measureContainer();
  }

  /**
   * Setup DOM structure
   */
  setupDOM() {
    // Create scroll container
    this.scrollContainer = document.createElement("div");
    this.scrollContainer.className = "virtual-scroll-container";
    this.scrollContainer.style.cssText = `
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    `;

    // Create content container
    this.contentContainer = document.createElement("div");
    this.contentContainer.className = "virtual-scroll-content";
    this.contentContainer.style.cssText = `
      position: relative;
      min-height: 100%;
    `;

    // Create spacers
    this.spacerTop = document.createElement("div");
    this.spacerTop.className = "virtual-scroll-spacer-top";
    this.spacerTop.style.cssText = `
      height: 0px;
      flex-shrink: 0;
    `;

    this.spacerBottom = document.createElement("div");
    this.spacerBottom.className = "virtual-scroll-spacer-bottom";
    this.spacerBottom.style.cssText = `
      height: 0px;
      flex-shrink: 0;
    `;

    // Assemble DOM
    this.contentContainer.appendChild(this.spacerTop);
    this.contentContainer.appendChild(this.spacerBottom);
    this.scrollContainer.appendChild(this.contentContainer);
    this.container.appendChild(this.scrollContainer);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Scroll event with throttling
    this.scrollContainer.addEventListener("scroll", this.handleScroll.bind(this), { passive: true });

    // Resize observer for container size changes
    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === this.scrollContainer) {
            this.handleResize();
          }
        }
      });
      this.resizeObserver.observe(this.scrollContainer);
    } else {
      // Fallback for browsers without ResizeObserver
      window.addEventListener("resize", this.handleResize.bind(this));
    }
  }

  /**
   * Handle scroll events
   * @param {Event} event - Scroll event
   */
  handleScroll(event) {
    const now = performance.now();
    const deltaTime = now - this.lastScrollTime;
    const deltaScroll = this.scrollContainer.scrollTop - this.scrollTop;

    // Calculate scroll velocity
    this.scrollVelocity = deltaTime > 0 ? Math.abs(deltaScroll / deltaTime) : 0;

    this.scrollTop = this.scrollContainer.scrollTop;
    this.lastScrollTime = now;

    // Handle scroll start
    if (!this.isScrolling) {
      this.isScrolling = true;
      this.onScrollStart();
    }

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Schedule scroll end detection
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.onScrollEnd();
    }, 150);

    // Update visible range
    this.updateVisibleRange();
  }

  /**
   * Handle container resize
   */
  handleResize() {
    this.measureContainer();
    this.updateVisibleRange();
  }

  /**
   * Measure container dimensions
   */
  measureContainer() {
    const rect = this.scrollContainer.getBoundingClientRect();
    this.containerHeight = rect.height;
  }

  /**
   * Set items to display
   * @param {Array} items - Items to display
   */
  setItems(items) {
    this.items = items;
    this.calculateTotalHeight();
    this.updateVisibleRange();
  }

  /**
   * Calculate total height of all items
   */
  calculateTotalHeight() {
    if (this.variableHeight) {
      // Calculate based on measured heights
      let totalHeight = 0;
      for (let i = 0; i < this.items.length; i++) {
        totalHeight += this.getItemHeight(i);
      }
      this.totalHeight = totalHeight;
    } else {
      // Fixed height calculation
      this.totalHeight = this.items.length * this.itemHeight;
    }
  }

  /**
   * Get height of specific item
   * @param {number} index - Item index
   * @returns {number} Item height
   */
  getItemHeight(index) {
    if (this.itemHeights.has(index)) {
      return this.itemHeights.get(index);
    }

    if (this.variableHeight) {
      return this.estimatedItemHeight;
    }

    return this.itemHeight;
  }

  /**
   * Set height for specific item
   * @param {number} index - Item index
   * @param {number} height - Item height
   */
  setItemHeight(index, height) {
    if (this.itemHeights.get(index) !== height) {
      this.itemHeights.set(index, height);
      this.measuredItems.add(index);

      // Update average height
      this.updateAverageHeight();

      // Recalculate total height
      this.calculateTotalHeight();

      // Update visible range if needed
      this.updateVisibleRange();
    }
  }

  /**
   * Update average item height
   */
  updateAverageHeight() {
    if (this.measuredItems.size > 0) {
      let totalHeight = 0;
      this.measuredItems.forEach((index) => {
        totalHeight += this.itemHeights.get(index);
      });
      this.averageItemHeight = totalHeight / this.measuredItems.size;

      // Update estimated height for unmeasured items
      this.estimatedItemHeight = this.averageItemHeight;
    }
  }

  /**
   * Get offset position for item
   * @param {number} index - Item index
   * @returns {number} Offset position
   */
  getItemOffset(index) {
    if (!this.variableHeight) {
      return index * this.itemHeight;
    }

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this.getItemHeight(i);
    }
    return offset;
  }

  /**
   * Find item index at specific offset
   * @param {number} offset - Offset position
   * @returns {number} Item index
   */
  findItemIndexAtOffset(offset) {
    if (!this.variableHeight) {
      return Math.floor(offset / this.itemHeight);
    }

    let currentOffset = 0;
    for (let i = 0; i < this.items.length; i++) {
      const itemHeight = this.getItemHeight(i);
      if (currentOffset + itemHeight > offset) {
        return i;
      }
      currentOffset += itemHeight;
    }

    return this.items.length - 1;
  }

  /**
   * Update visible range based on scroll position
   */
  updateVisibleRange() {
    if (this.items.length === 0) {
      this.clearVisibleItems();
      return;
    }

    const scrollTop = this.scrollTop;
    const scrollBottom = scrollTop + this.containerHeight;

    // Find visible range
    const startIndex = Math.max(0, this.findItemIndexAtOffset(scrollTop));
    const endIndex = Math.min(this.items.length - 1, this.findItemIndexAtOffset(scrollBottom));

    // Add buffer and overscan
    const bufferStart = Math.max(0, startIndex - this.bufferSize - this.overscan);
    const bufferEnd = Math.min(this.items.length - 1, endIndex + this.bufferSize + this.overscan);

    // Update if range changed
    if (bufferStart !== this.startIndex || bufferEnd !== this.endIndex || startIndex !== this.visibleStartIndex || endIndex !== this.visibleEndIndex) {
      this.startIndex = bufferStart;
      this.endIndex = bufferEnd;
      this.visibleStartIndex = startIndex;
      this.visibleEndIndex = endIndex;

      this.renderVisibleItems();
      this.onVisibleRangeChange(startIndex, endIndex, bufferStart, bufferEnd);
    }
  }

  /**
   * Render visible items
   */
  renderVisibleItems() {
    // Cancel any pending render
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.performRender();
    });
  }

  /**
   * Perform the actual rendering
   */
  performRender() {
    // Clear existing items
    this.clearVisibleItems();

    // Calculate spacer heights
    const topSpacerHeight = this.getItemOffset(this.startIndex);
    const bottomSpacerHeight = this.totalHeight - this.getItemOffset(this.endIndex + 1);

    // Update spacers
    this.spacerTop.style.height = `${topSpacerHeight}px`;
    this.spacerBottom.style.height = `${Math.max(0, bottomSpacerHeight)}px`;

    // Render items
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      this.renderItem(i);
    }
  }

  /**
   * Render a single item
   * @param {number} index - Item index
   */
  renderItem(index) {
    const item = this.items[index];
    if (!item) return;

    // Create item element
    const itemElement = this.onItemRender(item, index);
    if (!itemElement) return;

    // Set up item element
    itemElement.dataset.virtualIndex = index;
    itemElement.style.position = "relative";

    // Add to visible items
    this.visibleItems.push({
      index,
      element: itemElement,
      item,
    });

    // Insert before bottom spacer
    this.contentContainer.insertBefore(itemElement, this.spacerBottom);

    // Measure height if variable height
    if (this.variableHeight) {
      this.measureItemHeight(itemElement, index);
    }
  }

  /**
   * Measure item height
   * @param {HTMLElement} element - Item element
   * @param {number} index - Item index
   */
  measureItemHeight(element, index) {
    // Use ResizeObserver if available
    if ("ResizeObserver" in window && !this.itemResizeObserver) {
      this.itemResizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.dataset.virtualIndex);
          if (!isNaN(index)) {
            const height = entry.contentRect.height;
            this.setItemHeight(index, height);
          }
        });
      });
    }

    if (this.itemResizeObserver) {
      this.itemResizeObserver.observe(element);
    } else {
      // Fallback: measure immediately
      requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        this.setItemHeight(index, rect.height);
      });
    }
  }

  /**
   * Clear visible items
   */
  clearVisibleItems() {
    this.visibleItems.forEach(({ element, index, item }) => {
      // Notify about unmounting
      this.onItemUnmount(item, index, element);

      // Remove from DOM
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }

      // Stop observing if using ResizeObserver
      if (this.itemResizeObserver) {
        this.itemResizeObserver.unobserve(element);
      }
    });

    this.visibleItems = [];
  }

  /**
   * Scroll to specific item
   * @param {number} index - Item index
   * @param {string} align - Alignment ('start', 'center', 'end')
   */
  scrollToItem(index, align = "start") {
    if (index < 0 || index >= this.items.length) return;

    const itemOffset = this.getItemOffset(index);
    const itemHeight = this.getItemHeight(index);

    let scrollTop;

    switch (align) {
      case "center":
        scrollTop = itemOffset - (this.containerHeight - itemHeight) / 2;
        break;
      case "end":
        scrollTop = itemOffset - this.containerHeight + itemHeight;
        break;
      default: // 'start'
        scrollTop = itemOffset;
    }

    // Clamp scroll position
    scrollTop = Math.max(0, Math.min(scrollTop, this.totalHeight - this.containerHeight));

    this.scrollContainer.scrollTop = scrollTop;
  }

  /**
   * Scroll to specific offset
   * @param {number} offset - Scroll offset
   */
  scrollToOffset(offset) {
    const clampedOffset = Math.max(0, Math.min(offset, this.totalHeight - this.containerHeight));
    this.scrollContainer.scrollTop = clampedOffset;
  }

  /**
   * Get current scroll information
   * @returns {Object} Scroll information
   */
  getScrollInfo() {
    return {
      scrollTop: this.scrollTop,
      scrollHeight: this.totalHeight,
      clientHeight: this.containerHeight,
      scrollPercentage: this.totalHeight > 0 ? (this.scrollTop / (this.totalHeight - this.containerHeight)) * 100 : 0,
      visibleStartIndex: this.visibleStartIndex,
      visibleEndIndex: this.visibleEndIndex,
      renderedStartIndex: this.startIndex,
      renderedEndIndex: this.endIndex,
      isScrolling: this.isScrolling,
      scrollVelocity: this.scrollVelocity,
    };
  }

  /**
   * Get visible items
   * @returns {Array} Visible items
   */
  getVisibleItems() {
    return this.visibleItems.map(({ item, index }) => ({ item, index }));
  }

  /**
   * Update item at specific index
   * @param {number} index - Item index
   * @param {*} newItem - New item data
   */
  updateItem(index, newItem) {
    if (index >= 0 && index < this.items.length) {
      this.items[index] = newItem;

      // Re-render if currently visible
      const visibleItem = this.visibleItems.find((vi) => vi.index === index);
      if (visibleItem) {
        this.renderVisibleItems();
      }
    }
  }

  /**
   * Insert item at specific index
   * @param {number} index - Insert index
   * @param {*} item - Item to insert
   */
  insertItem(index, item) {
    this.items.splice(index, 0, item);

    // Update height tracking
    const newHeights = new Map();
    this.itemHeights.forEach((height, idx) => {
      if (idx >= index) {
        newHeights.set(idx + 1, height);
      } else {
        newHeights.set(idx, height);
      }
    });
    this.itemHeights = newHeights;

    // Update measured items
    const newMeasuredItems = new Set();
    this.measuredItems.forEach((idx) => {
      if (idx >= index) {
        newMeasuredItems.add(idx + 1);
      } else {
        newMeasuredItems.add(idx);
      }
    });
    this.measuredItems = newMeasuredItems;

    this.calculateTotalHeight();
    this.updateVisibleRange();
  }

  /**
   * Remove item at specific index
   * @param {number} index - Item index to remove
   */
  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);

      // Update height tracking
      const newHeights = new Map();
      this.itemHeights.forEach((height, idx) => {
        if (idx > index) {
          newHeights.set(idx - 1, height);
        } else if (idx < index) {
          newHeights.set(idx, height);
        }
        // Skip idx === index (removed item)
      });
      this.itemHeights = newHeights;

      // Update measured items
      const newMeasuredItems = new Set();
      this.measuredItems.forEach((idx) => {
        if (idx > index) {
          newMeasuredItems.add(idx - 1);
        } else if (idx < index) {
          newMeasuredItems.add(idx);
        }
        // Skip idx === index (removed item)
      });
      this.measuredItems = newMeasuredItems;

      this.calculateTotalHeight();
      this.updateVisibleRange();
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      totalItems: this.items.length,
      renderedItems: this.visibleItems.length,
      renderRatio: this.items.length > 0 ? (this.visibleItems.length / this.items.length) * 100 : 0,
      averageItemHeight: this.averageItemHeight,
      measuredItems: this.measuredItems.size,
      measurementRatio: this.items.length > 0 ? (this.measuredItems.size / this.items.length) * 100 : 0,
      scrollVelocity: this.scrollVelocity,
      isScrolling: this.isScrolling,
      memoryUsage: {
        itemHeights: this.itemHeights.size,
        visibleItems: this.visibleItems.length,
      },
    };
  }

  /**
   * Destroy virtual scroll manager
   */
  destroy() {
    // Clear timeouts and animation frames
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    // Disconnect observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.itemResizeObserver) {
      this.itemResizeObserver.disconnect();
    }

    // Clear visible items
    this.clearVisibleItems();

    // Remove DOM elements
    if (this.scrollContainer && this.scrollContainer.parentNode) {
      this.scrollContainer.parentNode.removeChild(this.scrollContainer);
    }

    // Clear data
    this.items = [];
    this.visibleItems = [];
    this.itemHeights.clear();
    this.measuredItems.clear();
  }
}
