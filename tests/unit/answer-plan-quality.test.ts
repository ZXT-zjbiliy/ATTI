import { describe, expect, it } from "vitest";

import { applyAnswerPlanQualityBaseline } from "../../src/background/handlers/answer-plan-quality";
import type { AnswerPlan } from "../../src/shared/types";

function createAnswerPlan(overrides: Partial<AnswerPlan> = {}): AnswerPlan {
  return {
    id: "plan-1",
    sessionId: "session-1",
    questionId: "question-1",
    recommendedOptionIds: ["1"],
    selectedOptionIds: ["1"],
    confidence: 0.81,
    rationale: "Profile evidence supports a measured but confident recommendation.",
    requiresConfirmation: false,
    reviewStatus: "pending",
    providerId: "openai-assessment-provider",
    promptVersion: "openai-v1",
    qualityStatus: "normal",
    qualityIssues: [],
    createdAt: "2026-04-22T00:00:00.000Z",
    ...overrides
  };
}

describe("answer plan quality baseline", () => {
  it("marks low-confidence plans as degraded", () => {
    const [result] = applyAnswerPlanQualityBaseline([
      createAnswerPlan({
        confidence: 0.49
      })
    ]);

    expect(result?.qualityStatus).toBe("degraded");
    expect(result?.qualityIssues).toEqual(["low-confidence"]);
  });

  it("marks placeholder-style rationale as degraded", () => {
    const [result] = applyAnswerPlanQualityBaseline([
      createAnswerPlan({
        rationale: "Placeholder recommendation for question-1"
      })
    ]);

    expect(result?.qualityStatus).toBe("degraded");
    expect(result?.qualityIssues).toEqual(["placeholder-rationale"]);
  });

  it("keeps normal recommendations fillable at the quality layer", () => {
    const [result] = applyAnswerPlanQualityBaseline([createAnswerPlan()]);

    expect(result?.qualityStatus).toBe("normal");
    expect(result?.qualityIssues).toEqual([]);
  });
});
