import type { ActiveScenarioSummary, ScenarioTelemetryItem } from "./types.js";

export interface ScenarioRuleDigest {
  pressureSummary: string;
  telemetry: string[];
  specialRules: string[];
  confrontationSteps: string[];
  victoryText: string;
}

export function formatScenarioSummaryCopy(activeScenario: ActiveScenarioSummary | null): string {
  if (!activeScenario) {
    return "Scenario telemetry pending";
  }

  return `${activeScenario.name} | ${activeScenario.progress}/${activeScenario.threshold} | ${activeScenario.pressureSummary}`;
}

export function formatScenarioTelemetryInline(scenarioTelemetry: ScenarioTelemetryItem[]): string {
  if (scenarioTelemetry.length === 0) {
    return "Awaiting ambient scenario telemetry";
  }

  return scenarioTelemetry.map((entry) => `${entry.label}: ${entry.value}`).join(" | ");
}

export function buildScenarioRuleDigest(
  activeScenario: ActiveScenarioSummary | null,
  scenarioTelemetry: ScenarioTelemetryItem[],
  limits: {
    telemetry?: number;
    specialRules?: number;
    confrontationSteps?: number;
  } = {}
): ScenarioRuleDigest | null {
  if (!activeScenario) {
    return null;
  }

  return {
    pressureSummary: activeScenario.pressureSummary,
    telemetry: scenarioTelemetry.slice(0, limits.telemetry ?? 4).map((entry) => `${entry.label}: ${entry.value}`),
    specialRules: activeScenario.specialRules.slice(0, limits.specialRules ?? 2),
    confrontationSteps: activeScenario.confrontationSteps.slice(0, limits.confrontationSteps ?? 2),
    victoryText: activeScenario.victoryText
  };
}
