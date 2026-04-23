import type {
  AnswerPlanReviewSaveMessage,
  AppResult,
  RecommendationPreview,
  RecommendationPreviewFetchMessage,
  RecommendationPreviewItem
} from "../../shared/types";
import type { AnswerPlan, Question } from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";

function createErrorResult(code: string, message: string): AppResult {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

function mapRecommendationPreviewItem(answerPlan: AnswerPlan, question: Question): RecommendationPreviewItem {
  return {
    answerPlanId: answerPlan.id,
    questionId: question.id,
    questionText: question.text,
    questionType: question.type,
    questionOrder: question.order,
    hasRecommendation: true,
    options: question.options.map((option) => ({ ...option })),
    recommendedOptionIds: [...answerPlan.recommendedOptionIds],
    selectedOptionIds: [...answerPlan.selectedOptionIds],
    confidence: answerPlan.confidence,
    rationale: answerPlan.rationale,
    requiresConfirmation: answerPlan.requiresConfirmation,
    reviewStatus: answerPlan.reviewStatus,
    qualityStatus: answerPlan.qualityStatus,
    qualityIssues: [...answerPlan.qualityIssues]
  };
}

function mapExtractedQuestionPreviewItem(question: Question): RecommendationPreviewItem {
  return {
    answerPlanId: `question-only-${question.id}`,
    questionId: question.id,
    questionText: question.text,
    questionType: question.type,
    questionOrder: question.order,
    hasRecommendation: false,
    options: question.options.map((option) => ({ ...option })),
    recommendedOptionIds: [],
    selectedOptionIds: [],
    confidence: 0,
    rationale: "",
    requiresConfirmation: false,
    reviewStatus: "pending",
    qualityStatus: "normal",
    qualityIssues: []
  };
}

export const handleRecommendationPreviewFetchMessage: BackgroundMessageHandler<
  RecommendationPreviewFetchMessage
> = async (message, context): Promise<AppResult> => {
  const session = await context.sessionRepository.getSessionById(message.payload.sessionId);

  if (!session) {
    return createErrorResult("SESSION_NOT_FOUND", `Session not found: ${message.payload.sessionId}`);
  }

  const [questions, answerPlans] = await Promise.all([
    context.questionRepository.listBySessionId(session.id),
    context.answerPlanRepository.listBySessionId(session.id)
  ]);
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const answerPlanMap = new Map(answerPlans.map((answerPlan) => [answerPlan.questionId, answerPlan]));
  const items: RecommendationPreviewItem[] = [];

  for (const question of questions) {
    const answerPlan = answerPlanMap.get(question.id);
    items.push(
      answerPlan
        ? mapRecommendationPreviewItem(answerPlan, question)
        : mapExtractedQuestionPreviewItem(question)
    );
  }

  for (const answerPlan of answerPlans) {
    if (!questionMap.has(answerPlan.questionId)) {
      return createErrorResult(
        "QUESTION_NOT_FOUND",
        `Question not found for answer plan: ${answerPlan.questionId}`
      );
    }
  }

  items.sort((left, right) => left.questionOrder - right.questionOrder);

  const preview: RecommendationPreview = {
    sessionId: session.id,
    siteId: session.siteId,
    sessionStatus: session.status,
    items
  };

  return {
    ok: true,
    data: preview
  };
};

export const handleAnswerPlanReviewSaveMessage: BackgroundMessageHandler<
  AnswerPlanReviewSaveMessage
> = async (message, context): Promise<AppResult> => {
  const currentAnswerPlan = await context.answerPlanRepository.getAnswerPlanById(
    message.payload.answerPlanId
  );

  if (!currentAnswerPlan) {
    return createErrorResult(
      "ANSWER_PLAN_NOT_FOUND",
      `Answer plan not found: ${message.payload.answerPlanId}`
    );
  }

  const question = await context.questionRepository.getQuestionById(currentAnswerPlan.questionId);

  if (!question) {
    return createErrorResult("QUESTION_NOT_FOUND", `Question not found: ${currentAnswerPlan.questionId}`);
  }

  const validOptionIds = new Set(question.options.map((option) => option.id));

  if (message.payload.reviewStatus === "rejected" && message.payload.selectedOptionIds.length > 0) {
    return createErrorResult(
      "INVALID_REVIEW_SELECTION",
      "Rejected recommendations must clear all selected options."
    );
  }

  if (message.payload.reviewStatus !== "rejected" && message.payload.selectedOptionIds.length === 0) {
    return createErrorResult(
      "INVALID_REVIEW_SELECTION",
      "Confirmed or modified recommendations must keep at least one selected option."
    );
  }

  if (message.payload.selectedOptionIds.some((optionId) => !validOptionIds.has(optionId))) {
    return createErrorResult(
      "INVALID_REVIEW_SELECTION",
      `Selected options must belong to question: ${question.id}`
    );
  }

  const updatedAnswerPlan = await context.answerPlanRepository.updateReview({
    answerPlanId: currentAnswerPlan.id,
    reviewStatus: message.payload.reviewStatus,
    selectedOptionIds: [...message.payload.selectedOptionIds]
  });

  return {
    ok: true,
    data: mapRecommendationPreviewItem(updatedAnswerPlan, question)
  };
};
