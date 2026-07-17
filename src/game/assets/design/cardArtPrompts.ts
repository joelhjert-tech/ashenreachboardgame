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

const promotedContractMissionArtPaths: Record<string, { fileName: string; outputPath: string }> = {
  mission_break_the_raider_chain: {
    fileName: "break-the-raider-chain.png",
    outputPath: "/assets/cards/contracts/break-the-raider-chain.png"
  },
  mission_choir_quietus: {
    fileName: "choir-quietus.png",
    outputPath: "/assets/cards/contracts/choir-quietus.png"
  },
  mission_cleanse_ember_sanctum: {
    fileName: "cleanse-ember-sanctum.png",
    outputPath: "/assets/cards/contracts/cleanse-ember-sanctum.png"
  },
  mission_gatefire_vigil: {
    fileName: "gatefire-vigil.png",
    outputPath: "/assets/cards/contracts/gatefire-vigil.png"
  },
  mission_hunt_breachborn: {
    fileName: "hunt-breachborn.png",
    outputPath: "/assets/cards/contracts/hunt-breachborn.png"
  },
  mission_map_broken_paths: {
    fileName: "map-broken-paths.png",
    outputPath: "/assets/cards/contracts/map-broken-paths.png"
  },
  mission_pilgrim_convoy: {
    fileName: "pilgrim-convoy.png",
    outputPath: "/assets/cards/contracts/pilgrim-convoy.png"
  },
  mission_restart_void_relay: {
    fileName: "restart-void-relay.png",
    outputPath: "/assets/cards/contracts/restart-void-relay.png"
  },
  mission_salvage_the_bellframe: {
    fileName: "salvage-the-bellframe.png",
    outputPath: "/assets/cards/contracts/salvage-the-bellframe.png"
  }
};

const missionCardArtPrompts = missions.map((mission) => {
  const promotedArtPath = promotedContractMissionArtPaths[mission.id];

  return {
    id: `contract_art_${mission.id}`,
    fileName: promotedArtPath?.fileName ?? `${mission.id}.png`,
    outputPath: promotedArtPath?.outputPath ?? `/assets/riftfall/cards/contracts/${mission.id}.png`,
    assetType: "missionCardArt" as const,
    size: "card" as const,
    prompt: `${style}; ${mission.imagePrompt}, no text`,
    negativePrompt: sharedNegativePrompt,
    usage: `${mission.name} contract card art.`
  };
});

const promotedThreatArtPaths: Record<string, { fileName: string; outputPath: string }> = {
  red_asset_breach_halberd: {
    fileName: "breach-halberd.png",
    outputPath: "/assets/cards/threats/red/breach-halberd.png"
  },
  red_encounter_shattered_barricade: {
    fileName: "shattered-barricade.png",
    outputPath: "/assets/cards/threats/red/shattered-barricade.png"
  },
  red_enemy_cinder_hounds: {
    fileName: "cinder-hounds.png",
    outputPath: "/assets/cards/threats/red/cinder-hounds.png"
  },
  red_enemy_red_maw_raiders: {
    fileName: "red-maw-raiders.png",
    outputPath: "/assets/cards/threats/red/red-maw-raiders.png"
  },
  red_event_trench_blast: {
    fileName: "trench-blast.png",
    outputPath: "/assets/cards/threats/red/trench-blast.png"
  },
  blue_asset_sanctifier_beads: {
    fileName: "sanctifier-beads.png",
    outputPath: "/assets/cards/threats/blue/sanctifier-beads.png"
  },
  blue_encounter_hushed_chapel: {
    fileName: "hushed-chapel.png",
    outputPath: "/assets/cards/threats/blue/hushed-chapel.png"
  },
  blue_enemy_choir_wraith: {
    fileName: "choir-wraith.png",
    outputPath: "/assets/cards/threats/blue/choir-wraith.png"
  },
  blue_enemy_veil_censor: {
    fileName: "veil-censor.png",
    outputPath: "/assets/cards/threats/blue/veil-censor.png"
  },
  blue_event_rift_whispers: {
    fileName: "rift-whispers.png",
    outputPath: "/assets/cards/threats/blue/rift-whispers.png"
  },
  yellow_asset_wireghost_key: {
    fileName: "wireghost-key.png",
    outputPath: "/assets/cards/threats/yellow/wireghost-key.png"
  },
  yellow_encounter_locked_vault: {
    fileName: "locked-vault.png",
    outputPath: "/assets/cards/threats/yellow/locked-vault.png"
  },
  yellow_enemy_null_drone: {
    fileName: "null-drone.png",
    outputPath: "/assets/cards/threats/yellow/null-drone.png"
  },
  yellow_enemy_shiv_market_crew: {
    fileName: "shiv-market-crew.png",
    outputPath: "/assets/cards/threats/yellow/shiv-market-crew.png"
  },
  yellow_event_route_splice: {
    fileName: "route-splice.png",
    outputPath: "/assets/cards/threats/yellow/route-splice.png"
  }
};

const threatCardArtPrompts = allThreatCards.map((card) => ({
  id: `threat_art_${card.id}`,
  fileName: promotedThreatArtPaths[card.id]?.fileName ?? `${card.id}.png`,
  outputPath: promotedThreatArtPaths[card.id]?.outputPath ?? `/assets/riftfall/cards/threat-${card.color}/${card.id}.png`,
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
