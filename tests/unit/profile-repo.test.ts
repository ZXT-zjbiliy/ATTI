import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { createAttiDatabase } from "../../src/storage/db";
import { ProfileRepository } from "../../src/storage/repos/profile-repo";

describe("profile repository", () => {
  it("saves and reads a minimal profile draft", async () => {
    const database = createAttiDatabase("profile-repo-save-read");
    const repository = new ProfileRepository(database);

    const savedProfile = await repository.saveDraft({
      narrativeSummary: "I value collaborative, reflective work.",
      evidence: ["Prefer thoughtful teamwork", "Enjoy structured planning"]
    });
    const loadedProfile = await repository.getProfileById(savedProfile.id);

    expect(loadedProfile).toEqual(savedProfile);
    expect(savedProfile.structuredTraits).toEqual({});
    expect(savedProfile.rawInput).toEqual({
      narrativeSummary: "I value collaborative, reflective work.",
      evidence: ["Prefer thoughtful teamwork", "Enjoy structured planning"]
    });

    database.close();
  });

  it("rejects invalid drafts before persistence", async () => {
    const database = createAttiDatabase("profile-repo-invalid");
    const repository = new ProfileRepository(database);

    await expect(
      repository.saveDraft({
        narrativeSummary: "",
        evidence: []
      })
    ).rejects.toThrow();
    await expect(database.profiles.count()).resolves.toBe(0);

    database.close();
  });
});
