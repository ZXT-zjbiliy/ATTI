import type { DebugSnapshot } from "../services/options-debug-client";
import { OptionsSection } from "./options-section";

function buildSessionHistoryLabel(args: {
  siteId: string;
  startedAt: string;
  status: string;
  questionCount: number;
  recommendationCount: number;
}) {
  return `${args.siteId} / ${args.startedAt} / ${args.status} / ${args.questionCount} questions / ${args.recommendationCount} recommendations`;
}

interface DebugViewSectionProps {
  readonly snapshot: DebugSnapshot | null;
  readonly isLoading: boolean;
}

export function DebugViewSection({
  snapshot,
  isLoading
}: DebugViewSectionProps) {
  return (
    <OptionsSection title="Debug View">
      {isLoading ? <p>Loading debug snapshot...</p> : null}
      {snapshot ? (
        <div>
          <p>Runtime: {snapshot.runtimeName}</p>
          <p>Runtime status: {snapshot.runtimeStatus}</p>
          <p>Active provider: {snapshot.activeSettings.activeProvider}</p>
          <p>Debug mode: {String(snapshot.activeSettings.debugMode)}</p>
          <p>Profile draft present: {String(snapshot.hasActiveProfileDraft)}</p>
          <p>Active profile id: {snapshot.activeProfileId ?? "none"}</p>
          <p>Last session summary: {snapshot.lastSessionSummary}</p>
          <p>Recent session history:</p>
          {snapshot.recentSessionHistory.length === 0 ? (
            <p>No local session history yet.</p>
          ) : (
            <ul>
              {snapshot.recentSessionHistory.map((entry) => (
                <li key={entry.id}>
                  {buildSessionHistoryLabel({
                    siteId: entry.siteId,
                    startedAt: entry.startedAt,
                    status: entry.status,
                    questionCount: entry.questionCount,
                    recommendationCount: entry.recommendationCount
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </OptionsSection>
  );
}
