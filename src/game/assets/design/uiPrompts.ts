import type { ImagePromptSpec } from "./imagePrompts.js";
import { sharedNegativePrompt } from "./negativePrompt.js";

const style =
  "original dark gothic science-fantasy board-game art, premium tabletop component, aged blackened metal, worn parchment, blue-white rift glow, cinematic lighting, clear silhouette, readable composition, original symbols only";

export const uiPrompts: ImagePromptSpec[] = [
  {
    id: "ui_card_frame_red",
    fileName: "ui_card_frame_red.png",
    outputPath: "/assets/riftfall/ui/ui_card_frame_red.png",
    assetType: "uiFrame",
    size: "card",
    prompt: `${style}; transparent red threat card frame, black metal border, ember-red pressure glow, empty center, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Red threat card frame."
  },
  {
    id: "ui_card_frame_blue",
    fileName: "ui_card_frame_blue.png",
    outputPath: "/assets/riftfall/ui/ui_card_frame_blue.png",
    assetType: "uiFrame",
    size: "card",
    prompt: `${style}; transparent blue threat card frame, black metal border, cold resolve glow, empty center, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Blue threat card frame."
  },
  {
    id: "ui_card_frame_yellow",
    fileName: "ui_card_frame_yellow.png",
    outputPath: "/assets/riftfall/ui/ui_card_frame_yellow.png",
    assetType: "uiFrame",
    size: "card",
    prompt: `${style}; transparent yellow threat card frame, black metal border, yellow stealth glow, empty center, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Yellow threat card frame."
  },
  {
    id: "ui_scenario_frame",
    fileName: "ui_scenario_frame.png",
    outputPath: "/assets/riftfall/ui/ui_scenario_frame.png",
    assetType: "uiFrame",
    size: "wide",
    prompt: `${style}; transparent scenario sheet frame with dramatic center art window, confrontation text panel, gold-blue breach framing, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Scenario sheet frame."
  },
  {
    id: "token_shield",
    fileName: "token_shield.png",
    outputPath: "/assets/riftfall/tokens/token_shield.png",
    assetType: "token",
    size: "icon",
    prompt: "Round board-game token, blue shield field symbol, aged metal rim, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Shield token."
  },
  {
    id: "token_path",
    fileName: "token_path.png",
    outputPath: "/assets/riftfall/tokens/token_path.png",
    assetType: "token",
    size: "icon",
    prompt: "Round board-game token, broken-path symbol, aged metal rim, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Path token."
  },
  {
    id: "token_trophy",
    fileName: "token_trophy.png",
    outputPath: "/assets/riftfall/tokens/token_trophy.png",
    assetType: "token",
    size: "icon",
    prompt: "Round bronze trophy coin token, command seal symbol, aged worn metal, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Trophy token."
  },
  {
    id: "token_contract_progress",
    fileName: "token_contract_progress.png",
    outputPath: "/assets/riftfall/tokens/token_contract_progress.png",
    assetType: "token",
    size: "icon",
    prompt: "Round contract progress token, parchment and star-map symbol, bronze rim, transparent background, no text.",
    negativePrompt: sharedNegativePrompt,
    usage: "Contract progress token."
  }
];
