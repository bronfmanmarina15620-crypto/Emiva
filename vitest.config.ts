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
