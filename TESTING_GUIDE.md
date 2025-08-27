# 🧪 Chrome Extension v3 Testing Guide

## Quick Start Testing

### 1. **Launch Test Environment**

Open `test-launcher.html` in your browser to access all testing options:

```
file:///path/to/your/project/test-launcher.html
```

### 2. **Generate Test Data**

Open `test-data-generator.html` to create various test datasets:

```
file:///path/to/your/project/test-data-generator.html
```

## Testing Options

### 🔍 **Unit Tests**

Run the comprehensive test suite:

1. Open `src/v3/test/test.html` in your browser
2. Click "Run All Tests" to execute the full test suite
3. View results in the console and download reports

### 📱 **Version Comparison**

Test both versions side by side:

1. **v2.5 (Current)**: Open `index.html`
2. **v3.0 (New)**: Open `index-v3.html`
3. Compare features, performance, and usability

### ♿ **Accessibility Testing**

Test WCAG 2.1 AA compliance:

1. Open `index-v3.html`
2. Use keyboard navigation (Tab, Shift+Tab, Enter, Escape)
3. Test keyboard shortcuts (Alt+H for help, Alt+C for contrast)
4. Use screen reader tools if available
5. Check focus indicators and high contrast mode

### ⚡ **Performance Testing**

Test performance optimizations:

1. Open browser DevTools (F12)
2. Go to Performance tab
3. Open `index-v3.html`
4. Record performance during:
   - Application startup (should be <200ms)
   - Large dataset processing (>1MB)
   - Memory usage during batch operations
   - Virtual scrolling with large results

## Test Scenarios

### 📝 **Basic Functionality Tests**

#### Simple Mode

1. **Basic Conversion**:

   ```
   Input: apple,banana,cherry
   Expected: "apple","banana","cherry"
   ```

2. **Newline Separated**:

   ```
   Input: line1
          line2
          line3
   Expected: "line1"
            "line2"
            "line3"
   ```

3. **Custom Separator**:
   ```
   Input: item1|item2|item3
   Separator: |
   Expected: "item1","item2","item3"
   ```

#### Multi-Column Mode

1. **Tab-Separated Data**:

   ```
   Input: Name	Age	City
          John	25	NYC
          Jane	30	LA
   Expected: "Name","Age","City"
             "John","25","NYC"
             "Jane","30","LA"
   ```

2. **Mixed Separators**:
   ```
   Input: Col1|Col2|Col3
          Data1|Data2|Data3
   Row Sep: \n
   Col Sep: |
   ```

#### Batch Mode

1. **Multiple Files**: Upload 2-3 small text files
2. **Large File**: Test with >1MB dataset
3. **Mixed Formats**: CSV, TXT, JSON files together

### 🔧 **Advanced Feature Tests**

#### Data Validation

1. Test email validation
2. Test duplicate detection
3. Test format consistency checking
4. Test PII detection warnings

#### Template System

1. Save conversion settings as template
2. Load and apply saved template
3. Export/import template configurations

#### Export Options

1. Test CSV export with different encodings
2. Test TSV (tab-separated) export
3. Test JSON export formats
4. Test Excel-compatible CSV

### 🚨 **Error Handling Tests**

#### Invalid Data

1. **Empty Input**: Test with no data
2. **Malformed Data**: Test with inconsistent formats
3. **Special Characters**: Test Unicode, quotes, escapes
4. **Large Data**: Test memory limits and streaming

#### Edge Cases

1. **Single Character**: Test with just one character
2. **Very Long Lines**: Test with 10,000+ character lines
3. **Many Columns**: Test with 50+ columns
4. **Mixed Line Endings**: Test Windows/Unix line endings

## Browser Testing

### 🌐 **Cross-Browser Compatibility**

Test in multiple browsers:

- ✅ Chrome (primary target)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### 📱 **Responsive Design**

Test different screen sizes:

- Desktop (1920x1080)
- Laptop (1366x768)
- Tablet (768x1024)
- Mobile (375x667)

## Performance Benchmarks

### ⏱️ **Startup Performance**

- **Target**: <200ms initialization
- **Test**: Measure from page load to interactive
- **Tools**: Browser DevTools Performance tab

### 🧠 **Memory Usage**

- **Target**: <50MB for normal operations
- **Test**: Process 1MB+ datasets
- **Tools**: DevTools Memory tab

### 📊 **Processing Speed**

- **Small Data** (<1KB): <10ms
- **Medium Data** (1KB-1MB): <1s
- **Large Data** (>1MB): Use streaming, maintain UI responsiveness

## Accessibility Checklist

### ⌨️ **Keyboard Navigation**

- [ ] Tab navigation works through all interactive elements
- [ ] Shift+Tab works for reverse navigation
- [ ] Enter/Space activates buttons and controls
- [ ] Escape closes dialogs and menus
- [ ] Arrow keys work in lists and grids
- [ ] All keyboard shortcuts function correctly

### 🔊 **Screen Reader Support**

- [ ] All interactive elements have proper labels
- [ ] Status changes are announced
- [ ] Error messages are clearly identified
- [ ] Progress updates are communicated
- [ ] ARIA live regions work correctly

### 👁️ **Visual Accessibility**

- [ ] High contrast mode works
- [ ] Focus indicators are visible
- [ ] Text is readable at 200% zoom
- [ ] Color is not the only way to convey information
- [ ] Animations respect reduced motion preferences

## Automated Testing

### 🤖 **Running Unit Tests**

```bash
# Open in browser
open src/v3/test/test.html

# Or run with a local server
python -m http.server 8000
# Then visit: http://localhost:8000/src/v3/test/test.html
```

### 📊 **Test Coverage**

The test suite covers:

- ✅ Core interfaces and data models
- ✅ Processing engines and algorithms
- ✅ UI components and interactions
- ✅ Accessibility features
- ✅ Performance optimizations
- ✅ Error handling and edge cases

## Reporting Issues

### 🐛 **Bug Reports**

When reporting issues, include:

1. **Browser**: Version and type
2. **Steps**: How to reproduce
3. **Expected**: What should happen
4. **Actual**: What actually happened
5. **Data**: Sample input that caused the issue
6. **Console**: Any error messages

### 📈 **Performance Issues**

For performance problems, include:

1. **Dataset Size**: How much data was processed
2. **Browser**: DevTools performance profile
3. **Memory**: Memory usage screenshots
4. **Timing**: How long operations took

## Test Data Samples

### 📋 **Quick Test Data**

Use the test data generator or these samples:

**Simple List**:

```
apple
banana
cherry
date
elderberry
```

**CSV Data**:

```
Name,Age,City
John Doe,25,New York
Jane Smith,30,Los Angeles
Bob Johnson,35,Chicago
```

**Tab-Separated**:

```
Product	Price	Stock
Widget	$10.99	50
Gadget	$25.50	25
Tool	$15.75	100
```

**Large Dataset**: Use the generator to create 1MB+ test files

## Success Criteria

### ✅ **Functionality**

- All conversion modes work correctly
- Data validation catches errors
- Export formats are properly generated
- Templates save and load correctly

### ✅ **Performance**

- Startup time <200ms
- Large datasets process without blocking UI
- Memory usage stays reasonable
- No memory leaks detected

### ✅ **Accessibility**

- Full keyboard navigation
- Screen reader compatibility
- High contrast support
- WCAG 2.1 AA compliance

### ✅ **Usability**

- Intuitive interface
- Clear error messages
- Helpful documentation
- Smooth user experience

---

## 🎯 Ready to Test!

1. **Start with**: `test-launcher.html`
2. **Generate data**: `test-data-generator.html`
3. **Run tests**: `src/v3/test/test.html`
4. **Compare versions**: Test both v2.5 and v3.0
5. **Report findings**: Document any issues or suggestions

Happy testing! 🚀
