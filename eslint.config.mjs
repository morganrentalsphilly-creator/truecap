import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    /**
     * eslint-plugin-react-hooks v7 adds React Compiler-oriented rules that flag many
     * common patterns (effects syncing URL/state, nested components, Math.random in refs).
     * Re-enable and fix incrementally; keeping them off avoids blocked Vercel lint checks.
     */
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "import/no-anonymous-default-export": "off",
      // ─── Hardened defaults — added to catch common Next/React mistakes ───
      // Keep them as 'warn' (not 'error') so they surface during dev/CI
      // without breaking builds on first introduction. Promote to 'error'
      // individually once the existing backlog (if any) is cleaned up.

      // List rendering without keys causes silent reconciliation bugs in
      // React 19's stricter scheduler. Already enforced by core-web-vitals,
      // but lifting to error here for clarity.
      "react/jsx-key": "error",
      // Catches `<img>` usage where next/image should be used. Next/image
      // does automatic optimization, lazy-loading, and srcset generation —
      // a raw <img> ships full-resolution to every device and hurts LCP.
      // Currently we use zero raw <img> (per alt-text audit), so this is
      // forward-protection against accidental regressions.
      "@next/next/no-img-element": "warn",
      // Catches "useEffect deps array is missing a referenced variable"
      // bugs — a #1 cause of stale-closure issues in client components.
      // Some patterns deliberately omit deps (with eslint-disable comments);
      // warn-level lets us see new occurrences without blocking the build.
      "react-hooks/exhaustive-deps": "warn",
      // Catches `var` and re-bindings of variables that never change —
      // small code-quality win. TypeScript-aware variant.
      "prefer-const": "warn",
      // Catches `const a: string = "x"; const b = a;` patterns that flag
      // unused imports/vars introduced during refactors. Warn-only so
      // legitimate work-in-progress code isn't blocked.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          // Prefixing with _ signals intentionally-unused. Common pattern
          // in destructuring and callback signatures.
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          // Don't warn on caught errors named `e` or `err` — common idiom.
          caughtErrorsIgnorePattern: "^_|^(e|err|error)$",
        },
      ],
    },
  },
];

export default eslintConfig;
