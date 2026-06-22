import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../dice.js";
import { createCharacters } from "./testData.js";
import { GameRoomServer, type ConnectedClient } from "../../../server/roomServer.js";
import type { ClientIntent } from "../actions.js";
import type { ThreatCard } from "../../schema/card.schema.js";
import type { Character } from "../../schema/character.schema.js";
import type { ContractCard } from "../../schema/contract.schema.js";
import type { GearItem } from "../../schema/gear.schema.js";
import type { GameState, PlayerState } from "../../schema/session.schema.js";

function createGear(): Map<string, GearItem> {
  return new Map<string, GearItem>([
    [
      "tuning-spines",
      {
        id: "tuning-spines",
        name: "Tuning Spines",
        slot: "utility",
        statBonus: { stat: "signal", amount: 1 }
      }
    ]
  ]);
}

function createContracts(): Map<string, ContractCard> {
  return new Map<string, ContractCard>([
    [
      "choir-hush-census",
      {
        id: "choir-hush-census",
        name: "Hush Census",
        factionGiver: "Glass Choir",
        text: "Defeat two enemies to restore a listening chamber.",
        objective: { type: "defeatCount", target: 2 },
        reward: { type: "lose_heat", amount: 1 }
      }
    ]
  ]);
}

function createThreats(): Map<string, ThreatCard> {
  return new Map<string, ThreatCard>([
    [
      "cinder-veil-stalker",
      {
        id: "cinder-veil-stalker",
        type: "threat",
        cardType: "enemy",
        title: "Cinder-Veil Stalker",
        enemyName: "Cinder-Veil Stalker",
        text: "A heat-shimmer stalker forces a close fight.",
        flavor: "You spot it only when the ash around it starts to boil.",
        severity: 2,
        stat: "grit",
        difficulty: 6,
        trophyValue: 6,
        defeatReward: {
          type: "gain_gear",
          gearId: "tuning-spines"
        },
        woundOnLoss: {
          type: "take_wound",
          amount: 1
        }
      }
    ]
  ]);
}

function cloneCharacter(character: Character | undefined, currentSpaceId: string): Character {
  if (!character) {
    throw new Error("Missing character fixture");
  }

  return {
    ...character,
    currentSpaceId,
    activeContract: character.activeContract ? { ...character.activeContract } : null,
    heldGear: [...character.heldGear],
    equippedGear: { ...character.equippedGear },
    abilities: [...character.abilities],
    scars: [...character.scars]
  };
}

function createMatrixState(playerCount: number, overrides: Partial<GameState> = {}): GameState {
  const roster = ["void-marshal", "signal-witch", "grave-engineer"] as const;
  const characterCatalog = createCharacters();
  const contracts = [...createContracts().values()];
  const sectors = [
    {
      id: "sector-a",
      name: "Ashwake Crossing",
      regionTier: "borderlight" as const,
      neighbors: ["sector-b", "center_cinder_gate"],
      danger: 2,
      encounterDecks: { threat: ["cinder-veil-stalker"], anomaly: [], contract: [], artifact: [], escalation: [] }
    },
    {
      id: "sector-b",
      name: "Glassmere Spindle",
      regionTier: "borderlight" as const,
      neighbors: ["sector-a", "center_cinder_gate"],
      danger: 3,
      encounterDecks: { threat: ["cinder-veil-stalker"], anomaly: [], contract: [], artifact: [], escalation: [] }
    },
    {
      id: "center_cinder_gate",
      name: "The Cinder Gate",
      regionTier: "cinder_gate" as const,
      neighbors: ["sector-a", "sector-b"],
      danger: 4,
      encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
    }
  ];

  const seats = Array.from({ length: playerCount }, (_, index) => {
    const seatNumber = index + 1;
    return {
      seatId: `seat-${seatNumber}`,
      characterId: roster[index % roster.length],
      displayName: `Seat ${seatNumber}`,
      connected: true,
      kicked: false,
      joinToken: `seat:matrix:${seatNumber}`
    };
  });

  const players: PlayerState[] = seats.map((seat, index) => {
    const sectorId = index % 2 === 0 ? "sector-a" : "sector-b";
    return {
      seatId: seat.seatId,
      sectorId,
      private: { hand: [], notes: [] },
      character: cloneCharacter(characterCatalog.get(seat.characterId), sectorId)
    };
  });

  return {
    sessionId: `matrix-${playerCount}`,
    status: "active",
    sessionMode: playerCount === 1 ? "single-player" : "multiplayer",
    winnerSeatId: null,
    activeScenarioId: "scenario_broken_seal",
    scenarioProgress: {
      sealRestorationMarks: 0,
      sealTokens: 6
    },
    phase: "action",
    resolutionSource: null,
    activeSeatIndex: 0,
    turnOrder: seats.map((seat) => seat.seatId),
    heatThreshold: 6,
    woundThreshold: 3,
    sequence: 0,
    escalationLevel: 0,
    sectors,
    seats,
    players,
    availableContracts: contracts,
    eventLog: [],
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
    lastOutcomeSummary: null,
    ...overrides
  };
}

function createClient(seatId: string): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send() {},
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function createCapturingClient(seatId: string, sent: Array<Record<string, unknown>>): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(payload: string) {
        sent.push(JSON.parse(payload) as Record<string, unknown>);
      },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function runIntent(server: GameRoomServer, intent: ClientIntent, sent: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  server.handleIntent(createCapturingClient(intent.seatId, sent), intent);
  return sent;
}

function withOnlyConnectedSeat(state: GameState, connectedSeatId: string): GameState {
  return {
    ...state,
    seats: state.seats.map((seat) => ({
      ...seat,
      connected: seat.seatId === connectedSeatId
    }))
  };
}

function withoutThreats(state: GameState): GameState {
  return {
    ...state,
    sectors: state.sectors.map((sector) => ({
      ...sector,
      encounterDecks: {
        ...sector.encounterDecks,
        threat: []
      }
    }))
  };
}

describe.each([1, 2, 3, 4, 5, 6])("player count matrix (%i players)", (playerCount) => {
  it("rotates turns across the full table and advances escalation once per round", () => {
    const server = new GameRoomServer(
      withoutThreats(
        createMatrixState(playerCount, {
          phase: "navigation",
          currentEncounter: null,
          pendingEnemyRoll: null,
          pendingEffect: null
        })
      ),
      [],
      createSequenceRandomSource([5, 5, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    for (let turn = 0; turn < playerCount; turn += 1) {
      const activeSeatId = server.getState().turnOrder[server.getState().activeSeatIndex]!;
      const currentSpaceId = server.getState().players.find((entry) => entry.seatId === activeSeatId)?.character.currentSpaceId!;
      const nextSectorId = server.getState().sectors.find((sector) => sector.id === currentSpaceId)?.neighbors[0]!;

      runIntent(server, {
        type: "MOVE_REQUESTED",
        seatId: activeSeatId,
        toSectorId: nextSectorId
      });

      runIntent(server, {
        type: "PHASE_ADVANCED",
        seatId: activeSeatId,
        toPhase: "resolution"
      });

      expect(server.getState().status).toBe("active");
      expect(server.getState().winnerSeatId).toBeNull();
    }

    expect(server.getState().activeSeatIndex).toBe(0);
    expect(server.getState().escalationLevel).toBe(1);
  });

  it("rejects invalid turn input", () => {
    const server = new GameRoomServer(
      createMatrixState(playerCount, {
        phase: "action",
        currentEncounter: null
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    const responses = runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-2",
      toPhase: "resolution"
    });

    expect(responses.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("outside its turn"))).toBe(
      true
    );
  });

  it("tracks scenario progress as a scoring proxy before the final win", () => {
    const server = new GameRoomServer(
        createMatrixState(playerCount, {
          phase: "action",
          currentEncounter: null,
          pendingEnemyRoll: null,
          pendingEffect: null,
          scenarioProgress: {
            sealRestorationMarks: 0,
            sealTokens: 6
          },
          players: createMatrixState(playerCount).players.map((player, index) =>
            index === 0
              ? {
                  ...player,
                  sectorId: "center_cinder_gate",
                  character: {
                    ...player.character,
                    currentSpaceId: "center_cinder_gate",
                    stats: {
                      command: player.character.stats.command,
                      grit: 12,
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
      createSequenceRandomSource([5, 5, 0, 0, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1",
    });

    expect(server.getState().status).toBe("active");
    expect(server.getState().winnerSeatId).toBeNull();
    expect(server.getState().scenarioProgress.sealRestorationMarks).toBe(1);
  });

  it("reaches a valid end-game victory through scenario confrontation", () => {
    const server = new GameRoomServer(
      createMatrixState(playerCount, {
        phase: "action",
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        scenarioProgress: {
          sealRestorationMarks: 1,
          sealTokens: 6
        },
        players: createMatrixState(playerCount).players.map((player, index) =>
          index === 0
            ? {
                ...player,
                sectorId: "center_cinder_gate",
                character: {
                  ...player.character,
                  currentSpaceId: "center_cinder_gate",
                  stats: {
                    command: 12,
                    grit: 12,
                    signal: 12,
                    guile: 12,
                    forge: 12
                  }
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([5, 5, 5, 5, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().status).toBe("ended");
    expect(server.getState().winnerSeatId).toBe("seat-1");
    expect(server.getState().scenarioProgress.sealRestorationMarks).toBeGreaterThanOrEqual(2);
  });
});
