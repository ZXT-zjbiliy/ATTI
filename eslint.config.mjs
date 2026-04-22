import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".git/**", ".output/**", ".tools/**", ".wxt/**", "node_modules/**"]
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "no-console": "off"
    }
  }
);
