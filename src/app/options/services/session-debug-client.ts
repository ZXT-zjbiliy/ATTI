import type {
  AppResult,
  Session,
  SessionHistoryEntry,
  SessionHistoryFetchMessage,
  SessionLatestFetchMessage
} from "../../../shared/types";
import { MESSAGE_TYPES } from "../../../shared/types";

export type SessionDebugMessageSender = (
  message: SessionLatestFetchMessage | SessionHistoryFetchMessage,
) => Promise<AppResult> | AppResult;

export interface SessionDebugClient {
  fetchLatestSession: () => Promise<Session | null>;
  fetchRecentSessionHistory: (limit?: number) => Promise<SessionHistoryEntry[]>;
}

type RuntimeWithMessaging = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (
        message: SessionLatestFetchMessage | SessionHistoryFetchMessage,
      ) => Promise<AppResult> | AppResult;
    };
  };
};

function resolveRuntimeMessageSender(): SessionDebugMessageSender {
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

export function createSessionDebugClient(
  sendMessage: SessionDebugMessageSender = resolveRuntimeMessageSender(),
): SessionDebugClient {
  return {
    async fetchLatestSession() {
      const result = await sendMessage({
        type: MESSAGE_TYPES.sessionLatestFetch,
        payload: {}
      });

      return unwrapResult<Session | null>(result);
    },
    async fetchRecentSessionHistory(limit = 5) {
      const result = await sendMessage({
        type: MESSAGE_TYPES.sessionHistoryFetch,
        payload: {
          limit
        }
      });

      return unwrapResult<SessionHistoryEntry[]>(result);
    }
  };
}
