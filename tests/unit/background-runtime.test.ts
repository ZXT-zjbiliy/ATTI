import { describe, expect, it, vi } from "vitest";

import { startBackgroundRuntime } from "../../src/background/runtime";

describe("background runtime", () => {
  it("returns a structured error response when background handling rejects", async () => {
    const sendResponse = vi.fn();
    let listener:
      | ((
          message: unknown,
          sender: unknown,
          sendResponse: (response: unknown) => void
        ) => boolean | void)
      | undefined;

    const previousChrome = globalThis.chrome;

    vi.stubGlobal("chrome", {
      runtime: {
        onMessage: {
          addListener(nextListener: typeof listener) {
            listener = nextListener;
          }
        }
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn()
        }
      }
    });

    const originalCreateBackgroundMessageRouterModule =
      await import("../../src/background/message-router");
    const originalCreatePermissionGuardModule =
      await import("../../src/background/services/permission-guard");
    const originalCreateSessionManagerModule =
      await import("../../src/background/services/session-manager");
    const originalCreateBackgroundOrchestratorModule =
      await import("../../src/background/services/orchestrator");

    const routerSpy = vi
      .spyOn(originalCreateBackgroundMessageRouterModule, "createBackgroundMessageRouter")
      .mockReturnValue({} as never);
    const permissionSpy = vi
      .spyOn(originalCreatePermissionGuardModule, "createPermissionGuard")
      .mockReturnValue({
        canProcessBackgroundMessage: vi.fn(async () => ({ allowed: true }))
      });
    const sessionSpy = vi
      .spyOn(originalCreateSessionManagerModule, "createSessionManager")
      .mockReturnValue({ getCurrentSessionId: () => null });
    const orchestratorSpy = vi
      .spyOn(originalCreateBackgroundOrchestratorModule, "createBackgroundOrchestrator")
      .mockReturnValue({
        handleIncomingMessage: vi.fn(async () => {
          throw new Error("Background routing exploded");
        })
      });

    startBackgroundRuntime();

    await new Promise<void>((resolve) => {
      listener?.({ type: "ping", payload: {} }, {}, (response) => {
        sendResponse(response);
        resolve();
      });
    });

    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "RUNTIME_MESSAGE_FAILED",
        message: "Background routing exploded"
      }
    });

    routerSpy.mockRestore();
    permissionSpy.mockRestore();
    sessionSpy.mockRestore();
    orchestratorSpy.mockRestore();

    if (previousChrome === undefined) {
      vi.unstubAllGlobals();
    } else {
      vi.stubGlobal("chrome", previousChrome);
    }
  });
});
