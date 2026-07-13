import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { cardArtRuntimeCatalog } from "../../game/assets/runtime/cardArtRuntimeCatalog.js";

async function collectRuntimeSourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(root, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "__tests__") {
          return [];
        }

        return collectRuntimeSourceFiles(entryPath);
      }

      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        return [];
      }

      return [entryPath];
    })
  );

  return files.flat();
}

describe("runtime import boundaries", () => {
  it("keeps prompt-generation catalogs out of browser runtime source", async () => {
    const clientRoot = join(process.cwd(), "src/client");
    const sourceFiles = await collectRuntimeSourceFiles(clientRoot);
    const violations: string[] = [];

    for (const sourceFile of sourceFiles) {
      const source = await readFile(sourceFile, "utf8");

      if (
        source.includes("generatedCardImagePrompts") ||
        source.includes("game/assets/design/imagePrompts") ||
        source.includes("game/assets/design/assetManifest")
      ) {
        violations.push(relative(process.cwd(), sourceFile));
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps legacy Riftfall card art out of runtime card paths", async () => {
    const clientRoot = join(process.cwd(), "src/client");
    const sourceFiles = await collectRuntimeSourceFiles(clientRoot);
    const clientViolations: string[] = [];

    for (const sourceFile of sourceFiles) {
      const source = await readFile(sourceFile, "utf8");

      if (source.includes("/assets/riftfall/cards") || source.includes("public/assets/riftfall/cards")) {
        clientViolations.push(relative(process.cwd(), sourceFile));
      }
    }

    const runtimePathViolations = cardArtRuntimeCatalog
      .filter((entry) => entry.outputPath.includes("/assets/riftfall/cards"))
      .map((entry) => `${entry.cardId}: ${entry.outputPath}`);
    const activeRootViolations = cardArtRuntimeCatalog
      .filter((entry) => !entry.outputPath.startsWith("/assets/cards/"))
      .map((entry) => `${entry.cardId}: ${entry.outputPath}`);
    const heatViolations = cardArtRuntimeCatalog
      .filter((entry) => entry.outputPath.includes("/assets/cards/heat"))
      .map((entry) => `${entry.cardId}: ${entry.outputPath}`);
    const deferredLegacyIds = new Set([
      "lattice-witness",
      "hold-the-ridge",
      "span-of-the-last-seal",
      "relic-choir-route-orb",
      "choir-route-orb"
    ]);
    const deferredViolations = cardArtRuntimeCatalog
      .filter((entry) => deferredLegacyIds.has(entry.cardId))
      .map((entry) => `${entry.cardId}: ${entry.outputPath}`);

    expect(clientViolations).toEqual([]);
    expect(runtimePathViolations).toEqual([]);
    expect(activeRootViolations).toEqual([]);
    expect(heatViolations).toEqual([]);
    expect(deferredViolations).toEqual([]);
  });
});
