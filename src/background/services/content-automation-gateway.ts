import type {
  AnswerFillApplyCommand,
  AppResult,
  ContentAnswerFillSelection,
  QuestionExtractionRunCommand
} from "../../shared/types";
import { CONTENT_COMMAND_TYPES } from "../../shared/types";

export interface FillExecutionRequest {
  readonly pageUrl: string;
  readonly sessionId: string;
  readonly siteId: string;
  readonly selections: ContentAnswerFillSelection[];
}

export interface FillExecutionResult {
  readonly filledCount: number;
  readonly siteId: string;
}

export interface ContentAutomationGateway {
  applyAnswerFill(request: FillExecutionRequest): Promise<FillExecutionResult>;
  runQuestionExtraction(request: { pageUrl: string; sessionId: string }): Promise<{ questionCount: number }>;
}

interface BrowserTab {
  readonly id?: number;
  readonly url?: string;
}

interface BrowserTabsApi {
  query(queryInfo: Record<string, unknown>): Promise<BrowserTab[]>;
  sendMessage(tabId: number, message: AnswerFillApplyCommand | QuestionExtractionRunCommand): Promise<AppResult>;
}

type GlobalWithChromeTabs = typeof globalThis & {
  chrome?: {
    tabs?: BrowserTabsApi;
  };
};

function createError(message: string): Error {
  return new Error(message);
}

function resolveTabsApi(): BrowserTabsApi {
  const tabs = (globalThis as GlobalWithChromeTabs).chrome?.tabs;

  if (!tabs) {
    throw createError("chrome.tabs is unavailable for content automation.");
  }

  return tabs;
}

function findTargetTab(tabs: BrowserTab[], pageUrl: string, sessionId: string) {
  const targetTab = tabs.find((tab) => tab.url === pageUrl);

  if (!targetTab?.id) {
    throw createError(`Unable to find an open assessment tab for session: ${sessionId}`);
  }

  return targetTab;
}

export function createChromeContentAutomationGateway(
  tabsApi: BrowserTabsApi = resolveTabsApi()
): ContentAutomationGateway {
  return {
    async applyAnswerFill(request) {
      const targetTab = findTargetTab(await tabsApi.query({}), request.pageUrl, request.sessionId);
      const result = await tabsApi.sendMessage(targetTab.id, {
        type: CONTENT_COMMAND_TYPES.answerFillApply,
        payload: {
          siteId: request.siteId,
          sessionId: request.sessionId,
          selections: request.selections.map((selection) => ({
            ...selection,
            selectedOptionIds: [...selection.selectedOptionIds]
          }))
        }
      });

      if (!result.ok) {
        throw createError(result.error.message);
      }

      return {
        siteId: request.siteId,
        filledCount: (result.data as { filledCount?: number }).filledCount ?? 0
      };
    },
    async runQuestionExtraction(request) {
      const targetTab = findTargetTab(await tabsApi.query({}), request.pageUrl, request.sessionId);
      const result = await tabsApi.sendMessage(targetTab.id, {
        type: CONTENT_COMMAND_TYPES.questionExtractionRun,
        payload: {}
      });

      if (!result.ok) {
        throw createError(result.error.message);
      }

      return {
        questionCount: (result.data as { questionCount?: number }).questionCount ?? 0
      };
    }
  };
}
