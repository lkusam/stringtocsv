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
   * Handles the conversion logic by offloading it to a Web Worker.
   */
  const handleConvert = debounce(() => {
    console.log("handleConvert (debounced) triggered.");
    // Guard against running conversion during initialization
    if (!isInitialized) return;

    hideError();
    const inputString = inputElement.value;

    if (inputString.length > MAX_INPUT_LENGTH) {
      showError(`Input is too large (>${MAX_INPUT_LENGTH / 1_000_000}M chars). Processing may be slow.`);
    }

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

    console.log("Calling showLoader() for conversion.");
    showLoader();

    // Terminate any existing worker before starting a new one
    if (conversionWorker) {
      conversionWorker.terminate();
    }

    conversionWorker = new Worker("worker.js");

    conversionWorker.onmessage = (e) => {
      console.log("Worker message received:", e.data);
      if (e.data && e.data.error) {
        showError(`Conversion failed: ${e.data.error}`);
        console.error("Worker reported error:", e.data.error);
      } else {
        outputElement.value = e.data;
      }
      console.log("Calling hideLoader() from worker.onmessage.");
      hideLoader();
    };

    conversionWorker.onerror = (e) => {
      showError("An error occurred during conversion.");
      console.error("Worker Error:", e);
      hideLoader();
      console.log("Calling hideLoader() from worker.onerror.");
    };

    conversionWorker.postMessage({
      inputString,
      separator,
      quoteChar,
      shouldTrim,
    });
  }, 300); // 300ms debounce delay

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
      darkMode: darkModeToggle.checked, // Save dark mode state
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
      darkMode: false, // Default to light mode
    };

    const applySettings = (settings) => {
      console.log("applySettings() called with:", settings);
      inputElement.value = settings.inputText;
      separatorElement.value = settings.separator;
      quoteTypeElement.value = settings.quoteType;
      customSeparatorInput.value = settings.customSeparator;
      trimLinesCheckbox.checked = settings.trimLines;
      darkModeToggle.checked = settings.darkMode; // Set toggle state

      // Apply dark mode class immediately
      document.body.classList.toggle("dark-mode", settings.darkMode);

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
        console.log("isInitialized set to true.");
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
    let iconChar = '';
    if (selected === 'newline') iconChar = '↵'; // Unicode for newline symbol
    else if (selected === 'comma') iconChar = ',';
    else if (selected === 'space') iconChar = '␣'; // Unicode for space symbol
    else if (selected === 'custom') iconChar = customSeparatorInput.value || '...'; // Show custom value or ellipsis
    separatorDisplayIcon.textContent = iconChar;

    // Hide the label text if an icon is displayed
    if (iconChar) {
      separatorLabel.classList.add('visually-hidden');
    } else {
      separatorLabel.classList.remove('visually-hidden');
    }
  }

  function updateQuoteTypeDisplayIcon() {
    const selected = quoteTypeElement.value;
    let iconChar = '';
    if (selected === 'single') iconChar = "'";
    else if (selected === 'double') iconChar = '"';
    quoteTypeDisplayIcon.textContent = iconChar;

    // Hide the label text if an icon is displayed
    quoteTypeLabel.classList.add('visually-hidden'); // Always hide as there's always an icon
  }

  function handleSettingChangeAndSave() {
    handleConvert();
    saveOptions();
  }

  // Attach event listeners
  closeButton.addEventListener("click", () => window.close());
  copyButton.addEventListener("click", copyToClipboard);
  clearButton.addEventListener("click", clearOutput);

  // Live conversion: Update output when input text or settings change.
  inputElement.addEventListener("input", () => {
    updateInputCounter();
    console.log("Input event detected.");
    handleConvert();
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
  customSeparatorInput.addEventListener("input", () => { console.log("Custom separator input detected."); handleSettingChangeAndSave(); });
  trimLinesCheckbox.addEventListener("change", () => { console.log("Trim lines checkbox change detected."); handleSettingChangeAndSave(); });

  // Add event listener for dark mode toggle
  darkModeToggle.addEventListener("change", () => {
    console.log("Dark mode toggle change detected.");
    document.body.classList.toggle("dark-mode", darkModeToggle.checked);
    saveOptions();
  });

  // Load saved options on startup
  restoreOptions();
});
