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
import { createActiveTabClient, type ActiveTabClient } from "./active-tab-client";

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

function matchesSessionPageUrl(sessionPageUrl: string, activeTabUrl: string): boolean {
  try {
    const sessionUrl = new URL(sessionPageUrl);
    const activeUrl = new URL(activeTabUrl);

    return sessionUrl.origin === activeUrl.origin && sessionUrl.pathname === activeUrl.pathname;
  } catch {
    return sessionPageUrl === activeTabUrl;
  }
}

export function createRecommendationPreviewClient(
  sendMessage: RecommendationPreviewMessageSender = resolveRuntimeMessageSender(),
  activeTabClient: ActiveTabClient = createActiveTabClient(),
): RecommendationPreviewClient {
  return {
    async fetchLatestPreview() {
      const latestSession = unwrapResult<Session | null>(
        await sendMessage({ type: MESSAGE_TYPES.sessionLatestFetch, payload: {} }),
      );

      if (!latestSession) {
        return null;
      }

      const activeTabUrl = await activeTabClient.fetchActiveTabUrl();

      if (!activeTabUrl || !matchesSessionPageUrl(latestSession.pageUrl, activeTabUrl)) {
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
