import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { reduceGameState } from "../reducer.js";
import type { GameAction } from "../actions.js";

function activeBrokenSealState() {
  const state = createInitialSessionState("scenario-ownership", "single-player", "scenario_broken_seal");
  return {
    ...state,
    status: "active" as const,
    phase: "action" as const,
    players: state.players.map((player) => ({
      ...player,
      sectorId: "center_cinder_gate",
      character: { ...player.character, currentSpaceId: "center_cinder_gate" }
    }))
  };
}

function apply(state: ReturnType<typeof activeBrokenSealState>, action: GameAction) {
  return reduceGameState(state, action).state;
}

describe("scenario state ownership", () => {
  it("keeps preparation resources separate and rejects duplicate source events", () => {
    const state = activeBrokenSealState();
    const action = {
      type: "SCENARIO_PREPARATION_GAINED",
      scenarioId: "scenario_broken_seal",
      seatId: "seat-1",
      resourceKey: "sealIntegrity",
      amount: 1,
      sourceEventId: "objective:blue-threat:1",
      objectiveId: "restore-blue-threat",
      summary: "The ward recovered one seal.",
      createdAt: "2026-07-14T00:00:00.000Z"
    } satisfies GameAction;

    const gained = apply(state, action);
    expect(gained.scenarioPreparation.resources.sealIntegrity).toBe(1);
    expect(gained.scenarioConfrontation.progress).toEqual({});
    expect(gained.scenarioResult.status).toBe("unresolved");

    const replay = reduceGameState(gained, action);
    expect(replay.ok).toBe(false);
    expect(replay.state.scenarioPreparation.resources.sealIntegrity).toBe(1);
  });

  it("spends preparation atomically and rejects insufficient or replayed spends", () => {
    const state = {
      ...activeBrokenSealState(),
      scenarioPreparation: {
        resources: { sealIntegrity: 2 },
        completedObjectiveIds: [],
        processedSourceEventIds: []
      }
    };
    const spend = {
      type: "SCENARIO_PREPARATION_SPENT",
      scenarioId: "scenario_broken_seal",
      seatId: "seat-1",
      resourceKey: "sealIntegrity",
      amount: 2,
      sourceEventId: "spend:seal:1",
      summary: "Two seals were committed.",
      createdAt: "2026-07-14T00:00:00.000Z"
    } satisfies GameAction;

    const spent = reduceGameState(state, spend);
    expect(spent.ok).toBe(true);
    expect(spent.state.scenarioPreparation.resources.sealIntegrity).toBe(0);
    expect(reduceGameState(spent.state, spend).ok).toBe(false);
    expect(reduceGameState({ ...state, scenarioPreparation: { ...state.scenarioPreparation, resources: { sealIntegrity: 1 } } }, spend).ok).toBe(false);
  });

  it("allows confrontation progress only inside the matching active confrontation", () => {
    const state = activeBrokenSealState();
    const progress = {
      type: "SCENARIO_CONFRONTATION_PROGRESS_GAINED",
      scenarioId: "scenario_broken_seal",
      seatId: "seat-1",
      confrontationId: "broken-seal:attempt:1",
      progressKey: "restorationMarks",
      amount: 1,
      sourceEventId: "broken-seal:attempt:1:resolution",
      stage: "resolved",
      summary: "One restoration mark was earned.",
      createdAt: "2026-07-14T00:00:00.000Z"
    } satisfies GameAction;

    expect(reduceGameState(state, progress).ok).toBe(false);

    const started = apply(state, {
      type: "SCENARIO_CONFRONTATION_STARTED",
      scenarioId: "scenario_broken_seal",
      seatId: "seat-1",
      confrontationId: "broken-seal:attempt:1",
      sourceEventId: "broken-seal:attempt:1:start",
      stage: "resolving",
      summary: "The final confrontation began.",
      createdAt: "2026-07-14T00:00:00.000Z"
    });
    const advanced = reduceGameState(started, progress);
    expect(advanced.ok).toBe(true);
    expect(advanced.state.scenarioConfrontation.progress.restorationMarks).toBe(1);
    expect(advanced.state.scenarioPreparation.resources).toEqual({});
    expect(advanced.state.scenarioConfrontation.active).toBe(false);
  });

  it("records victory ownership once from a resolved confrontation source", () => {
    const state = activeBrokenSealState();
    const resolvedSourceId = "broken-seal:attempt:1:resolution";
    const ready = {
      ...state,
      phase: "broadcast" as const,
      scenarioConfrontation: {
        active: false,
        confrontationId: "broken-seal:attempt:1",
        progress: { restorationMarks: 2 },
        stage: "resolved",
        processedSourceEventIds: [resolvedSourceId]
      }
    };
    const victory = {
      type: "SCENARIO_VICTORY_ACHIEVED",
      scenarioId: "scenario_broken_seal",
      seatId: "seat-1",
      victoryConditionId: "broken-seal:resealed",
      sourceType: "confrontation",
      sourceId: resolvedSourceId,
      shared: true,
      summary: "The Broken Seal was restored.",
      createdAt: "2026-07-14T00:00:00.000Z"
    } satisfies GameAction;

    const won = reduceGameState(ready, victory);
    expect(won.ok).toBe(true);
    expect(won.state.scenarioResult).toMatchObject({
      status: "victory",
      victoryConditionId: "broken-seal:resealed",
      sourceType: "confrontation",
      sourceId: resolvedSourceId,
      winningSeatId: "seat-1",
      shared: true
    });
    expect(reduceGameState(won.state, victory).ok).toBe(false);
  });

  it("projects preparation, confrontation, and result without replay identifiers", () => {
    const state = {
      ...activeBrokenSealState(),
      scenarioPreparation: {
        resources: { sealIntegrity: 4 },
        completedObjectiveIds: ["restore-blue-threat"],
        processedSourceEventIds: ["private-source-id"]
      },
      scenarioConfrontation: {
        active: false,
        confrontationId: null,
        progress: { restorationMarks: 1 },
        stage: "ready",
        processedSourceEventIds: ["private-confrontation-source"]
      }
    };

    const tv = createTvProjection(state) as { scenarioState: unknown };
    const phone = createPhoneProjection(state, "seat-1", true) as { scenarioState: unknown };
    expect(phone.scenarioState).toEqual(tv.scenarioState);
    expect(JSON.stringify(tv.scenarioState)).not.toContain("private-source-id");
    expect(tv.scenarioState).toMatchObject({
      preparation: { resources: { sealIntegrity: 4 } },
      confrontation: { progress: { restorationMarks: 1 }, locationSectorId: "center_cinder_gate", locked: false },
      result: { status: "unresolved" }
    });
  });
});
