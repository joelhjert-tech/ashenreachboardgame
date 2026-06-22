import { describe, expect, it } from "vitest";
import {
  createInitialScenarioProgress,
  resolveScenarioContractCompleted,
  resolveScenarioEnemyDefeat,
  resolveScenarioTurnEnd,
  resolveScenarioTurnStart
} from "../scenarioAmbient.js";
import type { GameState } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

function createScenarioState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("ambient-test");

  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1"],
    seats: base.seats.slice(0, 1).map((seat) => ({
      ...seat,
      displayName: "Solo",
      connected: true
    })),
    players: base.players.slice(0, 1),
    ...overrides
  };
}

function createContext(
  state: GameState,
  options: {
    seatId?: string;
    roll?: number;
    outerRingSectorIds?: string[];
  } = {}
) {
  return {
    state,
    seatId: options.seatId ?? "seat-1",
    rollDie: () => options.roll ?? 6,
    getCounter: (key: string, fallback = 0) => state.scenarioProgress[key] ?? fallback,
    getOuterRingSectorIds: () =>
      options.outerRingSectorIds ?? state.sectors.filter((sector) => sector.regionTier === "borderlight").map((sector) => sector.id)
  };
}

describe("scenario ambient rules", () => {
  it("seeds initial progress for each authored scenario", () => {
    expect(createInitialScenarioProgress("scenario_broken_seal")).toEqual({ sealTokens: 6 });
    expect(createInitialScenarioProgress("scenario_throne_of_ash")).toEqual({ crownClaims: 0 });
    expect(createInitialScenarioProgress("scenario_mirror_of_false_heroes")).toEqual({});
    expect(createInitialScenarioProgress("scenario_devourer_beneath")).toEqual({ doomTokens: 0, devourerIndex: 0 });
    expect(createInitialScenarioProgress("scenario_labyrinth_engine")).toEqual({ engineModeIndex: 0 });
    expect(createInitialScenarioProgress("scenario_dying_star")).toEqual({ starTokens: 10 });
  });

  it("applies Broken Seal turn-start pressure and ward restoration", () => {
    const state = createScenarioState({
      activeScenarioId: "scenario_broken_seal",
      scenarioProgress: { sealTokens: 6 }
    });

    const weakening = resolveScenarioTurnStart(createContext(state, { roll: 1 }));
    expect(weakening?.summary).toContain("5 seal tokens remain");
    const weakenedState = weakening?.updater(state) ?? state;
    expect(weakenedState.scenarioProgress.sealTokens).toBe(5);

    const surge = resolveScenarioTurnStart(createContext(state, { roll: 3 }));
    expect(surge?.summary).toContain("rouses a local threat");
    expect(surge?.followUp?.type).toBe("draw_sector_threat");
    const surgedState = surge?.updater(state) ?? state;
    expect(surgedState.players[0]?.character.heat).toBe(0);

    const restored = resolveScenarioEnemyDefeat(createContext(weakenedState));
    expect(restored?.summary).toContain("6 seal tokens now stand");
    const restoredState = restored?.updater(weakenedState) ?? weakenedState;
    expect(restoredState.scenarioProgress.sealTokens).toBe(6);
  });

  it("applies Throne of Ash claim gains from defeats and contracts", () => {
    const state = createScenarioState({
      activeScenarioId: "scenario_throne_of_ash",
      scenarioProgress: { crownClaims: 1, "crownClaim:seat-1": 1 }
    });

    const onDefeat = resolveScenarioEnemyDefeat(createContext(state));
    expect(onDefeat?.summary).toContain("2/3 claims");
    const afterDefeat = onDefeat?.updater(state) ?? state;
    expect(afterDefeat.scenarioProgress.crownClaims).toBe(2);
    expect(afterDefeat.scenarioProgress["crownClaim:seat-1"]).toBe(2);

    const onContract = resolveScenarioContractCompleted(createContext(afterDefeat));
    expect(onContract?.summary).toContain("completed contract");
    const afterContract = onContract?.updater(afterDefeat) ?? afterDefeat;
    expect(afterContract.scenarioProgress.crownClaims).toBe(3);
    expect(afterContract.scenarioProgress["crownClaim:seat-1"]).toBe(3);
  });

  it("applies Mirror of False Heroes praise pressure on contract completion", () => {
    const state = createScenarioState({
      activeScenarioId: "scenario_mirror_of_false_heroes",
      scenarioProgress: {}
    });

    const resolution = resolveScenarioContractCompleted(createContext(state));
    expect(resolution?.summary).toContain("mirror feeds on praise");
    const nextState = resolution?.updater(state) ?? state;
    expect(nextState.players[0]?.character.heat).toBe(1);
  });

  it("moves the Devourer, consumes threats, and can erupt", () => {
    const base = createScenarioState({
      activeScenarioId: "scenario_devourer_beneath",
      scenarioProgress: { doomTokens: 0, devourerIndex: 0 }
    });
    const consumeResolution = resolveScenarioTurnEnd(
      createContext(base, {
        outerRingSectorIds: ["glassmere-spindle", "ashwake-crossing"]
      })
    );
    expect(consumeResolution?.summary).toContain("consumes local threats");
    const consumedState = consumeResolution?.updater(base) ?? base;
    expect(consumedState.scenarioProgress.devourerIndex).toBe(1);
    expect(consumedState.scenarioProgress.doomTokens).toBe(1);
    expect(consumedState.sectors.find((sector) => sector.id === "ashwake-crossing")?.encounterDecks.threat).toEqual([]);

    const eruptionState = createScenarioState({
      activeScenarioId: "scenario_devourer_beneath",
      scenarioProgress: { doomTokens: 7, devourerIndex: 0 }
    });
    const eruptionResolution = resolveScenarioTurnEnd(
      createContext(eruptionState, {
        outerRingSectorIds: ["glassmere-spindle", "ashwake-crossing"]
      })
    );
    expect(eruptionResolution?.summary).toContain("table suffers 1 Heat each");
    const afterEruption = eruptionResolution?.updater(eruptionState) ?? eruptionState;
    expect(afterEruption.scenarioProgress.doomTokens).toBe(4);
    expect(afterEruption.players[0]?.character.heat).toBe(1);
  });

  it("rotates the Labyrinth Engine and advances the Dying Star clock", () => {
    const engineState = createScenarioState({
      activeScenarioId: "scenario_labyrinth_engine",
      scenarioProgress: { engineModeIndex: 0 }
    });
    const engineResolution = resolveScenarioTurnStart(createContext(engineState));
    expect(engineResolution?.summary).toContain("mode 1");
    const afterEngine = engineResolution?.updater(engineState) ?? engineState;
    expect(afterEngine.scenarioProgress.engineModeIndex).toBe(1);

    const starState = createScenarioState({
      activeScenarioId: "scenario_dying_star",
      scenarioProgress: { starTokens: 1 }
    });
    const starResolution = resolveScenarioTurnEnd(createContext(starState));
    expect(starResolution?.summary).toContain("erupts");
    const afterStar = starResolution?.updater(starState) ?? starState;
    expect(afterStar.scenarioProgress.starTokens).toBe(5);
    expect(afterStar.players[0]?.character.wounds).toBe(1);
  });
});
