import type { EncounterEffect } from "../schema/card.schema.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";

export type LegacyHeatEffect = Extract<EncounterEffect, { type: "gain_heat" | "gain_heat_all" | "lose_heat" }>;

/** Stable historical identifier retained so old logs and stale requests remain parseable. */
export const WITHDRAWN_LEGACY_HEAT_SERVICE_IDS = new Set(["buy-boon"] as const);

/** Generic Heat effects remain no-ops. Stored character Heat is serialization-only compatibility state. */
export function isLegacyHeatNoopEffect(effect: EncounterEffect): effect is LegacyHeatEffect {
  return effect.type === "gain_heat" || effect.type === "gain_heat_all" || effect.type === "lose_heat";
}

export function applyLegacyHeatNoop(player: PlayerState, _effect: LegacyHeatEffect): PlayerState {
  return player;
}

export function summarizeLegacyHeatNoop(prefix: string): string {
  return `${prefix} no additional status change.`;
}

export function getMirrorReflectionPressureThreshold(state: Pick<GameState, "heatThreshold">): number {
  // Serialized as heatThreshold for compatibility; Mirror interprets it as reflection pressure.
  return state.heatThreshold;
}
