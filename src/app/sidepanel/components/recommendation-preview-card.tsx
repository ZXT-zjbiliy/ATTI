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
      <StatusCard title="Recommendation Preview">
        <button type="button" onClick={onRefresh}>
          Refresh recommendation preview
        </button>
        <SectionStateView state={state} />
      </StatusCard>
    );
  }

  return (
    <StatusCard title="Recommendation Preview">
      <p>{state.message}</p>
      <button type="button" onClick={onRefresh}>
        Refresh recommendation preview
      </button>
      {state.items.map((item) => (
        <RecommendationPreviewItemView key={item.answerPlanId} item={item} />
      ))}
    </StatusCard>
  );
}
