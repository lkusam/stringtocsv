document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements for better performance and readability
  const container = document.querySelector(".container");
  const separatorElement = document.getElementById("seperator");
  const separatorLabel = document.querySelector('label[for="seperator"]');
  const separatorDisplayIcon = document.getElementById("separator-display-icon");
  const quoteTypeElement = document.getElementById("quoteType"); // New: Reference to quote type select
  const customSeparatorGroup = document.getElementById("custom-separator-group");
  const customSeparatorInput = document.getElementById("custom-separator-input");
  const darkModeToggle = document.getElementById("darkModeToggle"); // New: Reference to dark mode toggle
  const trimLinesCheckbox = document.getElementById("trimLines");
  const outputElement = document.getElementById("output");
  const inputElement = document.getElementById("input"); // Moved for logical grouping
  const inputCounterElement = document.getElementById("input-counter");
  const errorMessageElement = document.getElementById("error-message");
  const loaderElement = document.getElementById("loader");
  const quoteTypeDisplayIcon = document.getElementById("quote-type-display-icon");
  const quoteTypeLabel = document.querySelector('label[for="quoteType"]');
  const closeButton = document.getElementById("close-btn");
  const copyButton = document.getElementById("copy");
  const clearButton = document.getElementById("clear");
  const settingsButton = document.getElementById("settings-btn");
  const settingsSection = document.getElementById("settings-section");
  const closeSettingsButton = document.getElementById("close-settings-btn");
  const conversionOptionsHeader = document.getElementById("conversion-options-header");
  const conversionOptionsContent = document.querySelector("#conversion-options-section .collapsible-content");
  const themeSelect = document.getElementById("themeSelect");
  const resizeHandle = document.getElementById("resize-handle");

  let conversionWorker;
  const MAX_INPUT_LENGTH = 15_000_000; // 15 million characters
  let isInitialized = false; // Flag to prevent conversion on startup

  // Use an object for a cleaner way to map separator values to symbols
  const separatorMap = {
    newline: "\n",
    comma: ",",
    space: " ",
  };

  /**
   * Copies the content of the output textarea to the clipboard using the modern Clipboard API.
   */
  async function copyToClipboard() {
    const textToCopy = outputElement.value;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      // Provide user feedback without a disruptive alert
      const originalText = copyButton.textContent;
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
    } catch (err) {
      showError("Failed to copy text.");
      console.error("Clipboard Error:", err);
    }
  }

  /**
   * Debounce function to limit the rate at which a function gets called.
   */
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Handles the conversion logic directly (simplified without worker for debugging).
   */
  function handleConvert() {
    console.log("handleConvert (debounced) triggered.");
    // Guard against running conversion during initialization
    if (!isInitialized) {
      console.log("Conversion skipped - not initialized yet");
      return;
    }

    hideError();
    const inputString = inputElement.value;

    if (!inputString) {
      outputElement.value = "";
      return;
    }

    const selectedSeparatorValue = separatorElement.value;
    const selectedQuoteType = quoteTypeElement.value;
    const shouldTrim = trimLinesCheckbox.checked;

    let separator;
    if (selectedSeparatorValue === "custom") {
      separator = customSeparatorInput.value;
      if (separator === "") return; // Don't process with empty custom separator
    } else {
      separator = separatorMap[selectedSeparatorValue] || "\n";
    }

    const quoteChar = selectedQuoteType === "double" ? '"' : "'";

    console.log("Converting with separator:", separator, "quote:", quoteChar);

    try {
      // Direct conversion without worker for debugging
      const result = inputString
        .split(separator)
        .map((item) => (shouldTrim ? item.trim() : item))
        .filter((item) => item) // Filter out empty strings
        .map((item) => `${quoteChar}${item}${quoteChar}`)
        .join(",\n");

      outputElement.value = result;
      console.log("Conversion successful, output length:", result.length);
    } catch (error) {
      showError(`Conversion failed: ${error.message}`);
      console.error("Conversion error:", error);
    }
  }

  /**
   * Clears the input and output textareas.
   */
  function clearOutput() {
    inputElement.value = "";
    outputElement.value = "";
    updateInputCounter();
    hideError();
    saveOptions(); // Save the cleared state
  }

  function showLoader() {
    console.log("showLoader() called.");
    container.classList.add("blurred");
    loaderElement.classList.remove("hidden");
  }

  function hideLoader() {
    console.log("hideLoader() called.");
    container.classList.remove("blurred");
    loaderElement.classList.add("hidden");
  }

  function showError(message) {
    console.error("Error displayed:", message);
    hideLoader(); // Ensure loader is hidden on error
    errorMessageElement.textContent = message;
    errorMessageElement.classList.remove("hidden");
  }

  function hideError() {
    errorMessageElement.classList.add("hidden");
  }

  // --- Options Persistence ---

  function saveOptions() {
    // Do not attempt to save if not in an extension context where the API is available.
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      console.warn("Extension storage API not available. Settings will not be saved.");
      return;
    }

    const settings = {
      inputText: inputElement.value,
      separator: separatorElement.value,
      quoteType: quoteTypeElement.value,
      customSeparator: customSeparatorInput.value,
      trimLines: trimLinesCheckbox.checked,
      darkMode: darkModeToggle.checked,
      theme: themeSelect.value, // Save theme selection
    };
    chrome.storage.sync.set({ settings }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving settings:", chrome.runtime.lastError.message);
      }
    });
  }

  function restoreOptions() {
    console.log("restoreOptions() called.");
    const defaults = {
      inputText: "",
      separator: "newline",
      quoteType: "single",
      customSeparator: "",
      trimLines: true,
      darkMode: false,
      theme: "classic", // Default to classic theme
    };

    const applySettings = (settings) => {
      console.log("applySettings() called with:", settings);
      inputElement.value = settings.inputText;
      separatorElement.value = settings.separator;
      quoteTypeElement.value = settings.quoteType;
      customSeparatorInput.value = settings.customSeparator;
      trimLinesCheckbox.checked = settings.trimLines;
      darkModeToggle.checked = settings.darkMode;
      themeSelect.value = settings.theme;

      // Apply theme and dark mode classes immediately
      applyTheme(settings.theme, settings.darkMode);

      // After applying settings, update all dependent UI elements
      updateCustomSeparatorVisibility();
      updateInputCounter();
      updateSeparatorDisplayIcon();
      updateQuoteTypeDisplayIcon();

      // Mark initialization as complete AFTER all settings are applied.
      // Use a small timeout to push this to the end of the event queue,
      // ensuring any stray startup events (like autofill) are ignored.
      setTimeout(() => {
        isInitialized = true;
        console.log("isInitialized set to true. Ready for conversions.");
        // Test conversion immediately if there's input
        if (inputElement.value) {
          console.log("Found existing input, triggering conversion");
          handleConvert();
        }
      }, 50);
    };

    // Check if running in the extension context
    if (chrome && chrome.storage && chrome.storage.sync) {
      // Get settings from storage, using defaults if none are found
      chrome.storage.sync.get({ settings: defaults }, (data) => {
        applySettings(data.settings);
        console.log("Settings retrieved from storage.");
      });
    } else {
      // Running outside the extension (e.g., as file://), apply default settings
      console.warn("Extension storage API not available. Using default settings.");
      applySettings(defaults);
    }
  }

  function updateCustomSeparatorVisibility() {
    if (separatorElement.value === "custom") {
      customSeparatorGroup.classList.remove("hidden");
    } else {
      customSeparatorGroup.classList.add("hidden");
    }
  }

  function updateInputCounter() {
    const charCount = inputElement.value.length;
    const lineCount = inputElement.value.split("\n").length;
    inputCounterElement.textContent = `Chars: ${charCount.toLocaleString()}, Lines: ${lineCount.toLocaleString()}`;
  }

  function updateSeparatorDisplayIcon() {
    const selected = separatorElement.value;
    let iconChar = "";
    if (selected === "newline") iconChar = "↵"; // Unicode for newline symbol
    else if (selected === "comma") iconChar = ",";
    else if (selected === "space") iconChar = "␣"; // Unicode for space symbol
    else if (selected === "custom") iconChar = customSeparatorInput.value || "..."; // Show custom value or ellipsis
    separatorDisplayIcon.textContent = iconChar;

    // Hide the label text if an icon is displayed
    if (iconChar) {
      separatorLabel.classList.add("visually-hidden");
    } else {
      separatorLabel.classList.remove("visually-hidden");
    }
  }

  function updateQuoteTypeDisplayIcon() {
    const selected = quoteTypeElement.value;
    let iconChar = "";
    if (selected === "single") iconChar = "'";
    else if (selected === "double") iconChar = '"';
    quoteTypeDisplayIcon.textContent = iconChar;

    // Hide the label text if an icon is displayed
    quoteTypeLabel.classList.add("visually-hidden"); // Always hide as there's always an icon
  }

  function applyTheme(theme, darkMode) {
    // Remove existing theme classes
    document.body.classList.remove("material-theme");

    // Apply theme class
    if (theme === "material") {
      document.body.classList.add("material-theme");
    }

    // Apply dark mode
    document.body.classList.toggle("dark-mode", darkMode);
  }

  function handleSettingChangeAndSave() {
    handleConvert();
    saveOptions();
  }

  // Attach event listeners
  closeButton.addEventListener("click", () => window.close());
  copyButton.addEventListener("click", copyToClipboard);
  clearButton.addEventListener("click", clearOutput);

  // Settings panel toggle
  settingsButton.addEventListener("click", () => {
    settingsSection.classList.toggle("hidden");
  });

  closeSettingsButton.addEventListener("click", () => {
    settingsSection.classList.add("hidden");
  });

  // Collapsible behavior for conversion options
  if (conversionOptionsHeader && conversionOptionsContent) {
    const chevronIcon = conversionOptionsHeader.querySelector("i");

    // Set initial chevron state based on content visibility
    if (chevronIcon) {
      const isInitiallyHidden = conversionOptionsContent.classList.contains("hidden");
      chevronIcon.className = isInitiallyHidden ? "fas fa-chevron-down" : "fas fa-chevron-up";
    }

    conversionOptionsHeader.addEventListener("click", () => {
      const isCurrentlyHidden = conversionOptionsContent.classList.contains("hidden");

      // Toggle the content visibility
      conversionOptionsContent.classList.toggle("hidden");

      // Update chevron icon based on new state
      if (chevronIcon) {
        if (isCurrentlyHidden) {
          // Content was hidden, now showing - chevron should point up
          chevronIcon.className = "fas fa-chevron-up";
        } else {
          // Content was showing, now hidden - chevron should point down
          chevronIcon.className = "fas fa-chevron-down";
        }
      }
    });
  }

  // Create debounced version for input events
  const debouncedHandleConvert = debounce(handleConvert, 300);

  // Live conversion: Update output when input text or settings change.
  inputElement.addEventListener("input", () => {
    console.log("Input event detected, value:", inputElement.value);
    updateInputCounter();
    debouncedHandleConvert();
    saveOptions(); // Save input text as well
  });

  separatorElement.addEventListener("change", () => {
    updateCustomSeparatorVisibility();
    if (separatorElement.value === "custom") {
      customSeparatorInput.focus(); // Focus on the input for user convenience
    }
    console.log("Separator change detected.");
    updateSeparatorDisplayIcon(); // Update icon on change
    handleSettingChangeAndSave();
  });

  quoteTypeElement.addEventListener("change", () => {
    console.log("Quote type change detected.");
    updateQuoteTypeDisplayIcon();
    handleSettingChangeAndSave();
  });
  customSeparatorInput.addEventListener("input", () => {
    console.log("Custom separator input detected.");
    handleSettingChangeAndSave();
  });
  trimLinesCheckbox.addEventListener("change", () => {
    console.log("Trim lines checkbox change detected.");
    handleSettingChangeAndSave();
  });

  // Add event listener for dark mode toggle
  darkModeToggle.addEventListener("change", () => {
    console.log("Dark mode toggle change detected.");
    applyTheme(themeSelect.value, darkModeToggle.checked);
    saveOptions();
  });

  // Add event listener for theme selection
  themeSelect.addEventListener("change", () => {
    console.log("Theme change detected:", themeSelect.value);
    applyTheme(themeSelect.value, darkModeToggle.checked);
    saveOptions();
  });

  // Resize functionality
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(document.body).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(document.body).height, 10);

    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
    e.preventDefault();
  });

  function handleResize(e) {
    if (!isResizing) return;

    const width = startWidth + e.clientX - startX;
    const height = startHeight + e.clientY - startY;

    // Set minimum dimensions
    const minWidth = 350;
    const minHeight = 400;
    const maxWidth = 800;
    const maxHeight = 1000;

    const newWidth = Math.max(minWidth, Math.min(maxWidth, width));
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height));

    document.body.style.width = newWidth + "px";
    document.body.style.height = newHeight + "px";

    // Save the new dimensions
    saveWindowSize(newWidth, newHeight);
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  }

  function saveWindowSize(width, height) {
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({
        windowSize: { width, height },
      });
    }
  }

  function restoreWindowSize() {
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(["windowSize"], (result) => {
        if (result.windowSize) {
          document.body.style.width = result.windowSize.width + "px";
          document.body.style.height = result.windowSize.height + "px";
        }
      });
    }
  }

  // Keyboard shortcuts for resizing
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "=":
        case "+":
          // Increase size
          e.preventDefault();
          resizeWindow(50, 50);
          break;
        case "-":
          // Decrease size
          e.preventDefault();
          resizeWindow(-50, -50);
          break;
        case "0":
          // Reset to default size
          e.preventDefault();
          resetWindowSize();
          break;
      }
    }
  });

  function resizeWindow(deltaWidth, deltaHeight) {
    const currentWidth = parseInt(document.defaultView.getComputedStyle(document.body).width, 10);
    const currentHeight = parseInt(document.defaultView.getComputedStyle(document.body).height, 10);

    const newWidth = Math.max(350, Math.min(800, currentWidth + deltaWidth));
    const newHeight = Math.max(400, Math.min(1000, currentHeight + deltaHeight));

    document.body.style.width = newWidth + "px";
    document.body.style.height = newHeight + "px";

    saveWindowSize(newWidth, newHeight);
  }

  function resetWindowSize() {
    document.body.style.width = "400px";
    document.body.style.height = "600px";
    saveWindowSize(400, 600);
  }

  // Load saved options and window size on startup
  restoreOptions();
  restoreWindowSize();
});
