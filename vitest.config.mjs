import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    passWithNoTests: true,
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "tests/integration/**/*.test.tsx"
    ],
    exclude: ["tests/e2e/**"]
  }
});
