import { describe, expect, it } from "vitest";
import { APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS } from "../../../../scripts/forced-displacement-validation.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadGear } from "../../content/gear.js";
import { loadThreatCards } from "../../content/threats.js";
import { getRingTrackNeighbor } from "../../rules/movementPlanner.js";
import { canRiftAnchorSpikeSuppress, RIFT_ANCHOR_SPIKE_ELIGIBLE_SOURCE_IDS } from "../../rules/forcedDisplacement.js";
import { sessionSnapshotSchema, type GameState } from "../../schema/session.schema.js";
import type { EncounterEffect, ThreatCard } from "../../schema/card.schema.js";
import { reduceGameState } from "../reducer.js";
import { createSequenceRandomSource } from "../dice.js";

const card = loadThreatCards().get("suture-storm") as Extract<ThreatCard, { cardType: "hazard" }>;

function setup(wounds = 0): GameState {
  const state = createInitialSessionState("b2c-suture-storm", "single-player");
  const player = state.players[0]!;
  const origin = "middle_red_march_outpost";
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = card;
  state.pendingEffect = card.failEffect;
  player.sectorId = origin;
  player.character.currentSpaceId = origin;
  player.character.wounds = wounds;
  state.activeResolution = {
    id: "suture-storm:failed-check",
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: card.difficulty, success: false }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId, movedToSectorId: origin, encounterCardId: card.id, encounterTitle: card.title,
    encounterCardType: card.cardType, checkStat: card.stat, die1: 1, die2: 1, statBonus: 0,
    checkTotal: 2, difficulty: card.difficulty, success: false, summary: "Suture Storm check failed."
  };
  return state;
}

function applyInitial(state: GameState, effect: EncounterEffect = state.pendingEffect!) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED", seatId: "seat-1", effect, sourceCardId: card.id,
    success: false, createdAt: "2026-07-14T10:00:00.000Z"
  });
}

function continueOrdered(state: GameState) {
  return reduceGameState(state, { type: "SUTURE_STORM_CONTINUED", seatId: "seat-1", createdAt: "2026-07-14T10:00:01.000Z" });
}

function resolveFailureThroughServer(wounds: number, kerPrevention = false) {
  const state = setup(wounds);
  state.phase = "action";
  state.pendingEffect = null;
  state.resolutionSource = null;
  state.players[0]!.character.stats.grit = 0;
  if (kerPrevention) state.players[0]!.character.id = "char_ker_von_ker";
  state.activeResolution = {
    id: "server-suture-storm",
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };
  const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0]));
  server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "grit" });
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  return server.getState();
}

describe("Phase B2C Suture Storm", () => {
  it("revises only the approved branch while preserving identity, difficulty, and success note", () => {
    expect(card).toMatchObject({
      id: "suture-storm", cardType: "hazard", threatLane: "red", stat: "grit", difficulty: 8,
      text: "The storm stitches flesh to road. Suffer 1 Wound, then move 1 sector counterclockwise on this ring. If no legal sector is available, suffer 1 Wound instead of moving.",
      successEffect: { type: "gain_note", text: "You crossed the storm on the beat between stitches." },
      failEffect: { type: "sequence", effects: [
        { type: "take_wound", amount: 1 },
        { type: "forcedDisplacement", direction: "counterclockwise", distance: 1, sameRing: true, fallbackEffect: { type: "take_wound", amount: 1 }, failureStillCounts: true }
      ] }
    });
    expect(APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS).toContain("suture-storm");
    expect(RIFT_ANCHOR_SPIKE_ELIGIBLE_SOURCE_IDS).toContain("suture-storm");
  });

  it("resolves the approved success note without a Wound or displacement", () => {
    const state = setup();
    state.pendingEffect = card.successEffect;
    state.lastOutcomeSummary = { ...state.lastOutcomeSummary!, success: true };
    const success = reduceGameState(state, {
      type: "RESOLUTION_APPLIED", seatId: "seat-1", effect: card.successEffect,
      sourceCardId: card.id, success: true, createdAt: "success"
    });
    expect(success.ok).toBe(true);
    if (!success.ok) return;
    expect(success.state.players[0]!.character.wounds).toBe(0);
    expect(success.state.players[0]!.private.notes).toContain("You crossed the storm on the beat between stitches.");
    expect(success.state.pendingSutureStormConsequence).toBeNull();
    expect(success.state.pendingDisplacement).toBeNull();
  });

  it("applies the initial Wound before opening exactly one same-ring counterclockwise displacement", () => {
    const initial = applyInitial(setup());
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    expect(initial.state.players[0]!.character.wounds).toBe(1);
    expect(initial.state.pendingDisplacement).toBeNull();
    expect(initial.state.pendingSutureStormConsequence).toMatchObject({
      stage: "afterInitialWound", requestedWounds: 1, preventedWounds: 0, actualWounds: 1, resultingWounds: 1
    });
    const replayState = structuredClone(initial.state);
    replayState.pendingEffect = card.failEffect;
    const replay = applyInitial(replayState);
    expect(replay.ok).toBe(false);
    expect(replay.state.players[0]!.character.wounds).toBe(1);

    const continued = continueOrdered(initial.state);
    expect(continued.ok).toBe(true);
    if (!continued.ok) return;
    const destination = getRingTrackNeighbor("middle_red_march_outpost", -1);
    expect(continued.state.pendingDisplacement).toMatchObject({
      sourceId: "suture-storm", originSectorId: "middle_red_march_outpost", destinationSectorId: destination,
      direction: "counterclockwise", distance: 1, sameRing: true
    });
    expect(continued.state.pendingSutureStormConsequence?.stage).toBe("displacement");
    expect(sessionSnapshotSchema.safeParse({ saveVersion: 2, sessionId: continued.state.sessionId, sequence: continued.state.sequence, state: continued.state }).success).toBe(true);

    const publicWaiting = createTvProjection(continued.state) as Record<string, unknown>;
    const ownerWaiting = createPhoneProjection(continued.state, "seat-1") as unknown as Record<string, unknown>;
    expect(publicWaiting.pendingOrderedConsequence).toEqual({
      seatId: "seat-1", sourceId: "suture-storm", requestedWounds: 1, preventedWounds: 0,
      actualWounds: 1, resultingWounds: 1, resultingStatus: "active", status: "waiting"
    });
    expect(JSON.stringify(publicWaiting.pendingOrderedConsequence)).not.toMatch(/reactionId|sourceEventId|destinationSectorId/);
    expect(ownerWaiting.pendingDisplacementPrivate).toBeTruthy();

    const pending = continued.state.pendingDisplacement!;
    const moved = reduceGameState(continued.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "move" });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.state.players[0]!.sectorId).toBe(destination);
    expect(moved.state.players[0]!.character.wounds).toBe(1);
    expect(moved.state.pendingSutureStormConsequence).toBeNull();
    expect(reduceGameState(moved.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "duplicate" }).ok).toBe(false);
  });

  it("continues after full prevention but cancels displacement after threshold recall", () => {
    const preventedState = setup();
    preventedState.pendingEffect = {
      type: "sequence",
      effects: [
        (card.failEffect as Extract<EncounterEffect, { type: "sequence" }>).effects[1]!,
        { type: "gain_note", text: "Hold the Line prevented 1 Wound." }
      ]
    };
    const prevented = applyInitial(preventedState);
    expect(prevented.ok).toBe(true);
    if (!prevented.ok) return;
    expect(prevented.state.players[0]!.character.wounds).toBe(0);
    expect(prevented.state.pendingSutureStormConsequence).toMatchObject({ preventedWounds: 1, actualWounds: 0, resultingWounds: 0 });
    expect(continueOrdered(prevented.state).state.pendingDisplacement).not.toBeNull();

    const threshold = setup(setup().woundThreshold - 1);
    const wounded = applyInitial(threshold);
    expect(wounded.ok).toBe(true);
    if (!wounded.ok) return;
    const recalled = reduceGameState(wounded.state, {
      type: "WOUND_THRESHOLD_REACHED", seatId: "seat-1", threshold: wounded.state.woundThreshold,
      newWoundTotal: wounded.state.woundThreshold, scar: "scar-wound-1", createdAt: "recall"
    });
    expect(recalled.ok).toBe(true);
    if (!recalled.ok) return;
    const cancelled = continueOrdered(recalled.state);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(cancelled.state.players[0]!.character).toMatchObject({ status: "recalled", wounds: wounded.state.woundThreshold });
    expect(cancelled.state.players[0]!.character.scars).toContain("scar-wound-1");
    expect(cancelled.state.pendingDisplacement).toBeNull();
    expect(cancelled.state.pendingSutureStormConsequence).toBeNull();

    const serverPrevented = resolveFailureThroughServer(0, true);
    expect(serverPrevented.players[0]!.character.wounds).toBe(0);
    expect(serverPrevented.pendingDisplacement).not.toBeNull();
    expect(serverPrevented.pendingSutureStormConsequence).toMatchObject({ preventedWounds: 1, actualWounds: 0, stage: "displacement" });
    const serverRecalled = resolveFailureThroughServer(setup().woundThreshold - 1);
    expect(serverRecalled.players[0]!.character.status).toBe("recalled");
    expect(serverRecalled.players[0]!.character.scars).toHaveLength(1);
    expect(serverRecalled.pendingDisplacement).toBeNull();
    expect(serverRecalled.pendingSutureStormConsequence).toBeNull();
  });

  it("queues the illegal-destination fallback as a second typed Wound and preserves prevention", () => {
    const initial = applyInitial(setup());
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    const origin = initial.state.players[0]!.sectorId;
    const destination = getRingTrackNeighbor(origin, -1)!;
    initial.state.sectors = initial.state.sectors.map((sector) => sector.id === origin
      ? { ...sector, neighbors: sector.neighbors.filter((neighbor) => neighbor !== destination) }
      : sector);
    const fallback = continueOrdered(initial.state);
    expect(fallback.ok).toBe(true);
    if (!fallback.ok) return;
    expect(fallback.state.pendingDisplacement).toBeNull();
    expect(fallback.state.pendingEffect).toEqual({ type: "take_wound", amount: 1 });
    expect(fallback.state.pendingSutureStormConsequence?.stage).toBe("fallbackWound");

    const kerState = structuredClone(fallback.state);
    kerState.players[0]!.character.id = "char_ker_von_ker";
    kerState.activeResolution = null;
    const restored = new GameRoomServer(kerState);
    (restored as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    expect(restored.getState().players[0]!.character.wounds).toBe(1);
    expect(restored.getState().players[0]!.private.notes).toContain("Hold the Line prevented 1 Wound.");
    expect(restored.getState().pendingSutureStormConsequence).toBeNull();
    expect(restored.getState().resolvedDisplacementSourceEventIds).toContain("suture-storm:failed-check:forced-displacement");
  });

  it("keeps Rift Anchor Spike owner-private, atomic, reconnect-safe, and one-use for this source", () => {
    const initial = applyInitial(setup());
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    const opened = continueOrdered(initial.state);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const pending = opened.state.pendingDisplacement!;
    expect(canRiftAnchorSpikeSuppress(pending.sourceType, pending.sourceId)).toBe(true);
    const spike = { ...loadGear().get("rift-anchor-spike")!, instanceId: "suture-spike", currentCharges: 2 };
    const reconnect = structuredClone(opened.state);
    reconnect.players[0]!.character.heldGear.push(spike);
    reconnect.players[0]!.character.equippedGear.utility = spike.id;
    const phone = createPhoneProjection(reconnect, "seat-1") as unknown as { pendingDisplacementPrivate?: { riftAnchorSpike?: unknown } };
    expect(phone.pendingDisplacementPrivate?.riftAnchorSpike).toBeTruthy();
    const suppressed = reduceGameState(reconnect, {
      type: "USE_GEAR", seatId: "seat-1", gearId: spike.id, chargeInstanceId: spike.instanceId,
      forcedDisplacementReactionId: pending.reactionId, forcedDisplacementSourceEventId: pending.sourceEventId,
      effect: null, discard: false, summary: "Rift Anchor Spike deployed.", createdAt: "spike"
    });
    expect(suppressed.ok).toBe(true);
    if (!suppressed.ok) return;
    expect(suppressed.state.pendingDisplacement).toBeNull();
    expect(suppressed.state.pendingSutureStormConsequence).toBeNull();
    expect(suppressed.state.players[0]!.character.heldGear.find((item) => item.instanceId === spike.instanceId)?.currentCharges).toBe(1);
    expect(reduceGameState(suppressed.state, {
      type: "USE_GEAR", seatId: "seat-1", gearId: spike.id, chargeInstanceId: spike.instanceId,
      forcedDisplacementReactionId: pending.reactionId, forcedDisplacementSourceEventId: pending.sourceEventId,
      effect: null, discard: false, summary: "duplicate", createdAt: "duplicate"
    }).ok).toBe(false);
  });
});
