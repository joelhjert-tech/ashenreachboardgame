import type { Character } from "../schema/character.schema.js";
import type { GearItem, GearSlot } from "../schema/gear.schema.js";
import type {
  EquipmentSuppression,
  EquipmentSuppressionMode,
  GameState,
  PendingEquipmentSuppressionChoice
} from "../schema/session.schema.js";

export const EQUIPMENT_SUPPRESSION_SOURCE_RULES = {
  "relay-husk": "throughNextThreat",
  "signal-rotted-engineer": "duringNextBattle"
} as const satisfies Record<string, EquipmentSuppressionMode>;

type EquipmentSuppressionSourceId = keyof typeof EQUIPMENT_SUPPRESSION_SOURCE_RULES;

export function ensureOwnedGearInstanceIds(character: Character, seatId: string): Character {
  const heldGear = character.heldGear.map((item, index) => ({
    ...item,
    instanceId: item.instanceId ?? `${item.id}:${seatId}:owned:${index + 1}`
  }));
  const equippedGearInstances = Object.fromEntries(
    (Object.keys(character.equippedGear) as GearSlot[]).map((slot) => {
      const existing = character.equippedGearInstances?.[slot];
      if (existing && heldGear.some((item) => item.instanceId === existing && item.slot === slot)) return [slot, existing];
      const catalogId = character.equippedGear[slot];
      return [slot, catalogId ? heldGear.find((item) => item.id === catalogId && item.slot === slot)?.instanceId ?? null : null];
    })
  ) as NonNullable<Character["equippedGearInstances"]>;
  return { ...character, heldGear, equippedGearInstances };
}

export function getEquippedOwnedInstanceIds(character: Character): Set<string> {
  const ids = new Set<string>();
  for (const slot of Object.keys(character.equippedGear) as GearSlot[]) {
    const exact = character.equippedGearInstances?.[slot];
    if (exact) {
      ids.add(exact);
      continue;
    }
    const catalogId = character.equippedGear[slot];
    if (!catalogId) continue;
    const matches = character.heldGear.filter((item) => item.id === catalogId && item.slot === slot && item.instanceId);
    if (matches.length === 1) ids.add(matches[0]!.instanceId!);
  }
  return ids;
}

export function isEligibleEquipmentSuppressionTarget(item: GearItem, character: Character): boolean {
  if (!item.instanceId || item.qaOnly || item.tier === "artifact" || item.effectModel === "consumable") return false;
  if (!(["starter", "standard", "advanced"] as const).includes(item.tier ?? "standard")) return false;
  if ((item.useLimit === "charge" || item.chargedEffect) && (item.currentCharges ?? item.charges ?? item.startingCharges ?? 0) <= 0) return false;
  if (!getEquippedOwnedInstanceIds(character).has(item.instanceId)) return false;
  return item.statBonus.amount > 0 || Boolean(item.activeText || item.effectModel || item.useLimit);
}

export function getEligibleEquipmentSuppressionTargets(state: GameState, ownerSeatId: string): GearItem[] {
  const player = state.players.find((entry) => entry.seatId === ownerSeatId);
  return player ? player.character.heldGear.filter((item) => isEligibleEquipmentSuppressionTarget(item, player.character)) : [];
}

export function createPendingEquipmentSuppressionChoice(
  state: GameState,
  ownerSeatId: string,
  sourceThreatId: EquipmentSuppressionSourceId,
  sourceResolutionId: string,
  createdAt: string
): PendingEquipmentSuppressionChoice | null {
  const sourceEventId = `${sourceResolutionId}:equipment-suppression`;
  if ((state.resolvedEquipmentSuppressionSourceEventIds ?? []).includes(sourceEventId)) return null;
  if (state.pendingEquipmentSuppressionChoice?.sourceEventId === sourceEventId) return state.pendingEquipmentSuppressionChoice;
  if ((state.equipmentSuppressions ?? []).some((entry) => entry.sourceEventId === sourceEventId)) return null;
  const eligibleInstanceIds = getEligibleEquipmentSuppressionTargets(state, ownerSeatId).map((item) => item.instanceId!);
  if (eligibleInstanceIds.length === 0) return null;
  return {
    choiceId: `${sourceEventId}:choice`,
    ownerSeatId,
    sourceThreatId,
    sourceEventId,
    sourceResolutionId,
    mode: EQUIPMENT_SUPPRESSION_SOURCE_RULES[sourceThreatId],
    eligibleInstanceIds,
    createdSequence: state.sequence,
    createdAt
  };
}

export function applyEquipmentSuppressionChoice(
  state: GameState,
  choice: PendingEquipmentSuppressionChoice,
  item: GearItem
): EquipmentSuppression {
  return {
    ownerSeatId: choice.ownerSeatId,
    sourceThreatId: choice.sourceThreatId,
    sourceEventId: choice.sourceEventId,
    sourceResolutionId: choice.sourceResolutionId,
    itemInstanceId: item.instanceId!,
    itemCatalogId: item.id,
    mode: choice.mode,
    qualifyingLifecycleId: null,
    status: "active",
    createdSequence: state.sequence,
    createdAt: choice.createdAt
  };
}

export function reserveEquipmentSuppressions(
  state: GameState,
  ownerSeatId: string,
  lifecycleId: string,
  kind: "threat" | "battle"
): GameState {
  const equipmentSuppressions = (state.equipmentSuppressions ?? []).map((entry) => {
    if (entry.ownerSeatId !== ownerSeatId || entry.qualifyingLifecycleId) return entry;
    if (entry.sourceResolutionId === lifecycleId) return entry;
    if (kind === "threat" && entry.mode !== "throughNextThreat") return entry;
    if (kind === "battle" && entry.mode !== "duringNextBattle") return entry;
    return { ...entry, qualifyingLifecycleId: lifecycleId };
  });
  return { ...state, equipmentSuppressions };
}

export function getSuppressedEquipmentInstanceIds(state: GameState, ownerSeatId: string, lifecycleId: string | null | undefined): Set<string> {
  if (!lifecycleId) return new Set();
  return new Set((state.equipmentSuppressions ?? [])
    .filter((entry) => entry.ownerSeatId === ownerSeatId && entry.status === "active" && entry.qualifyingLifecycleId === lifecycleId)
    .map((entry) => entry.itemInstanceId));
}

export function isOwnedItemEffectActive(state: GameState, ownerSeatId: string, itemInstanceId: string | undefined, lifecycleId: string | null | undefined): boolean {
  if (!itemInstanceId) return true;
  return !getSuppressedEquipmentInstanceIds(state, ownerSeatId, lifecycleId).has(itemInstanceId);
}

export function completeEquipmentSuppressionLifecycle(state: GameState, lifecycleId: string | null | undefined): GameState {
  if (!lifecycleId) return state;
  return {
    ...state,
    equipmentSuppressions: (state.equipmentSuppressions ?? []).filter((entry) => entry.qualifyingLifecycleId !== lifecycleId)
  };
}

export function normalizeEquipmentSuppressionState(state: GameState): GameState {
  const activeOwners = new Set(state.players.filter((player) => player.character.status === "active").map((player) => player.seatId));
  const ownedInstances = new Map(state.players.map((player) => [
    player.seatId,
    new Set(player.character.heldGear.map((item) => item.instanceId).filter((id): id is string => Boolean(id)))
  ]));
  const equipmentSuppressions = state.status === "ended" ? [] : (state.equipmentSuppressions ?? []).filter((entry) =>
    activeOwners.has(entry.ownerSeatId) && ownedInstances.get(entry.ownerSeatId)?.has(entry.itemInstanceId)
  );
  const pending = state.pendingEquipmentSuppressionChoice;
  const stillEligible = pending
    ? getEligibleEquipmentSuppressionTargets({ ...state, equipmentSuppressions }, pending.ownerSeatId)
        .map((item) => item.instanceId!)
        .filter((instanceId) => pending.eligibleInstanceIds.includes(instanceId))
    : [];
  const pendingEquipmentSuppressionChoice = state.status === "ended" || !pending || !activeOwners.has(pending.ownerSeatId) || stillEligible.length === 0
    ? null
    : { ...pending, eligibleInstanceIds: stillEligible };
  const resolvedEquipmentSuppressionSourceEventIds = pending && !pendingEquipmentSuppressionChoice && activeOwners.has(pending.ownerSeatId)
    ? [...new Set([...(state.resolvedEquipmentSuppressionSourceEventIds ?? []), pending.sourceEventId])]
    : state.resolvedEquipmentSuppressionSourceEventIds;
  const activeResolution = pending && !pendingEquipmentSuppressionChoice && activeOwners.has(pending.ownerSeatId) && state.activeResolution
    ? {
        ...state.activeResolution,
        stage: "outcome_summary" as const,
        outcome: {
          title: "No Equipment disrupted",
          text: "No eligible Equipment to suppress.",
          effects: ["No eligible Equipment to suppress."]
        }
      }
    : state.activeResolution;
  return { ...state, equipmentSuppressions, pendingEquipmentSuppressionChoice, resolvedEquipmentSuppressionSourceEventIds, activeResolution };
}
