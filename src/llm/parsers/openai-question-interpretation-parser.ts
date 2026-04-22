import { z } from "zod";

import type { QuestionInterpretation } from "../providers/assessment-provider";

const questionInterpretationResponseSchema = z.object({
  questionId: z.string().min(1),
  interpretation: z.string().min(1),
  inferredIntent: z.string().min(1)
});

export function parseOpenAiQuestionInterpretationResponse(
  rawText: string
): QuestionInterpretation {
  return questionInterpretationResponseSchema.parse(JSON.parse(rawText));
}

export function getOpenAiQuestionInterpretationJsonSchema() {
  return {
    name: "question_interpretation",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["questionId", "interpretation", "inferredIntent"],
      properties: {
        questionId: {
          type: "string"
        },
        interpretation: {
          type: "string"
        },
        inferredIntent: {
          type: "string"
        }
      }
    }
  } as const;
}
