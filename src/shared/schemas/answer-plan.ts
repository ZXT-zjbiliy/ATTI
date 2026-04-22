import { z } from "zod";

import type { AnswerPlan, AnswerPlanQualityStatus, AnswerPlanReviewStatus } from "../types";
import { nonEmptyStringSchema } from "./common";

const nonEmptyStringArraySchema = z.array(nonEmptyStringSchema).min(1);
const stringArraySchema = z.array(nonEmptyStringSchema);

export const answerPlanReviewStatusSchema = z.enum([
  "pending",
  "confirmed",
  "rejected",
  "modified"
]) satisfies z.ZodType<AnswerPlanReviewStatus>;

export const answerPlanQualityStatusSchema = z.enum([
  "normal",
  "degraded"
]) satisfies z.ZodType<AnswerPlanQualityStatus>;

export const answerPlanSchema = z.object({
  id: nonEmptyStringSchema,
  sessionId: nonEmptyStringSchema,
  questionId: nonEmptyStringSchema,
  recommendedOptionIds: nonEmptyStringArraySchema,
  selectedOptionIds: stringArraySchema,
  confidence: z.number().min(0).max(1),
  rationale: nonEmptyStringSchema,
  requiresConfirmation: z.boolean(),
  reviewStatus: answerPlanReviewStatusSchema,
  reviewedAt: nonEmptyStringSchema.optional(),
  providerId: nonEmptyStringSchema,
  promptVersion: nonEmptyStringSchema,
  qualityStatus: answerPlanQualityStatusSchema,
  qualityIssues: z.array(nonEmptyStringSchema),
  createdAt: nonEmptyStringSchema
}) satisfies z.ZodType<AnswerPlan>;
