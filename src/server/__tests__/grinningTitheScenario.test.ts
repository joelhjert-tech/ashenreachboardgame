import { describe, expect, it, vi } from "vitest";
import {
  GRINNING_TITHE_MINION_IDS,
  getScenarioDefinition,
  isScenarioEligibleForSession
} from "../../game/data/scenarios.js";
import { getScenarioSheetArtPath } from "../../game/data/scenarioSheetArt.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import { buildScenarioPressureState } from "../../game/rules/scenarioPressure.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { buildSharedMissionPresentation } from "../../client/shared/objectivePresentation.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

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
