import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist", "**/.next", "**/node_modules", "packages/db/src/generated", "apps/web/public/maplibre", "**/next-env.d.ts", "e2e/test-results", "e2e/playwright-report"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Non-breaking spaces are intended inside number formats and regexes.
      "no-irregular-whitespace": ["error", { skipStrings: true, skipRegExps: true, skipTemplates: true }],
      // False positive on `const schema = z.object(...)` that is only used in a parameter decorator (`@Body(new ZodPipe(schema))`).
      "no-useless-assignment": "off",
    },
  },
  {
    // Only the two classic rules. The newer React Compiler rules in `recommended` (set-state-in-effect, refs,
    // preserve-manual-memoization) flag deliberate patterns here and are not worth rewriting working code for.
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" },
  },
);
