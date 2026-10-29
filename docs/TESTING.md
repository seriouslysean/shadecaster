# Testing Guide

This document describes the testing infrastructure for Shadecaster.

## Testing Philosophy

Follow the shared testing rules: https://github.com/splitleafhq/.github/blob/main/docs/testing.md. Browser tests in `tests/e2e/` cover the user journey from upload to STL download. Math spec tests in `tests/spec/` call `src/lib` directly. A regression gets one test, at the layer where the bug lives.

## Test Structure

- `tests/e2e/`: browser tests of the page.
- `tests/spec/`: math spec tests. They call `src/lib` directly in the Playwright runner (no
  browser) and assert [MATH-SPEC.md](./MATH-SPEC.md). A test marked `test.fail()` is a known
  deviation: it must fail until the math is fixed, and the fix removes the marker.

Run them with `npx playwright test tests/spec`, or everything with `npm run test:e2e` (after
`npm run build`).
