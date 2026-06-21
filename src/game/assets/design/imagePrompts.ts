import { boardTilePrompts } from "./boardTilePrompts.js";
import { cardArtPrompts } from "./cardArtPrompts.js";
import { cardTemplatePrompts } from "./cardTemplatePrompts.js";
import { characterPortraitPrompts } from "./characterPortraitPrompts.js";
import { baseNegativePrompt } from "./negativePrompt.js";
import { scenarioSheetPrompts } from "./scenarioSheetPrompts.js";
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
};

export const requiredImageGenerationChecklist = [
  "1 full board image",
  "28 outer tier tile images",
  "18 middle tier tile images",
  "8 inner/center tile images",
  "6 character portraits",
  "5 nemesis portraits",
  "8 card backs",
  "12 mission card art images",
  "15 threat card art images",
  "12 power/corruption/relic/wargear sample card images",
  "8 icons",
  "4 tokens",
  "7 UI frames/backgrounds",
  "6 printable scenario sheet illustrations"
] as const;

export const imagePrompts: ImagePromptSpec[] = [
  ...boardTilePrompts,
  ...characterPortraitPrompts,
  ...cardTemplatePrompts,
  ...cardArtPrompts,
  ...scenarioSheetPrompts,
  ...uiPrompts
];

export const firstPassImageCount = imagePrompts.length;
