import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "ATTI",
    description: "A local-first Edge extension shell for ATTI.",
    permissions: ["storage", "tabs"],
    host_permissions: ["https://api.openai.com/*"]
  }
});
