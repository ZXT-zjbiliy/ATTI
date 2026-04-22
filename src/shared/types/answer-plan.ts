import type { QuestionOption } from "./question";

export type AnswerPlanReviewStatus = "pending" | "confirmed" | "rejected" | "modified";
export type AnswerPlanQualityStatus = "normal" | "degraded";

export type AnswerPlan = {
  id: string;
  sessionId: string;
  questionId: string;
  recommendedOptionIds: string[];
  selectedOptionIds: string[];
  confidence: number;
  rationale: string;
  requiresConfirmation: boolean;
  reviewStatus: AnswerPlanReviewStatus;
  reviewedAt?: string;
  providerId: string;
  promptVersion: string;
  qualityStatus: AnswerPlanQualityStatus;
  qualityIssues: string[];
  createdAt: string;
};

export type RecommendationPreviewItem = {
  answerPlanId: string;
  questionId: string;
  questionText: string;
  questionType: string;
  questionOrder: number;
  options: QuestionOption[];
  recommendedOptionIds: string[];
  selectedOptionIds: string[];
  confidence: number;
  rationale: string;
  requiresConfirmation: boolean;
  reviewStatus: AnswerPlanReviewStatus;
  qualityStatus: AnswerPlanQualityStatus;
  qualityIssues: string[];
};

export type RecommendationPreview = {
  sessionId: string;
  siteId: string;
  sessionStatus: string;
  items: RecommendationPreviewItem[];
};
