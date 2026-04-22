import { answerPlanSchema } from "../../shared/schemas";
import type { AnswerPlan, Question } from "../../shared/types";
import { ProviderExecutionError } from "../../llm/providers";

function createValidationError(providerId: string, message: string) {
  return new ProviderExecutionError({
    providerId,
    code: "ANSWER_PLAN_VALIDATION_FAILED",
    message,
    retryable: false,
    details: {
      failureBoundary: "router-validation",
      failureStage: "answer-plan-validation",
      cause: message
    }
  });
}

export function validateAnswerPlanningResult(args: {
  answerPlans: AnswerPlan[];
  providerId: string;
  questions: Question[];
  sessionId: string;
}): AnswerPlan[] {
  const questionMap = new Map(args.questions.map((question) => [question.id, question]));
  const seenQuestionIds = new Set<string>();

  if (args.answerPlans.length !== args.questions.length) {
    throw createValidationError(
      args.providerId,
      `Provider returned ${args.answerPlans.length} answer plans for ${args.questions.length} extracted questions.`
    );
  }

  const normalizedAnswerPlans = args.answerPlans.map((answerPlan) => ({
    ...answerPlan,
    recommendedOptionIds: [...answerPlan.recommendedOptionIds],
    selectedOptionIds: [...answerPlan.selectedOptionIds],
    qualityStatus: answerPlan.qualityStatus ?? "normal",
    qualityIssues: answerPlan.qualityIssues ?? []
  }));

  for (const answerPlan of normalizedAnswerPlans) {
    const validatedAnswerPlan = answerPlanSchema.safeParse(answerPlan);

    if (!validatedAnswerPlan.success) {
      throw createValidationError(
        args.providerId,
        `Answer plan contract validation failed for question ${answerPlan.questionId}: ${validatedAnswerPlan.error.issues[0]?.message ?? "unknown schema error"}`
      );
    }

    if (answerPlan.sessionId !== args.sessionId) {
      throw createValidationError(
        args.providerId,
        `Provider returned an answer plan bound to a different session: ${answerPlan.sessionId}`
      );
    }

    const question = questionMap.get(answerPlan.questionId);

    if (!question) {
      throw createValidationError(
        args.providerId,
        `Provider returned an answer plan for an unknown question: ${answerPlan.questionId}`
      );
    }

    if (seenQuestionIds.has(answerPlan.questionId)) {
      throw createValidationError(
        args.providerId,
        `Provider returned duplicate answer plans for question: ${answerPlan.questionId}`
      );
    }

    seenQuestionIds.add(answerPlan.questionId);

    const optionIds = new Set(question.options.map((option) => option.id));

    for (const optionId of answerPlan.recommendedOptionIds) {
      if (!optionIds.has(optionId)) {
        throw createValidationError(
          args.providerId,
          `Provider returned an unknown option id for question ${answerPlan.questionId}: ${optionId}`
        );
      }
    }
  }

  return normalizedAnswerPlans;
}
