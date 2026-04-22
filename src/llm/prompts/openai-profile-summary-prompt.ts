import type { Profile } from "../../shared/types";

export function buildOpenAiProfileSummaryPrompt(profile: Profile): string {
  return [
    "Summarize the user's profile for downstream personality-assessment answer planning.",
    "Return JSON only.",
    `Narrative summary: ${profile.narrativeSummary}`,
    `Evidence: ${profile.evidence.join(" | ")}`,
    `Structured traits snapshot: ${JSON.stringify(profile.structuredTraits)}`
  ].join("\n");
}
