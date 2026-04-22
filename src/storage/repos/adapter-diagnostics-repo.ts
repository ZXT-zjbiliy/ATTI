import { z } from "zod";

import {
  adapterDiagnosticsDraftSchema,
  adapterDiagnosticsSchema
} from "../../shared/schemas";
import type { AdapterDiagnostics } from "../../shared/types";
import { attiDb, type AttiDatabase } from "../db";

type AdapterDiagnosticsDraft = z.infer<typeof adapterDiagnosticsDraftSchema>;

function cloneDiagnostics(record: AdapterDiagnostics): AdapterDiagnostics {
  return {
    ...record,
    payload: record.payload ? { ...record.payload } : undefined
  };
}

function createDiagnosticsId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `adapter-diagnostics-${Date.now()}`;
}

function buildDiagnosticsRecord(
  draft: AdapterDiagnosticsDraft
): AdapterDiagnostics {
  return {
    id: createDiagnosticsId(),
    sessionId: draft.sessionId,
    siteId: draft.siteId,
    selectorVersion: draft.selectorVersion,
    phase: draft.phase,
    message: draft.message,
    payload: draft.payload ? { ...draft.payload } : undefined,
    createdAt: new Date().toISOString()
  };
}

export class AdapterDiagnosticsRepository {
  constructor(
    private readonly database: Pick<AttiDatabase, "adapterDiagnostics"> = attiDb
  ) {}

  async writeDiagnostic(
    draft: AdapterDiagnosticsDraft
  ): Promise<AdapterDiagnostics> {
    const validatedDraft = adapterDiagnosticsDraftSchema.parse(draft);
    const diagnosticsRecord = adapterDiagnosticsSchema.parse(
      buildDiagnosticsRecord(validatedDraft)
    );

    await this.database.adapterDiagnostics.put(diagnosticsRecord);

    return cloneDiagnostics(diagnosticsRecord);
  }

  async listBySessionId(sessionId: string): Promise<AdapterDiagnostics[]> {
    const validatedSessionId = z.string().min(1).parse(sessionId);
    const diagnostics = await this.database.adapterDiagnostics
      .where("sessionId")
      .equals(validatedSessionId)
      .toArray();

    return diagnostics
      .map((record) => adapterDiagnosticsSchema.parse(record))
      .map(cloneDiagnostics);
  }
}
