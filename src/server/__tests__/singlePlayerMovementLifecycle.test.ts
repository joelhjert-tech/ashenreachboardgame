import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { buildMovementRoutePlan } from "../../game/rules/movementPlanner.js";
import type { GameState } from "../../game/schema/session.schema.js";
import {
  GameRoomServer,
  createPhoneProjection,
  createTvProjection,
  type ConnectedClient,
  type MovementTransitionDiagnostic
} from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function client(seatId = "seat-1", sent: Array<Record<string, unknown>> = []): ConnectedClient {
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

function makeActiveSoloState(sessionId: string): GameState {
  const state = createInitialSessionState(sessionId, "single-player", "scenario_broken_seal");
  const source = state.sectors[0]!;
  const destination = state.sectors[1]!;
  state.status = "active";
  state.phase = "navigation";
  state.turnOrder = ["seat-1"];
  state.activeSeatIndex = 0;
  state.interactionMode = "co-op";
  state.seats = state.seats.map((seat) => ({
    ...seat,
    displayName: "Solo",
    connected: true,
    characterSelected: true,
    ready: true
  }));
  state.sectors = [
    { ...source, id: "solo-sector-a", name: "Solo Sector A", neighbors: ["solo-sector-b"], encounterDecks: { artifact: [], anomaly: [], contract: [], threat: [], escalation: [] }, tileChallenges: [] },
    { ...destination, id: "solo-sector-b", name: "Solo Sector B", neighbors: ["solo-sector-a"], encounterDecks: { artifact: [], anomaly: [], contract: [], threat: [], escalation: [] }, tileChallenges: [] }
  ];
  state.players = state.players.map((player) => ({
    ...player,
    sectorId: "solo-sector-a",
    character: { ...player.character, currentSpaceId: "solo-sector-a", status: "active" }
  }));
  return state;
}

function drainResolution(server: GameRoomServer): void {
  for (let attempt = 0; attempt < 12 && server.getState().activeResolution; attempt += 1) {
    server.handleIntent(client(), { type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  }
  expect(server.getState().activeResolution).toBeNull();
}

function completeActionTurn(server: GameRoomServer): void {
  if (server.getState().phase === "action") {
    server.getState().eventLog.push({
      type: "ESCALATION_ADVANCED",
      seatId: "seat-1",
      amount: -1,
      newLevel: server.getState().escalationLevel,
      modifier: 0,
      reason: "stabilized",
      createdAt: "test-stabilization"
    });
    server.handleIntent(client(), { type: "PHASE_ADVANCED", seatId: "seat-1", toPhase: "resolution" });
  }
  if (server.getState().activeResolution) {
    drainResolution(server);
  }
  expect(server.getState().phase).toBe("navigation");
}

describe("single-player movement lifecycle", () => {
  it("creates one human turn owner without rivalry, bots, or a TV seat", () => {
    const state = createInitialSessionState("solo-session-model", "single-player");

    expect(state.sessionMode).toBe("single-player");
    expect(state.interactionMode).toBe("co-op");
    expect(state.players).toHaveLength(1);
    expect(state.seats).toHaveLength(1);
    expect(state.turnOrder).toEqual(["seat-1"]);
    expect(state.players[0]?.seatId).toBe("seat-1");
    expect(state.nemesisChampions).toEqual([]);
  });

  it("opens the first navigation window before scenario pressure can create an encounter", () => {
    const state = createInitialSessionState("solo-opening", "single-player", "scenario_broken_seal");
    const diagnostics: MovementTransitionDiagnostic[] = [];
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      mode: "live",
      onMovementDiagnostic: (entry) => diagnostics.push(entry)
    });
    const joined = server.joinSeat("Solo", "void-marshal");
    const startingMission = server.getState().seats[0]?.startingContractOptions[0];
    expect(startingMission).toBeTruthy();
    server.selectStartingContract(joined.seatId, startingMission!);
    server.setSeatReady(joined.seatId, true);
    server.startSession();

    expect(server.getState().phase).toBe("navigation");
    expect(server.getState().currentEncounter).toBeNull();
    expect(server.getState().activeResolution).toBeNull();
    expect(server.getState().scenarioPreparation.resources.sealIntegrity).toBe(8);
    expect(diagnostics.at(-1)).toMatchObject({ event: "session-started", activeSeatId: "seat-1", turnOrder: ["seat-1"] });
  });

  it("keeps a rejected destination actionable and restores the same planner after reconnect", () => {
    const state = makeActiveSoloState("solo-rejection");
    state.movementRolls = { "seat-1": 1 };
    state.movementRouteRevisions = { "seat-1": 1 };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]));
    const before = buildMovementRoutePlan(server.getState(), "seat-1");
    const sent: Array<Record<string, unknown>> = [];

    server.handleIntent(client("seat-1", sent), { type: "MOVE_REQUESTED", seatId: "seat-1", toSectorId: "not-a-sector" });

    const after = buildMovementRoutePlan(server.getState(), "seat-1");
    expect(sent).toEqual([expect.objectContaining({ type: "INTENT_REJECTED" })]);
    expect(server.getState().phase).toBe("navigation");
    expect(after?.routes).toEqual(before?.routes);
    expect(after?.routes.map((entry) => entry.sectorId)).toEqual(["solo-sector-b"]);
  });

  it("resolves a genuine zero-destination roll without leaving an orphaned movement prompt", () => {
    const state = makeActiveSoloState("solo-no-route");
    state.sectors = [{ ...state.sectors[0]!, neighbors: [] }];
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]));

    server.handleIntent(client(), { type: "MOVEMENT_ROLL_REQUESTED", seatId: "seat-1" });

    expect(server.getState().phase).toBe("action");
    expect(server.getState().movementRolls?.["seat-1"]).toBeUndefined();
    expect(server.getState().eventLog.at(-1)).toMatchObject({ type: "MOVEMENT_UNAVAILABLE_RESOLVED", seatId: "seat-1" });
    expect(server.getState().lastOutcomeSummary?.summary).toContain("No legal destination");
  });

  it("completes a thirty-turn release soak with one owner, deterministic routes, and reconnect-safe projections", () => {
    const state = makeActiveSoloState("solo-thirty-turns");
    const diagnostics: MovementTransitionDiagnostic[] = [];
    let server = new GameRoomServer(state, [], createSequenceRandomSource(Array(80).fill(0)), undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
      mode: "live",
      onMovementDiagnostic: (entry) => diagnostics.push(entry)
    });

    for (let turn = 1; turn <= 30; turn += 1) {
      if ([6, 12, 18, 24, 30].includes(turn)) {
        server = new GameRoomServer(structuredClone(server.getState()), [], createSequenceRandomSource(Array(20).fill(0)), undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, {
          mode: "live",
          onMovementDiagnostic: (entry) => diagnostics.push(entry)
        });
      }
      server.handleIntent(client(), { type: "MOVEMENT_ROLL_REQUESTED", seatId: "seat-1" });
      const plan = buildMovementRoutePlan(server.getState(), "seat-1");
      expect(plan?.routes).toHaveLength(1);
      const route = plan!.routes[0]!;
      const movementMessages: Array<Record<string, unknown>> = [];
      server.handleIntent(client("seat-1", movementMessages), {
        type: "MOVE_REQUESTED",
        seatId: "seat-1",
        toSectorId: route.sectorId,
        routeId: route.routeId,
        movementRevision: plan!.revision
      });
      expect(movementMessages).toEqual([]);
      drainResolution(server);
      completeActionTurn(server);

      const nextState = server.getState();
      const phone = createPhoneProjection(nextState, "seat-1") as { activeSeatIndex: number; turnOrder: string[]; movementPlanner?: unknown };
      const tv = createTvProjection(nextState) as { activeSeatIndex: number; turnOrder: string[] };
      expect(nextState.status).toBe("active");
      expect(nextState.phase).toBe("navigation");
      expect(nextState.activeSeatIndex).toBe(0);
      expect(nextState.turnOrder).toEqual(["seat-1"]);
      expect(nextState.movementRolls?.["seat-1"]).toBeUndefined();
      expect(nextState.currentEncounter).toBeNull();
      expect(nextState.activeResolution).toBeNull();
      expect(phone.activeSeatIndex).toBe(0);
      expect(phone.turnOrder).toEqual(["seat-1"]);
      expect(tv.activeSeatIndex).toBe(0);
      expect(tv.turnOrder).toEqual(["seat-1"]);
    }

    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "TURN_COMPLETED")).toHaveLength(30);
    expect(diagnostics.filter((entry) => entry.event === "movement-selected")).toHaveLength(30);
    expect(diagnostics.filter((entry) => entry.event === "movement-committed")).toHaveLength(30);
  });
});
