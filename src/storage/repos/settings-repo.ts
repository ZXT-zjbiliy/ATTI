import { settingsSchema } from "../../shared/schemas";
import type { Settings } from "../../shared/types";

export const SETTINGS_STORAGE_KEY = "settings";

export const defaultSettings: Settings = {
  extensionEnabled: true,
  debugMode: false,
  activeProvider: "openai",
  openAiApiKey: null,
  approvedDomains: [],
  lastActiveProfileId: null,
  featureFlags: {}
};

export type SettingsStorageArea = {
  get(key: string): Promise<Record<string, unknown>> | Record<string, unknown>;
  set(items: Record<string, unknown>): Promise<void> | void;
};

type GlobalWithChromeStorage = typeof globalThis & {
  chrome?: {
    storage?: {
      local?: SettingsStorageArea;
    };
  };
};

function cloneSettings(settings: Settings): Settings {
  return {
    ...settings,
    approvedDomains: [...settings.approvedDomains],
    featureFlags: { ...settings.featureFlags }
  };
}

function resolveSettingsStorageArea(): SettingsStorageArea {
  const storageArea = (globalThis as GlobalWithChromeStorage).chrome?.storage?.local;

  if (!storageArea) {
    throw new Error("chrome.storage.local is unavailable");
  }

  return storageArea;
}

export class SettingsRepository {
  constructor(private readonly storageArea: SettingsStorageArea = resolveSettingsStorageArea()) {}

  async getSettings(): Promise<Settings> {
    const result = await Promise.resolve(this.storageArea.get(SETTINGS_STORAGE_KEY));
    const rawSettings = result[SETTINGS_STORAGE_KEY];

    if (rawSettings == null) {
      return cloneSettings(defaultSettings);
    }

    return cloneSettings(settingsSchema.parse(rawSettings));
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    const validatedSettings = settingsSchema.parse(settings);

    await Promise.resolve(
      this.storageArea.set({
        [SETTINGS_STORAGE_KEY]: validatedSettings
      })
    );

    return cloneSettings(validatedSettings);
  }
}
