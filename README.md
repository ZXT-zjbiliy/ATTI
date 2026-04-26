# ATTI

ATTI is an Edge extension for supported personality-assessment websites. It keeps profile and session data local by default, uses a provider only when the user explicitly starts planning, and can preview plus fill supported questionnaire pages without auto-submitting them.

Current repository version: `0.4.4`

Chinese README: [README.zh-CN.md](./README.zh-CN.md)

Current support status:

- highest-confidence live path: `Truity Enneagram`
- additional adapter-scoped supported routes: `Truity DISC`, `Truity TypeFinder`
- narrow second-site sample: `16Personalities`, with fixture-backed and browser-level extension coverage but no stable live-site verification in this environment because Cloudflare blocks access
- additional adapter-scoped public test route: `SBTI / https://sbti.cc/test`, with dedicated extraction/fill support for its single-question stepping flow
- experimental last-resort path: generic fallback extraction for unsupported assessment pages; this remains limited and should not be treated as universal website support

## Quick Start

Core implementation and architecture work should begin with these files:

1. [memory-bank/@architecture.md](./memory-bank/@architecture.md)
2. [memory-bank/@game-design-document.md](./memory-bank/@game-design-document.md)
3. [software-design-document.md](./software-design-document.md)
4. [tech-stack.md](./tech-stack.md)

## Documentation Map

- Canonical architecture memory:
  [memory-bank/@architecture.md](./memory-bank/@architecture.md)
- Product intent and constraints:
  [memory-bank/@game-design-document.md](./memory-bank/@game-design-document.md)
- Lightweight implementation architecture:
  [software-design-document.md](./software-design-document.md)
- Engineering and stack rules:
  [tech-stack.md](./tech-stack.md)
- Repository structure guide:
  [docs/repository-map.md](./docs/repository-map.md)
- Documentation maintenance rules:
  [docs/documentation-rules.md](./docs/documentation-rules.md)
- Versioning rule:
  [docs/versioning.md](./docs/versioning.md)
- Chinese workflow prompts:
  [docs/prompts/zh-CN/ai-task-prompts.zh-CN.md](./docs/prompts/zh-CN/ai-task-prompts.zh-CN.md)
- Chinese user guide:
  [docs/guides/zh-CN/user-guide.zh-CN.md](./docs/guides/zh-CN/user-guide.zh-CN.md)
- Foundation implementation plan:
  [docs/plans/implementation-plan.md](./docs/plans/implementation-plan.md)

## Repository Layout

Main source and test areas:

- `src/`: implementation source tree
- `entrypoints/`: WXT runtime entrypoints
- `tests/`: unit, integration, and e2e verification
- `memory-bank/`: canonical architecture memory
- `docs/`: repository-level guides and maintenance rules

Within `docs/`, Chinese prompts, guides, and plans are now grouped by purpose instead of being flattened at the repository root.

## Maintenance Guardrails

- Keep modules split by runtime, domain, and feature.
- Do not collapse logic into monolithic files.
- Update `memory-bank/@architecture.md` after any architectural milestone or schema/message/runtime change.
- Prefer adding navigational and maintenance docs under `docs/` instead of growing the root into a flat document pile.
- Follow `docs/versioning.md` for version bumps, commit expectations, and Edge build-output expectations.
