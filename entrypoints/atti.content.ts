import { defineContentScript } from "#imports";

import { startContentRuntime } from "../src/content/runtime";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    startContentRuntime();
  }
});
