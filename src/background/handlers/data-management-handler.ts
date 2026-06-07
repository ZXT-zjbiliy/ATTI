import type {
  AppResult,
  ProfileExportAllMessage,
  SessionExportAllMessage,
  SessionPurgeCompletedMessage
} from "../../shared/types";
import type { BackgroundMessageHandler } from "./types";

export const handleSessionExportAllMessage: BackgroundMessageHandler<
  SessionExportAllMessage
> = async (_message, context): Promise<AppResult> => {
  const sessions = await context.sessionRepository.listAllSessions();

  return {
    ok: true,
    data: sessions
  };
};

export const handleProfileExportAllMessage: BackgroundMessageHandler<
  ProfileExportAllMessage
> = async (_message, context): Promise<AppResult> => {
  const profiles = await context.profileRepository.listAllProfiles();

  return {
    ok: true,
    data: profiles
  };
};

export const handleSessionPurgeCompletedMessage: BackgroundMessageHandler<
  SessionPurgeCompletedMessage
> = async (_message, context): Promise<AppResult> => {
  const deletedCount = await context.sessionRepository.deleteSessionsByStatus("completed");

  return {
    ok: true,
    data: { deletedCount }
  };
};
