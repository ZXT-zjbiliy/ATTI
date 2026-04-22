import { z } from "zod";

import type { Profile, ProfileDraft } from "../types";
import { nonEmptyStringSchema, stringArraySchema, unknownRecordSchema } from "./common";

export const profileDraftSchema = z.object({
  narrativeSummary: nonEmptyStringSchema,
  evidence: stringArraySchema
}) satisfies z.ZodType<ProfileDraft>;

export const profileSchema = z.object({
  id: nonEmptyStringSchema,
  version: z.number().int(),
  rawInput: unknownRecordSchema,
  structuredTraits: unknownRecordSchema,
  narrativeSummary: nonEmptyStringSchema,
  evidence: stringArraySchema,
  createdAt: nonEmptyStringSchema,
  updatedAt: nonEmptyStringSchema
}) satisfies z.ZodType<Profile>;
