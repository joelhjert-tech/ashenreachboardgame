import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

describe("live encounter lifecycle regression", () => {
  it("ends a successful encounter after one card and preserves its Salvage reward", () => {
    const threats = loadThreatCards();
    const raider = threats.get("latchspire-raider");
    const queuedThreat = threats.get("ash-cinder-runt");
    if (!raider || raider.cardType !== "enemy" || !queuedThreat) throw new Error("Missing encounter fixtures");

    const state = createInitialSessionState("encounter-lifecycle-regression", "single-player");
    state.status = "active";
    state.phase = "action";
    state.resolutionSource = "encounter";
    state.currentEncounter = raider;
    state.seats[0] = {
      ...state.seats[0]!,
      connected: true,
      characterSelected: true,
      displayName: "Player"
    };
    state.players[0]!.character.salvage = 2;
    state.players[0]!.character.stats[raider.stat] = 20;
    const sector = state.sectors.find((entry) => entry.id === state.players[0]!.character.currentSpaceId);
    if (!sector) throw new Error("Missing starting sector");
    sector.encounterDecks.threat = [queuedThreat.id];
    state.activeResolution = {
      id: "resolution-latchspire-raider",
      playerId: "seat-1",
      source: "threat",
      stage: "battle_setup",
      card: {
        id: raider.id,
        title: raider.title,
        type: raider.cardType,
        flavor: raider.flavor,
        artType: "threat"
      },
      battle: {
        enemyName: raider.title,
        stat: raider.stat,
        difficulty: raider.difficulty,
        modifiers: []
      }
    };

    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5, 0, 0]));
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: raider.stat });

    expect(server.getState().players[0]!.character.salvage).toBe(2);
    expect(server.getState().activeResolution?.stage).toBe("roll_result");
    server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    expect(server.getState().players[0]!.character.salvage).toBe(3);
    expect(server.getState().pendingEffect).toBeNull();
    expect(server.getState().activeResolution?.stage).toBe("outcome_summary");

    for (let step = 0; step < 4 && server.getState().activeResolution; step += 1) {
      server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    }

    const resolved = server.getState();
    expect(resolved.phase).toBe("action");
    expect(resolved.currentEncounter).toBeNull();
    expect(resolved.activeResolution).toBeNull();
    expect(resolved.players[0]!.character.salvage).toBe(3);
    expect(resolved.sectors.find((entry) => entry.id === sector.id)?.encounterDecks.threat).toEqual([queuedThreat.id]);
    expect(resolved.eventLog.filter((event) => (event as { type?: string }).type === "COMBAT_RESOLVED")).toHaveLength(1);
    expect(resolved.eventLog.filter((event) => (event as { type?: string }).type === "RESOLUTION_APPLIED")).toHaveLength(1);
    expect(resolved.eventLog.filter((event) => (event as { type?: string }).type === "ENCOUNTER_DRAWN")).toHaveLength(0);

    const restored = new GameRoomServer(structuredClone(resolved));
    expect(restored.getState().players[0]!.character.salvage).toBe(3);
    expect(restored.getState().sectors.find((entry) => entry.id === sector.id)?.encounterDecks.threat).toEqual([
      queuedThreat.id
    ]);

    expect(() =>
      server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" })
    ).toThrow();
    expect(server.getState().players[0]!.character.salvage).toBe(3);
  });

  it("does not create an encounter during initial session construction", () => {
    const state = createInitialSessionState(
      "encounter-startup-regression",
      "multiplayer",
      undefined,
      "co-op",
      "standard",
      4
    );
    expect(state.currentEncounter).toBeNull();
    expect(state.activeResolution).toBeNull();
    expect(state.pendingEffect).toBeNull();
    expect(state.eventLog.some((event) => (event as { type?: string }).type === "ENCOUNTER_DRAWN")).toBe(false);
  });
});
