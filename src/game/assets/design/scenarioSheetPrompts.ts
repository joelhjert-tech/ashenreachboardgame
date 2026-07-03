import { SCENARIOS } from "../../data/scenarios.js";
import { getScenarioSheetArtOutputPath } from "../../data/scenarioSheetArt.js";
import { baseNegativePrompt } from "./negativePrompt.js";

export const scenarioSheetPrompts = SCENARIOS.map((scenario) => ({
  id: scenario.sheetArtAssetId,
  fileName: `${scenario.id}.png`,
  outputPath: getScenarioSheetArtOutputPath(scenario),
  assetType: "scenarioSheetArt" as const,
  size: "portrait" as const,
  prompt: scenario.sheetArtPrompt,
  negativePrompt: baseNegativePrompt,
  usage: `${scenario.name} printable scenario sheet art.`
}));
