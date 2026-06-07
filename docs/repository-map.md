# Repository Map

This document is the practical map of where things belong in the ATTI repository.

## 1. Source Of Truth Order

When architecture or implementation questions conflict, use this order:

1. `memory-bank/@architecture.md`
2. `memory-bank/@game-design-document.md`
3. `software-design-document.md`
4. `tech-stack.md`
5. module-local `README.md` files

## 2. Top-Level Directory Ownership

- `entrypoints/`
  WXT entrypoints only. Keep these thin.
- `src/`
  Implementation modules grouped by runtime and concern.
- `tests/`
  Automated verification grouped by test scope.
- `memory-bank/`
  Canonical architecture state and product-memory documents.
- `docs/`
  Repository navigation, maintenance rules, contributor-facing operational guides.

## 3. Root-Level Files

Keep the repository root lean. Root-level Markdown files should be limited to:

- canonical project docs that are intentionally top-level,
- workflow-critical prompt packs still referenced by current contributor habits,
- user-facing top-level guides that benefit from direct visibility.

Current root-level Markdown groups:

- Root entry docs:
  `README.md`, `software-design-document.md`, `tech-stack.md`

Grouped documentation now lives under:

- `docs/plans/`
  Implementation plans and staged execution plans.
- `docs/versioning.md`
  Repository release-version rule using `x.y.z`.
- `docs/release-confidence-gate.md`
  Required and advisory release validation gates for local handoff and CI.
- `docs/prompts/zh-CN/`
  Chinese workflow prompt packs.
- `docs/guides/zh-CN/`
  Chinese usage guides and helper content.

New repository-maintenance docs should prefer `docs/` unless there is a strong reason to keep them at root.

## 4. Source Tree Map

Implementation lives under `src/` and should stay split by responsibility:

- `src/app/`
  Popup, sidepanel, and options UI modules only.
- `src/background/`
  Message routing, orchestration, and runtime services.
- `src/content/`
  Content-script runtime and runtime-local messaging only.
- `src/adapters/`
  Site interfaces, registry, and site-specific DOM extraction/fill logic.
- `src/domain/`
  Domain boundaries and business-facing logic slices.
- `src/llm/`
  Provider interfaces, prompts, parsers, and provider utilities.
- `src/storage/`
  Database shell and repositories only.
- `src/shared/`
  Shared contracts, schemas, and cross-runtime helpers.

## 5. Test Tree Map

- `tests/unit/`
  Isolated module tests.
- `tests/integration/`
  Cross-module and persistence verification.
- `tests/e2e/`
  Browser and extension-level behavior checks.
- `tests/fixtures/`
  Stable HTML and data fixtures.
- `tests/config/`
  Test-runner configuration.

## 6. Packaging Rules

To keep the repository comprehensible:

- package new repo-wide guidance into focused docs under `docs/`,
- keep one doc per clear maintenance concern,
- avoid giant "everything handbook" files,
- do not move workflow-critical files casually if existing prompts, docs, or habits still depend on their current paths,
- when a root-level guide becomes large and mostly operational, prefer migrating it into `docs/` only after updating inbound links.
