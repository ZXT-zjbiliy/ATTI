# Architecture Memory Bank

## 1. Purpose

This file is the canonical implementation memory for architecture and database structure.

Every AI or developer must read this file before writing code.

## 2. Current Architecture Summary

- Product type: Edge extension
- Architecture style: modular browser extension with local-first persistence
- Main runtimes:
  - UI
  - background orchestrator
  - content script
  - site adapters
  - local storage
  - LLM provider

## 3. Canonical Database Structure

### 3.1 Settings

Storage: `chrome.storage.local`

Fields:

- `extensionEnabled: boolean`
- `debugMode: boolean`
- `activeProvider: string`
- `approvedDomains: string[]`
- `lastActiveProfileId: string | null`
- `featureFlags: Record<string, boolean>`

### 3.2 Profiles Table

Storage: `IndexedDB / Dexie`

Table: `profiles`

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

### 3.3 Sessions Table

Table: `sessions`

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

### 3.4 Questions Table

Table: `questions`

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

### 3.5 Answer Plans Table

Table: `answerPlans`

Fields:

- `id: string`
- `sessionId: string`
- `questionId: string`
- `recommendedOptionIds: string[]`
- `confidence: number`
- `rationale: string`
- `requiresConfirmation: boolean`
- `providerId: string`
- `promptVersion: string`
- `createdAt: string`

Indexes:

- `id`
- `sessionId`
- `questionId`

### 3.6 Adapter Diagnostics Table

Table: `adapterDiagnostics`

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

## 4. Repository Boundaries

- `settings-repo`: settings only
- `profile-repo`: profiles only
- `session-repo`: sessions only
- `question-repo`: questions only
- `answer-plan-repo`: answer plans only
- `adapter-diagnostics-repo`: adapter logs only

No direct database access outside repository modules.

## 5. Required Update Rule

This file must be updated after every major feature or milestone when any of the following changes:

- schema,
- module ownership,
- runtime boundaries,
- message contracts,
- supported site strategy,
- provider strategy.

## 6. Current Milestone

Current project state:

- documentation foundation established,
- coding rules established,
- implementation not yet started.

