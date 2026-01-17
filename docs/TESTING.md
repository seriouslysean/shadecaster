# Testing Guide

This document describes the testing infrastructure for Shadecaster.

## Testing Philosophy

We follow a focused testing approach:

- **E2E Tests (Cypress)**: Test the complete user journey from upload to STL download
- **No Test Duplication**: Focus on integration tests rather than unit tests for individual functions
- **Real Browser Testing**: Validate actual user workflows in a real browser environment

## Test Structure

```
cypress/
├── e2e/                          # E2E test specs
│   └── shadow-lamp-generation.cy.ts  # Main user journey tests
├── fixtures/                     # Test data (images)
│   ├── test-circle.png          # Black circle on transparent (valid)
│   ├── test-white.png           # All white (edge case)
│   ├── test-black.png           # All black (edge case)
│   └── test-star.png            # Star shape (complex)
└── support/                      # Custom commands and setup
    ├── e2e.ts                   # Main support file
    └── commands.ts              # Custom Cypress commands
```

## Running Tests

### Locally

```bash
# Generate test fixtures (required first time)
node scripts/generate-test-fixtures.js

# Run E2E tests in headless mode
npm test

# Open Cypress interactive mode
npm run test:e2e:open

# Run specific test file
npx cypress run --spec "cypress/e2e/shadow-lamp-generation.cy.ts"
```

### CI/CD

Tests run automatically on:
- Pull requests to any branch
- Pushes to any branch (except main)

The CI pipeline includes:
1. **Lint** - ESLint checks for code quality
2. **Type Check** - TypeScript strict mode validation
3. **Build** - Production build verification
4. **E2E Tests** - Full user journey validation

## Test Coverage

### Main User Journey
- ✅ Application loads successfully
- ✅ Correct default parameters
- ✅ Input guidance displayed
- ✅ File upload enables processing
- ✅ Image processing shows preview
- ✅ STL generation and download
- ✅ Binary STL format validation
- ✅ Parameter adjustments work
- ✅ Privacy (no network requests)

### Edge Cases
- ✅ All-white image (should error gracefully)
- ✅ All-black image (should error gracefully)
- ✅ Transparency support (PNG alpha channel)

### STL Validation
- ✅ Correct MIME type (`application/sla`)
- ✅ Binary format structure (80-byte header + triangle count + triangles)
- ✅ Triangle count matches expected size
- ✅ Normal vectors are valid
- ✅ File size is reasonable

## Custom Cypress Commands

### `cy.uploadFile(fileName)`
Uploads a file from the fixtures directory to a file input.

```typescript
cy.get('#image-upload').uploadFile('test-circle.png');
```

### `cy.waitForPreview()`
Waits for the preview canvas to become visible.

```typescript
cy.waitForPreview();
```

## Test Fixtures

Test images are programmatically generated to ensure consistency:

```bash
node scripts/generate-test-fixtures.js
```

This creates:
- `test-circle.png` - Valid test case (black circle on transparent)
- `test-white.png` - Edge case (all white)
- `test-black.png` - Edge case (all black)
- `test-star.png` - Complex shape test

## Debugging Tests

### Screenshots on Failure
Cypress automatically captures screenshots when tests fail. Find them in:
```
cypress/screenshots/
```

### Videos
Videos are disabled by default for faster runs. Enable in `cypress.config.ts`:
```typescript
video: true,
```

### Interactive Mode
Best for debugging:
```bash
npm run test:e2e:open
```

This opens the Cypress UI where you can:
- Step through tests
- Inspect DOM at each step
- View network requests
- Time-travel debug

## CI Configuration

### GitHub Actions Workflow
Located at `.github/workflows/ci.yml`

The workflow:
1. Runs on pull requests and pushes
2. Uses Node.js 20
3. Caches npm dependencies
4. Runs lint → type-check → build → test in sequence
5. Uploads screenshots/videos on test failure
6. Provides a final status check

### Branch Protection
To enable required checks before merge, configure in GitHub:
1. Go to Settings → Branches
2. Add branch protection rule for `main`
3. Require status checks to pass:
   - `Lint and Type Check`
   - `Build`
   - `E2E Tests`
4. Require pull request reviews (optional)

## Writing New Tests

When adding new features, add corresponding E2E tests:

1. **Create a new describe block** for the feature
2. **Test the happy path** first
3. **Add edge case tests** for error handling
4. **Verify user-facing behavior**, not implementation details

Example:
```typescript
describe('New Feature', () => {
  it('should work for valid input', () => {
    // Happy path
  });

  it('should handle invalid input gracefully', () => {
    // Edge case
  });
});
```

## Performance

- Tests run in ~30-60 seconds in CI
- Headless mode is faster than interactive
- Screenshots add minimal overhead
- Videos add significant overhead (disabled by default)

## Troubleshooting

### Cypress binary not installed
```bash
npx cypress install
```

### Tests fail locally but pass in CI
- Check Node.js version (should be 20)
- Regenerate test fixtures: `node scripts/generate-test-fixtures.js`
- Clear Cypress cache: `npx cypress cache clear`

### Port already in use
Change baseUrl in `cypress.config.ts` or kill process on port 4321:
```bash
lsof -ti:4321 | xargs kill
```

## Future Enhancements

Potential improvements:
- Visual regression testing (Percy, Chromatic)
- Performance testing (Lighthouse CI)
- Accessibility testing (axe-core)
- Unit tests for pure functions (if needed)
- Cross-browser testing (Firefox, Safari)
