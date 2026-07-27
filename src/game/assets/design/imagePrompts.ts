import { boardTilePrompts } from "./boardTilePrompts.js";
import { cardArtPrompts } from "./cardArtPrompts.js";
import { cardTemplatePrompts } from "./cardTemplatePrompts.js";
import { characterPortraitPrompts } from "./characterPortraitPrompts.js";
import { generatedCardImagePrompts } from "./generatedCardImagePrompts.js";
import { inventoryCategoryIconPrompts } from "./inventoryCategoryIconPrompts.js";
import { objectiveCategoryIconPrompts } from "./objectiveCategoryIconPrompts.js";
import { resultReadyVisualPrompts } from "./resultReadyVisualPrompts.js";
import { baseNegativePrompt } from "./negativePrompt.js";
import { scenarioSheetPrompts } from "./scenarioSheetPrompts.js";
import { signalTheatreEnvironmentPrompts } from "./signalTheatreEnvironmentPrompts.js";
import { signalPiecePrompts } from "./signalPiecePrompts.js";
import { uiPrompts } from "./uiPrompts.js";

export type ImagePromptSpec = {
  id: string;
  fileName: string;
  outputPath: string;
  assetType:
    | "fullBoard"
    | "boardTile"
    | "characterPortrait"
    | "nemesisPortrait"
    | "missionCardArt"
    | "threatCardArt"
    | "contractCardArt"
    | "anomalyCardArt"
    | "artifactCardArt"
    | "equipmentCardArt"
    | "followerCardArt"
    | "scarCardArt"
    | "escalationCardArt"
    | "powerCardArt"
    | "corruptionCardArt"
    | "relicCardArt"
    | "wargearCardArt"
    | "cardBack"
    | "icon"
    | "token"
    | "uiFrame"
    | "background"
    | "scenarioSheetArt";
  size: "wide" | "square" | "portrait" | "card" | "tile" | "icon";
  prompt: string;
  negativePrompt: string;
  usage: string;
  priority?: number;
  releaseRequired?: boolean;
  placeholderAllowed?: boolean;
};

export const requiredImageGenerationChecklist = [
  "1 full board image",
  "28 outer tier tile images",
  "18 middle tier tile images",
  "8 inner/center tile images",
  "6 character portraits",
  "6 nemesis portraits",
  "7 card backs",
  "12 contract card art images",
  "15 threat card art images",
  "9 route-note/artifact/wargear sample card images",
  "4 tokens",
  "4 UI frames/backgrounds",
  "49 Signal Theatre sector environments",
  "6 selectable Signal Theatre player pieces",
  "5 private inventory category emblems",
  "4 private objective category emblems",
  "1 private result-ready verdict gate",
  "6 printable scenario sheet illustrations"
] as const;

export const imagePrompts: ImagePromptSpec[] = [
  ...boardTilePrompts,
  ...characterPortraitPrompts,
  ...cardTemplatePrompts,
  ...cardArtPrompts,
  ...generatedCardImagePrompts.map((prompt) => ({
    id: prompt.assetId,
    fileName: prompt.fileName,
    outputPath: prompt.outputPath,
    assetType: prompt.assetType,
    size: "card" as const,
    prompt: prompt.prompt,
    negativePrompt: prompt.negativePrompt,
    usage: prompt.usage
  })),
  ...scenarioSheetPrompts,
  ...signalTheatreEnvironmentPrompts,
  ...signalPiecePrompts,
  ...inventoryCategoryIconPrompts,
  ...objectiveCategoryIconPrompts,
  ...resultReadyVisualPrompts,
  ...uiPrompts
];

export const firstPassImageCount = imagePrompts.length;
