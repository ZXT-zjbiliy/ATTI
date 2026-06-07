import { profileDraftSchema, profileSchema } from "../../shared/schemas";
import type { Profile, ProfileDraft } from "../../shared/types";
import { cloneProfile, buildProfileFromDraft } from "../../domain/profile/profile-normalization";
import { attiDb, type AttiDatabase } from "../db";

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

  async listAllProfiles(): Promise<Profile[]> {
    const profiles = await this.database.profiles.toArray();

    return profiles.map((profile) => cloneProfile(profileSchema.parse(profile)));
  }
}
