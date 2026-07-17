import { getScenarioDefinition, type ScenarioDefinition } from "../data/scenarios.js";
import type { ThreatFamily, ThreatLane } from "../schema/card.schema.js";
import type { ContractCard } from "../schema/contract.schema.js";
import type { GameState } from "../schema/session.schema.js";

export type ScenarioObjectiveTriggerType = "contractCompleted" | "threatDefeated" | "sectorActionCompleted";

export type ScenarioObjectiveTriggerEvent =
  | {
      type: "contractCompleted";
      contractId: string;
      contractTags?: string[];
      sectorId?: string;
    }
  | {
      type: "threatDefeated";
      threatId: string;
      threatLane?: ThreatLane;
      enemyFamily?: ThreatFamily;
      sectorId?: string;
    }
  | {
      type: "sectorActionCompleted";
      effectKey: string;
      sectorId?: string;
    };

type ScenarioObjectiveTriggerDefinition = {
  type: ScenarioObjectiveTriggerType;
  amount: number;
  threatLane?: ThreatLane;
  enemyFamily?: ThreatFamily;
  effectKey?: string;
  contractTag?: string;
};

export type ScenarioObjectiveTriggerResult = {
  scenarioId: string;
  progressKey: string;
  amount: number;
  required: number;
  previous: number;
  next: number;
  completed: boolean;
  triggerType: ScenarioObjectiveTriggerType;
  summary: string;
};

const SCENARIO_OBJECTIVE_TRIGGERS: Record<string, ScenarioObjectiveTriggerDefinition[]> = {
  scenario_broken_seal: [
    { type: "contractCompleted", amount: 1 },
    { type: "threatDefeated", amount: 1, threatLane: "blue" },
    { type: "sectorActionCompleted", amount: 1, effectKey: "inner_choirShrine" }
  ],
  scenario_throne_of_ash: [
    { type: "contractCompleted", amount: 1 },
    { type: "threatDefeated", amount: 1, enemyFamily: "revenant" },
    { type: "sectorActionCompleted", amount: 1, effectKey: "middle_rivalryClaim" }
  ],
  scenario_mirror_of_false_heroes: [
    { type: "contractCompleted", amount: 1 },
    { type: "threatDefeated", amount: 1, enemyFamily: "breachborn" },
    { type: "sectorActionCompleted", amount: 1, effectKey: "middle_webglassFracture" }
  ],
  scenario_devourer_beneath: [
    { type: "threatDefeated", amount: 1, threatLane: "red" },
    { type: "sectorActionCompleted", amount: 1, effectKey: "outer_mirecoilTraffic" }
  ],
  scenario_labyrinth_engine: [
    { type: "contractCompleted", amount: 1 },
    { type: "sectorActionCompleted", amount: 1, effectKey: "middle_guardianSpanThreshold" },
    { type: "sectorActionCompleted", amount: 1, effectKey: "inner_gateOfCindersTrial" }
  ],
  scenario_dying_star: [
    { type: "contractCompleted", amount: 1 },
    { type: "sectorActionCompleted", amount: 1, effectKey: "outer_emberwatchBrace" },
    { type: "sectorActionCompleted", amount: 1, effectKey: "inner_cinderLatticeTrial" }
  ]
};

function getTriggerDefinitions(scenarioId: string): ScenarioObjectiveTriggerDefinition[] {
  return SCENARIO_OBJECTIVE_TRIGGERS[scenarioId] ?? [];
}

function matchesTrigger(definition: ScenarioObjectiveTriggerDefinition, event: ScenarioObjectiveTriggerEvent): boolean {
  if (definition.type !== event.type) {
    return false;
  }

  if (definition.type === "contractCompleted" && event.type === "contractCompleted") {
    return !definition.contractTag || event.contractTags?.includes(definition.contractTag) === true;
  }

  if (definition.type === "threatDefeated" && event.type === "threatDefeated") {
    if (definition.threatLane && definition.threatLane !== event.threatLane) {
      return false;
    }

    if (definition.enemyFamily && definition.enemyFamily !== event.enemyFamily) {
      return false;
    }

    return true;
  }

  if (definition.type === "sectorActionCompleted" && event.type === "sectorActionCompleted") {
    return !definition.effectKey || definition.effectKey === event.effectKey;
  }

  return false;
}

function describeTrigger(scenario: ScenarioDefinition, event: ScenarioObjectiveTriggerEvent, amount: number, next: number): string {
  const label = scenario.victoryThreshold === 1 ? "objective mark" : "objective marks";
  const progress = `${next}/${scenario.victoryThreshold}`;

  switch (event.type) {
    case "contractCompleted":
      return `${scenario.name} objective advanced by ${amount} after contract ${event.contractId}. Progress ${progress} ${label}.`;
    case "threatDefeated":
      return `${scenario.name} objective advanced by ${amount} after defeating ${event.threatId}. Progress ${progress} ${label}.`;
    case "sectorActionCompleted":
      return `${scenario.name} objective advanced by ${amount} after resolving ${event.effectKey}. Progress ${progress} ${label}.`;
  }
}

export function buildContractCompletedObjectiveEvent(
  contract: ContractCard,
  sectorId?: string
): ScenarioObjectiveTriggerEvent {
  return {
    type: "contractCompleted",
    contractId: contract.id,
    sectorId
  };
}

export function resolveScenarioObjectiveTrigger(
  state: GameState,
  event: ScenarioObjectiveTriggerEvent
): ScenarioObjectiveTriggerResult | null {
  if (state.status !== "active") {
    return null;
  }

  const scenario = getScenarioDefinition(state.activeScenarioId);

  if (!scenario) {
    return null;
  }

  const definition = getTriggerDefinitions(scenario.id).find((entry) => matchesTrigger(entry, event));

  if (!definition) {
    return null;
  }

  const required = Math.max(0, scenario.victoryThreshold);
  const previous = Math.max(0, state.scenarioProgress[scenario.winConditionKey] ?? 0);

  if (required > 0 && previous >= required) {
    return null;
  }

  const amount = Math.max(1, definition.amount);
  const next = required > 0 ? Math.min(required, previous + amount) : previous + amount;

  if (next <= previous) {
    return null;
  }

  return {
    scenarioId: scenario.id,
    progressKey: scenario.winConditionKey,
    amount: next - previous,
    required,
    previous,
    next,
    completed: required > 0 && next >= required,
    triggerType: event.type,
    summary: describeTrigger(scenario, event, next - previous, next)
  };
}
