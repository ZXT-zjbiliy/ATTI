import type { Profile } from "../../../shared/types";

interface SavedProfileSummaryProps {
  readonly profile: Profile;
}

export function SavedProfileSummary({ profile }: SavedProfileSummaryProps) {
  return (
    <div>
      <p>Saved profile summary: {profile.narrativeSummary}</p>
      <p>Saved evidence count: {profile.evidence.length}</p>
    </div>
  );
}
