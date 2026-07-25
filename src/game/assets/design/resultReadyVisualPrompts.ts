import type { ImagePromptSpec } from "./imagePrompts.js";

export const resultReadyVisualPrompts: ImagePromptSpec[] = [{
  id: "result-ready-verdict-gate",
  fileName: "verdict-gate.webp",
  outputPath: "/assets/riftfall/ui/result-ready/verdict-gate.webp",
  assetType: "uiFrame",
  size: "portrait",
  prompt: [
    "Original Ashen Reach vertical verdict gate environment for the private phone result screen.",
    "A monumental fractured industrial reliquary arch descends into a cyan signal ravine, built from blackened iron, worn brass, ash-dark masonry, and restrained ember light.",
    "Keep the center open enough for a jagged UI rift and total seal; strong dark edge framing supports two overlaid portrait cards.",
    "Cinematic, ancient, heavy, ominous, readable on a 390 pixel phone screen, no characters or game cards."
  ].join(" "),
  negativePrompt: [
    "No words, letters, numbers, logos, portraits, card art, icons, existing franchise imagery, watermark, interface controls, glossy toy materials, or transparent checkerboard."
  ].join(" "),
  usage: "Atmospheric frame behind the authoritative phone result-ready portrait pairing",
  priority: 1,
  releaseRequired: true,
  placeholderAllowed: false
}];
