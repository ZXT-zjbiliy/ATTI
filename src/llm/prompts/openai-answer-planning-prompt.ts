import type { Profile, Question } from "../../shared/types";

export function buildOpenAiAnswerPlanningPrompt(args: {
  sessionId: string;
  profile: Profile;
  questions: Question[];
}): string {
  return [
    "Plan answers for the provided personality-assessment questions.",
    "Use the saved local profile as the primary source of truth.",
    "Return exactly one answer plan for every question in the provided Questions array.",
    "Each answer plan must reuse the exact questionId from the input question.",
    "Each recommendedOptionIds entry must contain only option ids that exist on that same question.",
    "Use confidence as a decimal between 0 and 1.",
    "Provide a brief rationale grounded in the saved profile narrative or evidence.",
    "Return JSON only.",
    `Session ID: ${args.sessionId}`,
    `Profile narrative: ${args.profile.narrativeSummary}`,
    `Profile evidence: ${args.profile.evidence.join(" | ")}`,
    `Questions: ${JSON.stringify(
      args.questions.map((question) => ({
        id: question.id,
        text: question.text,
        options: question.options
      }))
    )}`
  ].join("\n");
}
