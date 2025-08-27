/**
 * LazyLoader - Minimal implementation for v3 lazy loading
 */

export class LazyLoader {
  constructor(options = {}) {
    this.preloadDelay = options.preloadDelay || 100;
    this.onComponentLoad = options.onComponentLoad || (() => {});
    this.components = new Map();
  }

  registerComponent(name, loader, options = {}) {
    this.components.set(name, {
      loader,
      options,
      loaded: false,
      component: null,
    });
  }

  async loadComponent(name) {
    const componentData = this.components.get(name);
    if (!componentData) {
      throw new Error(`Component ${name} not registered`);
    }

    if (!componentData.loaded) {
      try {
        const module = await componentData.loader();
        componentData.component = module;
        componentData.loaded = true;
        this.onComponentLoad(name, module);
      } catch (error) {
        console.error(`Failed to load component ${name}:`, error);
        throw error;
      }
    }

    return componentData.component;
  }

  destroy() {
    this.components.clear();
  }
}
