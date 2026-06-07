import type {
  AppResult,
  Profile,
  ProfileExportAllMessage,
  Session,
  SessionExportAllMessage,
  SessionPurgeCompletedMessage,
  SessionPurgeCompletedResult
} from "../../../shared/types";
import { MESSAGE_TYPES } from "../../../shared/types";

export type DataManagementMessageSender = (
  message: SessionExportAllMessage | ProfileExportAllMessage | SessionPurgeCompletedMessage
) => Promise<AppResult> | AppResult;

export interface DataManagementClient {
  exportAllSessions: () => Promise<Session[]>;
  exportAllProfiles: () => Promise<Profile[]>;
  purgeCompletedSessions: () => Promise<SessionPurgeCompletedResult>;
}

type RuntimeWithMessaging = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (
        message: SessionExportAllMessage | ProfileExportAllMessage | SessionPurgeCompletedMessage
      ) => Promise<AppResult> | AppResult;
    };
  };
};

function resolveRuntimeMessageSender(): DataManagementMessageSender {
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

export function createDataManagementClient(
  sendMessage: DataManagementMessageSender = resolveRuntimeMessageSender()
): DataManagementClient {
  return {
    async exportAllSessions() {
      const result = await sendMessage({
        type: MESSAGE_TYPES.sessionExportAll,
        payload: {}
      });

      return unwrapResult<Session[]>(result);
    },
    async exportAllProfiles() {
      const result = await sendMessage({
        type: MESSAGE_TYPES.profileExportAll,
        payload: {}
      });

      return unwrapResult<Profile[]>(result);
    },
    async purgeCompletedSessions() {
      const result = await sendMessage({
        type: MESSAGE_TYPES.sessionPurgeCompleted,
        payload: {}
      });

      return unwrapResult<SessionPurgeCompletedResult>(result);
    }
  };
}
