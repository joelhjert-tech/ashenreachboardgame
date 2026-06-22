import { describe, expect, it, vi } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function createScenarioState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("session-alpha");

  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1", "seat-2", "seat-3"],
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
    seats: base.seats.map((seat, index) => ({
      ...seat,
      displayName: `Seat ${index + 1}`,
      connected: true
    })),
    players: base.players.map((player) =>
      player.seatId === "seat-1"
        ? {
            ...player,
            sectorId: "center_cinder_gate",
            character: {
              ...player.character,
              currentSpaceId: "center_cinder_gate"
            }
          }
        : player
    ),
    ...overrides
  };
}

function createPhoneClient(seatId: string) {
  return {
    view: "phone" as const,
    seatId,
    socket: {
      send: vi.fn(),
      close: vi.fn()
    }
  };
}

function createSoloAmbientState(overrides: Partial<GameState> = {}): GameState {
  return createScenarioState({
    turnOrder: ["seat-1"],
    activeSeatIndex: 0,
    seats: createScenarioState().seats.slice(0, 1),
    players: createScenarioState().players.slice(0, 1),
    ...overrides
  });
}

describe("scenario confrontation flow", () => {
  it("advances scenario progress below threshold without ending the game", () => {
    const roomServer = new GameRoomServer(
      createScenarioState(),
      [],
      createSequenceRandomSource([5, 5, 0, 0, 0, 0])
    );
    const client = createPhoneClient("seat-1");

    roomServer.handleIntent(client as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("active");
    expect(roomServer.getState().winnerSeatId).toBeNull();
    expect(roomServer.getState().scenarioProgress.sealRestorationMarks).toBe(1);
    expect(roomServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.wounds).toBe(2);
    expect(roomServer.getState().activeSeatIndex).toBe(1);
  });

  it("ends the game when a confrontation pushes scenario progress to threshold", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        scenarioProgress: {
          sealRestorationMarks: 1
        }
      }),
      [],
      createSequenceRandomSource([5, 5, 0, 0, 0, 0])
    );
    const client = createPhoneClient("seat-1");

    roomServer.handleIntent(client as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().winnerSeatId).toBe("seat-1");
    expect(roomServer.getState().phase).toBe("broadcast");
    expect(roomServer.getState().scenarioProgress.sealRestorationMarks).toBe(2);
  });

  it("rejects confrontation attempts from non-active seats", () => {
    const roomServer = new GameRoomServer(
      createScenarioState(),
      [],
      createSequenceRandomSource([5, 5, 5, 5, 5, 5])
    );
    const client = createPhoneClient("seat-2");

    roomServer.handleIntent(client as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-2"
    } satisfies ClientIntent);

    expect(roomServer.getState().scenarioProgress.sealRestorationMarks).toBeUndefined();
    expect(client.socket.send).toHaveBeenCalled();
    expect(String(client.socket.send.mock.calls[0]?.[0] ?? "")).toContain("INTENT_REJECTED");
  });

  it("rejects confrontation attempts outside the Cinder Gate", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "ashwake-crossing",
                character: {
                  ...player.character,
                  currentSpaceId: "ashwake-crossing"
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([5, 5, 5, 5, 5, 5])
    );
    const client = createPhoneClient("seat-1");

    roomServer.handleIntent(client as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().scenarioProgress.sealRestorationMarks).toBeUndefined();
    expect(String(client.socket.send.mock.calls[0]?.[0] ?? "")).toContain("Cinder Gate");
  });

  it("lets the Throne of Ash resolve to victory through its confrontation checks", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_throne_of_ash",
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  stats: {
                    command: 20,
                    grit: 20,
                    signal: player.character.stats.signal,
                    guile: 20,
                    forge: player.character.stats.forge
                  }
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([0, 0, 0, 0, 0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().winnerSeatId).toBe("seat-1");
    expect(roomServer.getState().scenarioProgress.throneClaims).toBe(3);
  });

  it("applies mirror backlash as heat when the Mirror of False Heroes is failed", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_mirror_of_false_heroes",
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  heat: 2,
                  stats: {
                    command: player.character.stats.command,
                    grit: 0,
                    signal: 0,
                    guile: 0,
                    forge: player.character.stats.forge
                  }
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([0, 0, 0, 0, 0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("active");
    expect(roomServer.getState().scenarioProgress.mirrorBreaks).toBe(0);
    expect(roomServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(5);
  });

  it("lets the Devourer Beneath use salvaged gear to close the final maw strike", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_devourer_beneath",
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  heldGear: [...player.character.heldGear, { id: "test-gear", name: "Test Gear", slot: "weapon", statBonus: { stat: "grit", amount: 1 } }],
                  stats: {
                    command: player.character.stats.command,
                    grit: 12,
                    signal: player.character.stats.signal,
                    guile: player.character.stats.guile,
                    forge: player.character.stats.forge
                  }
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().scenarioProgress.mawStrikes).toBe(1);
  });

  it("rotates through Labyrinth Engine checks and wins with two successful shutdown marks", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_labyrinth_engine",
        escalationLevel: 1,
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  stats: {
                    command: 20,
                    grit: player.character.stats.grit,
                    signal: 20,
                    guile: 20,
                    forge: player.character.stats.forge
                  }
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([0, 0, 0, 0, 0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().scenarioProgress.shutdownMarks).toBe(3);
  });

  it("charges the Dying Star opening cost before awarding ignition victory", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_dying_star",
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  heldGear: [],
                  stats: {
                    command: player.character.stats.command,
                    grit: 20,
                    signal: 20,
                    guile: 20,
                    forge: player.character.stats.forge
                  }
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([0, 0, 0, 0, 0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().scenarioProgress.ignitionMarks).toBe(3);
    expect(roomServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.wounds).toBe(2);
  });

  it("weakens the Broken Seal at turn start from its ambient roll", () => {
    const state = createInitialSessionState("session-alpha");
    const roomServer = new GameRoomServer(state, [], createSequenceRandomSource([0]));

    roomServer.joinSeat("Solo", "signal-witch");
    roomServer.startSession();

    expect(roomServer.getState().scenarioProgress.sealTokens).toBe(5);
  });

  it("moves the Devourer and raises doom when it consumes a threatened outer sector", () => {
    const roomServer = new GameRoomServer(
      createSoloAmbientState({
        activeScenarioId: "scenario_devourer_beneath",
        scenarioProgress: {
          doomTokens: 0,
          devourerIndex: 0
        },
        phase: "action",
        currentEncounter: null,
        pendingEffect: null
      }),
      [],
      createSequenceRandomSource([0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    } satisfies ClientIntent);

    expect(roomServer.getState().scenarioProgress.devourerIndex).toBe(1);
    expect(roomServer.getState().scenarioProgress.doomTokens).toBe(1);
    expect(roomServer.getState().sectors.find((sector) => sector.id === "ashwake-crossing")?.encounterDecks.threat).toEqual([]);
  });

  it("ticks the Dying Star down at end of turn and erupts back to five tokens", () => {
    const roomServer = new GameRoomServer(
      createSoloAmbientState({
        activeScenarioId: "scenario_dying_star",
        scenarioProgress: {
          starTokens: 1
        },
        phase: "action",
        currentEncounter: null,
        pendingEffect: null
      }),
      [],
      createSequenceRandomSource([0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    } satisfies ClientIntent);

    expect(roomServer.getState().scenarioProgress.starTokens).toBe(5);
    expect(roomServer.getState().players[0]?.character.wounds).toBe(1);
  });

  it("rotates the Labyrinth Engine mode at turn start", () => {
    const state = createInitialSessionState("session-alpha");
    state.activeScenarioId = "scenario_labyrinth_engine";
    state.scenarioProgress = { engineModeIndex: 0 };
    const roomServer = new GameRoomServer(state, [], createSequenceRandomSource([0]));

    roomServer.joinSeat("Solo", "signal-witch");
    roomServer.startSession();

    expect(roomServer.getState().scenarioProgress.engineModeIndex).toBe(1);
  });
});
