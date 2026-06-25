import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { CARD_IMAGE_TYPES, type CardImageType } from "../src/game/assets/design/cardImageCatalog.js";
import { imagePrompts } from "../src/game/assets/design/imagePrompts.js";

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
  total: imagePrompts.length,
  present: imagePrompts.length - missingAssets.length,
  missing: missingAssets.length,
  byType,
  cardImageSummary,
  missingAssets
};

console.log(JSON.stringify(report, null, 2));
