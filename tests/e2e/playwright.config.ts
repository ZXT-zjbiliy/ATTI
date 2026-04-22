import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["*.spec.ts"],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  reporter: "list",
  outputDir: "../../test-results/e2e"
});
