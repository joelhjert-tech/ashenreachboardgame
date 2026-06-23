import { describe, expect, it } from "vitest";
import { RIFTFALL_BOARD_NODES } from "../../data/riftfallBoardNodes.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createCanonicalSectorGraph, validateCanonicalSectorGraph } from "../../game/data/canonicalSectorGraph.js";
import { BOARD_SPACES } from "../../game/data/boardSpaces.js";
import { SCENARIOS } from "../../game/data/scenarios.js";
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

  it("keeps the live threat deck broad and every canonical threat reference resolvable", () => {
    const sectors = createCanonicalSectorGraph();
    const threats = loadThreatCards();
    const referencedThreatIds = new Set(sectors.flatMap((sector) => sector.encounterDecks.threat));
    const severities = new Set([...threats.values()].map((threat) => threat.severity));

    expect(threats.size).toBeGreaterThanOrEqual(40);
    expect(referencedThreatIds.size).toBe(threats.size);
    expect([...referencedThreatIds].filter((threatId) => !threats.has(threatId))).toEqual([]);
    expect([...severities].sort()).toEqual([1, 2, 3, 4, 5]);
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

  it("seeds the requested scenario instead of always defaulting to Broken Seal", () => {
    const state = createInitialSessionState("session-devourer", "multiplayer", "scenario_devourer_beneath");

    expect(state.activeScenarioId).toBe("scenario_devourer_beneath");
    expect(state.scenarioProgress).toEqual({ doomTokens: 0, devourerIndex: 0 });
  });

  it("can initialize every authored scenario id without falling back or breaking progress seeding", () => {
    for (const scenario of SCENARIOS) {
      const state = createInitialSessionState(`session-${scenario.id}`, "multiplayer", scenario.id);

      expect(state.activeScenarioId).toBe(scenario.id);
      expect(state.scenarioProgress).toBeDefined();
      expect(typeof state.scenarioProgress).toBe("object");
    }
  });

  it("includes the active scenario in both TV and phone projections", () => {
    const state = createInitialSessionState("session-alpha");
    const tvProjection = createTvProjection(state) as {
      activeScenario: {
        id: string;
        name: string;
        theme: string;
        difficulty: string;
        pressureSummary: string;
        progress: number;
        threshold: number;
        setup: string[];
        specialRules: string[];
        confrontationSteps: string[];
        victoryText: string;
      } | null;
      scenarioProgress: Record<string, number>;
      nemesis: { id: string } | null;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      activeScenario: { confrontationTitle: string; specialRules: string[]; victoryText: string } | null;
      scenarioProgress: Record<string, number>;
      nemesis: { id: string } | null;
    };

    expect(tvProjection.activeScenario?.id).toBe("scenario_broken_seal");
    expect(tvProjection.activeScenario?.theme).toContain("Cinder Gate");
    expect(tvProjection.activeScenario?.difficulty).toBe("easy-medium");
    expect(tvProjection.activeScenario?.pressureSummary).toContain("6 seals remain");
    expect(tvProjection.activeScenario?.progress).toBe(0);
    expect(tvProjection.activeScenario?.threshold).toBe(2);
    expect(tvProjection.activeScenario?.setup.length).toBeGreaterThan(0);
    expect(tvProjection.activeScenario?.specialRules.length).toBeGreaterThan(0);
    expect(tvProjection.activeScenario?.confrontationSteps.length).toBeGreaterThan(0);
    expect(tvProjection.activeScenario?.victoryText).toContain("win");
    expect(phoneProjection.activeScenario?.confrontationTitle).toBe("Reseal the Prison");
    expect(phoneProjection.activeScenario?.specialRules.length).toBeGreaterThan(0);
    expect(phoneProjection.activeScenario?.victoryText).toContain("win");
    expect(tvProjection.scenarioProgress).toEqual({ sealTokens: 6 });
    expect(phoneProjection.scenarioProgress).toEqual({ sealTokens: 6 });
    expect(tvProjection.nemesis).toBeNull();
    expect(phoneProjection.nemesis).toBeNull();
  });

  it("includes the linked nemesis block in TV and phone projections", () => {
    const state = createInitialSessionState("session-alpha");
    state.activeScenarioId = "scenario_throne_of_ash";
    state.scenarioProgress = { throneClaims: 2 };

    const tvProjection = createTvProjection(state) as {
      activeScenario: { threshold: number } | null;
      nemesis: { id: string; life: number; damageDealt: number } | null;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      nemesis: { id: string; life: number; damageDealt: number } | null;
    };

    expect(tvProjection.activeScenario?.threshold).toBe(6);
    expect(tvProjection.nemesis).toMatchObject({
      id: "nemesis_hollow_regent",
      life: 6,
      damageDealt: 2
    });
    expect(phoneProjection.nemesis).toMatchObject({
      id: "nemesis_hollow_regent",
      life: 6,
      damageDealt: 2
    });
  });

  it("builds scenario telemetry for all six authored scenarios with live, scenario-specific readouts", () => {
    const expectations: Record<string, string[]> = {
      scenario_broken_seal: ["Seal Tokens", "Turn Pressure", "Restoration"],
      scenario_throne_of_ash: ["Crown Claims", "Crown Holders", "Active Crowns"],
      scenario_mirror_of_false_heroes: ["Mirror Breaks", "Heat Proxy", "Reflection Feed"],
      scenario_devourer_beneath: ["Doom Tokens", "Devourer", "Collapse Pulse"],
      scenario_labyrinth_engine: ["Engine Mode", "Rotation", "Shutdown"],
      scenario_dying_star: ["Star Tokens", "Wound Burn", "Ignition"]
    };

    for (const scenario of SCENARIOS) {
      const state = createInitialSessionState(`telemetry-${scenario.id}`, "multiplayer", scenario.id);
      state.seats[0] = { ...state.seats[0]!, displayName: "Joel", connected: true };
      const tvProjection = createTvProjection(state) as {
        scenarioTelemetry: Array<{ label: string; value: string }>;
        activeScenario: { pressureSummary: string } | null;
      };
      const phoneProjection = createPhoneProjection(state, "seat-1") as {
        scenarioTelemetry: Array<{ label: string; value: string }>;
      };

      expect(tvProjection.activeScenario?.pressureSummary).toBeTruthy();
      expect(tvProjection.scenarioTelemetry.map((entry) => entry.label)).toEqual(expectations[scenario.id]);
      expect(phoneProjection.scenarioTelemetry.map((entry) => entry.label)).toEqual(expectations[scenario.id]);
      expect(tvProjection.scenarioTelemetry.every((entry) => entry.value.length > 0)).toBe(true);
      expect(phoneProjection.scenarioTelemetry.every((entry) => entry.value.length > 0)).toBe(true);
    }
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
