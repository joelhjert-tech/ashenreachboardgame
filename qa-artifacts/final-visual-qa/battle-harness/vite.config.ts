import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: resolve(__dirname, "../../.."),
  plugins: [
    {
      name: "ashen-transition-harness-modules",
      enforce: "pre",
      resolveId(source, importer) {
        if (importer?.replace(/\\/g, "/").endsWith("/src/client/tv/TvApp.tsx")) {
          if (source === "../shared/useRoomSubscription.js") return resolve(__dirname, "useRoomSubscription.mock.ts");
          if (source === "../shared/network.js") return resolve(__dirname, "network.mock.ts");
        }
        if (importer?.replace(/\\/g, "/").match(/\/battle-harness\/(main|movement-main)\.tsx$/) && source === "/src/client/shared/useRoomSubscription.js") {
          return resolve(__dirname, "useRoomSubscription.mock.ts");
        }
        return null;
      }
    },
    react()
  ],
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: { input: resolve(__dirname, "index.html") }
  }
});
