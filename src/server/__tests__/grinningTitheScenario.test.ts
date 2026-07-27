import { describe, expect, it, vi } from "vitest";
import {
  GRINNING_TITHE_MINION_IDS,
  getScenarioDefinition,
  isScenarioEligibleForSession
} from "../../game/data/scenarios.js";
import { getScenarioSheetArtPath } from "../../game/data/scenarioSheetArt.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { buildScenarioPressureState } from "../../game/rules/scenarioPressure.js";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { buildSharedMissionPresentation } from "../../client/shared/objectivePresentation.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

const cooperativeHazard: ThreatCard = {
  id: "grinning-tithe-cooperative-hazard",
  type: "threat",
  cardType: "hazard",
  title: "Tithe-Lock Static",
  text: "The collector's signal clamps shut around the tribute road.",
  flavor: "The lock counts every hand that reaches for it.",
  severity: 1,
  stat: "signal",
  difficulty: 10,
  successEffect: { type: "legacy_compatibility_noop" },
  failEffect: { type: "legacy_compatibility_noop" }
};

function activeHuntState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("grinning-tithe-test", "single-player", "scenario_grinning_tithe");
  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1"],
    seats: base.seats.map((seat, index) => ({
      ...seat,
      displayName: index === 0 ? "Hunter" : null,
      connected: index === 0
    })),
    players: base.players.map((player) => ({
      ...player,
      sectorId: "center_cinder_gate",
      character: {
        ...player.character,
        currentSpaceId: "center_cinder_gate"
      }
    })),
    ...overrides
  };
}

function activeCooperativeEncounterState(encounter: ThreatCard): GameState {
  const base = createInitialSessionState(
    "grinning-tithe-coop-test",
    "multiplayer",
    "scenario_grinning_tithe",
    "co-op",
    "standard",
    3
  );
  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    seats: base.seats.map((seat, index) => ({
      ...seat,
      displayName: `Hunter ${index + 1}`,
      connected: true,
      characterSelected: true
    })),
    currentEncounter: encounter,
    activeResolution: {
      id: `grinning-tithe-assist:${encounter.id}`,
      playerId: "seat-1",
      source: "threat",
      stage: "battle_setup",
      card: { id: encounter.id, title: encounter.title, type: encounter.cardType },
      battle: {
        ...(encounter.cardType === "enemy" ? { enemyName: encounter.enemyName } : {}),
        stat: encounter.stat,
        difficulty: encounter.difficulty,
        modifiers: []
      }
    }
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

describe("The Grinning Tithe", () => {
  it("is an original solo/co-op boss hunt with a mapped scenario image and three scenario-owned minions", () => {
    const scenario = getScenarioDefinition("scenario_grinning_tithe");
    expect(scenario).toMatchObject({
      name: "The Grinning Tithe",
      mode: "coop",
      supportedPlayerCounts: { min: 1, max: 6 },
      supportedModes: ["solo", "co-op"],
      lossPressureEnabled: false,
      finalGateRequirement: expect.stringContaining("No token"),
      winConditionKey: "curatorWounds",
      victoryThreshold: 6,
      nemesis: "The Pallid Curator"
    });
    expect(scenario?.threatLaneOverrides?.red).toEqual([...GRINNING_TITHE_MINION_IDS]);
    expect(getScenarioSheetArtPath("scenario_grinning_tithe")).toBe("/assets/scenarios/grinning-tithe.png");

    expect(isScenarioEligibleForSession(scenario!, "single-player", "co-op", "standard", 1)).toBe(true);
    expect(isScenarioEligibleForSession(scenario!, "multiplayer", "co-op", "standard", 6)).toBe(true);
    expect(isScenarioEligibleForSession(scenario!, "multiplayer", "rivalry", "standard", 2)).toBe(false);
    expect(isScenarioEligibleForSession(scenario!, "multiplayer", "co-op", "nemesis_relay", 2)).toBe(false);
  });

  it("offers optional assistance for Grinning Tithe hazards and Pallid Retinue enemies in co-op only", () => {
    const minion = loadThreatCards().get(GRINNING_TITHE_MINION_IDS[0]);
    if (!minion || minion.cardType !== "enemy") throw new Error("Expected a Pallid Retinue enemy fixture");

    for (const encounter of [cooperativeHazard, minion]) {
      const cooperativeState = activeCooperativeEncounterState(encounter);
      const phone = createPhoneProjection(cooperativeState, "seat-1") as ReturnType<typeof createPhoneProjection> & {
        cooperativeAssistanceEligibility?: {
          sourceId: string;
          testedStat: string;
          helpers: Array<{ seatId: string }>;
        } | null;
      };

      expect(phone.cooperativeAssistanceEligibility).toMatchObject({
        sourceId: encounter.id,
        testedStat: encounter.stat
      });
      expect(phone.cooperativeAssistanceEligibility?.helpers.map((helper) => helper.seatId)).toEqual([
        "seat-2",
        "seat-3"
      ]);

      const server = new GameRoomServer(cooperativeState);
      server.handleIntent(createPhoneClient("seat-1") as never, {
        type: "COOPERATIVE_ASSISTANCE_REQUESTED",
        seatId: "seat-1",
        sourceId: encounter.id,
        stat: encounter.stat,
        helperSeatIds: ["seat-2"]
      });
      expect(server.getState().cooperativeAssistance).toMatchObject({
        activeSeatId: "seat-1",
        requestedSeatIds: ["seat-2"],
        sourceId: encounter.id
      });
    }

    const soloState = activeHuntState({
      currentEncounter: cooperativeHazard,
      activeResolution: {
        id: "grinning-tithe-solo-hazard",
        playerId: "seat-1",
        source: "threat",
        stage: "battle_setup",
        card: {
          id: cooperativeHazard.id,
          title: cooperativeHazard.title,
          type: cooperativeHazard.cardType
        },
        battle: {
          stat: cooperativeHazard.stat,
          difficulty: cooperativeHazard.difficulty,
          modifiers: []
        }
      }
    });
    const soloPhone = createPhoneProjection(soloState, "seat-1") as ReturnType<typeof createPhoneProjection> & {
      cooperativeAssistanceEligibility?: unknown;
    };
    expect(soloPhone.cooperativeAssistanceEligibility).toBeNull();
  });

  it("suppresses round, card, and wound pressure without creating a defeat threshold", () => {
    const server = new GameRoomServer(
      activeHuntState(),
      [],
      createSequenceRandomSource([5, 5, 5, 5])
    );
    const internals = server as unknown as {
      applyRoundEscalation(seatId: string): void;
      feedEscalation(seatId: string, delta: number, reason: string): void;
    };

    internals.applyRoundEscalation("seat-1");
    internals.feedEscalation("seat-1", 2, "scenario test");

    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().status).toBe("active");
    expect(
      server.getState().eventLog.some((event) => (event as { type?: string }).type === "SECTOR_COLLAPSED")
    ).toBe(false);

    const pressure = buildScenarioPressureState(server.getState(), "No loss pressure.");
    expect(pressure?.collapseTrack).toMatchObject({
      name: "No Loss Pressure",
      current: 0,
      failureAtMax: false,
      difficultyBonus: 0
    });

    const tv = createTvProjection(server.getState()) as ReturnType<typeof createTvProjection> & {
      matchProgress?: { lossPressure: unknown };
    };
    expect(tv.matchProgress?.lossPressure).toBeNull();

    const phone = createPhoneProjection(server.getState(), "seat-1", true);
    expect(buildSharedMissionPresentation(phone as never)?.lossPressure).toBeNull();
  });

  it("keeps boss wounds shared across attempts and wins only when the sixth wound lands", () => {
    const server = new GameRoomServer(
      activeHuntState({
        scenarioProgress: { curatorWounds: 4 }
      }),
      [],
      createSequenceRandomSource([5, 5, 5, 5])
    );

    server.handleIntent(createPhoneClient("seat-1") as never, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    } satisfies ClientIntent);

    expect(server.getState().scenarioProgress.curatorWounds).toBe(6);
    expect(server.getState().status).toBe("ended");
    expect(server.getState().scenarioResult).toMatchObject({
      status: "victory",
      winningSeatId: "seat-1"
    });
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Pallid Curator");
  });
});
