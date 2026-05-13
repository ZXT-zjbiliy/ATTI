import { z } from "zod";

import {
  answerPlanningRunMessageSchema,
  answerFillRunMessageSchema,
  contentExtractionRunMessageSchema,
  answerPlanReviewSaveMessageSchema,
  contentQuestionExtractionFailedMessageSchema,
  contentQuestionsExtractedMessageSchema,
  contentMetadataReportMessageSchema,
  pingMessageSchema,
  profileDraftSaveMessageSchema,
  profileFetchMessageSchema,
  profilePresetAnalyzeMessageSchema,
  recommendationPreviewFetchMessageSchema,
  sessionFetchMessageSchema,
  sessionHistoryFetchMessageSchema,
  sessionLatestFetchMessageSchema,
  settingsFetchMessageSchema,
  settingsUpdateMessageSchema
} from "../shared/schemas";
import type { AppResult, MessageType } from "../shared/types";
import { MESSAGE_TYPES } from "../shared/types";
import { handleContentMetadataReportMessage } from "./handlers/content-metadata-handler";
import { handleAnswerPlanningRunMessage } from "./handlers/answer-planning-handler";
import { handleAnswerFillRunMessage } from "./handlers/answer-fill-handler";
import { handleContentExtractionRunMessage } from "./handlers/content-extraction-handler";
import {
  handleAnswerPlanReviewSaveMessage,
  handleRecommendationPreviewFetchMessage
} from "./handlers/recommendation-preview-handler";
import {
  handleContentQuestionExtractionFailedMessage,
  handleContentQuestionsExtractedMessage
} from "./handlers/content-question-extraction-handler";
import {
  handleProfileDraftSaveMessage,
  handleProfileFetchMessage,
  handleProfilePresetAnalyzeMessage
} from "./handlers/profile-handlers";
import { AdapterDiagnosticsRepository } from "../storage/repos/adapter-diagnostics-repo";
import { AnswerPlanRepository } from "../storage/repos/answer-plan-repo";
import { createAssessmentProviderResolver } from "../llm/providers";
import { createChromeContentAutomationGateway } from "./services/content-automation-gateway";
import { ProfileRepository } from "../storage/repos/profile-repo";
import { QuestionRepository } from "../storage/repos/question-repo";
import { SessionRepository } from "../storage/repos/session-repo";
import { SettingsRepository } from "../storage/repos/settings-repo";
import { handlePingMessage } from "./handlers/ping-handler";
import {
  handleSessionFetchMessage,
  handleSessionHistoryFetchMessage,
  handleSessionLatestFetchMessage
} from "./handlers/session-handler";
import {
  handleSettingsFetchMessage,
  handleSettingsUpdateMessage
} from "./handlers/settings-handlers";
import type {
  BackgroundHandlerContext,
  BackgroundMessageHandler,
  SupportedBackgroundMessage
} from "./handlers/types";

const messageEnvelopeSchema = z.object({
  type: z.string().min(1),
  payload: z.unknown()
});

const supportedMessageSchemas = {
  [MESSAGE_TYPES.ping]: pingMessageSchema,
  [MESSAGE_TYPES.contentMetadataReport]: contentMetadataReportMessageSchema,
  [MESSAGE_TYPES.contentQuestionsExtracted]: contentQuestionsExtractedMessageSchema,
  [MESSAGE_TYPES.contentQuestionExtractionFailed]: contentQuestionExtractionFailedMessageSchema,
  [MESSAGE_TYPES.answerPlanningRun]: answerPlanningRunMessageSchema,
  [MESSAGE_TYPES.answerFillRun]: answerFillRunMessageSchema,
  [MESSAGE_TYPES.contentExtractionRun]: contentExtractionRunMessageSchema,
  [MESSAGE_TYPES.recommendationPreviewFetch]: recommendationPreviewFetchMessageSchema,
  [MESSAGE_TYPES.answerPlanReviewSave]: answerPlanReviewSaveMessageSchema,
  [MESSAGE_TYPES.profileDraftSave]: profileDraftSaveMessageSchema,
  [MESSAGE_TYPES.profilePresetAnalyze]: profilePresetAnalyzeMessageSchema,
  [MESSAGE_TYPES.profileFetch]: profileFetchMessageSchema,
  [MESSAGE_TYPES.settingsFetch]: settingsFetchMessageSchema,
  [MESSAGE_TYPES.settingsUpdate]: settingsUpdateMessageSchema,
  [MESSAGE_TYPES.sessionFetch]: sessionFetchMessageSchema,
  [MESSAGE_TYPES.sessionLatestFetch]: sessionLatestFetchMessageSchema,
  [MESSAGE_TYPES.sessionHistoryFetch]: sessionHistoryFetchMessageSchema
} as const;

const supportedBackgroundMessageTypes = Object.keys(supportedMessageSchemas) as MessageType[];

const supportedMessageHandlers: Record<
  keyof typeof supportedMessageSchemas,
  BackgroundMessageHandler<SupportedBackgroundMessage>
> = {
  [MESSAGE_TYPES.ping]: handlePingMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.contentMetadataReport]:
    handleContentMetadataReportMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.contentQuestionsExtracted]:
    handleContentQuestionsExtractedMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.contentQuestionExtractionFailed]:
    handleContentQuestionExtractionFailedMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.answerPlanningRun]:
    handleAnswerPlanningRunMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.answerFillRun]:
    handleAnswerFillRunMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.contentExtractionRun]:
    handleContentExtractionRunMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.recommendationPreviewFetch]:
    handleRecommendationPreviewFetchMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.answerPlanReviewSave]:
    handleAnswerPlanReviewSaveMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.profileDraftSave]:
    handleProfileDraftSaveMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.profilePresetAnalyze]:
    handleProfilePresetAnalyzeMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.profileFetch]:
    handleProfileFetchMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.settingsFetch]:
    handleSettingsFetchMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.settingsUpdate]:
    handleSettingsUpdateMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.sessionFetch]:
    handleSessionFetchMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.sessionLatestFetch]:
    handleSessionLatestFetchMessage as BackgroundMessageHandler<SupportedBackgroundMessage>,
  [MESSAGE_TYPES.sessionHistoryFetch]:
    handleSessionHistoryFetchMessage as BackgroundMessageHandler<SupportedBackgroundMessage>
} as const;

function isSupportedBackgroundMessageType(type: string): type is keyof typeof supportedMessageSchemas {
  return supportedBackgroundMessageTypes.includes(type as MessageType);
}

function createErrorResult(code: string, message: string): AppResult {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

function parseSupportedMessage(rawMessage: unknown):
  | { ok: true; data: SupportedBackgroundMessage }
  | { ok: false; error: AppResult } {
  const envelopeResult = messageEnvelopeSchema.safeParse(rawMessage);

  if (!envelopeResult.success) {
    return {
      ok: false,
      error: createErrorResult("INVALID_MESSAGE", "Message envelope validation failed")
    };
  }

  if (!isSupportedBackgroundMessageType(envelopeResult.data.type)) {
    return {
      ok: false,
      error: createErrorResult(
        "UNSUPPORTED_MESSAGE_TYPE",
        `Unsupported background message type: ${envelopeResult.data.type}`
      )
    };
  }

  const schema = supportedMessageSchemas[envelopeResult.data.type];
  const result = schema.safeParse(rawMessage);

  if (!result.success) {
    return {
      ok: false,
      error: createErrorResult(
        "INVALID_MESSAGE_PAYLOAD",
        `Payload validation failed for message type: ${envelopeResult.data.type}`
      )
    };
  }

  return {
    ok: true,
    data: result.data
  };
}

export class BackgroundMessageRouter {
  constructor(private readonly context: BackgroundHandlerContext) {}

  async routeMessage(rawMessage: unknown): Promise<AppResult> {
    const parsedMessage = parseSupportedMessage(rawMessage);

    if (!parsedMessage.ok) {
      return parsedMessage.error;
    }

    const handler = supportedMessageHandlers[parsedMessage.data.type];

    return handler(parsedMessage.data, this.context);
  }
}

export function createBackgroundMessageRouter(context?: Partial<BackgroundHandlerContext>) {
  return new BackgroundMessageRouter({
    adapterDiagnosticsRepository:
      context?.adapterDiagnosticsRepository ?? new AdapterDiagnosticsRepository(),
    answerPlanRepository: context?.answerPlanRepository ?? new AnswerPlanRepository(),
    assessmentProviderResolver:
      context?.assessmentProviderResolver ?? createAssessmentProviderResolver(),
    contentAutomationGateway:
      context?.contentAutomationGateway ?? createChromeContentAutomationGateway(),
    profileRepository: context?.profileRepository ?? new ProfileRepository(),
    questionRepository: context?.questionRepository ?? new QuestionRepository(),
    sessionRepository: context?.sessionRepository ?? new SessionRepository(),
    settingsRepository: context?.settingsRepository ?? new SettingsRepository()
  });
}

export type SupportedBackgroundMessageType = keyof typeof supportedMessageSchemas;
export { supportedBackgroundMessageTypes };
