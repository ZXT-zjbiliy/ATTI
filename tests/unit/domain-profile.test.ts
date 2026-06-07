import { describe, expect, it } from "vitest";

import {
  mapProfileToDraft,
  createDraftInput,
  parseEvidence
} from "../../src/domain/profile/profile-validation";
import {
  cloneProfile,
  buildProfileFromDraft
} from "../../src/domain/profile/profile-normalization";
import type { Profile } from "../../src/shared/types";

const sampleProfile: Profile = {
  id: "profile-1",
  version: 1,
  rawInput: { narrativeSummary: "raw", evidence: ["e1"] },
  structuredTraits: { style: "reflective" },
  narrativeSummary: "Structured and cooperative",
  evidence: ["prefers structure", "works well in teams"],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-06-01T00:00:00.000Z"
};

describe("profile validation", () => {
  it("maps a profile to a draft preserving narrative and evidence", () => {
    const draft = mapProfileToDraft(sampleProfile);

    expect(draft.narrativeSummary).toBe("Structured and cooperative");
    expect(draft.evidence).toEqual(["prefers structure", "works well in teams"]);
  });

  it("creates a draft input with newline-joined evidence", () => {
    const draft = mapProfileToDraft(sampleProfile);
    const input = createDraftInput(draft);

    expect(input.narrativeSummary).toBe("Structured and cooperative");
    expect(input.evidenceText).toBe("prefers structure\nworks well in teams");
  });

  it("parses evidence text into trimmed non-empty lines", () => {
    expect(parseEvidence("  line one  \n\n  line two  \n  \n  line three  ")).toEqual([
      "line one",
      "line two",
      "line three"
    ]);
  });

  it("returns empty array for blank evidence text", () => {
    expect(parseEvidence("")).toEqual([]);
    expect(parseEvidence("   \n  \n  ")).toEqual([]);
  });
});

describe("profile normalization", () => {
  it("clones a profile with independent nested objects", () => {
    const cloned = cloneProfile(sampleProfile);

    expect(cloned).toEqual(sampleProfile);
    expect(cloned).not.toBe(sampleProfile);
    expect(cloned.rawInput).not.toBe(sampleProfile.rawInput);
    expect(cloned.structuredTraits).not.toBe(sampleProfile.structuredTraits);
    expect(cloned.evidence).not.toBe(sampleProfile.evidence);
  });

  it("builds a profile from a draft with generated id and timestamps", () => {
    const profile = buildProfileFromDraft({
      narrativeSummary: "Test narrative",
      evidence: ["evidence-1", "evidence-2"]
    });

    expect(profile.id).toBeTruthy();
    expect(profile.version).toBe(1);
    expect(profile.narrativeSummary).toBe("Test narrative");
    expect(profile.evidence).toEqual(["evidence-1", "evidence-2"]);
    expect(profile.rawInput).toEqual({
      narrativeSummary: "Test narrative",
      evidence: ["evidence-1", "evidence-2"]
    });
    expect(profile.structuredTraits).toEqual({});
    expect(profile.createdAt).toBeTruthy();
    expect(profile.updatedAt).toBeTruthy();
    expect(profile.createdAt).toBe(profile.updatedAt);
  });
});
