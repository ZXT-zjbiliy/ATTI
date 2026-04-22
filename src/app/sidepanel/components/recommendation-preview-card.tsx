import type { RecommendationPreviewState } from "../types/sidepanel-shell";
import { RecommendationPreviewItemView } from "./recommendation-preview-item-view";
import { SectionStateView } from "./section-state-view";
import { StatusCard } from "./status-card";

interface RecommendationPreviewCardProps {
  readonly state: RecommendationPreviewState;
  readonly onRefresh: () => void;
}

export function RecommendationPreviewCard({ state, onRefresh }: RecommendationPreviewCardProps) {
  if (state.kind !== "ready") {
    return (
      <StatusCard title="AI 推荐预览">
        <button className="atti-button atti-button--secondary" type="button" onClick={onRefresh}>
          刷新推荐预览
        </button>
        <SectionStateView state={state} />
      </StatusCard>
    );
  }

  return (
    <StatusCard title="AI 推荐预览">
      <p className="atti-status-text">{state.message}</p>
      <button className="atti-button atti-button--secondary" type="button" onClick={onRefresh}>
        刷新推荐预览
      </button>
      {state.items.map((item) => (
        <RecommendationPreviewItemView key={item.answerPlanId} item={item} />
      ))}
    </StatusCard>
  );
}
