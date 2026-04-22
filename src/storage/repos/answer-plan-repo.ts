import { z } from "zod";

import { answerPlanSchema } from "../../shared/schemas";
import type { AnswerPlan } from "../../shared/types";
import { attiDb, type AttiDatabase } from "../db";

const answerPlanDraftSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  recommendedOptionIds: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  requiresConfirmation: z.boolean(),
  providerId: z.string().min(1),
  promptVersion: z.string().min(1),
  qualityStatus: z.enum(["normal", "degraded"]).default("normal"),
  qualityIssues: z.array(z.string().min(1)).default([])
});

const answerPlanReviewUpdateSchema = z.object({
  answerPlanId: z.string().min(1),
  reviewStatus: z.enum(["pending", "confirmed", "rejected", "modified"]),
  selectedOptionIds: z.array(z.string().min(1))
});

type AnswerPlanDraft = z.infer<typeof answerPlanDraftSchema>;
type AnswerPlanReviewUpdate = z.infer<typeof answerPlanReviewUpdateSchema>;

function cloneAnswerPlan(answerPlan: AnswerPlan): AnswerPlan {
  return {
    ...answerPlan,
    recommendedOptionIds: [...answerPlan.recommendedOptionIds],
    selectedOptionIds: [...answerPlan.selectedOptionIds],
    qualityIssues: [...answerPlan.qualityIssues]
  };
}

function createAnswerPlanId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `answer-plan-${Date.now()}`;
}

function buildAnswerPlanFromDraft(draft: AnswerPlanDraft): AnswerPlan {
  return {
    id: createAnswerPlanId(),
    sessionId: draft.sessionId,
    questionId: draft.questionId,
    recommendedOptionIds: [...draft.recommendedOptionIds],
    selectedOptionIds: [...draft.recommendedOptionIds],
    confidence: draft.confidence,
    rationale: draft.rationale,
    requiresConfirmation: draft.requiresConfirmation,
    reviewStatus: "pending",
    providerId: draft.providerId,
    promptVersion: draft.promptVersion,
    qualityStatus: draft.qualityStatus,
    qualityIssues: [...draft.qualityIssues],
    createdAt: new Date().toISOString()
  };
}

export class AnswerPlanRepository {
  constructor(private readonly database: Pick<AttiDatabase, "answerPlans"> = attiDb) {}

  async createAnswerPlan(draft: AnswerPlanDraft): Promise<AnswerPlan> {
    const validatedDraft = answerPlanDraftSchema.parse(draft);
    const answerPlan = answerPlanSchema.parse(buildAnswerPlanFromDraft(validatedDraft));

    await this.database.answerPlans.put(answerPlan);

    return cloneAnswerPlan(answerPlan);
  }

  async getAnswerPlanById(answerPlanId: string): Promise<AnswerPlan | null> {
    const validatedAnswerPlanId = z.string().min(1).parse(answerPlanId);
    const answerPlan = await this.database.answerPlans.get(validatedAnswerPlanId);

    if (!answerPlan) {
      return null;
    }

    return cloneAnswerPlan(answerPlanSchema.parse(answerPlan));
  }

  async listBySessionId(sessionId: string): Promise<AnswerPlan[]> {
    const validatedSessionId = z.string().min(1).parse(sessionId);
    const answerPlans = await this.database.answerPlans
      .where("sessionId")
      .equals(validatedSessionId)
      .toArray();

    return answerPlans.map((answerPlan) => cloneAnswerPlan(answerPlanSchema.parse(answerPlan)));
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    const validatedSessionId = z.string().min(1).parse(sessionId);

    return this.database.answerPlans.where("sessionId").equals(validatedSessionId).delete();
  }

  async updateReview(update: AnswerPlanReviewUpdate): Promise<AnswerPlan> {
    const validatedUpdate = answerPlanReviewUpdateSchema.parse(update);
    const currentAnswerPlan = await this.database.answerPlans.get(validatedUpdate.answerPlanId);

    if (!currentAnswerPlan) {
      throw new Error(`Answer plan not found: ${validatedUpdate.answerPlanId}`);
    }

    const nextAnswerPlan = answerPlanSchema.parse({
      ...currentAnswerPlan,
      reviewStatus: validatedUpdate.reviewStatus,
      selectedOptionIds: [...validatedUpdate.selectedOptionIds],
      reviewedAt:
        validatedUpdate.reviewStatus === "pending" ? undefined : new Date().toISOString()
    });

    await this.database.answerPlans.put(nextAnswerPlan);

    return cloneAnswerPlan(nextAnswerPlan);
  }
}
