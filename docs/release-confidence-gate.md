# Release Confidence Gate

This document defines the repository-level confidence gate for release candidates and significant behavior changes.

## Purpose

ATTI already has separate scripts for type checking, tests, browser builds, linting, formatting, and e2e coverage. The release confidence gate provides one repeatable entry point for the checks that must pass before a change is considered ready for handoff.

The current gate intentionally separates required release checks from advisory quality checks because the repository still has pre-existing lint and formatting debt. This keeps the release signal useful without hiding that quality debt.

## Required Gate

Run:

```bash
pnpm release:check
```

This runs the required checks in order:

1. `pnpm typecheck`
2. `pnpm test:unit`
3. `pnpm test:integration`
4. `pnpm build:edge`

If any required step fails, the gate stops and exits with a non-zero status.

## Browser E2E Gate

Run:

```bash
pnpm release:check:e2e
```

This runs the required gate and then `pnpm test:e2e`.

Use the e2e gate for:

- release candidates,
- adapter behavior changes,
- content/background message contract changes,
- extraction, recommendation preview, or fill behavior changes,
- changes that affect no-auto-submit guarantees.

## Advisory Quality Gate

Run:

```bash
pnpm quality:advisory
```

This runs the required gate and then:

1. `pnpm lint`
2. `pnpm format:check`

Lint and format failures are reported as advisory and do not change the final exit code. This mode is useful while the current repository-level lint/format debt is still being cleaned up.

## Strict Quality Gate

Run:

```bash
pnpm quality:strict
```

This runs the required gate and then treats `pnpm lint` and `pnpm format:check` as blocking checks.

Use this mode after the existing lint/format debt has been resolved, or for local cleanup branches where quality debt is the target of the change.

## CI Policy

The initial GitHub Actions workflow should run:

```bash
pnpm release:check
```

Do not make lint or format blocking in CI until the existing debt is fixed. After that cleanup, CI can move to `pnpm quality:strict` or the default release gate can be tightened.

## Local Tooling Note

If `pnpm` is not available on `PATH` in the local Windows environment, use the repository-provided Node and pnpm entry point:

```bash
./.tools/node-v24.15.0-win-x64/node.exe ./.tools/corepack/v1/pnpm/10.33.0/bin/pnpm.cjs release:check
```

The release gate script reuses the current pnpm executable when launched through pnpm, so nested checks continue to work in that local-toolchain setup.
