import { getEscalationCollapseLevel, getEscalationModifier } from "../engine/escalation.js";
import { getScenarioDefinition, type ScenarioDefinition } from "../data/scenarios.js";
import type { GameState } from "../schema/session.schema.js";
import { getBrokenSealTokenLimit } from "./soloTuning.js";

export type ScenarioPressureMode = "single" | "co-op" | "rivalry" | "ruthless";
export type ScenarioStatus = "active" | "completed" | "failed";

export interface ScenarioPressureTrackState {
  name: string;
  current: number;
  max: number;
  modifier: number;
  difficultyBonus: number;
  failureAtMax: boolean;
  tickTiming: string;
  collapseRule: string;
}

export interface ScenarioObjectiveProgressState {
  label: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface ScenarioModeSpecificPublicState {
  kind: ScenarioPressureMode;
  label: string;
  summary: string;
  privateAgenda: "none" | "phone-only";
}

export interface ScenarioPressureState {
  scenarioId: string;
  scenarioName: string;
  mode: ScenarioPressureMode;
  scenarioStatus: ScenarioStatus;
  pressureTrack: ScenarioPressureTrackState;
  collapseTrack: ScenarioPressureTrackState;
  objectiveProgress: ScenarioObjectiveProgressState;
  publicSummary: string;
  modeSpecific: ScenarioModeSpecificPublicState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function humanizeProgressKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_:-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getPublicMode(state: GameState): ScenarioPressureMode {
  if (state.sessionMode === "single-player") {
    return "single";
  }

  const interactionMode = state.interactionMode ?? "rivalry";
  return interactionMode === "ruthless" ? "ruthless" : interactionMode;
}

function getScenarioStatus(state: GameState): ScenarioStatus {
  if (state.status !== "ended") {
    return "active";
  }

  return state.winnerSeatId ? "completed" : "failed";
}

function getScenarioPressureCurrent(state: GameState, scenario: ScenarioDefinition): number {
  switch (scenario.id) {
    case "scenario_broken_seal":
      return state.scenarioProgress.sealTokens ?? getBrokenSealTokenLimit(state.sessionMode);
    case "scenario_throne_of_ash":
      return state.scenarioProgress.crownHunger ?? 0;
    case "scenario_mirror_of_false_heroes":
      return state.scenarioProgress.mirrorPressure ?? Math.max(0, ...state.players.map((player) => player.character.heat));
    case "scenario_devourer_beneath":
      return state.scenarioProgress.doomTokens ?? 0;
    case "scenario_labyrinth_engine":
      return state.scenarioProgress.engineInstability ?? 0;
    case "scenario_dying_star":
      return state.scenarioProgress.starTokens ?? scenario.pressureTrack.start;
    default:
      return scenario.pressureTrack.start;
  }
}

function getScenarioPressureMax(state: GameState, scenario: ScenarioDefinition): number {
  if (scenario.id === "scenario_broken_seal") {
    return getBrokenSealTokenLimit(state.sessionMode);
  }

  return scenario.pressureTrack.max;
}

function getModeSpecificPublicState(state: GameState): ScenarioModeSpecificPublicState {
  const mode = getPublicMode(state);

  switch (mode) {
    case "single":
      return {
        kind: "single",
        label: "Single",
        summary: "One operative faces the public scenario pressure. No private rivalry agenda is active.",
        privateAgenda: "none"
      };
    case "co-op":
      return {
        kind: "co-op",
        label: "Co-op",
        summary: "The table shares objective progress, pressure, victory, and failure.",
        privateAgenda: "none"
      };
    case "ruthless":
      return {
        kind: "ruthless",
        label: "Ruthless",
        summary: "Public scenario pressure is shared. Private rivalry directives remain phone-only.",
        privateAgenda: "phone-only"
      };
    case "rivalry":
    default:
      return {
        kind: "rivalry",
        label: "Rivalry",
        summary: "Public scenario pressure is shared. Private agenda details remain phone-only.",
        privateAgenda: "phone-only"
      };
  }
}

export function buildScenarioPressureState(state: GameState, pressureSummary: string): ScenarioPressureState | null {
  const scenario = getScenarioDefinition(state.activeScenarioId);

  if (!scenario) {
    return null;
  }

  const scenarioMax = getScenarioPressureMax(state, scenario);
  const collapseMax = getEscalationCollapseLevel(state.sessionMode);
  const objectiveCurrent = state.scenarioProgress[scenario.winConditionKey] ?? 0;
  const objectiveRequired = scenario.victoryThreshold;

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    mode: getPublicMode(state),
    scenarioStatus: getScenarioStatus(state),
    pressureTrack: {
      name: scenario.pressureTrack.name,
      current: clamp(getScenarioPressureCurrent(state, scenario), 0, scenarioMax),
      max: scenarioMax,
      modifier: 0,
      difficultyBonus: 0,
      failureAtMax: false,
      tickTiming: scenario.pressureTrack.tickTiming,
      collapseRule: scenario.pressureTrack.collapseRule
    },
    collapseTrack: {
      name: "Escalation",
      current: clamp(state.escalationLevel, 0, collapseMax),
      max: collapseMax,
      modifier: getEscalationModifier(state.escalationLevel),
      difficultyBonus: getEscalationModifier(state.escalationLevel),
      failureAtMax: true,
      tickTiming: "End of round after the last active operative completes a turn.",
      collapseRule: `At ${collapseMax} escalation, the public scenario fails.`
    },
    objectiveProgress: {
      label: humanizeProgressKey(scenario.winConditionKey),
      current: objectiveCurrent,
      required: objectiveRequired,
      completed: objectiveCurrent >= objectiveRequired
    },
    publicSummary: pressureSummary,
    modeSpecific: getModeSpecificPublicState(state)
  };
}
