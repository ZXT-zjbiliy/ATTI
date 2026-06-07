import type {
  AppResult,
  ContentPageMetadata,
  ContentQuestionExtractionFailedMessage,
  ContentQuestionsExtractedMessage,
  ContentMetadataReportMessage,
  ExtractedQuestionDraft
} from "../shared/types";
import { MESSAGE_TYPES } from "../shared/types";

export type ContentRuntimeMessage =
  | ContentMetadataReportMessage
  | ContentQuestionsExtractedMessage
  | ContentQuestionExtractionFailedMessage;

export type ContentRuntimeMessageSender = (
  message: ContentRuntimeMessage
) => Promise<AppResult> | AppResult;

type GlobalWithChromeRuntime = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (message: ContentRuntimeMessage) => Promise<AppResult> | AppResult;
    };
  };
};

export function resolveRuntimeMessageSender(): ContentRuntimeMessageSender {
  const sendMessage = (globalThis as GlobalWithChromeRuntime).chrome?.runtime?.sendMessage;

  if (!sendMessage) {
    throw new Error("chrome.runtime.sendMessage is unavailable");
  }

  return async (message) => Promise.resolve(sendMessage(message));
}

export async function reportContentPageMetadata(
  page: ContentPageMetadata,
  sendMessage: ContentRuntimeMessageSender = resolveRuntimeMessageSender()
): Promise<AppResult> {
  return Promise.resolve(
    sendMessage({
      type: MESSAGE_TYPES.contentMetadataReport,
      payload: {
        page
      }
    })
  );
}

export async function reportExtractedQuestions(
  args: {
    siteId: string;
    page: ContentPageMetadata;
    questions: ExtractedQuestionDraft[];
  },
  sendMessage: ContentRuntimeMessageSender = resolveRuntimeMessageSender()
): Promise<AppResult> {
  return Promise.resolve(
    sendMessage({
      type: MESSAGE_TYPES.contentQuestionsExtracted,
      payload: args
    })
  );
}

export async function reportQuestionExtractionFailure(
  args: ContentQuestionExtractionFailedMessage["payload"],
  sendMessage: ContentRuntimeMessageSender = resolveRuntimeMessageSender()
): Promise<AppResult> {
  return Promise.resolve(
    sendMessage({
      type: MESSAGE_TYPES.contentQuestionExtractionFailed,
      payload: args
    })
  );
}
