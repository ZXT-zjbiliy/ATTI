import { z } from "zod";

import type { Settings } from "../types";
import {
  booleanRecordSchema,
  nonEmptyStringSchema,
  stringArraySchema
} from "./common";

export const settingsSchema = z.object({
  extensionEnabled: z.boolean(),
  debugMode: z.boolean(),
  activeProvider: nonEmptyStringSchema,
  openAiApiKey: z.string().min(1).nullable(),
  providerApiKey: z.string().min(1).nullable().default(null),
  providerBaseUrl: z.string().url().nullable().default(null),
  providerModel: z.string().min(1).nullable().default(null),
  approvedDomains: stringArraySchema,
  lastActiveProfileId: z.string().nullable(),
  featureFlags: booleanRecordSchema
}) satisfies z.ZodType<Settings>;
