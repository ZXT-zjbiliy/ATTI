import { z } from "zod";

import type { ProfilePresetAnalysisInput, ProfilePresetAnswer } from "../types";
import { nonEmptyStringSchema } from "./common";

export const profilePresetAnswerSchema = z.object({
  questionId: nonEmptyStringSchema,
  selectedOptionId: nonEmptyStringSchema
}) satisfies z.ZodType<ProfilePresetAnswer>;

export const profilePresetAnalysisInputSchema = z.object({
  answers: z.array(profilePresetAnswerSchema).min(1)
}) satisfies z.ZodType<ProfilePresetAnalysisInput>;
