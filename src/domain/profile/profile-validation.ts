import type { Profile, ProfileDraft } from "../../shared/types";

export function mapProfileToDraft(profile: Profile): ProfileDraft {
  return {
    narrativeSummary: profile.narrativeSummary,
    evidence: [...profile.evidence]
  };
}

export function createDraftInput(draft: ProfileDraft): {
  narrativeSummary: string;
  evidenceText: string;
} {
  return {
    narrativeSummary: draft.narrativeSummary,
    evidenceText: draft.evidence.join("\n")
  };
}

export function parseEvidence(evidenceText: string): string[] {
  return evidenceText
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
