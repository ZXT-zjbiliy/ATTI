import { settingsSchema } from "../../shared/schemas";
import type { Settings } from "../../shared/types";

export const SETTINGS_STORAGE_KEY = "settings";

export const defaultSettings: Settings = {
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

function trimToNull(value: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeProviderBaseUrl(providerBaseUrl: string | null): string | null {
  const trimmedProviderBaseUrl = trimToNull(providerBaseUrl);

  if (!trimmedProviderBaseUrl) {
    return null;
  }

  try {
    const normalizedUrl = new URL(trimmedProviderBaseUrl);

    if (normalizedUrl.pathname === "/" || normalizedUrl.pathname.length === 0) {
      normalizedUrl.pathname = "/v1/chat/completions";
    }

    return normalizedUrl.toString();
  } catch {
    return trimmedProviderBaseUrl;
  }
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
    const normalizedSettings: Settings = {
      ...settings,
      openAiApiKey: trimToNull(settings.openAiApiKey),
      providerApiKey: trimToNull(settings.providerApiKey),
      providerBaseUrl: normalizeProviderBaseUrl(settings.providerBaseUrl),
      providerModel: trimToNull(settings.providerModel)
    };
    const validatedSettings = settingsSchema.parse(normalizedSettings);

    await Promise.resolve(
      this.storageArea.set({
        [SETTINGS_STORAGE_KEY]: validatedSettings
      })
    );

    return cloneSettings(validatedSettings);
  }
}
