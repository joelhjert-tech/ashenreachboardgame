import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const scannedRoots = ["src/client", "package.json", "package-lock.json"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json"]);

const forbiddenPatterns: Array<[RegExp, string]> = [
  [/(?:from\s+["']|import\s*\(\s*["'])three(?:["'])/, "three import"],
  [/(?:from\s+["']|import\s*\(\s*["'])@react-three\//, "@react-three import"],
  [/"three"\s*:/, "three package dependency"],
  [/"@react-three\/[^"]+"\s*:/, "@react-three package dependency"],
  [/<Canvas\b/, "React Three Canvas"],
  [/THREE\./, "THREE namespace usage"],
  [/WebGLRenderer\b/, "WebGL renderer usage"],
  [/\bgetContext\(\s*["']webgl2?["']\s*\)/, "WebGL canvas context"]
];

async function collectFiles(path: string): Promise<string[]> {
  const absolutePath = join(repoRoot, path);
  const pathStat = await stat(absolutePath);

  if (pathStat.isFile()) {
    return [absolutePath];
  }

  const entries = await readdir(absolutePath, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.name !== "node_modules" && entry.name !== "dist")
      .map((entry) => collectFiles(join(path, entry.name)))
  );

  return files.flat().filter((file) => sourceExtensions.has(extname(file)));
}

describe("Three.js removal regression guard", () => {
  it("does not reintroduce Three.js imports, Canvas, or WebGL client usage", async () => {
    const files = (await Promise.all(scannedRoots.map((root) => collectFiles(root)))).flat();
    const violations: string[] = [];

    for (const file of files) {
      if (file.endsWith("threeRemovalRegression.test.ts")) {
        continue;
      }

      const source = await readFile(file, "utf8");

      for (const [pattern, label] of forbiddenPatterns) {
        if (pattern.test(source)) {
          violations.push(`${relative(repoRoot, file)}: ${label}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
