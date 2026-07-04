import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

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
});
