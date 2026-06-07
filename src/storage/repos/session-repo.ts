import { z } from "zod";

import { sessionSchema } from "../../shared/schemas";
import type { Session, SessionHistoryEntry } from "../../shared/types";
import { attiDb, type AttiDatabase } from "../db";

const sessionDraftSchema = z.object({
  siteId: z.string().min(1),
  pageUrl: z.string().min(1),
  profileId: z.string().min(1),
  status: z.string().min(1).default("placeholder-created")
});

const sessionStatusUpdateSchema = z.object({
  sessionId: z.string().min(1),
  status: z.string().min(1),
  finishedAt: z.string().min(1).optional()
});

const sessionPlanningStateUpdateSchema = z.object({
  sessionId: z.string().min(1),
  status: z.string().min(1),
  answerPlanIds: z.array(z.string().min(1)),
  executionLogEntry: z.record(z.string(), z.unknown()),
  finishedAt: z.string().min(1).optional()
});

const sessionFillStateUpdateSchema = z.object({
  sessionId: z.string().min(1),
  status: z.string().min(1),
  executionLogEntry: z.record(z.string(), z.unknown()),
  finishedAt: z.string().min(1).optional()
});

const sessionProfileAssignmentSchema = z.object({
  sessionId: z.string().min(1),
  profileId: z.string().min(1)
});

const sessionQuestionStateUpdateSchema = z.object({
  sessionId: z.string().min(1),
  status: z.string().min(1),
  questionIds: z.array(z.string().min(1)),
  executionLogEntry: z.record(z.string(), z.unknown()).optional()
});

type SessionDraft = z.infer<typeof sessionDraftSchema>;
type SessionStatusUpdate = z.infer<typeof sessionStatusUpdateSchema>;
type SessionPlanningStateUpdate = z.infer<typeof sessionPlanningStateUpdateSchema>;
type SessionFillStateUpdate = z.infer<typeof sessionFillStateUpdateSchema>;
type SessionQuestionStateUpdate = z.infer<typeof sessionQuestionStateUpdateSchema>;
type SessionProfileAssignment = z.infer<typeof sessionProfileAssignmentSchema>;

function cloneSession(session: Session): Session {
  return {
    ...session,
    questionIds: [...session.questionIds],
    answerPlanIds: [...session.answerPlanIds],
    executionLog: session.executionLog.map((entry) => ({ ...entry }))
  };
}

function toSessionHistoryEntry(session: Session): SessionHistoryEntry {
  return {
    id: session.id,
    siteId: session.siteId,
    status: session.status,
    pageUrl: session.pageUrl,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    questionCount: session.questionIds.length,
    recommendationCount: session.answerPlanIds.length
  };
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
}

function buildSessionFromDraft(draft: SessionDraft): Session {
  const now = new Date().toISOString();

  return {
    id: createSessionId(),
    siteId: draft.siteId,
    pageUrl: draft.pageUrl,
    status: draft.status,
    profileId: draft.profileId,
    questionIds: [],
    answerPlanIds: [],
    executionLog: [
      {
        phase: "created",
        source: "session-repo",
        placeholder: true
      }
    ],
    startedAt: now
  };
}

export class SessionRepository {
  constructor(private readonly database: Pick<AttiDatabase, "sessions"> = attiDb) {}

  async createSession(draft: SessionDraft): Promise<Session> {
    const validatedDraft = sessionDraftSchema.parse(draft);
    const session = sessionSchema.parse(buildSessionFromDraft(validatedDraft));

    await this.database.sessions.put(session);

    return cloneSession(session);
  }

  async getSessionById(sessionId: string): Promise<Session | null> {
    const session = await this.database.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    return cloneSession(sessionSchema.parse(session));
  }

  async getLatestSession(): Promise<Session | null> {
    const session = await this.database.sessions.orderBy("startedAt").last();

    if (!session) {
      return null;
    }

    return cloneSession(sessionSchema.parse(session));
  }

  async listRecentSessions(limit = 5): Promise<SessionHistoryEntry[]> {
    const validatedLimit = z.number().int().positive().max(20).parse(limit);
    const sessions = await this.database.sessions
      .orderBy("startedAt")
      .reverse()
      .limit(validatedLimit)
      .toArray();

    return sessions.map((session) => toSessionHistoryEntry(sessionSchema.parse(session)));
  }

  async updateSessionStatus(update: SessionStatusUpdate): Promise<Session> {
    const validatedUpdate = sessionStatusUpdateSchema.parse(update);
    const currentSession = await this.database.sessions.get(validatedUpdate.sessionId);

    if (!currentSession) {
      throw new Error(`Session not found: ${validatedUpdate.sessionId}`);
    }

    const nextSession = sessionSchema.parse({
      ...currentSession,
      status: validatedUpdate.status,
      finishedAt: validatedUpdate.finishedAt ?? currentSession.finishedAt
    });

    await this.database.sessions.put(nextSession);

    return cloneSession(nextSession);
  }

  async updateQuestionState(update: SessionQuestionStateUpdate): Promise<Session> {
    const validatedUpdate = sessionQuestionStateUpdateSchema.parse(update);
    const currentSession = await this.database.sessions.get(validatedUpdate.sessionId);

    if (!currentSession) {
      throw new Error(`Session not found: ${validatedUpdate.sessionId}`);
    }

    const nextSession = sessionSchema.parse({
      ...currentSession,
      status: validatedUpdate.status,
      questionIds: [...validatedUpdate.questionIds],
      executionLog: validatedUpdate.executionLogEntry
        ? [...currentSession.executionLog, { ...validatedUpdate.executionLogEntry }]
        : currentSession.executionLog
    });

    await this.database.sessions.put(nextSession);

    return cloneSession(nextSession);
  }

  async updatePlanningState(update: SessionPlanningStateUpdate): Promise<Session> {
    const validatedUpdate = sessionPlanningStateUpdateSchema.parse(update);
    const currentSession = await this.database.sessions.get(validatedUpdate.sessionId);

    if (!currentSession) {
      throw new Error(`Session not found: ${validatedUpdate.sessionId}`);
    }

    const nextSession = sessionSchema.parse({
      ...currentSession,
      status: validatedUpdate.status,
      answerPlanIds: [...validatedUpdate.answerPlanIds],
      executionLog: [...currentSession.executionLog, { ...validatedUpdate.executionLogEntry }],
      finishedAt: validatedUpdate.finishedAt ?? currentSession.finishedAt
    });

    await this.database.sessions.put(nextSession);

    return cloneSession(nextSession);
  }

  async updateFillState(update: SessionFillStateUpdate): Promise<Session> {
    const validatedUpdate = sessionFillStateUpdateSchema.parse(update);
    const currentSession = await this.database.sessions.get(validatedUpdate.sessionId);

    if (!currentSession) {
      throw new Error(`Session not found: ${validatedUpdate.sessionId}`);
    }

    const nextSession = sessionSchema.parse({
      ...currentSession,
      status: validatedUpdate.status,
      executionLog: [...currentSession.executionLog, { ...validatedUpdate.executionLogEntry }],
      finishedAt: validatedUpdate.finishedAt ?? currentSession.finishedAt
    });

    await this.database.sessions.put(nextSession);

    return cloneSession(nextSession);
  }

  async assignProfileId(assignment: SessionProfileAssignment): Promise<Session> {
    const validatedAssignment = sessionProfileAssignmentSchema.parse(assignment);
    const currentSession = await this.database.sessions.get(validatedAssignment.sessionId);

    if (!currentSession) {
      throw new Error(`Session not found: ${validatedAssignment.sessionId}`);
    }

    const nextSession = sessionSchema.parse({
      ...currentSession,
      profileId: validatedAssignment.profileId
    });

    await this.database.sessions.put(nextSession);

    return cloneSession(nextSession);
  }
}
