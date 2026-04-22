import type { Profile } from "../../../shared/types";

interface SavedProfileSummaryProps {
  readonly profile: Profile;
}

export function SavedProfileSummary({ profile }: SavedProfileSummaryProps) {
  return (
    <div className="atti-surface">
      <p className="atti-status-text">已保存画像摘要：{profile.narrativeSummary}</p>
      <p className="atti-meta">已记录证据条目：{profile.evidence.length}</p>
    </div>
  );
}
