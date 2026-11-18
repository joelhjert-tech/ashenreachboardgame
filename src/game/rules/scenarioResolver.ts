import type { ScenarioDefinition } from "../data/scenarios.js";
import { nemeses } from "../data/nemeses.js";

/** Side objectives, finales, and public progress must use the same victory track. */
export function getScenarioProgressThreshold(scenarioId: string | null | undefined, defaultThreshold: number): number {
  if (!scenarioId) return defaultThreshold;
  const nemesis = nemeses.find((entry) => entry.scenarioId === scenarioId);
  return nemesis?.scenarioProgressLife ?? nemesis?.stats.life ?? defaultThreshold;
}

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
  return current >= getScenarioProgressThreshold(scenario.id, scenario.victoryThreshold);
}
