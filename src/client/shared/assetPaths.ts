import {
  CARD_IMAGE_FALLBACK_PATHS,
  type CardImageType
} from "../../game/assets/design/cardImageCatalog.js";
import { getRuntimeCardArtPath } from "../../game/assets/runtime/cardArtRuntimeCatalog.js";
import type { ContractCard, EncounterCard, Stat } from "./types.js";

const characterPortraitById: Record<string, string> = {
  "char_void_marshal_kael_dorn": "/assets/riftfall/characters/char_void_marshal_kael_dorn.png",
  "char_veyra_sable": "/assets/riftfall/characters/char_veyra_sable.png",
  "char_oran_voss": "/assets/riftfall/characters/char_oran_voss.png",
  "char_ser_juno_vale": "/assets/riftfall/characters/char_ser_juno_vale.png",
  "char_mother_elira_vane": "/assets/riftfall/characters/char_mother_elira_vane.png",
  "char_talen_korr": "/assets/riftfall/characters/char_talen_korr.png",
  "char_ker_von_ker": "/assets/riftfall/characters/char_ker_von_ker.png",
  "char_kira_dog": "/assets/riftfall/characters/char_kira_dog.png",
  "char_popelord": "/assets/riftfall/characters/char_popelord.png",
  "char_deepdale": "/assets/riftfall/characters/char_deepdale.png",
  "char_bjornis": "/assets/riftfall/characters/char_bjornis.png",
  "char_rumi": "/assets/riftfall/characters/char_rumi.png",
  "char_master_alpha": "/assets/riftfall/characters/char_master_alpha.jpg",
  "void-marshal": "/assets/riftfall/characters/void-marshal.png",
  "signal-witch": "/assets/riftfall/characters/signal-witch.png",
  "grave-engineer": "/assets/riftfall/characters/grave-engineer.png",
  "rift-cartographer": "/assets/riftfall/characters/rift-cartographer.png",
  "siege-medic": "/assets/riftfall/characters/siege-medic.png",
  "oathbroken-prince": "/assets/riftfall/characters/oathbroken-prince.png",
  "black-ledger-agent": "/assets/riftfall/characters/black-ledger-agent.png",
  "cinder-monk": "/assets/riftfall/characters/cinder-monk.png",
  "salvage-warden": "/assets/riftfall/characters/salvage-warden.png",
  "fleet-elder": "/assets/riftfall/characters/fleet-elder.png"
};

const nemesisPortraitById: Record<string, string> = {
  nemesis_fary_lord: "/assets/riftfall/nemeses/nemesis_fary_lord.png",
  nemesis_glass_prophet: "/assets/riftfall/nemeses/nemesis_glass_prophet.png",
  nemesis_hollow_regent: "/assets/riftfall/nemeses/nemesis_hollow_regent.png",
  nemesis_choir_of_static: "/assets/riftfall/nemeses/nemesis_choir_of_static.png",
  nemesis_gravetide_colossus: "/assets/riftfall/nemeses/nemesis_gravetide_colossus.png",
  nemesis_iron_saint_malrec: "/assets/riftfall/nemeses/nemesis_iron_saint_malrec.png",
  nemesis_iron_vicar_orm: "/assets/riftfall/nemeses/nemesis_iron_vicar_orm.png",
  nemesis_kharvox_red_maw: "/assets/riftfall/nemeses/nemesis_kharvox_red_maw.png",
  nemesis_pale_huntress: "/assets/riftfall/nemeses/nemesis_pale_huntress.png",
  nemesis_specimen_null_x: "/assets/riftfall/nemeses/nemesis_specimen_null_x.png"
};

const statFrameByStat: Record<Stat, string> = {
  command: "/assets/riftfall/ui/ui_card_frame_red.png",
  grit: "/assets/riftfall/ui/ui_card_frame_red.png",
  signal: "/assets/riftfall/ui/ui_card_frame_blue.png",
  guile: "/assets/riftfall/ui/ui_card_frame_green.png",
  forge: "/assets/riftfall/ui/ui_card_frame_yellow.png"
};

const uiAssetPaths = [
  "/assets/riftfall/ui/ui_scenario_frame.png",
  "/assets/riftfall/ui/ui_card_frame_red.png",
  "/assets/riftfall/ui/ui_card_frame_blue.png",
  "/assets/riftfall/ui/ui_card_frame_green.png",
  "/assets/riftfall/ui/ui_card_frame_yellow.png",
  "/assets/riftfall/ui/shop-category-contract-broker.svg",
  "/assets/riftfall/ui/shop-category-forge-armoury.svg",
  "/assets/riftfall/ui/shop-category-market.svg",
  "/assets/riftfall/ui/shop-category-medicae-shrine.svg",
  "/assets/riftfall/ui/shop-category-relic-dealer.svg",
  "/assets/riftfall/ui/dice_roll_combat@2s.gif",
  "/assets/riftfall/ui/dice_roll_combat@2s.lottie.json"
];

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
  return getRuntimeCardArtPath(cardType, cardId) ?? getCardFallbackArtPath(cardType);
}

export function getGearCardArtId(gearId: string): string {
  return gearId.startsWith("artifact-") ? gearId : `artifact-${gearId}`;
}

export function getShopCategoryIconPath(category: string | null | undefined): string {
  switch (category) {
    case "contract-broker":
      return "/assets/riftfall/ui/shop-category-contract-broker.svg";
    case "forge-armoury":
      return "/assets/riftfall/ui/shop-category-forge-armoury.svg";
    case "medicae-shrine":
      return "/assets/riftfall/ui/shop-category-medicae-shrine.svg";
    case "relic-dealer":
      return "/assets/riftfall/ui/shop-category-relic-dealer.svg";
    case "market":
    default:
      return "/assets/riftfall/ui/shop-category-market.svg";
  }
}

export function getContractArtPath(contractId: string): string {
  return getCardArtPath("contract", contractId);
}

export function getEncounterArtPath(encounterId: string): string {
  return getCardArtPath("threat", encounterId);
}

export function getNemesisPortraitPath(nemesisId: string): string {
  const baseNemesisId = nemesisId.replace(/_seat-\d+$/, "");

  return (
    nemesisPortraitById[nemesisId] ??
    nemesisPortraitById[baseNemesisId] ??
    "/assets/riftfall/nemeses/nemesis_hollow_regent.png"
  );
}

export function getEncounterFramePath(stat: Stat): string {
  return statFrameByStat[stat];
}

export function getRuntimeAssetPaths(): string[] {
  return [
    ...Object.values(characterPortraitById),
    ...Object.values(nemesisPortraitById),
    ...Object.values(statFrameByStat),
    ...uiAssetPaths
  ].filter((value, index, paths) => paths.indexOf(value) === index);
}

export function getContractCardStyle(contract: Pick<ContractCard, "id">): string {
  return `url(${getScenarioFramePath()}), url(${getContractArtPath(contract.id)})`;
}

export function getEncounterCardStyle(encounter: Pick<EncounterCard, "id" | "stat">): string {
  return `url(${getEncounterFramePath(encounter.stat)}), url(${getEncounterArtPath(encounter.id)})`;
}
