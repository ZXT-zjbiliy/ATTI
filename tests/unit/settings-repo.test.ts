import { describe, expect, it } from "vitest";

import {
  SettingsRepository,
  type SettingsStorageArea,
  defaultSettings
} from "../../src/storage/repos/settings-repo";

class InMemorySettingsStorageArea implements SettingsStorageArea {
  private readonly records = new Map<string, unknown>();

  get(key: string): Record<string, unknown> {
    return {
      [key]: this.records.get(key)
    };
  }

  set(items: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(items)) {
      this.records.set(key, value);
    }
  }
}

describe("settings repo", () => {
  it("returns default settings when storage is empty", async () => {
    const repository = new SettingsRepository(new InMemorySettingsStorageArea());

    expect(await repository.getSettings()).toEqual(defaultSettings);
  });

  it("normalizes provider fields before persisting", async () => {
    const repository = new SettingsRepository(new InMemorySettingsStorageArea());

    const savedSettings = await repository.saveSettings({
      ...defaultSettings,
      providerApiKey: "  sk-compatible  ",
      providerBaseUrl: " https://api.vectorengine.cn ",
      providerModel: " gpt-4o "
    });

    expect(savedSettings.providerApiKey).toBe("sk-compatible");
    expect(savedSettings.providerBaseUrl).toBe("https://api.vectorengine.cn/v1/chat/completions");
    expect(savedSettings.providerModel).toBe("gpt-4o");
  });
});
