import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["tests/ui/**/*.test.tsx", "jsdom"],
    ],
    setupFiles: ["tests/ui-setup.ts"],
    // LAUNCH-PUBLIC-001 D2 — the built-in review pack is private home content
    // and ships only behind this flag. Tests keep it on so the pack MECHANISM
    // stays covered; a dedicated test asserts the public build excludes it.
    env: {
      NEXT_PUBLIC_ENABLE_HOME_PACKS: "1",
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
