import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { imagePrompts } from "../src/game/assets/design/imagePrompts.js";

type MissingAssetSummary = {
  total: number;
  present: number;
  missing: number;
  byType: Record<string, number>;
  missingAssets: Array<{
    id: string;
    assetType: string;
    outputPath: string;
    usage: string;
  }>;
};

function resolvePublicPath(outputPath: string): string {
  return join(process.cwd(), "public", outputPath.replace(/^\//, "").split("/").join(sep));
}

const missingAssets = imagePrompts
  .filter((prompt) => !existsSync(resolvePublicPath(prompt.outputPath)))
  .map((prompt) => ({
    id: prompt.id,
    assetType: prompt.assetType,
    outputPath: prompt.outputPath,
    usage: prompt.usage
  }));

const byType = missingAssets.reduce<Record<string, number>>((summary, asset) => {
  summary[asset.assetType] = (summary[asset.assetType] ?? 0) + 1;
  return summary;
}, {});

const report: MissingAssetSummary = {
  total: imagePrompts.length,
  present: imagePrompts.length - missingAssets.length,
  missing: missingAssets.length,
  byType,
  missingAssets
};

console.log(JSON.stringify(report, null, 2));
