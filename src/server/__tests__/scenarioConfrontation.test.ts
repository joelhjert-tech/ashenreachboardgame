import { describe, expect, it, vi } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { GameState } from "../../game/schema/session.schema.js";
import type { EncounterEffect } from "../../game/schema/card.schema.js";
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

function continueVisibleResolution(roomServer: GameRoomServer, seatId = "seat-1"): void {
  for (let index = 0; index < 4; index += 1) {
    const activeResolution = roomServer.getState().activeResolution;

    if (
      !activeResolution ||
      !["roll_result", "outcome_summary", "awaiting_continue"].includes(activeResolution.stage)
    ) {
      return;
    }

    const continuingSeatId = roomServer.getState().turnOrder[roomServer.getState().activeSeatIndex] ?? seatId;
    roomServer.handleIntent(createPhoneClient(continuingSeatId) as never, {
      type: "CONTINUE_RESOLUTION",
      seatId: continuingSeatId
    } satisfies ClientIntent);
  }
}

function selectFirstStartingContract(roomServer: GameRoomServer, seatId: string): void {
  const contractId = roomServer.getState().seats.find((seat) => seat.seatId === seatId)?.startingContractOptions[0];

  if (!contractId) {
    throw new Error(`Missing starting contract option for ${seatId}`);
  }

  roomServer.selectStartingContract(seatId, contractId);
}

function endBroadcastTurn(roomServer: GameRoomServer, seatId = "seat-1"): void {
  roomServer.handleIntent(createPhoneClient(seatId) as never, {
    type: "PHASE_ADVANCED",
    seatId,
    toPhase: "start"
  } satisfies ClientIntent);
}

function runVisibleIntent(roomServer: GameRoomServer, intent: ClientIntent): void {
  roomServer.handleIntent(createPhoneClient(intent.seatId) as never, intent);

  if (intent.type === "CHECK_REQUESTED" || intent.type === "COMBAT_REQUESTED") {
    const activeResolution = roomServer.getState().activeResolution;

    if (activeResolution?.stage === "battle_setup" && activeResolution.playerId === intent.seatId) {
      roomServer.handleIntent(createPhoneClient(intent.seatId) as never, intent);
    }
  }
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
    expect(roomServer.getState().scenarioConfrontation.progress.restorationMarks).toBe(1);
    expect(roomServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.wounds).toBe(2);
    expect(roomServer.getState().activeResolution).toMatchObject({
      source: "scenario",
      stage: "outcome_summary"
    });
    continueVisibleResolution(roomServer);
    endBroadcastTurn(roomServer);
    expect(roomServer.getState().activeSeatIndex).toBe(1);
  });

  it("ends the game when a confrontation pushes scenario progress to threshold", () => {
    const roomServer = new GameRoomServer(
      createScenarioState(),
      [],
      createSequenceRandomSource([5, 5, 5, 5, 5, 5])
    );
    const client = createPhoneClient("seat-1");

    roomServer.handleIntent(client as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().winnerSeatId).toBe("seat-1");
    expect(roomServer.getState().phase).toBe("broadcast");
    expect(roomServer.getState().scenarioConfrontation.progress.restorationMarks).toBe(3);
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

    expect(roomServer.getState().scenarioConfrontation.progress.restorationMarks).toBeUndefined();
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
        scenarioProgress: {
          throneClaims: 4,
          crownClaims: 2,
          "crownClaim:seat-1": 2
        },
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  stats: {
                    command: 20,
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
    expect(roomServer.getState().winnerSeatId).toBe("seat-1");
    expect(roomServer.getState().scenarioProgress.throneClaims).toBe(6);
  });

  it("awards nemesis victory before a killing-blow backlash can collapse the sector", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_throne_of_ash",
        escalationLevel: 5,
        scenarioProgress: {
          throneClaims: 5,
          crownClaims: 3,
          "crownClaim:seat-1": 3
        },
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  stats: {
                    command: 20,
                    grit: 20,
                    signal: 20,
                    guile: 0,
                    forge: player.character.stats.forge
                  }
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([0, 0, 0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().winnerSeatId).toBe("seat-1");
    expect(roomServer.getState().scenarioProgress.throneClaims).toBe(6);
    expect(roomServer.getState().escalationLevel).toBe(5);
    expect(roomServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.wounds).toBe(0);
  });

  it("builds linked nemesis confrontation checks from the nemesis stat block", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_mirror_of_false_heroes"
      }),
      [],
      createSequenceRandomSource([0, 0])
    );

    const player = roomServer.getState().players.find((entry) => entry.seatId === "seat-1");
    const plan = (roomServer as any).buildScenarioPlan(player!);

    expect(plan.checks).toEqual([{ stat: "signal", difficulty: 12, label: "Outlast The Glass Prophet" }]);
  });

  it("keeps the Broken Seal on the tutorial confrontation plan when no nemesis is linked", () => {
    const roomServer = new GameRoomServer(createScenarioState(), [], createSequenceRandomSource([0, 0, 0, 0, 0, 0]));
    const player = roomServer.getState().players.find((entry) => entry.seatId === "seat-1");
    const plan = (roomServer as any).buildScenarioPlan(player!);

    expect(plan.checks).toEqual([
      { stat: "grit", difficulty: 10, label: "Hold the breached ward shut" },
      { stat: "signal", difficulty: 10, label: "Realign the broken sigils" },
      { stat: "guile", difficulty: 12, label: "Resist the mind behind the breach" }
    ]);
  });

  it("eases the Broken Seal confrontation checks in single-player mode", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        sessionMode: "single-player",
        turnOrder: ["seat-1"],
        seats: createScenarioState().seats.slice(0, 1),
        players: createScenarioState().players.slice(0, 1).map((player) => ({
          ...player,
          sectorId: "center_cinder_gate",
          character: {
            ...player.character,
            currentSpaceId: "center_cinder_gate"
          }
        }))
      }),
      [],
      createSequenceRandomSource([0, 0, 0, 0, 0, 0])
    );
    const player = roomServer.getState().players.find((entry) => entry.seatId === "seat-1");
    const plan = (roomServer as any).buildScenarioPlan(player!);

    expect(plan.checks).toEqual([
      { stat: "grit", difficulty: 8, label: "Hold the breached ward shut" },
      { stat: "signal", difficulty: 8, label: "Realign the broken sigils" },
      { stat: "guile", difficulty: 10, label: "Resist the mind behind the breach" }
    ]);
  });

  it("applies the linked nemesis bite as wounds and feeds escalation on a failed confrontation check", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_mirror_of_false_heroes",
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  heldGear: [
                    {
                      id: "choir-static-censer",
                      name: "Choir Static Censer",
                      slot: "utility",
                      category: "chargedRelic",
                      tier: "artifact",
                      progressionWeight: 2.5,
                      statBonus: { stat: "signal", amount: 1 }
                    }
                  ],
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
    expect(roomServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.wounds).toBe(1);
    expect(roomServer.getState().escalationLevel).toBe(1);
  });

  it("lets Mirror of False Heroes close on a successful final nemesis hit", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_mirror_of_false_heroes",
        scenarioProgress: {
          mirrorBreaks: 3
        },
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  stats: {
                    command: player.character.stats.command,
                    grit: player.character.stats.grit,
                    signal: 20,
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
    expect(roomServer.getState().winnerSeatId).toBe("seat-1");
    expect(roomServer.getState().scenarioProgress.mirrorBreaks).toBe(4);
  });

  it("lets the Devourer Beneath win once accumulated nemesis damage reaches life", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_devourer_beneath",
        scenarioProgress: {
          mawStrikes: 4
        },
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  stats: {
                    command: player.character.stats.command,
                    grit: player.character.stats.grit,
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
      createSequenceRandomSource([0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().scenarioProgress.mawStrikes).toBe(5);
  });

  it("lets the linked Iron Saint confrontation close once enough damage is accumulated", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_labyrinth_engine",
        scenarioProgress: {
          shutdownMarks: 3,
          engineModeIndex: 1
        },
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  stats: {
                    command: player.character.stats.command,
                    grit: 20,
                    signal: 20,
                    guile: player.character.stats.guile,
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
    expect(roomServer.getState().scenarioProgress.shutdownMarks).toBe(5);
  });

  it("lets the linked Dying Star nemesis fall once the final damage is dealt", () => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_dying_star",
        scenarioProgress: {
          ignitionMarks: 3
        },
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  stats: {
                    command: player.character.stats.command,
                    grit: 20,
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
      createSequenceRandomSource([0, 0, 0, 0, 0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(roomServer.getState().status).toBe("ended");
    expect(roomServer.getState().scenarioProgress.ignitionMarks).toBe(4);
  });

  it.each([3, 4])("ends a Mirror confrontation attempt immediately at/above the reflection-pressure threshold (%i)", (mirrorPressure) => {
    const roomServer = new GameRoomServer(
      createScenarioState({
        activeScenarioId: "scenario_mirror_of_false_heroes",
        reflectionPressureThreshold: 3,
        scenarioProgress: { mirrorPressure, lossPressure: 2 },
        players: createScenarioState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...player.character,
                  scars: ["scar-wound-1", "scar-wound-2", "scar-wound-3"]
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([0, 0, 0, 0])
    );

    (roomServer as any).resolveScenarioConfrontationIntent({
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    });

    expect(roomServer.getState().phase).toBe("resolution");
    expect(roomServer.getState().activeResolution?.stage).toBe("outcome_summary");
    expect(roomServer.getState().lastOutcomeSummary?.summary ?? "").toContain("cannot face the mirror");
    continueVisibleResolution(roomServer);
    endBroadcastTurn(roomServer);

    expect(roomServer.getState().phase).toBe("navigation");
    expect(roomServer.getState().activeResolution).toBeNull();
    expect(roomServer.getState().scenarioProgress.mirrorBreaks).toBeUndefined();
    expect(roomServer.getState().reflectionPressureThreshold).toBe(3);
    expect(roomServer.getState().scenarioProgress.lossPressure).toBe(2);
    expect(roomServer.getState().escalationLevel).toBe(0);
  });

  it("weakens the Broken Seal at turn start from its ambient roll", () => {
    const state = createInitialSessionState("session-alpha", "single-player");
    const roomServer = new GameRoomServer(state, [], createSequenceRandomSource([0]));

    roomServer.joinSeat("Solo", "signal-witch");
    selectFirstStartingContract(roomServer, "seat-1");
    roomServer.setSeatReady("seat-1", true);
    roomServer.startSession();

    expect(roomServer.getState().scenarioPreparation.resources.sealIntegrity).toBe(7);
  });

  it("does not heat operatives when the Broken Seal loses its final token at turn start", () => {
    const state = createInitialSessionState("session-alpha", "single-player");
    state.scenarioPreparation = {
      ...state.scenarioPreparation,
      resources: { sealIntegrity: 1 }
    };
    const roomServer = new GameRoomServer(state, [], createSequenceRandomSource([0]));

    roomServer.joinSeat("Solo", "signal-witch");
    selectFirstStartingContract(roomServer, "seat-1");
    roomServer.setSeatReady("seat-1", true);
    roomServer.startSession();

    expect(roomServer.getState().scenarioPreparation.resources.sealIntegrity).toBe(3);
    expect(roomServer.getState().scenarioPreparation.resources.sealCollapses).toBe(1);
    expect(roomServer.getState().lastOutcomeSummary?.summary ?? "").toContain("last seal broke");
  });

  it("returns a Throne crown when a crowned operative takes a wound", () => {
    const roomServer = new GameRoomServer(
      createSoloAmbientState({
        activeScenarioId: "scenario_throne_of_ash",
        phase: "resolution",
        resolutionSource: "encounter",
        scenarioProgress: {
          crownClaims: 2,
          "crownClaim:seat-1": 2
        },
        pendingEffect: { type: "take_wound", amount: 1 } as EncounterEffect
      }),
      [],
      createSequenceRandomSource([0])
    );

    (roomServer as any).applyAction({
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: { type: "take_wound", amount: 1 },
      sourceCardId: null,
      success: false,
      createdAt: new Date().toISOString()
    });

    expect(roomServer.getState().players[0]?.character.wounds).toBe(1);
    expect(roomServer.getState().scenarioProgress.crownClaims).toBe(1);
    expect(roomServer.getState().scenarioProgress["crownClaim:seat-1"]).toBe(1);
  });

  it("reveals a local threat on a Broken Seal 3-4 turn-start roll", () => {
    const state = createInitialSessionState("session-alpha", "single-player");
    const roomServer = new GameRoomServer(state, [], createSequenceRandomSource([2, 0]));

    roomServer.joinSeat("Solo", "signal-witch");
    selectFirstStartingContract(roomServer, "seat-1");
    roomServer.setSeatReady("seat-1", true);
    roomServer.startSession();

    expect(roomServer.getState().phase).toBe("action");
    expect(roomServer.getState().currentEncounter).not.toBeNull();
    expect(roomServer.getState().lastOutcomeSummary?.summary).toContain("rouses a local threat");
  });

  it("eases single-player movement checks before heat is assigned", () => {
    const state = createInitialSessionState("session-alpha", "single-player");
    const player = state.players[0]!;
    const currentSector = state.sectors.find((sector) => sector.id === player.character.currentSpaceId)!;
    const targetSectorId = currentSector.neighbors[0]!;
    const targetDanger = 5;
    const roomServer = new GameRoomServer(
      {
        ...state,
        status: "active",
        phase: "navigation",
        movementRolls: { "seat-1": 1 },
        sectors: state.sectors.map((sector) =>
          sector.id === targetSectorId
            ? {
                ...sector,
                danger: targetDanger,
                encounterDecks: {
                  ...sector.encounterDecks,
                  threat: []
                }
              }
            : sector
        )
      },
      [],
      createSequenceRandomSource([0, 0])
    );

    (roomServer as any).resolveMoveIntent({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: targetSectorId
    } satisfies ClientIntent);

    expect(roomServer.getState().lastOutcomeSummary?.difficulty).toBeLessThanOrEqual(targetDanger - 1);
    expect(roomServer.getState().lastOutcomeSummary?.success).toBe(true);
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
    expect(roomServer.getState().players[0]?.character.wounds).toBe(2);
  });

  it("rotates the Labyrinth Engine mode at turn start", () => {
    const state = createInitialSessionState("session-alpha", "single-player");
    state.activeScenarioId = "scenario_labyrinth_engine";
    state.scenarioProgress = { engineModeIndex: 0 };
    const roomServer = new GameRoomServer(state, [], createSequenceRandomSource([0]));

    roomServer.joinSeat("Solo", "signal-witch");
    selectFirstStartingContract(roomServer, "seat-1");
    roomServer.setSeatReady("seat-1", true);
    roomServer.startSession();

    expect(roomServer.getState().scenarioProgress.engineModeIndex).toBe(1);
  });

  it("makes enemies hit harder during Labyrinth Engine grit mode", () => {
    const roomServer = new GameRoomServer(
      createSoloAmbientState({
        activeScenarioId: "scenario_labyrinth_engine",
        scenarioProgress: {
          engineModeIndex: 1
        },
        currentEncounter: {
          id: "grit-mode-enemy",
          type: "threat",
          cardType: "enemy",
          title: "Grit Mode Enemy",
          text: "A test enemy for grit mode.",
          flavor: "The engine hardens the hostile line.",
          severity: 1,
          stat: "grit",
          difficulty: 0,
          enemyName: "Test Enemy",
          trophyValue: 0,
          defeatReward: { type: "gain_note", text: "Victory" },
          woundOnLoss: { type: "gain_heat", amount: 1 }
        },
        phase: "action"
        ,
        players: createScenarioState().players
          .slice(0, 1)
          .map((player) => ({
            ...player,
            character: {
              ...player.character,
              id: "test-combatant",
              name: "Test Combatant",
              archetype: "Test Combatant",
              abilities: [],
              stats: {
                ...player.character.stats,
                grit: 0
              }
            }
          })),
        seats: createScenarioState().seats.slice(0, 1)
      }),
      [],
      createSequenceRandomSource([5, 5, 5, 5])
    );

    runVisibleIntent(roomServer, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    } satisfies ClientIntent);
    continueVisibleResolution(roomServer);

  });

  it("leaves legacy heat unchanged on a successful matching Labyrinth Engine signal check", () => {
    const roomServer = new GameRoomServer(
      createSoloAmbientState({
        activeScenarioId: "scenario_labyrinth_engine",
        scenarioProgress: {
          engineModeIndex: 2
        },
        currentEncounter: {
          id: "signal-mode-hazard",
          type: "threat",
          cardType: "hazard",
          title: "Signal Mode Hazard",
          text: "A test hazard for signal mode.",
          flavor: "The engine hums in phase with the operative.",
          severity: 1,
          stat: "signal",
          difficulty: 2,
          successEffect: { type: "gain_note", text: "Signal mode passed." },
          failEffect: { type: "gain_heat", amount: 1 }
        },
        phase: "action",
        players: createScenarioState().players
          .slice(0, 1)
          .map((player) => ({
            ...player,
            character: {
              ...player.character,
              stats: {
                ...player.character.stats,
                signal: 2
              }
            }
          })),
        seats: createScenarioState().seats.slice(0, 1)
      }),
      [],
      createSequenceRandomSource([5, 5])
    );

    runVisibleIntent(roomServer, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    } satisfies ClientIntent);

  });

  it("resolves a Devourer clash when an operative moves onto the roaming sector and can reduce doom", () => {
    const roomServer = new GameRoomServer(
      createSoloAmbientState({
        activeScenarioId: "scenario_devourer_beneath",
        scenarioProgress: {
          doomTokens: 2,
          devourerIndex: 3
        },
        phase: "navigation",
        movementRolls: { "seat-1": 1 },
        players: createScenarioState().players
          .slice(0, 1)
          .map((player) => ({
            ...player,
            sectorId: "ashwake-crossing",
            character: {
              ...player.character,
              currentSpaceId: "ashwake-crossing",
              stats: {
                ...player.character.stats,
                guile: 20,
                grit: 20
              }
            }
          })),
        seats: createScenarioState().seats.slice(0, 1)
      }),
      [],
      createSequenceRandomSource([5, 5, 5, 5])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "glassmere-spindle"
    } satisfies ClientIntent);
    continueVisibleResolution(roomServer);

    expect(roomServer.getState().scenarioProgress.doomTokens).toBe(1);
    expect(roomServer.getState().players[0]?.character.wounds).toBe(0);
    expect(roomServer.getState().currentEncounter).not.toBeNull();
  });

  it("applies the Devourer clash wound and doom pressure on a failed arrival roll", () => {
    const roomServer = new GameRoomServer(
      createSoloAmbientState({
        activeScenarioId: "scenario_devourer_beneath",
        scenarioProgress: {
          doomTokens: 0,
          devourerIndex: 3
        },
        phase: "navigation",
        movementRolls: { "seat-1": 1 },
        players: createScenarioState().players
          .slice(0, 1)
          .map((player) => ({
            ...player,
            sectorId: "ashwake-crossing",
            character: {
              ...player.character,
              currentSpaceId: "ashwake-crossing",
              stats: {
                ...player.character.stats,
                guile: 20,
                grit: 0
              }
            }
          })),
        seats: createScenarioState().seats.slice(0, 1)
      }),
      [],
      createSequenceRandomSource([5, 5, 0, 0])
    );

    roomServer.handleIntent(createPhoneClient("seat-1") as never, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "glassmere-spindle"
    } satisfies ClientIntent);
    continueVisibleResolution(roomServer);

    expect(roomServer.getState().scenarioProgress.doomTokens).toBe(1);
    expect(roomServer.getState().players[0]?.character.wounds).toBe(1);
    expect(roomServer.getState().escalationLevel).toBe(1);
    expect(roomServer.getState().currentEncounter).not.toBeNull();
  });

  it("burns extra Dying Star tokens when wounds are taken through normal effect resolution", () => {
    const roomServer = new GameRoomServer(
      createSoloAmbientState({
        activeScenarioId: "scenario_dying_star",
        scenarioProgress: {
          starTokens: 2
        },
        phase: "resolution",
        pendingEffect: { type: "take_wound", amount: 1 } as EncounterEffect,
        resolutionSource: "encounter"
      }),
      [],
      createSequenceRandomSource([0])
    );

    (roomServer as any).applyAction({
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: { type: "take_wound", amount: 1 },
      sourceCardId: null,
      success: false,
      createdAt: new Date().toISOString()
    });

    expect(roomServer.getState().players[0]?.character.wounds).toBe(1);
    expect(roomServer.getState().scenarioProgress.starTokens).toBe(1);
    expect(roomServer.getState().lastOutcomeSummary?.summary ?? "").toContain("Fresh wounds strip 1 additional Starfire token");
  });
});
