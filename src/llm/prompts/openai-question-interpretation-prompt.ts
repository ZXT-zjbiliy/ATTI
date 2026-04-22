import type { ProfileSummary } from "../providers/assessment-provider";
import type { Question } from "../../shared/types";

export function buildOpenAiQuestionInterpretationPrompt(
  question: Question,
  profileSummary: ProfileSummary
): string {
  return [
    "Interpret the assessment question in the context of the provided profile summary.",
    "Return JSON only.",
    `Question ID: ${question.id}`,
    `Question text: ${question.text}`,
    `Question options: ${JSON.stringify(question.options)}`,
    `Profile summary: ${profileSummary.narrativeSummary}`,
    `Profile evidence: ${profileSummary.evidence.join(" | ")}`
  ].join("\n");
}
