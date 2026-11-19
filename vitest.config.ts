import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, ".codex-safety/**"],
    fileParallelism: false,
    setupFiles: ["./src/client/testDomSetup.ts"]
  }
});
