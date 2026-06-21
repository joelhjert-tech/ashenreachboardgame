import type { ScenarioDefinition } from "../data/scenarios.js";

export interface ScenarioProgressState {
  [key: string]: number;
}

export function advanceScenarioProgress(
  progress: ScenarioProgressState,
  scenario: ScenarioDefinition
): ScenarioProgressState {
  const current = progress[scenario.winConditionKey] ?? 0;

  return {
    ...progress,
    [scenario.winConditionKey]: current + 1
  };
}

export function hasScenarioVictory(
  progress: ScenarioProgressState,
  scenario: ScenarioDefinition
): boolean {
  const current = progress[scenario.winConditionKey] ?? 0;
  return current >= scenario.victoryThreshold;
}
