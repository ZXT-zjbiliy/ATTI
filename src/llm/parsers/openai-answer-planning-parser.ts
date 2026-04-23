import { z } from "zod";

import type { AnswerPlanningResult } from "../providers/assessment-provider";
import type { AnswerPlan, Question } from "../../shared/types";

const openAiAnswerPlanDraftSchema = z.object({
  questionId: z.string().min(1),
  recommendedOptionIds: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  requiresConfirmation: z.boolean().optional()
});

const openAiAnswerPlanningResponseSchema = z
  .object({
    answerPlans: z.array(openAiAnswerPlanDraftSchema).optional(),
    answers: z.array(openAiAnswerPlanDraftSchema).optional()
  })
  .refine((value) => Array.isArray(value.answerPlans) || Array.isArray(value.answers), {
    message: "Answer planning response must include answerPlans or answers."
  });

type NormalizedAnswerPlanDraft = z.infer<typeof openAiAnswerPlanDraftSchema> & {
  readonly requiresConfirmation: boolean;
};

function tryParseJsonText(rawText: string): unknown {
  return JSON.parse(rawText);
}

function extractJsonText(rawText: string): string {
  const trimmedText = rawText.trim();

  try {
    tryParseJsonText(trimmedText);
    return trimmedText;
  } catch {
    const fencedJsonMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

    if (fencedJsonMatch?.[1]) {
      const fencedPayload = fencedJsonMatch[1].trim();

      try {
        tryParseJsonText(fencedPayload);
        return fencedPayload;
      } catch {
        // Fall through to object scanning below.
      }
    }

    const firstBraceIndex = trimmedText.indexOf("{");
    const lastBraceIndex = trimmedText.lastIndexOf("}");

    if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
      const objectPayload = trimmedText.slice(firstBraceIndex, lastBraceIndex + 1);

      try {
        tryParseJsonText(objectPayload);
        return objectPayload;
      } catch {
        // Fall through to final error below.
      }
    }

    throw new Error("Answer planning response did not contain a valid JSON object.");
  }
}

function normalizeRationale(rationale: string): string {
  return rationale.trim().replace(/\s+/g, " ");
}

function getNormalizedAnswerPlanDrafts(rawText: string): NormalizedAnswerPlanDraft[] {
  const parsed = openAiAnswerPlanningResponseSchema.parse(JSON.parse(extractJsonText(rawText)));
  const drafts = parsed.answerPlans ?? parsed.answers ?? [];

  return drafts.map((draft) => ({
    ...draft,
    requiresConfirmation: draft.requiresConfirmation ?? false
  }));
}

export function parseOpenAiAnswerPlanningResponse(args: {
  rawText: string;
  providerId: string;
  promptVersion: string;
  questions: Question[];
  sessionId: string;
}): AnswerPlanningResult {
  const normalizedAnswerPlans = getNormalizedAnswerPlanDrafts(args.rawText);
  const questionMap = new Map(args.questions.map((question) => [question.id, question]));
  const responseQuestionIds = new Set<string>();

  if (normalizedAnswerPlans.length !== args.questions.length) {
    throw new Error(
      `OpenAI answer planning returned ${normalizedAnswerPlans.length} plans for ${args.questions.length} questions.`
    );
  }

  for (const answerPlanDraft of normalizedAnswerPlans) {
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
    const answerPlanDraft = normalizedAnswerPlans.find(
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
