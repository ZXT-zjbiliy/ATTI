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
  approvedDomains: stringArraySchema,
  lastActiveProfileId: z.string().nullable(),
  featureFlags: booleanRecordSchema
}) satisfies z.ZodType<Settings>;
