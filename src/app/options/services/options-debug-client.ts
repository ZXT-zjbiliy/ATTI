import type { Profile, Session, SessionHistoryEntry, Settings } from "../../../shared/types";
import { createProfileDraftClient, type ProfileDraftClient } from "../../sidepanel/services/profile-draft-client";
import {
  createOptionsSettingsClient,
  type OptionsSettingsClient
} from "./options-settings-client";
import {
  createSessionDebugClient,
  type SessionDebugClient
} from "./session-debug-client";

export interface DebugSnapshot {
  readonly runtimeName: "options";
  readonly runtimeStatus: "loading" | "ready";
  readonly activeSettings: Settings;
  readonly hasActiveProfileDraft: boolean;
  readonly activeProfileId: string | null;
  readonly lastSessionSummary: string;
  readonly recentSessionHistory: SessionHistoryEntry[];
}

export interface OptionsDebugClient {
  fetchDebugSnapshot: () => Promise<DebugSnapshot>;
}

function buildLastSessionSummary(session: Session | null): string {
  if (!session) {
    return "当前还没有本地会话记录。";
  }

  return `${session.siteId} / ${session.status} / ${session.startedAt}`;
}

export function createOptionsDebugClient(
  settingsClient: OptionsSettingsClient = createOptionsSettingsClient(),
  profileClient: ProfileDraftClient = createProfileDraftClient(),
  sessionClient: SessionDebugClient = createSessionDebugClient(),
): OptionsDebugClient {
  return {
    async fetchDebugSnapshot() {
      const [activeSettings, activeProfile, latestSession, recentSessionHistory] = await Promise.all([
        settingsClient.fetchSettings(),
        profileClient.fetchActiveProfile(),
        sessionClient.fetchLatestSession(),
        sessionClient.fetchRecentSessionHistory()
      ]);

      return {
        runtimeName: "options",
        runtimeStatus: "ready",
        activeSettings,
        hasActiveProfileDraft: activeProfile !== null,
        activeProfileId: (activeProfile as Profile | null)?.id ?? null,
        lastSessionSummary: buildLastSessionSummary(latestSession),
        recentSessionHistory
      };
    }
  };
}
