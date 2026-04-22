export type RawProfileInput = Record<string, unknown>;

export type StructuredTraits = Record<string, unknown>;

export type ProfileDraft = {
  narrativeSummary: string;
  evidence: string[];
};

export type Profile = {
  id: string;
  version: number;
  rawInput: RawProfileInput;
  structuredTraits: StructuredTraits;
  narrativeSummary: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
};
