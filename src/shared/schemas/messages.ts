import { z } from "zod";

import type { AppMessage, AppResult, AnswerFillApplyCommand, QuestionExtractionRunCommand } from "../types";
import { CONTENT_COMMAND_TYPES, MESSAGE_TYPES } from "../types";
import { answerPlanReviewStatusSchema } from "./answer-plan";
import { adapterDiagnosticsPayloadSchema } from "./adapter-diagnostics";
import { nonEmptyStringSchema } from "./common";
import { profileDraftSchema } from "./profile";
import { profilePresetAnalysisInputSchema } from "./profile-preset";
import { questionOptionSchema } from "./question";
import { settingsSchema } from "./settings";

export const pingPayloadSchema = z.object({}).strict();

export const contentPageMetadataSchema = z.object({
  url: nonEmptyStringSchema,
  title: z.string(),
  readyState: nonEmptyStringSchema,
  isTopLevel: z.boolean()
});

export const contentMetadataReportPayloadSchema = z.object({
  page: contentPageMetadataSchema
});

export const extractedQuestionDraftSchema = z.object({
  section: nonEmptyStringSchema.optional(),
  text: nonEmptyStringSchema,
  type: nonEmptyStringSchema,
  options: z.array(questionOptionSchema),
  order: z.number().int()
});

export const contentQuestionsExtractedPayloadSchema = z.object({
  siteId: nonEmptyStringSchema,
  page: contentPageMetadataSchema,
  questions: z.array(extractedQuestionDraftSchema)
});

export const contentQuestionExtractionFailedPayloadSchema = z.object({
  siteId: nonEmptyStringSchema,
  page: contentPageMetadataSchema,
  phase: nonEmptyStringSchema,
  message: nonEmptyStringSchema.max(200),
  payload: adapterDiagnosticsPayloadSchema.optional()
});

export const settingsFetchPayloadSchema = z.object({}).strict();

export const answerPlanningRunPayloadSchema = z.object({
  sessionId: nonEmptyStringSchema
});

export const profileDraftSavePayloadSchema = z.object({
  draft: profileDraftSchema
});

export const profilePresetAnalyzePayloadSchema = profilePresetAnalysisInputSchema;

export const recommendationPreviewFetchPayloadSchema = z.object({
  sessionId: nonEmptyStringSchema
});

export const answerPlanReviewSavePayloadSchema = z.object({
  answerPlanId: nonEmptyStringSchema,
  reviewStatus: answerPlanReviewStatusSchema,
  selectedOptionIds: z.array(nonEmptyStringSchema)
});

export const answerFillRunPayloadSchema = z.object({
  sessionId: nonEmptyStringSchema
});

export const contentExtractionRunPayloadSchema = z.object({
  sessionId: nonEmptyStringSchema
});

export const contentAnswerFillSelectionSchema = z.object({
  questionId: nonEmptyStringSchema,
  questionText: nonEmptyStringSchema,
  questionOrder: z.number().int(),
  selectedOptionIds: z.array(nonEmptyStringSchema)
});

export const settingsUpdatePayloadSchema = z.object({
  settings: settingsSchema
});

export const sessionFetchPayloadSchema = z.object({
  sessionId: nonEmptyStringSchema
});

export const sessionLatestFetchPayloadSchema = z.object({}).strict();
export const sessionHistoryFetchPayloadSchema = z.object({
  limit: z.number().int().positive().max(20).optional()
});

export const profileFetchPayloadSchema = z.object({
  profileId: nonEmptyStringSchema
});

export const pingMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.ping),
  payload: pingPayloadSchema
});

export const contentMetadataReportMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.contentMetadataReport),
  payload: contentMetadataReportPayloadSchema
});

export const contentQuestionsExtractedMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.contentQuestionsExtracted),
  payload: contentQuestionsExtractedPayloadSchema
});

export const contentQuestionExtractionFailedMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.contentQuestionExtractionFailed),
  payload: contentQuestionExtractionFailedPayloadSchema
});

export const settingsFetchMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.settingsFetch),
  payload: settingsFetchPayloadSchema
});

export const answerPlanningRunMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.answerPlanningRun),
  payload: answerPlanningRunPayloadSchema
});

export const profileDraftSaveMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.profileDraftSave),
  payload: profileDraftSavePayloadSchema
});

export const profilePresetAnalyzeMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.profilePresetAnalyze),
  payload: profilePresetAnalyzePayloadSchema
});

export const recommendationPreviewFetchMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.recommendationPreviewFetch),
  payload: recommendationPreviewFetchPayloadSchema
});

export const answerPlanReviewSaveMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.answerPlanReviewSave),
  payload: answerPlanReviewSavePayloadSchema
});

export const answerFillRunMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.answerFillRun),
  payload: answerFillRunPayloadSchema
});

export const contentExtractionRunMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.contentExtractionRun),
  payload: contentExtractionRunPayloadSchema
});

export const answerFillApplyCommandSchema = z.object({
  type: z.literal(CONTENT_COMMAND_TYPES.answerFillApply),
  payload: z.object({
    siteId: nonEmptyStringSchema,
    sessionId: nonEmptyStringSchema,
    selections: z.array(contentAnswerFillSelectionSchema)
  })
}) satisfies z.ZodType<AnswerFillApplyCommand>;

export const questionExtractionRunCommandSchema = z.object({
  type: z.literal(CONTENT_COMMAND_TYPES.questionExtractionRun),
  payload: z.object({}).strict()
}) satisfies z.ZodType<QuestionExtractionRunCommand>;

export const settingsUpdateMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.settingsUpdate),
  payload: settingsUpdatePayloadSchema
});

export const sessionFetchMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.sessionFetch),
  payload: sessionFetchPayloadSchema
});

export const sessionLatestFetchMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.sessionLatestFetch),
  payload: sessionLatestFetchPayloadSchema
});

export const sessionHistoryFetchMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.sessionHistoryFetch),
  payload: sessionHistoryFetchPayloadSchema
});

export const profileFetchMessageSchema = z.object({
  type: z.literal(MESSAGE_TYPES.profileFetch),
  payload: profileFetchPayloadSchema
});

export const appMessageSchema = z.discriminatedUnion("type", [
  pingMessageSchema,
  contentMetadataReportMessageSchema,
  contentQuestionsExtractedMessageSchema,
  contentQuestionExtractionFailedMessageSchema,
  answerPlanningRunMessageSchema,
  profileDraftSaveMessageSchema,
  profilePresetAnalyzeMessageSchema,
  recommendationPreviewFetchMessageSchema,
  answerPlanReviewSaveMessageSchema,
  answerFillRunMessageSchema,
  contentExtractionRunMessageSchema,
  settingsFetchMessageSchema,
  settingsUpdateMessageSchema,
  sessionFetchMessageSchema,
  sessionLatestFetchMessageSchema,
  sessionHistoryFetchMessageSchema,
  profileFetchMessageSchema
]) satisfies z.ZodType<AppMessage>;

export const appResultSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.unknown()
});

export const appResultErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: nonEmptyStringSchema,
    message: nonEmptyStringSchema
  })
});

export const appResultSchema = z.union([
  appResultSuccessSchema,
  appResultErrorSchema
]) satisfies z.ZodType<AppResult>;
