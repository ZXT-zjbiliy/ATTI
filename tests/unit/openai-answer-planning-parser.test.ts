import { describe, expect, it } from "vitest";

import { parseOpenAiAnswerPlanningResponse } from "../../src/llm/parsers/openai-answer-planning-parser";
import type { Question } from "../../src/shared/types";

const sampleQuestions: Question[] = [
  {
    id: "question-1",
    sessionId: "session-1",
    siteId: "truity-enneagram",
    pageUrl: "https://www.truity.com/test/enneagram-personality-test",
    text: "I strive for perfection",
    type: "single-choice",
    options: [
      { id: "1", text: "Inaccurate" },
      { id: "2", text: "Somewhat Inaccurate" },
      { id: "3", text: "Neutral" }
    ],
    order: 0,
    createdAt: "2026-04-22T00:00:00.000Z"
  },
  {
    id: "question-2",
    sessionId: "session-1",
    siteId: "truity-enneagram",
    pageUrl: "https://www.truity.com/test/enneagram-personality-test",
    text: "I work hard to be helpful to others",
    type: "single-choice",
    options: [
      { id: "1", text: "Inaccurate" },
      { id: "4", text: "Somewhat Accurate" },
      { id: "5", text: "Accurate" }
    ],
    order: 1,
    createdAt: "2026-04-22T00:00:00.000Z"
  }
];

describe("openai answer planning parser", () => {
  it("accepts valid provider output and reorders plans to match question order", () => {
    const result = parseOpenAiAnswerPlanningResponse({
      rawText: JSON.stringify({
        answerPlans: [
          {
            questionId: "question-2",
            recommendedOptionIds: ["5"],
            confidence: 0.82,
            rationale: "Evidence points to active helpfulness.",
            requiresConfirmation: false
          },
          {
            questionId: "question-1",
            recommendedOptionIds: ["2"],
            confidence: 0.61,
            rationale: "The profile shows some structure but not rigidity.",
            requiresConfirmation: false
          }
        ]
      }),
      providerId: "openai-assessment-provider",
      promptVersion: "openai-v1",
      questions: sampleQuestions,
      sessionId: "session-1"
    });

    expect(result.answerPlans).toHaveLength(2);
    expect(result.answerPlans.map((plan) => plan.questionId)).toEqual(["question-1", "question-2"]);
    expect(result.answerPlans[0]?.recommendedOptionIds).toEqual(["2"]);
    expect(result.answerPlans[1]?.recommendedOptionIds).toEqual(["5"]);
    expect(result.answerPlans[0]?.rationale).toBe("The profile shows some structure but not rigidity.");
    expect(result.answerPlans[0]?.qualityStatus).toBe("normal");
    expect(result.answerPlans[0]?.qualityIssues).toEqual([]);
  });

  it("accepts compatible-provider output when the JSON is wrapped in a markdown fence", () => {
    const result = parseOpenAiAnswerPlanningResponse({
      rawText: [
        "Here is the answer planning result:",
        "```json",
        JSON.stringify({
          answerPlans: [
            {
              questionId: "question-2",
              recommendedOptionIds: ["5"],
              confidence: 0.82,
              rationale: "Evidence points to active helpfulness.",
              requiresConfirmation: false
            },
            {
              questionId: "question-1",
              recommendedOptionIds: ["2"],
              confidence: 0.61,
              rationale: "The profile shows some structure but not rigidity.",
              requiresConfirmation: false
            }
          ]
        }),
        "```"
      ].join("\n"),
      providerId: "compatible-assessment-provider",
      promptVersion: "compatible-assessment-provider-v1",
      questions: sampleQuestions,
      sessionId: "session-1"
    });

    expect(result.answerPlans).toHaveLength(2);
    expect(result.answerPlans.map((plan) => plan.questionId)).toEqual(["question-1", "question-2"]);
  });

  it("accepts compatible-provider output that uses answers instead of answerPlans", () => {
    const result = parseOpenAiAnswerPlanningResponse({
      rawText: JSON.stringify({
        answers: [
          {
            questionId: "question-2",
            recommendedOptionIds: ["5"],
            confidence: 0.82,
            rationale: "Evidence points to active helpfulness."
          },
          {
            questionId: "question-1",
            recommendedOptionIds: ["2"],
            confidence: 0.61,
            rationale: "The profile shows some structure but not rigidity."
          }
        ]
      }),
      providerId: "compatible-assessment-provider",
      promptVersion: "compatible-assessment-provider-v1",
      questions: sampleQuestions,
      sessionId: "session-1"
    });

    expect(result.answerPlans).toHaveLength(2);
    expect(result.answerPlans.every((plan) => plan.requiresConfirmation === false)).toBe(true);
  });

  it("rejects provider output when the question count or option ids are invalid", () => {
    expect(() =>
      parseOpenAiAnswerPlanningResponse({
        rawText: JSON.stringify({
          answerPlans: [
            {
              questionId: "question-1",
              recommendedOptionIds: ["missing-option"],
              confidence: 0.7,
              rationale: "Invalid option",
              requiresConfirmation: false
            }
          ]
        }),
        providerId: "openai-assessment-provider",
        promptVersion: "openai-v1",
        questions: sampleQuestions,
        sessionId: "session-1"
      })
    ).toThrow(/returned 1 plans for 2 questions|unknown option id/i);
  });
});
