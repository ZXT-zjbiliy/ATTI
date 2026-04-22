export type SessionExecutionLogEntry = {
  [key: string]: unknown;
};

export type Session = {
  id: string;
  siteId: string;
  pageUrl: string;
  status: string;
  profileId: string;
  questionIds: string[];
  answerPlanIds: string[];
  executionLog: SessionExecutionLogEntry[];
  startedAt: string;
  finishedAt?: string;
};

export type SessionHistoryEntry = {
  id: string;
  siteId: string;
  status: string;
  pageUrl: string;
  startedAt: string;
  finishedAt?: string;
  questionCount: number;
  recommendationCount: number;
};
