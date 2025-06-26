/**
 * Converts an input string into a CSV-formatted string.
 * This function is designed to run inside a Web Worker.
 * @param {string} inputString The string to convert.
 * @param {string} separator The character to split the input string by.
 * @param {string} quoteChar The character to use for quoting values (e.g., "'" or '"').
 * @param {boolean} shouldTrim Whether to trim whitespace from each item.
 * @returns {string} The formatted CSV string.
 */
function formatStringToCsv(inputString, separator, quoteChar, shouldTrim) {
  return inputString
    .split(separator)
    .map((item) => (shouldTrim ? item.trim() : item))
    .filter((item) => item) // Filter out empty strings
    .map((item) => `${quoteChar}${item}${quoteChar}`)
    .join(",\n");
}

self.onmessage = function (e) {
  try {
    const { inputString, separator, quoteChar, shouldTrim } = e.data;
    const result = formatStringToCsv(inputString, separator, quoteChar, shouldTrim);
    self.postMessage(result);
  } catch (error) {
    self.postMessage({ error: error.message || "Unknown worker error" });
  }
};
