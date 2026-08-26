import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname) },
  },
});
