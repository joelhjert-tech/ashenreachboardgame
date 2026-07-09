import { missions } from "../../data/missions.js";
import { allThreatCards } from "../../data/threatDecks.js";
import type { ImagePromptSpec } from "./imagePrompts.js";
import { sharedNegativePrompt } from "./negativePrompt.js";

const style =
  "original dark gothic science-fantasy board-game art, premium tabletop component, aged blackened metal, worn parchment, blue-white rift glow, cinematic lighting, clear silhouette, readable composition, original symbols only";

const specialCardArtSeeds: Array<{
  id: string;
  fileName: string;
  outputPath: string;
  assetType:
    | "powerCardArt"
    | "corruptionCardArt"
    | "artifactCardArt"
    | "equipmentCardArt"
    | "wargearCardArt";
  prompt: string;
  usage: string;
}> = [
  {
    id: "route_note_rift_focus",
    fileName: "route_note_rift_focus.png",
    outputPath: "/assets/riftfall/cards/route-notes/route_note_rift_focus.png",
    assetType: "powerCardArt",
    prompt: "glowing blue-white star held inside a brass focusing device, energy arcs, decisive concentration",
    usage: "Route-note card art sample."
  },
  {
    id: "route_note_command_burst",
    fileName: "route_note_command_burst.png",
    outputPath: "/assets/riftfall/cards/route-notes/route_note_command_burst.png",
    assetType: "powerCardArt",
    prompt: "tactical command display flaring with white-blue symbols, officer hand over controls, decisive moment",
    usage: "Route-note card art sample."
  },
  {
    id: "route_note_last_second",
    fileName: "route_note_last_second.png",
    outputPath: "/assets/riftfall/cards/route-notes/route_note_last_second.png",
    assetType: "powerCardArt",
    prompt: "soldier dodging a blast at the final second, time-fracture glow, cinematic action",
    usage: "Route-note card art sample."
  },
  {
    id: "heat_card_rift_scar",
    fileName: "heat_card_rift_scar.png",
    outputPath: "/assets/riftfall/cards/heat/heat_card_rift_scar.png",
    assetType: "corruptionCardArt",
    prompt: "violet-blue scar spreading across skin and armor, dark organic metal veins, ominous close-up",
    usage: "Heat card art sample."
  },
  {
    id: "heat_card_hollow_voice",
    fileName: "heat_card_hollow_voice.png",
    outputPath: "/assets/riftfall/cards/heat/heat_card_hollow_voice.png",
    assetType: "corruptionCardArt",
    prompt: "shadow figure whispering through a cracked visor, blue ghost mouth, psychological horror",
    usage: "Heat card art sample."
  },
  {
    id: "heat_card_black_mirror",
    fileName: "heat_card_black_mirror.png",
    outputPath: "/assets/riftfall/cards/heat/heat_card_black_mirror.png",
    assetType: "corruptionCardArt",
    prompt: "black mirror showing a distorted reflection with violet rift cracks and cold candlelight",
    usage: "Heat card art sample."
  },
  {
    id: "artifact-route-star",
    fileName: "artifact-route-star.png",
    outputPath: "/assets/cards/artifacts/artifact-route-star.png",
    assetType: "artifactCardArt",
    prompt: "golden route-star artifact floating above a cracked altar, blue-white sacred light",
    usage: "Route Star artifact card art."
  },
  {
    id: "artifact-void-key",
    fileName: "artifact-void-key.png",
    outputPath: "/assets/cards/artifacts/artifact-void-key.png",
    assetType: "artifactCardArt",
    prompt: "ancient void key of gold and black glass, floating map rings, final gate artifact",
    usage: "Void Key artifact card art."
  },
  {
    id: "artifact-choir-lantern",
    fileName: "artifact-choir-lantern.png",
    outputPath: "/assets/cards/artifacts/artifact-choir-lantern.png",
    assetType: "artifactCardArt",
    prompt: "brass lantern containing blue ghost flame, saint scrolls tied around the handle, holy protection artifact",
    usage: "Choir Lantern artifact card art."
  },
  {
    id: "equipment-riftblade",
    fileName: "riftblade.png",
    outputPath: "/assets/cards/equipment/riftblade.png",
    assetType: "equipmentCardArt",
    prompt: "black metal sword with a blue-white energy edge resting on worn tactical cloth",
    usage: "Riftblade equipment card art."
  },
  {
    id: "equipment-void-plate",
    fileName: "void-plate.png",
    outputPath: "/assets/cards/equipment/void-plate.png",
    assetType: "equipmentCardArt",
    prompt: "heavy void plate armor on a repair stand, silver-black plates, blue shield nodes",
    usage: "Void Plate equipment card art."
  },
  {
    id: "equipment-scrap-drone",
    fileName: "scrap-drone.png",
    outputPath: "/assets/cards/equipment/scrap-drone.png",
    assetType: "equipmentCardArt",
    prompt: "small hovering scrap drone with lamp and tool arms, workshop sparks, useful scavenger gear",
    usage: "Scrap Drone equipment card art."
  }
];

const missionCardArtPrompts = missions.map((mission) => ({
  id: `contract_art_${mission.id}`,
  fileName: `${mission.id}.png`,
  outputPath: `/assets/riftfall/cards/contracts/${mission.id}.png`,
  assetType: "missionCardArt" as const,
  size: "card" as const,
  prompt: `${style}; ${mission.imagePrompt}, no text`,
  negativePrompt: sharedNegativePrompt,
  usage: `${mission.name} contract card art.`
}));

const threatCardArtPrompts = allThreatCards.map((card) => ({
  id: `threat_art_${card.id}`,
  fileName: `${card.id}.png`,
  outputPath: `/assets/riftfall/cards/threat-${card.color}/${card.id}.png`,
  assetType: "threatCardArt" as const,
  size: "card" as const,
  prompt: `${style}; ${card.imagePrompt}, no text`,
  negativePrompt: sharedNegativePrompt,
  usage: `${card.name} ${card.color} threat card art.`
}));

export const cardArtPrompts: ImagePromptSpec[] = [
  ...missionCardArtPrompts,
  ...threatCardArtPrompts,
  ...specialCardArtSeeds.map((seed) => ({
    ...seed,
    size: "card" as const,
    prompt: `${style}; ${seed.prompt}, no text`,
    negativePrompt: sharedNegativePrompt
  }))
];
