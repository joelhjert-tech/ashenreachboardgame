import type {
  EncounterEffect,
  LegacyCompatibleEncounterEffect,
  LegacyCompatibilityNoopEffect,
  ThreatCard
} from "../schema/card.schema.js";
import { effectSchema, runtimeThreatCardSchema } from "../schema/card.schema.js";
import { normalizeLegacyFollowerMetadata } from "../schema/follower.schema.js";
import { normalizeLegacyGearItem } from "../schema/gear.schema.js";
import type { PlayerState } from "../schema/session.schema.js";
import {
  normalizeLegacyThreatEffectKey,
  type LegacyCompatibleThreatEffectKey
} from "../cards/threatEffectKeys.js";

export type LegacyHeatEffect = Extract<
  LegacyCompatibleEncounterEffect,
  { type: "gain_heat" | "gain_heat_all" | "lose_heat" }
>;

/** Stable historical identifier retained so old logs and stale requests remain parseable. */
export const WITHDRAWN_LEGACY_HEAT_SERVICE_IDS = new Set(["buy-boon"] as const);

export function isLegacyHeatEffect(
  effect: LegacyCompatibleEncounterEffect
): effect is LegacyHeatEffect {
  return effect.type === "gain_heat" || effect.type === "gain_heat_all" || effect.type === "lose_heat";
}

export function isLegacyCompatibilityNoopEffect(
  effect: EncounterEffect
): effect is LegacyCompatibilityNoopEffect {
  return effect.type === "legacy_compatibility_noop";
}

/**
 * Exhaustive compatibility boundary for persisted encounter effects.
 * Retired Heat leaves become an explicit inert runtime effect. Sequences keep
 * the order of all surviving effects and collapse redundant compatibility
 * no-ops to one leaf only when no current effect remains.
 */
export function normalizeLegacyEncounterEffect(
  effect: LegacyCompatibleEncounterEffect
): EncounterEffect {
  if (isLegacyHeatEffect(effect)) {
    return { type: "legacy_compatibility_noop" };
  }

  if (effect.type === "sequence") {
    const normalized = effect.effects.map(normalizeLegacyEncounterEffect);
    const current = normalized.filter((entry) => !isLegacyCompatibilityNoopEffect(entry));
    if (current.length === 0) return { type: "legacy_compatibility_noop" };
    return { type: "sequence", effects: current };
  }

  if (effect.type === "gain_gear" && effect.gear) {
    return {
      ...effect,
      gear: normalizeLegacyGearItem(effect.gear)
    };
  }

  if (effect.type === "gain_follower" && effect.follower) {
    return {
      ...effect,
      follower: normalizeLegacyFollowerMetadata(effect.follower)
    };
  }

  return effectSchema.parse(effect);
}

export function normalizeLegacyThreatCard(
  card: import("../schema/card.schema.js").LegacyCompatibleThreatCard
): ThreatCard {
  const normalizeKey = (
    key: LegacyCompatibleThreatEffectKey | undefined
  ): import("../cards/threatEffectKeys.js").CanonicalThreatEffectKey | undefined => {
    if (!key) return undefined;
    return normalizeLegacyThreatEffectKey(key) ?? undefined;
  };
  const combatEffectKeys = card.combatEffectKeys
    ?.map(normalizeLegacyThreatEffectKey)
    .filter((key): key is NonNullable<typeof key> => key !== null);
  const effectKey = normalizeKey(card.effectKey);
  const revealEffectKey = normalizeKey(card.revealEffectKey);
  const successEffectKey = normalizeKey(card.successEffectKey);
  const defeatEffectKey = normalizeKey(card.defeatEffectKey);
  const failEffectKey = normalizeKey(card.failEffectKey);
  const {
    effectKey: _legacyEffectKey,
    revealEffectKey: _legacyRevealEffectKey,
    combatEffectKeys: _legacyCombatEffectKeys,
    successEffectKey: _legacySuccessEffectKey,
    defeatEffectKey: _legacyDefeatEffectKey,
    failEffectKey: _legacyFailEffectKey,
    ...cardWithoutEffectKeys
  } = card;

  return runtimeThreatCardSchema.parse({
    ...cardWithoutEffectKeys,
    resourceTags: card.resourceTags?.filter((tag) => tag !== "heat"),
    ...(effectKey ? { effectKey } : {}),
    ...(revealEffectKey ? { revealEffectKey } : {}),
    ...(combatEffectKeys?.length ? { combatEffectKeys } : {}),
    ...(successEffectKey ? { successEffectKey } : {}),
    ...(defeatEffectKey ? { defeatEffectKey } : {}),
    ...(failEffectKey ? { failEffectKey } : {}),
    ...(card.cardType === "hazard"
      ? {
          successEffect: card.successEffect
            ? normalizeLegacyEncounterEffect(card.successEffect)
            : undefined,
          failEffect: normalizeLegacyEncounterEffect(card.failEffect)
        }
      : {
          defeatReward: normalizeLegacyEncounterEffect(card.defeatReward),
          woundOnLoss: card.woundOnLoss
            ? normalizeLegacyEncounterEffect(card.woundOnLoss)
            : undefined
        })
  });
}

export function applyLegacyCompatibilityNoop(
  player: PlayerState,
  _effect: LegacyCompatibilityNoopEffect
): PlayerState {
  return player;
}

export function summarizeLegacyCompatibilityNoop(prefix: string): string {
  return `${prefix} no additional status change.`;
}
