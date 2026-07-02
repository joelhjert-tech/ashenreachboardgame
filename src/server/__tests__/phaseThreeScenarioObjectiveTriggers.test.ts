import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";

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

function createActiveState(
  scenarioId = "scenario_broken_seal",
  overrides: Partial<GameState> = {},
  interactionMode: GameState["interactionMode"] = "co-op"
): GameState {
  const base = createInitialSessionState(`phase-three-objective-${scenarioId}`, "multiplayer", scenarioId, interactionMode, "standard", 2);

  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1", "seat-2"],
    seats: base.seats.slice(0, 2).map((seat, index) => ({
      ...seat,
      displayName: `Player ${index + 1}`,
      connected: true,
      ready: true
    })),
    players: base.players.slice(0, 2),
    ...overrides
  };
}

describe("Phase 3B scenario objective progress triggers", () => {
  it("advances public objective progress when a completed contract trigger matches", () => {
    const state = createActiveState("scenario_broken_seal");
    state.players[0] = {
      ...state.players[0]!,
      character: {
        ...state.players[0]!.character,
        activeContract: { contractId: "cartel-crossing-thread", progress: 1 }
      }
    };
    const server = new GameRoomServer(state);

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "cartel-crossing-thread"
    });

    expect(server.getState().scenarioProgress.sealRestorationMarks).toBe(1);
    expect(server.getState().eventLog.some((entry) => (entry as { type?: string }).type === "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED")).toBe(true);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("The Broken Seal objective advanced");
  });

  it("advances objective progress from a matching defeated threat and ignores non-matching threats", () => {
    const threats = loadThreatCards();
    const blueThreat = threats.get("bell-mask-pilgrim") as Extract<ThreatCard, { cardType: "enemy" }>;
    const redThreat = threats.get("ash-lane-cutters") as Extract<ThreatCard, { cardType: "enemy" }>;
    const server = new GameRoomServer(
      createActiveState("scenario_broken_seal", { currentEncounter: blueThreat }),
      [],
      createSequenceRandomSource([5, 5, 0, 0])
    );

    (server as unknown as { resolveOpposedCombat: (seatId: string, stat: "grit", encounter: typeof blueThreat, roller: null) => void }).resolveOpposedCombat(
      "seat-1",
      "grit",
      blueThreat,
      null
    );

    expect(server.getState().scenarioProgress.sealRestorationMarks).toBe(1);

    const missServer = new GameRoomServer(
      createActiveState("scenario_broken_seal", { currentEncounter: redThreat }),
      [],
      createSequenceRandomSource([5, 5, 0, 0])
    );
    (missServer as unknown as { resolveOpposedCombat: (seatId: string, stat: "grit", encounter: typeof redThreat, roller: null) => void }).resolveOpposedCombat(
      "seat-1",
      "grit",
      redThreat,
      null
    );

    expect(missServer.getState().scenarioProgress.sealRestorationMarks).toBeUndefined();
  });

  it("advances objective progress from a matching sector action", () => {
    const state = createActiveState("scenario_labyrinth_engine", {
      players: createActiveState("scenario_labyrinth_engine").players.slice(0, 2).map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              sectorId: "middle_guardian_span",
              character: {
                ...player.character,
                currentSpaceId: "middle_guardian_span"
              }
            }
          : player
      ),
      sectors: createActiveState("scenario_labyrinth_engine").sectors.map((sector) =>
        sector.id === "middle_guardian_span"
          ? {
              ...sector,
              encounterDecks: { ...sector.encounterDecks, threat: [] }
            }
          : sector
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));

    (server as unknown as { resolveSpaceTextIntent: (intent: Extract<ClientIntent, { type: "RESOLVE_SPACE_TEXT" }>) => void }).resolveSpaceTextIntent({
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1",
      choiceId: "seal-alignment"
    });

    expect(server.getState().scenarioProgress.shutdownMarks).toBe(1);
  });

  it("clamps progress, completes the scenario at threshold, and projects updated public pressure", () => {
    const state = createActiveState("scenario_broken_seal", {
      scenarioProgress: { sealTokens: 6, sealRestorationMarks: 1 },
      players: createActiveState("scenario_broken_seal").players.slice(0, 2).map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                activeContract: { contractId: "cartel-crossing-thread", progress: 1 }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state);

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "cartel-crossing-thread"
    });

    const tvProjection = createTvProjection(server.getState()) as {
      scenarioPressure: { scenarioStatus: string; objectiveProgress: { current: number; required: number; completed: boolean } } | null;
    };

    expect(server.getState().status).toBe("ended");
    expect(server.getState().winnerSeatId).toBe("seat-1");
    expect(server.getState().scenarioProgress.sealRestorationMarks).toBe(2);
    expect(tvProjection.scenarioPressure).toMatchObject({
      scenarioStatus: "completed",
      objectiveProgress: {
        current: 2,
        required: 2,
        completed: true
      }
    });
  });

  it("keeps rivalry objective progress public while private agenda remains phone-only", () => {
    const state = createActiveState("scenario_devourer_beneath", { scenarioProgress: { doomTokens: 0 } }, "rivalry");
    state.players[0] = {
      ...state.players[0]!,
      private: {
        ...state.players[0]!.private,
        notes: ["Secret maw timing"]
      }
    };
    const threats = loadThreatCards();
    const redThreat = threats.get("ash-lane-cutters") as Extract<ThreatCard, { cardType: "enemy" }>;
    const server = new GameRoomServer(
      {
        ...state,
        currentEncounter: redThreat
      },
      [],
      createSequenceRandomSource([5, 5, 0, 0])
    );

    (server as unknown as { resolveOpposedCombat: (seatId: string, stat: "grit", encounter: typeof redThreat, roller: null) => void }).resolveOpposedCombat(
      "seat-1",
      "grit",
      redThreat,
      null
    );

    const tvProjection = createTvProjection(server.getState()) as {
      scenarioPressure: { objectiveProgress: { current: number } } | null;
      privateRivalry?: unknown;
    };
    const ownerPhone = createPhoneProjection(server.getState(), "seat-1") as {
      privateRivalry: { recentPrivateNotes: string[] } | null;
    };
    const otherPhone = createPhoneProjection(server.getState(), "seat-2") as {
      privateRivalry: { recentPrivateNotes: string[] } | null;
    };
    const tvJson = JSON.stringify(tvProjection);

    expect(tvProjection.scenarioPressure?.objectiveProgress.current).toBe(1);
    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvJson).not.toContain("Secret maw timing");
    expect(ownerPhone.privateRivalry?.recentPrivateNotes).toEqual(["Secret maw timing"]);
    expect(otherPhone.privateRivalry?.recentPrivateNotes).toEqual([]);
  });
});
