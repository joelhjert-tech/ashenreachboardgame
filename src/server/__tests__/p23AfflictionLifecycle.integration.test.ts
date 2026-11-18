import { describe, expect, it } from "vitest";
import { loadAfflictionCards } from "../../game/content/afflictions.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { parseAndMigrateSessionSnapshot, serializeSessionSnapshotV2 } from "../../game/persistence/sessionSnapshot.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

type AfflictionServerInternals = {
  runAutomaticPhases(seatId: string): void;
  resolveAfflictionReactionIntent(
    intent: Extract<ClientIntent, { type: "AFFLICTION_REACTION_RESOLVED" }>
  ): void;
};

function addFaceupAffliction(state: GameState, cardId: string): void {
  state.players[0]!.faceupAfflictions = [{
    instanceId: `${cardId}:fixture`,
    cardId,
    drawnAt: "2026-07-24T00:00:00.000Z",
    face: "faceup",
    resolved: false
  }];
}

describe("P23 server-authoritative Affliction lifecycle", () => {
  it("draws without replacement, persists history, and does not replay after reconnect", () => {
    const catalog = loadAfflictionCards();
    const state = createInitialSessionState("p23-affliction-cycle", "single-player");
    state.status = "active";
    state.phase = "resolution";
    state.availableAfflictions = [catalog.get("blood-fury")!, catalog.get("bile-spit")!];
    state.pendingAfflictionResolution = {
      id: "cycle-1",
      ownerSeatId: "seat-1",
      sourceCardId: "smoke-leech-clutch",
      remainingDraws: 2,
      status: "queued",
      nextAfflictionId: null,
      nextDie: null,
      chosenStat: null,
      excludedCardIds: [],
      createdAt: "2026-07-24T00:00:00.000Z"
    };

    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 0, 0]));
    (server as unknown as AfflictionServerInternals).runAutomaticPhases("seat-1");

    const resolved = server.getState();
    expect(resolved.pendingAfflictionResolution).toBeNull();
    expect(resolved.players[0]!.afflictionDrawHistory).toEqual(["bile-spit", "blood-fury"]);
    expect(new Set(resolved.players[0]!.afflictionDrawHistory).size).toBe(2);

    const restoredState = parseAndMigrateSessionSnapshot(
      serializeSessionSnapshotV2(resolved)
    ).state;
    const restored = new GameRoomServer(restoredState, [], createSequenceRandomSource([0, 0]));
    const sequenceBefore = restored.getState().sequence;
    (restored as unknown as AfflictionServerInternals).runAutomaticPhases("seat-1");
    expect(restored.getState().sequence).toBe(sequenceBefore);
    expect(restored.getState().players[0]!.afflictionDrawHistory).toEqual(["bile-spit", "blood-fury"]);
  });

  it("pauses a failed battle for Blood Fury and commits one final combat result after the server reroll", () => {
    const enemy = [...loadThreatCards().values()].find((card) => card.cardType === "enemy");
    if (!enemy || enemy.cardType !== "enemy") throw new Error("Missing enemy fixture");
    const state = createInitialSessionState("p23-blood-fury", "single-player");
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = enemy;
    state.players[0]!.character.stats[enemy.stat] = 0;
    addFaceupAffliction(state, "blood-fury");
    state.activeResolution = {
      id: "blood-fury-battle",
      playerId: "seat-1",
      source: "threat",
      stage: "battle_setup",
      card: { id: enemy.id, title: enemy.title, type: "enemy" },
      battle: { enemyName: enemy.enemyName, stat: enemy.stat, difficulty: enemy.difficulty, modifiers: [] }
    };

    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 5, 5, 4]));
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: enemy.stat });

    const pending = server.getState().pendingAfflictionReaction;
    expect(pending).toMatchObject({ ownerSeatId: "seat-1", afflictionId: "blood-fury", kind: "battleReroll" });
    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "COMBAT_RESOLVED")).toHaveLength(0);

    (server as unknown as AfflictionServerInternals).resolveAfflictionReactionIntent({
      type: "AFFLICTION_REACTION_RESOLVED",
      seatId: "seat-1",
      reactionId: pending!.id,
      use: true,
      dieIndex: 0
    });

    expect(server.getState().pendingAfflictionReaction).toBeNull();
    expect(server.getState().players[0]!.afflictionUsageState?.oncePerBattleUsed["blood-fury"]).toBe(true);
    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "COMBAT_RESOLVED")).toHaveLength(1);
  });

  it("does not open Blood Fury when the active enemy blocks rerolls", () => {
    const enemy = loadThreatCards().get("pale-marshal");
    if (!enemy || enemy.cardType !== "enemy") throw new Error("Missing Pale Marshal fixture");
    const state = createInitialSessionState("p23-blood-fury-blocked", "single-player");
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = enemy;
    state.players[0]!.character.stats[enemy.stat] = 0;
    addFaceupAffliction(state, "blood-fury");
    state.activeResolution = {
      id: "blood-fury-blocked-battle",
      playerId: "seat-1",
      source: "threat",
      stage: "battle_setup",
      card: { id: enemy.id, title: enemy.title, type: "enemy" },
      battle: { enemyName: enemy.enemyName, stat: enemy.stat, difficulty: enemy.difficulty, modifiers: [] }
    };

    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 5, 5]));
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: enemy.stat });

    expect(server.getState().pendingAfflictionReaction).toBeNull();
    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "COMBAT_RESOLVED")).toHaveLength(1);
  });

  it("keeps owner choices private while exposing only concise public progress", () => {
    const state = createInitialSessionState("p23-affliction-privacy", "multiplayer");
    addFaceupAffliction(state, "future-sickness");
    state.pendingAfflictionReaction = {
      id: "private-reaction",
      ownerSeatId: "seat-1",
      afflictionId: "future-sickness",
      kind: "turnReroll",
      sourceEventId: "check-1",
      targetSeatId: null,
      originalRoll: [1, 4],
      createdAt: "2026-07-24T00:00:00.000Z"
    };

    const tv = createTvProjection(state);
    const owner = createPhoneProjection(state, "seat-1");
    const other = createPhoneProjection(state, "seat-2");

    expect(tv.pendingAfflictionStatus).toEqual({
      ownerSeatId: "seat-1",
      kind: "turnReroll",
      status: "waiting"
    });
    expect(JSON.stringify(tv)).not.toContain("originalRoll");
    expect(owner.pendingAfflictionReactionPrivate).toMatchObject({
      reactionId: "private-reaction",
      afflictionId: "future-sickness",
      originalRoll: [1, 4]
    });
    expect(other.pendingAfflictionReactionPrivate).toBeNull();
  });
});
