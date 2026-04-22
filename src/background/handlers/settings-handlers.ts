import type { AppResult, SettingsFetchMessage, SettingsUpdateMessage } from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";

export const handleSettingsFetchMessage: BackgroundMessageHandler<SettingsFetchMessage> = async (
  _message,
  context
): Promise<AppResult> => {
  const settings = await context.settingsRepository.getSettings();

  return {
    ok: true,
    data: settings
  };
};

export const handleSettingsUpdateMessage: BackgroundMessageHandler<SettingsUpdateMessage> = async (
  message,
  context
): Promise<AppResult> => {
  const settings = await context.settingsRepository.saveSettings(message.payload.settings);

  return {
    ok: true,
    data: settings
  };
};
