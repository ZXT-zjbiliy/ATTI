import type { Profile, ProfileDraft } from "../../shared/types";

export function cloneProfile(profile: Profile): Profile {
  return {
    ...profile,
    rawInput: { ...profile.rawInput },
    structuredTraits: { ...profile.structuredTraits },
    evidence: [...profile.evidence]
  };
}

export function createProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `profile-${Date.now()}`;
}

export function buildProfileFromDraft(draft: ProfileDraft): Profile {
  const now = new Date().toISOString();

  return {
    id: createProfileId(),
    version: 1,
    rawInput: {
      narrativeSummary: draft.narrativeSummary,
      evidence: [...draft.evidence]
    },
    structuredTraits: {},
    narrativeSummary: draft.narrativeSummary,
    evidence: [...draft.evidence],
    createdAt: now,
    updatedAt: now
  };
}
