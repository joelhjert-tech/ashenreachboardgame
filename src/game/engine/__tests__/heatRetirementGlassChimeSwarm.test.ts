import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadThreatCards } from "../../content/threats.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";
import {
  GLASS_CHIME_SWARM_MODIFIER_LABEL,
  createOrReplaceNextNonBattleTestModifier,
  getNextNonBattleTestModifierSource
} from "../../rules/nextNonBattleTestModifier.js";
import { sessionSnapshotSchema, type GameState } from "../../schema/session.schema.js";
import type { EncounterEffect, ThreatCard } from "../../schema/card.schema.js";
import type { SoloRerollResolvedAction } from "../actions.js";

const threats = loadThreatCards();
const glassChime = threats.get("glass-chime-swarm") as Extract<ThreatCard, { cardType: "hazard" }>;
const spindleStatic = threats.get("spindle-static-squall") as Extract<ThreatCard, { cardType: "hazard" }>;
const enemy = [...threats.values()].find((card): card is Extract<ThreatCard, { cardType: "enemy" }> => card.cardType === "enemy")!;

function failedGlassChimeResolution(sourceResolutionId = "glass-chime:failed-check"): GameState {
  const state = createInitialSessionState("glass-chime-retirement", "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = glassChime;
  state.pendingEffect = glassChime.failEffect;
  state.pendingFailureReaction = {
    id: `${sourceResolutionId}:failure`, seatId: player.seatId, testType: "hazard",
    sourceId: glassChime.id, createdAt: "2026-07-14T12:00:00.000Z"
  };
  state.activeResolution = {
    id: sourceResolutionId,
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    card: { id: glassChime.id, title: glassChime.title, type: glassChime.cardType, flavor: glassChime.flavor },
    battle: { enemyName: glassChime.title, stat: glassChime.stat, difficulty: glassChime.difficulty, modifiers: [] },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: glassChime.difficulty, success: false }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId, movedToSectorId: player.sectorId, encounterCardId: glassChime.id,
    encounterTitle: glassChime.title, encounterCardType: glassChime.cardType, checkStat: glassChime.stat,
    die1: 1, die2: 1, statBonus: 0, checkTotal: 2, difficulty: glassChime.difficulty,
    success: false, summary: "Glass-Chime Swarm check failed."
  };
  return state;
}

function applyGlassChimeFailure(state = failedGlassChimeResolution()) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect: glassChime.failEffect,
    sourceCardId: glassChime.id,
    success: false,
    createdAt: "2026-07-14T12:00:01.000Z"
  });
}

function prepareHazardCheck(state: GameState, seatId = "seat-1", card = spindleStatic): GameState {
  const next = structuredClone(state);
  next.status = "active";
  next.phase = "action";
  next.resolutionSource = null;
  next.currentEncounter = card;
  next.pendingEffect = null;
  next.pendingFailureReaction = null;
  next.activeResolution = {
    id: `${seatId}:next-check`, playerId: seatId, source: "threat", stage: "dice_roll",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };
  return next;
}

function checkAction(seatId = "seat-1") {
  return {
    type: "CHECK_ROLLED" as const,
    seatId,
    stat: spindleStatic.stat,
    difficulty: spindleStatic.difficulty,
    roll: { faces: [1, 1], total: 2 },
    statBonus: 1,
    modifierSources: [{ label: "Base Signal", value: 2 }, { label: GLASS_CHIME_SWARM_MODIFIER_LABEL, value: -1 }],
    total: 3,
    success: false,
    effect: spindleStatic.failEffect,
    cardId: spindleStatic.id,
    createdAt: "2026-07-14T12:01:00.000Z"
  };
}

describe("Glass-Chime Swarm Heat retirement", () => {
  it("preserves card identity and totals while replacing only the legacy Heat failure", () => {
    expect(glassChime).toMatchObject({
      id: "glass-chime-swarm",
      cardType: "hazard",
      threatLane: "blue",
      stat: "signal",
      difficulty: 6,
      severity: 2,
      region: "outer",
      rarity: "common",
      text: "The swarm breaks your concentration. On failure, subtract 1 from your next test. This penalty does not affect battles.",
      successEffect: { type: "gain_note", text: "You isolated the true tone and mapped the swarm's blind gap." },
      failEffect: { type: "next_non_battle_test_modifier", amount: -1, sourceCardId: "glass-chime-swarm" }
    });
    expect(JSON.stringify(glassChime)).not.toMatch(/gain_heat|\bHeat\b/);
    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
    expect(spindleStatic.failEffect).toEqual({
      type: "next_normal_movement_roll_modifier", amount: -1, minimumResult: 1, sourceCardId: "spindle-static-squall"
    });
  });

  it("creates the modifier only after a confirmed failed resolution and deduplicates or replaces sources", () => {
    const initial = failedGlassChimeResolution();
    expect(initial.pendingNextNonBattleTestModifiers).toEqual([]);
    const applied = applyGlassChimeFailure(initial);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.pendingNextNonBattleTestModifiers).toEqual([expect.objectContaining({
      type: "nextNonBattleTest", ownerSeatId: "seat-1", amount: -1,
      sourceCardId: glassChime.id, sourceEventId: "glass-chime:failed-check:next-non-battle-test"
    })]);
    expect(applied.state.resolvedNextNonBattleTestModifierSourceEventIds).toEqual([
      "glass-chime:failed-check:next-non-battle-test"
    ]);

    const replayState = failedGlassChimeResolution();
    replayState.pendingNextNonBattleTestModifiers = structuredClone(applied.state.pendingNextNonBattleTestModifiers);
    replayState.resolvedNextNonBattleTestModifierSourceEventIds = structuredClone(applied.state.resolvedNextNonBattleTestModifierSourceEventIds);
    const replay = applyGlassChimeFailure(replayState);
    expect(replay.ok).toBe(true);
    expect(replay.state.pendingNextNonBattleTestModifiers).toHaveLength(1);
    expect(replay.state.resolvedNextNonBattleTestModifierSourceEventIds).toHaveLength(1);

    const replacement = createOrReplaceNextNonBattleTestModifier(
      applied.state, "seat-1", "glass-chime:second-failure:next-non-battle-test", "second"
    );
    expect(replacement.pendingNextNonBattleTestModifiers).toEqual([
      expect.objectContaining({ sourceEventId: "glass-chime:second-failure:next-non-battle-test", amount: -1 })
    ]);
    expect(replacement.resolvedNextNonBattleTestModifierSourceEventIds).toHaveLength(2);

    const invalidSuccess = failedGlassChimeResolution("glass-chime:invalid-success");
    invalidSuccess.lastOutcomeSummary = { ...invalidSuccess.lastOutcomeSummary!, success: true };
    const rejected = reduceGameState(invalidSuccess, {
      type: "RESOLUTION_APPLIED", seatId: "seat-1", effect: glassChime.failEffect,
      sourceCardId: glassChime.id, success: true, createdAt: "invalid"
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.state.pendingNextNonBattleTestModifiers).toEqual([]);
  });

  it("applies once to the next accepted owner hazard or tile-challenge check", () => {
    const applied = applyGlassChimeFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const checkState = prepareHazardCheck(applied.state);
    checkState.pendingTileChallenge = {
      id: "pending-tile-test", challengeId: "test-challenge", sectorId: checkState.players[0]!.sectorId,
      seatId: "seat-1", challengeType: "hazard", testStat: "signal", difficulty: 6,
      successEffect: { type: "gain_note", text: "Passed." }, failureEffect: { type: "gain_note", text: "Failed." },
      authoredOrder: 0, totalChallenges: 1, rolled: true, modifierSources: [], sourceTags: [], createdAt: "tile-check"
    };
    const resolved = reduceGameState(checkState, checkAction());
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.pendingNextNonBattleTestModifiers).toEqual([]);
    expect(resolved.state.consumedNextNonBattleTestModifierTestEventIds).toEqual(["seat-1:next-check:check"]);
    expect(resolved.state.activeResolution?.battle?.modifiers).toEqual(
      expect.arrayContaining([{ label: GLASS_CHIME_SWARM_MODIFIER_LABEL, value: -1 }])
    );
    expect(resolved.state.activeResolution?.roll?.finalTotal).toBe(3);

    const duplicate = reduceGameState(resolved.state, checkAction());
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state.consumedNextNonBattleTestModifierTestEventIds).toHaveLength(1);
  });

  it("retains the modifier for previews, invalid or stale checks, movement, battles, automatic effects, and other seats", () => {
    const applied = applyGlassChimeFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const pending = applied.state.pendingNextNonBattleTestModifiers;

    const previewState = prepareHazardCheck(applied.state);
    previewState.activeResolution = null;
    const preview = reduceGameState(previewState, {
      type: "CHECK_REQUESTED", seatId: "seat-1", stat: spindleStatic.stat, createdAt: "preview"
    });
    expect(preview.ok).toBe(true);
    expect(preview.state.pendingNextNonBattleTestModifiers).toEqual(pending);

    const missingSource = reduceGameState(prepareHazardCheck(applied.state), {
      ...checkAction(), modifierSources: [{ label: "Base Signal", value: 2 }], statBonus: 2, total: 4
    });
    expect(missingSource.ok).toBe(false);
    expect(missingSource.state.pendingNextNonBattleTestModifiers).toEqual(pending);

    const stale = reduceGameState(prepareHazardCheck(applied.state), { ...checkAction(), cardId: "stale-card" });
    expect(stale.ok).toBe(false);
    expect(stale.state.pendingNextNonBattleTestModifiers).toEqual(pending);

    const noPendingState = prepareHazardCheck({
      ...applied.state,
      pendingNextNonBattleTestModifiers: []
    });
    const forgedSource = reduceGameState(noPendingState, checkAction());
    expect(forgedSource.ok).toBe(false);
    if (forgedSource.ok) return;
    expect(forgedSource.rejection.reason).toBe("Glass-Chime Swarm modifier has no pending authoritative source");

    const movementState = structuredClone(applied.state);
    movementState.phase = "navigation";
    movementState.currentEncounter = null;
    movementState.pendingEffect = null;
    movementState.activeResolution = null;
    const movement = reduceGameState(movementState, {
      type: "MOVEMENT_ROLLED", seatId: "seat-1", movementValue: 4,
      roll: { faces: [4], total: 4 }, createdAt: "movement"
    });
    expect(movement.ok).toBe(true);
    expect(movement.state.pendingNextNonBattleTestModifiers).toEqual(pending);

    const battleState = structuredClone(applied.state);
    battleState.phase = "action";
    battleState.currentEncounter = enemy;
    battleState.pendingEffect = null;
    battleState.activeResolution = {
      id: "enemy-battle", playerId: "seat-1", source: "threat", stage: "dice_roll",
      card: { id: enemy.id, title: enemy.title, type: enemy.cardType, flavor: enemy.flavor }
    };
    const battle = reduceGameState(battleState, {
      type: "COMBAT_RESOLVED", seatId: "seat-1", stat: enemy.stat, difficulty: enemy.difficulty,
      roll: { faces: [6, 6], total: 12 }, enemyRoll: { faces: [1, 1], total: 2 }, statBonus: 0,
      modifierSources: [], enemyBonus: 0, total: 12, enemyTotal: 2, success: true,
      effect: enemy.defeatReward, cardId: enemy.id, enemyRollerSeatId: null, createdAt: "battle"
    });
    expect(battle.ok).toBe(true);
    expect(battle.state.pendingNextNonBattleTestModifiers).toEqual(pending);

    const automatic = reduceGameState(applied.state, {
      type: "SCAR_TRIGGER_EVENT", seatId: "seat-1", createdAt: "automatic",
      sourceEvent: { id: "automatic-no-roll", type: "onTurnStarted", seatId: "seat-1" }
    });
    expect(automatic.state.pendingNextNonBattleTestModifiers).toEqual(pending);

    const multiplayer = createInitialSessionState("glass-other-seat", "multiplayer");
    multiplayer.status = "active";
    multiplayer.activeSeatIndex = 1;
    const withOwnerModifier = createOrReplaceNextNonBattleTestModifier(multiplayer, "seat-1", "owner-source", "owner-source");
    const otherCheckState = prepareHazardCheck(withOwnerModifier, "seat-2");
    const otherCheck = reduceGameState(otherCheckState, {
      ...checkAction("seat-2"), modifierSources: [{ label: "Base Signal", value: 2 }], statBonus: 2, total: 4
    });
    expect(otherCheck.ok).toBe(true);
    expect(otherCheck.state.pendingNextNonBattleTestModifiers).toEqual([
      expect.objectContaining({ ownerSeatId: "seat-1", sourceEventId: "owner-source" })
    ]);
  });

  it("persists across reconnect, stays owner-private, and clears on recall or session end", () => {
    const applied = applyGlassChimeFailure();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const restored = structuredClone(applied.state);
    expect(sessionSnapshotSchema.safeParse({
      saveVersion: 2, sessionId: restored.sessionId, sequence: restored.sequence, state: restored
    }).success).toBe(true);
    expect(getNextNonBattleTestModifierSource(restored, "seat-1", "signal")).toEqual([{
      label: GLASS_CHIME_SWARM_MODIFIER_LABEL, value: -1
    }]);
    const restoredDuringCheck = prepareHazardCheck(restored);
    expect(sessionSnapshotSchema.safeParse({
      saveVersion: 2,
      sessionId: restoredDuringCheck.sessionId,
      sequence: restoredDuringCheck.sequence,
      state: restoredDuringCheck
    }).success).toBe(true);

    restored.seats[0] = { ...restored.seats[0]!, displayName: "Owner", characterSelected: true, connected: true };
    const owner = createPhoneProjection(restored, "seat-1", true) as { pendingTestModifiers?: unknown[] };
    const other = createPhoneProjection(restored, "seat-2", true) as { pendingTestModifiers?: unknown[] };
    const tv = createTvProjection(restored);
    expect(owner.pendingTestModifiers).toEqual([expect.objectContaining({
      label: "Glass-Chime Swarm", summary: "Next non-battle test: -1", amount: -1
    })]);
    expect(other.pendingTestModifiers).toEqual([]);
    expect(JSON.stringify(tv)).not.toMatch(/pendingTestModifiers|sourceEventId|next-non-battle-test/);

    const recalledState = structuredClone(restored);
    recalledState.phase = "resolution";
    const recalled = reduceGameState(recalledState, {
      type: "WOUND_THRESHOLD_REACHED", seatId: "seat-1", threshold: recalledState.woundThreshold,
      newWoundTotal: recalledState.woundThreshold, scar: "scar-wound-1", createdAt: "recall-clear"
    });
    expect(recalled.ok).toBe(true);
    expect(recalled.state.pendingNextNonBattleTestModifiers).toEqual([]);

    const endedState = structuredClone(restored);
    const ended = reduceGameState(endedState, {
      type: "COOP_DEFEAT_TRIGGERED", seatId: "seat-1", summary: "Session ended.", createdAt: "end"
    });
    expect(ended.ok).toBe(true);
    expect(ended.state.pendingNextNonBattleTestModifiers).toEqual([]);
  });

  it("composes once through the normal server breakdown and reuses the recorded source on a reroll", () => {
    const state = createInitialSessionState("glass-composition", "single-player");
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = spindleStatic;
    state.players[0]!.character.stats.signal = 0;
    state.activeResolution = {
      id: "glass-composition-check", playerId: "seat-1", source: "threat", stage: "battle_setup",
      card: { id: spindleStatic.id, title: spindleStatic.title, type: spindleStatic.cardType, flavor: spindleStatic.flavor },
      battle: { enemyName: spindleStatic.title, stat: spindleStatic.stat, difficulty: spindleStatic.difficulty, modifiers: [] }
    };
    const pending = createOrReplaceNextNonBattleTestModifier(state, "seat-1", "composition-source", "composition-source");
    const server = new GameRoomServer(pending, [], createSequenceRandomSource([0, 0, 5, 5]));
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });
    const resolved = server.getState();
    expect(resolved.activeResolution?.battle?.modifiers.filter((source) => source.label === GLASS_CHIME_SWARM_MODIFIER_LABEL)).toEqual([
      { label: GLASS_CHIME_SWARM_MODIFIER_LABEL, value: -1 }
    ]);
    expect(resolved.activeResolution?.roll).toMatchObject({ modifierTotal: -1, finalTotal: 1, success: false });
    expect(resolved.pendingNextNonBattleTestModifiers).toEqual([]);
    expect(resolved.players[0]!.character.stats.signal).toBe(0);

    const reroll = (server as unknown as {
      createSoloRerollAction: (intent: { type: "SOLO_REROLL_REQUESTED"; seatId: string }, createdAt: string) => SoloRerollResolvedAction;
    }).createSoloRerollAction({ type: "SOLO_REROLL_REQUESTED", seatId: "seat-1" }, "reroll");
    expect(reroll.modifierSources?.filter((source) => source.label === GLASS_CHIME_SWARM_MODIFIER_LABEL)).toEqual([
      { label: GLASS_CHIME_SWARM_MODIFIER_LABEL, value: -1 }
    ]);
    expect(reroll.statBonus).toBe(-1);
    expect(reroll.total).toBe(11);
  });
});
