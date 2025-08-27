/**
 * Font Loader utility for Chrome Extension v3
 * Uses system fonts instead of external resources for CSP compliance
 */

// Use system fonts and Unicode symbols instead of Font Awesome
window.addEventListener("load", function () {
  console.log("Using system fonts for CSP compliance");

  // Add CSS for icon replacements using Unicode symbols
  const style = document.createElement("style");
  style.textContent = `
    .fas.fa-copy::before { content: "📋"; }
    .fas.fa-trash::before { content: "🗑️"; }
    .fas.fa-eye::before { content: "👁️"; }
    .fas.fa-bookmark::before { content: "🔖"; }
    .fas.fa-cog::before { content: "⚙️"; }
    .fas.fa-save::before { content: "💾"; }
    .fas.fa-upload::before { content: "📤"; }
    .fas.fa-magic::before { content: "✨"; }
    .fas, .fa { font-family: inherit; }
  `;
  document.head.appendChild(style);
});
