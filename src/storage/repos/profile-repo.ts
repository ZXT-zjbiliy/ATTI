import { profileDraftSchema, profileSchema } from "../../shared/schemas";
import type { Profile, ProfileDraft } from "../../shared/types";
import { attiDb, type AttiDatabase } from "../db";

function cloneProfile(profile: Profile): Profile {
  return {
    ...profile,
    rawInput: { ...profile.rawInput },
    structuredTraits: { ...profile.structuredTraits },
    evidence: [...profile.evidence]
  };
}

function createProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `profile-${Date.now()}`;
}

function buildProfileFromDraft(draft: ProfileDraft): Profile {
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

export class ProfileRepository {
  constructor(private readonly database: Pick<AttiDatabase, "profiles"> = attiDb) {}

  async saveDraft(draft: ProfileDraft): Promise<Profile> {
    const validatedDraft = profileDraftSchema.parse(draft);
    const profile = profileSchema.parse(buildProfileFromDraft(validatedDraft));

    await this.database.profiles.put(profile);

    return cloneProfile(profile);
  }

  async saveProfile(profile: Profile): Promise<Profile> {
    const validatedProfile = profileSchema.parse(profile);

    await this.database.profiles.put(validatedProfile);

    return cloneProfile(validatedProfile);
  }

  async getProfileById(profileId: string): Promise<Profile | null> {
    const profile = await this.database.profiles.get(profileId);

    if (!profile) {
      return null;
    }

    return cloneProfile(profileSchema.parse(profile));
  }
}
