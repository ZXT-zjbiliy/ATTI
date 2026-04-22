import { defineBackground } from "#imports";

import { startBackgroundRuntime } from "../src/background/runtime";

export default defineBackground(() => {
  startBackgroundRuntime();
});
