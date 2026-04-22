import { z } from "zod";

import type { Session } from "../types";
import { nonEmptyStringSchema, stringArraySchema, unknownRecordSchema } from "./common";

export const sessionSchema = z.object({
  id: nonEmptyStringSchema,
  siteId: nonEmptyStringSchema,
  pageUrl: nonEmptyStringSchema,
  status: nonEmptyStringSchema,
  profileId: nonEmptyStringSchema,
  questionIds: stringArraySchema,
  answerPlanIds: stringArraySchema,
  executionLog: z.array(unknownRecordSchema),
  startedAt: nonEmptyStringSchema,
  finishedAt: nonEmptyStringSchema.optional()
}) satisfies z.ZodType<Session>;
