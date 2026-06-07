import type {
  AppMessage,
  AppResult,
  AnswerPlanningRunMessage,
  AnswerFillRunMessage,
  ContentExtractionRunMessage,
  AnswerPlanReviewSaveMessage,
  ContentQuestionExtractionFailedMessage,
  ContentQuestionsExtractedMessage,
  ContentMetadataReportMessage,
  PingMessage,
  ProfileDraftSaveMessage,
  ProfileExportAllMessage,
  ProfileFetchMessage,
  ProfilePresetAnalyzeMessage,
  RecommendationPreviewFetchMessage,
  SessionExportAllMessage,
  SessionFetchMessage,
  SessionHistoryFetchMessage,
  SessionLatestFetchMessage,
  SessionPurgeCompletedMessage,
  SettingsFetchMessage,
  SettingsUpdateMessage
} from "../../shared/types";
import type { AdapterDiagnosticsRepository } from "../../storage/repos/adapter-diagnostics-repo";
import type { AnswerPlanRepository } from "../../storage/repos/answer-plan-repo";
import type { AssessmentProviderResolver } from "../../llm/providers";
import type { QuestionRepository } from "../../storage/repos/question-repo";
import type { ProfileRepository } from "../../storage/repos/profile-repo";
import type { SessionRepository } from "../../storage/repos/session-repo";
import type { SettingsRepository } from "../../storage/repos/settings-repo";
import type { ContentAutomationGateway } from "../services/content-automation-gateway";

export type SupportedBackgroundMessage =
  | PingMessage
  | ContentMetadataReportMessage
  | ContentQuestionsExtractedMessage
  | ContentQuestionExtractionFailedMessage
  | AnswerPlanningRunMessage
  | AnswerFillRunMessage
  | ContentExtractionRunMessage
  | RecommendationPreviewFetchMessage
  | AnswerPlanReviewSaveMessage
  | ProfileDraftSaveMessage
  | ProfilePresetAnalyzeMessage
  | ProfileFetchMessage
  | SettingsFetchMessage
  | SettingsUpdateMessage
  | SessionFetchMessage
  | SessionLatestFetchMessage
  | SessionHistoryFetchMessage
  | SessionExportAllMessage
  | ProfileExportAllMessage
  | SessionPurgeCompletedMessage;

export type BackgroundHandlerContext = {
  adapterDiagnosticsRepository: AdapterDiagnosticsRepository;
  answerPlanRepository: AnswerPlanRepository;
  assessmentProviderResolver: AssessmentProviderResolver;
  contentAutomationGateway?: ContentAutomationGateway;
  profileRepository: ProfileRepository;
  questionRepository: QuestionRepository;
  sessionRepository: SessionRepository;
  settingsRepository: SettingsRepository;
};

export type BackgroundMessageHandler<TMessage extends AppMessage> = (
  message: TMessage,
  context: BackgroundHandlerContext
) => Promise<AppResult>;
