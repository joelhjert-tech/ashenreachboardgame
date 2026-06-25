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
    id: "artifact_route_star",
    fileName: "artifact_route_star.png",
    outputPath: "/assets/riftfall/cards/artifacts/artifact_route_star.png",
    assetType: "artifactCardArt",
    prompt: "golden route-star artifact floating above a cracked altar, blue-white sacred light",
    usage: "Artifact card art sample."
  },
  {
    id: "artifact_void_key",
    fileName: "artifact_void_key.png",
    outputPath: "/assets/riftfall/cards/artifacts/artifact_void_key.png",
    assetType: "artifactCardArt",
    prompt: "ancient void key of gold and black glass, floating map rings, final gate artifact",
    usage: "Artifact card art sample."
  },
  {
    id: "artifact_choir_lantern",
    fileName: "artifact_choir_lantern.png",
    outputPath: "/assets/riftfall/cards/artifacts/artifact_choir_lantern.png",
    assetType: "artifactCardArt",
    prompt: "brass lantern containing blue ghost flame, saint scrolls tied around the handle, holy protection artifact",
    usage: "Artifact card art sample."
  },
  {
    id: "wargear_riftblade",
    fileName: "wargear_riftblade.png",
    outputPath: "/assets/riftfall/cards/wargear/wargear_riftblade.png",
    assetType: "wargearCardArt",
    prompt: "black metal sword with a blue-white energy edge resting on worn tactical cloth",
    usage: "Wargear card art sample."
  },
  {
    id: "wargear_void_plate",
    fileName: "wargear_void_plate.png",
    outputPath: "/assets/riftfall/cards/wargear/wargear_void_plate.png",
    assetType: "wargearCardArt",
    prompt: "heavy void plate armor on a repair stand, silver-black plates, blue shield nodes",
    usage: "Wargear card art sample."
  },
  {
    id: "wargear_scrap_drone",
    fileName: "wargear_scrap_drone.png",
    outputPath: "/assets/riftfall/cards/wargear/wargear_scrap_drone.png",
    assetType: "wargearCardArt",
    prompt: "small hovering scrap drone with lamp and tool arms, workshop sparks, useful scavenger gear",
    usage: "Wargear card art sample."
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
