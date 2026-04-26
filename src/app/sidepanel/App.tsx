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
    <main className="atti-shell atti-shell--panel">
      <div className="atti-frame">
        <div className="atti-frame__content">
          <header className="atti-hero">
            <span className="atti-hero__eyebrow">AI 问卷工作台</span>
            <h1 className="atti-hero__title">ATTI AI 侧边栏</h1>
            <p className="atti-hero__subtitle">
              当前界面面向 AI-first 多站点路线重排，但真实稳定适配范围仍以 Truity 九型人格试用流为主。
            </p>
          </header>
          <section className="atti-grid atti-grid--columns-2">
            <ProfileStatusCard
              onEvidenceTextChange={model.setProfileDraftEvidenceText}
              onNarrativeSummaryChange={model.setProfileDraftNarrativeSummary}
              onSubmit={() => {
                void model.saveProfileDraft();
              }}
              state={model.profilePanel}
            />
            <PageDetectionStatusCard
              isReextractDisabled={model.isReextractDisabled}
              progress={model.pageDetectionProgress}
              onRefresh={() => {
                void model.refreshPageDetection();
              }}
              onReextract={() => {
                void model.rerunQuestionExtraction();
              }}
              state={model.pageDetectionStatus}
            />
            <SessionStatusCard
              progress={model.sessionProgress}
              isRunAnswerPlanningDisabled={model.isRunAnswerPlanningDisabled}
              isReapplyAnswerFillDisabled={model.isReapplyAnswerFillDisabled}
              onRunAnswerPlanning={() => {
                void model.runAnswerPlanning();
              }}
              onReapplyAnswerFill={() => {
                void model.reapplyAnswerFill();
              }}
              state={model.sessionStatus}
            />
            <RecommendationPreviewCard
              onRefresh={() => {
                void model.refreshRecommendationPreview();
              }}
              state={model.recommendationPreviewStatus}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

export function SidePanelApp() {
  const model = useSidePanelShell();

  return <SidePanelView model={model ?? defaultSidePanelShellModel} />;
}
