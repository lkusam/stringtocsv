/**
 * Debug script for Chrome Extension V3
 * Run this in the browser console to check for common issues
 */

(function () {
  "use strict";

  console.log("🔍 Starting Chrome Extension V3 Debug Check...");

  // Check if we're in the right context
  const isExtensionContext = typeof chrome !== "undefined" && chrome.runtime;
  console.log("Extension context:", isExtensionContext);

  // Check DOM elements
  const requiredElements = ["app", "tab-navigation", "tab-panels", "loading-screen", "error-boundary"];

  console.log("🔍 Checking DOM elements...");
  requiredElements.forEach((id) => {
    const element = document.getElementById(id);
    console.log(`  ${id}:`, element ? "✅ Found" : "❌ Missing");
  });

  // Check if main script loaded
  console.log("🔍 Checking script loading...");
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  const mainScript = scripts.find((s) => s.src.includes("index.js"));
  console.log("  Main script:", mainScript ? "✅ Found" : "❌ Missing");

  // Check CSS loading
  console.log("🔍 Checking CSS loading...");
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  console.log("  Stylesheets loaded:", stylesheets.length);
  stylesheets.forEach((link) => {
    console.log(`    ${link.href}`);
  });

  // Check for global app instance
  setTimeout(() => {
    console.log("🔍 Checking app initialization...");
    if (typeof window.chromeExtV3App !== "undefined") {
      console.log("  App instance: ✅ Found");
      console.log("  App initialized:", window.chromeExtV3App.isInitialized);
    } else {
      console.log("  App instance: ❌ Missing");
    }

    // Check for module loading errors
    const moduleErrors = window.moduleLoadErrors || [];
    if (moduleErrors.length > 0) {
      console.log("❌ Module loading errors:");
      moduleErrors.forEach((error) => console.error("  ", error));
    } else {
      console.log("✅ No module loading errors detected");
    }
  }, 2000);

  // Monitor for errors
  const originalError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    console.error("🚨 Runtime Error:", {
      message,
      source,
      line: lineno,
      column: colno,
      error,
    });

    if (originalError) {
      return originalError.apply(this, arguments);
    }
  };

  // Monitor for unhandled promise rejections
  window.addEventListener("unhandledrejection", function (event) {
    console.error("🚨 Unhandled Promise Rejection:", event.reason);
  });

  console.log("✅ Debug monitoring active. Check console for any errors.");
})();
