import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id, { getModuleInfo }) {
          const path = id.replace(/\\/g, "/");
          // Cache authoring data separately without pulling gameplay dependencies
          // into admin chunks or loading admin-only data on player surfaces.
          const importers = getModuleInfo(id)?.importers ?? [];
          if (!path.endsWith(".json") || !importers.length || !importers.every((importer) => importer.replace(/\\/g, "/").includes("/client/tv/admin/"))) return;
          if (path.includes("/docs/research/")) return "admin-audit-data";
          if (path.includes("/content/")) return "admin-authored-data";
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.CLIENT_PORT ?? 5173)
  }
});
