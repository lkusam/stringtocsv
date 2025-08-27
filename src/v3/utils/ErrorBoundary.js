/**
 * Error Boundary utilities for Chrome Extension v3
 * Handles global error catching and error UI display
 */

// Mark critical performance points
if (performance.mark) {
  performance.mark("html-loaded");
}

// Error boundary handler
window.addEventListener("error", function (event) {
  console.error("🚨 Global error caught:", event.error);
  window.lastError = event.error?.message || event.error || "Unknown error";
  showErrorBoundary(event.error);
});

window.addEventListener("unhandledrejection", function (event) {
  console.error("🚨 Unhandled promise rejection:", event.reason);
  window.lastError = event.reason?.message || event.reason || "Unknown promise rejection";
  showErrorBoundary(event.reason);
});

function showErrorBoundary(error) {
  console.log("🚨 Error boundary triggered:", error);

  // Store detailed error information
  window.lastErrorDetails = {
    message: error?.message || "Unknown error",
    stack: error?.stack || "No stack trace",
    name: error?.name || "Unknown",
    timestamp: new Date().toISOString(),
    url: window.location.href,
    appInitialized: window.chromeExtV3App?.isInitialized || false,
  };

  // Check if the app is actually working despite the error
  const app = document.getElementById("app");
  const errorBoundary = document.getElementById("error-boundary");
  const errorMessage = document.getElementById("error-message");
  const loadingScreen = document.getElementById("loading-screen");

  // Only show error boundary if the app isn't already visible and working
  const appIsVisible = app && !app.classList.contains("app-hidden");

  if (!appIsVisible) {
    if (app) app.classList.add("app-hidden");
    if (loadingScreen) loadingScreen.classList.add("app-hidden");
    if (errorBoundary) {
      errorBoundary.classList.remove("app-hidden");
      if (errorMessage) {
        errorMessage.textContent = error?.message || "An unexpected error occurred.";
      }
    }
  } else {
    console.log("App appears to be working, not showing error boundary");
  }
}

// Button handlers
document.addEventListener("DOMContentLoaded", function () {
  const reloadButton = document.getElementById("reload-button");
  const reportButton = document.getElementById("report-error");

  if (reloadButton) {
    reloadButton.addEventListener("click", function () {
      window.location.reload();
    });
  }

  if (reportButton) {
    reportButton.addEventListener("click", function () {
      handleReportIssue();
    });
  }
});

// Report issue handler (temporary implementation)
function handleReportIssue() {
  // Collect error information
  const errorInfo = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    errors: window.moduleLoadErrors || [],
    lastError: window.lastError || "Unknown error",
    lastErrorDetails: window.lastErrorDetails || null,
    appInstance: window.chromeExtV3App ? "Available" : "Not available",
  };

  // Create error report text
  const reportText = `Chrome Extension Error Report
Generated: ${errorInfo.timestamp}

Browser: ${errorInfo.userAgent}
URL: ${errorInfo.url}

Error Details:
${JSON.stringify(errorInfo.errors, null, 2)}

Last Error: ${errorInfo.lastError}

Detailed Error Info:
${errorInfo.lastErrorDetails ? JSON.stringify(errorInfo.lastErrorDetails, null, 2) : "No detailed error info available"}

App Instance: ${errorInfo.appInstance}

Please describe what you were doing when this error occurred:
[User description here]
`;

  // For now, copy to clipboard and show instructions
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(reportText)
      .then(() => {
        alert("Error report copied to clipboard!\n\nPlease paste this information in an email to support or create a GitHub issue.");
      })
      .catch(() => {
        // Fallback: show the report in a new window
        showErrorReport(reportText);
      });
  } else {
    // Fallback for browsers without clipboard API
    showErrorReport(reportText);
  }
}

// Show error report in a new window/tab
function showErrorReport(reportText) {
  const newWindow = window.open("", "_blank");
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head><title>Error Report</title></head>
        <body style="font-family: monospace; padding: 20px;">
          <h2>Chrome Extension Error Report</h2>
          <p>Please copy this information and send it to support:</p>
          <textarea style="width: 100%; height: 400px; font-family: monospace;">${reportText}</textarea>
          <br><br>
          <button onclick="navigator.clipboard ? navigator.clipboard.writeText(document.querySelector('textarea').value) : alert('Please manually copy the text above')">Copy to Clipboard</button>
        </body>
      </html>
    `);
  } else {
    // Final fallback: just alert with the report
    alert("Error Report:\n\n" + reportText);
  }
}

// Export for use in other modules
window.showErrorBoundary = showErrorBoundary;
window.handleReportIssue = handleReportIssue;
