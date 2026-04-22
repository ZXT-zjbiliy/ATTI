import { describe, expect, it, vi } from "vitest";

import { createOptionsDebugClient } from "../../src/app/options/services/options-debug-client";
import type { OptionsSettingsClient } from "../../src/app/options/services/options-settings-client";
import type { ProfileDraftClient } from "../../src/app/sidepanel/services/profile-draft-client";
import type { SessionDebugClient } from "../../src/app/options/services/session-debug-client";

describe("options debug client", () => {
  it("reuses existing services to build a read-only debug snapshot", async () => {
    const settingsClient: OptionsSettingsClient = {
      fetchSettings: vi.fn(async () => ({
        extensionEnabled: true,
        debugMode: true,
        activeProvider: "local",
        openAiApiKey: null,
        approvedDomains: [],
        lastActiveProfileId: "profile-1",
        featureFlags: {}
      })),
      updateSettings: vi.fn(async () => {
        throw new Error("debug client must stay read-only");
      })
    };
    const profileClient: ProfileDraftClient = {
      fetchActiveProfile: vi.fn(async () => ({
        id: "profile-1",
        version: 1,
        rawInput: {
          narrativeSummary: "Profile summary",
          evidence: ["evidence-1"]
        },
        structuredTraits: {},
        narrativeSummary: "Profile summary",
        evidence: ["evidence-1"],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z"
      })),
      saveProfileDraft: vi.fn(async () => {
        throw new Error("debug client must stay read-only");
      })
    };
    const sessionClient: SessionDebugClient = {
      fetchLatestSession: vi.fn(async () => ({
        id: "session-1",
        siteId: "placeholder-assessment",
        pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
        status: "placeholder-created",
        profileId: "profile-1",
        questionIds: [],
        answerPlanIds: [],
        executionLog: [],
        startedAt: "2025-01-01T00:00:00.000Z"
      })),
      fetchRecentSessionHistory: vi.fn(async () => [
        {
          id: "session-1",
          siteId: "placeholder-assessment",
          status: "placeholder-created",
          pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
          startedAt: "2025-01-01T00:00:00.000Z",
          questionCount: 0,
          recommendationCount: 0
        }
      ])
    };
    const client = createOptionsDebugClient(
      settingsClient,
      profileClient,
      sessionClient,
    );

    const snapshot = await client.fetchDebugSnapshot();

    expect(snapshot.runtimeName).toBe("options");
    expect(snapshot.activeProfileId).toBe("profile-1");
    expect(snapshot.hasActiveProfileDraft).toBe(true);
    expect(snapshot.lastSessionSummary).toContain("placeholder-assessment");
    expect(snapshot.recentSessionHistory).toEqual([
      {
        id: "session-1",
        siteId: "placeholder-assessment",
        status: "placeholder-created",
        pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
        startedAt: "2025-01-01T00:00:00.000Z",
        questionCount: 0,
        recommendationCount: 0
      }
    ]);
    expect(settingsClient.fetchSettings).toHaveBeenCalledTimes(1);
    expect(profileClient.fetchActiveProfile).toHaveBeenCalledTimes(1);
    expect(sessionClient.fetchLatestSession).toHaveBeenCalledTimes(1);
    expect(sessionClient.fetchRecentSessionHistory).toHaveBeenCalledTimes(1);
  });
});
