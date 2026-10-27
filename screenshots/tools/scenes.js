// Shared by desktop.html and mobile.html: scene captions, sample data, and mounting the
// real popup (dist/chrome/index.html) into #popup with a chrome.storage stand-in.
// Pages must provide #title, #subtitle and #popup; #rows is optional.
const ids = ["ORD-10421", "ORD-10422", "ORD-10437", "ORD-10450", "ORD-10466", "ORD-10471", "ORD-10489", "ORD-10502"];
const scenes = {
  1: {
    title: "Paste a list. Get clean CSV.",
    subtitle: "Turn line-by-line IDs into a quoted, comma-separated list the moment you paste.",
    settings: { inputText: ids.join("\n") },
  },
  2: {
    title: "Your separator, your quotes",
    subtitle: "Split by new line, comma, space or any custom separator. Wrap items in single or double quotes.",
    settings: { inputText: ids.slice(0, 6).join(", "), separator: "comma", quoteType: "double" },
    openOptions: true,
  },
  3: {
    title: "Built for big lists",
    subtitle: "Convert tens of thousands of IDs at once without freezing your browser.",
    settings: { inputText: Array.from({ length: 50000 }, (_, i) => "ORD-" + (100000 + i)).join("\n") },
  },
  4: {
    title: "Private by design",
    subtitle: "Everything runs on your device. No accounts, no tracking, nothing sent anywhere.",
    settings: { inputText: ids.slice(0, 5).join("\n") },
    openSettings: true,
  },
};

const scene = scenes[new URLSearchParams(location.search).get("scene") || "1"];
document.getElementById("title").textContent = scene.title;
document.getElementById("subtitle").textContent = scene.subtitle;
if (scene.dark) document.body.classList.replace("light", "dark");
const rowsEl = document.getElementById("rows");
if (rowsEl) rowsEl.innerHTML = ids
  .map((id) => `<div class="row"><b>${id}</b><span class="bar"></span></div>`)
  .join("");

const defaults = { inputText: "", separator: "newline", quoteType: "single", customSeparator: "", trimLines: true, darkMode: false, theme: "classic" };
const settings = Object.assign({}, defaults, scene.settings);

// Minimal stand-in for chrome.storage so the popup boots outside an extension.
const stub = `<script>window.chrome = { runtime: {}, storage: { sync: {
    get: (d, cb) => cb(Array.isArray(d) ? {} : { settings: ${JSON.stringify(settings)} }),
    set: (o, cb) => cb && cb() } } };<\/script>`;

fetch("../../dist/chrome/index.html")
  .then((r) => r.text())
  .then((html) => {
    const frame = document.getElementById("popup");
    frame.addEventListener("load", () => {
      setTimeout(() => {
        const doc = frame.contentDocument;
        doc.body.style.width = "400px";
        doc.body.style.height = "600px";
        if (scene.openOptions) doc.getElementById("conversion-options-header").click();
        if (scene.openSettings) doc.getElementById("settings-btn").click();
        setTimeout(() => {
          window.__output = doc.getElementById("output").value;
          window.__ready = true;
        }, 400);
      }, 700);
    });
    frame.srcdoc = html.replace("<head>", `<head><base href="../../dist/chrome/" />${stub}`);
  });
