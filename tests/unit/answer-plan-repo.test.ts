import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { createAttiDatabase } from "../../src/storage/db";
import { AnswerPlanRepository } from "../../src/storage/repos/answer-plan-repo";

describe("answer plan repository", () => {
  it("creates and reads a normalized answer plan record", async () => {
    const database = createAttiDatabase("answer-plan-repo-create-read");
    const repository = new AnswerPlanRepository(database);

    const createdAnswerPlan = await repository.createAnswerPlan({
      sessionId: "session-1",
      questionId: "question-1",
      recommendedOptionIds: ["4"],
      confidence: 0.82,
      rationale: "The saved profile aligns with a high-agreement recommendation.",
      requiresConfirmation: true,
      providerId: "provider-1",
      promptVersion: "prompt-v1"
    });
    const loadedAnswerPlan = await repository.getAnswerPlanById(createdAnswerPlan.id);

    expect(loadedAnswerPlan).toEqual(createdAnswerPlan);
    expect(createdAnswerPlan.recommendedOptionIds).toEqual(["4"]);
    expect(createdAnswerPlan.selectedOptionIds).toEqual(["4"]);
    expect(createdAnswerPlan.reviewStatus).toBe("pending");

    database.close();
  });

  it("lists answer plans by session", async () => {
    const database = createAttiDatabase("answer-plan-repo-list-by-session");
    const repository = new AnswerPlanRepository(database);

    const firstAnswerPlan = await repository.createAnswerPlan({
      sessionId: "session-1",
      questionId: "question-1",
      recommendedOptionIds: ["2"],
      confidence: 0.64,
      rationale: "First planned answer",
      requiresConfirmation: true,
      providerId: "provider-1",
      promptVersion: "prompt-v1"
    });
    await repository.createAnswerPlan({
      sessionId: "session-1",
      questionId: "question-2",
      recommendedOptionIds: ["5"],
      confidence: 0.91,
      rationale: "Second planned answer",
      requiresConfirmation: true,
      providerId: "provider-1",
      promptVersion: "prompt-v1"
    });

    const answerPlans = await repository.listBySessionId("session-1");

    expect(answerPlans).toHaveLength(2);
    expect(answerPlans.map((answerPlan) => answerPlan.id)).toContain(firstAnswerPlan.id);

    database.close();
  });

  it("updates persisted review state without changing the repository boundary", async () => {
    const database = createAttiDatabase("answer-plan-repo-review-update");
    const repository = new AnswerPlanRepository(database);
    const answerPlan = await repository.createAnswerPlan({
      sessionId: "session-1",
      questionId: "question-1",
      recommendedOptionIds: ["2"],
      confidence: 0.64,
      rationale: "First planned answer",
      requiresConfirmation: true,
      providerId: "provider-1",
      promptVersion: "prompt-v1"
    });

    const updatedAnswerPlan = await repository.updateReview({
      answerPlanId: answerPlan.id,
      reviewStatus: "modified",
      selectedOptionIds: ["5"]
    });

    expect(updatedAnswerPlan.selectedOptionIds).toEqual(["5"]);
    expect(updatedAnswerPlan.reviewStatus).toBe("modified");
    expect(updatedAnswerPlan.reviewedAt).toBeTruthy();

    database.close();
  });

  it("deletes stale answer plans for a session before a replanning pass", async () => {
    const database = createAttiDatabase("answer-plan-repo-delete-by-session");
    const repository = new AnswerPlanRepository(database);
    await repository.createAnswerPlan({
      sessionId: "session-1",
      questionId: "question-1",
      recommendedOptionIds: ["2"],
      confidence: 0.64,
      rationale: "First planned answer",
      requiresConfirmation: true,
      providerId: "provider-1",
      promptVersion: "prompt-v1"
    });
    await repository.createAnswerPlan({
      sessionId: "session-1",
      questionId: "question-2",
      recommendedOptionIds: ["5"],
      confidence: 0.91,
      rationale: "Second planned answer",
      requiresConfirmation: true,
      providerId: "provider-1",
      promptVersion: "prompt-v1"
    });
    await repository.createAnswerPlan({
      sessionId: "session-2",
      questionId: "question-3",
      recommendedOptionIds: ["3"],
      confidence: 0.7,
      rationale: "Other session answer",
      requiresConfirmation: true,
      providerId: "provider-1",
      promptVersion: "prompt-v1"
    });

    const deletedCount = await repository.deleteBySessionId("session-1");
    const remainingSessionOnePlans = await repository.listBySessionId("session-1");
    const remainingSessionTwoPlans = await repository.listBySessionId("session-2");

    expect(deletedCount).toBe(2);
    expect(remainingSessionOnePlans).toEqual([]);
    expect(remainingSessionTwoPlans).toHaveLength(1);

    database.close();
  });

  it("rejects invalid answer plan drafts before persistence", async () => {
    const database = createAttiDatabase("answer-plan-repo-invalid");
    const repository = new AnswerPlanRepository(database);

    await expect(
      repository.createAnswerPlan({
        sessionId: "session-1",
        questionId: "",
        recommendedOptionIds: [],
        confidence: 0.5,
        rationale: "",
        requiresConfirmation: true,
        providerId: "provider-1",
        promptVersion: "prompt-v1"
      })
    ).rejects.toThrow();
    await expect(database.answerPlans.count()).resolves.toBe(0);

    database.close();
  });
});
