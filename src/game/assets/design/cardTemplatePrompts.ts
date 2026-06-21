import type { ImagePromptSpec } from "./imagePrompts.js";
import { sharedNegativePrompt } from "./negativePrompt.js";

const style =
  "original dark gothic science-fantasy board-game art, premium tabletop component, aged blackened metal, worn parchment, blue-white rift glow, cinematic lighting, clear silhouette, readable composition, original symbols only";

export const cardTemplatePrompts: ImagePromptSpec[] = [
  {
    id: "card_back_mission",
    fileName: "card_back_mission.png",
    outputPath: "/assets/riftfall/cards/missions/card_back_mission.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for mission deck, bronze route sigils, folded star map motif, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Mission deck back."
  },
  {
    id: "card_back_threat_red",
    fileName: "card_back_threat_red.png",
    outputPath: "/assets/riftfall/cards/threat-red/card_back_threat_red.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for red threat deck, blade sigils, ember-red pressure glow, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Red threat deck back."
  },
  {
    id: "card_back_threat_blue",
    fileName: "card_back_threat_blue.png",
    outputPath: "/assets/riftfall/cards/threat-blue/card_back_threat_blue.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for blue threat deck, vigil eye sigils, cold blue glow, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Blue threat deck back."
  },
  {
    id: "card_back_threat_yellow",
    fileName: "card_back_threat_yellow.png",
    outputPath: "/assets/riftfall/cards/threat-yellow/card_back_threat_yellow.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for yellow threat deck, split key sigils, yellow stealth glow, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Yellow threat deck back."
  },
  {
    id: "card_back_power",
    fileName: "card_back_power.png",
    outputPath: "/assets/riftfall/cards/power/card_back_power.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for power deck, charged star symbol, white-blue energy lines, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Power deck back."
  },
  {
    id: "card_back_corruption",
    fileName: "card_back_corruption.png",
    outputPath: "/assets/riftfall/cards/corruption/card_back_corruption.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for corruption deck, violet rift scar symbol, dark cracked lacquer, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Corruption deck back."
  },
  {
    id: "card_back_relic",
    fileName: "card_back_relic.png",
    outputPath: "/assets/riftfall/cards/relics/card_back_relic.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for relic deck, saint-star icon, gold enamel, sacred blue core light, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Relic deck back."
  },
  {
    id: "card_back_wargear",
    fileName: "card_back_wargear.png",
    outputPath: "/assets/riftfall/cards/wargear/card_back_wargear.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for wargear deck, gear lattice and black steel pattern, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Wargear deck back."
  }
];
