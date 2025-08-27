# Chrome Extension v3 Architecture

This directory contains the new modular architecture for Chrome Extension v3, implementing a tab-based interface with enhanced data processing capabilities.

## Directory Structure

```
src/v3/
├── core/                   # Core interfaces and data models
│   └── interfaces.js       # ProcessingJob, ValidationResult, Template, AppSettings
├── components/             # Reusable UI components
│   └── TabComponent.js     # Abstract base class for all tabs
├── managers/               # System managers
│   └── TabManager.js       # Central tab management and coordination
├── engines/                # Data processing engines
│   └── ProcessingEngine.js # Abstract base class for processing engines
├── workers/                # Web worker management
│   └── WorkerPoolManager.js # Worker pool for parallel processing
├── tabs/                   # Tab implementations (to be created)
│   ├── SimpleTab.js        # Enhanced simple mode tab
│   ├── MultiColumnTab.js   # Multi-column processing tab
│   └── BatchTab.js         # Batch processing tab
├── utils/                  # Utility functions (to be created)
│   ├── formatDetector.js   # Format detection utilities
│   ├── validator.js        # Data validation utilities
│   └── exporter.js         # Export functionality
├── index.js                # Main application entry point
└── README.md               # This file
```

## Key Components

### Core Interfaces (`core/interfaces.js`)

- **ProcessingJob**: Represents a data conversion task with input, settings, output, and progress tracking
- **ValidationResult**: Contains validation results with errors, warnings, and statistics
- **Template**: Saved conversion configurations for reuse
- **AppSettings**: Application settings with UI preferences, defaults, and performance options

### Tab System

- **TabComponent**: Abstract base class providing common functionality for all tabs
- **TabManager**: Central controller managing tab switching, state, and inter-tab communication

### Processing System

- **ProcessingEngine**: Abstract base class for data processing engines
- **WorkerPoolManager**: Manages multiple web workers for parallel processing with load balancing

### Main Application (`index.js`)

- **ChromeExtensionV3**: Main application class coordinating all components
- Handles initialization, settings management, and cleanup
- Provides global access through `getApp()` function

## Usage

```javascript
import { initializeApp } from "./src/v3/index.js";

// Initialize the application
const app = await initializeApp();

// Switch tabs
await app.switchTab("multi-column");

// Process data
const result = await app.processData({
  input: "data to process",
  settings: {
    /* processing settings */
  },
});

// Update settings
app.updateSettings({
  ui: { theme: "material", darkMode: true },
});
```

## Implementation Status

✅ **Completed (Task 1)**:

- Core interfaces and data models
- Base TabComponent class
- TabManager for tab coordination
- Base ProcessingEngine class
- WorkerPoolManager for parallel processing
- Main application structure

🔄 **Next Steps**:

- Task 2: Enhanced web worker system with specialized workers
- Task 3: Complete tab management system implementation
- Task 4: Enhanced simple mode tab
- Task 5: Multi-column processing system

## Design Principles

1. **Modular Architecture**: Clear separation of concerns with well-defined interfaces
2. **Extensibility**: Easy to add new tabs, processing engines, and features
3. **Performance**: Web worker pool for non-blocking operations
4. **Maintainability**: Abstract base classes and consistent patterns
5. **Backward Compatibility**: Preserves existing functionality while adding new features

## Error Handling

All components implement comprehensive error handling with:

- Try-catch blocks for async operations
- Error propagation through the component hierarchy
- Graceful degradation when features are unavailable
- Detailed logging for debugging

## Testing Strategy

Each component is designed for testability with:

- Clear interfaces and dependencies
- Mockable external dependencies (Chrome APIs, DOM)
- Isolated functionality for unit testing
- Integration points for system testing
