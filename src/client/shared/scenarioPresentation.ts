import type { ActiveScenarioSummary, ScenarioTelemetryItem } from "./types.js";

export interface ScenarioRuleDigest {
  pressureSummary: string;
  telemetry: string[];
  specialRules: string[];
  confrontationSteps: string[];
  victoryText: string;
}

export interface ScenarioOutcomeSummary {
  title: string;
  detail: string;
  tone: "victory" | "defeat";
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

export function buildScenarioOutcomeSummary(options: {
  status: "lobby" | "active" | "ended" | null;
  winnerSeatId: string | null;
  activeSeatId?: string | null;
  activeScenario: ActiveScenarioSummary | null;
  seatLabelById?: Record<string, string>;
}): ScenarioOutcomeSummary | null {
  if (options.status !== "ended") {
    return null;
  }

  const scenarioName = options.activeScenario?.name ?? "the active scenario";
  const lookupSeatLabel = (seatId: string | null | undefined) =>
    (seatId ? options.seatLabelById?.[seatId] ?? seatId : null) ?? "the operatives";

  if (options.winnerSeatId) {
    const winnerLabel = lookupSeatLabel(options.winnerSeatId);
    const activeSeatLabel = lookupSeatLabel(options.activeSeatId);

    return {
      title: `${scenarioName} secured`,
      detail:
        options.activeSeatId && options.activeSeatId === options.winnerSeatId
          ? `${winnerLabel} won the confrontation and secured ${scenarioName}.`
          : `${winnerLabel} won the session and secured ${scenarioName}. Last active seat: ${activeSeatLabel}.`,
      tone: "victory"
    };
  }

  return {
    title: `${scenarioName} lost`,
    detail: `The breach collapsed the run before ${scenarioName} could be secured.`,
    tone: "defeat"
  };
}
