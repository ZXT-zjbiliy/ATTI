# Tech Stack

## 1. Recommended Stack

### 1.1 Core

- Framework: `WXT`
- UI: `React + TypeScript`
- Styling: `Tailwind CSS`
- State: `Zustand`
- Validation: `Zod`
- Local database: `Dexie` on top of `IndexedDB`
- Testing: `Vitest` + `Playwright`
- Package manager: `pnpm`

## 2. Why This Stack

### 2.1 WXT

Recommended because it is purpose-built for web extensions, supports major browsers, generates extension builds cleanly, and provides a more modern extension-focused developer experience than a generic Vite setup.

### 2.2 React + TypeScript

Recommended for multi-screen plugin UX, typed contracts, and long-term maintainability.

### 2.3 Tailwind CSS

Recommended for fast UI assembly without encouraging giant stylesheet files. Use component-level composition rather than global style sprawl.

### 2.4 Zustand

Recommended for lightweight local UI state. Keep it focused on view and interaction state, not as a dumping ground for persistence or business rules.

### 2.5 Zod

Recommended because every boundary in this project is untrusted:

- extension message payloads,
- LLM outputs,
- imported profile data,
- extracted page content.

### 2.6 Dexie

Recommended because this product is local-first and depends on stable browser-side persistence. Dexie makes IndexedDB schema versioning and queries much easier to manage.

### 2.7 Vitest + Playwright

Recommended because the project needs both:

- fast unit/integration tests for domain logic,
- browser-level end-to-end verification for extraction and fill flows.

## 3. Architecture Rules For AI And Developers

### 3.1 Always Rules

These rules are mandatory and must always be applied.

- `Always`: Before writing any code, fully read [memory-bank/@architecture.md](e:\ATTI\ATTI\memory-bank\@architecture.md).
- `Always`: Before writing any code, fully read [memory-bank/@game-design-document.md](e:\ATTI\ATTI\memory-bank\@game-design-document.md).
- `Always`: After every major feature or milestone, update [memory-bank/@architecture.md](e:\ATTI\ATTI\memory-bank\@architecture.md).
- `Always`: Keep the codebase modular and multi-file. Split by domain, runtime, and feature.
- `Always`: Do not create monolithic files that mix UI, storage, LLM, and DOM automation logic.
- `Always`: Validate all external inputs with `Zod`.
- `Always`: Keep database access inside repository modules only.
- `Always`: Keep site-specific behavior inside adapter modules only.
- `Always`: Keep prompts and LLM response parsers inside `llm/` only.
- `Always`: Prefer small, named modules over large generic helper files.

### 3.2 Structural Rules

- Use one directory per runtime boundary: `app`, `background`, `content`, `adapters`, `storage`, `llm`, `domain`.
- Keep shared types in `shared/types` and shared schemas in `shared/schemas`.
- Use repositories for all persistence operations.
- Use adapters for all site-specific extraction and fill behavior.
- Use provider interfaces for all model integrations.

### 3.3 State Management Rules

- Use `Zustand` only for UI/session interaction state.
- Do not mirror the entire database in client state.
- Persist durable data through repositories, not stores.
- Prefer derived selectors and small stores over one global mega-store.

### 3.4 Network And Provider Rules

- LLM calls must go through a provider interface.
- Do not call remote APIs directly from UI components.
- Redact or minimize sensitive payloads before remote inference.
- Log provider failures with structured metadata, never with raw sensitive content.
- Support future replacement of remote providers with local inference.

### 3.5 Storage Rules

- `chrome.storage.local` is for settings, flags, and lightweight extension config.
- `Dexie/IndexedDB` is for profiles, sessions, normalized questions, and answer plans.
- Every schema change must update the database section in `memory-bank/@architecture.md`.
- Add versioned migrations instead of ad hoc data rewrites.

### 3.6 UI Rules

- Use React components for plugin UI only.
- Do not place page-DOM manipulation code inside React components.
- Keep side panel flows split into small components by use case:
  - onboarding,
  - page detection,
  - answer preview,
  - settings.

### 3.7 Content Script Rules

- Content scripts may extract and fill, but should not own business decisions.
- Content scripts must consume normalized answer plans, not build them.
- Use adapter-specific selector files instead of inline selector strings scattered across logic.

### 3.8 Testing Rules

- New domain logic should have `Vitest` coverage.
- New site adapters should include fixture-based tests.
- End-to-end flows should be verified with `Playwright` against stable test pages.
- Fix regressions by adding tests, not only by patching implementation.

## 4. Anti-Patterns

Avoid these patterns:

- `src/utils.ts` becoming a giant kitchen-sink file,
- one `store.ts` holding all app state,
- UI components calling database code directly,
- UI components calling LLM providers directly,
- content scripts making persistence decisions,
- one adapter reused for multiple unrelated sites,
- business logic hidden in anonymous inline functions.

## 5. Minimal Recommended Project Structure

```text
src/
  app/
    popup/
    sidepanel/
    options/
  background/
  content/
  adapters/
    sites/
  domain/
    profile/
    assessment/
    automation/
  llm/
    providers/
    prompts/
    parsers/
  storage/
    repos/
  shared/
    types/
    schemas/
    utils/
```

## 6. Default Engineering Conventions

- Language: `TypeScript` only
- TS config: `strict: true`
- Imports: use stable path aliases if introduced, otherwise keep imports explicit
- File naming: use descriptive names, not generic names like `misc.ts`, `common.ts`, `helper.ts`
- Function size: if a function starts owning extraction, transformation, storage, and UI formatting together, split it
- Component size: split large components once they own multiple screens or multiple async workflows

## 7. Sources For This Recommendation

Official documentation used to guide this stack choice:

- WXT: https://wxt.dev/guide/introduction
- WXT browser APIs: https://wxt.dev/guide/essentials/extension-apis
- Plasmo overview, used as comparison context: https://docs.plasmo.com/
- React: https://react.dev/
- Zod: https://zod.dev/
- Dexie: https://dexie.org/docs/Dexie/Dexie
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/docs/next/intro

