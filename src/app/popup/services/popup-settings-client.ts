import type {
  AppResult,
  Settings,
  SettingsFetchMessage,
  SettingsUpdateMessage,
} from "../../../shared/types";
import { MESSAGE_TYPES } from "../../../shared/types";

export type PopupMessageResult = Promise<AppResult> | AppResult;

export type PopupMessageSender = (
  message: SettingsFetchMessage | SettingsUpdateMessage,
) => PopupMessageResult;

export interface PopupSettingsClient {
  fetchSettings: () => Promise<Settings>;
  updateExtensionEnabled: (extensionEnabled: boolean) => Promise<Settings>;
}

type RuntimeWithMessaging = typeof globalThis & {
  chrome?: {
    runtime?: {
      sendMessage?: (
        message: SettingsFetchMessage | SettingsUpdateMessage,
      ) => Promise<AppResult> | AppResult;
    };
  };
};

function resolveRuntimeMessageSender(): PopupMessageSender {
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

export function createPopupSettingsClient(
  sendMessage: PopupMessageSender = resolveRuntimeMessageSender(),
): PopupSettingsClient {
  const fetchSettings = async (): Promise<Settings> => {
    const result = await sendMessage({
      type: MESSAGE_TYPES.settingsFetch,
      payload: {},
    });

    return unwrapResult(result);
  };

  return {
    fetchSettings,
    async updateExtensionEnabled(extensionEnabled) {
      const currentSettings = await fetchSettings();
      const result = await sendMessage({
        type: MESSAGE_TYPES.settingsUpdate,
        payload: {
          settings: {
            ...currentSettings,
            extensionEnabled,
          },
        },
      });

      return unwrapResult(result);
    },
  };
}
