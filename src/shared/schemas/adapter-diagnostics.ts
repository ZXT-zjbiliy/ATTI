import { z } from "zod";

import type { AdapterDiagnostics } from "../types";
import { nonEmptyStringSchema, unknownRecordSchema } from "./common";

const adapterDiagnosticsPayloadValueSchema = z.union([
  z.string().max(200),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string().max(200)),
  z.array(z.number()),
  z.array(z.boolean())
]);

export const adapterDiagnosticsPayloadSchema = z.record(
  z.string(),
  adapterDiagnosticsPayloadValueSchema
);

export const adapterDiagnosticsDraftSchema = z.object({
  sessionId: nonEmptyStringSchema,
  siteId: nonEmptyStringSchema,
  selectorVersion: nonEmptyStringSchema,
  phase: nonEmptyStringSchema,
  message: nonEmptyStringSchema.max(200),
  payload: adapterDiagnosticsPayloadSchema.optional()
});

export const adapterDiagnosticsSchema = z.object({
  id: nonEmptyStringSchema,
  sessionId: nonEmptyStringSchema,
  siteId: nonEmptyStringSchema,
  selectorVersion: nonEmptyStringSchema,
  phase: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
  payload: unknownRecordSchema.optional(),
  createdAt: nonEmptyStringSchema
}) satisfies z.ZodType<AdapterDiagnostics>;
