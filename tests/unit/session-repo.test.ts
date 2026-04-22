import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { createAttiDatabase } from "../../src/storage/db";
import { ProfileRepository } from "../../src/storage/repos/profile-repo";
import { SessionRepository } from "../../src/storage/repos/session-repo";

describe("session repository", () => {
  it("creates and reads a minimal session record", async () => {
    const database = createAttiDatabase("session-repo-create-read");
    const repository = new SessionRepository(database);

    const createdSession = await repository.createSession({
      siteId: "placeholder-assessment",
      pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
      profileId: "profile-1",
      status: "placeholder-created"
    });
    const loadedSession = await repository.getSessionById(createdSession.id);

    expect(loadedSession).toEqual(createdSession);
    expect(createdSession.questionIds).toEqual([]);
    expect(createdSession.answerPlanIds).toEqual([]);
    expect(createdSession.executionLog).toEqual([
      {
        phase: "created",
        source: "session-repo",
        placeholder: true
      }
    ]);

    database.close();
  });

  it("keeps session records isolated from profile records", async () => {
    const database = createAttiDatabase("session-repo-isolation");
    const profileRepository = new ProfileRepository(database);
    const sessionRepository = new SessionRepository(database);

    const profile = await profileRepository.saveDraft({
      narrativeSummary: "I prefer careful planning.",
      evidence: ["Think before acting"]
    });
    const session = await sessionRepository.createSession({
      siteId: "placeholder-assessment",
      pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
      profileId: profile.id,
      status: "placeholder-created"
    });

    await expect(database.profiles.count()).resolves.toBe(1);
    await expect(database.sessions.count()).resolves.toBe(1);
    await expect(profileRepository.getProfileById(profile.id)).resolves.toEqual(profile);
    await expect(sessionRepository.getSessionById(session.id)).resolves.toEqual(session);

    database.close();
  });

  it("persists session status updates correctly", async () => {
    const database = createAttiDatabase("session-repo-status-update");
    const repository = new SessionRepository(database);
    const createdSession = await repository.createSession({
      siteId: "placeholder-assessment",
      pageUrl: "https://placeholder.assessment.local/assessment-shell/demo",
      profileId: "profile-1",
      status: "placeholder-created"
    });

    const finishedAt = "2025-01-02T03:04:05.000Z";
    const updatedSession = await repository.updateSessionStatus({
      sessionId: createdSession.id,
      status: "placeholder-complete",
      finishedAt
    });
    const loadedSession = await repository.getSessionById(createdSession.id);

    expect(updatedSession.status).toBe("placeholder-complete");
    expect(updatedSession.finishedAt).toBe(finishedAt);
    expect(loadedSession?.status).toBe("placeholder-complete");
    expect(loadedSession?.finishedAt).toBe(finishedAt);

    database.close();
  });

  it("records planning state and answer plan ids", async () => {
    const database = createAttiDatabase("session-repo-planning-state");
    const repository = new SessionRepository(database);
    const createdSession = await repository.createSession({
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      profileId: "profile-1",
      status: "questions-extracted"
    });

    const updatedSession = await repository.updatePlanningState({
      sessionId: createdSession.id,
      status: "answer-planning-complete",
      answerPlanIds: ["plan-1", "plan-2"],
      executionLogEntry: {
        phase: "answer-planning",
        providerId: "openai-assessment-provider",
        answerPlanCount: 2
      }
    });

    expect(updatedSession.status).toBe("answer-planning-complete");
    expect(updatedSession.answerPlanIds).toEqual(["plan-1", "plan-2"]);
    expect(updatedSession.executionLog.at(-1)).toEqual({
      phase: "answer-planning",
      providerId: "openai-assessment-provider",
      answerPlanCount: 2
    });

    database.close();
  });

  it("records fill state updates and completion metadata", async () => {
    const database = createAttiDatabase("session-repo-fill-state");
    const repository = new SessionRepository(database);
    const createdSession = await repository.createSession({
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      profileId: "profile-1",
      status: "answer-planning-complete"
    });

    const finishedAt = "2025-01-03T03:04:05.000Z";
    const updatedSession = await repository.updateFillState({
      sessionId: createdSession.id,
      status: "answer-fill-complete",
      finishedAt,
      executionLogEntry: {
        phase: "answer-fill",
        source: "answerFillRun",
        filledCount: 2
      }
    });

    expect(updatedSession.status).toBe("answer-fill-complete");
    expect(updatedSession.finishedAt).toBe(finishedAt);
    expect(updatedSession.executionLog.at(-1)).toEqual({
      phase: "answer-fill",
      source: "answerFillRun",
      filledCount: 2
    });

    database.close();
  });

  it("rebinds a session to the active profile when the profile is saved later", async () => {
    const database = createAttiDatabase("session-repo-profile-assignment");
    const repository = new SessionRepository(database);
    const createdSession = await repository.createSession({
      siteId: "truity-enneagram",
      pageUrl: "https://www.truity.com/test/enneagram-personality-test",
      profileId: "profile-pending",
      status: "questions-extracted"
    });

    const updatedSession = await repository.assignProfileId({
      sessionId: createdSession.id,
      profileId: "profile-1"
    });

    expect(updatedSession.profileId).toBe("profile-1");
    await expect(repository.getSessionById(createdSession.id)).resolves.toMatchObject({
      id: createdSession.id,
      profileId: "profile-1"
    });

    database.close();
  });

  it("lists recent session history entries in reverse chronological order", async () => {
    const database = createAttiDatabase("session-repo-recent-history");
    const repository = new SessionRepository(database);
    const firstSession = await repository.createSession({
      siteId: "site-a",
      pageUrl: "https://example.com/a",
      profileId: "profile-1",
      status: "questions-extracted"
    });
    await repository.updateQuestionState({
      sessionId: firstSession.id,
      status: "questions-extracted",
      questionIds: ["question-1", "question-2"]
    });
    await repository.updatePlanningState({
      sessionId: firstSession.id,
      status: "answer-planning-complete",
      answerPlanIds: ["plan-1"],
      executionLogEntry: {
        phase: "answer-planning",
        source: "test"
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    const secondSession = await repository.createSession({
      siteId: "site-b",
      pageUrl: "https://example.com/b",
      profileId: "profile-1",
      status: "answer-fill-complete"
    });
    await repository.updateQuestionState({
      sessionId: secondSession.id,
      status: "questions-extracted",
      questionIds: ["question-3"]
    });

    const history = await repository.listRecentSessions(1);

    expect(history).toEqual([
      {
        id: secondSession.id,
        siteId: "site-b",
        status: "questions-extracted",
        pageUrl: "https://example.com/b",
        startedAt: secondSession.startedAt,
        questionCount: 1,
        recommendationCount: 0
      }
    ]);

    database.close();
  });
});
