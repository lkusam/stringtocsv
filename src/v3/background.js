/**
 * Background service worker for Chrome Extension v3
 * Handles extension lifecycle and command events
 */

// Extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed/updated:", details);

  if (details.reason === "install") {
    console.log("First time installation");
    // Could show welcome message or setup wizard
  } else if (details.reason === "update") {
    console.log("Extension updated from version:", details.previousVersion);
    // Could handle migration or show update notes
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  console.log("Command received:", command);

  // Send command to active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs
        .sendMessage(tabs[0].id, {
          type: "keyboard_command",
          command: command,
        })
        .catch(() => {
          // Ignore errors if content script is not available
          console.log("Could not send command to tab (extension popup not open)");
        });
    }
  });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked");
  // The popup will open automatically due to manifest configuration
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  switch (message.type) {
    case "get_extension_info":
      sendResponse({
        version: chrome.runtime.getManifest().version,
        name: chrome.runtime.getManifest().name,
      });
      break;

    case "performance_report":
      console.log("Performance report:", message.data);
      // Could store performance data or send to analytics
      break;

    default:
      console.log("Unknown message type:", message.type);
  }

  return true; // Keep message channel open for async response
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log("Storage changed:", changes, "in namespace:", namespace);

  // Could sync settings across devices or handle conflicts
});

// Cleanup on extension shutdown
chrome.runtime.onSuspend.addListener(() => {
  console.log("Extension suspending...");
  // Cleanup any resources
});

console.log("Background service worker initialized");
