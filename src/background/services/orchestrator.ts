import type { AppResult } from "../../shared/types";
import type { BackgroundMessageRouter } from "../message-router";
import type { PermissionGuard } from "./permission-guard";
import type { SessionManager } from "./session-manager";

export type BackgroundOrchestrator = {
  handleIncomingMessage(message: unknown): Promise<AppResult>;
};

export type BackgroundOrchestratorDependencies = {
  router: BackgroundMessageRouter;
  permissionGuard: PermissionGuard;
  sessionManager: SessionManager;
};

export function createBackgroundOrchestrator(
  dependencies: BackgroundOrchestratorDependencies
): BackgroundOrchestrator {
  return {
    async handleIncomingMessage(message) {
      if (!dependencies.permissionGuard.canProcessBackgroundMessages()) {
        return {
          ok: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "Background message processing is currently unavailable"
          }
        };
      }

      void dependencies.sessionManager.getCurrentSessionId();

      return dependencies.router.routeMessage(message);
    }
  };
}
