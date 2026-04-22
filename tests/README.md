# Test Layout

This directory contains automated tests organized by scope.

Subdirectories:

- `unit/`: isolated module tests
- `integration/`: cross-module and persistence tests
- `e2e/`: extension and browser-level flow tests

Tests should remain modular and map cleanly to runtime or domain boundaries.

Recommended scripts:

- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:e2e`
