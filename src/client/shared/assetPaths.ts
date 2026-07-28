import {
  CARD_IMAGE_FALLBACK_PATHS,
  type CardImageType
} from "../../game/assets/design/cardImageCatalog.js";
import { getRuntimeCardArtPath } from "../../game/assets/runtime/cardArtRuntimeCatalog.js";
import { getSignalTheatreEnvironmentPaths } from "../tv/signalTheatreEnvironmentManifest.js";
import type { ContractCard, EncounterCard, GearTier, Stat } from "./types.js";
import { SIGNAL_PIECE_IDS, getSignalPieceAssetPath } from "../../shared/signalPieceCatalog.js";

const characterPortraitById: Record<string, string> = {
  "cinder-wattle": "/assets/riftfall/characters/cinder-wattle.png",
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
  nemesis_ash_regent: "/assets/riftfall/nemeses/nemesis_ash_regent.png",
  nemesis_devourer_beneath: "/assets/riftfall/nemeses/nemesis_devourer_beneath.png",
  nemesis_dying_star_core: "/assets/riftfall/nemeses/nemesis_dying_star_core.png",
  nemesis_fary_lord: "/assets/riftfall/nemeses/nemesis_fary_lord.png",
  nemesis_false_hero: "/assets/riftfall/nemeses/nemesis_false_hero.png",
  nemesis_glass_prophet: "/assets/riftfall/nemeses/nemesis_glass_prophet.png",
  nemesis_hollow_regent: "/assets/riftfall/nemeses/nemesis_hollow_regent.png",
  nemesis_choir_of_static: "/assets/riftfall/nemeses/nemesis_choir_of_static.png",
  nemesis_gravetide_colossus: "/assets/riftfall/nemeses/nemesis_gravetide_colossus.png",
  nemesis_iron_saint_malrec: "/assets/riftfall/nemeses/nemesis_iron_saint_malrec.png",
  nemesis_iron_vicar_orm: "/assets/riftfall/nemeses/nemesis_iron_vicar_orm.png",
  nemesis_kharvox_red_maw: "/assets/riftfall/nemeses/nemesis_kharvox_red_maw.png",
  nemesis_pale_huntress: "/assets/riftfall/nemeses/nemesis_pale_huntress.png",
  nemesis_pallid_curator: "/assets/riftfall/nemeses/nemesis_pallid_curator.png",
  nemesis_unnamed_prisoner: "/assets/riftfall/nemeses/nemesis_unnamed_prisoner.png",
  nemesis_specimen_null_x: "/assets/riftfall/nemeses/nemesis_specimen_null_x.png"
};

const statFrameByStat: Record<Stat, string> = {
  command: "/assets/riftfall/ui/ui_card_frame_red.png",
  grit: "/assets/riftfall/ui/ui_card_frame_red.png",
  signal: "/assets/riftfall/ui/ui_card_frame_blue.png",
  guile: "/assets/riftfall/ui/ui_card_frame_green.png",
  forge: "/assets/riftfall/ui/ui_card_frame_yellow.png"
};

const signalTheatreStatSealByStat: Record<Stat, string> = {
  command: "/assets/riftfall/ui/signal-theatre/stat-seals/command.png",
  grit: "/assets/riftfall/ui/signal-theatre/stat-seals/grit.png",
  signal: "/assets/riftfall/ui/signal-theatre/stat-seals/signal.png",
  guile: "/assets/riftfall/ui/signal-theatre/stat-seals/guile.png",
  forge: "/assets/riftfall/ui/signal-theatre/stat-seals/forge.png"
};

const signalTheatreResultCrestByOutcome = {
  success: "/assets/riftfall/ui/signal-theatre/results/success.png",
  defeat: "/assets/riftfall/ui/signal-theatre/results/defeat.png"
} as const;

const signalTheatreDieFacePath =
  "/assets/riftfall/ui/signal-theatre/dice/ashenreach-die-face.webp";

const signalTheatreCardRevealPaths = {
  chamber: "/assets/riftfall/ui/signal-theatre/card-reveal/reliquary-aperture.webp",
  cardBack: "/assets/riftfall/ui/signal-theatre/card-reveal/reliquary-card-back.webp"
} as const;

export type InventoryCategoryIcon = "artifacts" | "equipment" | "followers" | "missions" | "status" | "progression";
export type ObjectiveCategoryIcon = "shared-mission" | "contract" | "rivalry" | "completed";

const inventoryCategoryIconByCategory: Record<InventoryCategoryIcon, string> = {
  artifacts: "/assets/riftfall/ui/inventory-categories/artifacts.png",
  equipment: "/assets/riftfall/ui/inventory-categories/equipment.png",
  followers: "/assets/riftfall/ui/inventory-categories/followers.png",
  missions: "/assets/riftfall/ui/objective-categories/completed.webp",
  status: "/assets/riftfall/ui/inventory-categories/status.png",
  progression: "/assets/riftfall/ui/inventory-categories/progression.png"
};

const objectiveCategoryIconByCategory: Record<ObjectiveCategoryIcon, string> = {
  "shared-mission": "/assets/riftfall/ui/objective-categories/shared-mission.webp",
  contract: "/assets/riftfall/ui/objective-categories/contract.webp",
  rivalry: "/assets/riftfall/ui/objective-categories/rivalry.webp",
  completed: "/assets/riftfall/ui/objective-categories/completed.webp"
};

const resultReadyGatePath = "/assets/riftfall/ui/result-ready/verdict-gate.webp";

const uiAssetPaths = [
  "/assets/riftfall/ui/ashen-reach-lobby-stage.png",
  "/assets/riftfall/ui/signal-theatre/world-stage.png",
  "/assets/riftfall/ui/signal-theatre/operative-beacon.png",
  "/assets/riftfall/ui/signal-theatre/arrival-seal.png",
  "/assets/riftfall/ui/signal-theatre/journey-path.png",
  ...SIGNAL_PIECE_IDS.map(getSignalPieceAssetPath),
  ...Object.values(signalTheatreStatSealByStat),
  ...Object.values(signalTheatreResultCrestByOutcome),
  signalTheatreDieFacePath,
  ...Object.values(signalTheatreCardRevealPaths),
  ...Object.values(inventoryCategoryIconByCategory),
  ...Object.values(objectiveCategoryIconByCategory),
  resultReadyGatePath,
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
  "/assets/riftfall/ui/shop/categories/items.svg",
  "/assets/riftfall/ui/shop/categories/equipment.svg",
  "/assets/riftfall/ui/shop/categories/artifacts.svg",
  "/assets/riftfall/ui/shop/categories/route-aids.svg",
  "/assets/riftfall/ui/shop/categories/services.svg",
  "/assets/riftfall/ui/shop/categories/sell.svg",
  "/assets/riftfall/ui/dice_roll_combat@2s.gif",
  "/assets/riftfall/ui/dice_roll_combat@2s.lottie.json"
];

const lobbyStagePath = "/assets/riftfall/ui/ashen-reach-lobby-stage.png";

const battleCardBackPaths = {
  operative: "/assets/cards/backs/card_back_character.png",
  threatRed: "/assets/cards/backs/card_back_threat_red.png",
  threatBlue: "/assets/cards/backs/card_back_threat_blue.png",
  threatYellow: "/assets/cards/backs/card_back_threat_yellow.png",
  contract: "/assets/cards/backs/card_back_contract.png",
  artifact: "/assets/cards/backs/card_back_artifact_v2.png"
} as const;

export function getScenarioFramePath(): string {
  return "/assets/riftfall/ui/ui_scenario_frame.png";
}

export function getLobbyStagePath(): string {
  return lobbyStagePath;
}

export function getSignalTheatreAssetPaths(): {
  worldStage: string;
  operativeBeacon: string;
  arrivalSeal: string;
  journeyPath: string;
  shopkeeperEstablishment: string;
} {
  return {
    worldStage: "/assets/riftfall/ui/signal-theatre/world-stage.png",
    operativeBeacon: "/assets/riftfall/ui/signal-theatre/operative-beacon.png",
    arrivalSeal: "/assets/riftfall/ui/signal-theatre/arrival-seal.png",
    journeyPath: "/assets/riftfall/ui/signal-theatre/journey-path.png",
    shopkeeperEstablishment: "/assets/riftfall/ui/signal-theatre/shopkeeper-establishment.png"
  };
}

export type SignalTheatreShopCategory =
  | "forge-armoury"
  | "market"
  | "medicae-shrine"
  | "relic-dealer"
  | "contract-broker";

const signalTheatreShopBackgroundByCategory: Record<SignalTheatreShopCategory, string> = {
  "forge-armoury": "/assets/riftfall/ui/signal-theatre/shops/forge-armoury.png",
  market: "/assets/riftfall/ui/signal-theatre/shopkeeper-establishment.png",
  "medicae-shrine": "/assets/riftfall/ui/signal-theatre/shops/medicae-shrine.png",
  "relic-dealer": "/assets/riftfall/ui/signal-theatre/shops/relic-dealer.png",
  "contract-broker": "/assets/riftfall/ui/signal-theatre/shops/contract-broker.png"
};

export function getSignalTheatreShopBackgroundPath(
  category: SignalTheatreShopCategory | null | undefined
): string {
  return signalTheatreShopBackgroundByCategory[category ?? "market"];
}

export function getSignalCartographySectorArtPath(sectorId: string): string {
  return `/assets/riftfall/ui/signal-cartography/sectors/${sectorId}.png`;
}

export function getSignalTheatreStatSealPath(stat: Stat): string {
  return signalTheatreStatSealByStat[stat];
}

export function getSignalTheatreResultCrestPath(outcome: "success" | "defeat"): string {
  return signalTheatreResultCrestByOutcome[outcome];
}

export function getSignalTheatreDieFacePath(): string {
  return signalTheatreDieFacePath;
}

export function getSignalTheatreCardRevealPaths(): typeof signalTheatreCardRevealPaths {
  return signalTheatreCardRevealPaths;
}

export function getInventoryCategoryIconPath(category: InventoryCategoryIcon): string {
  return inventoryCategoryIconByCategory[category];
}

export function getObjectiveCategoryIconPath(category: ObjectiveCategoryIcon): string {
  return objectiveCategoryIconByCategory[category];
}

export function getResultReadyGatePath(): string {
  return resultReadyGatePath;
}

export function getCharacterPortraitPath(characterId: string): string {
  return characterPortraitById[characterId] ?? "/assets/riftfall/characters/void-marshal.png";
}

export function getCharacterPortraitPathOrNull(characterId: string): string | null {
  return characterPortraitById[characterId] ?? null;
}

export function getCardFallbackArtPath(cardType: CardImageType): string {
  return CARD_IMAGE_FALLBACK_PATHS[cardType];
}

export function getCardArtPath(cardType: CardImageType, cardId: string): string {
  return getRuntimeCardArtPath(cardType, cardId) ?? getCardFallbackArtPath(cardType);
}

export function getOperativeBattleCardBackPath(): string {
  return battleCardBackPaths.operative;
}

export function getEncounterBattleCardBackPath(cardType: CardImageType, cardId: string): string {
  if (cardType === "threat") {
    const artPath = getCardArtPath(cardType, cardId);

    if (artPath.includes("/threats/blue/")) {
      return battleCardBackPaths.threatBlue;
    }

    if (artPath.includes("/threats/yellow/")) {
      return battleCardBackPaths.threatYellow;
    }

    return battleCardBackPaths.threatRed;
  }

  if (cardType === "anomaly") {
    return battleCardBackPaths.threatBlue;
  }

  if (cardType === "contract") {
    return battleCardBackPaths.contract;
  }

  if (cardType === "artifact") {
    return battleCardBackPaths.artifact;
  }

  return battleCardBackPaths.operative;
}

type GearArtInput = string | { id: string; tier?: GearTier | null };

function normalizeGearArtInput(input: GearArtInput, tier?: GearTier | null): { id: string; tier?: GearTier | null } {
  return typeof input === "string" ? { id: input, tier } : { id: input.id, tier: input.tier ?? tier };
}

export function getGearCardArtType(input: GearArtInput, tier?: GearTier | null): CardImageType {
  const gear = normalizeGearArtInput(input, tier);
  return gear.tier === "artifact" || gear.id.startsWith("artifact-") ? "artifact" : "equipment";
}

export function getGearCardArtId(input: GearArtInput, tier?: GearTier | null): string {
  const gear = normalizeGearArtInput(input, tier);
  return getGearCardArtType(gear) === "artifact" && !gear.id.startsWith("artifact-") ? `artifact-${gear.id}` : gear.id;
}

export function getGearCardArtPath(input: GearArtInput, tier?: GearTier | null): string {
  return getCardArtPath(getGearCardArtType(input, tier), getGearCardArtId(input, tier));
}

export function getEquipmentCardArtPath(equipmentId: string): string {
  return getCardArtPath("equipment", equipmentId);
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

export type HostShopIconCategory =
  | "items"
  | "equipment"
  | "artifacts"
  | "route-aids"
  | "services"
  | "sell";

export function getHostShopCategoryIconPath(category: HostShopIconCategory): string {
  return `/assets/riftfall/ui/shop/categories/${category}.svg`;
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
    ...Object.values(battleCardBackPaths),
    ...uiAssetPaths,
    ...getSignalTheatreEnvironmentPaths(),
    ...Object.values(signalTheatreShopBackgroundByCategory),
    ...getSignalTheatreEnvironmentPaths().map((path) =>
      path.replace(
        "/assets/riftfall/environments/signal-theatre/sectors/",
        "/assets/riftfall/ui/signal-cartography/sectors/"
      )
    )
  ].filter((value, index, paths) => paths.indexOf(value) === index);
}

export function getContractCardStyle(contract: Pick<ContractCard, "id">): string {
  return `url(${getScenarioFramePath()}), url(${getContractArtPath(contract.id)})`;
}

export function getEncounterCardStyle(encounter: Pick<EncounterCard, "id" | "stat">): string {
  return `url(${getEncounterFramePath(encounter.stat)}), url(${getEncounterArtPath(encounter.id)})`;
}
