import type { RecommendationPreviewEntryState } from "../types/sidepanel-shell";

interface RecommendationPreviewItemViewProps {
  readonly item: RecommendationPreviewEntryState;
}

export function RecommendationPreviewItemView({ item }: RecommendationPreviewItemViewProps) {
  return (
    <article aria-label={`Recommendation ${item.questionOrder + 1}`}>
      <h3>{item.questionOrder + 1}. {item.questionText}</h3>
      {item.qualityStatus === "degraded" ? (
        <p>Quality: Degraded ({item.qualityIssues.join(", ")})</p>
      ) : null}
      <p>Filled on page: {item.recommendedOptionLabels.join(", ")}</p>
      <p>Confidence: {(item.confidence * 100).toFixed(0)}%</p>
      <p>Rationale: {item.rationale}</p>
    </article>
  );
}
