import type { ContractCard, EncounterCard, PrivateCharacter, PublicPlayerCharacter, Stat } from "./types.js";

const characterPortraitById: Record<string, string> = {
  "char_void_marshal_kael_dorn": "/assets/riftfall/characters/char_void_marshal_kael_dorn.png",
  "char_veyra_sable": "/assets/riftfall/characters/char_veyra_sable.png",
  "char_oran_voss": "/assets/riftfall/characters/char_oran_voss.png",
  "char_ser_juno_vale": "/assets/riftfall/characters/char_ser_juno_vale.png",
  "char_mother_elira_vane": "/assets/riftfall/characters/char_mother_elira_vane.png",
  "char_talen_korr": "/assets/riftfall/characters/char_talen_korr.png",
  "void-marshal": "/assets/riftfall/characters/char_void_marshal_kael_dorn.png",
  "signal-witch": "/assets/riftfall/characters/char_oran_voss.png",
  "grave-engineer": "/assets/riftfall/characters/char_talen_korr.png",
  "rift-cartographer": "/assets/riftfall/characters/char_oran_voss.png",
  "siege-medic": "/assets/riftfall/characters/char_ser_juno_vale.png",
  "oathbroken-prince": "/assets/riftfall/characters/char_ser_juno_vale.png",
  "black-ledger-agent": "/assets/riftfall/characters/char_veyra_sable.png",
  "cinder-monk": "/assets/riftfall/characters/char_mother_elira_vane.png",
  "salvage-warden": "/assets/riftfall/characters/char_talen_korr.png",
  "fleet-elder": "/assets/riftfall/characters/char_void_marshal_kael_dorn.png"
};

const contractArtById: Record<string, string> = {
  "choir-hush-census": "/assets/riftfall/cards/missions/mission_choir_quietus.png",
  "compact-cleanse-ledger": "/assets/riftfall/cards/missions/mission_restart_void_relay.png",
  "umbral-bloom-reaping-right": "/assets/riftfall/cards/missions/mission_hunt_riftspawn.png"
};

const encounterArtById: Record<string, string> = {
  "cinder-veil-stalker": "/assets/riftfall/cards/threat-red/red_enemy_red_maw_raiders.png",
  "glass-chime-swarm": "/assets/riftfall/cards/threat-blue/blue_event_rift_whispers.png",
  "grave-silt-press": "/assets/riftfall/cards/threat-red/red_encounter_shattered_barricade.png",
  "latchspire-raider": "/assets/riftfall/cards/threat-yellow/yellow_enemy_shiv_market_crew.png",
  "relay-husk": "/assets/riftfall/cards/threat-yellow/yellow_event_route_splice.png",
  "slag-drone": "/assets/riftfall/cards/threat-yellow/yellow_enemy_null_drone.png",
  "smoke-leech-clutch": "/assets/riftfall/cards/threat-red/red_enemy_cinder_hounds.png"
};

const statFrameByStat: Record<Stat, string> = {
  command: "/assets/riftfall/ui/ui_card_frame_red.png",
  grit: "/assets/riftfall/ui/ui_card_frame_red.png",
  signal: "/assets/riftfall/ui/ui_card_frame_blue.png",
  guile: "/assets/riftfall/ui/ui_card_frame_yellow.png",
  forge: "/assets/riftfall/ui/ui_card_frame_yellow.png"
};

export function getPhoneBackgroundPath(): string {
  return "/assets/riftfall/ui/ui_phone_controller_background.png";
}

export function getCharacterFramePath(): string {
  return "/assets/riftfall/ui/ui_character_sheet_frame.png";
}

export function getPhoneSheetFramePath(): string {
  return "/assets/riftfall/ui/ui_character_sheet_frame.png";
}

export function getScenarioFramePath(): string {
  return "/assets/riftfall/ui/ui_scenario_frame.png";
}

export function getCharacterPortraitPath(characterId: string): string {
  return characterPortraitById[characterId] ?? "/assets/riftfall/characters/char_void_marshal_kael_dorn.png";
}

export function getContractArtPath(contractId: string): string {
  return contractArtById[contractId] ?? "/assets/riftfall/cards/missions/mission_restart_void_relay.png";
}

export function getEncounterArtPath(encounterId: string): string {
  return encounterArtById[encounterId] ?? "/assets/riftfall/cards/threat-red/red_event_trench_blast.png";
}

export function getEncounterFramePath(stat: Stat): string {
  return statFrameByStat[stat];
}

export function getCharacterPortraitStyle(character: Pick<PrivateCharacter | PublicPlayerCharacter, "id">): string {
  return `url(${getCharacterFramePath()}), url(${getCharacterPortraitPath(character.id)})`;
}

export function getContractCardStyle(contract: Pick<ContractCard, "id">): string {
  return `url(${getScenarioFramePath()}), url(${getContractArtPath(contract.id)})`;
}

export function getEncounterCardStyle(encounter: Pick<EncounterCard, "id" | "stat">): string {
  return `url(${getEncounterFramePath(encounter.stat)}), url(${getEncounterArtPath(encounter.id)})`;
}
