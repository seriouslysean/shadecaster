# Claude Development Guide for Shadecaster

This guide is specifically for Claude Code agents working on the Shadecaster project.

## Quick Start

**IMPORTANT**: Read [./AGENTS.md](./AGENTS.md) first for core validation workflows and project architecture.

This document covers Claude-specific workflows and best practices.

## Validation Workflow

For every change you make, follow the validation workflow in [./AGENTS.md](./AGENTS.md):

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
