import { z } from "zod";

import type { Question, QuestionOption } from "../types";
import { nonEmptyStringSchema } from "./common";

export const questionOptionSchema = z.object({
  id: nonEmptyStringSchema,
  text: nonEmptyStringSchema,
  value: nonEmptyStringSchema.optional()
}) satisfies z.ZodType<QuestionOption>;

export const questionSchema = z.object({
  id: nonEmptyStringSchema,
  sessionId: nonEmptyStringSchema,
  siteId: nonEmptyStringSchema,
  pageUrl: nonEmptyStringSchema,
  section: nonEmptyStringSchema.optional(),
  text: nonEmptyStringSchema,
  type: nonEmptyStringSchema,
  options: z.array(questionOptionSchema),
  order: z.number().int(),
  createdAt: nonEmptyStringSchema
}) satisfies z.ZodType<Question>;
