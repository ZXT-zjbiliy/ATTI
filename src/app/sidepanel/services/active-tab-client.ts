type BrowserTab = {
  readonly url?: string;
  readonly active?: boolean;
};

type BrowserTabsApi = {
  query(queryInfo: Record<string, unknown>): Promise<BrowserTab[]> | BrowserTab[];
};

type RuntimeWithTabs = typeof globalThis & {
  chrome?: {
    tabs?: BrowserTabsApi;
  };
};

export interface ActiveTabClient {
  fetchActiveTabUrl: () => Promise<string | null>;
}

function isExtensionProtocol(url: string): boolean {
  return (
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge-extension://") ||
    url.startsWith("moz-extension://")
  );
}

function isWebPageUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function resolveCandidateUrl(tabs: BrowserTab[]): string | null {
  const activeTabUrl = tabs.find((tab) => tab.active)?.url ?? null;

  if (activeTabUrl && !isExtensionProtocol(activeTabUrl)) {
    return activeTabUrl;
  }

  const recentWebTabUrl = tabs.find((tab) => {
    const url = tab.url ?? "";

    return isWebPageUrl(url);
  })?.url;

  return recentWebTabUrl ?? null;
}

function resolveTabsApi(): BrowserTabsApi | null {
  return (globalThis as RuntimeWithTabs).chrome?.tabs ?? null;
}

export function createActiveTabClient(tabsApi: BrowserTabsApi | null = resolveTabsApi()): ActiveTabClient {
  return {
    async fetchActiveTabUrl() {
      if (!tabsApi) {
        return null;
      }

      const tabs = await Promise.resolve(
        tabsApi.query({
          currentWindow: true
        })
      );

      return resolveCandidateUrl(tabs);
    }
  };
}
