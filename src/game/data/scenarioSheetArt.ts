import type { ScenarioDefinition } from "./scenarios.js";

const scenarioSheetArtByScenarioId: Partial<Record<string, string>> = {
  scenario_broken_seal: "/assets/scenarios/broken-seal.png",
  scenario_throne_of_ash: "/assets/scenarios/crown-gate-siege.png",
  scenario_devourer_beneath: "/assets/scenarios/ashwalk-breach.png",
  scenario_labyrinth_engine: "/assets/scenarios/manufactorum-hollow-choir.png",
  scenario_dying_star: "/assets/scenarios/relic-core-awakens.png"
};

const scenarioSheetOutputByAssetId: Partial<Record<string, string>> = {
  scenario_sheet_broken_seal: "/assets/scenarios/broken-seal.png",
  scenario_sheet_throne_of_ash: "/assets/scenarios/crown-gate-siege.png",
  scenario_sheet_devourer_beneath: "/assets/scenarios/ashwalk-breach.png",
  scenario_sheet_labyrinth_engine: "/assets/scenarios/manufactorum-hollow-choir.png",
  scenario_sheet_dying_star: "/assets/scenarios/relic-core-awakens.png"
};

export function getScenarioSheetArtPath(scenario: Pick<ScenarioDefinition, "id"> | string): string | null {
  const scenarioId = typeof scenario === "string" ? scenario : scenario.id;
  return scenarioSheetArtByScenarioId[scenarioId] ?? null;
}

export function getScenarioSheetArtOutputPath(scenario: Pick<ScenarioDefinition, "id" | "sheetArtAssetId">): string {
  return scenarioSheetOutputByAssetId[scenario.sheetArtAssetId] ?? `/assets/scenarios/${scenario.id}.png`;
}

