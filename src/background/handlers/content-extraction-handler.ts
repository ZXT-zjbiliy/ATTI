import type { AppResult, ContentExtractionRunMessage } from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";

export const handleContentExtractionRunMessage: BackgroundMessageHandler<
  ContentExtractionRunMessage
> = async (message, context): Promise<AppResult> => {
  const session = await context.sessionRepository.getSessionById(message.payload.sessionId);

  if (!session) {
    return {
      ok: false,
      error: {
        code: "SESSION_NOT_FOUND",
        message: `Session not found: ${message.payload.sessionId}`
      }
    };
  }

  const result = await context.contentAutomationGateway?.runQuestionExtraction({
    pageUrl: session.pageUrl,
    sessionId: session.id
  });

  return {
    ok: true,
    data: {
      sessionId: session.id,
      questionCount: result?.questionCount ?? 0
    }
  };
};
