import { getBoardSpace } from "../data/boardSpaces.js";
import type { EncounterEffect } from "../schema/card.schema.js";
import type { Follower } from "../schema/follower.schema.js";
import type { GameState } from "../schema/session.schema.js";

export const FOLLOWER_REACTION_ABILITIES = new Set([
  "ignore_route_failure", "ignore_middle_route_failure", "prevent_equipment_loss", "prevent_salvage_loss", "battle_support"
]);

export function protectFollowerFailure(
  effect: EncounterEffect | null | undefined,
  follower: Follower,
  testType: "movement" | "hazard" | "battle",
  middle = false
): { effect: EncounterEffect | null } | null {
  if (!effect) return null;
  if (testType === "movement" && (follower.abilityId === "ignore_route_failure"
    || (follower.abilityId === "ignore_middle_route_failure" && middle))) return { effect: null };
  const protectedType = follower.abilityId === "prevent_equipment_loss" ? "equipment_suppression"
    : follower.abilityId === "prevent_salvage_loss" && testType !== "battle" ? "lose_salvage"
    : follower.abilityId === "battle_support" && testType === "battle" ? "take_wound" : null;
  if (!protectedType) return null;
  let protectedOnce = false;
  const reduce = (entry: EncounterEffect): EncounterEffect | null => {
    if (entry.type === "sequence") {
      const effects = entry.effects.map(reduce).filter((child): child is EncounterEffect => child !== null);
      return effects.length ? { ...entry, effects } : null;
    }
    if (protectedOnce || entry.type !== protectedType) return entry;
    protectedOnce = true;
    if ((entry.type === "take_wound" || entry.type === "lose_salvage") && entry.amount > 1) {
      return { ...entry, amount: entry.amount - 1 };
    }
    return null;
  };
  const remaining = reduce(effect);
  return protectedOnce ? { effect: remaining } : null;
}

export function getFollowerFailureProtection(state: GameState, seatId: string, follower: Follower) {
  const pending = state.pendingFailureReaction;
  if (state.phase !== "resolution" || pending?.seatId !== seatId
    || state.activeResolution?.playerId !== seatId || state.activeResolution.roll?.success !== false) return null;
  const player = state.players.find((entry) => entry.seatId === seatId);
  return protectFollowerFailure(state.pendingEffect, follower, pending.testType,
    getBoardSpace(player?.sectorId ?? "")?.tier === "middle");
}

/** Shared by activation validation and the owner-visible availability state. */
export function getFollowerSupportDisabledReason(state: GameState, seatId: string, follower: Follower): string | null {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (follower.exhaustEffect === "fandiablosSupport") {
    const encounter = state.currentEncounter;
    const unrolled = state.phase === "action" && !state.pendingEnemyRoll && !state.activeResolution?.roll
      && state.activeResolution?.stage !== "dice_roll";
    const matchingTest = unrolled && (encounter?.cardType === "enemy" && encounter.stat === "grit"
      || encounter?.cardType === "hazard" && (encounter.stat === "forge" || encounter.stat === "guile"));
    if (state.phase !== "sector" && !matchingTest) return "Use Fandiablos before drawing Threats, a Grit battle, or a Forge/Guile hazard roll.";
    if (!player || player.character.wounds + 1 >= state.woundThreshold) return "Fandiablos requires capacity to suffer 1 Wound.";
  }
  if (follower.id === "cinder-surgeon") {
    if (state.phase !== "action") return "Use the Cinder Surgeon during your action phase.";
    if (!player || player.character.wounds <= 0) return "No Wounds to heal.";
  }
  if (follower.abilityId === "signal_anomaly_support") {
    const encounter = state.currentEncounter;
    if (state.phase !== "action" || encounter?.cardType !== "hazard"
      || (encounter.stat !== "signal" && encounter.threatLane !== "blue")
      || state.pendingEnemyRoll || state.activeResolution?.roll || state.activeResolution?.stage === "dice_roll") {
      return "Use the Choir Defector before rolling a Signal or blue Anomaly hazard test.";
    }
  }
  return null;
}
