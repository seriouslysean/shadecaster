# Claude Development Guide for Shadecaster

This guide is specifically for Claude Code agents working on the Shadecaster project.

## Quick Start

**IMPORTANT**: Read [../.agents](../.agents) first for core validation workflows and project architecture.

This document covers Claude-specific workflows and best practices.

## Validation Workflow

For every change you make, follow the validation workflow in [../.agents](../.agents):

1. Run `npm run lint`
2. Run `npm run type-check`
3. Run `npm run build`
4. Optionally run `npm run ci` to run all checks together

**All checks MUST pass before committing.**

## Claude-Specific Guidelines

### File Reading Strategy

Before modifying any code:
1. **Always read the file first** using the Read tool
2. Understand the existing code structure
3. Identify what needs to change
4. Make targeted edits using the Edit tool

Never propose changes to code you haven't read.

### Tool Usage

- **Read**: Read files before editing
- **Edit**: Make precise string replacements in existing files
- **Write**: Only for NEW files (prefer Edit for existing files)
- **Bash**: For running validation commands (npm run lint, etc.)
- **Glob**: Find files by pattern (e.g., `**/*.ts`)
- **Grep**: Search code content (e.g., find function definitions)

### Validation Commands

Run these after making changes:

```bash
# Lint check
npm run lint

# Type check
npm run type-check

# Build
npm run build

# All CI checks
npm run ci
```

### E2E Testing

E2E tests require manual setup since they need a dev server:

```bash
# You cannot run E2E tests directly without a server
# If user wants to run tests, guide them to:

# 1. Start dev server
npm run dev

# 2. In another terminal, run tests
npm run test:e2e
```

**Note**: You can verify test files for syntax errors via `npm run type-check`, but actual test execution requires a running server.

## Code Modification Workflow

### Example: Adding a New Feature

1. **Understand the request**
   - Ask clarifying questions if needed
   - Identify which files need changes

2. **Read existing code**
   ```
   Read src/pages/index.astro
   Read src/lib/imageProcessor.ts
   ```

3. **Make changes**
   - Use Edit tool for targeted replacements
   - Maintain existing code style
   - Follow TypeScript strict mode

4. **Validate**
   ```bash
   npm run ci
   ```

5. **Test (if applicable)**
   - Guide user to run E2E tests if needed
   - Verify changes don't break existing tests

### Example: Fixing a Bug

1. **Read the file with the bug**
   ```
   Read src/lib/stlGenerator.ts
   ```

2. **Understand the issue**
   - Analyze the code
   - Identify root cause

3. **Fix the bug**
   - Use Edit tool for precise fix
   - Don't refactor unrelated code

4. **Validate**
   ```bash
   npm run lint
   npm run type-check
   npm run build
   ```

## Key Project Details

See [../.agents](../.agents) for complete architecture details. Quick reference:

- **Client-side only**: All processing happens in browser
- **Binary STL format**: Efficient file generation
- **Strict TypeScript**: No `any` types allowed
- **Separation of concerns**: imageProcessor → stlGenerator → download

## Common Scenarios

### Linting Errors

```bash
# Check errors
npm run lint

# Auto-fix if possible
npm run lint:fix
```

### Type Errors

```bash
# Check errors
npm run type-check

# Fix by:
# 1. Read the file with errors
# 2. Add proper types (no 'any')
# 3. Verify with npm run type-check
```

### Build Errors

```bash
# Check errors
npm run build

# Usually caused by:
# - Import errors
# - TypeScript errors
# - Astro syntax issues
```

## What NOT to Do

- Don't create new files unless absolutely necessary
- Don't refactor code that's not related to the task
- Don't use `any` types
- Don't skip validation steps
- Don't commit if checks fail
- Don't modify code you haven't read first

## Git Workflow

When creating commits:

1. **Run all validation**
   ```bash
   npm run ci
   ```

2. **Stage changes**
   ```bash
   git add <files>
   ```

3. **Commit with clear message**
   ```bash
   git commit -m "Brief description of changes"
   ```

4. **Push to branch**
   ```bash
   git push -u origin <branch-name>
   ```

## Testing Reminders

- **Unit tests**: Not used in this project
- **E2E tests**: Cypress tests in `cypress/e2e/`
- **Test fixtures**: Generate with `node scripts/generate-test-fixtures.js`
- **Test coverage**: See [TESTING.md](./TESTING.md)

## Resources

- [../.agents](../.agents) - Core validation workflow (READ THIS FIRST)
- [README.md](./README.md) - Project overview
- [TESTING.md](./TESTING.md) - Testing guide
- [.github/copilot-instructions.md](./.github/copilot-instructions.md) - GitHub Copilot context

## Questions?

If you're unsure about:
- Architecture decisions → Read [../.agents](../.agents)
- Testing approach → Read [TESTING.md](./TESTING.md)
- Project goals → Read [README.md](./README.md)
- Validation steps → Read [../.agents](../.agents)

Always validate your changes before committing!
