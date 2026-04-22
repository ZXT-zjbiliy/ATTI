# Architecture Memory Bank

## 1. Purpose

This file is the canonical implementation memory for architecture and database structure.

Every AI or developer must read this file before writing code.

This checkpoint reflects the repository reality after the first architecture audit, not just the intended target architecture.

## 2. Current Architecture Summary

- Product type: Edge extension
- Architecture style: modular browser extension with local-first persistence
- Main runtimes currently present in source:
  - UI
  - background orchestrator
  - content script
  - site adapters
  - local storage
  - LLM provider interface
- Current engineering state:
  - extension shell and storage/message foundations are implemented
  - single-site extraction, provider-backed answer planning, recommendation preview, and fill execution modules are implemented for the locked MVP path
  - the single-site MVP usability checkpoint is now passed for the locked Truity path with real-provider planning support: extract -> plan -> preview -> auto-fill is working end-to-end, with OpenAI as the primary planning path and the fake provider retained only as a local fallback

## 3. Current Repository Structure Reality

Current top-level source directories present under `src/`:

- `app`
- `background`
- `content`
- `adapters`
- `domain`
- `llm`
- `shared`
- `storage`

Current test directories present under `tests/`:

- `unit`
- `integration`
- `e2e`
- `config`

Current structure matches the runtime-first split required by `software-design-document.md` and `tech-stack.md`.

Current gaps between target structure and actual structure:

- `src/domain/profile`, `src/domain/assessment`, and `src/domain/automation` exist as placeholders only and do not yet contain implemented domain modules
- `src/llm/providers`, `src/llm/prompts`, and `src/llm/parsers` now exist and are minimally implemented, with provider-backed answer planning wired into the background message flow for the locked MVP path only
- `src/shared/types`, `src/shared/schemas`, and `src/shared/utils` now exist and are implemented, but shared domain modules under `src/domain/*` are still intentionally shallow
- Tailwind CSS is recommended in `tech-stack.md`, but a Tailwind styling baseline is not yet established in the current implementation

These are acceptable at this checkpoint because the real MVP implementation is intentionally narrow and still incomplete.

## 4. Canonical Database Structure

IndexedDB schema version: `1`

### 4.1 Settings

Storage: `chrome.storage.local`

Fields:

- `extensionEnabled: boolean`
- `debugMode: boolean`
- `activeProvider: string`
- `openAiApiKey: string | null`
- `approvedDomains: string[]`
- `lastActiveProfileId: string | null`
- `featureFlags: Record<string, boolean>`

### 4.2 Profiles Table

Storage: `IndexedDB / Dexie`

Table: `profiles`
Store definition: `id, updatedAt`

Fields:

- `id: string`
- `version: number`
- `rawInput: object`
- `structuredTraits: object`
- `narrativeSummary: string`
- `evidence: string[]`
- `createdAt: string`
- `updatedAt: string`

Indexes:

- `id`
- `updatedAt`

### 4.3 Sessions Table

Table: `sessions`
Store definition: `id, siteId, startedAt`

Fields:

- `id: string`
- `siteId: string`
- `pageUrl: string`
- `status: string`
- `profileId: string`
- `questionIds: string[]`
- `answerPlanIds: string[]`
- `executionLog: object[]`
- `startedAt: string`
- `finishedAt?: string`

Indexes:

- `id`
- `siteId`
- `startedAt`

### 4.4 Questions Table

Table: `questions`
Store definition: `id, sessionId, siteId`

Fields:

- `id: string`
- `sessionId: string`
- `siteId: string`
- `pageUrl: string`
- `section?: string`
- `text: string`
- `type: string`
- `options: { id: string; text: string; value?: string }[]`
- `order: number`
- `createdAt: string`

Indexes:

- `id`
- `sessionId`
- `siteId`

Current implementation status:

- table schema exists in Dexie
- shared type/schema exists
- repository implementation exists
- repository currently supports basic create, read, and query-by-session persistence only
- production extraction flow now writes extracted questions through the background router for the locked single-site MVP path only

### 4.5 Answer Plans Table

Table: `answerPlans`
Store definition: `id, sessionId, questionId`

Fields:

- `id: string`
- `sessionId: string`
- `questionId: string`
- `recommendedOptionIds: string[]`
- `selectedOptionIds: string[]`
- `confidence: number`
- `rationale: string`
- `requiresConfirmation: boolean`
- `reviewStatus: "pending" | "confirmed" | "rejected" | "modified"`
- `reviewedAt?: string`
- `providerId: string`
- `promptVersion: string`
- `qualityStatus: "normal" | "degraded"`
- `qualityIssues: string[]`
- `createdAt: string`

Indexes:

- `id`
- `sessionId`
- `questionId`

Current implementation status:

- table schema exists in Dexie
- shared type/schema exists
- repository implementation exists
- repository currently supports create, read, query-by-session, review update, and delete-by-session persistence
- repository now also persists recommendation-quality metadata used by preview and fill gating
- production provider-planning flow now writes generated answer plans through the background router for the locked single-site MVP path only

### 4.6 Adapter Diagnostics Table

Table: `adapterDiagnostics`
Store definition: `id, sessionId, siteId`

Fields:

- `id: string`
- `sessionId: string`
- `siteId: string`
- `selectorVersion: string`
- `phase: string`
- `message: string`
- `payload?: object`
- `createdAt: string`

Indexes:

- `id`
- `sessionId`
- `siteId`

## 5. Repository Boundaries

Currently implemented repositories:

- `settings-repo`: settings only
- `profile-repo`: profiles only
- `session-repo`: sessions only
- `question-repo`: questions only
- `answer-plan-repo`: answer plans only
- `adapter-diagnostics-repo`: adapter logs only

No direct database access outside repository modules is allowed for implemented persistence flows.

## 6. Foundational Message Payload Contracts

Current shared payload contracts established for validation:

- `ping`: empty payload
- `contentMetadataReport`: `{ page: { url: string, title: string, readyState: string, isTopLevel: boolean } }`
- `contentQuestionsExtracted`: `{ siteId: string, page: ContentPageMetadata, questions: ExtractedQuestionDraft[] }`
- `contentQuestionExtractionFailed`: `{ siteId: string, page: ContentPageMetadata, phase: string, message: string, payload?: SanitizedDiagnosticsPayload }`
- `profileDraftSave`: `{ draft: { narrativeSummary: string, evidence: string[] } }`
- `settingsFetch`: empty payload
- `settingsUpdate`: `{ settings: Settings }`
- `answerPlanningRun`: `{ sessionId: string }`
- `recommendationPreviewFetch`: `{ sessionId: string }`
- `answerPlanReviewSave`: `{ answerPlanId: string, reviewStatus: "pending" | "confirmed" | "rejected" | "modified", selectedOptionIds: string[] }`
- `sessionFetch`: `{ sessionId: string }`
- `sessionLatestFetch`: empty payload
- `sessionHistoryFetch`: `{ limit?: number }`
- `profileFetch`: `{ profileId: string }`

Current centralized message type definitions:

- `ping`
- `contentMetadataReport`
- `contentQuestionsExtracted`
- `contentQuestionExtractionFailed`
- `profileDraftSave`
- `settingsFetch`
- `settingsUpdate`
- `answerPlanningRun`
- `recommendationPreviewFetch`
- `answerPlanReviewSave`
- `sessionFetch`
- `sessionLatestFetch`
- `sessionHistoryFetch`
- `profileFetch`

Current shared result envelope:

- success: `{ ok: true, data: unknown }`
- error: `{ ok: false, error: { code: string, message: string } }`

Current background router shell support:

- supported routes: `ping`, `contentMetadataReport`, `contentQuestionsExtracted`, `contentQuestionExtractionFailed`, `profileDraftSave`, `profileFetch`, `settingsFetch`, `settingsUpdate`, `answerPlanningRun`, `recommendationPreviewFetch`, `answerPlanReviewSave`, `sessionFetch`, `sessionLatestFetch`, `sessionHistoryFetch`
- unsupported message handling: structured `UNSUPPORTED_MESSAGE_TYPE`
- invalid payload handling: structured `INVALID_MESSAGE_PAYLOAD`
- invalid envelope handling: structured `INVALID_MESSAGE`
- question extraction persistence is now supported for the locked single-site MVP path only
- provider-backed answer planning persistence is now supported for the locked single-site MVP path only
- recommendation preview fetch and answer fill execution are now supported in the current UX for the locked single-site MVP path only
- answer-plan review persistence still exists at the data/message boundary, but it is no longer exposed in the current side panel UX
- destructive data management messages are still not implemented

## 7. Runtime And Module Boundaries

Current background service module boundaries:

- `message-router`: validates and dispatches supported messages
- `session-manager`: placeholder session state boundary
- `permission-guard`: placeholder permission boundary
- `orchestrator`: placeholder coordination boundary between runtime and services

Current UI state module boundaries:

- `src/app/popup/state/popup-ui-store.ts`: popup-local view and interaction state only
- `src/app/sidepanel/state/sidepanel-ui-store.ts`: side panel-local view and interaction state only
- `src/app/options/state/settings-ui-store.ts`: settings page-local view and interaction state only
- UI stores must not persist durable data directly
- UI stores must not mirror IndexedDB entities directly
- UI stores remain split by runtime instead of one global mega-store

Current popup shell boundary:

- popup shows only extension enabled status and a side panel entry point
- popup now also includes a small read-only boundary summary covering local storage, provider calls, and no-auto-submit behavior
- popup now also reads lightweight provider-configuration readiness from shared settings state and warns when answer planning is blocked by missing provider setup
- popup reads and updates settings through shared message contracts only
- popup may open the side panel through extension APIs
- popup must not import background handlers, repositories, provider modules, or automation logic

Current side panel shell boundary:

- side panel uses a multi-component shell layout with separate status cards
- side panel currently exposes profile draft capture, page detection, session, and recommendation preview areas only
- side panel now supports repository-backed session preview fetch through background message clients
- side panel now also reads shared provider settings through message clients so the planning action can be disabled before a guaranteed provider-config failure
- side panel now renders recommendation cards as explanation-only summaries with the filled recommendation, confidence, and rationale
- side panel no longer exposes per-question confirm, reject, or modify actions in the current UX
- side panel no longer exposes a manual `Apply reviewed answers` action in the current UX
- side panel now retries preview refresh for a short window so the UI can catch sessions created shortly after the panel opens
- side panel recommendation refresh currently replaces the latest preview state for the active session instead of accumulating duplicate recommendation cards across repeated planning runs
- side panel `Run answer planning` is now the single explicit user trigger for the locked trial flow and triggers background planning followed immediately by answer fill for the active session
- side panel shell must remain free of provider calls, storage access, and DOM automation logic

Current profile draft flow boundary:

- `ProfileDraft` currently contains `narrativeSummary` and `evidence` only
- profile draft validation occurs before persistence through Zod schemas
- `profile-repo` persists draft data into canonical `profiles` table records without generating structured traits
- the active saved profile is read back through `profile-repo` and displayed in side panel
- the current flow uses `settings.lastActiveProfileId` as the pointer to the active profile

Current session record flow boundary:

- `session-repo` currently supports session creation, read, recent-history read, question-state update, planning-state update, and fill-state update
- session persistence currently validates repository inputs before writing
- session records remain isolated from profile records even when stored in the same IndexedDB database
- session records can now track `questionIds`, `answerPlanIds`, and execution-log entries for extraction, planning, and fill phases
- the current session flow now supports single-site extraction, answer-planning, preview, review, and fill orchestration for the locked MVP path

Current adapter diagnostics flow boundary:

- `adapter-diagnostics-repo` currently supports generic diagnostic write and query by session only
- diagnostics payload must be validated before persistence
- diagnostics records must remain isolated inside `adapter-diagnostics-repo`
- diagnostics payloads must contain sanitized metadata only and must not store raw sensitive page content
- Truity adapter extraction and fill failures now use more specific adapter-boundary error messages with stable prompt-key references and selector-path summaries, while still avoiding raw HTML or full page-content leakage
- answer-planning diagnostics now include structured failure metadata for `providerId`, `errorCode`, `failureBoundary`, `failureStage`, `retryable`, `statusCode`, and a truncated `cause` when available
- answer-planning and answer-fill diagnostics may now also classify recommendation-quality degradation through `failureCategory: "quality"` and `qualityIssues`

Current options page shell boundary:

- options page currently handles lightweight settings only
- options page exposes debug mode, provider selection, OpenAI API key entry, and data management placeholder regions
- options page now also renders lightweight provider-readiness feedback based on locally saved settings, including whether an OpenAI API key is currently saved on-device
- options page now also exposes a small read-only local/provider boundary section for MVP scope and privacy expectations
- options page must read and write settings through the shared settings message contract
- options page must not directly access IndexedDB entities or expose destructive data actions

Current debug view boundary:

- debug view currently lives in the options page only
- debug view is read-only and appears only when `settings.debugMode === true`
- debug view reuses existing settings/profile/session services instead of duplicating business logic
- debug view currently shows runtime state, active settings, profile draft existence, last session summary, and a small recent-session history list only

Current content script shell boundary:

- content script currently performs safe startup plus single-site question extraction for the locked Truity MVP path only
- content script collects basic page metadata and reports it to background
- content script routes supported-page extraction through the adapter boundary instead of embedding site logic in runtime code
- content script reports extracted normalized questions to background through shared message contracts
- content script reports sanitized extraction failures to background diagnostics without sending raw page HTML
- content script explicitly verifies that startup does not mutate page DOM
- content script must not call providers, plan answers, fill answers, or modify page DOM
- content runtime must remain safe to inject into arbitrary pages

Current adapter shell boundary:

- adapters implement a shared `SiteAdapter` interface
- adapter matching is resolved through a dedicated registry
- site-specific behavior must remain inside `src/adapters/sites/*`
- the current Truity Enneagram adapter is the first real-site adapter boundary and currently supports URL matching, assessment-page recognition, normalized question extraction, and answer fill against both fixture-style blocks and the live radio-group markup shape
- the Truity adapter now shares a single prompt-normalization and prompt-key strategy across question-region location, extraction, and fill so light casing, whitespace, and wrapper drift can be tolerated without moving selector fallback into content or background modules
- Truity extraction and fill now each try multiple adapter-local paths for question block and radio-group resolution, but this remains a single-site implementation and is not a generic cross-site selector framework
- the placeholder adapter remains as a non-production boundary example
- the current real-site adapter still does not perform provider planning, preview, or orchestration directly; those remain background responsibilities
- adapter registry remains decoupled from content runtime startup logic

Current provider shell boundary:

- providers implement a shared `AssessmentProvider` interface
- the provider contract currently covers profile summarization, question interpretation, and answer planning
- the current `fakeAssessmentProvider` remains available for placeholder and contract testing
- the current `openaiAssessmentProvider` is the first real provider integration and uses the OpenAI Responses API behind the shared provider interface
- provider selection now normalizes legacy alias values to the current canonical MVP labels (`openai`, `local`) before resolving the runtime provider
- background planning resolves the active provider through a dedicated `assessmentProviderResolver` boundary instead of importing a concrete provider directly into UI or storage modules
- provider prompt construction currently lives inside `src/llm/prompts/*`
- provider response parsing currently lives inside `src/llm/parsers/*`
- the OpenAI answer-planning parser now validates that provider output returns exactly one plan per extracted question and only references option ids that exist on that question
- background orchestration now performs a second answer-plan validation pass before persistence so dirty output from any provider cannot silently enter repositories
- provider inputs are validated through existing shared schemas before outbound calls
- provider failures are wrapped in structured `ProviderExecutionError` objects instead of raw crashes
- missing OpenAI API keys and rejected OpenAI credentials now surface through clearer actionable provider errors so UI/runtime flows can guide the user back to Options without exposing raw secrets
- provider consumers must depend on the provider interface instead of the fake implementation
- UI runtimes must not directly invoke provider modules

## 8. Automated Testing Baseline

Current automated testing baseline:

- unit tests live under `tests/unit` and run through dedicated Vitest scope config
- integration tests live under `tests/integration` and run through dedicated Vitest scope config
- end-to-end smoke tests live under `tests/e2e` and run through Playwright against the built Edge extension
- repository persistence smoke coverage verifies cross-repository persistence using the real Dexie schema
- extension load smoke coverage verifies that Edge can load the built extension and render the popup shell
- a dedicated single-site e2e spec now exists for the locked Truity MVP path and targets extract -> plan -> preview -> auto-fill through the built extension

Current testing limits at this checkpoint:

- built-extension e2e currently has stable coverage for the locked single-site fixture flow and the mocked OpenAI-backed service-worker flow
- live-site verification has been exercised through local Playwright smoke checks, but no committed always-on live-network e2e spec exists yet
- real provider verification now exists at provider-contract and background-router level with mocked OpenAI Responses payloads
- built-extension browser e2e now also covers mocked OpenAI-backed planning inside the extension service worker, including side-panel rationale rendering, auto-fill, and provider-failure visibility
- built-extension browser e2e now also covers degraded recommendation rendering and quality-gated fill blocking inside the mocked OpenAI service-worker harness
- the committed e2e suite is green again after aligning the options-page provider-save assertions with the current provider-readiness copy and saved-key feedback
- always-on live-network OpenAI verification still remains explicitly deferred; the committed browser harness uses service-worker-level mocked OpenAI responses instead of real network calls

## 8.1 Single-Site Recommendation Quality Checkpoint

Checkpoint date: `2026-04-22`

Quality-usable at this checkpoint:

- recommendation generation is no longer placeholder-only at the product boundary; the default provider path is now `openai`, with `local` retained only as a dev fallback
- real provider output is validated through provider-contract and background-router coverage, including count matching, option-id matching, and structured parser/validation failure handling
- provider failures and dirty outputs are explicitly rejected with structured diagnostics instead of being silently persisted
- side panel recommendation cards remain stable as explanation-only summaries that show the filled recommendation, confidence, and rationale for repository-backed answer plans
- `Run answer planning` still triggers automatic fill for the locked Truity MVP path, and the product still does not auto-submit the page
- the locked single-site trial strategy now explicitly accepts this user-triggered auto-fill behavior as the intended MVP policy rather than a temporary undocumented divergence
- degraded recommendations are now still persisted and shown in preview, but they are excluded from automatic fill when quality gating marks them as unsafe

Flow-usable but not yet quality-certified at this checkpoint:

- live-network provider quality beyond mocked service-worker OpenAI responses is still not continuously verified in CI-style coverage

## 8.2 Single-Site Trial Release Checkpoint

Checkpoint date: `2026-04-22`

Current status: `passed for small-range trial release`

Passed for a small real-user trial at this checkpoint:

- single-site scope remains explicitly locked to the Truity Enneagram assessment path only
- provider calling, local settings persistence, IndexedDB ownership, and no-auto-submit behavior remain clearly separated by runtime boundary
- the current product still forms a real locked-path loop of extract -> plan -> preview -> auto-fill -> structured error handling
- the current repository now explicitly accepts `Run answer planning` as the only required user confirmation step for the locked single-site trial flow, instead of requiring a second pre-fill confirmation UI
- provider configuration is now blocked early in popup/options/sidepanel when OpenAI is selected without a saved key, reducing guaranteed-failure trial states
- Truity adapter resilience and sanitized adapter diagnostics are strong enough for light DOM drift within the locked site family
- the automated unit and built-extension e2e release gate now passes again, and the previous gate failure was caused by stale test assertions rather than a broken product loop
- deferred items remain explicitly documented instead of being silently treated as complete

Still deferred before broader formal rollout:

- always-on live-network verification for the OpenAI path remains explicitly deferred, so broader rollout confidence is still lower than the small-trial bar

Checkpoint conclusion:

- current implementation now meets the repository's small-range trial-release bar: the locked single-site scope is explicit, provider and local-data boundaries remain clear, the no-auto-submit rule is still enforced, the extract -> plan -> preview -> fill -> error-handling loop is covered by the current automated gate, and the accepted pre-fill strategy is documented consistently across implementation and companion docs
- this checkpoint does not certify broader formal rollout readiness; always-on live-network OpenAI verification and the other deferred items below remain explicitly open

## 9. First Architecture Checkpoint Audit

### 9.1 Confirmed Completed Foundational Capabilities

- repository is split by runtime and concern instead of using monolithic files
- WXT + pnpm + TypeScript project baseline is established
- popup, sidepanel, options, background, and content entrypoints exist
- shared types and Zod schemas exist for settings, profiles, sessions, questions, answer plans, diagnostics, and messages
- Dexie database shell and schema versioning baseline exist
- settings persistence through `chrome.storage.local` exists
- profile draft persistence through IndexedDB exists
- minimal session persistence through IndexedDB exists
- normalized question persistence through IndexedDB exists at repository-boundary level
- answer plan persistence through IndexedDB exists at repository-boundary level
- adapter diagnostics persistence through IndexedDB exists
- centralized background message routing exists for the currently supported message set
- UI-specific Zustand stores exist and remain split by runtime
- fake provider, real OpenAI provider, provider resolver, and adapter interfaces exist behind explicit boundaries
- unit, integration, and e2e smoke testing structure exists and runs

### 9.2 Explicitly Deferred Capabilities

- richer recommendation review controls beyond the current single-action locked trial flow
- automatic submit prevention logic beyond current product rule documentation
- richer domain modules under `src/domain/profile`, `src/domain/assessment`, and `src/domain/automation`
- destructive data-management actions in options
- cloud sync, unsupported-site generic automation, and multi-profile collaboration
- Tailwind CSS baseline adoption
- background orchestration beyond the current single-site extraction and answer-planning flow
- committed always-on live-network e2e coverage for the Truity MVP path

### 9.3 Audit Conclusion

- current repository structure is consistent with the modular architecture direction
- current implemented data structures and message boundaries match the actual source code
- some target architecture slices are still only scaffolded or predeclared and must not be treated as implemented
- delayed items are now explicit and must remain explicit until implemented
- the repository now contains real extraction, planning, preview, review, and fill code paths for the locked Truity MVP flow
- the current audit certifies the single-site MVP as usable because the built extension and live-site smoke path complete extract -> plan -> preview -> auto-fill, and the real OpenAI provider path is now covered by parser/provider/router-level automated verification
- the repository now explicitly documents the locked trial policy that `Run answer planning` is the only required user-triggered confirmation before fill, while auto-submit remains disallowed
- however, the repository is not yet at a clean pre-release checkpoint because always-on live-network OpenAI verification is still deferred

## 10. Single-Site MVP Scope Lock

Scope lock date: `2026-04-22`

### 10.1 Selected Real MVP Target

The MVP will support exactly one real assessment site:

- Site: `Truity`
- Assessment: `Enneagram Personality Test`
- Canonical target URL family for MVP: `https://www.truity.com/test/enneagram-personality-test`

No second real site is in MVP scope.

### 10.2 Why This Site Was Selected

This site is currently the preferred MVP target because:

- it is a real public personality assessment page instead of a synthetic fixture
- the assessment presents a repeated, normalized questionnaire pattern that fits the current architecture well
- the question form appears to use a consistent single-question prompt plus fixed rating-scale answer structure across steps
- the site is close to the current product intent of reusing a stable personality profile to reduce repetitive answering

### 10.3 MVP Supported Page Scope

The MVP supports only the following page scope:

- the public Truity Enneagram assessment flow under the canonical test route above
- the question-taking pages within that assessment flow
- extraction and fill behavior only for the assessment question UI itself

The MVP does not support:

- other Truity tests
- Truity result pages
- Truity account-management pages
- Truity workplace assessment pages
- any non-Truity site
- any future route variants that materially change the assessment DOM structure before explicit adapter updates

### 10.4 MVP Supported Question Scope

The MVP question scope is intentionally narrow:

- normalized statement-style personality questions
- one prompt per question row or question block
- fixed single-choice rating answers represented as a shared ordinal scale
- repeated question blocks with the same answer model across the assessment

The MVP does not support:

- free-text answers
- multi-select answers
- drag-and-drop interactions
- matrix grids with heterogeneous scales
- branching logic with multiple unrelated question widgets
- CAPTCHA, login gates, payment walls, or anti-bot interstitials

### 10.5 MVP Supported Real Capabilities

The following capabilities are allowed to move from placeholder to real implementation for this single-site MVP:

- real Truity site detection through a dedicated site adapter
- real question extraction for the Truity Enneagram assessment pages
- persistence of extracted questions through `question-repo`
- one real provider integration behind the existing provider interface
- real answer planning from saved profile plus extracted questions
- persistence of generated answer plans through `answer-plan-repo`
- side panel recommendation preview for extracted questions and planned answers, including filled option labels plus rationale
- automatic page fill immediately after the user-triggered `Run answer planning` action on the supported Truity path
- real page fill on the supported Truity assessment pages only
- session and diagnostics updates for the supported MVP flow

### 10.6 Explicitly Deferred Beyond This MVP Scope Lock

The following capabilities remain intentionally deferred even after entering the real MVP implementation phase:

- support for any second assessment site
- generic cross-site automation
- generic unsupported-site fallback extraction
- automatic page submit after fill
- real result-page interpretation
- cloud sync
- multi-profile collaboration
- broad reusable selector systems intended to cover multiple unrelated sites at once
- richer domain expansion unrelated to the single-site MVP path

### 10.7 Adapter Boundary Rule For This MVP

- all Truity-specific DOM matching, question extraction, and fill logic must remain inside a single dedicated Truity adapter module
- no other module may hard-code Truity selectors
- background, UI, repositories, and providers must continue to consume normalized data rather than site-specific DOM structures

### 10.8 Provider Boundary Rule For This MVP

- only one real provider may be integrated during the initial MVP implementation pass
- provider calls must remain behind the `AssessmentProvider` interface
- prompt construction and response parsing must remain inside `src/llm/*`
- UI runtimes must still not call the provider directly

## 11. Required Update Rule

This file must be updated after every major feature or milestone when any of the following changes:

- schema
- module ownership
- runtime boundaries
- message contracts
- supported site strategy
- provider strategy

## 12. Current Milestone

Current project state:

- documentation foundation established
- coding rules established
- baseline source and test directory skeleton established
- WXT + pnpm project baseline initialized
- minimal extension entrypoints established for popup, sidepanel, options, background, and content script
- TypeScript strict mode and engineering quality baseline established
- shared entity schemas and foundational message payload schemas established
- Dexie database shell and IndexedDB store definitions established
- lightweight settings persistence foundation established via dedicated settings repository
- centralized shared extension message contract established
- background message router shell established with separated handlers
- background service module boundaries established for session manager, permission guard, and orchestrator
- UI state foundation established with small runtime-specific Zustand stores
- popup shell established with a narrow settings toggle and side panel entry point
- side panel shell established with multi-component placeholder status regions
- options page shell established with settings-only sections and no destructive data actions
- content script shell established with passive page metadata reporting only
- content script real question extraction flow established for the locked Truity MVP path with background persistence through shared message contracts
- adapter interface and registry shell established with placeholder and single-site real adapter boundaries
- provider interface shell established with fake and real OpenAI-backed provider implementations
- prompt construction and response parser modules established inside `src/llm/*`
- minimal local profile draft flow established through repository-backed save and side panel display
- minimal session record flow established through repository-backed create/read/update behavior
- normalized question persistence now supports background writes from the single-site extraction flow
- provider-backed answer planning now supports background execution from saved profile plus extracted questions
- generated answer plans now persist through `answer-plan-repo` in the locked MVP path
- session records now capture extraction/planning execution state, question ids, and answer-plan ids
- side panel recommendation preview now renders repository-backed planned answers through background message clients
- answer plans still persist `selectedOptionIds`, `reviewStatus`, and `reviewedAt`, but the current UX no longer exposes those review actions in the side panel
- answer fill routing now exists through `answerFillRun` -> background content automation gateway -> content command -> Truity fill adapter
- Truity question extraction now tolerates browser-serialized `<input>` markup without XHTML self-closing tags
- Truity question extraction and fill now also tolerate lightweight prompt wrapper changes, prompt line splitting, case/whitespace drift, and non-fieldset radiogroup containers by reusing adapter-local prompt keys and multi-path container resolution
- answer planning now falls back to `settings.lastActiveProfileId` and rebinds the session profile when the profile is saved after extraction
- settings now also persist `openAiApiKey`, and the default provider path is now `openai`; `local` remains available as a dev fallback
- shared provider-configuration state now exposes whether the selected provider is ready, whether an OpenAI key is saved locally, and whether planning should be blocked before a guaranteed config failure
- adapter diagnostics persistence established through repository-backed write/query behavior
- shared answer-plan schemas now require at least one recommended option and constrain `confidence` to the `0..1` interval
- answer plans now also carry repository-backed recommendation quality metadata so low-confidence or placeholder-like results can be previewed without being auto-filled
- read-only debug view established in options page with service reuse
- popup and options now expose lightweight UX copy clarifying what stays local, when provider planning may run, that `Run answer planning` also triggers fill for the locked trial flow, that auto-submit is not performed, and that the current supported scope is the locked Truity MVP only
- popup, options, and side panel now also align on provider-readiness messaging so missing OpenAI configuration is surfaced before the user reaches a guaranteed failed planning attempt
- automated testing baseline established with separated unit, integration, and end-to-end scopes
- repository persistence smoke coverage established across profile, session, and adapter diagnostics repositories
- Edge extension load smoke coverage established through Playwright against the built extension artifact
- single-site e2e coverage exists for the Truity MVP fixture flow through the built extension, and the committed suite now aligns with the current provider-settings copy and readiness feedback
- local session history now has a minimal read-only path through `session-repo` -> background message contract -> options debug view
- first architecture checkpoint audit completed
- single-site MVP scope locked to the Truity Enneagram assessment flow
- question and answer-plan repository boundaries implemented with repository-level unit coverage
- first real-site adapter boundary established for the Truity Enneagram assessment with fixture-backed recognition and region-location tests
- first real provider integration established through the shared OpenAI-backed provider boundary, with OpenAI now serving as the primary single-site planning path
- provider-backed background planning flow established with session-profile fallback for late profile save
- recommendation preview explanation flow established in the side panel without direct UI provider/storage access
- repeated answer planning now replaces stale answer plans for the active session instead of duplicating recommendation cards
- Truity answer fill now supports the live radio-group markup path in addition to the original fixture-style fieldset path
- side panel answer planning now automatically fills the current page with the planned recommendations as the accepted locked-trial strategy instead of waiting for a second manual fill action
- local live-site Playwright smoke verification confirmed that repeated planning stays at 10 recommendations and the current page can still be filled successfully with planned values
- OpenAI answer-planning prompt and parser boundaries remain isolated under `src/llm/*`, with options/background only passing normalized settings and normalized result data
- automated verification now covers parser rejection for dirty provider output, router-level answer-plan validation rejection before persistence, real OpenAI provider contract execution with mocked Responses payloads, background planning plus fill orchestration with the real provider, the browser E2E auto-fill flow on the locked site using the local fallback provider, and built-extension browser coverage for mocked OpenAI-backed rationale rendering and provider-failure visibility through the extension service worker
- automated verification now also covers quality degradation classification for low-confidence and placeholder-style recommendations, plus browser-visible degraded preview behavior and quality-gated fill blocking
- single-site recommendation quality checkpoint completed: provider-backed recommendation generation, browser-side rationale rendering, and failure handling are quality-usable under the mocked service-worker OpenAI harness, while always-on live-network OpenAI verification remains explicitly deferred
- single-site MVP usability checkpoint audit completed and currently marked `passed`
- single-site MVP trial-release checkpoint audit completed and currently marked `passed for small-range trial release`; broader formal rollout is still deferred because always-on live-network OpenAI verification remains open even though the committed Playwright release gate is green and the locked trial auto-fill strategy is now explicitly documented
