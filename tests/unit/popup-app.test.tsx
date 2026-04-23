import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PopupView } from "../../src/app/popup/App";
import { createPopupSettingsClient } from "../../src/app/popup/services/popup-settings-client";
import { openPopupSidePanel } from "../../src/app/popup/services/popup-sidepanel-opener";
import type { PopupShellModel } from "../../src/app/popup/hooks/use-popup-shell";
import type { AppResult, SettingsFetchMessage, SettingsUpdateMessage } from "../../src/shared/types";
import { getProviderConfigurationState } from "../../src/shared/utils/provider-configuration";

function createPopupModel(overrides: Partial<PopupShellModel> = {}): PopupShellModel {
  return {
    extensionEnabled: true,
    providerConfiguration: getProviderConfigurationState({
      activeProvider: "openai",
      openAiApiKey: null,
      providerApiKey: null,
      providerBaseUrl: null,
      providerModel: null
    }),
    isLoading: false,
    isUpdating: false,
    statusMessage: null,
    toggleExtensionEnabled: async () => {},
    openSidePanel: async () => {},
    ...overrides,
  };
}

describe("popup view", () => {
  it("renders the lightweight popup shell", () => {
    const markup = renderToStaticMarkup(
      <PopupView
        model={createPopupModel({
          extensionEnabled: true,
        })}
      />,
    );

    expect(markup).toContain("ATTI");
    expect(markup).toContain("ATTI 智能助手");
    expect(markup).toContain("扩展已启用");
    expect(markup).toContain("启用扩展");
    expect(markup).toContain("打开侧边栏");
    expect(markup).toContain("已选择 OpenAI，但当前设备中的远程引擎配置尚未完成。");
    expect(markup).toContain("请先为 OpenAI 填写 API key，再开始 AI 规划。");
    expect(markup).toContain("画像草稿、本地历史和推荐结果默认保存在当前设备。");
    expect(markup).toContain("当前产品正过渡到 AI-first 多站点路线");
    expect(markup).toContain("不会自动提交问卷");
  });

  it("reflects the current settings state", () => {
    const markup = renderToStaticMarkup(
      <PopupView
        model={createPopupModel({
          extensionEnabled: false,
        })}
      />,
    );

    expect(markup).toContain("扩展已暂停");
    expect(markup).not.toContain("checked=\"\"");
  });
});

describe("popup settings client", () => {
  it("prefers chrome.storage.local for popup settings reads to avoid a background round-trip", async () => {
    const sendMessage = vi.fn();
    const storageArea = {
      get: vi.fn(async () => ({
        settings: {
          extensionEnabled: true,
          debugMode: false,
          activeProvider: "openai",
          openAiApiKey: "sk-local",
          providerApiKey: "sk-local",
          providerBaseUrl: null,
          providerModel: null,
          approvedDomains: [],
          lastActiveProfileId: null,
          featureFlags: {}
        }
      })),
      set: vi.fn(async () => {})
    };
    const client = createPopupSettingsClient(sendMessage, storageArea);

    const settings = await client.fetchSettings();

    expect(settings.openAiApiKey).toBe("sk-local");
    expect(storageArea.get).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("reads the current settings through the shared message contract", async () => {
    const sendMessage = vi.fn(
      async (message: SettingsFetchMessage | SettingsUpdateMessage): Promise<AppResult> => {
        if (message.type === "settingsFetch") {
          return {
            ok: true,
            data: {
              extensionEnabled: false,
              debugMode: false,
              activeProvider: "local",
              openAiApiKey: null,
              providerApiKey: null,
              providerBaseUrl: null,
              providerModel: null,
              approvedDomains: [],
              lastActiveProfileId: null,
              featureFlags: {},
            },
          };
        }

        return {
          ok: true,
          data: message.payload.settings,
        };
      },
    );
    const client = createPopupSettingsClient(sendMessage);

    const settings = await client.fetchSettings();

    expect(settings.extensionEnabled).toBe(false);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: "settingsFetch",
      payload: {},
    });
  });

  it("updates only the extension toggle through settings update messages", async () => {
    const sendMessage = vi.fn(
      async (message: SettingsFetchMessage | SettingsUpdateMessage): Promise<AppResult> => {
        if (message.type === "settingsFetch") {
          return {
            ok: true,
            data: {
              extensionEnabled: true,
              debugMode: false,
              activeProvider: "local",
              openAiApiKey: null,
              providerApiKey: null,
              providerBaseUrl: null,
              providerModel: null,
              approvedDomains: ["example.com"],
              lastActiveProfileId: null,
              featureFlags: {},
            },
          };
        }

        return {
          ok: true,
          data: message.payload.settings,
        };
      },
    );
    const client = createPopupSettingsClient(sendMessage);

    const settings = await client.updateExtensionEnabled(false);

    expect(settings.extensionEnabled).toBe(false);
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: "settingsUpdate",
      payload: {
        settings: {
          extensionEnabled: false,
          debugMode: false,
          activeProvider: "local",
          openAiApiKey: null,
          providerApiKey: null,
          providerBaseUrl: null,
          providerModel: null,
          approvedDomains: ["example.com"],
          lastActiveProfileId: null,
          featureFlags: {},
        },
      },
    });
  });

  it("updates the popup extension toggle directly through chrome.storage.local when available", async () => {
    const sendMessage = vi.fn();
    const storageArea = {
      get: vi.fn(async () => ({
        settings: {
          extensionEnabled: true,
          debugMode: false,
          activeProvider: "local",
          openAiApiKey: null,
          providerApiKey: null,
          providerBaseUrl: null,
          providerModel: null,
          approvedDomains: ["example.com"],
          lastActiveProfileId: null,
          featureFlags: {}
        }
      })),
      set: vi.fn(async () => {})
    };
    const client = createPopupSettingsClient(sendMessage, storageArea);

    const settings = await client.updateExtensionEnabled(false);

    expect(settings.extensionEnabled).toBe(false);
    expect(storageArea.set).toHaveBeenCalledWith({
      settings: {
        extensionEnabled: false,
        debugMode: false,
        activeProvider: "local",
        openAiApiKey: null,
        providerApiKey: null,
        providerBaseUrl: null,
        providerModel: null,
        approvedDomains: ["example.com"],
        lastActiveProfileId: null,
        featureFlags: {}
      }
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe("popup side panel opener", () => {
  it("opens the current window side panel", async () => {
    const open = vi.fn(async () => {});
    const getCurrent = vi.fn(async () => ({ id: 7 }));

    await openPopupSidePanel({ open }, { getCurrent });

    expect(getCurrent).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith({ windowId: 7 });
  });
});

describe("popup module boundaries", () => {
  it("keeps popup code lightweight and free of background implementation imports", () => {
    const popupFiles = [
      "src/app/popup/App.tsx",
      "src/app/popup/components/popup-boundary-summary.tsx",
      "src/app/popup/components/popup-provider-status.tsx",
      "src/app/popup/hooks/use-popup-shell.ts",
      "src/app/popup/services/popup-settings-client.ts",
      "src/app/popup/services/popup-sidepanel-opener.ts",
    ];

    for (const popupFile of popupFiles) {
      const content = readFileSync(resolve(process.cwd(), popupFile), "utf8");

      expect(content).not.toContain("/background/");
      expect(content).not.toContain("/storage/");
      expect(content).not.toContain("/llm/");
      expect(content).not.toContain("/adapters/");
    }
  });
});
