import type {
  AppResult,
  ContentQuestionExtractionFailedMessage,
  ContentQuestionsExtractedMessage,
} from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";

function createProfilePointer(profileId: string | null): string {
  return profileId ?? "profile-pending";
}

export const handleContentQuestionsExtractedMessage: BackgroundMessageHandler<
  ContentQuestionsExtractedMessage
> = async (message, context): Promise<AppResult> => {
  const settings = await context.settingsRepository.getSettings();
  const session = await context.sessionRepository.createSession({
    siteId: message.payload.siteId,
    pageUrl: message.payload.page.url,
    profileId: createProfilePointer(settings.lastActiveProfileId),
    status: "questions-extracted"
  });

  const persistedQuestions = await Promise.all(
    message.payload.questions.map((question) =>
      context.questionRepository.createQuestion({
        sessionId: session.id,
        siteId: message.payload.siteId,
        pageUrl: message.payload.page.url,
        section: question.section,
        text: question.text,
        type: question.type,
        options: question.options.map((option) => ({ ...option })),
        order: question.order
      })
    )
  );
  const updatedSession = await context.sessionRepository.updateQuestionState({
    sessionId: session.id,
    status: "questions-extracted",
    questionIds: persistedQuestions.map((question) => question.id),
    executionLogEntry: {
      phase: "question-extraction",
      source: "contentQuestionsExtracted",
      siteId: message.payload.siteId,
      questionCount: persistedQuestions.length
    }
  });

  return {
    ok: true,
    data: {
      sessionId: updatedSession.id,
      siteId: message.payload.siteId,
      questionCount: persistedQuestions.length
    }
  };
};

export const handleContentQuestionExtractionFailedMessage: BackgroundMessageHandler<
  ContentQuestionExtractionFailedMessage
> = async (message, context): Promise<AppResult> => {
  const settings = await context.settingsRepository.getSettings();
  const session = await context.sessionRepository.createSession({
    siteId: message.payload.siteId,
    pageUrl: message.payload.page.url,
    profileId: createProfilePointer(settings.lastActiveProfileId),
    status: "question-extraction-failed"
  });

  await context.adapterDiagnosticsRepository.writeDiagnostic({
    sessionId: session.id,
    siteId: message.payload.siteId,
    selectorVersion: "truity-enneagram-v1",
    phase: message.payload.phase,
    message: message.payload.message,
    payload: message.payload.payload
  });

  return {
    ok: false,
    error: {
      code: "QUESTION_EXTRACTION_FAILED",
      message: message.payload.message
    }
  };
};
