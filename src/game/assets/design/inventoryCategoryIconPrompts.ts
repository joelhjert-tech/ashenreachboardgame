import type { ImagePromptSpec } from "./imagePrompts.js";

const sharedPrompt = [
  "Original Ashenreach inventory category emblem for a private phone controller.",
  "Single centered grimdark industrial heraldic icon, blackened iron, worn brass edges, restrained cyan signal glow and ember-orange activation accents.",
  "Bold simple silhouette readable at 36 pixels, front-facing, high contrast, no cast shadow.",
  "Perfectly flat solid green chroma-key background with crisp separated edges."
].join(" ");

const negativePrompt = [
  "No words, letters, numbers, faces, hands, card art, board art, logo, watermark, glossy plastic, friendly toy styling, external franchise iconography, scenery, floor, reflection, or textured background."
].join(" ");

const categories = [
  ["edge-cards", "two slightly offset sealed tactical card plates with a central faceted cyan signal diamond and symmetrical ember calibration lights"],
  ["artifacts", "faceted eight-point relic star surrounding a small signal lens"],
  ["equipment", "angular forge key crossed with a compact industrial breach blade"],
  ["followers", "faceless hooded companion bust held inside a broken oath ring"],
  ["status", "cracked iron mask with restraint staples and a narrow ember fissure"],
  ["progression", "ascending signal spire inside a broken measuring ring"]
] as const;

export const inventoryCategoryIconPrompts: ImagePromptSpec[] = categories.map(([id, subject]) => ({
  id: `inventory-category-${id}`,
  fileName: `${id}.png`,
  outputPath: `/assets/riftfall/ui/inventory-categories/${id}.png`,
  assetType: "icon",
  size: "icon",
  prompt: `${sharedPrompt} Category symbol: ${subject}.`,
  negativePrompt,
  usage: `${id} drawer emblem in the private phone inventory`,
  priority: 1,
  releaseRequired: true,
  placeholderAllowed: false
}));
