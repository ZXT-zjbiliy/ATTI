import { useEffect, useState } from "react";

import type { Settings } from "../../../shared/types";
import {
  getProviderConfigurationState,
  type ProviderConfigurationState
} from "../../../shared/utils/provider-configuration";
import {
  createOptionsSettingsClient,
  type OptionsSettingsClient,
} from "../services/options-settings-client";
import {
  createOptionsDebugClient,
  type DebugSnapshot,
  type OptionsDebugClient
} from "../services/options-debug-client";

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
  updateOpenAiApiKey: (openAiApiKey: string) => Promise<void>;
}

export function useOptionsShell(
  settingsClient?: OptionsSettingsClient,
  debugClient?: OptionsDebugClient,
): OptionsShellModel {
  const [stableSettingsClient] = useState<OptionsSettingsClient>(
    () => settingsClient ?? createOptionsSettingsClient()
  );
  const [stableDebugClient] = useState<OptionsDebugClient>(
    () => debugClient ?? createOptionsDebugClient()
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

        const message =
          error instanceof Error ? error.message : "Unable to load settings.";
        setStatusMessage(message);
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

  const applySettingsPatch = async (
    patch: Partial<Settings>,
    successMessage: string
  ) => {
    setIsSaving(true);

    try {
      const nextSettings = await stableSettingsClient.updateSettings(patch);
      setSettings(nextSettings);
      await refreshDebugSnapshot(nextSettings);
      setStatusMessage(successMessage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save settings.";
      setStatusMessage(message);
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
      await applySettingsPatch({ debugMode }, "Settings saved locally.");
    },
    updateProvider: async (activeProvider) => {
      const nextProvider = activeProvider === "remote" ? "openai" : activeProvider;
      const nextStatus = getProviderConfigurationState({
        activeProvider: nextProvider,
        openAiApiKey: settings?.openAiApiKey ?? null
      });
      await applySettingsPatch(
        { activeProvider: nextProvider },
        nextStatus.actionMessage ?? "Provider preference saved locally."
      );
    },
    updateOpenAiApiKey: async (openAiApiKey) => {
      const trimmedApiKey = openAiApiKey.trim() || null;
      await applySettingsPatch(
        { openAiApiKey: trimmedApiKey },
        trimmedApiKey
          ? "OpenAI API key saved locally."
          : "OpenAI API key removed from local settings."
      );
    },
  };
}
