import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadThreatCards } from "../../content/threats.js";
import { loadGear } from "../../content/gear.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";
import {
  SPINDLE_STATIC_SQUALL_MODIFIER_LABEL,
  createOrReplaceNextNormalMovementRollModifier,
  getNextNormalMovementRollModifierSource,
  resolveNormalMovementAllowance
} from "../../rules/nextNormalMovementRollModifier.js";
import { buildMovementRoutePlan } from "../../rules/movementPlanner.js";
import { sessionSnapshotSchema, type GameState } from "../../schema/session.schema.js";
import type { ThreatCard } from "../../schema/card.schema.js";

const threats = loadThreatCards();
const spindle = threats.get("spindle-static-squall") as Extract<ThreatCard, { cardType: "hazard" }>;
const glassChime = threats.get("glass-chime-swarm") as Extract<ThreatCard, { cardType: "hazard" }>;

function failedSpindleResolution(sourceResolutionId = "spindle:failed-check"): GameState {
  const state = createInitialSessionState("spindle-retirement", "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = spindle;
  state.pendingEffect = spindle.failEffect;
  state.pendingFailureReaction = {
    id: `${sourceResolutionId}:failure`, seatId: player.seatId, testType: "hazard",
    sourceId: spindle.id, createdAt: "2026-07-14T16:00:00.000Z"
  };
  state.activeResolution = {
    id: sourceResolutionId,
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    card: { id: spindle.id, title: spindle.title, type: spindle.cardType, flavor: spindle.flavor },
    battle: { enemyName: spindle.title, stat: spindle.stat, difficulty: spindle.difficulty, modifiers: [] },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: spindle.difficulty, success: false }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId, movedToSectorId: player.sectorId, encounterCardId: spindle.id,
    encounterTitle: spindle.title, encounterCardType: spindle.cardType, checkStat: spindle.stat,
    die1: 1, die2: 1, statBonus: 0, checkTotal: 2, difficulty: spindle.difficulty,
    success: false, summary: "Spindle Static Squall check failed."
  };
  return state;
}

function applySpindleFailure(state = failedSpindleResolution()) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect: spindle.failEffect,
    sourceCardId: spindle.id,
    success: false,
    createdAt: "2026-07-14T16:00:01.000Z"
  });
}

function prepareNavigation(state: GameState, seatId = "seat-1"): GameState {
  const next = structuredClone(state);
  next.status = "active";
  next.phase = "navigation";
  next.activeSeatIndex = next.turnOrder.indexOf(seatId);
  next.currentEncounter = null;
  next.pendingEffect = null;
  next.pendingFailureReaction = null;
  next.activeResolution = null;
  next.lastOutcomeSummary = null;
  next.movementRolls = undefined;
  return next;
}

function movementAction(rolledValue: number, movementValue: number, resolutionId = "movement-roll:seat-1:one") {
  return {
    type: "MOVEMENT_ROLLED" as const,
    seatId: "seat-1",
    movementValue,
    roll: { faces: [rolledValue], total: rolledValue },
    resolutionId,
    modifierSources: [{ label: SPINDLE_STATIC_SQUALL_MODIFIER_LABEL, value: -1 }],
    createdAt: "2026-07-14T16:01:00.000Z"
  };
}

describe("Spindle Static Squall Heat retirement", () => {
  it("preserves identity and deck totals while replacing only Spindle's legacy Heat failure", () => {
    expect(spindle).toMatchObject({
      id: "spindle-static-squall", cardType: "hazard", threatLane: "blue", stat: "signal",
      difficulty: 6, severity: 2, region: "outer", rarity: "common",
      text: "The squall corrupts your bearing. On failure, reduce your next movement roll by 1, to a minimum of 1.",
      successEffect: { type: "gain_note", text: "You tuned the squall into a stable bearing." },
      failEffect: { type: "next_normal_movement_roll_modifier", amount: -1, minimumResult: 1, sourceCardId: "spindle-static-squall" }
    });
    expect(JSON.stringify(spindle)).not.toMatch(/gain_heat|\bHeat\b/);
    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
    expect(glassChime.failEffect).toEqual({ type: "next_non_battle_test_modifier", amount: -1, sourceCardId: "glass-chime-swarm" });
  });

  it("creates only from a confirmed failed source and refreshes without stacking or replay", () => {
    const applied = applySpindleFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.pendingNextNormalMovementRollModifiers).toEqual([expect.objectContaining({
      type: "nextNormalMovementRoll", ownerSeatId: "seat-1", amount: -1, minimumResult: 1,
      sourceCardId: spindle.id, sourceEventId: "spindle:failed-check:next-normal-movement-roll"
    })]);

    const replayState = failedSpindleResolution();
    replayState.pendingNextNormalMovementRollModifiers = structuredClone(applied.state.pendingNextNormalMovementRollModifiers);
    replayState.resolvedNextNormalMovementRollModifierSourceEventIds = structuredClone(applied.state.resolvedNextNormalMovementRollModifierSourceEventIds);
    const replay = applySpindleFailure(replayState);
    expect(replay.ok).toBe(true);
    expect(replay.state.pendingNextNormalMovementRollModifiers).toHaveLength(1);

    const refreshedState = failedSpindleResolution("spindle:second-failure");
    refreshedState.pendingNextNormalMovementRollModifiers = structuredClone(applied.state.pendingNextNormalMovementRollModifiers);
    refreshedState.resolvedNextNormalMovementRollModifierSourceEventIds = structuredClone(applied.state.resolvedNextNormalMovementRollModifierSourceEventIds);
    const refreshed = applySpindleFailure(refreshedState);
    expect(refreshed.ok).toBe(true);
    expect(refreshed.state.pendingNextNormalMovementRollModifiers).toEqual([
      expect.objectContaining({ sourceEventId: "spindle:second-failure:next-normal-movement-roll", amount: -1 })
    ]);
    expect(refreshed.state.resolvedNextNormalMovementRollModifierSourceEventIds).toHaveLength(2);

    const forgedSuccess = failedSpindleResolution("spindle:forged-success");
    forgedSuccess.lastOutcomeSummary = { ...forgedSuccess.lastOutcomeSummary!, success: true };
    const rejected = applySpindleFailure(forgedSuccess);
    expect(rejected.ok).toBe(false);
    expect(rejected.state.pendingNextNormalMovementRollModifiers).toEqual([]);
  });

  it.each([[6, 5], [2, 1], [1, 1]] as const)("turns a raw movement roll of %i into final allowance %i and consumes once", (raw, finalValue) => {
    const applied = applySpindleFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const resolved = reduceGameState(prepareNavigation(applied.state), movementAction(raw, finalValue, `movement-roll:seat-1:${raw}`));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.movementRolls?.["seat-1"]).toBe(finalValue);
    expect(resolved.state.normalMovementRollDetails?.["seat-1"]).toEqual({
      resolutionId: `movement-roll:seat-1:${raw}`,
      rolledValue: raw,
      modifierSources: [{ label: SPINDLE_STATIC_SQUALL_MODIFIER_LABEL, value: -1 }],
      finalValue
    });
    expect(resolved.state.pendingNextNormalMovementRollModifiers).toEqual([]);
    expect(resolved.state.consumedNextNormalMovementRollResolutionIds).toEqual([`movement-roll:seat-1:${raw}`]);
    expect(buildMovementRoutePlan(resolved.state, "seat-1")?.movementValue).toBe(finalValue);

    const duplicate = reduceGameState(resolved.state, movementAction(raw, finalValue, `movement-roll:seat-1:${raw}`));
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state.consumedNextNormalMovementRollResolutionIds).toHaveLength(1);
  });

  it("retains the modifier for previews, rejected or forged results, other seats, checks, and forced-movement state", () => {
    const applied = applySpindleFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const pending = applied.state.pendingNextNormalMovementRollModifiers;
    const navigation = prepareNavigation(applied.state);

    const preview = reduceGameState(navigation, {
      type: "MOVEMENT_ROLL_REQUESTED", seatId: "seat-1", createdAt: "preview"
    });
    expect(preview.ok).toBe(true);
    expect(preview.state.pendingNextNormalMovementRollModifiers).toEqual(pending);

    const missingSource = reduceGameState(navigation, {
      ...movementAction(4, 4), modifierSources: []
    });
    expect(missingSource.ok).toBe(false);
    expect(missingSource.state.pendingNextNormalMovementRollModifiers).toEqual(pending);

    const forgedTotal = reduceGameState(navigation, movementAction(4, 4));
    expect(forgedTotal.ok).toBe(false);
    expect(forgedTotal.state.pendingNextNormalMovementRollModifiers).toEqual(pending);

    const forcedState = structuredClone(applied.state);
    forcedState.pendingDisplacement = {
      reactionId: "forced-reaction", seatId: "seat-1", sourceType: "threat", sourceId: "breach-halberd",
      direction: "clockwise", distance: 1, sameRing: true, failureStillCounts: true,
      sourceEventId: "forced-source", sourceResolutionId: "forced-resolution",
      originSectorId: forcedState.players[0]!.sectorId, destinationSectorId: forcedState.players[0]!.sectorId,
      fallbackEffect: null, createdAt: "forced", status: "pending"
    };
    expect(forcedState.pendingNextNormalMovementRollModifiers).toEqual(pending);

    const multiplayer = createInitialSessionState("spindle-other-seat", "multiplayer");
    multiplayer.status = "active";
    multiplayer.phase = "navigation";
    multiplayer.activeSeatIndex = 1;
    const ownerPending = createOrReplaceNextNormalMovementRollModifier(multiplayer, "seat-1", "owner-source", "owner-source");
    const otherRoll = reduceGameState(ownerPending, {
      type: "MOVEMENT_ROLLED", seatId: "seat-2", movementValue: 4,
      roll: { faces: [4], total: 4 }, resolutionId: "other-roll", modifierSources: [], createdAt: "other-roll"
    });
    expect(otherRoll.ok).toBe(true);
    expect(otherRoll.state.pendingNextNormalMovementRollModifiers).toEqual([
      expect.objectContaining({ ownerSeatId: "seat-1", sourceEventId: "owner-source" })
    ]);
  });

  it("keeps one stable modifier through discarded reroll candidates and commits only the accepted candidate", () => {
    const applied = applySpindleFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const navigation = prepareNavigation(applied.state);
    const source = getNextNormalMovementRollModifierSource(navigation, "seat-1");
    expect(source).toEqual({ label: SPINDLE_STATIC_SQUALL_MODIFIER_LABEL, value: -1 });
    expect(resolveNormalMovementAllowance(6, [source!])).toBe(5);
    expect(navigation.pendingNextNormalMovementRollModifiers).toHaveLength(1);
    expect(resolveNormalMovementAllowance(2, [source!])).toBe(1);
    expect(navigation.pendingNextNormalMovementRollModifiers).toHaveLength(1);

    const accepted = reduceGameState(navigation, movementAction(2, 1, "stable-reroll-resolution"));
    expect(accepted.ok).toBe(true);
    expect(accepted.state.pendingNextNormalMovementRollModifiers).toEqual([]);
    expect(accepted.state.consumedNextNormalMovementRollResolutionIds).toEqual(["stable-reroll-resolution"]);
  });

  it("composes before the existing Compass adjustment without changing stored stats or route rules", () => {
    const applied = applySpindleFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const navigation = prepareNavigation(applied.state);
    const baseStats = structuredClone(navigation.players[0]!.character.stats);
    const committed = reduceGameState(navigation, movementAction(6, 5, "spindle-compass-roll"));
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;

    const compass = { ...loadGear().get("ashen-route-compass")!, instanceId: "compass-instance", currentCharges: 2, maxCharges: 2 };
    const withCompass = structuredClone(committed.state);
    withCompass.players[0]!.character.heldGear.push(compass);
    withCompass.players[0]!.character.equippedGear.utility = compass.id;
    const adjusted = reduceGameState(withCompass, {
      type: "ADJUST_MOVEMENT_REQUESTED", seatId: "seat-1", instanceId: compass.instanceId!, adjustment: 1, createdAt: "compass-adjust"
    });
    expect(adjusted.ok).toBe(true);
    if (!adjusted.ok) return;
    expect(adjusted.state.movementRolls?.["seat-1"]).toBe(5);
    expect(adjusted.state.movementAdjustments?.["seat-1"]?.adjustment).toBe(1);
    expect(buildMovementRoutePlan(adjusted.state, "seat-1")?.movementValue).toBe(6);
    expect(adjusted.state.normalMovementRollDetails?.["seat-1"]?.finalValue).toBe(5);
    expect(adjusted.state.players[0]!.character.stats).toEqual(baseStats);
  });

  it("persists through reconnect, projects public/private state safely, composes before Compass, and clears on recall or end", () => {
    const applied = applySpindleFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const restored = structuredClone(applied.state);
    expect(sessionSnapshotSchema.safeParse({ saveVersion: 2, sessionId: restored.sessionId, sequence: restored.sequence, state: restored }).success).toBe(true);

    restored.seats[0] = { ...restored.seats[0]!, displayName: "Owner", characterSelected: true, connected: true };
    const owner = createPhoneProjection(restored, "seat-1", true) as { pendingTestModifiers?: unknown[] };
    const other = createPhoneProjection(restored, "seat-2", true) as { pendingTestModifiers?: unknown[] };
    expect(owner.pendingTestModifiers).toEqual([expect.objectContaining({
      type: "nextNormalMovementRoll", label: "Spindle Static Squall",
      summary: "Next normal movement roll: -1", detail: "Minimum result: 1", amount: -1
    })]);
    expect(other.pendingTestModifiers).toEqual([]);
    expect(JSON.stringify(createTvProjection(restored))).not.toMatch(/pendingNextNormalMovement|sourceEventId|nextNormalMovementRoll/);

    const serverState = prepareNavigation(restored);
    const server = new GameRoomServer(serverState, [], createSequenceRandomSource([5]));
    (server as unknown as { resolveMovementRollIntent: (intent: { type: "MOVEMENT_ROLL_REQUESTED"; seatId: string }) => void })
      .resolveMovementRollIntent({ type: "MOVEMENT_ROLL_REQUESTED", seatId: "seat-1" });
    const committed = server.getState();
    expect(committed.movementRolls?.["seat-1"]).toBe(5);
    const publicPlanner = (createTvProjection(committed) as { movementPlanner?: { rolledValue?: number; modifierSources?: unknown[]; movementValue: number } | null }).movementPlanner;
    expect(publicPlanner).toMatchObject({ rolledValue: 6, movementValue: 5, modifierSources: [{ label: "Spindle Static Squall", value: -1 }] });

    const recalledState = structuredClone(restored);
    recalledState.phase = "resolution";
    const recalled = reduceGameState(recalledState, {
      type: "WOUND_THRESHOLD_REACHED", seatId: "seat-1", threshold: recalledState.woundThreshold,
      newWoundTotal: recalledState.woundThreshold, scar: "scar-wound-1", createdAt: "recall-clear"
    });
    expect(recalled.ok).toBe(true);
    expect(recalled.state.pendingNextNormalMovementRollModifiers).toEqual([]);

    const ended = reduceGameState(restored, {
      type: "COOP_DEFEAT_TRIGGERED", seatId: "seat-1", summary: "Session ended.", createdAt: "end"
    });
    expect(ended.ok).toBe(true);
    expect(ended.state.pendingNextNormalMovementRollModifiers).toEqual([]);
  });
});
