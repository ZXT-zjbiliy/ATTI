import { profileDraftSchema } from "../../../shared/schemas";
import type {
  AppResult,
  Profile,
  ProfileDraft,
  ProfileDraftSaveMessage,
  ProfileFetchMessage,
  Settings,
  SettingsFetchMessage
} from "../../../shared/types";
import { MESSAGE_TYPES } from "../../../shared/types";

type SidePanelProfileMessage =
  | ProfileDraftSaveMessage
  | ProfileFetchMessage
  | SettingsFetchMessage;

export type SidePanelMessageSender = (
  message: SidePanelProfileMessage,
) => Promise<AppResult> | AppResult;

export interface ProfileDraftClient {
  fetchActiveProfile: () => Promise<Profile | null>;
  fetchSettings: () => Promise<Settings>;
  saveProfileDraft: (draft: ProfileDraft) => Promise<Profile>;
}

type RuntimeWithMessaging = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (message: SidePanelProfileMessage) => Promise<AppResult> | AppResult;
    };
  };
};

function resolveRuntimeMessageSender(): SidePanelMessageSender {
  const sendMessage = (globalThis as RuntimeWithMessaging).chrome?.runtime?.sendMessage;

  if (!sendMessage) {
    throw new Error("chrome.runtime.sendMessage is unavailable");
  }

  return async (message) => Promise.resolve(sendMessage(message));
}

function unwrapResult<TData>(result: AppResult): TData {
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data as TData;
}

export function createProfileDraftClient(
  sendMessage: SidePanelMessageSender = resolveRuntimeMessageSender(),
): ProfileDraftClient {
  const fetchSettings = async () => {
    const settingsResult = await sendMessage({
      type: MESSAGE_TYPES.settingsFetch,
      payload: {}
    });

    return unwrapResult<Settings>(settingsResult);
  };

  return {
    fetchSettings,
    async fetchActiveProfile() {
      const settings = await fetchSettings();

      if (!settings.lastActiveProfileId) {
        return null;
      }

      const profileResult = await sendMessage({
        type: MESSAGE_TYPES.profileFetch,
        payload: {
          profileId: settings.lastActiveProfileId
        }
      });

      return unwrapResult<Profile>(profileResult);
    },
    async saveProfileDraft(draft) {
      const validatedDraft = profileDraftSchema.parse(draft);
      const result = await sendMessage({
        type: MESSAGE_TYPES.profileDraftSave,
        payload: {
          draft: validatedDraft
        }
      });

      return unwrapResult<Profile>(result);
    }
  };
}
