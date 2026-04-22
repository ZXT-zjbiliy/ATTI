import type {
  AppResult,
  ProfileDraftSaveMessage,
  ProfileFetchMessage
} from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";

function createErrorResult(code: string, message: string): AppResult {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export const handleProfileDraftSaveMessage: BackgroundMessageHandler<ProfileDraftSaveMessage> = async (
  message,
  context
): Promise<AppResult> => {
  const profile = await context.profileRepository.saveDraft(message.payload.draft);
  const settings = await context.settingsRepository.getSettings();

  await context.settingsRepository.saveSettings({
    ...settings,
    lastActiveProfileId: profile.id
  });

  return {
    ok: true,
    data: profile
  };
};

export const handleProfileFetchMessage: BackgroundMessageHandler<ProfileFetchMessage> = async (
  message,
  context
): Promise<AppResult> => {
  const profile = await context.profileRepository.getProfileById(message.payload.profileId);

  if (!profile) {
    return createErrorResult("PROFILE_NOT_FOUND", `Profile not found: ${message.payload.profileId}`);
  }

  return {
    ok: true,
    data: profile
  };
};
