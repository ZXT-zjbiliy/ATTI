import type { Profile, ProfileDraft } from "./profile";
import type { ProfilePresetAnalysisInput } from "./profile-preset";
import type { QuestionOption } from "./question";
import type { SessionHistoryEntry } from "./session";
import type { Settings } from "./settings";
import type {
  AnswerPlanReviewStatus,
  RecommendationPreview,
  RecommendationPreviewItem
} from "./answer-plan";

export const MESSAGE_TYPES = {
  ping: "ping",
  contentMetadataReport: "contentMetadataReport",
  contentQuestionsExtracted: "contentQuestionsExtracted",
  contentQuestionExtractionFailed: "contentQuestionExtractionFailed",
  answerPlanningRun: "answerPlanningRun",
  recommendationPreviewFetch: "recommendationPreviewFetch",
  answerPlanReviewSave: "answerPlanReviewSave",
  answerFillRun: "answerFillRun",
  contentExtractionRun: "contentExtractionRun",
  profileDraftSave: "profileDraftSave",
  profilePresetAnalyze: "profilePresetAnalyze",
  settingsFetch: "settingsFetch",
  settingsUpdate: "settingsUpdate",
  sessionFetch: "sessionFetch",
  sessionLatestFetch: "sessionLatestFetch",
  sessionHistoryFetch: "sessionHistoryFetch",
  profileFetch: "profileFetch"
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export type EmptyPayload = Record<string, never>;

export type PingMessage = {
  type: typeof MESSAGE_TYPES.ping;
  payload: EmptyPayload;
};

export type ContentPageMetadata = {
  url: string;
  title: string;
  readyState: string;
  isTopLevel: boolean;
};

export type ContentMetadataReportMessage = {
  type: typeof MESSAGE_TYPES.contentMetadataReport;
  payload: {
    page: ContentPageMetadata;
  };
};

export type ExtractedQuestionDraft = {
  section?: string;
  text: string;
  type: string;
  options: QuestionOption[];
  order: number;
};

export type ContentQuestionsExtractedMessage = {
  type: typeof MESSAGE_TYPES.contentQuestionsExtracted;
  payload: {
    siteId: string;
    page: ContentPageMetadata;
    questions: ExtractedQuestionDraft[];
  };
};

export type ContentQuestionExtractionFailedMessage = {
  type: typeof MESSAGE_TYPES.contentQuestionExtractionFailed;
  payload: {
    siteId: string;
    page: ContentPageMetadata;
    phase: string;
    message: string;
    payload?: Record<string, string | number | boolean | null | string[] | number[] | boolean[]>;
  };
};

export type SettingsFetchMessage = {
  type: typeof MESSAGE_TYPES.settingsFetch;
  payload: EmptyPayload;
};

export type ContentExtractionRunMessage = {
  type: typeof MESSAGE_TYPES.contentExtractionRun;
  payload: {
    sessionId: string;
  };
};

export type AnswerPlanningRunMessage = {
  type: typeof MESSAGE_TYPES.answerPlanningRun;
  payload: {
    sessionId: string;
  };
};

export type ProfileDraftSaveMessage = {
  type: typeof MESSAGE_TYPES.profileDraftSave;
  payload: {
    draft: ProfileDraft;
  };
};

export type ProfilePresetAnalyzeMessage = {
  type: typeof MESSAGE_TYPES.profilePresetAnalyze;
  payload: ProfilePresetAnalysisInput;
};

export type RecommendationPreviewFetchMessage = {
  type: typeof MESSAGE_TYPES.recommendationPreviewFetch;
  payload: {
    sessionId: string;
  };
};

export type AnswerPlanReviewSaveMessage = {
  type: typeof MESSAGE_TYPES.answerPlanReviewSave;
  payload: {
    answerPlanId: string;
    reviewStatus: AnswerPlanReviewStatus;
    selectedOptionIds: string[];
  };
};

export type AnswerFillRunMessage = {
  type: typeof MESSAGE_TYPES.answerFillRun;
  payload: {
    sessionId: string;
  };
};

export type SettingsUpdateMessage = {
  type: typeof MESSAGE_TYPES.settingsUpdate;
  payload: {
    settings: Settings;
  };
};

export type SessionFetchMessage = {
  type: typeof MESSAGE_TYPES.sessionFetch;
  payload: {
    sessionId: string;
  };
};

export type SessionLatestFetchMessage = {
  type: typeof MESSAGE_TYPES.sessionLatestFetch;
  payload: EmptyPayload;
};

export type SessionHistoryFetchMessage = {
  type: typeof MESSAGE_TYPES.sessionHistoryFetch;
  payload: {
    limit?: number;
  };
};

export type ProfileFetchMessage = {
  type: typeof MESSAGE_TYPES.profileFetch;
  payload: {
    profileId: string;
  };
};

export type AppMessage =
  | PingMessage
  | ContentMetadataReportMessage
  | ContentQuestionsExtractedMessage
  | ContentQuestionExtractionFailedMessage
  | AnswerPlanningRunMessage
  | RecommendationPreviewFetchMessage
  | AnswerPlanReviewSaveMessage
  | AnswerFillRunMessage
  | ContentExtractionRunMessage
  | ProfileDraftSaveMessage
  | ProfilePresetAnalyzeMessage
  | SettingsFetchMessage
  | SettingsUpdateMessage
  | SessionFetchMessage
  | SessionLatestFetchMessage
  | SessionHistoryFetchMessage
  | ProfileFetchMessage;

export type ProfileFetchResult = Profile | null;
export type RecommendationPreviewFetchResult = RecommendationPreview;
export type AnswerPlanReviewSaveResult = RecommendationPreviewItem;
export type AnswerFillRunResult = {
  sessionId: string;
  filledCount: number;
  siteId: string;
};
export type SessionHistoryFetchResult = SessionHistoryEntry[];

export const CONTENT_COMMAND_TYPES = {
  answerFillApply: "answerFillApply",
  questionExtractionRun: "questionExtractionRun"
} as const;

export type ContentCommandType = (typeof CONTENT_COMMAND_TYPES)[keyof typeof CONTENT_COMMAND_TYPES];

export type ContentAnswerFillSelection = {
  questionId: string;
  questionText: string;
  questionOrder: number;
  selectedOptionIds: string[];
};

export type AnswerFillApplyCommand = {
  type: typeof CONTENT_COMMAND_TYPES.answerFillApply;
  payload: {
    siteId: string;
    sessionId: string;
    allowGenericFallbackFill?: boolean;
    selections: ContentAnswerFillSelection[];
  };
};

export type QuestionExtractionRunCommand = {
  type: typeof CONTENT_COMMAND_TYPES.questionExtractionRun;
  payload: Record<string, never>;
};

export type ContentCommand = AnswerFillApplyCommand | QuestionExtractionRunCommand;

export type AppResultSuccess<TData = unknown> = {
  ok: true;
  data: TData;
};

export type AppResultError = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type AppResult<TData = unknown> = AppResultSuccess<TData> | AppResultError;
