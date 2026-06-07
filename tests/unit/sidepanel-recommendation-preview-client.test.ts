import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { createActiveTabClient } from "../../src/app/sidepanel/services/active-tab-client";
import { createRecommendationPreviewClient } from "../../src/app/sidepanel/services/recommendation-preview-client";
import { createAttiDatabase } from "../../src/storage/db";
import { AnswerPlanRepository } from "../../src/storage/repos/answer-plan-repo";
import { QuestionRepository } from "../../src/storage/repos/question-repo";
import { SessionRepository } from "../../src/storage/repos/session-repo";
import type {
  AnswerPlanReviewSaveMessage,
  AppResult,
  RecommendationPreviewFetchMessage,
  SessionLatestFetchMessage
} from "../../src/shared/types";

type SupportedPreviewMessage =
  | SessionLatestFetchMessage
  | RecommendationPreviewFetchMessage
  | AnswerPlanReviewSaveMessage;

describe("sidepanel recommendation preview client", () => {
  it("fetches the latest preview and saves confirmed, rejected, and modified reviews", async () => {
    const database = createAttiDatabase("sidepanel-recommendation-preview-client");
    const sessionRepository = new SessionRepository(database);
    const questionRepository = new QuestionRepository(database);
    const answerPlanRepository = new AnswerPlanRepository(database);
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
      text: "I strive for perfection.",
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
      confidence: 0.9,
      rationale: "High agreement fits the profile evidence.",
      requiresConfirmation: true,
      providerId: "provider-1",
      promptVersion: "prompt-v1"
    });
    const sendMessage = async (message: SupportedPreviewMessage): Promise<AppResult> => {
      if (message.type === "sessionLatestFetch") {
        return { ok: true, data: session };
      }

      if (message.type === "recommendationPreviewFetch") {
        const previewAnswerPlan = await answerPlanRepository.getAnswerPlanById(answerPlan.id);

        return {
          ok: true,
          data: {
            sessionId: session.id,
            siteId: session.siteId,
            sessionStatus: session.status,
            items: previewAnswerPlan
              ? [
                  {
                    answerPlanId: previewAnswerPlan.id,
                    questionId: question.id,
                    questionText: question.text,
                    questionType: question.type,
                    questionOrder: question.order,
                    hasRecommendation: true,
                    options: question.options,
                    recommendedOptionIds: previewAnswerPlan.recommendedOptionIds,
                    selectedOptionIds: previewAnswerPlan.selectedOptionIds,
                    confidence: previewAnswerPlan.confidence,
                    rationale: previewAnswerPlan.rationale,
                    requiresConfirmation: previewAnswerPlan.requiresConfirmation,
                    reviewStatus: previewAnswerPlan.reviewStatus,
                    qualityStatus: previewAnswerPlan.qualityStatus,
                    qualityIssues: previewAnswerPlan.qualityIssues
                  }
                ]
              : []
          }
        };
      }

      const updatedAnswerPlan = await answerPlanRepository.updateReview(message.payload);

      return {
        ok: true,
        data: {
          answerPlanId: updatedAnswerPlan.id,
          questionId: question.id,
          questionText: question.text,
          questionType: question.type,
          questionOrder: question.order,
          hasRecommendation: true,
          options: question.options,
          recommendedOptionIds: updatedAnswerPlan.recommendedOptionIds,
          selectedOptionIds: updatedAnswerPlan.selectedOptionIds,
          confidence: updatedAnswerPlan.confidence,
          rationale: updatedAnswerPlan.rationale,
          requiresConfirmation: updatedAnswerPlan.requiresConfirmation,
          reviewStatus: updatedAnswerPlan.reviewStatus,
          qualityStatus: updatedAnswerPlan.qualityStatus,
          qualityIssues: updatedAnswerPlan.qualityIssues
        }
      };
    };
    const client = createRecommendationPreviewClient(sendMessage, {
      async fetchActiveTabUrl() {
        return "https://www.truity.com/test/enneagram-personality-test";
      }
    });

    const latestPreview = await client.fetchLatestPreview();
    const confirmed = await client.saveReview({
      answerPlanId: answerPlan.id,
      reviewStatus: "confirmed",
      selectedOptionIds: ["5"]
    });
    const rejected = await client.saveReview({
      answerPlanId: answerPlan.id,
      reviewStatus: "rejected",
      selectedOptionIds: []
    });
    const modified = await client.saveReview({
      answerPlanId: answerPlan.id,
      reviewStatus: "modified",
      selectedOptionIds: ["1"]
    });

    expect(latestPreview?.preview.items).toHaveLength(1);
    expect(confirmed.reviewStatus).toBe("confirmed");
    expect(rejected.selectedOptionIds).toEqual([]);
    expect(modified.reviewStatus).toBe("modified");
    expect(modified.selectedOptionIds).toEqual(["1"]);

    database.close();
  });

  it("returns no active preview when the current tab is not the session page", async () => {
    const session = {
      id: "session-1",
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      status: "questions-extracted",
      profileId: "profile-1",
      questionIds: [],
      answerPlanIds: [],
      executionLog: [],
      startedAt: "2025-01-01T00:00:00.000Z"
    };
    const sendMessage = async (message: SupportedPreviewMessage): Promise<AppResult> => {
      if (message.type === "sessionLatestFetch") {
        return { ok: true, data: session };
      }

      throw new Error("recommendationPreviewFetch should not run when active tab mismatches");
    };
    const client = createRecommendationPreviewClient(sendMessage, {
      async fetchActiveTabUrl() {
        return "https://example.com/not-supported";
      }
    });

    await expect(client.fetchLatestPreview()).resolves.toBeNull();
  });
});

describe("active tab client", () => {
  it("reads the current active tab url through chrome.tabs.query", async () => {
    const client = createActiveTabClient({
      query() {
        return [
          {
            active: true,
            url: "https://www.truity.com/test/enneagram-personality-test"
          }
        ];
      }
    });

    await expect(client.fetchActiveTabUrl()).resolves.toBe(
      "https://www.truity.com/test/enneagram-personality-test"
    );
  });

  it("falls back to the most relevant web tab when the active tab is the extension page", async () => {
    const client = createActiveTabClient({
      query() {
        return [
          {
            active: true,
            url: "chrome-extension://example/sidepanel.html"
          },
          {
            active: false,
            url: "https://www.truity.com/test/enneagram-personality-test"
          }
        ];
      }
    });

    await expect(client.fetchActiveTabUrl()).resolves.toBe(
      "https://www.truity.com/test/enneagram-personality-test"
    );
  });
});
