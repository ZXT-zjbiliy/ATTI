import { useEffect, useState } from "react";

import {
  getProviderConfigurationState,
  type ProviderConfigurationState
} from "../../../shared/utils/provider-configuration";
import { createPopupSettingsClient, type PopupSettingsClient } from "../services/popup-settings-client";
import { openPopupSidePanel } from "../services/popup-sidepanel-opener";

export interface PopupShellState {
  extensionEnabled: boolean;
  providerConfiguration: ProviderConfigurationState | null;
  isLoading: boolean;
  isUpdating: boolean;
  statusMessage: string | null;
}

export interface PopupShellActions {
  toggleExtensionEnabled: () => Promise<void>;
  openSidePanel: () => Promise<void>;
}

export interface PopupShellModel extends PopupShellState, PopupShellActions {}

export function usePopupShell(
  settingsClient?: PopupSettingsClient,
): PopupShellModel {
  const [stableSettingsClient] = useState<PopupSettingsClient>(
    () => settingsClient ?? createPopupSettingsClient()
  );
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [providerConfiguration, setProviderConfiguration] = useState<ProviderConfigurationState | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const settings = await stableSettingsClient.fetchSettings();
        const nextProviderConfiguration = getProviderConfigurationState(settings);

        if (!isActive) {
          return;
        }

        setExtensionEnabled(settings.extensionEnabled);
        setProviderConfiguration(nextProviderConfiguration);
        setStatusMessage(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : "无法读取扩展状态。";
        setStatusMessage(message);
        setProviderConfiguration(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [stableSettingsClient]);

  return {
    extensionEnabled,
    providerConfiguration,
    isLoading,
    isUpdating,
    statusMessage,
    toggleExtensionEnabled: async () => {
      setIsUpdating(true);

      try {
        const settings = await stableSettingsClient.updateExtensionEnabled(!extensionEnabled);
        setProviderConfiguration(getProviderConfigurationState(settings));
        setExtensionEnabled(settings.extensionEnabled);
        setStatusMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "无法更新扩展状态。";
        setStatusMessage(message);
      } finally {
        setIsUpdating(false);
      }
    },
    openSidePanel: async () => {
      try {
        await openPopupSidePanel();
        setStatusMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "无法打开侧边栏。";
        setStatusMessage(message);
      }
    },
  };
}
