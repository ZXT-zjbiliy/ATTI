# Documentation Rules

This document defines how ATTI documentation should evolve without turning into a flat, contradictory pile.

## 1. Document Roles

- `memory-bank/@architecture.md`
  Canonical current-state architecture memory. Update after architectural changes.
- `memory-bank/@game-design-document.md`
  Product intent, constraints, and user-experience rules.
- `software-design-document.md`
  Lightweight implementation architecture and runtime/domain boundaries.
- `tech-stack.md`
  engineering constraints, tool choices, and structural rules.
- `docs/versioning.md`
  repository-level release versioning rule in `x.y.z` format.
- `docs/*`
  repository navigation, contributor operations, and maintenance-oriented guidance.
- `docs/prompts/zh-CN/*`
  Chinese workflow prompt packs.
- `docs/guides/zh-CN/*`
  Chinese user-facing or contributor helper guides.
- `docs/plans/*`
  staged implementation plans and execution blueprints.

## 2. Update Rules

Update `memory-bank/@architecture.md` whenever any of the following change:

- schema,
- message contracts,
- runtime boundaries,
- supported-site strategy,
- provider strategy,
- milestone status,
- repository ownership boundaries.

Update `software-design-document.md` when the simplified architecture or runtime/domain responsibilities change.

Update `tech-stack.md` when the stack, engineering conventions, or structural rules change.

Update `docs/versioning.md` when repository release-version policy changes.

Update `docs/*` when navigation, contributor workflow, or repository organization becomes unclear.

## 3. Placement Rules

- Put canonical architecture facts in `memory-bank/`, not scattered README files.
- Put repo-wide navigation or contributor-facing maintenance guidance in `docs/`.
- Put module-local ownership notes in the nearest `README.md`.
- Keep end-user usage guidance separate from contributor architecture guidance.
- Do not create a new top-level Markdown file when an existing doc or `docs/` guide is the better home.

## 4. Consistency Rules

Before marking a documentation task done, check:

1. Does product scope language match current repository reality?
2. Do docs distinguish between current support and future direction?
3. Do stable boundaries match the actual directory structure?
4. Did we avoid promising more capability than the code currently has?
5. Did we add guidance without creating another monolithic document?

## 5. Repository Hygiene

- Keep the root readable.
- Prefer grouped folders over growing a long root-level file list.
- Do not leave temporary contributor guidance as the only source of architectural truth.
- When docs are reorganized, update inbound links in the same change.
