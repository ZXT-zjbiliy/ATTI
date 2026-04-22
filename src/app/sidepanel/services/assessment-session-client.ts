import type {
  AnswerFillRunMessage,
  AnswerFillRunResult,
  AnswerPlanningRunMessage,
  AppResult
} from "../../../shared/types";
import { MESSAGE_TYPES } from "../../../shared/types";

export type AssessmentSessionMessageSender = (
  message: AnswerPlanningRunMessage | AnswerFillRunMessage,
) => Promise<AppResult> | AppResult;

export interface AssessmentSessionClient {
  runAnswerPlanning: (sessionId: string) => Promise<{ answerPlanCount: number }>;
  applyReviewedAnswers: (sessionId: string) => Promise<AnswerFillRunResult>;
}

type RuntimeWithMessaging = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (
        message: AnswerPlanningRunMessage | AnswerFillRunMessage,
      ) => Promise<AppResult> | AppResult;
    };
  };
};

function resolveRuntimeMessageSender(): AssessmentSessionMessageSender {
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

export function createAssessmentSessionClient(
  sendMessage: AssessmentSessionMessageSender = resolveRuntimeMessageSender(),
): AssessmentSessionClient {
  return {
    async runAnswerPlanning(sessionId) {
      return unwrapResult<{ answerPlanCount: number }>(
        await sendMessage({
          type: MESSAGE_TYPES.answerPlanningRun,
          payload: {
            sessionId
          }
        })
      );
    },
    async applyReviewedAnswers(sessionId) {
      return unwrapResult<AnswerFillRunResult>(
        await sendMessage({
          type: MESSAGE_TYPES.answerFillRun,
          payload: {
            sessionId
          }
        })
      );
    }
  };
}
