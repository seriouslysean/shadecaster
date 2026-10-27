# Testing Guide

This document describes the testing infrastructure for Shadecaster.

## Testing Philosophy

We follow a focused testing approach:

- **E2E Tests (Playwright)**: Test the complete user journey from upload to STL download
- **No Test Duplication**: Focus on integration tests rather than unit tests for individual functions
- **Real Browser Testing**: Validate actual user workflows in a real browser environment

## Test Structure

- `tests/e2e/`: browser tests of the page.
- `tests/spec/`: math spec tests. They call `src/lib` directly in the Playwright runner (no
  browser) and assert [MATH-SPEC.md](./MATH-SPEC.md). A test marked `test.fail()` is a known
  deviation: it must fail until the math is fixed, and the fix removes the marker.

Run them with `npx playwright test tests/spec`, or everything with `npm run test:e2e` (after
`npm run build`).
