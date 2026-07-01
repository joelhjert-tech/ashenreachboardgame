import { describe, expect, it } from "vitest";
import { RIFTFALL_BOARD_NODES } from "../../data/riftfallBoardNodes.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createCanonicalSectorGraph, validateCanonicalSectorGraph } from "../../game/data/canonicalSectorGraph.js";
import { BOARD_SPACES } from "../../game/data/boardSpaces.js";
import { SCENARIOS } from "../../game/data/scenarios.js";
import { loadContracts } from "../../game/content/contracts.js";
import { loadFollowers } from "../../game/content/followers.js";
import { loadGear } from "../../game/content/gear.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import { applyStartingLoadout } from "../../game/rules/startingLoadout.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";
import { validateJoinToken } from "../auth.js";
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

  it("applies normal starting salvage and contracts without granting mode gear or followers", () => {
    const state = createInitialSessionState("session-alpha", "multiplayer");
    const firstPlayer = state.players[0];

    expect(firstPlayer?.character.salvage).toBe(3);
    expect(firstPlayer?.character.activeContract).toMatchObject({ progress: 0 });
    expect(firstPlayer?.character.activeContract?.contractId).toBe(state.availableContracts[0]?.id);
    expect(firstPlayer?.character.heldGear).toEqual([]);
    expect(firstPlayer?.character.followers ?? []).toEqual([]);
    expect(state.soloRerollCharges).toEqual({});
  });

  it("creates non-forgeable per-seat join tokens for new sessions", () => {
    const first = createInitialSessionState("session-alpha", "single-player");
    const second = createInitialSessionState("session-alpha", "single-player");

    expect(first.seats[0]?.joinToken).toMatch(/^seat:session-alpha:seat-1:/);
    expect(first.seats[0]?.joinToken).not.toBe("seat:session-alpha:seat-1");
    expect(first.seats[0]?.joinToken).not.toBe(second.seats[0]?.joinToken);
  });

  it("rejects legacy unsigned join token helpers", () => {
    expect(validateJoinToken("seat:session-alpha:seat-1", "session-alpha")).toBeNull();
    expect(validateJoinToken("seat:session-alpha:seat-1:", "session-alpha")).toBeNull();
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
    expect(state.heatThreshold).toBe(8);
    expect(state.woundThreshold).toBe(4);
    expect(state.scenarioProgress).toEqual({ sealTokens: 8 });
    expect(state.soloRerollCharges).toEqual({ "seat-1": 1 });
    expect(state.players[0]?.character.salvage).toBe(4);
    expect(state.players[0]?.character.activeContract).toMatchObject({ progress: 0 });
    expect(state.players[0]?.character.heldGear.map((item) => item.id)).toEqual(["veil-hook"]);
    expect(state.players[0]?.character.followers?.map((follower) => follower.id)).toEqual(["grave-scribe"]);
    expect(tvProjection.sessionMode).toBe("single-player");
    expect(tvProjection.escalationThreshold).toBe(8);
    expect(tvProjection.seats).toHaveLength(1);
    expect(tvProjection.players).toHaveLength(0);
  });

  it("lets character starting-loadout overrides replace solo mode defaults", () => {
    const base = createInitialSessionState("session-override", "single-player").players[0]!.character;
    const loaded = applyStartingLoadout(
      {
        ...base,
        salvage: 0,
        activeContract: null,
        heldGear: [],
        followers: [],
        startingSalvage: 7,
        startingGear: ["tuning-spines"],
        startingFollower: ["glassmere-mapper"],
        startingContract: "choir-hush-census"
      },
      {
        sessionMode: "single-player",
        seatIndex: 0,
        catalogs: {
          contracts: [...loadContracts().values()],
          gear: loadGear(),
          followers: loadFollowers()
        }
      }
    );

    expect(loaded.salvage).toBe(7);
    expect(loaded.activeContract).toEqual({ contractId: "choir-hush-census", progress: 0 });
    expect(loaded.heldGear.map((item) => item.id)).toEqual(["tuning-spines"]);
    expect(loaded.followers?.map((follower) => follower.id)).toEqual(["glassmere-mapper"]);
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
        finalGateRequirement?: string;
        scenarioRewards?: Array<{ id: string }>;
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
    expect(tvProjection.activeScenario?.theme).toContain("Ashen Reach Core");
    expect(tvProjection.activeScenario?.difficulty).toBe("easy-medium");
    expect(tvProjection.activeScenario?.pressureSummary).toContain("6 seals remain");
    expect(tvProjection.activeScenario?.finalGateRequirement).toContain("4+ Seal");
    expect(tvProjection.activeScenario?.scenarioRewards?.length).toBeGreaterThanOrEqual(4);
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

  it("adds private rivalry objectives only to phone projections", () => {
    const state = createInitialSessionState("session-rivalry");
    state.players[0] = {
      ...state.players[0]!,
      private: {
        ...state.players[0]!.private,
        notes: ["Watch salvage", "Delay the vote", "Claim credit", "Keep it quiet"]
      },
      character: {
        ...state.players[0]!.character,
        trophies: 2
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      privateRivalry: {
        active: boolean;
        mode: string;
        secrecy: string;
        tableWarning: string;
        objective: {
          id: string;
          title: string;
          progressLabel: string;
          progress: number;
          target: number;
        };
        recentPrivateNotes: string[];
        reveal: { available: boolean; hint: string };
      } | null;
    };
    const tvProjection = createTvProjection(state) as Record<string, unknown>;
    const tvJson = JSON.stringify(tvProjection);

    expect(phoneProjection.privateRivalry).toMatchObject({
      active: true,
      mode: "rivalry",
      secrecy: "private",
      objective: {
        id: "claim-trophies",
        title: "Claim the Black Ledger",
        progressLabel: "Trophies held",
        progress: 2,
        target: 3
      },
      reveal: {
        available: false,
        hint: "Hidden-agenda reveal moments are not wired yet."
      }
    });
    expect(phoneProjection.privateRivalry?.tableWarning).toContain("only on this phone");
    expect(phoneProjection.privateRivalry?.recentPrivateNotes).toEqual(["Keep it quiet", "Claim credit", "Delay the vote"]);
    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvJson).not.toContain("Claim the Black Ledger");
    expect(tvJson).not.toContain("Hidden-agenda reveal moments");
  });

  it("omits private rivalry objectives for co-op and single-player sessions", () => {
    const coOpState = createInitialSessionState("session-coop", "multiplayer", undefined, "co-op");
    const soloState = createInitialSessionState("session-solo", "single-player");
    const coOpPhoneProjection = createPhoneProjection(coOpState, "seat-1") as { privateRivalry: unknown };
    const soloPhoneProjection = createPhoneProjection(soloState, "seat-1") as { privateRivalry: unknown };

    expect(coOpPhoneProjection.privateRivalry).toBeNull();
    expect(soloPhoneProjection.privateRivalry).toBeNull();
  });

  it("builds public movement planner intel from legal sectors without leaking hidden deck cards", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const tvProjection = createTvProjection(state) as {
      movementPlanner: {
        movementValue: number;
        currentSectorName: string;
        destinations: Array<{
          sectorId: string;
          name: string;
          route: string[];
          faceUpThreats: Array<{ name: string }>;
        }>;
      } | null;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        movementValue: number;
        currentSectorName: string;
        destinations: Array<{
          sectorId: string;
          name: string;
          ring: string;
          route: string[];
          threatIcons: string[];
          tags: string[];
          shop?: { status: string; servicesPreview: string[] };
          strategicTags: string[];
          faceUpThreats: Array<{ name: string }>;
        }>;
      } | null;
    };

    expect(phoneProjection.movementPlanner?.movementValue).toBe(1);
    expect(phoneProjection.movementPlanner?.currentSectorName).toBe("Pilgrim Lock Gate");
    expect(tvProjection.movementPlanner?.movementValue).toBe(phoneProjection.movementPlanner?.movementValue);
    expect(tvProjection.movementPlanner?.currentSectorName).toBe(phoneProjection.movementPlanner?.currentSectorName);
    expect(tvProjection.movementPlanner?.destinations.map((destination) => destination.sectorId).sort()).toEqual(
      phoneProjection.movementPlanner?.destinations.map((destination) => destination.sectorId).sort()
    );

    const anchorMarket = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "outer_waymarket");
    const tvAnchorMarket = tvProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "outer_waymarket");
    const bridge = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "ashwake-crossing");

    expect(anchorMarket).toMatchObject({
      name: "Anchor Market",
      ring: "outer",
      route: ["outer_ember_sanctum", "outer_waymarket"],
      shop: { status: "open" }
    });
    expect(anchorMarket?.shop?.servicesPreview).toContain("Buy Gear");
    expect(anchorMarket?.strategicTags).toContain("shop");
    expect(tvAnchorMarket?.route).toEqual(anchorMarket?.route);
    expect(bridge?.threatIcons).toEqual(["yellow"]);
    expect(bridge?.faceUpThreats).toEqual([]);
    expect(JSON.stringify(phoneProjection.movementPlanner)).not.toContain("scrap-toll-gangers");
    expect(JSON.stringify(tvProjection.movementPlanner)).not.toContain("scrap-toll-gangers");
  });

  it("omits the TV movement planner outside active movement", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "action";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };

    const tvProjection = createTvProjection(state) as {
      movementPlanner: unknown;
    };

    expect(tvProjection.movementPlanner).toBeNull();
  });

  it("builds exact rolled-distance movement routes from the authoritative graph", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 2 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        movementValue: number;
        destinations: Array<{ sectorId: string; distance: number; route: string[] }>;
      } | null;
    };
    const tvProjection = createTvProjection(state) as {
      movementPlanner: {
        movementValue: number;
        destinations: Array<{ sectorId: string; distance: number; route: string[] }>;
      } | null;
    };

    const cinderFields = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "cinder-fields");

    expect(phoneProjection.movementPlanner?.movementValue).toBe(2);
    expect(cinderFields).toMatchObject({
      distance: 2,
      route: ["outer_ember_sanctum", "glassmere-spindle", "cinder-fields"]
    });
    expect(phoneProjection.movementPlanner?.destinations.every((destination) => destination.distance === 2)).toBe(true);
    expect(phoneProjection.movementPlanner?.destinations.some((destination) => destination.sectorId === "outer_waymarket")).toBe(false);
    expect(tvProjection.movementPlanner?.destinations).toEqual(phoneProjection.movementPlanner?.destinations);
  });

  it("builds exact three-step movement routes without teleporting", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 3 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        movementValue: number;
        destinations: Array<{ sectorId: string; distance: number; route: string[] }>;
      } | null;
    };
    const emberwatch = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "emberwatch-step");

    expect(phoneProjection.movementPlanner?.movementValue).toBe(3);
    expect(emberwatch).toMatchObject({
      distance: 3,
      route: ["outer_ember_sanctum", "glassmere-spindle", "cinder-fields", "emberwatch-step"]
    });
    expect(phoneProjection.movementPlanner?.destinations.every((destination) => destination.route.length === 4)).toBe(true);
    expect(phoneProjection.movementPlanner?.destinations.some((destination) => destination.route.includes("missing-sector"))).toBe(false);
  });

  it("allows reducer movement only to destinations in the rolled-distance planner", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 2 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const legal = reduceGameState(state, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "cinder-fields",
      createdAt: "2026-06-30T00:00:00.000Z"
    });
    const illegal = reduceGameState(state, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "outer_waymarket",
      createdAt: "2026-06-30T00:00:00.000Z"
    });

    expect(legal.ok).toBe(true);
    expect(illegal.ok).toBe(false);
    expect(illegal.ok ? null : illegal.rejection.reason).toContain("current movement value");
  });

  it("marks gated movement destinations with disabled reasons", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "middle_guardian_span",
      private: {
        ...state.players[0]!.private,
        notes: []
      },
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "middle_guardian_span"
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        destinations: Array<{ sectorId: string; disabledReason?: string; strategicTags: string[] }>;
      } | null;
    };
    const innerGate = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "inner_veil_rift");

    expect(innerGate?.disabledReason).toBe("Resolve Guardian Span before entering the inner breach");
    expect(innerGate?.strategicTags).toContain("gate");
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
      scenario_broken_seal: ["Seal Tokens", "Turn Pressure", "Collapses", "Restoration"],
      scenario_throne_of_ash: ["Crown Claims", "Crown Holders", "Active Crowns"],
      scenario_mirror_of_false_heroes: ["Mirror Breaks", "Heat Proxy", "Reflection Feed"],
      scenario_devourer_beneath: ["Doom Tokens", "Devourer", "Collapse Pulse"],
      scenario_labyrinth_engine: ["Engine Mode", "Rotation", "Shutdown"],
      scenario_dying_star: ["Starfire", "Wound Burn", "Ignition"]
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
