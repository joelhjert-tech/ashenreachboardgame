import { describe, expect, it } from "vitest";
import type { GameState } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { buildScenarioPressureState } from "../scenarioPressure.js";

function createScenarioState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("scenario-pressure-test");

  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    seats: base.seats.map((seat, index) => ({
      ...seat,
      displayName: `Seat ${index + 1}`,
      connected: true
    })),
    ...overrides
  };
}

describe("scenario pressure foundation", () => {
  it("normalizes single-player scenario pressure without private agenda state", () => {
    const state = createInitialSessionState("scenario-pressure-solo", "single-player", "scenario_broken_seal");
    const pressure = buildScenarioPressureState(state, "Solo ward pressure");

    expect(pressure).toMatchObject({
      scenarioId: "scenario_broken_seal",
      mode: "single",
      scenarioStatus: "active",
      pressureTrack: {
        name: "Seal Integrity",
        current: 8,
        max: 8,
        failureAtMax: false
      },
      collapseTrack: {
        name: "Escalation",
        current: 0,
        max: 8,
        failureAtMax: true
      },
      objectiveProgress: {
        label: "Seal Restoration Marks",
        current: 0,
        required: 2,
        completed: false
      },
      modeSpecific: {
        kind: "single",
        privateAgenda: "none"
      }
    });
  });

  it("normalizes co-op pressure as shared public state", () => {
    const state = createInitialSessionState("scenario-pressure-coop", "multiplayer", "scenario_devourer_beneath", "co-op");
    const pressure = buildScenarioPressureState(state, "Doom is shared");

    expect(pressure).toMatchObject({
      scenarioId: "scenario_devourer_beneath",
      mode: "co-op",
      pressureTrack: {
        name: "Doom",
        current: 0,
        max: 8
      },
      objectiveProgress: {
        label: "Maw Strikes",
        current: 0,
        required: 1
      },
      modeSpecific: {
        kind: "co-op",
        privateAgenda: "none"
      }
    });
  });

  it("normalizes rivalry pressure as public while marking private agenda phone-only", () => {
    const state = createInitialSessionState("scenario-pressure-rivalry", "multiplayer", "scenario_devourer_beneath", "rivalry");
    state.scenarioProgress = {
      ...state.scenarioProgress,
      doomTokens: 4,
      mawStrikes: 1
    };
    const pressure = buildScenarioPressureState(state, "Doom rises");

    expect(pressure).toMatchObject({
      scenarioId: "scenario_devourer_beneath",
      mode: "rivalry",
      pressureTrack: {
        name: "Doom",
        current: 4,
        max: 8
      },
      objectiveProgress: {
        label: "Maw Strikes",
        current: 1,
        required: 1,
        completed: true
      },
      modeSpecific: {
        kind: "rivalry",
        privateAgenda: "phone-only"
      }
    });
  });

  it("derives completed and failed scenario status from ended sessions", () => {
    const completed = createScenarioState({
      status: "ended",
      winnerSeatId: "seat-1",
      scenarioProgress: { sealRestorationMarks: 2, sealTokens: 4 }
    });
    const failed = createScenarioState({
      status: "ended",
      winnerSeatId: null,
      escalationLevel: 6,
      scenarioProgress: { sealTokens: 1 }
    });

    expect(buildScenarioPressureState(completed, "Scenario completed")?.scenarioStatus).toBe("completed");
    expect(buildScenarioPressureState(completed, "Scenario completed")?.objectiveProgress.completed).toBe(true);
    expect(buildScenarioPressureState(failed, "Scenario failed")?.scenarioStatus).toBe("failed");
    expect(buildScenarioPressureState(failed, "Scenario failed")?.collapseTrack).toMatchObject({
      current: 6,
      max: 6,
      failureAtMax: true
    });
  });

  it("clamps public pressure values at their authored maximums", () => {
    const state = createInitialSessionState("scenario-pressure-clamp", "multiplayer", "scenario_devourer_beneath", "co-op");
    state.scenarioProgress = {
      ...state.scenarioProgress,
      doomTokens: 99
    };
    state.escalationLevel = 99;
    const pressure = buildScenarioPressureState(state, "Doom is capped");

    expect(pressure?.pressureTrack.current).toBe(8);
    expect(pressure?.collapseTrack.current).toBe(6);
  });
});
