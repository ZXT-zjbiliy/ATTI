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

function normalizeContentCommandError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Receiving end does not exist")) {
    return createError(
      "当前测试页面还没有接收到扩展内容脚本。请刷新测试页面后重试；如果你刚刚重新加载过扩展，这是浏览器的正常限制。"
    );
  }

  if (message.includes("Could not establish connection")) {
    return createError("无法连接当前测试页面，请刷新页面后重试。");
  }

  return createError(message);
}

function resolveTabsApi(): BrowserTabsApi {
  const tabs = (globalThis as GlobalWithChromeTabs).chrome?.tabs;

  if (!tabs) {
    throw createError("chrome.tabs is unavailable for content automation.");
  }

  return tabs;
}

function findTargetTab(
  tabs: BrowserTab[],
  pageUrl: string,
  sessionId: string
): BrowserTab & { id: number } {
  const targetTab = tabs.find((tab) => tab.url === pageUrl);

  if (!targetTab || targetTab.id == null) {
    throw createError(`Unable to find an open assessment tab for session: ${sessionId}`);
  }

  return {
    ...targetTab,
    id: targetTab.id
  };
}

export function createChromeContentAutomationGateway(
  tabsApi: BrowserTabsApi = resolveTabsApi()
): ContentAutomationGateway {
  return {
    async applyAnswerFill(request) {
      const targetTab = findTargetTab(await tabsApi.query({}), request.pageUrl, request.sessionId);
      const targetTabId = targetTab.id;
      let result: AppResult;

      try {
        result = await tabsApi.sendMessage(targetTabId, {
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
      } catch (error) {
        throw normalizeContentCommandError(error);
      }

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
      const targetTabId = targetTab.id;
      let result: AppResult;

      try {
        result = await tabsApi.sendMessage(targetTabId, {
          type: CONTENT_COMMAND_TYPES.questionExtractionRun,
          payload: {}
        });
      } catch (error) {
        throw normalizeContentCommandError(error);
      }

      if (!result.ok) {
        throw createError(result.error.message);
      }

      return {
        questionCount: (result.data as { questionCount?: number }).questionCount ?? 0
      };
    }
  };
}
