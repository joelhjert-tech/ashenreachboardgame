import {
  CARD_IMAGE_FALLBACK_PATHS,
  type CardImageType
} from "../../game/assets/design/cardImageCatalog.js";
import { generatedCardImagePrompts } from "../../game/assets/design/generatedCardImagePrompts.js";
import type { ContractCard, EncounterCard, PrivateCharacter, PublicPlayerCharacter, Stat } from "./types.js";

const characterPortraitById: Record<string, string> = {
  "char_void_marshal_kael_dorn": "/assets/riftfall/characters/char_void_marshal_kael_dorn.png",
  "char_veyra_sable": "/assets/riftfall/characters/char_veyra_sable.png",
  "char_oran_voss": "/assets/riftfall/characters/char_oran_voss.png",
  "char_ser_juno_vale": "/assets/riftfall/characters/char_ser_juno_vale.png",
  "char_mother_elira_vane": "/assets/riftfall/characters/char_mother_elira_vane.png",
  "char_talen_korr": "/assets/riftfall/characters/char_talen_korr.png",
  "char_ker_von_ker": "/assets/riftfall/characters/char_ker_von_ker.png",
  "char_kira_dog": "/assets/riftfall/characters/char_kira_dog.png",
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

const nemesisPortraitById: Record<string, string> = {
  nemesis_fary_lord: "/assets/riftfall/nemeses/nemesis_fary_lord.png",
  nemesis_glass_prophet: "/assets/riftfall/nemeses/nemesis_glass_prophet.png",
  nemesis_hollow_regent: "/assets/riftfall/nemeses/nemesis_hollow_regent.png",
  nemesis_iron_saint_malrec: "/assets/riftfall/nemeses/nemesis_iron_saint_malrec.png",
  nemesis_kharvox_red_maw: "/assets/riftfall/nemeses/nemesis_kharvox_red_maw.png",
  nemesis_specimen_null_x: "/assets/riftfall/nemeses/nemesis_specimen_null_x.png"
};

const statFrameByStat: Record<Stat, string> = {
  command: "/assets/riftfall/ui/ui_card_frame_red.png",
  grit: "/assets/riftfall/ui/ui_card_frame_red.png",
  signal: "/assets/riftfall/ui/ui_card_frame_blue.png",
  guile: "/assets/riftfall/ui/ui_card_frame_yellow.png",
  forge: "/assets/riftfall/ui/ui_card_frame_yellow.png"
};

const cardArtByType = generatedCardImagePrompts.reduce<Record<CardImageType, Record<string, string>>>(
  (summary, prompt) => {
    summary[prompt.cardType][prompt.cardId] = prompt.outputPath;
    return summary;
  },
  {
    threat: {},
    contract: {},
    anomaly: {},
    artifact: {},
    scar: {},
    escalation: {}
  }
);

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

export function getCardFallbackArtPath(cardType: CardImageType): string {
  return CARD_IMAGE_FALLBACK_PATHS[cardType];
}

export function getCardArtPath(cardType: CardImageType, cardId: string): string {
  return cardArtByType[cardType][cardId] ?? getCardFallbackArtPath(cardType);
}

export function getContractArtPath(contractId: string): string {
  return getCardArtPath("contract", contractId);
}

export function getEncounterArtPath(encounterId: string): string {
  return getCardArtPath("threat", encounterId);
}

export function getNemesisPortraitPath(nemesisId: string): string {
  return nemesisPortraitById[nemesisId] ?? "/assets/riftfall/nemeses/nemesis_hollow_regent.png";
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
