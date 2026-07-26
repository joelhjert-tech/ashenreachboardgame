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

    expect(server.getState().players[0]!.character.salvage).toBe(3);
    expect(server.getState().pendingEffect).toBeNull();
    expect(server.getState().activeResolution?.stage).toBe("awaiting_continue");

    server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });

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

  it("settles a successful direct sector check before exposing its single final Continue", () => {
    const state = createInitialSessionState("space-text-single-continue", "single-player");
    state.status = "active";
    state.phase = "action";
    state.seats[0] = {
      ...state.seats[0]!,
      connected: true,
      characterSelected: true,
      displayName: "Player"
    };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "cinder-fields",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "cinder-fields",
        stats: { ...state.players[0]!.character.stats, grit: 20 }
      }
    };
    state.sectors = state.sectors.map((sector) =>
      sector.id === "cinder-fields"
        ? { ...sector, encounterDecks: { ...sector.encounterDecks, threat: [] } }
        : sector
    );
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));

    server.resolveSpaceTextIntent({ type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });

    expect(server.getState().activeResolution?.stage).toBe("awaiting_continue");
    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "SPACE_TEXT_RESOLVED")).toHaveLength(1);

    server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });

    expect(server.getState().activeResolution).toBeNull();
    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "SPACE_TEXT_RESOLVED")).toHaveLength(1);
  });
});
