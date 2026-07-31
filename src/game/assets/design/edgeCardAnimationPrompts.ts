import type { ImagePromptSpec } from "./imagePrompts.js";

const negativePrompt = [
  "No words, letters, numbers, logos, characters, hands, game cards, franchise iconography, watermark, interface controls, or modern clean science-fiction surfaces."
].join(" ");

export const edgeCardAnimationPrompts: ImagePromptSpec[] = [
  {
    id: "signal-theatre-edge-card-charge",
    fileName: "edge-card-charge.png",
    outputPath: "/assets/riftfall/ui/signal-theatre/edge-card/edge-card-charge.png",
    assetType: "background",
    size: "wide",
    prompt: [
      "Original Ashen Reach Signal Theatre charge frame, preserving the established reliquary-aperture chamber composition.",
      "A cyan concentric signal core builds at the exact center inside an ancient blackened-iron and worn-brass machine shrine.",
      "Tight radial energy rings, fine electrical filaments, restrained ember edge lights, dark readable perimeter, cinematic television composition.",
      "The chamber remains recognizable and stable so it can crossfade with the encounter card-reveal base."
    ].join(" "),
    negativePrompt,
    usage: "TV Edge Card animation charge frame between card turn and detonation",
    priority: 1,
    releaseRequired: true,
    placeholderAllowed: false
  },
  {
    id: "signal-theatre-edge-card-detonation",
    fileName: "edge-card-detonation.png",
    outputPath: "/assets/riftfall/ui/signal-theatre/edge-card/edge-card-detonation.png",
    assetType: "background",
    size: "wide",
    prompt: [
      "Original Ashen Reach Signal Theatre detonation frame, preserving the same reliquary-aperture chamber and camera.",
      "The centered cyan signal core erupts into a violent radial shockwave with luminous shards, electrical spokes, vapor, and fine metallic debris.",
      "Ancient blackened iron and worn brass remain visible at the dark perimeter; intense white-cyan center supports a brief card-burn transition.",
      "Cinematic television composition designed to crossfade directly from the matching charge frame."
    ].join(" "),
    negativePrompt,
    usage: "TV Edge Card animation explosion and card-burn frame",
    priority: 1,
    releaseRequired: true,
    placeholderAllowed: false
  }
];
