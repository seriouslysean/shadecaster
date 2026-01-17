# Test Fixtures

This directory contains test images for E2E testing.

## Generating Test Fixtures

To generate test fixtures, run the following script:

```bash
node scripts/generate-test-fixtures.js
```

## Test Images

- `test-circle.png` - Black circle on transparent background (ideal test case)
- `test-white.png` - All white image (edge case: should error)
- `test-black.png` - All black image (edge case: should error)
- `test-star.png` - Star shape on transparent background (complex shape test)

These images are programmatically generated to ensure consistent test results.
