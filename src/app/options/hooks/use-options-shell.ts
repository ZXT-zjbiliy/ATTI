import { useEffect, useState } from "react";

import type { Settings } from "../../../shared/types";
import {
  getProviderConfigurationState,
  type ProviderConfigurationState
} from "../../../shared/utils/provider-configuration";
import {
  createOptionsSettingsClient,
  type OptionsSettingsClient
} from "../services/options-settings-client";
import {
  createOptionsDebugClient,
  type DebugSnapshot,
  type OptionsDebugClient
} from "../services/options-debug-client";
import {
  createDataManagementClient,
  type DataManagementClient
} from "../services/data-management-client";

export interface OptionsShellModel {
  readonly settings: Settings | null;
  readonly providerConfiguration: ProviderConfigurationState | null;
  readonly debugSnapshot: DebugSnapshot | null;
  readonly isDebugViewLoading: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly statusMessage: string | null;
  updateDebugMode: (debugMode: boolean) => Promise<void>;
  updateProvider: (activeProvider: string) => Promise<void>;
  updateProviderApiKey: (providerApiKey: string) => Promise<void>;
  updateProviderBaseUrl: (providerBaseUrl: string) => Promise<void>;
  updateProviderModel: (providerModel: string) => Promise<void>;
  exportSessionData: () => Promise<void>;
  exportProfileData: () => Promise<void>;
  purgeCompletedSessionData: () => Promise<void>;
}

export function useOptionsShell(
  settingsClient?: OptionsSettingsClient,
  debugClient?: OptionsDebugClient,
  dataClient?: DataManagementClient
): OptionsShellModel {
  const [stableSettingsClient] = useState<OptionsSettingsClient>(
    () => settingsClient ?? createOptionsSettingsClient()
  );
  const [stableDebugClient] = useState<OptionsDebugClient>(
    () => debugClient ?? createOptionsDebugClient()
  );
  const [stableDataClient] = useState<DataManagementClient>(
    () => dataClient ?? createDataManagementClient()
  );
  const [settings, setSettings] = useState<Settings | null>(null);
  const providerConfiguration = settings ? getProviderConfigurationState(settings) : null;
  const [debugSnapshot, setDebugSnapshot] = useState<DebugSnapshot | null>(null);
  const [isDebugViewLoading, setIsDebugViewLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshDebugSnapshot = async (nextSettings: Settings) => {
    if (!nextSettings.debugMode) {
      setDebugSnapshot(null);
      setIsDebugViewLoading(false);
      return;
    }

    setIsDebugViewLoading(true);

    try {
      const snapshot = await stableDebugClient.fetchDebugSnapshot();
      setDebugSnapshot(snapshot);
    } finally {
      setIsDebugViewLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const nextSettings = await stableSettingsClient.fetchSettings();

        if (!isActive) {
          return;
        }

        setSettings(nextSettings);
        setStatusMessage(null);

        if (nextSettings.debugMode) {
          setIsDebugViewLoading(true);
          const snapshot = await stableDebugClient.fetchDebugSnapshot();

          if (!isActive) {
            return;
          }

          setDebugSnapshot(snapshot);
          setIsDebugViewLoading(false);
        } else {
          setDebugSnapshot(null);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatusMessage(error instanceof Error ? error.message : "无法读取设置。");
        setDebugSnapshot(null);
        setIsDebugViewLoading(false);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [stableDebugClient, stableSettingsClient]);

  function downloadJson(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const applySettingsPatch = async (patch: Partial<Settings>, successMessage: string) => {
    setIsSaving(true);

    try {
      const nextSettings = await stableSettingsClient.updateSettings(patch);
      setSettings(nextSettings);
      await refreshDebugSnapshot(nextSettings);
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "无法保存设置。");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    providerConfiguration,
    debugSnapshot,
    isDebugViewLoading,
    isLoading,
    isSaving,
    statusMessage,
    updateDebugMode: async (debugMode) => {
      await applySettingsPatch({ debugMode }, "设置已保存在本地。");
    },
    updateProvider: async (activeProvider) => {
      const nextProvider = activeProvider === "remote" ? "openai" : activeProvider;
      const nextStatus = getProviderConfigurationState({
        activeProvider: nextProvider,
        openAiApiKey: settings?.openAiApiKey ?? null,
        providerApiKey: settings?.providerApiKey ?? null,
        providerBaseUrl: settings?.providerBaseUrl ?? null,
        providerModel: settings?.providerModel ?? null
      });

      await applySettingsPatch(
        { activeProvider: nextProvider },
        nextStatus.actionMessage ?? "规划引擎偏好已保存在本地。"
      );
    },
    updateProviderApiKey: async (providerApiKey) => {
      const trimmedProviderApiKey = providerApiKey.trim() || null;

      await applySettingsPatch(
        {
          providerApiKey: trimmedProviderApiKey,
          openAiApiKey: trimmedProviderApiKey
        },
        trimmedProviderApiKey
          ? "远程引擎 API key 已保存在本地。"
          : "已从本地设置中移除远程引擎 API key。"
      );
    },
    updateProviderBaseUrl: async (providerBaseUrl) => {
      const trimmedProviderBaseUrl = providerBaseUrl.trim() || null;

      await applySettingsPatch(
        { providerBaseUrl: trimmedProviderBaseUrl },
        trimmedProviderBaseUrl ? "兼容 API URL 已保存在本地。" : "已移除兼容 API URL。"
      );
    },
    updateProviderModel: async (providerModel) => {
      const trimmedProviderModel = providerModel.trim() || null;

      await applySettingsPatch(
        { providerModel: trimmedProviderModel },
        trimmedProviderModel ? "模型名称已保存在本地。" : "已移除模型名称。"
      );
    },
    async exportSessionData() {
      const sessionData = await stableDataClient.exportAllSessions();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      downloadJson(`atti-session-data-${timestamp}.json`, sessionData);
      setStatusMessage(`已导出 ${sessionData.length} 条会话记录。`);
    },
    async exportProfileData() {
      const profileData = await stableDataClient.exportAllProfiles();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      downloadJson(`atti-profile-data-${timestamp}.json`, profileData);
      setStatusMessage(`已导出 ${profileData.length} 份画像。`);
    },
    async purgeCompletedSessionData() {
      const result = await stableDataClient.purgeCompletedSessions();

      setStatusMessage(`已清除 ${result.deletedCount} 条已完成的会话记录。`);
    }
  };
}
