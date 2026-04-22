import { z } from "zod";

import type { AnswerPlanningResult } from "../providers/assessment-provider";
import type { AnswerPlan, Question } from "../../shared/types";

const openAiAnswerPlanDraftSchema = z.object({
  questionId: z.string().min(1),
  recommendedOptionIds: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  requiresConfirmation: z.boolean()
});

const openAiAnswerPlanningResponseSchema = z.object({
  answerPlans: z.array(openAiAnswerPlanDraftSchema)
});

function normalizeRationale(rationale: string): string {
  return rationale.trim().replace(/\s+/g, " ");
}

export function parseOpenAiAnswerPlanningResponse(args: {
  rawText: string;
  providerId: string;
  promptVersion: string;
  questions: Question[];
  sessionId: string;
}): AnswerPlanningResult {
  const parsed = openAiAnswerPlanningResponseSchema.parse(JSON.parse(args.rawText));
  const questionMap = new Map(args.questions.map((question) => [question.id, question]));
  const responseQuestionIds = new Set<string>();

  if (parsed.answerPlans.length !== args.questions.length) {
    throw new Error(
      `OpenAI answer planning returned ${parsed.answerPlans.length} plans for ${args.questions.length} questions.`
    );
  }

  for (const answerPlanDraft of parsed.answerPlans) {
    const question = questionMap.get(answerPlanDraft.questionId);

    if (!question) {
      throw new Error(
        `OpenAI answer planning referenced an unknown question id: ${answerPlanDraft.questionId}`
      );
    }

    if (responseQuestionIds.has(answerPlanDraft.questionId)) {
      throw new Error(
        `OpenAI answer planning returned duplicate plans for question: ${answerPlanDraft.questionId}`
      );
    }

    responseQuestionIds.add(answerPlanDraft.questionId);

    const optionIds = new Set(question.options.map((option) => option.id));

    for (const optionId of answerPlanDraft.recommendedOptionIds) {
      if (!optionIds.has(optionId)) {
        throw new Error(
          `OpenAI answer planning returned an unknown option id for question ${question.id}: ${optionId}`
        );
      }
    }
  }

  const orderedAnswerPlans = args.questions.map((question) => {
    const answerPlanDraft = parsed.answerPlans.find(
      (candidate) => candidate.questionId === question.id
    );

    if (!answerPlanDraft) {
      throw new Error(`OpenAI answer planning omitted question: ${question.id}`);
    }

    return answerPlanDraft;
  });

  return {
    answerPlans: orderedAnswerPlans.map((answerPlanDraft): AnswerPlan => ({
      id: `${args.providerId}-plan-${answerPlanDraft.questionId}`,
      sessionId: args.sessionId,
      questionId: answerPlanDraft.questionId,
      recommendedOptionIds: [...answerPlanDraft.recommendedOptionIds],
      selectedOptionIds: [...answerPlanDraft.recommendedOptionIds],
      confidence: answerPlanDraft.confidence,
      rationale: normalizeRationale(answerPlanDraft.rationale),
      requiresConfirmation: answerPlanDraft.requiresConfirmation,
      reviewStatus: "pending",
      providerId: args.providerId,
      promptVersion: args.promptVersion,
      qualityStatus: "normal",
      qualityIssues: [],
      createdAt: new Date().toISOString()
    }))
  };
}

export function getOpenAiAnswerPlanningJsonSchema() {
  return {
    name: "answer_planning_result",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["answerPlans"],
      properties: {
        answerPlans: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "questionId",
              "recommendedOptionIds",
              "confidence",
              "rationale",
              "requiresConfirmation"
            ],
            properties: {
              questionId: { type: "string" },
              recommendedOptionIds: {
                type: "array",
                items: { type: "string" }
              },
              confidence: { type: "number" },
              rationale: { type: "string" },
              requiresConfirmation: { type: "boolean" }
            }
          }
        }
      }
    }
  } as const;
}
