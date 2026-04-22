import { describe, expect, it } from "vitest";

import { createBackgroundOrchestrator } from "../../src/background/services/orchestrator";
import { createPermissionGuard } from "../../src/background/services/permission-guard";
import { createSessionManager } from "../../src/background/services/session-manager";

describe("background service boundaries", () => {
  it("imports session manager independently", () => {
    const sessionManager = createSessionManager();

    expect(sessionManager.getCurrentSessionId()).toBeNull();
  });

  it("imports permission guard independently", () => {
    const permissionGuard = createPermissionGuard();

    expect(permissionGuard.canProcessBackgroundMessages()).toBe(true);
  });

  it("imports orchestrator independently and delegates to the router", async () => {
    const orchestrator = createBackgroundOrchestrator({
      router: {
        routeMessage: async () => ({
          ok: true,
          data: {
            delegated: true
          }
        })
      },
      permissionGuard: createPermissionGuard(),
      sessionManager: createSessionManager()
    });

    const result = await orchestrator.handleIncomingMessage({
      type: "ping",
      payload: {}
    });

    expect(result).toEqual({
      ok: true,
      data: {
        delegated: true
      }
    });
  });
});
