# Implementation Plan

## 1. Purpose

This document is a detailed, foundation-first implementation plan for AI developers working on `ATTI`.

It intentionally focuses on the basics first:

- project skeleton,
- module boundaries,
- shared contracts,
- persistence,
- message flow,
- test harness,
- minimal UI shells.

It does **not** attempt to deliver full product functionality yet. Full assessment automation, provider integration, and complete end-to-end behavior should only be added after this foundation is stable.

## 2. Mandatory Preconditions

Before starting any step, the AI developer must fully read:

- [memory-bank/@architecture.md](e:\ATTI\ATTI\memory-bank\@architecture.md)
- [memory-bank/@game-design-document.md](e:\ATTI\ATTI\memory-bank\@game-design-document.md)
- [software-design-document.md](e:\ATTI\ATTI\software-design-document.md)
- [tech-stack.md](e:\ATTI\ATTI\tech-stack.md)

Before starting any implementation task, confirm these constraints:

- modular, multi-file structure only,
- no monolithic giant files,
- no direct database access outside repositories,
- no site-specific logic outside adapters,
- no provider-specific logic outside provider modules,
- every step must be verified before moving on.

## 3. Scope Of This Plan

This plan covers only the foundational implementation stage.

Included:

- repository structure,
- extension framework setup,
- TypeScript strictness,
- shared types and schemas,
- local database shell,
- repository layer,
- message protocol shell,
- background shell,
- UI shell,
- content script shell,
- adapter registry shell,
- provider interface shell,
- automated tests for the above.

Not included yet:

- real personality profile generation,
- real LLM calls,
- real question extraction,
- real answer filling,
- real supported site behavior,
- production release workflow.

## 4. Execution Rules

- Complete steps in order.
- Do not merge multiple steps into one large implementation.
- Keep every step small and reversible.
- After each major milestone, update [memory-bank/@architecture.md](e:\ATTI\ATTI\memory-bank\@architecture.md).
- If a step changes data shape, message contracts, or module ownership, update the memory bank before continuing.
- If a test fails, fix the current step before starting the next one.

## 5. Step-By-Step Plan

### Step 1. Create the baseline project structure

Instruction:

- Create the base directory layout defined in the architecture documents.
- Add empty, clearly named folders for `app`, `background`, `content`, `adapters`, `domain`, `llm`, `storage`, `shared`, and `tests`.
- Add placeholder readme files inside key directories if needed so the structure is explicit from day one.
- Do not implement business logic in this step.

Verification test:

- Confirm the root structure matches the intended modular layout.
- Confirm no single top-level source file attempts to own multiple runtimes.
- Perform a manual file tree review and verify each directory has a single clear purpose.

### Step 2. Initialize the extension framework and package baseline

Instruction:

- Set up the project using the chosen extension framework and package manager from `tech-stack.md`.
- Configure the project so it can build an Edge-compatible extension skeleton.
- Keep the runtime entrypoints separated by function.
- Do not add feature logic yet.

Verification test:

- Confirm the project installs cleanly.
- Confirm the project can produce a development build without feature code.
- Confirm the generated extension shell loads in the browser without runtime crashes.

### Step 3. Enforce TypeScript and project quality defaults

Instruction:

- Enable strict TypeScript settings.
- Add formatting, linting, and test script conventions appropriate to the selected stack.
- Ensure pathing and file naming follow the modular conventions in `tech-stack.md`.
- Do not create generic catch-all helper files.

Verification test:

- Run type checking and confirm zero baseline type errors.
- Run linting and confirm zero baseline lint errors.
- Review the configuration and confirm strict mode is enabled.

### Step 4. Add the minimal extension runtime shells

Instruction:

- Create separate entry shells for popup, side panel, options page, background, and content script.
- Each shell should only confirm that its runtime is wired correctly.
- Avoid feature logic and avoid cross-runtime business behavior.

Verification test:

- Confirm popup renders.
- Confirm side panel renders.
- Confirm options page renders.
- Confirm background starts without errors.
- Confirm content script attaches on a test page without breaking the page.

### Step 5. Define shared domain types

Instruction:

- Add shared type definitions for settings, profile, session, question, answer plan, and adapter diagnostic records.
- Mirror the canonical fields already defined in `memory-bank/@architecture.md`.
- Separate shared types from runtime-specific logic.

Verification test:

- Run type checking and confirm all shared types compile.
- Perform a manual comparison against `memory-bank/@architecture.md` and verify field parity.
- Confirm the shared type directory contains only domain contracts, not business logic.

### Step 6. Define shared validation schemas

Instruction:

- Create validation schemas for the shared entities and message payloads.
- Keep schemas in dedicated schema modules, separated from UI or storage code.
- Focus only on shape validation, not feature workflows.

Verification test:

- Add unit tests that verify valid example payloads are accepted.
- Add unit tests that verify malformed payloads are rejected.
- Confirm no runtime boundary accepts unvalidated external input.

### Step 7. Create the local database shell

Instruction:

- Implement the browser database setup using the recommended local database abstraction.
- Define all stores and indexes listed in `memory-bank/@architecture.md`.
- Keep the database definition in its own module.
- Do not perform feature-specific queries yet.

Verification test:

- Add a test that confirms the database opens successfully.
- Add a test that confirms all expected stores exist.
- Add a test that confirms schema versioning is visible and stable.

### Step 8. Implement repository boundaries

Instruction:

- Create one repository module per store:
  - settings,
  - profiles,
  - sessions,
  - questions,
  - answer plans,
  - adapter diagnostics.
- Keep each repository small and focused.
- Do not allow arbitrary cross-entity logic inside repositories.

Verification test:

- Add unit tests for create, read, and update behavior per repository.
- Verify that repository tests operate through repository interfaces only.
- Confirm no other module directly touches raw database APIs.

### Step 9. Create the settings flow foundation

Instruction:

- Build the simplest settings persistence path for lightweight extension settings.
- Keep this separate from the IndexedDB data layer.
- Wire settings access through a dedicated settings repository or settings service.

Verification test:

- Add tests confirming settings can be saved and loaded.
- Confirm lightweight settings do not leak into the main database stores.
- Confirm defaults are returned when settings do not exist yet.

### Step 10. Define the extension message protocol

Instruction:

- Create a shared message contract for communication between UI, background, and content script.
- Include only the minimal message types needed for foundation work.
- Pair each message shape with validation.
- Do not implement full workflow orchestration yet.

Verification test:

- Add unit tests for message payload validation.
- Confirm invalid message payloads fail predictably.
- Confirm message type names are centralized rather than scattered.

### Step 11. Build the background message router shell

Instruction:

- Implement a background-side message router that can receive validated messages and return structured results.
- Support only basic ping, settings, and placeholder session-related requests at this stage.
- Keep routing separate from business handlers.

Verification test:

- Add integration tests for message dispatch to the correct handler.
- Add tests for unsupported message handling.
- Confirm failed validation returns structured errors instead of crashes.

### Step 12. Add background service modules with no feature logic

Instruction:

- Create placeholders for session manager, permission guard, and orchestrator.
- The goal is to establish module boundaries now, not to complete workflows.
- Keep each module with a narrow public responsibility.

Verification test:

- Confirm each module can be imported independently.
- Confirm the background runtime starts with these modules present.
- Review file boundaries and verify no single module mixes routing, storage, provider logic, and page automation.

### Step 13. Build the UI state foundation

Instruction:

- Create small UI state containers for popup, side panel, and settings flows.
- Use state only for view-level interaction state.
- Do not mirror the database into UI state.
- Keep stores feature-specific and small.

Verification test:

- Add unit tests for each store's default state and state transitions.
- Confirm no store directly performs persistence.
- Confirm there is no single global mega-store.

### Step 14. Build the popup shell

Instruction:

- Create a minimal popup that displays extension status and a link or control to open the side panel.
- Do not add profile editing or site automation here.
- Keep popup responsibility intentionally narrow.

Verification test:

- Confirm popup renders reliably.
- Confirm popup state reflects settings state when refreshed.
- Confirm popup remains small and does not import background business logic directly.

### Step 15. Build the side panel shell

Instruction:

- Create the side panel layout with placeholder sections for:
  - profile status,
  - page detection status,
  - session status,
  - future recommendation preview.
- Use stub data or empty states only.
- Do not implement extraction or provider logic yet.

Verification test:

- Confirm side panel renders empty states without crashing.
- Confirm side panel handles loading, empty, and error placeholders.
- Confirm the side panel is split into multiple components rather than one large file.

### Step 16. Build the options page shell

Instruction:

- Create a minimal options page for debug mode, provider selection placeholder, and data management placeholders.
- Wire only basic settings persistence.
- Do not add destructive data actions yet.

Verification test:

- Confirm changing a setting persists across reloads.
- Confirm options page reads the same settings source as popup.
- Confirm the page does not directly access IndexedDB entities beyond its allowed scope.

### Step 17. Build the content script shell

Instruction:

- Create a content script that can attach safely to a page and report basic page metadata to the background.
- Keep it passive.
- Do not implement extraction, highlighting, or fill behavior yet.

Verification test:

- Confirm the content script loads on a safe test page.
- Confirm it can send a simple structured message to the background.
- Confirm it does not mutate the page.

### Step 18. Create the adapter interface and registry shell

Instruction:

- Define the adapter interface and create an adapter registry with no real site behavior yet.
- Add one placeholder adapter entry to prove the registry shape works.
- Keep selectors and site-specific details out until actual adapter work starts.

Verification test:

- Add unit tests that confirm the registry can resolve a placeholder adapter by match rules.
- Confirm the placeholder adapter does not contain hard-coded workflow logic outside its scope.
- Confirm the registry is separate from content script runtime logic.

### Step 19. Create the provider interface shell

Instruction:

- Define the provider interface for profile summarization, question interpretation, and answer planning.
- Add one fake provider used only for tests and UI placeholders.
- Do not integrate a real remote or local model yet.

Verification test:

- Add unit tests that confirm the fake provider matches the provider contract.
- Confirm provider consumers depend on the interface, not the concrete fake implementation.
- Confirm no UI runtime calls provider code directly.

### Step 20. Create a basic profile draft flow

Instruction:

- Add the smallest possible profile draft workflow:
  - capture a minimal local profile draft,
  - validate it,
  - store it in the profiles repository,
  - load it back into the side panel.
- Keep it local only.
- Do not add structured trait generation yet.

Verification test:

- Add integration tests for saving and loading a profile draft.
- Confirm invalid profile drafts are rejected before persistence.
- Confirm the saved record shape matches the architecture memory bank.

### Step 21. Create a basic session record flow

Instruction:

- Add the smallest possible session creation and retrieval flow.
- Use placeholder values only.
- Keep the purpose limited to proving session persistence and retrieval boundaries.

Verification test:

- Add integration tests for creating and loading a session.
- Confirm session records are isolated from profile records.
- Confirm session state changes are persisted correctly.

### Step 22. Add adapter diagnostics persistence

Instruction:

- Implement the ability to store adapter diagnostic records.
- Keep this generic and foundation-focused.
- Do not log raw sensitive content.

Verification test:

- Add tests confirming diagnostics can be written and queried by session.
- Confirm diagnostics stay in their own repository.
- Confirm payload shape validation is enforced.

### Step 23. Add a developer debug surface

Instruction:

- Add a basic debug view in the side panel or options page that surfaces:
  - current runtime status,
  - active settings,
  - saved profile draft presence,
  - last session summary placeholder.
- Keep it read-only.

Verification test:

- Confirm debug mode can be toggled.
- Confirm debug view only appears when expected.
- Confirm the debug surface reads from existing services rather than duplicating logic.

### Step 24. Add the baseline automated test suites

Instruction:

- Organize tests into unit, integration, and end-to-end categories.
- Ensure the current foundational modules all have appropriate coverage.
- Add at least one smoke test for extension loading and one smoke test for repository-backed persistence.

Verification test:

- Confirm unit tests pass.
- Confirm integration tests pass.
- Confirm end-to-end smoke tests pass in the chosen browser target.
- Confirm failed tests are understandable and map back to a specific module boundary.

### Step 25. Perform the first architecture checkpoint

Instruction:

- Review the current implementation against the architecture documents.
- Update `memory-bank/@architecture.md` if any schema, ownership, or runtime details changed during implementation.
- Record what is complete and what is intentionally deferred.

Verification test:

- Perform a manual audit that compares the implemented structure to the memory bank.
- Confirm the memory bank reflects the current truth of the repository.
- Confirm deferred work is explicitly listed rather than implied.

## 6. Definition Of Foundation Complete

The foundation stage is complete only when all of the following are true:

- the extension boots in development,
- popup, side panel, options page, background, and content script all exist and load,
- shared types and validation schemas exist,
- local settings and IndexedDB persistence are working,
- repositories exist for all canonical stores,
- message routing exists in basic form,
- adapter and provider interfaces exist,
- a minimal local profile draft can be saved and loaded,
- a minimal session record can be saved and loaded,
- automated tests exist and pass,
- the memory bank has been updated to reflect reality.

## 7. Explicitly Deferred Until After Foundation

Do not start these until the foundation is complete:

- real LLM integration,
- prompt design,
- structured trait generation,
- question extraction logic,
- answer plan generation,
- answer preview overlays,
- DOM filling,
- supported site selectors,
- session replay or analytics,
- release packaging and store submission.

## 8. How AI Developers Should Use This Plan

- Execute one step at a time.
- After each step, run the listed verification tests.
- Do not skip ahead because a later step looks related.
- If implementation pressure starts pulling multiple concerns into one file, stop and split the module before continuing.
- If the architecture changes, update the memory bank before proceeding.

