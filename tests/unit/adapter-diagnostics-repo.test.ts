import "fake-indexeddb/auto";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { adapterDiagnosticsDraftSchema } from "../../src/shared/schemas";
import { createAttiDatabase } from "../../src/storage/db";
import { AdapterDiagnosticsRepository } from "../../src/storage/repos/adapter-diagnostics-repo";

describe("adapter diagnostics repository", () => {
  it("queries diagnostics by session id", async () => {
    const database = createAttiDatabase("adapter-diagnostics-by-session");
    const repository = new AdapterDiagnosticsRepository(database);

    await repository.writeDiagnostic({
      sessionId: "session-1",
      siteId: "placeholder-assessment",
      selectorVersion: "placeholder-v1",
      phase: "page-detected",
      message: "Adapter matched placeholder site.",
      payload: {
        matchedRules: ["host", "path"],
        isTopLevel: true
      }
    });
    await repository.writeDiagnostic({
      sessionId: "session-1",
      siteId: "placeholder-assessment",
      selectorVersion: "placeholder-v1",
      phase: "metadata-only",
      message: "Only passive diagnostics are active.",
      payload: {
        mode: "passive"
      }
    });
    await repository.writeDiagnostic({
      sessionId: "session-2",
      siteId: "placeholder-assessment",
      selectorVersion: "placeholder-v1",
      phase: "page-detected",
      message: "Different session diagnostic.",
      payload: {
        mode: "passive"
      }
    });

    const diagnostics = await repository.listBySessionId("session-1");

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.every((record) => record.sessionId === "session-1")).toBe(
      true
    );

    database.close();
  });

  it("validates diagnostics payload before persistence", () => {
    expect(() =>
      adapterDiagnosticsDraftSchema.parse({
        sessionId: "session-1",
        siteId: "placeholder-assessment",
        selectorVersion: "placeholder-v1",
        phase: "page-detected",
        message: "Attempted to store nested payload.",
        payload: {
          nested: {
            rawHtml: "<main>secret</main>"
          }
        }
      })
    ).toThrow();
  });
});

describe("adapter diagnostics boundaries", () => {
  it("keeps diagnostics persistence inside its own repository", () => {
    const repoFiles = [
      "src/storage/repos/profile-repo.ts",
      "src/storage/repos/session-repo.ts",
      "src/storage/repos/settings-repo.ts",
      "src/storage/repos/adapter-diagnostics-repo.ts"
    ];

    for (const repoFile of repoFiles) {
      const content = readFileSync(resolve(process.cwd(), repoFile), "utf8");

      if (repoFile.endsWith("adapter-diagnostics-repo.ts")) {
        expect(content).toContain("adapterDiagnostics");
      } else {
        expect(content).not.toContain("adapterDiagnostics");
      }
    }
  });
});
