import type { AnswerPlan } from "../../shared/types";

const DEGRADE_CONFIDENCE_THRESHOLD = 0.5;
const PLACEHOLDER_RATIONALE_PATTERNS = [
  "placeholder",
  "todo",
  "tbd",
  "recommendation for"
] as const;

function normalizeRationaleForQualityCheck(rationale: string): string {
  return rationale.trim().replace(/\s+/g, " ").toLowerCase();
}

function getQualityIssues(answerPlan: AnswerPlan): string[] {
  const qualityIssues: string[] = [];
  const normalizedRationale = normalizeRationaleForQualityCheck(answerPlan.rationale);

  if (answerPlan.confidence < DEGRADE_CONFIDENCE_THRESHOLD) {
    qualityIssues.push("low-confidence");
  }

  if (
    PLACEHOLDER_RATIONALE_PATTERNS.some((pattern) => normalizedRationale.includes(pattern))
  ) {
    qualityIssues.push("placeholder-rationale");
  }

  return qualityIssues;
}

export function applyAnswerPlanQualityBaseline(answerPlans: AnswerPlan[]): AnswerPlan[] {
  return answerPlans.map((answerPlan) => {
    const qualityIssues = getQualityIssues(answerPlan);

    return {
      ...answerPlan,
      recommendedOptionIds: [...answerPlan.recommendedOptionIds],
      selectedOptionIds: [...answerPlan.selectedOptionIds],
      qualityStatus: qualityIssues.length > 0 ? "degraded" : "normal",
      qualityIssues
    };
  });
}
