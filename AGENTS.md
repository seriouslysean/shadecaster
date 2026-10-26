# AGENTS.md

Instructions for agents working on the Shadecaster codebase.

- Install: `npm ci` (Node version in `.nvmrc`).
- Gate before a PR: `npm run ci` (lint, type-check, build). CI also runs `npm run test:e2e` after a build (see the E2E section).
- Where things live: see Directory Structure below; guides are in `docs/`.

## Pre-Development Setup

Before making any code changes, ensure dependencies are installed:

```bash
npm ci
```

## Validation Workflow

After making ANY code changes, you MUST run all validation steps in sequence:

### 1. Linting

```bash
npm run lint
```

Checks code quality and enforces consistent style.

### 2. Type Checking

```bash
npm run type-check
```

Validates TypeScript types in strict mode.

### 3. Build

```bash
npm run build
```

Ensures the project builds successfully for production.

### 4. Full CI Validation

```bash
npm run ci
```

Runs lint + type-check + build in one command (same as CI pipeline).

### 5. E2E Tests (Manual)

E2E tests are Playwright specs in `tests/e2e/`. Playwright starts `astro preview` itself (see `playwright.config.ts`), so build first. CI does the same.

```bash
npm run build
npm run test:e2e

# Or use interactive mode for debugging
npm run test:e2e:ui
```

## All Checks Must Pass

ALL validation steps must pass before:
- Committing changes
- Creating pull requests
- Merging to main branch

## Project Architecture

### Tech Stack
- **Framework**: Astro (static site generator)
- **Language**: TypeScript strict mode (ES2023+)
- **Testing**: Playwright (E2E tests only)
- **Linting**: oxlint
- **Deployment**: GitHub Pages via GitHub Actions

### Core Principles
- **DRY** (Don't Repeat Yourself)
- **KISS** (Keep It Simple, Stupid)
- **SOLID** principles with clean separation of concerns
- **Privacy-first**: All processing happens client-side
- **Type safety**: Strict TypeScript for all code

### Directory Structure
```
src/
├── pages/              # Astro pages (UI)
│   └── index.astro    # Main application page
├── lib/               # Core logic modules
│   ├── imageProcessor.ts  # Image processing and radial sampling
│   └── stlGenerator.ts    # STL file generation
└── main.ts            # Client-side application logic

tests/
└── e2e/               # Playwright specs and fixtures (images)

tools/                 # stl-diff and STL utilities
scripts/               # test fixture generator
```

### Code Quality Standards
- **No duplication**: Extract shared logic into reusable functions
- **Small functions**: Each function should do one thing well
- **Type everything**: No `any` types, strict TypeScript
- **Test coverage**: Add E2E tests for user-facing features
- **Comments**: Only where logic isn't self-evident

## Common Tasks

### Regenerate Test Fixtures
```bash
node scripts/generate-test-fixtures.js
```

### Preview Production Build
```bash
npm run build
npm run preview
```

## Troubleshooting

### Dependencies Not Found
```bash
rm -rf node_modules package-lock.json
npm install
```

### Playwright Browser Missing
```bash
npx playwright install chromium
```

### Port 4321 Already in Use
```bash
lsof -ti:4321 | xargs kill
```

## See Also
- [docs/README.md](./docs/README.md) - Project overview and usage
- [docs/TESTING.md](./docs/TESTING.md) - Detailed testing guide
