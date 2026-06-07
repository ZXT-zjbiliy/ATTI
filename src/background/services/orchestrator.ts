import type { AppResult } from "../../shared/types";
import type { BackgroundMessageRouter } from "../message-router";
import type { PermissionGuard } from "./permission-guard";
import type { SessionManager } from "./session-manager";

export type BackgroundOrchestrator = {
  handleIncomingMessage(message: unknown): Promise<AppResult>;
};

export type BackgroundOrchestratorDependencies = {
  router: Pick<BackgroundMessageRouter, "routeMessage">;
  permissionGuard: PermissionGuard;
  sessionManager: SessionManager;
};

export function createBackgroundOrchestrator(
  dependencies: BackgroundOrchestratorDependencies
): BackgroundOrchestrator {
  return {
    async handleIncomingMessage(message) {
      const permissionDecision =
        await dependencies.permissionGuard.canProcessBackgroundMessage(message);

      if (!permissionDecision.allowed) {
        return {
          ok: false,
          error: {
            code: permissionDecision.code,
            message: permissionDecision.message
          }
        };
      }

      void dependencies.sessionManager.getCurrentSessionId();

      return dependencies.router.routeMessage(message);
    }
  };
}
