import { SCENARIOS } from "../../data/scenarios.js";
import { baseNegativePrompt } from "./negativePrompt.js";

export const scenarioSheetPrompts = SCENARIOS.map((scenario) => ({
  id: scenario.sheetArtAssetId,
  fileName: `${scenario.id}.png`,
  outputPath: `/assets/riftfall/scenarios/${scenario.id}.png`,
  assetType: "scenarioSheetArt" as const,
  size: "portrait" as const,
  prompt: scenario.sheetArtPrompt,
  negativePrompt: baseNegativePrompt,
  usage: `${scenario.name} printable scenario sheet art.`
}));
