import type { ImagePromptSpec } from "./imagePrompts.js";
import { sharedNegativePrompt } from "./negativePrompt.js";

const style =
  "original dark gothic science-fantasy board-game art, premium tabletop component, aged blackened metal, worn parchment, blue-white rift glow, cinematic lighting, clear silhouette, readable composition, original symbols only";

export const cardTemplatePrompts: ImagePromptSpec[] = [
  {
    id: "card_back_contract",
    fileName: "card_back_contract.png",
    outputPath: "/assets/riftfall/cards/contracts/card_back_contract.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for contract deck, bronze route sigils, folded star map motif, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Contract deck back."
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
    id: "card_back_route_note",
    fileName: "card_back_route_note.png",
    outputPath: "/assets/riftfall/cards/route-notes/card_back_route_note.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for route-note deck, charged star symbol, white-blue energy lines, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Route-note deck back."
  },
  {
    id: "card_back_heat",
    fileName: "card_back_heat.png",
    outputPath: "/assets/riftfall/cards/heat/card_back_heat.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for Heat deck, violet rift scar symbol, dark cracked lacquer, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Heat deck back."
  },
  {
    id: "card_back_artifact",
    fileName: "card_back_artifact.png",
    outputPath: "/assets/riftfall/cards/artifacts/card_back_artifact.png",
    assetType: "cardBack",
    size: "card",
    prompt: `${style}; card back for artifact deck, route-star icon, gold enamel, sacred blue core light, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: "Artifact deck back."
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
