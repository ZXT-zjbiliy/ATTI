import { z } from "zod";

import type { ProfileSummary } from "../providers/assessment-provider";

const profileSummaryResponseSchema = z.object({
  narrativeSummary: z.string().min(1),
  evidence: z.array(z.string().min(1)),
  structuredTraits: z.record(z.string(), z.unknown())
});

export function parseOpenAiProfileSummaryResponse(rawText: string): ProfileSummary {
  return profileSummaryResponseSchema.parse(JSON.parse(rawText));
}

export function getOpenAiProfileSummaryJsonSchema() {
  return {
    name: "profile_summary",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["narrativeSummary", "evidence", "structuredTraits"],
      properties: {
        narrativeSummary: {
          type: "string"
        },
        evidence: {
          type: "array",
          items: {
            type: "string"
          }
        },
        structuredTraits: {
          type: "object",
          additionalProperties: true
        }
      }
    }
  } as const;
}
