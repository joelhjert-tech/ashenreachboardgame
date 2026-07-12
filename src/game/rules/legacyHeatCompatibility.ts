import type { EncounterEffect } from "../schema/card.schema.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";

export type LegacyHeatEffect = Extract<EncounterEffect, { type: "gain_heat" | "gain_heat_all" | "lose_heat" }>;

/** Phase 1A boundary: generic Heat effects are no-ops; persisted fields and real costs remain. */
export function isLegacyHeatNoopEffect(effect: EncounterEffect): effect is LegacyHeatEffect {
  return effect.type === "gain_heat" || effect.type === "gain_heat_all" || effect.type === "lose_heat";
}

export function applyLegacyHeatNoop(player: PlayerState, _effect: LegacyHeatEffect): PlayerState {
  return player;
}

export function summarizeLegacyHeatNoop(prefix: string): string {
  return `${prefix} no additional status change.`;
}

export function formatLegacyRiskCost(amount: number): string {
  return `Risk cost: ${amount}`;
}

export function formatLegacyRiskDelta(delta: number): string {
  return delta < 0 ? `Risk reduced by ${Math.abs(delta)}` : `Risk increased by ${delta}`;
}

export function getMirrorReflectionPressureThreshold(state: Pick<GameState, "heatThreshold">): number {
  // Serialized as heatThreshold for compatibility; Mirror interprets it as reflection pressure.
  return state.heatThreshold;
}
