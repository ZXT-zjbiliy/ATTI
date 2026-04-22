import { describe, expect, it } from "vitest";

import { ATTI_DB_STORES } from "../../src/storage/schema";
import {
  defaultSettings,
  SettingsRepository,
  SETTINGS_STORAGE_KEY,
  type SettingsStorageArea
} from "../../src/storage/repos/settings-repo";
import type { Settings } from "../../src/shared/types";

class InMemorySettingsStorageArea implements SettingsStorageArea {
  private store = new Map<string, unknown>();

  get(key: string) {
    return {
      [key]: this.store.get(key)
    };
  }

  set(items: Record<string, unknown>) {
    for (const [key, value] of Object.entries(items)) {
      this.store.set(key, value);
    }
  }
}

describe("settings repository", () => {
  it("returns default settings when no stored record exists", async () => {
    const repository = new SettingsRepository(new InMemorySettingsStorageArea());

    const result = await repository.getSettings();

    expect(result).toEqual(defaultSettings);
  });

  it("saves and loads settings through the dedicated storage path", async () => {
    const storageArea = new InMemorySettingsStorageArea();
    const repository = new SettingsRepository(storageArea);
    const nextSettings: Settings = {
      extensionEnabled: false,
      debugMode: true,
      activeProvider: "remote",
      openAiApiKey: "sk-test",
      approvedDomains: ["example.com"],
      lastActiveProfileId: "profile-1",
      featureFlags: {
        diagnostics: true
      }
    };

    await repository.saveSettings(nextSettings);

    const loadedSettings = await repository.getSettings();
    const rawStoredValue = storageArea.get(SETTINGS_STORAGE_KEY)[SETTINGS_STORAGE_KEY];

    expect(loadedSettings).toEqual(nextSettings);
    expect(rawStoredValue).toEqual(nextSettings);
  });

  it("keeps lightweight settings out of IndexedDB store definitions", () => {
    expect(Object.keys(ATTI_DB_STORES)).not.toContain("settings");
  });
});
