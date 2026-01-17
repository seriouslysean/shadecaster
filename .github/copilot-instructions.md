# GitHub Copilot Instructions for Shadecaster

This file provides context and guidelines for GitHub Copilot when generating code suggestions.

## Core Validation

**IMPORTANT**: See [../AGENTS.md](../AGENTS.md) for complete validation workflow and project architecture.

Before committing any code, ensure all validation steps pass:

```bash
npm run ci  # Runs lint + type-check + build
```

## Project Context

### What is Shadecaster?

A browser-based tool that converts silhouette images into 3D-printable shadow lamp STL files. All processing happens client-side for privacy.

### Tech Stack

- **Astro**: Static site generator for the UI
- **TypeScript**: Strict mode, ES2023+, no `any` types
- **Cypress**: E2E testing framework
- **ESLint**: Code quality and style enforcement

### Architecture

```
User uploads image
  → imageProcessor.ts (converts to binary, radial sampling)
  → Preview on canvas
  → stlGenerator.ts (creates 3D mesh)
  → Download binary STL file
```

## Code Style Guidelines

### TypeScript Standards

```typescript
// ✅ DO: Use strict types
function processImage(imageData: ImageData, threshold: number): Uint8Array {
  // Implementation
}

// ❌ DON'T: Use any types
function processImage(imageData: any, threshold: any): any {
  // Implementation
}
```

### Function Style

```typescript
// ✅ DO: Small, focused functions
function convertToBinary(imageData: ImageData, threshold: number): Uint8Array {
  // Single responsibility
}

// ❌ DON'T: Large, multi-purpose functions
function processEverything(data: any): any {
  // Too much happening here
}
```

### DRY Principle

```typescript
// ✅ DO: Extract repeated logic
function createVertex(x: number, y: number, z: number): Float32Array {
  return new Float32Array([x, y, z]);
}

// ❌ DON'T: Repeat code blocks
const v1 = new Float32Array([x1, y1, z1]);
const v2 = new Float32Array([x2, y2, z2]);
const v3 = new Float32Array([x3, y3, z3]);
```

## Code Generation Guidelines

### When Suggesting Code

1. **Match existing style**: Follow patterns in the codebase
2. **Type everything**: Use proper TypeScript types
3. **Keep it simple**: KISS principle applies
4. **Avoid duplication**: DRY principle applies
5. **Comment sparingly**: Only when logic isn't self-evident

### File Organization

- `src/pages/`: UI components (Astro files)
- `src/lib/`: Core logic (TypeScript modules)
- `src/main.ts`: Client-side orchestration
- `cypress/e2e/`: E2E test specs

### Common Patterns

#### Image Processing

```typescript
// Pattern: Canvas API for image manipulation
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;
ctx.drawImage(image, 0, 0);
const imageData = ctx.getImageData(0, 0, width, height);
```

#### STL Generation

```typescript
// Pattern: Binary STL format (little-endian)
const view = new DataView(buffer);
view.setFloat32(offset, value, true); // true = little-endian
```

#### Type Safety

```typescript
// Pattern: Strict null checks
const element = document.getElementById('my-id');
if (!element) {
  throw new Error('Element not found');
}
// Now element is non-null
```

## Validation Commands

Generate code that passes these checks:

```bash
# Linting (code quality)
npm run lint

# Type checking (TypeScript validation)
npm run type-check

# Build (production build)
npm run build

# All checks together (recommended)
npm run ci
```

## Testing Context

### E2E Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should do something specific', () => {
    // Arrange
    cy.get('#element').uploadFile('test-fixture.png');

    // Act
    cy.get('#button').click();

    // Assert
    cy.get('#result').should('be.visible');
  });
});
```

### Custom Cypress Commands

- `cy.uploadFile(fileName)`: Upload file from fixtures
- `cy.waitForPreview()`: Wait for canvas to render

## What to Avoid

- **Don't** use `any` types
- **Don't** create new files unnecessarily
- **Don't** add unused dependencies
- **Don't** make network requests (client-side only)
- **Don't** add unnecessary complexity
- **Don't** skip error handling at boundaries

## What to Prefer

- **Do** use strict TypeScript types
- **Do** follow existing code patterns
- **Do** keep functions small and focused
- **Do** add E2E tests for user-facing features
- **Do** validate client-side processing (no network calls)
- **Do** handle errors gracefully

## Privacy Requirements

This project emphasizes privacy:

```typescript
// ✅ DO: Process everything client-side
function processImage(imageData: ImageData): ProcessedData {
  // All processing in browser
  return processedData;
}

// ❌ DON'T: Make external requests
async function processImage(imageData: ImageData): Promise<ProcessedData> {
  const response = await fetch('https://api.example.com/process', {
    method: 'POST',
    body: imageData
  });
  return response.json();
}
```

## Resources

For complete details, see:

- [../AGENTS.md](../AGENTS.md) - Core validation workflow and architecture
- [../CLAUDE.md](../CLAUDE.md) - Claude-specific workflows (if using Claude)
- [../docs/README.md](../docs/README.md) - Project overview
- [../docs/TESTING.md](../docs/TESTING.md) - Testing guide

## Quick Reference

### Project Principles

1. **DRY**: Don't Repeat Yourself
2. **KISS**: Keep It Simple, Stupid
3. **SOLID**: Clean separation of concerns
4. **Privacy**: Client-side processing only
5. **Type Safety**: Strict TypeScript mode

### Before You Suggest

Ask yourself:
- Does this follow existing patterns?
- Is this properly typed?
- Is this the simplest solution?
- Have I avoided duplication?
- Will this pass validation checks?

### After Code Generation

The developer should run:
```bash
npm run ci  # Validates lint + type-check + build
```

All checks must pass before committing.
