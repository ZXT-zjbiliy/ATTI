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
  ProfilePresetAnalyzeMessage,
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
  | ProfilePresetAnalyzeMessage
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

      if (message.type === "profilePresetAnalyze") {
        const savedProfile = await profileRepository.saveDraft({
          narrativeSummary: `Preset answers: ${message.payload.answers.length}`,
          evidence: ["Generated from preset questionnaire"]
        });
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

  it("sends preset questionnaire answers for profile analysis", async () => {
    const sentMessages: SupportedSidepanelMessage[] = [];
    const client = createProfileDraftClient(async (message) => {
      sentMessages.push(message);

      if (message.type === "settingsFetch") {
        return {
          ok: true,
          data: {
            extensionEnabled: true,
            debugMode: false,
            activeProvider: "local",
            openAiApiKey: null,
            providerApiKey: null,
            providerBaseUrl: null,
            providerModel: null,
            approvedDomains: [],
            lastActiveProfileId: null,
            featureFlags: {}
          }
        };
      }

      return {
        ok: true,
        data: {
          id: "profile-from-preset",
          version: 1,
          rawInput: {},
          structuredTraits: {
            source: "preset"
          },
          narrativeSummary: "Generated profile",
          evidence: ["Preset answer"],
          createdAt: "2026-05-13T00:00:00.000Z",
          updatedAt: "2026-05-13T00:00:00.000Z"
        }
      };
    });

    const profile = await client.analyzeProfilePreset({
      answers: [
        {
          questionId: "energy-source",
          selectedOptionId: "quiet-reflection"
        }
      ]
    });

    expect(profile.id).toBe("profile-from-preset");
    expect(sentMessages.at(-1)).toEqual({
      type: "profilePresetAnalyze",
      payload: {
        answers: [
          {
            questionId: "energy-source",
            selectedOptionId: "quiet-reflection"
          }
        ]
      }
    });
  });
});
