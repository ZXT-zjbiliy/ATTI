import type { SidePanelProfilePanelState } from "../types/sidepanel-shell";
import { ProfileDraftForm } from "./profile-draft-form";
import { SavedProfileSummary } from "./saved-profile-summary";
import { StatusCard } from "./status-card";

interface ProfileStatusCardProps {
  readonly state: SidePanelProfilePanelState;
  readonly onNarrativeSummaryChange: (narrativeSummary: string) => void;
  readonly onEvidenceTextChange: (evidenceText: string) => void;
  readonly onSubmit: () => void;
}

export function ProfileStatusCard({
  state,
  onNarrativeSummaryChange,
  onEvidenceTextChange,
  onSubmit
}: ProfileStatusCardProps) {
  return (
    <StatusCard title="本地画像">
      {state.message ? <p className="atti-status-text">{state.message}</p> : null}
      {state.savedProfile ? <SavedProfileSummary profile={state.savedProfile} /> : null}
      <ProfileDraftForm
        disabled={state.isLoading || state.isSaving}
        evidenceText={state.draftEvidenceText}
        narrativeSummary={state.draftNarrativeSummary}
        onEvidenceTextChange={onEvidenceTextChange}
        onNarrativeSummaryChange={onNarrativeSummaryChange}
        onSubmit={onSubmit}
      />
    </StatusCard>
  );
}
