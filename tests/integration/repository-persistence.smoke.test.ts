import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { createAttiDatabase } from "../../src/storage/db";
import { AdapterDiagnosticsRepository } from "../../src/storage/repos/adapter-diagnostics-repo";
import { ProfileRepository } from "../../src/storage/repos/profile-repo";
import { SessionRepository } from "../../src/storage/repos/session-repo";

const databaseNames = ["integration-repository-persistence-smoke"];

afterEach(async () => {
  for (const databaseName of databaseNames) {
    const database = createAttiDatabase(databaseName);
    database.close();
    await database.delete();
  }
});

describe("integration: repository persistence smoke", () => {
  it("persists profile, session, and diagnostics records across repository boundaries", async () => {
    const database = createAttiDatabase("integration-repository-persistence-smoke");
    const profileRepository = new ProfileRepository(database);
    const sessionRepository = new SessionRepository(database);
    const adapterDiagnosticsRepository = new AdapterDiagnosticsRepository(database);

    const profile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer deliberate, structured collaboration.",
      evidence: ["I document decisions", "I review options before acting"]
    });
    const session = await sessionRepository.createSession({
      siteId: "placeholder-assessment",
      pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
      profileId: profile.id,
      status: "placeholder-created"
    });
    const updatedSession = await sessionRepository.updateSessionStatus({
      sessionId: session.id,
      status: "placeholder-complete",
      finishedAt: "2026-04-21T10:00:00.000Z"
    });
    const diagnostic = await adapterDiagnosticsRepository.writeDiagnostic({
      sessionId: session.id,
      siteId: session.siteId,
      selectorVersion: "placeholder-v1",
      phase: "smoke-test",
      message: "repository persistence smoke diagnostic",
      payload: {
        matchedNodes: 1,
        flags: ["placeholder"]
      }
    });

    const loadedProfile = await profileRepository.getProfileById(profile.id);
    const loadedSession = await sessionRepository.getSessionById(session.id);
    const latestSession = await sessionRepository.getLatestSession();
    const diagnostics = await adapterDiagnosticsRepository.listBySessionId(session.id);

    expect(loadedProfile).toEqual(profile);
    expect(loadedSession).toEqual(updatedSession);
    expect(latestSession).toEqual(updatedSession);
    expect(diagnostics).toEqual([diagnostic]);
    await expect(database.profiles.count()).resolves.toBe(1);
    await expect(database.sessions.count()).resolves.toBe(1);
    await expect(database.adapterDiagnostics.count()).resolves.toBe(1);

    database.close();
  });
});
