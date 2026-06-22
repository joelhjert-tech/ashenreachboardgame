import { describe, expect, it, vi } from "vitest";
import { createCharacters } from "./testData.js";
import { createSequenceRandomSource } from "../dice.js";
import { GameRoomServer, createPhoneProjection, createTvProjection, type ConnectedClient } from "../../../server/roomServer.js";
import type { Character } from "../../schema/character.schema.js";
import type { ContractCard } from "../../schema/contract.schema.js";
import type { GearItem } from "../../schema/gear.schema.js";
import type { ThreatCard } from "../../schema/card.schema.js";
import type { ClientIntent, GameAction } from "../actions.js";
import type { GameState } from "../../schema/session.schema.js";

function createGear(): Map<string, GearItem> {
  return new Map<string, GearItem>([
    [
      "veil-hook",
      {
        id: "veil-hook",
        name: "Veil Hook",
        slot: "weapon",
        statBonus: { stat: "grit", amount: 1 }
      }
    ],
    [
      "tuning-spines",
      {
        id: "tuning-spines",
        name: "Tuning Spines",
        slot: "utility",
        statBonus: { stat: "signal", amount: 1 }
      }
    ],
    [
      "coffin-rig",
      {
        id: "coffin-rig",
        name: "Coffin Rig",
        slot: "armor",
        statBonus: { stat: "forge", amount: 1 }
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
        text: "The Choir demands two clean removals so a listening chamber can return to its proper silence.",
        objective: { type: "defeatCount", target: 2 },
        reward: { type: "lose_heat", amount: 1 }
      }
    ],
    [
      "compact-cleanse-ledger",
      {
        id: "compact-cleanse-ledger",
        name: "Cleanse Ledger",
        factionGiver: "Meridian Compact",
        text: "The Compact wants two hostile disruptions erased from a freight lane before the next audit sweep arrives.",
        objective: { type: "defeatCount", target: 2 },
        reward: { type: "gain_gear", gearId: "veil-hook" }
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
        text: "A heat-shimmer shape slips between pylons, then breaks cover with a hooked furnace blade.",
        flavor: "You spot it only when the ash around it begins to boil.",
        severity: 2,
        stat: "grit",
        difficulty: 6,
        defeatReward: {
          type: "gain_gear",
          gearId: "tuning-spines"
        },
        woundOnLoss: {
          type: "take_wound",
          amount: 1
        }
      }
    ],
    [
      "pike-runner",
      {
        id: "pike-runner",
        type: "threat",
        cardType: "enemy",
        title: "Pike Runner",
        enemyName: "Pike Runner",
        text: "A scavenger courier lowers a long ash-pike and charges through the glare.",
        flavor: "The tip sings before the carrier does.",
        severity: 2,
        stat: "grit",
        difficulty: 6,
        defeatReward: {
          type: "gain_gear",
          gearId: "veil-hook"
        },
        woundOnLoss: {
          type: "take_wound",
          amount: 1
        }
      }
    ],
    [
      "signal-static",
      {
        id: "signal-static",
        type: "threat",
        cardType: "hazard",
        title: "Signal Static",
        text: "A wash of fractured relay noise blurs every route marker in view.",
        flavor: "The air hisses like a torn wire bundle.",
        severity: 1,
        stat: "signal",
        difficulty: 7,
        successEffect: {
          type: "gain_note",
          text: "You mapped the strongest band before it decayed."
        },
        failEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ],
    [
      "relay-whisper",
      {
        id: "relay-whisper",
        type: "threat",
        cardType: "hazard",
        title: "Relay Whisper",
        text: "A half-born transmission skates across the rails and erases the true path beneath it.",
        flavor: "It sounds close enough to trust until the floor drops away.",
        severity: 1,
        stat: "signal",
        difficulty: 7,
        successEffect: {
          type: "gain_note",
          text: "You pinned the false carrier and marked its pulse drift."
        },
        failEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ]
  ]);
}

function cloneCharacter(character: Character | undefined): Character {
  if (!character) {
    throw new Error("Missing character fixture");
  }

  return {
    ...character,
    activeContract: character.activeContract ? { ...character.activeContract } : null,
    heldGear: [...character.heldGear],
    equippedGear: { ...character.equippedGear },
    abilities: [...character.abilities],
    scars: [...character.scars]
  };
}

function createState(overrides: Partial<GameState> = {}): GameState {
  const characters = createCharacters();
  const contracts = [...createContracts().values()];
  const baseState: GameState = {
    sessionId: "session-alpha",
    status: "active",
    sessionMode: "multiplayer",
    winnerSeatId: null,
    activeScenarioId: "scenario_broken_seal",
    scenarioProgress: {},
    phase: "action",
    resolutionSource: null,
    activeSeatIndex: 0,
    turnOrder: ["seat-1", "seat-2", "seat-3"],
    heatThreshold: 6,
    woundThreshold: 3,
    sequence: 0,
    sectors: [
      {
        id: "sector-a",
        name: "Ashwake Crossing",
        regionTier: "borderlight",
        neighbors: ["sector-b"],
        danger: 2,
        encounterDecks: { threat: ["signal-static"], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "sector-b",
        name: "Glassmere Spindle",
        regionTier: "borderlight",
        neighbors: ["sector-a", "sector-c"],
        danger: 3,
        encounterDecks: { threat: ["cinder-veil-stalker", "signal-static", "relay-whisper"], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "sector-c",
        name: "Mirecoil Beacon",
        regionTier: "borderlight",
        neighbors: ["sector-b"],
        danger: 4,
        encounterDecks: { threat: ["signal-static", "pike-runner"], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    seats: [
      { seatId: "seat-1", characterId: "void-marshal", displayName: "Seat One", connected: true, kicked: false, joinToken: "seat:session-alpha:seat-1" },
      { seatId: "seat-2", characterId: "signal-witch", displayName: "Seat Two", connected: true, kicked: false, joinToken: "seat:session-alpha:seat-2" },
      { seatId: "seat-3", characterId: "grave-engineer", displayName: "Seat Three", connected: true, kicked: false, joinToken: "seat:session-alpha:seat-3" }
    ],
    players: [
      {
        seatId: "seat-1",
        sectorId: "sector-a",
        private: { hand: [], notes: [] },
        character: {
          ...cloneCharacter(characters.get("void-marshal")),
          currentSpaceId: "sector-a",
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      },
      {
        seatId: "seat-2",
        sectorId: "sector-b",
        private: { hand: [], notes: [] },
        character: {
          ...cloneCharacter(characters.get("signal-witch")),
          currentSpaceId: "sector-b",
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      },
      {
        seatId: "seat-3",
        sectorId: "sector-b",
        private: { hand: [], notes: [] },
        character: {
          ...cloneCharacter(characters.get("grave-engineer")),
          currentSpaceId: "sector-b",
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      }
    ],
    availableContracts: contracts,
    eventLog: [],
    escalationLevel: 0,
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
    lastOutcomeSummary: null
  };

  return {
    ...baseState,
    ...overrides,
    sessionMode: overrides.sessionMode ?? baseState.sessionMode
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

function runIntent(server: GameRoomServer, intent: ClientIntent): void {
  server.handleIntent(createClient(intent.seatId), intent);
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

describe("movement rolls", () => {
  it("succeeds against a low-danger node without changing Heat", () => {
    const baseState = createState({ phase: "navigation" });
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 1,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const summary = server.getState().lastOutcomeSummary;

    expect(player?.character.currentSpaceId).toBe("sector-b");
    expect(player?.character.heat).toBe(0);
    expect(summary?.checkStat).toBe("guile");
    expect(summary?.difficulty).toBe(1);
    expect(summary?.success).toBe(true);
    expect(summary?.die1).toBe(1);
    expect(summary?.die2).toBe(1);
  });

  it("still completes the move on a failed roll and applies Heat", () => {
    const baseState = createState({ phase: "navigation" });
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 8,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const summary = server.getState().lastOutcomeSummary;

    expect(player?.character.currentSpaceId).toBe("sector-b");
    expect(player?.character.heat).toBe(1);
    expect(summary?.success).toBe(false);
    expect(summary?.difficulty).toBe(8);
  });

  it("triggers the recall flow when failed movement Heat reaches the threshold", () => {
    const baseState = createState({ phase: "navigation" });
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        heatThreshold: 2,
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 8,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        ),
        players: baseState.players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  heat: 1
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const seat1 = server.getState().players.find((entry) => entry.seatId === "seat-1");

    expect(seat1?.character.currentSpaceId).toBe("sector-b");
    expect(seat1?.character.heat).toBe(2);
    expect(seat1?.character.status).toBe("recalled");
    expect(server.getState().activeSeatIndex).toBe(1);
    expect(server.getState().phase).toBe("navigation");
    expect(server.getState().currentEncounter).toBeNull();
  });
});

describe("wound recall flow", () => {
  it("does not recall a seat while wounds stay below threshold", () => {
    const enemy = createThreats().get("cinder-veil-stalker");

    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: enemy ?? null,
          players: createState().players.map((entry) =>
            entry.seatId === "seat-1"
              ? {
                  ...entry,
                  character: {
                    ...entry.character,
                    wounds: 1
                  }
                }
              : entry
          )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0, 0, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(2);
    expect(player?.character.status).toBe("active");
    expect(player?.character.scars).toEqual([]);
  });

  it("recalls and scars a seat when wounds reach threshold", () => {
    const enemy = createThreats().get("cinder-veil-stalker");

    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          woundThreshold: 2,
          currentEncounter: enemy ?? null,
          players: createState().players.map((entry) =>
            entry.seatId === "seat-1"
              ? {
                  ...entry,
                  character: {
                    ...entry.character,
                    wounds: 1
                  }
                }
              : entry
          )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0, 0, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(2);
    expect(player?.character.status).toBe("recalled");
    expect(player?.character.scars).toContain("scar-wound-1");
  });

  it("blocks move, check, and combat until a recalled seat recruits a replacement", () => {
    const enemy = createThreats().get("cinder-veil-stalker");
    const client = {
      seatId: "seat-1",
      view: "phone" as const,
      socket: {
        send: vi.fn(),
        close: vi.fn()
      }
    };
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: enemy ?? null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  status: "recalled"
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.handleIntent(client as never, { type: "MOVE_REQUESTED", seatId: "seat-1", toSectorId: "sector-b" });
    server.handleIntent(client as never, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });
    server.handleIntent(client as never, { type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "grit" });

    const payloads = client.socket.send.mock.calls.map((call) => String(call[0]));
    expect(payloads).toHaveLength(3);
    expect(payloads.every((payload) => payload.includes("INTENT_REJECTED"))).toBe(true);
    expect(payloads.every((payload) => payload.includes("must recruit a replacement before acting"))).toBe(true);
  });

  it("recruits a replacement with heat and wounds reset while keeping earned scars", () => {
    const server = new GameRoomServer(
      createState({
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  heat: 2,
                  wounds: 3,
                  status: "recalled",
                  scars: ["scar-wound-1"]
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RECRUIT_REPLACEMENT",
      seatId: "seat-1",
      replacementCharacterId: "signal-witch"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.status).toBe("active");
    expect(player?.character.heat).toBe(0);
    expect(player?.character.wounds).toBe(0);
    expect(player?.character.scars).toContain("scar-wound-1");
    expect(player?.character.id).toBe("signal-witch");
  });
});

describe("escalation flow", () => {
  it("does not advance escalation until the turn order wraps", () => {
    const server = new GameRoomServer(
      createState({
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

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().activeSeatIndex).toBe(1);
    expect(server.getState().escalationLevel).toBe(0);
  });

  it("advances escalation when the turn order wraps back to the first seat", () => {
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          phase: "action",
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: createState().seats.slice(0, 1),
          players: createState().players.slice(0, 1)
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, { type: "PHASE_ADVANCED", seatId: "seat-1", toPhase: "resolution" });

    expect(server.getState().escalationLevel).toBe(1);
  });

  it("applies the escalation modifier to movement and encounter difficulty", () => {
    const moveServer = new GameRoomServer(
      createState({
        phase: "navigation",
        escalationLevel: 2,
        sectors: createState({ phase: "navigation" }).sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 2,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(moveServer, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    expect(moveServer.getState().lastOutcomeSummary?.difficulty).toBe(3);

    const checkServer = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          escalationLevel: 2,
          currentEncounter: createThreats().get("signal-static") ?? null
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(checkServer, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });

    const checkRolledEvent = [...checkServer.getState().eventLog]
      .reverse()
      .find((entry): entry is { type: "CHECK_ROLLED"; difficulty: number } => {
        return Boolean(entry && typeof entry === "object" && "type" in entry && (entry as { type?: string }).type === "CHECK_ROLLED");
      });

    expect(checkRolledEvent?.difficulty).toBe(8);
  });

  it("ends the game with no winner when escalation reaches collapse", () => {
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          phase: "action",
          escalationLevel: 5,
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: createState().seats.slice(0, 1),
          players: createState().players.slice(0, 1)
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().status).toBe("ended");
    expect(server.getState().winnerSeatId).toBeNull();
    expect(server.getState().phase).toBe("broadcast");
    expect(server.getState().escalationLevel).toBe(6);
  });

  it("feeds escalation from wounds taken during resolution effects", () => {
    const baseState = createState({
      phase: "action",
      currentEncounter: null,
      pendingEnemyRoll: null,
      pendingEffect: null,
      turnOrder: ["seat-1"],
      activeSeatIndex: 0
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        {
          ...baseState,
          seats: baseState.seats.slice(0, 1),
          players: baseState.players.slice(0, 1).map((player) => ({
            ...player,
            sectorId: "center_cinder_gate",
            character: {
              ...player.character,
              currentSpaceId: "center_cinder_gate"
            }
          }))
        },
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { applyAction: (action: GameAction) => void }).applyAction({
      type: "SCENARIO_PROGRESS_ADVANCED",
      seatId: "seat-1",
      scenarioId: "scenario_broken_seal",
      progressKey: "sealRestorationMarks",
      amount: 0,
      effect: { type: "take_wound", amount: 2 },
      summary: "The breach lashes back.",
      createdAt: new Date().toISOString()
    });

    expect(server.getState().players[0]?.character.wounds).toBe(2);
    expect(server.getState().escalationLevel).toBe(2);
  });

  it("collapses the session when a wound feeder pushes escalation to threshold", () => {
    const baseState = createState({
      phase: "action",
      escalationLevel: 5,
      currentEncounter: null,
      pendingEnemyRoll: null,
      pendingEffect: null,
      turnOrder: ["seat-1"],
      activeSeatIndex: 0
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        {
          ...baseState,
          seats: baseState.seats.slice(0, 1),
          players: baseState.players.slice(0, 1).map((player) => ({
            ...player,
            sectorId: "center_cinder_gate",
            character: {
              ...player.character,
              currentSpaceId: "center_cinder_gate"
            }
          }))
        },
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { applyAction: (action: GameAction) => void }).applyAction({
      type: "SCENARIO_PROGRESS_ADVANCED",
      seatId: "seat-1",
      scenarioId: "scenario_broken_seal",
      progressKey: "sealRestorationMarks",
      amount: 0,
      effect: { type: "take_wound", amount: 1 },
      summary: "The breach breaks through.",
      createdAt: new Date().toISOString()
    });

    expect(server.getState().escalationLevel).toBe(6);
    expect(server.getState().status).toBe("ended");
    expect(server.getState().winnerSeatId).toBeNull();
  });

  it("lets the active seat stabilize the breach and clamps escalation at zero", () => {
    const baseState = createState({
      phase: "action",
      currentEncounter: null,
      pendingEnemyRoll: null,
      pendingEffect: null,
      escalationLevel: 1
    });
    const server = new GameRoomServer(
      {
        ...baseState,
        activeSeatIndex: 0
      },
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "STABILIZE_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().activeSeatIndex).toBe(1);
  });
});

describe("contracts", () => {
  it("accepts a contract when none is active and rejects a second acceptance", () => {
    const contracts = createContracts();
    const server = new GameRoomServer(
      createState(),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const tv = createTvProjection(server.getState()) as {
      availableContracts: Array<{ id: string }>;
      players: Array<{ seatId: string; character: { activeContract: { contractId: string; progress: number } | null } }>;
    };
    const otherPhone = createPhoneProjection(server.getState(), "seat-2") as {
      availableContracts: Array<{ id: string }>;
      players: Array<{ seatId: string; character: { activeContract: { contractId: string; progress: number } | null } }>;
    };

    expect(player?.character.activeContract).toEqual({ contractId: "choir-hush-census", progress: 0 });
    expect(tv.availableContracts.map((entry) => entry.id)).toContain("choir-hush-census");
    expect(tv.players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "choir-hush-census",
      progress: 0
    });
    expect(otherPhone.availableContracts.map((entry) => entry.id)).toContain("choir-hush-census");

    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "choir-hush-census",
      progress: 0
    });
  });

  it("increments defeatCount progress only on combat wins, not on hazard wins", () => {
    const contracts = createContracts();
    const characters = createCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
        currentEncounter: createThreats().get("cinder-veil-stalker") ?? null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  activeContract: { contractId: "choir-hush-census", progress: 0 }
                }
              }
            : entry
        )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0]),
      createThreats(),
      characters,
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(1);

    const hazardServer = new GameRoomServer(
      createState({
        currentEncounter: createThreats().get("signal-static") ?? null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  activeContract: { contractId: "choir-hush-census", progress: 0 },
                  stats: { ...entry.character.stats, signal: 10 }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      contracts
    );

    runIntent(hazardServer, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });

    expect(hazardServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(0);
  });

  it("rejects contract completion below target and completes it at target with reward", () => {
    const contracts = createContracts();
    const server = new GameRoomServer(
      createState({
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  heat: 2,
                  activeContract: { contractId: "choir-hush-census", progress: 1 }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "choir-hush-census",
      progress: 1
    });

    const readyServer = new GameRoomServer(
      createState({
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  heat: 2,
                  activeContract: { contractId: "choir-hush-census", progress: 2 }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runIntent(readyServer, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    const player = readyServer.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.activeContract).toBeNull();
    expect(player?.character.heat).toBe(1);
  });

  it("accepts a contract, wins two combats across turns, completes it, and receives the reward", () => {
    const contracts = createContracts();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
        phase: "navigation",
        players: createState({
          phase: "navigation"
        }).players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  heldGear: [],
                  equippedGear: { weapon: null, armor: null, utility: null }
                }
              }
            : entry
        )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([
        0, 0, 0, 5, 5, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 1, 5, 5, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0
      ]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });
    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });
    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(1);

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "sector-c"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-2",
      stat: "signal"
    });

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "sector-a"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-3",
      stat: "signal"
    });

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-c"
    });
    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(2);

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "sector-b"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-2",
      stat: "signal"
    });

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "sector-b"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-3",
      stat: "signal"
    });

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });
    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.activeContract).toBeNull();
    expect(player?.character.heldGear.some((item) => item.id === "veil-hook")).toBe(true);
  });
});

describe("opposed combat", () => {
  it("assigns a non-active connected non-kicked seat as enemy roller and rejects other seats", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: createThreats().get("cinder-veil-stalker") ?? null
      }),
      [],
      createSequenceRandomSource([0, 5, 5, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().pendingEnemyRoll?.assignedRollerSeatId).toBe("seat-2");

    runIntent(server, {
      type: "ENEMY_ROLL_REQUESTED",
      seatId: "seat-3"
    });

    expect(server.getState().pendingEnemyRoll?.assignedRollerSeatId).toBe("seat-2");

    runIntent(server, {
      type: "ENEMY_ROLL_REQUESTED",
      seatId: "seat-2"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(server.getState().pendingEnemyRoll).toBeNull();
    expect(player?.character.heldGear.some((item) => item.id === "tuning-spines")).toBe(true);
  });

  it("falls back to automatic server resolution when no eligible enemy roller exists", () => {
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: createThreats().get("cinder-veil-stalker") ?? null
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(server.getState().pendingEnemyRoll).toBeNull();
    expect(player?.character.heldGear.some((item) => item.id === "tuning-spines")).toBe(true);
  });

  it("favors the player on ties during opposed combat", () => {
    const tiedEncounter = createThreats().get("cinder-veil-stalker");

    if (!tiedEncounter || tiedEncounter.cardType !== "enemy") {
      throw new Error("Missing enemy test fixture");
    }

    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: {
            ...tiedEncounter,
            difficulty: 2
          }
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0, 0, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(0);
    expect(player?.character.heldGear.some((item) => item.id === "tuning-spines")).toBe(true);
  });
});
