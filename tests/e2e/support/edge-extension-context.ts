import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { chromium, type BrowserContext } from "@playwright/test";

export const EDGE_EXTENSION_BUILD_PATH = resolve(process.cwd(), ".output/edge-mv3");

interface EdgeExtensionContextHandle {
  readonly context: BrowserContext;
  close(): Promise<void>;
}

export async function launchEdgeExtensionContext(): Promise<EdgeExtensionContextHandle> {
  const userDataDir = mkdtempSync(join(tmpdir(), "atti-e2e-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge",
    headless: false,
    args: [
      `--disable-extensions-except=${EDGE_EXTENSION_BUILD_PATH}`,
      `--load-extension=${EDGE_EXTENSION_BUILD_PATH}`
    ]
  });

  return {
    context,
    async close() {
      await context.close();
      rmSync(userDataDir, { recursive: true, force: true });
    }
  };
}

export async function resolveExtensionId(context: BrowserContext): Promise<string> {
  let [serviceWorker] = context.serviceWorkers();

  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15_000 });
  }

  const extensionId = new URL(serviceWorker.url()).host;

  if (!extensionId) {
    throw new Error("Failed to resolve the extension id from the background service worker URL.");
  }

  return extensionId;
}
