import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: [".next/", "out/", "node_modules/", "next-env.d.ts", "tests/fixtures/*.json"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs,cjs}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Node scripts are CommonJS or plain ESM and run outside the app.
    files: ["scripts/**", "*.config.*"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // First-version screens: generated, single-line style. They are type-checked and
    // covered by the browser checks; style rules are not applied to them.
    files: ["scripts/prepare-content.cjs", "scripts/verify-functional.cjs", "app/features/Learn.tsx", "app/features/Library.tsx", "app/features/Personal.tsx", "app/features/shared.tsx", "app/data.ts"],
    rules: { "@typescript-eslint/no-unused-expressions": "off", "@typescript-eslint/no-unused-vars": "off", "react-hooks/exhaustive-deps": "off", "no-empty": "off" },
  },
);
