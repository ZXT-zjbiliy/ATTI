# Versioning

ATTI uses the `x.y.z` version format for repository and release version naming.

Current source of the repository version:

- `package.json` -> `version`

## 1. Format

Use:

- `x` = major
- `y` = minor
- `z` = patch

Example:

- `0.4.6`

## 2. Default Rule

Until ATTI reaches a broader stable release line, keep versions in the `0.y.z` range.

That means:

- the project is still pre-1.0,
- versions must still use the full three-part `x.y.z` format,
- vague labels such as `x+1` should not be used as the repository version rule.

## 3. Bump Rules

Increase `x` when:

- the project enters a new compatibility era,
- there is a deliberate breaking change to external contracts, packaging, or supported workflow expectations,
- users or contributors would need a non-backward-compatible migration.

Increase `y` when:

- adding a backward-compatible feature,
- expanding supported site scope in a committed, user-visible way,
- adding a new adapter or workflow capability without breaking existing documented contracts.

Increase `z` when:

- fixing bugs,
- tightening tests,
- improving documentation,
- refining UX copy or internal behavior without changing the intended compatibility surface.

## 4. Practical Guidance

- Keep `package.json` version in `x.y.z` form at all times.
- Use the same `x.y.z` form in release notes, milestone notes, and packaging references.
- If a document needs to refer to a future release generically, prefer:
  - `next patch release`,
  - `next minor release`,
  - `next x.y.z release`,
  instead of `x+1`.

## 5. Version Change Workflow

When the repository version changes:

- `z` change:
  - record the change clearly in the relevant docs or release notes,
  - do not require a dedicated git commit by default just for the patch-version rule itself.
- `y` change:
  - I should help create a git commit for the versioned change.
- `x` change:
  - I should help create a git commit for the versioned change.

For any `x`, `y`, or `z` version change:

- build an Edge-usable artifact for the repository,
- the default build command is `pnpm build:edge`,
- when a packaged handoff artifact is needed, `pnpm zip:edge` is the follow-up packaging command.

## 6. Current Patch Record

- `2026-04-25`: `0.4.2` -> `0.4.3`
- scope of this patch record:
  - side panel active-tab detection now falls back from the extension page to the relevant web tab,
  - built-extension e2e assertions were aligned with the current provider UI copy,
  - `Truity DISC` live-page recognition was tightened to the current title and DOM shape,
  - the generic fallback adapter was refined and is now enabled by default as an experimental last-resort path,
  - live smoke checks confirmed extraction on `Truity Enneagram`, `Truity DISC`, and `Truity TypeFinder`,
  - `16Personalities` remains adapter-scoped but still lacks stable live-site verification in this environment because Cloudflare blocks access,
  - generic unsupported-site fallback remains experimental and is still not broad live-web support.
- `2026-04-26`: `0.4.3` -> `0.4.4`
- scope of this patch record:
  - added a dedicated adapter for `SBTI / https://sbti.cc/test` instead of relying on the experimental generic fallback path,
  - the new `SBTI` adapter parses site bootstrap data, extracts normalized questions, and fills the live single-question stepping flow without auto-submitting,
  - fixture-backed unit coverage and browser-level extension coverage now include the `SBTI` trial path,
  - Chinese user-facing guides were refreshed for the `0.4` release line and now document the five explicitly supported public assessment routes,
  - the repository `0.4` release line now packages the current supported-scope build as `0.4.4`.
- `2026-04-26`: `0.4.5` -> `0.4.6`
- scope of this patch record:
  - fixed `SBTI / https://sbti.cc/test` fill execution for the single-question stepping flow by allowing adapter fill to wait for page progression instead of assuming a static one-shot DOM fill,
  - added a side-panel `再次填写` action so users can rerun answer fill on the active session without regenerating a new answer plan,
  - kept the compatible-endpoint parser hardening and batch-planning improvements from the previous patch-line work while publishing this user-visible SBTI fill fix as `0.4.6`.

## 7. Related Boundaries

This release-version rule is separate from:

- IndexedDB schema versioning,
- profile record `version` fields,
- provider prompt version fields.

Those internal version fields should stay explicit in their own domains and should not replace the repository release version rule.
