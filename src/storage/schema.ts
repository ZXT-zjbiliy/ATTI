export const ATTI_DB_NAME = "atti-db";
export const ATTI_DB_VERSION = 1;

export const ATTI_DB_STORES = {
  profiles: "id, updatedAt",
  sessions: "id, siteId, startedAt",
  questions: "id, sessionId, siteId",
  answerPlans: "id, sessionId, questionId",
  adapterDiagnostics: "id, sessionId, siteId"
} as const;

export type AttiDbStoreName = keyof typeof ATTI_DB_STORES;
