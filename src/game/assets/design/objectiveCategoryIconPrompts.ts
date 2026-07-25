import type { ImagePromptSpec } from "./imagePrompts.js";

const sharedPrompt = [
  "Original Ashenreach objective-category emblem for a private phone controller.",
  "Single centered grim industrial heraldic object, blackened iron, worn brass, bone ceramic, restrained cyan signal light and ember-red accents.",
  "Bold silhouette readable at 64 pixels on a matte near-black vignette."
].join(" ");

const negativePrompt = [
  "No words, letters, numbers, portraits, existing franchise iconography, card text, board art, logo, watermark, glossy toy styling, or transparent checkerboard."
].join(" ");

const categories = [
  ["shared-mission", "split beacon crown opening over an illuminated route toward a distant signal spire"],
  ["contract", "sealed iron oath scroll bound by a chain clasp"],
  ["rivalry", "two opposing broken spearheads around one suspended ember shard"],
  ["completed", "closed archival reliquary with a bold check-shaped cyan metal inlay"]
] as const;

export const objectiveCategoryIconPrompts: ImagePromptSpec[] = categories.map(([id, subject]) => ({
  id: `objective-category-${id}`,
  fileName: `${id}.webp`,
  outputPath: `/assets/riftfall/ui/objective-categories/${id}.webp`,
  assetType: "icon",
  size: "icon",
  prompt: `${sharedPrompt} Category symbol: ${subject}.`,
  negativePrompt,
  usage: `${id} drawer emblem in the private phone Objectives screen`,
  priority: 1,
  releaseRequired: true,
  placeholderAllowed: false
}));
