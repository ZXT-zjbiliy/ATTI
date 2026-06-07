import type { RecommendationPreviewState } from "../types/sidepanel-shell";
import { RecommendationPreviewItemView } from "./recommendation-preview-item-view";
import { SectionStateView } from "./section-state-view";
import { StatusCard } from "./status-card";

interface RecommendationPreviewCardProps {
  readonly state: RecommendationPreviewState;
  readonly isApplyAnswerFillDisabled: boolean;
  readonly onApplyAnswerFill: () => void;
  readonly onRefresh: () => void;
}

export function RecommendationPreviewCard({
  state,
  isApplyAnswerFillDisabled,
  onApplyAnswerFill,
  onRefresh
}: RecommendationPreviewCardProps) {
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
      <button
        className="atti-button"
        disabled={isApplyAnswerFillDisabled || !state.items.some((item) => item.hasRecommendation)}
        type="button"
        onClick={onApplyAnswerFill}
      >
        应用推荐填写
      </button>
      {state.items.map((item) => (
        <RecommendationPreviewItemView key={item.answerPlanId} item={item} />
      ))}
    </StatusCard>
  );
}
