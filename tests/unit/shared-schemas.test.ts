import { describe, expect, it } from "vitest";

import {
  adapterDiagnosticsSchema,
  answerFillRunMessageSchema,
  answerFillRunPayloadSchema,
  answerPlanSchema,
  answerPlanReviewSaveMessageSchema,
  appMessageSchema,
  appResultSchema,
  pingPayloadSchema,
  profileFetchMessageSchema,
  profileFetchPayloadSchema,
  profilePresetAnalyzeMessageSchema,
  profilePresetAnalyzePayloadSchema,
  recommendationPreviewFetchMessageSchema,
  recommendationPreviewFetchPayloadSchema,
  profileSchema,
  questionSchema,
  sessionFetchMessageSchema,
  sessionFetchPayloadSchema,
  sessionHistoryFetchMessageSchema,
  sessionHistoryFetchPayloadSchema,
  sessionSchema,
  settingsFetchMessageSchema,
  settingsFetchPayloadSchema,
  settingsUpdateMessageSchema,
  settingsSchema,
  settingsUpdatePayloadSchema
} from "../../src/shared/schemas";
import { MESSAGE_TYPES } from "../../src/shared/types";

describe("shared entity schemas", () => {
  it("accepts valid settings data", () => {
    const result = settingsSchema.safeParse({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "local",
      openAiApiKey: null,
      approvedDomains: ["example.com"],
      lastActiveProfileId: null,
      featureFlags: {
        onboarding: true
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid settings data", () => {
    const result = settingsSchema.safeParse({
      extensionEnabled: "yes",
      debugMode: false,
      activeProvider: "",
      openAiApiKey: null,
      approvedDomains: ["example.com"],
      lastActiveProfileId: null,
      featureFlags: {}
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid profile data", () => {
    const result = profileSchema.safeParse({
      id: "profile-1",
      version: 1,
      rawInput: {
        nickname: "A"
      },
      structuredTraits: {
        openness: 0.7
      },
      narrativeSummary: "Profile summary",
      evidence: ["answer-1"],
      createdAt: "2026-04-21T19:00:00Z",
      updatedAt: "2026-04-21T19:00:00Z"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid profile data", () => {
    const result = profileSchema.safeParse({
      id: "profile-1",
      version: "1",
      rawInput: [],
      structuredTraits: {},
      narrativeSummary: "",
      evidence: ["answer-1"],
      createdAt: "2026-04-21T19:00:00Z",
      updatedAt: "2026-04-21T19:00:00Z"
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid session, question, answer plan, and diagnostics data", () => {
    expect(
      sessionSchema.safeParse({
        id: "session-1",
        siteId: "site-1",
        pageUrl: "https://example.com",
        status: "draft",
        profileId: "profile-1",
        questionIds: ["question-1"],
        answerPlanIds: ["plan-1"],
        executionLog: [{ event: "created" }],
        startedAt: "2026-04-21T19:00:00Z"
      }).success
    ).toBe(true);

    expect(
      questionSchema.safeParse({
        id: "question-1",
        sessionId: "session-1",
        siteId: "site-1",
        pageUrl: "https://example.com",
        text: "Question text",
        type: "single-choice",
        options: [{ id: "a", text: "Option A" }],
        order: 0,
        createdAt: "2026-04-21T19:00:00Z"
      }).success
    ).toBe(true);

    expect(
      answerPlanSchema.safeParse({
        id: "plan-1",
        sessionId: "session-1",
        questionId: "question-1",
        recommendedOptionIds: ["a"],
        selectedOptionIds: ["a"],
        confidence: 0.8,
        rationale: "Reason",
        requiresConfirmation: true,
        reviewStatus: "pending",
        providerId: "provider-1",
        promptVersion: "v1",
        qualityStatus: "normal",
        qualityIssues: [],
        createdAt: "2026-04-21T19:00:00Z"
      }).success
    ).toBe(true);

    expect(
      adapterDiagnosticsSchema.safeParse({
        id: "diag-1",
        sessionId: "session-1",
        siteId: "site-1",
        selectorVersion: "1",
        phase: "detect",
        message: "ok",
        payload: {
          hint: "sample"
        },
        createdAt: "2026-04-21T19:00:00Z"
      }).success
    ).toBe(true);
  });

  it("rejects invalid answer-plan confidence and missing recommended options", () => {
    expect(
      answerPlanSchema.safeParse({
        id: "plan-1",
        sessionId: "session-1",
        questionId: "question-1",
        recommendedOptionIds: [],
        selectedOptionIds: ["a"],
        confidence: 1.2,
        rationale: "Reason",
        requiresConfirmation: true,
        reviewStatus: "pending",
        providerId: "provider-1",
        promptVersion: "v1",
        qualityStatus: "normal",
        qualityIssues: [],
        createdAt: "2026-04-21T19:00:00Z"
      }).success
    ).toBe(false);
  });
});

describe("shared message payload schemas", () => {
  it("accepts valid foundational payloads", () => {
    expect(pingPayloadSchema.safeParse({}).success).toBe(true);
    expect(settingsFetchPayloadSchema.safeParse({}).success).toBe(true);
    expect(sessionHistoryFetchPayloadSchema.safeParse({ limit: 5 }).success).toBe(true);
    expect(
      recommendationPreviewFetchPayloadSchema.safeParse({ sessionId: "session-1" }).success
    ).toBe(true);
    expect(answerFillRunPayloadSchema.safeParse({ sessionId: "session-1" }).success).toBe(true);
    expect(
      settingsUpdatePayloadSchema.safeParse({
        settings: {
          extensionEnabled: true,
          debugMode: false,
          activeProvider: "local",
          openAiApiKey: null,
          approvedDomains: [],
          lastActiveProfileId: null,
          featureFlags: {}
        }
      }).success
    ).toBe(true);
    expect(sessionFetchPayloadSchema.safeParse({ sessionId: "session-1" }).success).toBe(true);
    expect(profileFetchPayloadSchema.safeParse({ profileId: "profile-1" }).success).toBe(true);
    expect(
      profilePresetAnalyzePayloadSchema.safeParse({
        answers: [{ questionId: "energy-source", selectedOptionId: "quiet-reflection" }]
      }).success
    ).toBe(true);
  });

  it("rejects invalid foundational payloads", () => {
    expect(pingPayloadSchema.safeParse({ extra: true }).success).toBe(false);
    expect(settingsFetchPayloadSchema.safeParse({ extra: true }).success).toBe(false);
    expect(sessionHistoryFetchPayloadSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(
      settingsUpdatePayloadSchema.safeParse({
        settings: {
          extensionEnabled: "true"
        }
      }).success
    ).toBe(false);
    expect(sessionFetchPayloadSchema.safeParse({ sessionId: "" }).success).toBe(false);
    expect(recommendationPreviewFetchPayloadSchema.safeParse({ sessionId: "" }).success).toBe(
      false
    );
    expect(answerFillRunPayloadSchema.safeParse({ sessionId: "" }).success).toBe(false);
    expect(profileFetchPayloadSchema.safeParse({ profileId: "" }).success).toBe(false);
    expect(profilePresetAnalyzePayloadSchema.safeParse({ answers: [] }).success).toBe(false);
  });
});

describe("shared message contract schemas", () => {
  it("accepts valid full messages and result envelopes", () => {
    expect(
      appMessageSchema.safeParse({
        type: MESSAGE_TYPES.ping,
        payload: {}
      }).success
    ).toBe(true);

    expect(
      settingsFetchMessageSchema.safeParse({
        type: MESSAGE_TYPES.settingsFetch,
        payload: {}
      }).success
    ).toBe(true);

    expect(
      settingsUpdateMessageSchema.safeParse({
        type: MESSAGE_TYPES.settingsUpdate,
        payload: {
          settings: {
            extensionEnabled: true,
            debugMode: false,
            activeProvider: "local",
            openAiApiKey: null,
            approvedDomains: [],
            lastActiveProfileId: null,
            featureFlags: {}
          }
        }
      }).success
    ).toBe(true);

    expect(
      sessionFetchMessageSchema.safeParse({
        type: MESSAGE_TYPES.sessionFetch,
        payload: {
          sessionId: "session-1"
        }
      }).success
    ).toBe(true);

    expect(
      profileFetchMessageSchema.safeParse({
        type: MESSAGE_TYPES.profileFetch,
        payload: {
          profileId: "profile-1"
        }
      }).success
    ).toBe(true);

    expect(
      profilePresetAnalyzeMessageSchema.safeParse({
        type: MESSAGE_TYPES.profilePresetAnalyze,
        payload: {
          answers: [{ questionId: "energy-source", selectedOptionId: "quiet-reflection" }]
        }
      }).success
    ).toBe(true);

    expect(
      recommendationPreviewFetchMessageSchema.safeParse({
        type: MESSAGE_TYPES.recommendationPreviewFetch,
        payload: {
          sessionId: "session-1"
        }
      }).success
    ).toBe(true);

    expect(
      answerPlanReviewSaveMessageSchema.safeParse({
        type: MESSAGE_TYPES.answerPlanReviewSave,
        payload: {
          answerPlanId: "plan-1",
          reviewStatus: "confirmed",
          selectedOptionIds: ["a"]
        }
      }).success
    ).toBe(true);

    expect(
      answerFillRunMessageSchema.safeParse({
        type: MESSAGE_TYPES.answerFillRun,
        payload: {
          sessionId: "session-1"
        }
      }).success
    ).toBe(true);

    expect(
      sessionHistoryFetchMessageSchema.safeParse({
        type: MESSAGE_TYPES.sessionHistoryFetch,
        payload: {
          limit: 5
        }
      }).success
    ).toBe(true);

    expect(
      appResultSchema.safeParse({
        ok: true,
        data: {
          acknowledged: true
        }
      }).success
    ).toBe(true);

    expect(
      appResultSchema.safeParse({
        ok: false,
        error: {
          code: "INVALID_PAYLOAD",
          message: "Payload validation failed"
        }
      }).success
    ).toBe(true);
  });

  it("rejects invalid or mismatched full messages", () => {
    expect(
      appMessageSchema.safeParse({
        type: MESSAGE_TYPES.settingsFetch,
        payload: {
          sessionId: "session-1"
        }
      }).success
    ).toBe(false);

    expect(
      appMessageSchema.safeParse({
        type: "unknownType",
        payload: {}
      }).success
    ).toBe(false);

    expect(
      appResultSchema.safeParse({
        ok: false,
        error: {
          code: "",
          message: "Missing code"
        }
      }).success
    ).toBe(false);
  });
});
