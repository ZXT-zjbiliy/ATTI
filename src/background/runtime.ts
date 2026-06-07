import { createBackgroundMessageRouter } from "./message-router";
import { createBackgroundOrchestrator } from "./services/orchestrator";
import { createPermissionGuard } from "./services/permission-guard";
import { createSessionManager } from "./services/session-manager";
import { SettingsRepository } from "../storage/repos/settings-repo";

type RuntimeMessageSender = unknown;

type RuntimeMessageListener = (
  message: unknown,
  sender: RuntimeMessageSender,
  sendResponse: (response: unknown) => void
) => boolean | void;

type GlobalWithChromeRuntime = typeof globalThis & {
  chrome?: {
    runtime?: {
      onMessage?: {
        addListener(listener: RuntimeMessageListener): void;
      };
    };
  };
};

function toAppErrorResponse(error: unknown) {
  return {
    ok: false,
    error: {
      code: "RUNTIME_MESSAGE_FAILED",
      message: error instanceof Error ? error.message : "Background message handling failed."
    }
  };
}

export function startBackgroundRuntime() {
  const settingsRepository = new SettingsRepository();
  const router = createBackgroundMessageRouter({ settingsRepository });
  const permissionGuard = createPermissionGuard({ settingsRepository });
  const sessionManager = createSessionManager();
  const orchestrator = createBackgroundOrchestrator({
    router,
    permissionGuard,
    sessionManager
  });
  const runtime = (globalThis as GlobalWithChromeRuntime).chrome?.runtime;

  runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
    void orchestrator
      .handleIncomingMessage(message)
      .then(sendResponse)
      .catch((error) => {
        sendResponse(toAppErrorResponse(error));
      });
    return true;
  });

  console.log("ATTI background runtime initialized.");
}
