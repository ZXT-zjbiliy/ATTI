import type { Profile } from "../../shared/types";

export function buildOpenAiProfileSummaryPrompt(profile: Profile): string {
  return [
    "Summarize the user's profile for downstream personality-assessment answer planning.",
    "Return JSON only.",
    "When raw preset-questionnaire answers are present, infer stable traits from the selected options instead of merely restating them.",
    `Raw input: ${JSON.stringify(profile.rawInput)}`,
    `Narrative summary: ${profile.narrativeSummary}`,
    `Evidence: ${profile.evidence.join(" | ")}`,
    `Structured traits snapshot: ${JSON.stringify(profile.structuredTraits)}`
  ].join("\n");
}
