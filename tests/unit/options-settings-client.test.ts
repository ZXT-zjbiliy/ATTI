import { describe, expect, it } from "vitest";

import { createOptionsSettingsClient } from "../../src/app/options/services/options-settings-client";
import { createPopupSettingsClient } from "../../src/app/popup/services/popup-settings-client";
import { SettingsRepository, type SettingsStorageArea } from "../../src/storage/repos/settings-repo";
import type {
  AppResult,
  SettingsFetchMessage,
  SettingsUpdateMessage,
} from "../../src/shared/types";

class InMemorySettingsStorageArea implements SettingsStorageArea {
  private readonly records = new Map<string, unknown>();

  get(key: string): Record<string, unknown> {
    return {
      [key]: this.records.get(key),
    };
  }

  set(items: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(items)) {
      this.records.set(key, value);
    }
  }
}

function createSettingsMessageDispatcher(
  settingsRepository: SettingsRepository,
) {
  return async (
    message: SettingsFetchMessage | SettingsUpdateMessage,
  ): Promise<AppResult> => {
    if (message.type === "settingsFetch") {
      return {
        ok: true,
        data: await settingsRepository.getSettings(),
      };
    }

    return {
      ok: true,
      data: await settingsRepository.saveSettings(message.payload.settings),
    };
  };
}

describe("options settings client", () => {
  it("keeps settings across a simulated refresh", async () => {
    const storageArea = new InMemorySettingsStorageArea();
    const settingsRepository = new SettingsRepository(storageArea);
    const sendMessage = createSettingsMessageDispatcher(settingsRepository);
    const firstClient = createOptionsSettingsClient(sendMessage);

    await firstClient.updateSettings({
      debugMode: true,
      activeProvider: "openai",
      openAiApiKey: "sk-test"
    });

    const refreshedClient = createOptionsSettingsClient(sendMessage);
    const refreshedSettings = await refreshedClient.fetchSettings();

    expect(refreshedSettings.debugMode).toBe(true);
    expect(refreshedSettings.activeProvider).toBe("openai");
    expect(refreshedSettings.openAiApiKey).toBe("sk-test");
  });

  it("shares the same settings source as popup", async () => {
    const storageArea = new InMemorySettingsStorageArea();
    const settingsRepository = new SettingsRepository(storageArea);
    const sendMessage = createSettingsMessageDispatcher(settingsRepository);
    const optionsClient = createOptionsSettingsClient(sendMessage);
    const popupClient = createPopupSettingsClient(sendMessage);

    await optionsClient.updateSettings({
      debugMode: true,
      activeProvider: "openai",
      openAiApiKey: "sk-test"
    });

    const popupSettings = await popupClient.fetchSettings();

    expect(popupSettings.debugMode).toBe(true);
    expect(popupSettings.activeProvider).toBe("openai");
    expect(popupSettings.openAiApiKey).toBe("sk-test");
  });
});
