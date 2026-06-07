export interface PopupSidePanelApi {
  open: (options: { windowId: number }) => Promise<void> | void;
}

export interface PopupWindowApi {
  getCurrent: () => Promise<{ id?: number }> | { id?: number };
}

type GlobalWithSidePanel = typeof globalThis & {
  chrome?: {
    sidePanel?: PopupSidePanelApi;
    windows?: PopupWindowApi;
  };
};

function resolveSidePanelApi(): PopupSidePanelApi {
  const sidePanelApi = (globalThis as GlobalWithSidePanel).chrome?.sidePanel;

  if (!sidePanelApi) {
    throw new Error("chrome.sidePanel is unavailable");
  }

  return sidePanelApi;
}

function resolveWindowApi(): PopupWindowApi {
  const windowApi = (globalThis as GlobalWithSidePanel).chrome?.windows;

  if (!windowApi) {
    throw new Error("chrome.windows is unavailable");
  }

  return windowApi;
}

export async function openPopupSidePanel(
  sidePanelApi: PopupSidePanelApi = resolveSidePanelApi(),
  windowApi: PopupWindowApi = resolveWindowApi()
): Promise<void> {
  const currentWindow = await Promise.resolve(windowApi.getCurrent());

  if (currentWindow.id == null) {
    throw new Error("current window id is unavailable");
  }

  await Promise.resolve(
    sidePanelApi.open({
      windowId: currentWindow.id
    })
  );
}
