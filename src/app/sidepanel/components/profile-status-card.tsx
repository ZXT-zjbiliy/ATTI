import type { SidePanelProfilePanelState } from "../types/sidepanel-shell";
import { ProfileDraftForm } from "./profile-draft-form";
import { ProfilePresetQuestionnaireForm } from "./profile-preset-questionnaire-form";
import { SavedProfileSummary } from "./saved-profile-summary";
import { StatusCard } from "./status-card";

interface ProfileStatusCardProps {
  readonly state: SidePanelProfilePanelState;
  readonly onPresetAnswerChange: (questionId: string, selectedOptionId: string) => void;
  readonly onPresetSubmit: () => void;
  readonly onNarrativeSummaryChange: (narrativeSummary: string) => void;
  readonly onEvidenceTextChange: (evidenceText: string) => void;
  readonly onSubmit: () => void;
}

export function ProfileStatusCard({
  state,
  onPresetAnswerChange,
  onPresetSubmit,
  onNarrativeSummaryChange,
  onEvidenceTextChange,
  onSubmit
}: ProfileStatusCardProps) {
  return (
    <StatusCard title="本地画像">
      {state.message ? <p className="atti-status-text">{state.message}</p> : null}
      {state.savedProfile ? <SavedProfileSummary profile={state.savedProfile} /> : null}
      <ProfilePresetQuestionnaireForm
        disabled={state.isLoading || state.isSaving || state.isAnalyzingPreset}
        onAnswerChange={onPresetAnswerChange}
        onSubmit={onPresetSubmit}
        selectedAnswers={state.presetAnswers}
      />
      <ProfileDraftForm
        disabled={state.isLoading || state.isSaving || state.isAnalyzingPreset}
        evidenceText={state.draftEvidenceText}
        narrativeSummary={state.draftNarrativeSummary}
        onEvidenceTextChange={onEvidenceTextChange}
        onNarrativeSummaryChange={onNarrativeSummaryChange}
        onSubmit={onSubmit}
      />
    </StatusCard>
  );
}
