import type { ImagePromptSpec } from "./imagePrompts.js";

export const loreBibleVisualPrompts: ImagePromptSpec[] = [{
  id: "lore-bible-events-overview",
  fileName: "events-overview.png",
  outputPath: "/assets/riftfall/ui/lore-bible/events-overview.png",
  assetType: "background",
  size: "wide",
  prompt: [
    "Original Ashen Reach Events-volume chronicle, wide landscape tableau.",
    "Several Reach-wide disturbances unfold across one connected ring-road civilization:",
    "an artifact vault wakes in cold signal light, a bellglass crowd surge burns under ember sparks,",
    "a crown-shaped shadow crosses the inner route, and a buried saint-machine opens one luminous eye.",
    "Unify the scenes with concentric black-basalt causeways, corroded iron shrines, ritual circuitry,",
    "ash weather, scorched brass, ember red, cold blue-white signal light, and restrained violet breach energy.",
    "Premium painterly cinematic board-game concept art, high oblique viewpoint, readable at admin-panel scale."
  ].join(" "),
  negativePrompt: [
    "No words, letters, numbers, logos, watermark, card border, interface controls, modern objects,",
    "recognizable copyrighted characters, copied franchise iconography, or unrelated character lineup."
  ].join(" "),
  usage: "Overview tableau shown when the Lore Bible Events volume is selected",
  priority: 1,
  releaseRequired: true,
  placeholderAllowed: false
}];
