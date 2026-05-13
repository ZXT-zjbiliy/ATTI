import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { BackgroundMessageRouter } from "../../src/background/message-router";
import { createOpenAiAssessmentProvider } from "../../src/llm/providers/openai-assessment-provider";
import type { AssessmentProviderResolver, AssessmentProvider } from "../../src/llm/providers";
import type { ContentAutomationGateway } from "../../src/background/services/content-automation-gateway";
import { MESSAGE_TYPES } from "../../src/shared/types";
import { createAttiDatabase } from "../../src/storage/db";
import type { AdapterDiagnosticsRepository } from "../../src/storage/repos/adapter-diagnostics-repo";
import type { AnswerPlanRepository } from "../../src/storage/repos/answer-plan-repo";
import type { ProfileRepository } from "../../src/storage/repos/profile-repo";
import type { QuestionRepository } from "../../src/storage/repos/question-repo";
import type { SessionRepository } from "../../src/storage/repos/session-repo";
import type { SettingsRepository, SettingsStorageArea } from "../../src/storage/repos/settings-repo";

class InMemorySettingsStorageArea implements SettingsStorageArea {
  private store = new Map<string, unknown>();

  get(key: string) {
    return {
      [key]: this.store.get(key)
    };
  }

  set(items: Record<string, unknown>) {
    for (const [key, value] of Object.entries(items)) {
      this.store.set(key, value);
    }
  }
}

async function createSettingsRepository(): Promise<SettingsRepository> {
  const module = await import("../../src/storage/repos/settings-repo");

  return new module.SettingsRepository(new InMemorySettingsStorageArea());
}

async function createProfileRepository(testDbName: string): Promise<ProfileRepository> {
  const module = await import("../../src/storage/repos/profile-repo");

  return new module.ProfileRepository(createAttiDatabase(testDbName));
}

async function createQuestionRepository(testDbName: string): Promise<QuestionRepository> {
  const module = await import("../../src/storage/repos/question-repo");

  return new module.QuestionRepository(createAttiDatabase(testDbName));
}

async function createAnswerPlanRepository(testDbName: string): Promise<AnswerPlanRepository> {
  const module = await import("../../src/storage/repos/answer-plan-repo");

  return new module.AnswerPlanRepository(createAttiDatabase(testDbName));
}

async function createAdapterDiagnosticsRepository(
  testDbName: string
): Promise<AdapterDiagnosticsRepository> {
  const module = await import("../../src/storage/repos/adapter-diagnostics-repo");

  return new module.AdapterDiagnosticsRepository(createAttiDatabase(testDbName));
}

async function createSessionRepository(testDbName: string): Promise<SessionRepository> {
  const module = await import("../../src/storage/repos/session-repo");

  return new module.SessionRepository(createAttiDatabase(testDbName));
}

function createFixedProviderResolver(
  provider: AssessmentProvider
): AssessmentProviderResolver {
  return {
    resolve() {
      return provider;
    }
  };
}

function createFixedContentAutomationGateway(): ContentAutomationGateway {
  return {
    async applyAnswerFill(request) {
      return {
        filledCount: request.selections.length,
        siteId: request.siteId
      };
    }
  };
}

describe("background message router", () => {
  it("dispatches supported messages to the correct handlers", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-dispatch");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-dispatch");
    const profileRepository = await createProfileRepository("background-router-dispatch");
    const questionRepository = await createQuestionRepository("background-router-dispatch");
    const sessionRepository = await createSessionRepository("background-router-dispatch");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    await router.routeMessage({
      type: MESSAGE_TYPES.settingsUpdate,
      payload: {
        settings: {
          extensionEnabled: false,
          debugMode: true,
          activeProvider: "remote",
          openAiApiKey: "sk-test",
          approvedDomains: ["example.com"],
          lastActiveProfileId: "profile-1",
          featureFlags: {
            diagnostics: true
          }
        }
      }
    });
    const profileSaveResult = await router.routeMessage({
      type: MESSAGE_TYPES.profileDraftSave,
      payload: {
        draft: {
          narrativeSummary: "I prefer collaborative planning.",
          evidence: ["Enjoy structured teamwork"]
        }
      }
    });

    const pingResult = await router.routeMessage({
      type: MESSAGE_TYPES.ping,
      payload: {}
    });
    const contentResult = await router.routeMessage({
      type: MESSAGE_TYPES.contentMetadataReport,
      payload: {
        page: {
          url: "https://example.com/assessment",
          title: "Assessment",
          readyState: "complete",
          isTopLevel: true
        }
      }
    });
    const settingsResult = await router.routeMessage({
      type: MESSAGE_TYPES.settingsFetch,
      payload: {}
    });
    const sessionResult = await router.routeMessage({
      type: MESSAGE_TYPES.sessionFetch,
      payload: {
        sessionId: "session-1"
      }
    });

    expect(pingResult).toEqual({
      ok: true,
      data: {
        pong: true
      }
    });
    expect(profileSaveResult.ok).toBe(true);
    expect(contentResult).toEqual({
      ok: true,
      data: {
        received: true,
        pageUrl: "https://example.com/assessment"
      }
    });
    expect(settingsResult).toEqual({
      ok: true,
      data: {
        extensionEnabled: false,
        debugMode: true,
        activeProvider: "remote",
        openAiApiKey: "sk-test",
        providerApiKey: null,
        providerBaseUrl: null,
        providerModel: null,
        approvedDomains: ["example.com"],
        lastActiveProfileId: profileSaveResult.ok ? profileSaveResult.data.id : null,
        featureFlags: {
          diagnostics: true
        }
      }
    });
    expect(sessionResult).toEqual({
      ok: false,
      error: {
        code: "SESSION_NOT_FOUND",
        message: "Session not found: session-1"
      }
    });
  });

  it("returns a structured error for unsupported message types", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-unsupported");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-unsupported");
    const profileRepository = await createProfileRepository("background-router-unsupported");
    const questionRepository = await createQuestionRepository("background-router-unsupported");
    const sessionRepository = await createSessionRepository("background-router-unsupported");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: "unknownMessageType",
      payload: {
        anything: "value"
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "UNSUPPORTED_MESSAGE_TYPE",
        message: "Unsupported background message type: unknownMessageType"
      }
    });
  });

  it("returns a structured error for invalid payloads", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-invalid");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-invalid");
    const profileRepository = await createProfileRepository("background-router-invalid");
    const questionRepository = await createQuestionRepository("background-router-invalid");
    const sessionRepository = await createSessionRepository("background-router-invalid");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.sessionFetch,
      payload: {
        sessionId: ""
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_MESSAGE_PAYLOAD",
        message: "Payload validation failed for message type: sessionFetch"
      }
    });
  });

  it("rejects invalid content metadata payloads", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-content-invalid");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-content-invalid");
    const profileRepository = await createProfileRepository("background-router-content-invalid");
    const questionRepository = await createQuestionRepository("background-router-content-invalid");
    const sessionRepository = await createSessionRepository("background-router-content-invalid");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.contentMetadataReport,
      payload: {
        page: {
          url: "",
          title: "Assessment",
          readyState: "complete",
          isTopLevel: true
        }
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_MESSAGE_PAYLOAD",
        message: "Payload validation failed for message type: contentMetadataReport"
      }
    });
  });

  it("fetches a saved profile through the repository-backed route", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-profile-fetch");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-profile-fetch");
    const profileRepository = await createProfileRepository("background-router-profile-fetch");
    const questionRepository = await createQuestionRepository("background-router-profile-fetch");
    const sessionRepository = await createSessionRepository("background-router-profile-fetch");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const saveResult = await router.routeMessage({
      type: MESSAGE_TYPES.profileDraftSave,
      payload: {
        draft: {
          narrativeSummary: "I prefer reflective planning.",
          evidence: ["Take notes before committing"]
        }
      }
    });

    expect(saveResult.ok).toBe(true);

    if (!saveResult.ok) {
      throw new Error("Expected profile save result to succeed");
    }

    const fetchResult = await router.routeMessage({
      type: MESSAGE_TYPES.profileFetch,
      payload: {
        profileId: saveResult.data.id as string
      }
    });

    expect(fetchResult).toEqual({
      ok: true,
      data: {
        id: saveResult.data.id,
        version: 1,
        rawInput: {
          narrativeSummary: "I prefer reflective planning.",
          evidence: ["Take notes before committing"]
        },
        structuredTraits: {},
        narrativeSummary: "I prefer reflective planning.",
        evidence: ["Take notes before committing"],
        createdAt: saveResult.data.createdAt,
        updatedAt: saveResult.data.updatedAt
      }
    });
  });

  it("analyzes preset questionnaire answers into the active profile", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "local",
      openAiApiKey: null,
      providerApiKey: null,
      providerBaseUrl: null,
      providerModel: null,
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-profile-preset");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-profile-preset");
    const profileRepository = await createProfileRepository("background-router-profile-preset");
    const questionRepository = await createQuestionRepository("background-router-profile-preset");
    const sessionRepository = await createSessionRepository("background-router-profile-preset");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "profile-summary-provider",
        async summarizeProfile({ profile }) {
          expect(profile.rawInput.source).toBe("preset-profile-questionnaire");

          return {
            narrativeSummary: "Generated from preset answers",
            evidence: ["Prefers quiet reflection"],
            structuredTraits: {
              energy: "quiet-reflection"
            }
          };
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.profilePresetAnalyze,
      payload: {
        answers: [
          {
            questionId: "energy-source",
            selectedOptionId: "quiet-reflection"
          }
        ]
      }
    });
    const settings = await settingsRepository.getSettings();

    expect(result).toMatchObject({
      ok: true,
      data: {
        narrativeSummary: "Generated from preset answers",
        evidence: ["Prefers quiet reflection"],
        structuredTraits: {
          energy: "quiet-reflection"
        }
      }
    });
    expect(settings.lastActiveProfileId).toBe(result.ok ? result.data.id : null);
  });

  it("returns the latest session through the read-only latest session route", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-latest-session");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-latest-session");
    const profileRepository = await createProfileRepository("background-router-latest-session");
    const questionRepository = await createQuestionRepository("background-router-latest-session");
    const sessionRepository = await createSessionRepository("background-router-latest-session");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const createdSession = await sessionRepository.createSession({
      siteId: "placeholder-assessment",
      pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
      profileId: "profile-1",
      status: "placeholder-created"
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.sessionLatestFetch,
      payload: {}
    });

    expect(result).toEqual({
      ok: true,
      data: createdSession
    });
  });

  it("returns recent session history through the read-only history route", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-session-history");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-session-history");
    const profileRepository = await createProfileRepository("background-router-session-history");
    const questionRepository = await createQuestionRepository("background-router-session-history");
    const sessionRepository = await createSessionRepository("background-router-session-history");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const firstSession = await sessionRepository.createSession({
      siteId: "site-a",
      pageUrl: "https://example.com/a",
      profileId: "profile-1",
      status: "questions-extracted"
    });
    await sessionRepository.updateQuestionState({
      sessionId: firstSession.id,
      status: "questions-extracted",
      questionIds: ["question-1", "question-2"]
    });
    await sessionRepository.updatePlanningState({
      sessionId: firstSession.id,
      status: "answer-planning-complete",
      answerPlanIds: ["plan-1"],
      executionLogEntry: {
        phase: "answer-planning",
        source: "test-seed"
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    const secondSession = await sessionRepository.createSession({
      siteId: "site-b",
      pageUrl: "https://example.com/b",
      profileId: "profile-1",
      status: "placeholder-created"
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.sessionHistoryFetch,
      payload: {
        limit: 2
      }
    });

    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: secondSession.id,
          siteId: "site-b",
          status: "placeholder-created",
          pageUrl: "https://example.com/b",
          startedAt: secondSession.startedAt,
          recommendationCount: 0,
          questionCount: 0
        },
        {
          id: firstSession.id,
          siteId: "site-a",
          status: "answer-planning-complete",
          pageUrl: "https://example.com/a",
          startedAt: firstSession.startedAt,
          recommendationCount: 1,
          questionCount: 2
        }
      ]
    });
  });

  it("fetches recommendation preview data through the background router", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-preview-fetch");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-preview-fetch");
    const profileRepository = await createProfileRepository("background-router-preview-fetch");
    const questionRepository = await createQuestionRepository("background-router-preview-fetch");
    const sessionRepository = await createSessionRepository("background-router-preview-fetch");
    const session = await sessionRepository.createSession({
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      profileId: "profile-1",
      status: "answer-planning-complete"
    });
    const question = await questionRepository.createQuestion({
      sessionId: session.id,
      siteId: session.siteId,
      pageUrl: session.pageUrl,
      text: "I strive for perfection",
      type: "single-choice-rating",
      options: [
        { id: "1", text: "Inaccurate", value: "1" },
        { id: "5", text: "Accurate", value: "5" }
      ],
      order: 0
    });
    const answerPlan = await answerPlanRepository.createAnswerPlan({
      sessionId: session.id,
      questionId: question.id,
      recommendedOptionIds: ["5"],
      confidence: 0.84,
      rationale: "Recommended answer for question-1",
      requiresConfirmation: true,
      providerId: "openai-assessment-provider",
      promptVersion: "openai-v1"
    });
    const updatedSession = await sessionRepository.updatePlanningState({
      sessionId: session.id,
      status: "answer-planning-complete",
      answerPlanIds: [answerPlan.id],
      executionLogEntry: {
        phase: "answer-planning",
        source: "test-seed",
        answerPlanCount: 1
      }
    });
    void updatedSession;
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.recommendationPreviewFetch,
      payload: {
        sessionId: session.id
      }
    });

    expect(result).toEqual({
      ok: true,
      data: {
        sessionId: session.id,
        siteId: "truity-enneagram",
        sessionStatus: "answer-planning-complete",
        items: [
          {
            answerPlanId: answerPlan.id,
            questionId: question.id,
            questionText: "I strive for perfection",
            questionType: "single-choice-rating",
            questionOrder: 0,
            hasRecommendation: true,
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            recommendedOptionIds: ["5"],
            selectedOptionIds: ["5"],
            confidence: 0.84,
            rationale: "Recommended answer for question-1",
            requiresConfirmation: true,
            reviewStatus: "pending",
            qualityStatus: "normal",
            qualityIssues: []
          }
        ]
      }
    });
  });

  it("keeps extracted questions in preview before AI recommendations are available", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-preview-question-only");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-preview-question-only");
    const profileRepository =
      await createProfileRepository("background-router-preview-question-only");
    const questionRepository =
      await createQuestionRepository("background-router-preview-question-only");
    const sessionRepository =
      await createSessionRepository("background-router-preview-question-only");
    const session = await sessionRepository.createSession({
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      profileId: "profile-1",
      status: "questions-extracted"
    });
    const question = await questionRepository.createQuestion({
      sessionId: session.id,
      siteId: session.siteId,
      pageUrl: session.pageUrl,
      text: "I prefer a calm and steady approach",
      type: "single-choice-rating",
      options: [
        { id: "1", text: "Inaccurate", value: "1" },
        { id: "5", text: "Accurate", value: "5" }
      ],
      order: 0
    });
    const updatedSession = await sessionRepository.updateQuestionState({
      sessionId: session.id,
      status: "questions-extracted",
      questionIds: [question.id]
    });
    void updatedSession;
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.recommendationPreviewFetch,
      payload: {
        sessionId: session.id
      }
    });

    expect(result).toEqual({
      ok: true,
      data: {
        sessionId: session.id,
        siteId: "truity-enneagram",
        sessionStatus: "questions-extracted",
        items: [
          {
            answerPlanId: `question-only-${question.id}`,
            questionId: question.id,
            questionText: "I prefer a calm and steady approach",
            questionType: "single-choice-rating",
            questionOrder: 0,
            hasRecommendation: false,
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            recommendedOptionIds: [],
            selectedOptionIds: [],
            confidence: 0,
            rationale: "",
            requiresConfirmation: false,
            reviewStatus: "pending",
            qualityStatus: "normal",
            qualityIssues: []
          }
        ]
      }
    });
  });

  it("persists confirmed, rejected, and modified reviews through the background router", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-review-save");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-review-save");
    const profileRepository = await createProfileRepository("background-router-review-save");
    const questionRepository = await createQuestionRepository("background-router-review-save");
    const sessionRepository = await createSessionRepository("background-router-review-save");
    const session = await sessionRepository.createSession({
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      profileId: "profile-1",
      status: "answer-planning-complete"
    });
    const question = await questionRepository.createQuestion({
      sessionId: session.id,
      siteId: session.siteId,
      pageUrl: session.pageUrl,
      text: "I strive for perfection",
      type: "single-choice-rating",
      options: [
        { id: "1", text: "Inaccurate", value: "1" },
        { id: "5", text: "Accurate", value: "5" }
      ],
      order: 0
    });
    const answerPlan = await answerPlanRepository.createAnswerPlan({
      sessionId: session.id,
      questionId: question.id,
      recommendedOptionIds: ["5"],
      confidence: 0.84,
      rationale: "Recommended answer for question-1",
      requiresConfirmation: true,
      providerId: "openai-assessment-provider",
      promptVersion: "openai-v1"
    });
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const confirmedResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanReviewSave,
      payload: {
        answerPlanId: answerPlan.id,
        reviewStatus: "confirmed",
        selectedOptionIds: ["5"]
      }
    });
    const rejectedResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanReviewSave,
      payload: {
        answerPlanId: answerPlan.id,
        reviewStatus: "rejected",
        selectedOptionIds: []
      }
    });
    const modifiedResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanReviewSave,
      payload: {
        answerPlanId: answerPlan.id,
        reviewStatus: "modified",
        selectedOptionIds: ["1"]
      }
    });

    expect(confirmedResult).toMatchObject({
      ok: true,
      data: {
        answerPlanId: answerPlan.id,
        selectedOptionIds: ["5"],
        reviewStatus: "confirmed"
      }
    });
    expect(rejectedResult).toMatchObject({
      ok: true,
      data: {
        answerPlanId: answerPlan.id,
        selectedOptionIds: [],
        reviewStatus: "rejected"
      }
    });
    expect(modifiedResult).toMatchObject({
      ok: true,
      data: {
        answerPlanId: answerPlan.id,
        selectedOptionIds: ["1"],
        reviewStatus: "modified"
      }
    });

    const persistedAnswerPlan = await answerPlanRepository.getAnswerPlanById(answerPlan.id);

    expect(persistedAnswerPlan?.selectedOptionIds).toEqual(["1"]);
    expect(persistedAnswerPlan?.reviewStatus).toBe("modified");
  });

  it("fills confirmed or modified answers through the background router", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-answer-fill");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-answer-fill");
    const profileRepository = await createProfileRepository("background-router-answer-fill");
    const questionRepository = await createQuestionRepository("background-router-answer-fill");
    const sessionRepository = await createSessionRepository("background-router-answer-fill");
    const session = await sessionRepository.createSession({
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      profileId: "profile-1",
      status: "answer-planning-complete"
    });
    const question = await questionRepository.createQuestion({
      sessionId: session.id,
      siteId: session.siteId,
      pageUrl: session.pageUrl,
      text: "I strive for perfection",
      type: "single-choice-rating",
      options: [
        { id: "1", text: "Inaccurate", value: "1" },
        { id: "5", text: "Accurate", value: "5" }
      ],
      order: 0
    });
    const answerPlan = await answerPlanRepository.createAnswerPlan({
      sessionId: session.id,
      questionId: question.id,
      recommendedOptionIds: ["5"],
      confidence: 0.84,
      rationale: "Recommended answer for question-1",
      requiresConfirmation: true,
      providerId: "openai-assessment-provider",
      promptVersion: "openai-v1"
    });
    await answerPlanRepository.updateReview({
      answerPlanId: answerPlan.id,
      reviewStatus: "confirmed",
      selectedOptionIds: ["5"]
    });
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      contentAutomationGateway: createFixedContentAutomationGateway(),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.answerFillRun,
      payload: {
        sessionId: session.id
      }
    });

    expect(result).toEqual({
      ok: true,
      data: {
        sessionId: session.id,
        siteId: "truity-enneagram",
        filledCount: 1
      }
    });

    const updatedSession = await sessionRepository.getSessionById(session.id);
    expect(updatedSession?.status).toBe("answer-fill-complete");
    expect(updatedSession?.executionLog.at(-1)).toEqual({
      phase: "answer-fill",
      source: "answerFillRun",
      filledCount: 1
    });
  });

  it("persists extracted questions through the repository-backed extraction route", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-question-extraction");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-question-extraction");
    const profileRepository =
      await createProfileRepository("background-router-question-extraction");
    const questionRepository =
      await createQuestionRepository("background-router-question-extraction");
    const sessionRepository =
      await createSessionRepository("background-router-question-extraction");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 0
          }
        ]
      }
    });

    expect(result).toEqual({
      ok: true,
      data: {
        sessionId: expect.any(String) as unknown,
        siteId: "truity-enneagram",
        questionCount: 1
      }
    });

    if (!result.ok) {
      throw new Error("Expected extracted questions route to succeed");
    }

    const persistedQuestions = await questionRepository.listBySessionId(result.data.sessionId as string);

    expect(persistedQuestions).toHaveLength(1);
    expect(persistedQuestions[0]).toMatchObject({
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      text: "I strive for perfection",
      type: "single-choice-rating",
      order: 0
    });
  });

  it("writes sanitized diagnostics when extraction fails", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-question-failure");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-question-failure");
    const profileRepository =
      await createProfileRepository("background-router-question-failure");
    const questionRepository =
      await createQuestionRepository("background-router-question-failure");
    const sessionRepository =
      await createSessionRepository("background-router-question-failure");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.contentQuestionExtractionFailed,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        phase: "adapter-question-extraction",
        message:
          "Failed to locate Truity Enneagram question blocks after checking fieldset and live prompt markers.",
        payload: {
          pageReadyState: "title-present",
          htmlLength: 128,
          isTopLevelCandidate: true
        }
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "QUESTION_EXTRACTION_FAILED",
        message:
          "Failed to locate Truity Enneagram question blocks after checking fieldset and live prompt markers."
      }
    });

    const latestSession = await sessionRepository.getLatestSession();

    expect(latestSession).not.toBeNull();

    if (!latestSession) {
      throw new Error("Expected a failed extraction session to be created");
    }

    const diagnostics = await adapterDiagnosticsRepository.listBySessionId(latestSession.id);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      siteId: "truity-enneagram",
      selectorVersion: "truity-enneagram-v1",
      phase: "adapter-question-extraction",
      message:
        "Failed to locate Truity Enneagram question blocks after checking fieldset and live prompt markers.",
      payload: {
        pageReadyState: "title-present",
        htmlLength: 128,
        isTopLevelCandidate: true
      }
    });
    expect(JSON.stringify(diagnostics[0])).not.toContain("<main>");
    expect(JSON.stringify(diagnostics[0])).not.toContain("I strive for perfection");
  });

  it("writes site-scoped selector diagnostics for the 16Personalities extraction boundary", async () => {
    const settingsRepository = await createSettingsRepository();
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-16p-question-failure");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-16p-question-failure");
    const profileRepository =
      await createProfileRepository("background-router-16p-question-failure");
    const questionRepository =
      await createQuestionRepository("background-router-16p-question-failure");
    const sessionRepository =
      await createSessionRepository("background-router-16p-question-failure");
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "test-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    await router.routeMessage({
      type: MESSAGE_TYPES.contentQuestionExtractionFailed,
      payload: {
        siteId: "sixteen-personalities",
        page: {
          url: "https://www.16personalities.com/free-personality-test",
          title: "Free Personality Test | 16Personalities",
          readyState: "complete",
          isTopLevel: true
        },
        phase: "adapter-question-extraction",
        message: "Failed to locate 16Personalities question blocks within the adapter boundary.",
        payload: {
          pageReadyState: "title-present",
          htmlLength: 256,
          isTopLevelCandidate: true
        }
      }
    });

    const latestSession = await sessionRepository.getLatestSession();

    expect(latestSession).not.toBeNull();

    if (!latestSession) {
      throw new Error("Expected a 16Personalities failed extraction session to be created");
    }

    const diagnostics = await adapterDiagnosticsRepository.listBySessionId(latestSession.id);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      siteId: "sixteen-personalities",
      selectorVersion: "sixteen-personalities-v1",
      phase: "adapter-question-extraction",
      message: "Failed to locate 16Personalities question blocks within the adapter boundary."
    });
  });

  it("generates and persists answer plans from saved profile and extracted questions", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-answer-planning");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-answer-planning");
    const profileRepository =
      await createProfileRepository("background-router-answer-planning");
    const questionRepository =
      await createQuestionRepository("background-router-answer-planning");
    const sessionRepository =
      await createSessionRepository("background-router-answer-planning");
    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer collaborative planning.",
      evidence: ["Enjoy structured teamwork"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "openai-assessment-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers({ sessionId, questions }) {
          return {
            answerPlans: questions.map((question) => ({
              id: `ignored-${question.id}`,
              sessionId,
              questionId: question.id,
              recommendedOptionIds: [question.options[0]?.id ?? "missing"],
              selectedOptionIds: [question.options[0]?.id ?? "missing"],
              confidence: 0.84,
              rationale: `Recommended answer for ${question.id}`,
              requiresConfirmation: true,
              reviewStatus: "pending",
              providerId: "openai-assessment-provider",
              promptVersion: "openai-v1",
              createdAt: "2025-01-01T00:00:00.000Z"
            }))
          };
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 0
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before planning");
    }

    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "openai-assessment-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers({ sessionId, questions }) {
          return {
            answerPlans: questions.map((question) => ({
              id: `ignored-${question.id}`,
              sessionId,
              questionId: question.id,
              recommendedOptionIds: [question.options[0]?.id ?? "missing"],
              selectedOptionIds: [question.options[0]?.id ?? "missing"],
              confidence: 0.84,
              rationale: `Recommended answer for ${question.id}`,
              requiresConfirmation: true,
              reviewStatus: "pending",
              providerId: "openai-assessment-provider",
              promptVersion: "openai-v1",
              createdAt: "2025-01-01T00:00:00.000Z"
            }))
          };
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(result).toEqual({
      ok: true,
      data: {
        sessionId: extractionResult.data.sessionId,
        answerPlanCount: 1,
        providerId: "openai-assessment-provider"
      }
    });

    const persistedAnswerPlans = await answerPlanRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    expect(persistedAnswerPlans).toHaveLength(1);
    expect(persistedAnswerPlans[0]).toMatchObject({
      questionId: expect.any(String) as unknown,
      recommendedOptionIds: ["1"],
      confidence: 0.84,
      providerId: "openai-assessment-provider",
      promptVersion: "openai-v1"
    });

    const updatedSession = await sessionRepository.getSessionById(
      extractionResult.data.sessionId as string
    );
    expect(updatedSession?.status).toBe("answer-planning-complete");
    expect(updatedSession?.answerPlanIds).toHaveLength(1);
    expect(updatedSession?.executionLog.at(-1)).toEqual({
      phase: "answer-planning",
      source: "answerPlanningRun",
      providerId: "openai-assessment-provider",
      answerPlanCount: 1
    });
  });

  it("uses the real OpenAI provider contract to generate answer plans that still auto-fill the page", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "openai",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-real-openai-flow");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-real-openai-flow");
    const profileRepository = await createProfileRepository("background-router-real-openai-flow");
    const questionRepository = await createQuestionRepository("background-router-real-openai-flow");
    const sessionRepository = await createSessionRepository("background-router-real-openai-flow");
    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer reflective but helpful choices.",
      evidence: ["Prefer clear structure", "Help others consistently"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "openai",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "seed-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "2", text: "Somewhat Inaccurate", value: "2" },
              { id: "3", text: "Neutral", value: "3" }
            ],
            order: 0
          },
          {
            text: "I work hard to be helpful to others",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "4", text: "Somewhat Accurate", value: "4" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 1
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before real-provider planning");
    }

    const capturedSelections: Array<{ questionId: string; selectedOptionIds: string[] }> = [];
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: {
        resolve() {
          return createOpenAiAssessmentProvider({
            apiKey: "sk-test",
            fetchImpl: async (_input, init) => {
              const requestBody =
                typeof init?.body === "string"
                  ? (JSON.parse(init.body) as { input?: string })
                  : {};
              const input = typeof requestBody.input === "string" ? requestBody.input : "";
              const questionsLine = input
                .split("\n")
                .find((line) => line.startsWith("Questions: "));

              if (!questionsLine) {
                throw new Error("Questions payload missing from the OpenAI planning prompt.");
              }

              const questions = JSON.parse(questionsLine.slice("Questions: ".length)) as Array<{
                id: string;
              }>;

              return new Response(
                JSON.stringify({
                  output_text: JSON.stringify({
                    answerPlans: questions.map((question, index) => ({
                      questionId: question.id,
                      recommendedOptionIds: [index === 0 ? "2" : "5"],
                      confidence: index === 0 ? 0.73 : 0.84,
                      rationale:
                        index === 0
                          ? "Profile evidence suggests a measured preference for structure over rigidity."
                          : "Profile evidence suggests a strong tendency to help others consistently.",
                      requiresConfirmation: false
                    }))
                  })
                }),
                { status: 200 }
              );
            }
          });
        }
      },
      contentAutomationGateway: {
        async applyAnswerFill(request) {
          capturedSelections.push(
            ...request.selections.map((selection) => ({
              questionId: selection.questionId,
              selectedOptionIds: [...selection.selectedOptionIds]
            }))
          );

          return {
            filledCount: request.selections.length,
            siteId: request.siteId
          };
        }
      },
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const planningResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });
    const fillResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerFillRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(planningResult).toEqual({
      ok: true,
      data: {
        sessionId: extractionResult.data.sessionId,
        answerPlanCount: 2,
        providerId: "openai-assessment-provider"
      }
    });
    expect(fillResult).toEqual({
      ok: true,
      data: {
        sessionId: extractionResult.data.sessionId,
        siteId: "truity-enneagram",
        filledCount: 2
      }
    });

    const persistedAnswerPlans = await answerPlanRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    expect(persistedAnswerPlans).toHaveLength(2);
    expect(persistedAnswerPlans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recommendedOptionIds: ["2"],
          rationale: "Profile evidence suggests a measured preference for structure over rigidity.",
          providerId: "openai-assessment-provider"
        }),
        expect.objectContaining({
          recommendedOptionIds: ["5"],
          rationale: "Profile evidence suggests a strong tendency to help others consistently.",
          providerId: "openai-assessment-provider"
        })
      ])
    );
    expect(capturedSelections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selectedOptionIds: ["2"]
        }),
        expect.objectContaining({
          selectedOptionIds: ["5"]
        })
      ])
    );

    const updatedSession = await sessionRepository.getSessionById(
      extractionResult.data.sessionId as string
    );
    expect(updatedSession?.status).toBe("answer-fill-complete");
    expect(updatedSession?.answerPlanIds).toHaveLength(2);
  });

  it("rejects dirty OpenAI parser output, writes parser diagnostics, and keeps the repository clean", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "openai",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-openai-parse-failure");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-openai-parse-failure");
    const profileRepository =
      await createProfileRepository("background-router-openai-parse-failure");
    const questionRepository =
      await createQuestionRepository("background-router-openai-parse-failure");
    const sessionRepository =
      await createSessionRepository("background-router-openai-parse-failure");
    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer reflective but helpful choices.",
      evidence: ["Prefer clear structure", "Help others consistently"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "openai",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "seed-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "2", text: "Somewhat Inaccurate", value: "2" }
            ],
            order: 0
          },
          {
            text: "I work hard to be helpful to others",
            type: "single-choice-rating",
            options: [
              { id: "4", text: "Somewhat Accurate", value: "4" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 1
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before parser failure");
    }

    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: {
        resolve() {
          return createOpenAiAssessmentProvider({
            apiKey: "sk-test",
            fetchImpl: async () =>
              new Response(
                JSON.stringify({
                  output_text: JSON.stringify({
                    answerPlans: [
                      {
                        questionId: "question-1",
                        recommendedOptionIds: ["1"],
                        confidence: 0.72,
                        rationale: "Only one plan returned on purpose.",
                        requiresConfirmation: false
                      }
                    ]
                  })
                }),
                { status: 200 }
              )
          });
        }
      },
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "OPENAI_ANSWER_PLANNING_PARSE_FAILED",
        message: "OpenAI 返回的答题规划结果无法解析。"
      }
    });
    expect(
      await answerPlanRepository.listBySessionId(extractionResult.data.sessionId as string)
    ).toEqual([]);

    const diagnostics = await adapterDiagnosticsRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    expect(diagnostics.at(-1)).toMatchObject({
      phase: "answer-planning",
      message: "OpenAI 返回的答题规划结果无法解析。",
      payload: {
        providerId: "openai-assessment-provider",
        errorCode: "OPENAI_ANSWER_PLANNING_PARSE_FAILED",
        failureBoundary: "provider-parser",
        failureStage: "response-parse",
        retryable: false,
        statusCode: null
      }
    });
    expect(diagnostics.at(-1)?.payload).toMatchObject({
      cause: expect.stringContaining("returned 1 plans for 2 questions")
    });
  });

  it("rejects dirty provider output at the router-validation boundary before persistence", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-validation-failure");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-validation-failure");
    const profileRepository =
      await createProfileRepository("background-router-validation-failure");
    const questionRepository =
      await createQuestionRepository("background-router-validation-failure");
    const sessionRepository =
      await createSessionRepository("background-router-validation-failure");
    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer collaborative planning.",
      evidence: ["Enjoy structured teamwork"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "seed-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 0
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before router validation failure");
    }

    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "custom-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers({ sessionId, questions }) {
          return {
            answerPlans: questions.map((question) => ({
              id: `invalid-${question.id}`,
              sessionId,
              questionId: question.id,
              recommendedOptionIds: [question.options[0]?.id ?? "missing"],
              selectedOptionIds: [question.options[0]?.id ?? "missing"],
              confidence: 1.4,
              rationale: "Invalid confidence on purpose.",
              requiresConfirmation: false,
              reviewStatus: "pending",
              providerId: "custom-provider",
              promptVersion: "custom-v1",
              createdAt: "2026-04-22T00:00:00.000Z"
            }))
          };
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "ANSWER_PLAN_VALIDATION_FAILED",
        message: expect.stringContaining("Answer plan contract validation failed")
      }
    });
    expect(
      await answerPlanRepository.listBySessionId(extractionResult.data.sessionId as string)
    ).toEqual([]);

    const diagnostics = await adapterDiagnosticsRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    expect(diagnostics.at(-1)).toMatchObject({
      phase: "answer-planning",
      payload: {
        providerId: "custom-provider",
        errorCode: "ANSWER_PLAN_VALIDATION_FAILED",
        failureBoundary: "router-validation",
        failureStage: "answer-plan-validation",
        retryable: false,
        statusCode: null
      }
    });
    expect(diagnostics.at(-1)?.payload).toMatchObject({
      cause: expect.stringContaining("Answer plan contract validation failed")
    });
  });

  it("replaces stale answer plans when planning runs more than once for the same session", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-answer-planning-rerun");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-answer-planning-rerun");
    const profileRepository =
      await createProfileRepository("background-router-answer-planning-rerun");
    const questionRepository =
      await createQuestionRepository("background-router-answer-planning-rerun");
    const sessionRepository =
      await createSessionRepository("background-router-answer-planning-rerun");
    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer collaborative planning.",
      evidence: ["Enjoy structured teamwork"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "openai-assessment-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 0
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before planning");
    }

    let planInvocationCount = 0;
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "openai-assessment-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers({ sessionId, questions }) {
          planInvocationCount += 1;

          return {
            answerPlans: questions.map((question) => ({
              id: `ignored-${planInvocationCount}-${question.id}`,
              sessionId,
              questionId: question.id,
              recommendedOptionIds: [planInvocationCount === 1 ? "1" : "5"],
              selectedOptionIds: [planInvocationCount === 1 ? "1" : "5"],
              confidence: 0.84,
              rationale: `Recommended answer ${planInvocationCount} for ${question.id}`,
              requiresConfirmation: true,
              reviewStatus: "pending",
              providerId: "openai-assessment-provider",
              promptVersion: "openai-v1",
              createdAt: "2025-01-01T00:00:00.000Z"
            }))
          };
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const firstResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });
    const secondResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);

    const persistedAnswerPlans = await answerPlanRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    const updatedSession = await sessionRepository.getSessionById(
      extractionResult.data.sessionId as string
    );

    expect(persistedAnswerPlans).toHaveLength(1);
    expect(persistedAnswerPlans[0]).toMatchObject({
      recommendedOptionIds: ["5"],
      selectedOptionIds: ["5"],
      rationale: expect.stringContaining("Recommended answer 2")
    });
    expect(updatedSession?.answerPlanIds).toHaveLength(1);
    expect(updatedSession?.answerPlanIds[0]).toBe(persistedAnswerPlans[0]?.id);
  });

  it("falls back to the latest active profile when planning a session created before profile save", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-answer-planning-profile-fallback");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-answer-planning-profile-fallback");
    const profileRepository =
      await createProfileRepository("background-router-answer-planning-profile-fallback");
    const questionRepository =
      await createQuestionRepository("background-router-answer-planning-profile-fallback");
    const sessionRepository =
      await createSessionRepository("background-router-answer-planning-profile-fallback");
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "openai-assessment-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 0
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before planning fallback");
    }

    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer collaborative planning.",
      evidence: ["Enjoy structured teamwork"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "openai-assessment-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers({ sessionId, questions, profile }) {
          expect(profile.id).toBe(savedProfile.id);

          return {
            answerPlans: questions.map((question) => ({
              id: `ignored-${question.id}`,
              sessionId,
              questionId: question.id,
              recommendedOptionIds: [question.options[0]?.id ?? "missing"],
              selectedOptionIds: [question.options[0]?.id ?? "missing"],
              confidence: 0.84,
              rationale: `Recommended answer for ${question.id}`,
              requiresConfirmation: true,
              reviewStatus: "pending",
              providerId: "openai-assessment-provider",
              promptVersion: "openai-v1",
              createdAt: "2025-01-01T00:00:00.000Z"
            }))
          };
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(result).toEqual({
      ok: true,
      data: {
        sessionId: extractionResult.data.sessionId,
        answerPlanCount: 1,
        providerId: "openai-assessment-provider"
      }
    });

    const updatedSession = await sessionRepository.getSessionById(
      extractionResult.data.sessionId as string
    );
    expect(updatedSession?.profileId).toBe(savedProfile.id);
  });

  it("returns structured provider failures and records diagnostics", async () => {
    const settingsRepository = await createSettingsRepository();
    const savedSettings = await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    void savedSettings;
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-answer-plan-failure");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-answer-plan-failure");
    const profileRepository =
      await createProfileRepository("background-router-answer-plan-failure");
    const questionRepository =
      await createQuestionRepository("background-router-answer-plan-failure");
    const sessionRepository =
      await createSessionRepository("background-router-answer-plan-failure");
    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer collaborative planning.",
      evidence: ["Enjoy structured teamwork"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "openai-assessment-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 0
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before failed planning");
    }

    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "openai-assessment-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("Provider upstream unavailable");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const result = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "PROVIDER_PLANNING_FAILED",
        message: "Provider upstream unavailable"
      }
    });

    const updatedSession = await sessionRepository.getSessionById(
      extractionResult.data.sessionId as string
    );
    expect(updatedSession?.status).toBe("answer-planning-failed");
    expect(updatedSession?.answerPlanIds).toEqual([]);
    expect(updatedSession?.executionLog.at(-1)).toEqual({
      phase: "answer-planning",
      source: "answerPlanningRun",
      providerId: "provider-runner",
      errorCode: "PROVIDER_PLANNING_FAILED",
      failed: true
    });

    const diagnostics = await adapterDiagnosticsRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    expect(diagnostics.at(-1)).toMatchObject({
      phase: "answer-planning",
      message: "Provider upstream unavailable",
      payload: {
        providerId: "provider-runner",
        errorCode: "PROVIDER_PLANNING_FAILED",
        failureBoundary: "router",
        failureStage: "planning-orchestration",
        retryable: false,
        statusCode: null,
        cause: null
      }
    });
  });

  it("persists degraded recommendations for preview but blocks auto-fill when all plans are degraded", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-degraded-only");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-degraded-only");
    const profileRepository =
      await createProfileRepository("background-router-degraded-only");
    const questionRepository =
      await createQuestionRepository("background-router-degraded-only");
    const sessionRepository =
      await createSessionRepository("background-router-degraded-only");
    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer reflective but helpful choices.",
      evidence: ["Prefer clear structure"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "seed-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 0
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before degraded planning");
    }

    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "custom-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers({ sessionId, questions }) {
          return {
            answerPlans: questions.map((question) => ({
              id: `degraded-${question.id}`,
              sessionId,
              questionId: question.id,
              recommendedOptionIds: [question.options[0]?.id ?? "missing"],
              selectedOptionIds: [question.options[0]?.id ?? "missing"],
              confidence: 0.42,
              rationale: "Placeholder recommendation for question-1",
              requiresConfirmation: false,
              reviewStatus: "pending",
              providerId: "custom-provider",
              promptVersion: "custom-v1",
              createdAt: "2026-04-22T00:00:00.000Z"
            }))
          };
        }
      }),
      contentAutomationGateway: createFixedContentAutomationGateway(),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const planningResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });
    const fillResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerFillRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(planningResult.ok).toBe(true);
    expect(fillResult).toEqual({
      ok: false,
      error: {
        code: "NO_FILLABLE_ANSWERS",
        message: `当前会话没有可执行填写的推荐结果：${extractionResult.data.sessionId}`
      }
    });

    const persistedAnswerPlans = await answerPlanRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    expect(persistedAnswerPlans).toHaveLength(1);
    expect(persistedAnswerPlans[0]).toMatchObject({
      qualityStatus: "degraded",
      qualityIssues: expect.arrayContaining(["low-confidence", "placeholder-rationale"])
    });

    const diagnostics = await adapterDiagnosticsRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          payload: expect.objectContaining({
            failureCategory: "quality",
            qualityIssues: expect.arrayContaining(["low-confidence", "placeholder-rationale"])
          })
        }),
        expect.objectContaining({
          message: "No fillable answer plans remain after quality gating.",
          payload: expect.objectContaining({
            failureCategory: "quality"
          })
        })
      ])
    );
  });

  it("fills only normal recommendations when planning returns a mix of normal and degraded results", async () => {
    const settingsRepository = await createSettingsRepository();
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: null,
      featureFlags: {}
    });
    const adapterDiagnosticsRepository =
      await createAdapterDiagnosticsRepository("background-router-mixed-quality");
    const answerPlanRepository =
      await createAnswerPlanRepository("background-router-mixed-quality");
    const profileRepository =
      await createProfileRepository("background-router-mixed-quality");
    const questionRepository =
      await createQuestionRepository("background-router-mixed-quality");
    const sessionRepository =
      await createSessionRepository("background-router-mixed-quality");
    const savedProfile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer reflective but helpful choices.",
      evidence: ["Prefer clear structure", "Help others consistently"]
    });
    await settingsRepository.saveSettings({
      extensionEnabled: true,
      debugMode: false,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: [],
      lastActiveProfileId: savedProfile.id,
      featureFlags: {}
    });
    const extractionRouter = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "seed-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers() {
          throw new Error("not used");
        }
      }),
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });
    const extractionResult = await extractionRouter.routeMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: {
        siteId: "truity-enneagram",
        page: {
          url: "https://www.truity.com/test/enneagram-personality-test",
          title: "Enneagram Personality Test | Truity",
          readyState: "complete",
          isTopLevel: true
        },
        questions: [
          {
            text: "I strive for perfection",
            type: "single-choice-rating",
            options: [
              { id: "1", text: "Inaccurate", value: "1" },
              { id: "2", text: "Somewhat Inaccurate", value: "2" }
            ],
            order: 0
          },
          {
            text: "I work hard to be helpful to others",
            type: "single-choice-rating",
            options: [
              { id: "4", text: "Somewhat Accurate", value: "4" },
              { id: "5", text: "Accurate", value: "5" }
            ],
            order: 1
          }
        ]
      }
    });

    if (!extractionResult.ok) {
      throw new Error("Expected extraction route to succeed before mixed-quality planning");
    }

    const capturedSelections: Array<{ questionId: string; selectedOptionIds: string[] }> = [];
    const router = new BackgroundMessageRouter({
      adapterDiagnosticsRepository,
      answerPlanRepository,
      assessmentProviderResolver: createFixedProviderResolver({
        providerId: "custom-provider",
        async summarizeProfile() {
          throw new Error("not used");
        },
        async interpretQuestion() {
          throw new Error("not used");
        },
        async planAnswers({ sessionId, questions }) {
          return {
            answerPlans: questions.map((question, index) => ({
              id: `mixed-${question.id}`,
              sessionId,
              questionId: question.id,
              recommendedOptionIds: [question.options.at(-1)?.id ?? "missing"],
              selectedOptionIds: [question.options.at(-1)?.id ?? "missing"],
              confidence: index === 0 ? 0.86 : 0.41,
              rationale:
                index === 0
                  ? "Profile evidence suggests a measured preference for structure."
                  : "Placeholder recommendation for low confidence path",
              requiresConfirmation: false,
              reviewStatus: "pending",
              providerId: "custom-provider",
              promptVersion: "custom-v1",
              createdAt: "2026-04-22T00:00:00.000Z"
            }))
          };
        }
      }),
      contentAutomationGateway: {
        async applyAnswerFill(request) {
          capturedSelections.push(
            ...request.selections.map((selection) => ({
              questionId: selection.questionId,
              selectedOptionIds: [...selection.selectedOptionIds]
            }))
          );

          return {
            filledCount: request.selections.length,
            siteId: request.siteId
          };
        }
      },
      profileRepository,
      questionRepository,
      sessionRepository,
      settingsRepository
    });

    const planningResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerPlanningRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });
    const fillResult = await router.routeMessage({
      type: MESSAGE_TYPES.answerFillRun,
      payload: {
        sessionId: extractionResult.data.sessionId as string
      }
    });

    expect(planningResult.ok).toBe(true);
    expect(fillResult).toEqual({
      ok: true,
      data: {
        sessionId: extractionResult.data.sessionId,
        siteId: "truity-enneagram",
        filledCount: 1
      }
    });
    expect(capturedSelections).toHaveLength(1);

    const persistedAnswerPlans = await answerPlanRepository.listBySessionId(
      extractionResult.data.sessionId as string
    );
    expect(persistedAnswerPlans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          qualityStatus: "normal",
          qualityIssues: []
        }),
        expect.objectContaining({
          qualityStatus: "degraded",
          qualityIssues: expect.arrayContaining(["low-confidence", "placeholder-rationale"])
        })
      ])
    );
  });
});
