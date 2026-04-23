import { settingsSchema } from "../../../shared/schemas";
import type {
  AppResult,
  Settings,
  SettingsFetchMessage,
  SettingsUpdateMessage
} from "../../../shared/types";
import { MESSAGE_TYPES } from "../../../shared/types";

export type PopupMessageResult = Promise<AppResult> | AppResult;

export type PopupMessageSender = (
  message: SettingsFetchMessage | SettingsUpdateMessage
) => PopupMessageResult;

type PopupSettingsStorageArea = {
  get(key: string): Promise<Record<string, unknown>> | Record<string, unknown>;
  set(items: Record<string, unknown>): Promise<void> | void;
};

export interface PopupSettingsClient {
  fetchSettings: () => Promise<Settings>;
  updateExtensionEnabled: (extensionEnabled: boolean) => Promise<Settings>;
}

type RuntimeWithSettingsAccess = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (
        message: SettingsFetchMessage | SettingsUpdateMessage
      ) => Promise<AppResult> | AppResult;
    };
    storage?: {
      local?: PopupSettingsStorageArea;
    };
  };
};

const SETTINGS_STORAGE_KEY = "settings";

const defaultSettings: Settings = {
  extensionEnabled: true,
  debugMode: false,
  activeProvider: "openai",
  openAiApiKey: null,
  providerApiKey: null,
  providerBaseUrl: null,
  providerModel: null,
  approvedDomains: [],
  lastActiveProfileId: null,
  featureFlags: {}
};

function cloneSettings(settings: Settings): Settings {
  return {
    ...settings,
    approvedDomains: [...settings.approvedDomains],
    featureFlags: { ...settings.featureFlags }
  };
}

function resolveRuntimeMessageSender(): PopupMessageSender {
  const sendMessage = (globalThis as RuntimeWithSettingsAccess).chrome?.runtime?.sendMessage;

  if (!sendMessage) {
    throw new Error("chrome.runtime.sendMessage is unavailable");
  }

  return async (message) => Promise.resolve(sendMessage(message));
}

function resolvePopupSettingsStorageArea(): PopupSettingsStorageArea | null {
  return (globalThis as RuntimeWithSettingsAccess).chrome?.storage?.local ?? null;
}

function unwrapResult(result: AppResult): Settings {
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data as Settings;
}

async function readSettingsFromStorage(storageArea: PopupSettingsStorageArea): Promise<Settings> {
  const result = await Promise.resolve(storageArea.get(SETTINGS_STORAGE_KEY));
  const rawSettings = result[SETTINGS_STORAGE_KEY];

  if (rawSettings == null) {
    return cloneSettings(defaultSettings);
  }

  return cloneSettings(settingsSchema.parse(rawSettings));
}

async function writeSettingsToStorage(
  storageArea: PopupSettingsStorageArea,
  settings: Settings
): Promise<Settings> {
  const validatedSettings = settingsSchema.parse(settings);

  await Promise.resolve(
    storageArea.set({
      [SETTINGS_STORAGE_KEY]: validatedSettings
    })
  );

  return cloneSettings(validatedSettings);
}

export function createPopupSettingsClient(
  sendMessage: PopupMessageSender = resolveRuntimeMessageSender(),
  storageArea: PopupSettingsStorageArea | null = resolvePopupSettingsStorageArea()
): PopupSettingsClient {
  const fetchSettings = async (): Promise<Settings> => {
    if (storageArea) {
      return readSettingsFromStorage(storageArea);
    }

    const result = await sendMessage({
      type: MESSAGE_TYPES.settingsFetch,
      payload: {}
    });

    return unwrapResult(result);
  };

  return {
    fetchSettings,
    async updateExtensionEnabled(extensionEnabled) {
      const currentSettings = await fetchSettings();
      const nextSettings = {
        ...currentSettings,
        extensionEnabled
      };

      if (storageArea) {
        return writeSettingsToStorage(storageArea, nextSettings);
      }

      const result = await sendMessage({
        type: MESSAGE_TYPES.settingsUpdate,
        payload: {
          settings: nextSettings
        }
      });

      return unwrapResult(result);
    }
  };
}
