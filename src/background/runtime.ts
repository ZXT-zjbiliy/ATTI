import { createBackgroundMessageRouter } from "./message-router";
import { createBackgroundOrchestrator } from "./services/orchestrator";
import { createPermissionGuard } from "./services/permission-guard";
import { createSessionManager } from "./services/session-manager";

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

export function startBackgroundRuntime() {
  const router = createBackgroundMessageRouter();
  const permissionGuard = createPermissionGuard();
  const sessionManager = createSessionManager();
  const orchestrator = createBackgroundOrchestrator({
    router,
    permissionGuard,
    sessionManager
  });
  const runtime = (globalThis as GlobalWithChromeRuntime).chrome?.runtime;

  runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
    void orchestrator.handleIncomingMessage(message).then(sendResponse);
    return true;
  });

  console.log("ATTI background runtime initialized.");
}
