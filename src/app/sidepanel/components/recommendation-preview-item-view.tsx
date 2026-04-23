import type { RecommendationPreviewEntryState } from "../types/sidepanel-shell";

interface RecommendationPreviewItemViewProps {
  readonly item: RecommendationPreviewEntryState;
}

export function RecommendationPreviewItemView({ item }: RecommendationPreviewItemViewProps) {
  const title = `${item.questionOrder + 1}. ${item.questionText}`;

  return (
    <article aria-label={`推荐 ${item.questionOrder + 1}`} className="atti-surface atti-recommendation">
      <h3 className="atti-recommendation__title">{title}</h3>
      {item.qualityStatus === "degraded" ? (
        <p className="atti-alert atti-alert--warning">
          质量状态：已降级（{item.qualityIssues.join(", ")}）
        </p>
      ) : null}
      {item.hasRecommendation ? (
        <>
          <p className="atti-status-text">页面填写：{item.recommendedOptionLabels.join(", ")}</p>
          <p className="atti-status-text">置信度：{(item.confidence * 100).toFixed(0)}%</p>
          <p className="atti-status-text">理由说明：{item.rationale}</p>
        </>
      ) : (
        <p className="atti-status-text">已提取题目，等待 AI 推荐。</p>
      )}
    </article>
  );
}
