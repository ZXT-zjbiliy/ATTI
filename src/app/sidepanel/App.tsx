import { useSidePanelShell } from "./hooks/use-sidepanel-shell";
import { defaultSidePanelShellModel } from "./data/default-sidepanel-shell-model";
import { PageDetectionStatusCard } from "./components/page-detection-status-card";
import { ProfileStatusCard } from "./components/profile-status-card";
import { RecommendationPreviewCard } from "./components/recommendation-preview-card";
import { SessionStatusCard } from "./components/session-status-card";
import type { SidePanelShellModel } from "./types/sidepanel-shell";

interface SidePanelViewProps {
  readonly model: SidePanelShellModel;
}

export function SidePanelView({ model }: SidePanelViewProps) {
  return (
    <main>
      <header>
        <h1>ATTI Side Panel</h1>
        <p>Assessment status and recommendations will appear here.</p>
      </header>
      <ProfileStatusCard
        onEvidenceTextChange={model.setProfileDraftEvidenceText}
        onNarrativeSummaryChange={model.setProfileDraftNarrativeSummary}
        onSubmit={() => {
          void model.saveProfileDraft();
        }}
        state={model.profilePanel}
      />
      <PageDetectionStatusCard state={model.pageDetectionStatus} />
      <SessionStatusCard
        isRunAnswerPlanningDisabled={model.isRunAnswerPlanningDisabled}
        onRunAnswerPlanning={() => {
          void model.runAnswerPlanning();
        }}
        state={model.sessionStatus}
      />
      <RecommendationPreviewCard
        onRefresh={() => {
          void model.refreshRecommendationPreview();
        }}
        state={model.recommendationPreviewStatus}
      />
    </main>
  );
}

export function SidePanelApp() {
  const model = useSidePanelShell();

  return <SidePanelView model={model ?? defaultSidePanelShellModel} />;
}
