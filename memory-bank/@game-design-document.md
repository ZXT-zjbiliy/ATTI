# Game Design Document

## 1. Naming Note

This project is not a game. The filename is intentionally preserved as `@game-design-document.md` because the workflow requires AI agents to read this file before coding.

## 2. Product Intent

Build an Edge extension that helps users avoid repeatedly answering similar personality assessments across different websites.

The extension should:

- collect a stable user profile inside the extension,
- keep that profile local by default,
- analyze supported assessment pages,
- generate explainable answer recommendations,
- preview answers before filling them into the page.

## 3. Product Constraints

- Local-first by default
- No default auto-submit
- No CAPTCHA or anti-bot bypass
- No unsupported-site generic automation in MVP
- No giant monolithic implementation files

## 4. MVP Definition

The MVP should deliver:

- local profile onboarding,
- one supported provider,
- one stable primary site adapter path,
- question extraction,
- answer planning,
- preview before fill,
- local session history.

Current checkpoint note:

- the repository has already moved beyond the earliest one-site-only shell and now carries a small multi-test-site trial direction,
- `Truity Enneagram` remains the primary stable real-world path,
- any additional supported test website must remain adapter-scoped and must not weaken the existing runtime boundaries.

## 5. User Experience Requirements

- The user must understand when the extension is analyzing.
- The user must understand which answers are recommendations.
- `Run answer planning` must only generate recommendations and refresh the preview; page filling requires a separate explicit action from the recommendation preview area.
- The product should preserve room for recommendation review controls, but those controls must not be claimed as current UX unless they are actually exposed.
- The user must understand what data stays local and what may be sent to a provider.

## 6. AI Coding Reminder

Before implementing code, always align with:

- [software-design-document.md](../software-design-document.md)
- [tech-stack.md](../tech-stack.md)
- [memory-bank/@architecture.md](./@architecture.md)
