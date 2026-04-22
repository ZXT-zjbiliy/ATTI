import type {
  AnswerPlanReviewSaveMessage,
  AppResult,
  RecommendationPreview,
  RecommendationPreviewFetchMessage,
  RecommendationPreviewItem,
  Session,
  SessionLatestFetchMessage
} from "../../../shared/types";
import { MESSAGE_TYPES } from "../../../shared/types";

type SidePanelPreviewMessage =
  | SessionLatestFetchMessage
  | RecommendationPreviewFetchMessage
  | AnswerPlanReviewSaveMessage;

export type RecommendationPreviewMessageSender = (
  message: SidePanelPreviewMessage,
) => Promise<AppResult> | AppResult;

export interface RecommendationPreviewClient {
  fetchLatestPreview: () => Promise<{ session: Session; preview: RecommendationPreview } | null>;
  saveReview: (
    input: AnswerPlanReviewSaveMessage["payload"],
  ) => Promise<RecommendationPreviewItem>;
}

type RuntimeWithMessaging = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (message: SidePanelPreviewMessage) => Promise<AppResult> | AppResult;
    };
  };
};

function resolveRuntimeMessageSender(): RecommendationPreviewMessageSender {
  const sendMessage = (globalThis as RuntimeWithMessaging).chrome?.runtime?.sendMessage;

  if (!sendMessage) {
    throw new Error("chrome.runtime.sendMessage is unavailable");
  }

  return async (message) => Promise.resolve(sendMessage(message));
}

function unwrapResult<TData>(result: AppResult): TData {
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data as TData;
}

export function createRecommendationPreviewClient(
  sendMessage: RecommendationPreviewMessageSender = resolveRuntimeMessageSender(),
): RecommendationPreviewClient {
  return {
    async fetchLatestPreview() {
      const latestSession = unwrapResult<Session | null>(
        await sendMessage({ type: MESSAGE_TYPES.sessionLatestFetch, payload: {} }),
      );

      if (!latestSession) {
        return null;
      }

      const preview = unwrapResult<RecommendationPreview>(
        await sendMessage({
          type: MESSAGE_TYPES.recommendationPreviewFetch,
          payload: { sessionId: latestSession.id },
        }),
      );

      return { session: latestSession, preview };
    },
    async saveReview(input) {
      return unwrapResult<RecommendationPreviewItem>(
        await sendMessage({
          type: MESSAGE_TYPES.answerPlanReviewSave,
          payload: input,
        }),
      );
    }
  };
}
