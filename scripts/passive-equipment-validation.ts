import type { GearItem } from "../src/game/schema/gear.schema.js";

export type PassiveEquipmentDeferral = {
  id: string;
  reason: string;
  futurePhase: string;
  compatibility: "canonical-playable" | "legacy" | "qa";
};

export const PASSIVE_EQUIPMENT_DEFERRALS: readonly PassiveEquipmentDeferral[] = [
  { id: "chainhook-blade", reason: "Fighting for position has no approved typed context.", futurePhase: "conditional context design", compatibility: "canonical-playable" },
  { id: "route-compass", reason: "Movement-test modifiers need an approved typed context.", futurePhase: "movement condition normalization", compatibility: "canonical-playable" },
  { id: "field-lens", reason: "Inspecting hazards is not yet an authoritative condition.", futurePhase: "tile-challenge condition normalization", compatibility: "canonical-playable" },
  { id: "lockjaw-kit", reason: "Locks and bargains do not share a supported typed context.", futurePhase: "interaction condition normalization", compatibility: "canonical-playable" },
  { id: "bridge-spike", reason: "Route work is not yet an authoritative condition.", futurePhase: "movement condition normalization", compatibility: "canonical-playable" },
  { id: "static-probe", reason: "Anomaly-only Equipment modifiers need a supported context.", futurePhase: "tile-challenge condition normalization", compatibility: "canonical-playable" },
  { id: "surveyor-chalk", reason: "Coordinating movement may imply unsupported assistance.", futurePhase: "movement condition design", compatibility: "canonical-playable" },
  { id: "cinder-suture-kit", reason: "Recovery work is not a supported typed context.", futurePhase: "recovery condition normalization", compatibility: "canonical-playable" },
  { id: "saintwire-splint", reason: "Holding together is poetic rather than actionable.", futurePhase: "recovery condition design", compatibility: "canonical-playable" },
  { id: "salt-gauze-wrap", reason: "Recovery is not a supported typed context.", futurePhase: "recovery condition normalization", compatibility: "canonical-playable" },
  { id: "ember-poultice", reason: "Authored reusable passive identity conflicts with consumable presentation.", futurePhase: "recovery item redesign", compatibility: "canonical-playable" },
  { id: "salvage-ledger", reason: "Shop dealings do not currently use the generic modifier path.", futurePhase: "shop condition normalization", compatibility: "canonical-playable" },
  { id: "mirror-token", reason: "Contested tests are not a supported typed context.", futurePhase: "test condition normalization", compatibility: "canonical-playable" },
  { id: "oath-chain", reason: "Holding a vow lacks an approved contract-state mapping.", futurePhase: "contract condition design", compatibility: "canonical-playable" },
  { id: "red-march-bell", reason: "Danger closes is not an authoritative condition.", futurePhase: "threat condition design", compatibility: "canonical-playable" },
  { id: "signal-lantern", reason: "Unstable sector is undefined and must not introduce Heat-era state.", futurePhase: "sector condition design", compatibility: "canonical-playable" }
] as const;

type PassiveEquipmentRecord = Pick<GearItem, "id" | "name" | "category" | "tier" | "normalShopCommon" | "effectModel" | "requiresEquipped" | "conditionType" | "statBonus"> &
  Partial<Pick<GearItem, "activationTiming" | "consumeOnUse" | "consumableEffect" | "resetWindow" | "exhaustEffect" | "maxCharges" | "startingCharges" | "chargeCost" | "chargedEffect">>;

const ARTIFACT_ONLY_MODELS = new Set(["charged", "exhaust", "consumable"]);
const SUPPORTED_CONDITIONS = new Set(["battle"]);

function itemLabel(item: Pick<PassiveEquipmentRecord, "id" | "name">): string {
  return `Equipment ${item.id} (${item.name})`;
}

function hasTypedModifier(item: PassiveEquipmentRecord): boolean {
  return Boolean(item.statBonus?.stat && Number.isInteger(item.statBonus.amount) && item.statBonus.amount > 0);
}

export function validatePassiveEquipmentItem(
  item: PassiveEquipmentRecord,
  deferredIds: ReadonlySet<string>
): string[] {
  if (item.tier === "artifact" || item.category !== "passive" || item.normalShopCommon !== true) return [];
  const label = itemLabel(item);

  if (!item.effectModel) {
    return deferredIds.has(item.id)
      ? []
      : [`${label} declares passive behavior without effectModel; accepted values are permanent or conditional.`];
  }

  if (ARTIFACT_ONLY_MODELS.has(item.effectModel)) {
    return [`${label} uses Artifact-only effect model ${item.effectModel}.`];
  }

  if (item.effectModel !== "permanent" && item.effectModel !== "conditional") {
    return [`${label} declares unsupported passive effectModel ${item.effectModel}.`];
  }

  const errors: string[] = [];
  if (item.requiresEquipped !== true) {
    errors.push(`${label} uses a ${item.effectModel} passive but requiresEquipped is not true.`);
  }
  if (!hasTypedModifier(item)) {
    errors.push(`${label} declares passive behavior without a valid typed statBonus modifier.`);
  }

  if (item.effectModel === "permanent" && item.conditionType) {
    errors.push(`${label} uses a permanent passive but also declares conditionType ${item.conditionType}.`);
  }
  if (item.effectModel === "conditional") {
    if (!item.conditionType) {
      errors.push(`${label} uses a conditional passive without conditionType; supported values: battle.`);
    } else if (!SUPPORTED_CONDITIONS.has(item.conditionType)) {
      errors.push(`${label} uses unsupported conditionType ${item.conditionType}; supported values: battle.`);
    }
  }

  if (item.activationTiming?.length || item.consumeOnUse || item.consumableEffect || item.resetWindow || item.exhaustEffect || item.maxCharges || item.startingCharges || item.chargeCost || item.chargedEffect) {
    errors.push(`${label} mixes passive effectModel ${item.effectModel} with activation-only fields.`);
  }
  return errors;
}

export function validatePassiveEquipmentCatalog(
  items: ReadonlyMap<string, GearItem>,
  deferrals: readonly PassiveEquipmentDeferral[] = PASSIVE_EQUIPMENT_DEFERRALS
): string[] {
  const errors: string[] = [];
  const deferredIds = new Set<string>();

  for (const deferral of deferrals) {
    if (deferredIds.has(deferral.id)) {
      errors.push(`Passive Equipment deferral repeats ID ${deferral.id}.`);
      continue;
    }
    deferredIds.add(deferral.id);
    const item = items.get(deferral.id);
    if (!item) {
      errors.push(`Passive Equipment deferral references missing catalog ID ${deferral.id}.`);
    } else if (item.tier === "artifact" || item.category !== "passive" || item.normalShopCommon !== true) {
      errors.push(`Passive Equipment deferral ${deferral.id} no longer references normal common-shop passive Equipment.`);
    } else if (item.effectModel) {
      errors.push(`Passive Equipment deferral ${deferral.id} is obsolete because effectModel ${item.effectModel} is now declared.`);
    }
  }

  for (const item of items.values()) {
    errors.push(...validatePassiveEquipmentItem(item, deferredIds));
  }
  return errors;
}
