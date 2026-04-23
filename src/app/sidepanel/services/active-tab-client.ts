type BrowserTab = {
  readonly url?: string;
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
          active: true,
          currentWindow: true
        })
      );

      return tabs[0]?.url ?? null;
    }
  };
}
