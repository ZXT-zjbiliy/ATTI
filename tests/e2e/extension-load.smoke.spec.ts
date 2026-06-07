import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

import {
  EDGE_EXTENSION_BUILD_PATH,
  launchEdgeExtensionContext,
  resolveExtensionId
} from "./support/edge-extension-context";

test.describe("e2e: edge extension load smoke", () => {
  test("loads the built extension and renders the popup shell", async () => {
    expect(
      existsSync(EDGE_EXTENSION_BUILD_PATH),
      `Expected extension build output at ${EDGE_EXTENSION_BUILD_PATH}`
    ).toBe(true);

    const extensionHandle = await launchEdgeExtensionContext();

    try {
      const extensionId = await resolveExtensionId(extensionHandle.context);
      const popupPage = await extensionHandle.context.newPage();

      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

      await expect(popupPage.getByRole("heading", { name: "ATTI 智能助手" })).toBeVisible();
      await expect(popupPage.getByRole("checkbox", { name: "启用扩展" })).toBeVisible();
    } finally {
      await extensionHandle.close();
    }
  });
});
