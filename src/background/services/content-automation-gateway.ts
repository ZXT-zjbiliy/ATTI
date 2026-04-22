import type {
  AnswerFillApplyCommand,
  AppResult,
  ContentAnswerFillSelection
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
}

interface BrowserTab {
  readonly id?: number;
  readonly url?: string;
}

interface BrowserTabsApi {
  query(queryInfo: Record<string, unknown>): Promise<BrowserTab[]>;
  sendMessage(tabId: number, message: AnswerFillApplyCommand): Promise<AppResult>;
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

export function createChromeContentAutomationGateway(
  tabsApi: BrowserTabsApi = resolveTabsApi()
): ContentAutomationGateway {
  return {
    async applyAnswerFill(request) {
      const tabs = await tabsApi.query({});
      const targetTab = tabs.find((tab) => tab.url === request.pageUrl);

      if (!targetTab?.id) {
        throw createError(`Unable to find an open assessment tab for session: ${request.sessionId}`);
      }

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
    }
  };
}
