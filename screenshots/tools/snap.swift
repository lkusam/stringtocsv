// Renders a web page to a PNG at an exact pixel size.
// Usage: swift snap.swift <url> <cssWidth> <cssHeight> <scale> <out.png>
import AppKit
import WebKit

let args = CommandLine.arguments
guard args.count == 6, let url = URL(string: args[1]),
      let cssW = Double(args[2]), let cssH = Double(args[3]), let scale = Double(args[4]) else {
  FileHandle.standardError.write("usage: snap.swift <url> <cssWidth> <cssHeight> <scale> <out.png>\n".data(using: .utf8)!)
  exit(2)
}
let out = args[5]

let app = NSApplication.shared
let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: cssW * scale, height: cssH * scale))
webView.pageZoom = scale
webView.load(URLRequest(url: url))

var attempts = 0
@MainActor func waitUntilReady() {
  webView.evaluateJavaScript("window.__ready === true && (window.__output || '').length > 0") { result, _ in
    attempts += 1
    if (result as? Bool) == true {
      snapshot()
    } else if attempts > 100 {
      FileHandle.standardError.write("page never became ready: \(url)\n".data(using: .utf8)!)
      exit(1)
    } else {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.2, execute: waitUntilReady)
    }
  }
}

@MainActor func snapshot() {
  let config = WKSnapshotConfiguration()
  config.afterScreenUpdates = true
  webView.takeSnapshot(with: config) { image, error in
    guard let image, let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
      FileHandle.standardError.write("snapshot failed: \(String(describing: error))\n".data(using: .utf8)!)
      exit(1)
    }
    let width = Int(cssW * scale), height = Int(cssH * scale)
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    NSGraphicsContext.current?.cgContext.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
    NSGraphicsContext.restoreGraphicsState()
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
    exit(0)
  }
}

DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: waitUntilReady)
app.run()
