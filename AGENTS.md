# AGENTS.md

Instructions for agents working on the Shadecaster codebase.

- Install: `npm ci` (Node version in `.nvmrc`).
- Gate before a PR: `npm run ci` (lint, type-check, build). CI also runs `npm run test:e2e` after a build (see the E2E section).
- Pre-push hook: `npm ci` installs a Lefthook `pre-push` hook (`lefthook.yml`) that runs `npm run ci` and `npm run test:e2e`. Never skip it.
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

### 5. E2E Tests

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
- **Testing**: Playwright (`tests/e2e/` in the browser, `tests/spec/` against `src/lib`)
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
│   ├── image-processor.ts # Image processing and radial sampling
│   ├── stl-generator.ts   # STL file generation
│   └── utils.ts           # Shared helpers
└── main.ts            # Client-side application logic

tests/
├── e2e/               # Playwright specs and fixtures (images)
└── spec/              # Math spec tests (see docs/TESTING.md)

tools/                 # stl-diff and STL utilities
scripts/               # test fixture generator
```

### Code Quality Standards
- **No duplication**: Extract shared logic into reusable functions
- **Small functions**: Each function should do one thing well
- **Type everything**: No `any` types, strict TypeScript
- **Writing tests**: Before writing or changing a test, read https://github.com/splitleafhq/.github/blob/main/docs/testing.md.
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
rm -rf node_modules
npm ci
```

### Playwright Browser Missing
```bash
npx playwright install chromium
```

### Port Already in Use
`astro dev` and `npm run preview` use 4321; E2E uses 4517, or `E2E_PORT` when set (`playwright.config.ts`).
```bash
lsof -ti:4321 | xargs kill
```

## See Also
- [docs/README.md](./docs/README.md) - Project overview and usage
- [docs/TESTING.md](./docs/TESTING.md) - Detailed testing guide
