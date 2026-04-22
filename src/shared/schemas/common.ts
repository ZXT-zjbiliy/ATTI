import { z } from "zod";

export const nonEmptyStringSchema = z.string().min(1);

export const stringArraySchema = z.array(nonEmptyStringSchema);

export const booleanRecordSchema = z.record(z.string(), z.boolean());

export const unknownRecordSchema = z.record(z.string(), z.unknown());
