import { describe, expect, it } from "vitest";
import { getScenarioDefinition, isScenarioEligibleForSession } from "../../data/scenarios.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import {
  getEligibleCooperativeHelperSeatIds,
  getIntrinsicBaseStat,
  lockCooperativeContributions,
  MAX_COOPERATIVE_HELPERS
} from "../cooperativeAssistance.js";
import { BROKEN_CONCORDANCE_NODES, BROKEN_CONCORDANCE_SCENARIO_ID, BROKEN_CONCORDANCE_STAGES } from "../brokenConcordance.js";
import { getBoardSpace } from "../../data/boardSpaces.js";

function createCoopState() {
  const state = createInitialSessionState("coop-assistance", "multiplayer", BROKEN_CONCORDANCE_SCENARIO_ID, "co-op", "standard", 3);
  return {
    ...state,
    status: "active" as const,
    seats: state.seats.map((seat, index) => ({
      ...seat,
      connected: true,
      kicked: false,
      characterSelected: true,
      displayName: `Player ${index + 1}`
    }))
  };
}

describe("cooperative assistance rules", () => {
  it("uses intrinsic base stats and excludes permanent Trophy advancement", () => {
    const state = createCoopState();
    const helper = state.players[1]!;
    helper.character.stats.signal = 6;
    helper.character.statUpgrades = { ...(helper.character.statUpgrades ?? {}), signal: 2 };

    expect(getIntrinsicBaseStat(helper, "signal")).toBe(4);
    expect(lockCooperativeContributions(state, [helper.seatId], "signal")).toEqual([{ seatId: helper.seatId, value: 4 }]);
  });

  it("offers only connected active cooperative teammates", () => {
    const state = createCoopState();
    state.players[2]!.character.status = "recalled";

    expect(getEligibleCooperativeHelperSeatIds(state, "seat-1", "signal")).toEqual(["seat-2"]);
    expect(MAX_COOPERATIVE_HELPERS).toBe(2);
    expect(getEligibleCooperativeHelperSeatIds({ ...state, interactionMode: "rivalry" }, "seat-1", "signal")).toEqual([]);
    expect(getEligibleCooperativeHelperSeatIds({ ...state, sessionMode: "single-player" }, "seat-1", "signal")).toEqual([]);
  });

  it("registers three valid unique nodes and three distinct confrontation stages", () => {
    expect(new Set(BROKEN_CONCORDANCE_NODES.map((node) => node.id)).size).toBe(3);
    expect(BROKEN_CONCORDANCE_NODES.every((node) => getBoardSpace(node.sectorId))).toBe(true);
    expect(new Set(BROKEN_CONCORDANCE_STAGES.map((stage) => stage.id)).size).toBe(3);
  });

  it("allows The Broken Concordance only for standard 2-6 player co-op", () => {
    const scenario = getScenarioDefinition(BROKEN_CONCORDANCE_SCENARIO_ID)!;
    expect(isScenarioEligibleForSession(scenario, "multiplayer", "co-op", "standard", 2)).toBe(true);
    expect(isScenarioEligibleForSession(scenario, "multiplayer", "co-op", "standard", 6)).toBe(true);
    expect(isScenarioEligibleForSession(scenario, "single-player", "co-op", "standard", 1)).toBe(false);
    expect(isScenarioEligibleForSession(scenario, "multiplayer", "rivalry", "standard", 3)).toBe(false);
    expect(isScenarioEligibleForSession(scenario, "multiplayer", "co-op", "nemesis_relay", 3)).toBe(false);
  });
});
