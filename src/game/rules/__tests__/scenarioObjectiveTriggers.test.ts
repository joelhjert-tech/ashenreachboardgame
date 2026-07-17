import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { resolveScenarioObjectiveTrigger } from "../scenarioObjectiveTriggers.js";

describe("scenario objective triggers", () => {
  it("advances objective progress from matching contract, threat, and sector-action triggers", () => {
    const brokenSeal = createInitialSessionState("scenario-objective-contract", "single-player", "scenario_broken_seal");
    brokenSeal.status = "active";
    const contractResult = resolveScenarioObjectiveTrigger(brokenSeal, {
      type: "contractCompleted",
      contractId: "cartel-crossing-thread"
    });
    const blueThreatResult = resolveScenarioObjectiveTrigger(brokenSeal, {
      type: "threatDefeated",
      threatId: "bell-mask-pilgrim",
      threatLane: "blue",
      enemyFamily: "choir"
    });
    const labyrinth = createInitialSessionState("scenario-objective-sector", "multiplayer", "scenario_labyrinth_engine", "co-op");
    labyrinth.status = "active";
    const sectorResult = resolveScenarioObjectiveTrigger(labyrinth, {
      type: "sectorActionCompleted",
      effectKey: "middle_guardianSpanThreshold",
      sectorId: "middle_guardian_span"
    });

    expect(contractResult).toMatchObject({
      scenarioId: "scenario_broken_seal",
      progressKey: "sealRestorationMarks",
      amount: 1,
      next: 1,
      triggerType: "contractCompleted"
    });
    expect(blueThreatResult).toMatchObject({
      scenarioId: "scenario_broken_seal",
      progressKey: "sealRestorationMarks",
      amount: 1,
      next: 1,
      triggerType: "threatDefeated"
    });
    expect(sectorResult).toMatchObject({
      scenarioId: "scenario_labyrinth_engine",
      progressKey: "shutdownMarks",
      amount: 1,
      next: 1,
      triggerType: "sectorActionCompleted"
    });
  });

  it("ignores non-matching trigger filters", () => {
    const state = createInitialSessionState("scenario-objective-miss", "single-player", "scenario_broken_seal");
    state.status = "active";

    expect(
      resolveScenarioObjectiveTrigger(state, {
        type: "threatDefeated",
        threatId: "ash-lane-cutters",
        threatLane: "red",
        enemyFamily: "human"
      })
    ).toBeNull();
    expect(
      resolveScenarioObjectiveTrigger(state, {
        type: "sectorActionCompleted",
        effectKey: "outer_mirecoilTraffic",
        sectorId: "outer_mirecoil"
      })
    ).toBeNull();
  });

  it("uses trigger amount, clamps at required progress, and reports completion", () => {
    const state = createInitialSessionState("scenario-objective-clamp", "single-player", "scenario_broken_seal");
    state.status = "active";
    state.scenarioProgress = {
      ...state.scenarioProgress,
      sealRestorationMarks: 1
    };

    const result = resolveScenarioObjectiveTrigger(state, {
      type: "contractCompleted",
      contractId: "choir-hush-census"
    });

    expect(result).toMatchObject({
      amount: 1,
      previous: 1,
      next: 2,
      required: 2,
      completed: true
    });

    state.scenarioProgress.sealRestorationMarks = 2;
    expect(
      resolveScenarioObjectiveTrigger(state, {
        type: "contractCompleted",
        contractId: "choir-hush-census"
      })
    ).toBeNull();
  });

  it("works for single, co-op, and rivalry public objective progress", () => {
    const single = createInitialSessionState("scenario-objective-single", "single-player", "scenario_broken_seal");
    const coop = createInitialSessionState("scenario-objective-coop", "multiplayer", "scenario_broken_seal", "co-op");
    const rivalry = createInitialSessionState("scenario-objective-rivalry", "multiplayer", "scenario_devourer_beneath", "rivalry");

    for (const state of [single, coop, rivalry]) {
      state.status = "active";
    }

    expect(resolveScenarioObjectiveTrigger(single, { type: "contractCompleted", contractId: "compact-ember-courier" })).toMatchObject({
      progressKey: "sealRestorationMarks"
    });
    expect(resolveScenarioObjectiveTrigger(coop, { type: "contractCompleted", contractId: "compact-ember-courier" })).toMatchObject({
      progressKey: "sealRestorationMarks"
    });
    expect(
      resolveScenarioObjectiveTrigger(rivalry, {
        type: "threatDefeated",
        threatId: "red-march-cannoneer",
        threatLane: "red",
        enemyFamily: "human"
      })
    ).toMatchObject({
      progressKey: "mawStrikes"
    });
  });
});
