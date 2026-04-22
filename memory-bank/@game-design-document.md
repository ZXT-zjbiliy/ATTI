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
- one supported site adapter,
- question extraction,
- answer planning,
- preview before fill,
- local session history.

## 5. User Experience Requirements

- The user must understand when the extension is analyzing.
- The user must understand which answers are recommendations.
- For the locked single-site trial flow, the user must understand that clicking `Run answer planning` is the explicit fill trigger; the product does not add a second confirmation step before fill.
- The user must be able to edit or reject recommendations.
- The user must understand what data stays local and what may be sent to a provider.

## 6. AI Coding Reminder

Before implementing code, always align with:

- [software-design-document.md](e:\ATTI\ATTI\software-design-document.md)
- [tech-stack.md](e:\ATTI\ATTI\tech-stack.md)
- [memory-bank/@architecture.md](e:\ATTI\ATTI\memory-bank\@architecture.md)
