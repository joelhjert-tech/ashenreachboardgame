import { describe, expect, it } from "vitest";
import { reduceGameState } from "../reducer.js";
import type { GameState } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

function createArrivalState(): GameState {
  const state = createInitialSessionState("threat-arrival-outcomes", "single-player");
  state.status = "active";
  state.phase = "resolution";
  state.tileArrivalThreatProgress = {
    arrivalId: "arrival:multi",
    seatId: "seat-1",
    sectorId: "middle_guardian_span",
    threatLanes: ["red", "blue", "yellow"],
    threatRuleIds: ["threat:0:red", "threat:1:blue", "threat:2:yellow"],
    nextThreatIconIndex: 3,
    resolvedThreatOutcomes: [],
    allThreatsSuccessful: null
  };
  return state;
}

describe("authoritative Threat arrival outcomes", () => {
  it.each([
    { label: "first-card failure", outcomes: [false, true, true] },
    { label: "middle-card failure", outcomes: [true, false, true] },
    { label: "final-card failure", outcomes: [true, true, false] }
  ])("keeps services locked after $label", ({ outcomes }) => {
    let state = createArrivalState();
    outcomes.forEach((success, index) => {
      state = reduceGameState(state, {
        type: "THREAT_ARRIVAL_OUTCOME_RECORDED",
        seatId: "seat-1",
        arrivalId: "arrival:multi",
        ruleId: state.tileArrivalThreatProgress!.threatRuleIds![index]!,
        lane: state.tileArrivalThreatProgress!.threatLanes![index]!,
        cardId: `card-${index}`,
        success,
        queueComplete: index === outcomes.length - 1,
        createdAt: `2026-07-26T12:00:0${index}.000Z`
      }).state;
    });
    expect(state.tileArrivalThreatProgress?.allThreatsSuccessful).toBe(false);
    expect(state.tileArrivalThreatProgress?.resolvedThreatOutcomes).toHaveLength(3);
  });

  it("unlocks only after the final successful Threat and records a reroll-converted success as success", () => {
    let state = createArrivalState();
    [0, 1, 2].forEach((index) => {
      state = reduceGameState(state, {
        type: "THREAT_ARRIVAL_OUTCOME_RECORDED",
        seatId: "seat-1",
        arrivalId: "arrival:multi",
        ruleId: state.tileArrivalThreatProgress!.threatRuleIds![index]!,
        lane: state.tileArrivalThreatProgress!.threatLanes![index]!,
        cardId: `card-${index}`,
        // The action contains the final server result after all rerolls and
        // reactions, not the superseded initial roll.
        success: true,
        queueComplete: index === 2,
        createdAt: `2026-07-26T12:01:0${index}.000Z`
      }).state;
      expect(state.tileArrivalThreatProgress?.allThreatsSuccessful).toBe(index === 2 ? true : null);
    });
  });

  it("does not duplicate an arrival result after reconnect replay", () => {
    const initial = createArrivalState();
    const action = {
      type: "THREAT_ARRIVAL_OUTCOME_RECORDED" as const,
      seatId: "seat-1",
      arrivalId: "arrival:multi",
      ruleId: "threat:0:red",
      lane: "red" as const,
      cardId: "card-0",
      success: true,
      queueComplete: false,
      createdAt: "2026-07-26T12:02:00.000Z"
    };
    const once = reduceGameState(initial, action).state;
    const replayed = reduceGameState(once, action).state;
    expect(replayed.tileArrivalThreatProgress?.resolvedThreatOutcomes).toHaveLength(1);
    expect(replayed.sequence).toBe(once.sequence);
  });
});
