import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tooling that happens to live in the repo, not source we own. The
    // impeccable skill vendors bundled browser scripts, and linting a minified
    // UMD bundle produced 95 warnings about code nobody here will ever edit —
    // enough noise to hide the one real error underneath it.
    ".claude/**",
  ]),
]);

export default eslintConfig;
