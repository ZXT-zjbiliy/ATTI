import type {
  AppResult,
  SessionFetchMessage,
  SessionHistoryFetchMessage,
  SessionLatestFetchMessage
} from "../../shared/types";
import type { BackgroundHandlerContext, BackgroundMessageHandler } from "./types";

function createErrorResult(code: string, message: string): AppResult {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export const handleSessionFetchMessage: BackgroundMessageHandler<SessionFetchMessage> = async (
  message,
  context: BackgroundHandlerContext
): Promise<AppResult> => {
  const session = await context.sessionRepository.getSessionById(message.payload.sessionId);

  if (!session) {
    return createErrorResult("SESSION_NOT_FOUND", `Session not found: ${message.payload.sessionId}`);
  }

  return {
    ok: true,
    data: session
  };
};

export const handleSessionLatestFetchMessage: BackgroundMessageHandler<SessionLatestFetchMessage> = async (
  _message,
  context: BackgroundHandlerContext
): Promise<AppResult> => {
  const session = await context.sessionRepository.getLatestSession();

  return {
    ok: true,
    data: session
  };
};

export const handleSessionHistoryFetchMessage: BackgroundMessageHandler<SessionHistoryFetchMessage> = async (
  message,
  context: BackgroundHandlerContext
): Promise<AppResult> => {
  const history = await context.sessionRepository.listRecentSessions(message.payload.limit ?? 5);

  return {
    ok: true,
    data: history
  };
};
