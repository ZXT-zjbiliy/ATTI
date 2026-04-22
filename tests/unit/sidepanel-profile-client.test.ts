import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { createProfileDraftClient } from "../../src/app/sidepanel/services/profile-draft-client";
import { createAttiDatabase } from "../../src/storage/db";
import { ProfileRepository } from "../../src/storage/repos/profile-repo";
import { SettingsRepository, type SettingsStorageArea } from "../../src/storage/repos/settings-repo";
import type {
  AppResult,
  ProfileDraftSaveMessage,
  ProfileFetchMessage,
  SettingsFetchMessage
} from "../../src/shared/types";

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

type SupportedSidepanelMessage =
  | ProfileDraftSaveMessage
  | ProfileFetchMessage
  | SettingsFetchMessage;

describe("sidepanel profile draft client", () => {
  it("saves a draft and then reads it back for side panel display", async () => {
    const database = createAttiDatabase("sidepanel-profile-client");
    const profileRepository = new ProfileRepository(database);
    const settingsRepository = new SettingsRepository(new InMemorySettingsStorageArea());
    const sendMessage = async (message: SupportedSidepanelMessage): Promise<AppResult> => {
      if (message.type === "settingsFetch") {
        return {
          ok: true,
          data: await settingsRepository.getSettings()
        };
      }

      if (message.type === "profileDraftSave") {
        const savedProfile = await profileRepository.saveDraft(message.payload.draft);
        const settings = await settingsRepository.getSettings();

        await settingsRepository.saveSettings({
          ...settings,
          lastActiveProfileId: savedProfile.id
        });

        return {
          ok: true,
          data: savedProfile
        };
      }

      return {
        ok: true,
        data: await profileRepository.getProfileById(message.payload.profileId)
      };
    };
    const client = createProfileDraftClient(sendMessage);

    const savedProfile = await client.saveProfileDraft({
      narrativeSummary: "I enjoy reflective work and collaborative planning.",
      evidence: ["Reflect before deciding"]
    });
    const loadedProfile = await client.fetchActiveProfile();

    expect(savedProfile.id).toBeTruthy();
    expect(loadedProfile?.id).toBe(savedProfile.id);
    expect(loadedProfile?.narrativeSummary).toBe(
      "I enjoy reflective work and collaborative planning."
    );

    database.close();
  });
});
