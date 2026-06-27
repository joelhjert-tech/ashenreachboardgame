import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { getAssetPath } from "../src/game/assets/design/assetManifest.js";
import { CARD_IMAGE_TYPES, type CardImageType } from "../src/game/assets/design/cardImageCatalog.js";
import { imagePrompts } from "../src/game/assets/design/imagePrompts.js";
import { getRuntimeAssetPaths } from "../src/client/shared/assetPaths.js";
import { getBoardTileAssetPaths } from "../src/client/tv/TalismanBoardSurface.js";

type MissingAssetSummary = {
  total: number;
  present: number;
  missing: number;
  byType: Record<string, number>;
  cardImageSummary: Record<CardImageType, { total: number; present: number; missing: number }>;
  missingAssets: Array<{
    id: string;
    assetType: string;
    outputPath: string;
    usage: string;
  }>;
};

type ExpectedAsset = {
  id: string;
  assetType: string;
  outputPath: string;
  usage: string;
};

function resolvePublicPath(outputPath: string): string {
  return join(process.cwd(), "public", outputPath.replace(/^\//, "").split("/").join(sep));
}

const extraRuntimeAssets: ExpectedAsset[] = [
  ...getRuntimeAssetPaths().map((outputPath) => ({
    id: outputPath,
    assetType: "runtimeAsset",
    outputPath,
    usage: "Runtime UI, portrait, nemesis, or dice asset referenced by assetPaths.ts"
  })),
  ...getBoardTileAssetPaths().map((outputPath) => ({
    id: outputPath,
    assetType: "boardTileAsset",
    outputPath,
    usage: "Board tile art referenced by TalismanBoardSurface.tsx"
  })),
  {
    id: "full_board_main",
    assetType: "boardAsset",
    outputPath: getAssetPath("full_board_main"),
    usage: "Host TV tactical board background"
  }
];

const expectedAssets = [
  ...imagePrompts.map((prompt) => ({
    id: prompt.id,
    assetType: prompt.assetType,
    outputPath: prompt.outputPath,
    usage: prompt.usage
  })),
  ...extraRuntimeAssets
].filter(
  (asset, index, assets) => assets.findIndex((entry) => entry.outputPath === asset.outputPath) === index
);

const missingAssets = expectedAssets.filter((asset) => !existsSync(resolvePublicPath(asset.outputPath)));

const byType = missingAssets.reduce<Record<string, number>>((summary, asset) => {
  summary[asset.assetType] = (summary[asset.assetType] ?? 0) + 1;
  return summary;
}, {});

const cardImageSummary = CARD_IMAGE_TYPES.reduce<Record<CardImageType, { total: number; present: number; missing: number }>>(
  (summary, cardType) => {
    const prompts = imagePrompts.filter((prompt) => prompt.assetType === `${cardType}CardArt` || (cardType === "threat" && prompt.assetType === "threatCardArt"));
    const present = prompts.filter((prompt) => existsSync(resolvePublicPath(prompt.outputPath))).length;
    summary[cardType] = {
      total: prompts.length,
      present,
      missing: prompts.length - present
    };
    return summary;
  },
  {
    threat: { total: 0, present: 0, missing: 0 },
    contract: { total: 0, present: 0, missing: 0 },
    anomaly: { total: 0, present: 0, missing: 0 },
    artifact: { total: 0, present: 0, missing: 0 },
    scar: { total: 0, present: 0, missing: 0 },
    escalation: { total: 0, present: 0, missing: 0 }
  }
);

const report: MissingAssetSummary = {
  total: expectedAssets.length,
  present: expectedAssets.length - missingAssets.length,
  missing: missingAssets.length,
  byType,
  cardImageSummary,
  missingAssets
};

console.log(JSON.stringify(report, null, 2));
