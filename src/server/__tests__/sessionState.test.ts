import { describe, expect, it } from "vitest";
import { RIFTFALL_BOARD_NODES } from "../../data/riftfallBoardNodes.js";
import { createCanonicalSectorGraph, validateCanonicalSectorGraph } from "../../game/data/canonicalSectorGraph.js";
import { BOARD_SPACES } from "../../game/data/boardSpaces.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

describe("canonical sector graph", () => {
  it("creates one live sector for every board node and keeps ids aligned", () => {
    const sectors = createCanonicalSectorGraph();

    validateCanonicalSectorGraph(sectors);

    expect(sectors).toHaveLength(BOARD_SPACES.length);
    expect(sectors.map((sector) => sector.id).sort()).toEqual(RIFTFALL_BOARD_NODES.map((node) => node.id).sort());
  });

  it("starts the session on the canonical board using each character's authored starting space", () => {
    const state = createInitialSessionState("session-alpha");
    const liveSectorIds = new Set(state.sectors.map((sector) => sector.id));

    expect(state.sectors).toHaveLength(BOARD_SPACES.length);
    expect(state.seats).toHaveLength(6);
    expect(state.players).toHaveLength(6);
    expect(state.turnOrder).toEqual(["seat-1", "seat-2", "seat-3", "seat-4", "seat-5", "seat-6"]);
    expect(state.activeScenarioId).toBe("scenario_broken_seal");
    expect(state.scenarioProgress).toEqual({ sealTokens: 6 });
    expect(state.woundThreshold).toBe(3);

    for (const player of state.players) {
      expect(player.sectorId).toBe(player.character.currentSpaceId);
      expect(liveSectorIds.has(player.sectorId)).toBe(true);
    }
  });

  it("creates a true single-player session when requested", () => {
    const state = createInitialSessionState("session-solo", "single-player");
    const tvProjection = createTvProjection(state) as {
      sessionMode: string;
      escalationThreshold: number;
      seats: Array<{ seatId: string }>;
      players: Array<{ seatId: string }>;
    };

    expect(state.sessionMode).toBe("single-player");
    expect(state.seats.map((seat) => seat.seatId)).toEqual(["seat-1"]);
    expect(state.players.map((player) => player.seatId)).toEqual(["seat-1"]);
    expect(state.turnOrder).toEqual(["seat-1"]);
    expect(tvProjection.sessionMode).toBe("single-player");
    expect(tvProjection.escalationThreshold).toBe(8);
    expect(tvProjection.seats).toHaveLength(1);
    expect(tvProjection.players).toHaveLength(0);
  });

  it("includes the active scenario in both TV and phone projections", () => {
    const state = createInitialSessionState("session-alpha");
    const tvProjection = createTvProjection(state) as {
      activeScenario: { id: string; name: string; progress: number; threshold: number } | null;
      scenarioProgress: Record<string, number>;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      activeScenario: { confrontationTitle: string } | null;
      scenarioProgress: Record<string, number>;
    };

    expect(tvProjection.activeScenario?.id).toBe("scenario_broken_seal");
    expect(tvProjection.activeScenario?.progress).toBe(0);
    expect(tvProjection.activeScenario?.threshold).toBe(2);
    expect(phoneProjection.activeScenario?.confrontationTitle).toBe("Reseal the Prison");
    expect(tvProjection.scenarioProgress).toEqual({ sealTokens: 6 });
    expect(phoneProjection.scenarioProgress).toEqual({ sealTokens: 6 });
  });

  it("only allows movement into authored neighboring sectors from the initial session state", () => {
    const initialState = createInitialSessionState("session-alpha");
    const started = reduceGameState(initialState, {
      type: "SESSION_STARTED",
      seatId: "seat-1",
      createdAt: new Date().toISOString()
    });

    if (!started.ok) {
      throw new Error(started.rejection.reason);
    }

    const legalMove = reduceGameState(started.state, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "outer_ember_sanctum",
      createdAt: new Date().toISOString()
    });
    const illegalMove = reduceGameState(started.state, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "hollow-veil-yard",
      createdAt: new Date().toISOString()
    });

    expect(legalMove.ok).toBe(true);
    expect(illegalMove.ok).toBe(false);

    if (!illegalMove.ok) {
      expect(illegalMove.rejection.reason).toContain("not reachable");
    }
  });
});
