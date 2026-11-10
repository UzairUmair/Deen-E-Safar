import { defineConfig } from "vitest/config";

export default defineConfig({
  // The app's tsconfig keeps JSX for Next to compile; tests need it transformed.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: false,
    unstubGlobals: false,
    testTimeout: 15000,
  },
});
