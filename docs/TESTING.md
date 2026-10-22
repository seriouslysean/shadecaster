# Testing Guide

This document describes the testing infrastructure for Shadecaster.

## Testing Philosophy

We follow a focused testing approach:

- **E2E Tests (Playwright)**: Test the complete user journey from upload to STL download
- **No Test Duplication**: Focus on integration tests rather than unit tests for individual functions
- **Real Browser Testing**: Validate actual user workflows in a real browser environment

## Test Structure
