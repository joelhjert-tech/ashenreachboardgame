import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import {
  buildInnerApproachMoveOptions,
  getInnerApproachProgress
} from "../../rules/innerApproach.js";
import { buildMovementRoutePlan, buildTierTransitionOptions } from "../../rules/movementPlanner.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

function innerState(
  sectorId = "inner_veil_rift",
  pathId: "breach-road" | "choir-road" = "breach-road",
  clearedSectorIds: string[] = []
): GameState {
  const state = createInitialSessionState("inner-approach-test", "single-player");
  state.status = "active";
  state.phase = "navigation";
  state.turnOrder = ["seat-1"];
  state.activeSeatIndex = 0;
  state.movementRouteRevisions = { "seat-1": 7 };
  state.players[0] = {
    ...state.players[0]!,
    sectorId,
    character: {
      ...state.players[0]!.character,
      currentSpaceId: sectorId,
      status: "active"
    },
    innerApproachProgress: { pathId, clearedSectorIds }
  };
  return state;
}

function moveInner(state: GameState, destinationSectorId: string) {
  const option = buildInnerApproachMoveOptions(state, "seat-1")
    .find((entry) => entry.sectorId === destinationSectorId);
  if (!option) throw new Error(`Missing inner approach option ${destinationSectorId}`);
  return reduceGameState(state, {
    type: "INNER_APPROACH_MOVED",
    seatId: "seat-1",
    fromSectorId: state.players[0]!.character.currentSpaceId,
    toSectorId: destinationSectorId,
    direction: option.direction,
    pathId: state.players[0]!.innerApproachProgress!.pathId!,
    movementRevision: state.movementRouteRevisions?.["seat-1"] ?? 0,
    createdAt: "2026-07-27T15:00:00.000Z"
  });
}

describe("authoritative inner approach", () => {
  it("blocks advancement until the current fixed challenge succeeds", () => {
    const state = innerState();
    expect(buildInnerApproachMoveOptions(state, "seat-1")[0]).toMatchObject({
      sectorId: "inner_tomb_gate",
      direction: "advance",
      disabledReason: "Clear Melted Gate before advancing"
    });
    expect(moveInner(state, "inner_tomb_gate").ok).toBe(false);

    state.phase = "action";
    const cleared = reduceGameState(state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      sectorId: "inner_veil_rift",
      effectKey: "inner_veilRiftEntry",
      summary: "The Melted Gate yielded.",
      checkStat: "signal",
      difficulty: 10,
      roll: { faces: [6, 6], total: 12 },
      statBonus: 2,
      total: 14,
      success: true,
      effect: null,
      createdAt: "2026-07-27T15:01:00.000Z"
    });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(getInnerApproachProgress(cleared.state, cleared.state.players[0]!).clearedSectorIds)
      .toContain("inner_veil_rift");

    const ready = {
      ...cleared.state,
      phase: "navigation" as const,
      activeResolution: null,
      lastOutcomeSummary: null
    };
    expect(buildInnerApproachMoveOptions(ready, "seat-1")[0]).toMatchObject({
      sectorId: "inner_tomb_gate",
      disabledReason: null
    });
    const moved = moveInner(ready, "inner_tomb_gate");
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.state.players[0]!.character.currentSpaceId).toBe("inner_tomb_gate");
    expect(moved.state.phase).toBe("sector");
    expect(moved.state.movementRolls?.["seat-1"]).toBeUndefined();
    expect(moved.state.tileArrivalThreatProgress).toMatchObject({
      seatId: "seat-1",
      sectorId: "inner_tomb_gate",
      nextThreatIconIndex: 0
    });
    expect(moved.emitted).toEqual([
      expect.objectContaining({
        type: "MOVED",
        fromSectorId: "inner_veil_rift",
        toSectorId: "inner_tomb_gate"
      })
    ]);
  });

  it("does not persist a failed clear and permits a controlled retreat", () => {
    const failed = innerState("inner_tomb_gate", "breach-road", ["inner_veil_rift"]);
    failed.phase = "action";
    const result = reduceGameState(failed, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      sectorId: "inner_tomb_gate",
      effectKey: "inner_tombGateTrial",
      summary: "The route rejected the operative.",
      checkStat: "command",
      difficulty: 10,
      roll: { faces: [1, 1], total: 2 },
      statBonus: 1,
      total: 3,
      success: false,
      effect: null,
      createdAt: "2026-07-27T15:02:00.000Z"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getInnerApproachProgress(result.state, result.state.players[0]!).clearedSectorIds)
      .not.toContain("inner_tomb_gate");

    const nextTurn = {
      ...result.state,
      phase: "navigation" as const,
      activeResolution: null,
      lastOutcomeSummary: null
    };
    expect(buildInnerApproachMoveOptions(nextTurn, "seat-1")).toEqual([
      expect.objectContaining({ sectorId: "inner_blackstar_shortcut", disabledReason: expect.any(String) }),
      expect.objectContaining({ sectorId: "inner_veil_rift", direction: "retreat", disabledReason: null })
    ]);
    expect(moveInner(nextTurn, "inner_veil_rift").ok).toBe(true);
  });

  it("converges both roads and allows the center only after clearing the real gate", () => {
    const breach = innerState("inner_blackstar_shortcut", "breach-road", ["inner_blackstar_shortcut"]);
    expect(buildInnerApproachMoveOptions(breach, "seat-1")[0]?.sectorId).toBe("the-bone-meridian");

    const choir = innerState("inner_choir_shrine", "choir-road", ["inner_choir_shrine"]);
    expect(buildInnerApproachMoveOptions(choir, "seat-1")[0]?.sectorId).toBe("the-bone-meridian");

    const lockedGate = innerState("inner_gate_of_cinders", "choir-road", []);
    expect(buildInnerApproachMoveOptions(lockedGate, "seat-1")[0]).toMatchObject({
      sectorId: "center_cinder_gate",
      disabledReason: "Clear Gate of Cinders before advancing"
    });
    lockedGate.players[0]!.innerApproachProgress!.clearedSectorIds.push("inner_gate_of_cinders");
    const entered = moveInner(lockedGate, "center_cinder_gate");
    expect(entered.ok).toBe(true);
    if (!entered.ok) return;
    expect(entered.state.players[0]!.character.currentSpaceId).toBe("center_cinder_gate");
  });

  it("disables dice, route aids, Void Key bypasses, and generic tier crossing inside the approach", () => {
    const state = innerState("the-bone-meridian", "breach-road", ["the-bone-meridian"]);
    state.movementRolls = { "seat-1": 6 };
    expect(buildMovementRoutePlan(state, "seat-1")).toBeNull();
    expect(buildTierTransitionOptions(state, "seat-1")).toEqual([]);
  });

  it("restores legacy successful challenge events without replaying a clear", () => {
    const state = innerState("the-bone-meridian", "breach-road", []);
    state.players[0]!.innerApproachProgress = undefined;
    state.eventLog.push({
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      sectorId: "the-bone-meridian",
      effectKey: "inner_tombGateTrial",
      success: true,
      createdAt: "2026-07-20T10:00:00.000Z"
    });
    const restored = getInnerApproachProgress(state, state.players[0]!);
    expect(restored.clearedSectorIds).toContain("the-bone-meridian");
    expect(restored.pathId).toBe("breach-road");
  });

  it("prefers persisted operative progress over legacy events after a replacement reset", () => {
    const state = innerState("inner_veil_rift", "breach-road", []);
    state.eventLog.push({
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      sectorId: "inner_veil_rift",
      effectKey: "inner_veilRiftEntry",
      success: true,
      createdAt: "2026-07-20T10:00:00.000Z"
    });
    state.players[0]!.innerApproachProgress = {
      pathId: null,
      clearedSectorIds: []
    };

    expect(getInnerApproachProgress(state, state.players[0]!)).toEqual({
      pathId: "breach-road",
      clearedSectorIds: []
    });
  });
});
