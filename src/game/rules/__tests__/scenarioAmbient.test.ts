import { describe, expect, it } from "vitest";
import {
  buildScenarioTelemetry,
  createInitialScenarioProgress,
  describeScenarioPressure,
  resolveScenarioContractCompleted,
  resolveScenarioEnemyDefeat,
  resolveScenarioGearGained,
  resolveScenarioSectorEntered,
  resolveScenarioSkillResolved,
  resolveScenarioTurnEnd,
  resolveScenarioTurnStart
  ,
  resolveScenarioWoundsTaken
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

  it("spikes every operative heat when the Broken Seal loses its final ward token", () => {
    const state = createScenarioState({
      activeScenarioId: "scenario_broken_seal",
      scenarioProgress: { sealTokens: 1 }
    });

    const weakening = resolveScenarioTurnStart(createContext(state, { roll: 1 }));
    expect(weakening?.summary).toContain("Every operative gained 1 Heat");
    const weakenedState = weakening?.updater(state) ?? state;
    expect(weakenedState.scenarioProgress.sealTokens).toBe(0);
    expect(weakenedState.players[0]?.character.heat).toBe(1);
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

    const onWounds = resolveScenarioWoundsTaken({
      ...createContext(afterContract),
      woundDelta: 2
    });
    expect(onWounds?.summary).toContain("returns 2 Crown tokens");
    const afterWounds = onWounds?.updater(afterContract) ?? afterContract;
    expect(afterWounds.scenarioProgress.crownClaims).toBe(1);
    expect(afterWounds.scenarioProgress["crownClaim:seat-1"]).toBe(1);
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

    const gearResolution = resolveScenarioGearGained({
      ...createContext(nextState),
      gainedGearCount: 1
    });
    expect(gearResolution?.summary).toContain("fresh relic power");
    const gearState = gearResolution?.updater(nextState) ?? nextState;
    expect(gearState.players[0]?.character.heat).toBe(2);
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
    expect(eruptionResolution?.summary).toContain("Every operative takes 1 wound");
    const afterEruption = eruptionResolution?.updater(eruptionState) ?? eruptionState;
    expect(afterEruption.scenarioProgress.doomTokens).toBe(4);
    expect(afterEruption.players[0]?.character.wounds).toBe(1);
  });

  it("resolves Devourer sector-entry clashes through the shared ambient lifecycle", () => {
    const successState = createScenarioState({
      activeScenarioId: "scenario_devourer_beneath",
      scenarioProgress: { doomTokens: 2, devourerIndex: 1 },
      players: createScenarioState().players.map((player) => ({
        ...player,
        character: {
          ...player.character,
          stats: {
            ...player.character.stats,
            grit: 20
          }
        }
      }))
    });

    const ignoredResolution = resolveScenarioSectorEntered({
      ...createContext(successState, {
        roll: 6,
        outerRingSectorIds: ["glassmere-spindle", "ashwake-crossing"]
      }),
      sectorId: "glassmere-spindle"
    });
    const normalizedSuccessResolution = resolveScenarioSectorEntered({
      ...createContext(successState, {
        roll: 6,
        outerRingSectorIds: ["glassmere-spindle", "ashwake-crossing"]
      }),
      sectorId: "ashwake-crossing"
    });

    expect(ignoredResolution).toBeNull();
    expect(normalizedSuccessResolution?.summary).toContain("Doom falls to 1");
    expect(normalizedSuccessResolution?.escalationDelta).toBe(0);
    const successNextState = normalizedSuccessResolution?.updater(successState) ?? successState;
    expect(successNextState.scenarioProgress.doomTokens).toBe(1);
    expect(successNextState.players[0]?.character.wounds).toBe(0);

    const failureState = createScenarioState({
      activeScenarioId: "scenario_devourer_beneath",
      scenarioProgress: { doomTokens: 0, devourerIndex: 1 },
      players: createScenarioState().players.map((player) => ({
        ...player,
        character: {
          ...player.character,
          stats: {
            ...player.character.stats,
            grit: 0
          }
        }
      }))
    });
    const failureResolution = resolveScenarioSectorEntered({
      ...createContext(failureState, {
        roll: 1,
        outerRingSectorIds: ["glassmere-spindle", "ashwake-crossing"]
      }),
      sectorId: "ashwake-crossing"
    });

    expect(failureResolution?.summary).toContain("take 1 wound and doom rises to 1");
    expect(failureResolution?.escalationDelta).toBe(1);
    expect(failureResolution?.escalationReason).toBe("devourer clash");
    const failureNextState = failureResolution?.updater(failureState) ?? failureState;
    expect(failureNextState.scenarioProgress.doomTokens).toBe(1);
    expect(failureNextState.players[0]?.character.wounds).toBe(1);
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

    const skillSuccess = resolveScenarioSkillResolved({
      ...createContext({
        ...afterEngine,
        players: afterEngine.players.map((player) => ({
          ...player,
          character: {
            ...player.character,
            heat: 2
          }
        }))
      }),
      stat: "signal",
      success: true
    });
    expect(skillSuccess?.summary).toContain("bleeds off 1 Heat");
    const cooledState = skillSuccess?.updater({
      ...afterEngine,
      players: afterEngine.players.map((player) => ({
        ...player,
        character: {
          ...player.character,
          heat: 2
        }
      }))
    }) ?? afterEngine;
    expect(cooledState.players[0]?.character.heat).toBe(1);

    const skillFailure = resolveScenarioSkillResolved({
      ...createContext(afterEngine),
      stat: "signal",
      success: false
    });
    expect(skillFailure?.summary).toContain("adds 1 Heat");
    const heatedState = skillFailure?.updater(afterEngine) ?? afterEngine;
    expect(heatedState.players[0]?.character.heat).toBe(1);

    const starState = createScenarioState({
      activeScenarioId: "scenario_dying_star",
      scenarioProgress: { starTokens: 1 }
    });
    const starResolution = resolveScenarioTurnEnd(createContext(starState));
    expect(starResolution?.summary).toContain("erupts");
    const afterStar = starResolution?.updater(starState) ?? starState;
    expect(afterStar.scenarioProgress.starTokens).toBe(5);
    expect(afterStar.players[0]?.character.wounds).toBe(1);
    expect(afterStar.players[0]?.character.heat).toBe(0);

    const woundResolution = resolveScenarioWoundsTaken({
      ...createContext(afterStar),
      woundDelta: 2
    });
    expect(woundResolution?.summary).toContain("strip 2 additional star tokens");
    const afterWounds = woundResolution?.updater(afterStar) ?? afterStar;
    expect(afterWounds.scenarioProgress.starTokens).toBe(3);

    const gearResolution = resolveScenarioGearGained({
      ...createContext(afterWounds),
      gainedGearCount: 1
    });
    expect(gearResolution?.summary).toContain("star");
    const afterGear = gearResolution?.updater(afterWounds) ?? afterWounds;
    expect(afterGear.scenarioProgress.starTokens).toBe(5);
  });

  it("builds scenario pressure copy and telemetry from the shared rule table", () => {
    const mirrorState = createScenarioState({
      activeScenarioId: "scenario_mirror_of_false_heroes",
      scenarioProgress: {}
    });
    const mirrorPressure = describeScenarioPressure(mirrorState);
    const mirrorTelemetry = buildScenarioTelemetry(mirrorState);

    expect(mirrorPressure).toContain("Heat is acting as mirror pressure");
    expect(mirrorTelemetry.map((entry) => entry.label)).toEqual(["Mirror Breaks", "Heat Proxy", "Reflection Feed"]);

    const throneState = createScenarioState({
      activeScenarioId: "scenario_throne_of_ash",
      scenarioProgress: { crownClaims: 2, "crownClaim:seat-1": 1 }
    });
    const thronePressure = describeScenarioPressure(throneState);
    const throneTelemetry = buildScenarioTelemetry(throneState);

    expect(thronePressure).toContain("2/3 crown claims secured");
    expect(throneTelemetry.map((entry) => entry.label)).toEqual(["Crown Claims", "Crown Holders", "Active Crowns"]);
  });
});
