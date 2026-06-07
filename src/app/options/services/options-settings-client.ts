import type {
  AppResult,
  Settings,
  SettingsFetchMessage,
  SettingsUpdateMessage
} from "../../../shared/types";
import { MESSAGE_TYPES } from "../../../shared/types";

export type OptionsMessageResult = Promise<AppResult> | AppResult;

export type OptionsMessageSender = (
  message: SettingsFetchMessage | SettingsUpdateMessage
) => OptionsMessageResult;

export interface OptionsSettingsClient {
  fetchSettings: () => Promise<Settings>;
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;
}

type RuntimeWithMessaging = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (
        message: SettingsFetchMessage | SettingsUpdateMessage
      ) => Promise<AppResult> | AppResult;
    };
  };
};

function resolveRuntimeMessageSender(): OptionsMessageSender {
  const sendMessage = (globalThis as RuntimeWithMessaging).chrome?.runtime?.sendMessage;

  if (!sendMessage) {
    throw new Error("chrome.runtime.sendMessage is unavailable");
  }

  return async (message) => Promise.resolve(sendMessage(message));
}

function unwrapResult(result: AppResult): Settings {
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data as Settings;
}

export function createOptionsSettingsClient(
  sendMessage: OptionsMessageSender = resolveRuntimeMessageSender()
): OptionsSettingsClient {
  const fetchSettings = async (): Promise<Settings> => {
    const result = await sendMessage({
      type: MESSAGE_TYPES.settingsFetch,
      payload: {}
    });

    return unwrapResult(result);
  };

  return {
    fetchSettings,
    async updateSettings(patch) {
      const currentSettings = await fetchSettings();
      const result = await sendMessage({
        type: MESSAGE_TYPES.settingsUpdate,
        payload: {
          settings: {
            ...currentSettings,
            ...patch
          }
        }
      });

      return unwrapResult(result);
    }
  };
}
