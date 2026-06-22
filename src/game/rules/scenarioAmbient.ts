export function createInitialScenarioProgress(scenarioId: string): Record<string, number> {
  switch (scenarioId) {
    case "scenario_broken_seal":
      return { sealTokens: 6 };
    case "scenario_throne_of_ash":
      return { crownClaims: 0 };
    case "scenario_mirror_of_false_heroes":
      return {};
    case "scenario_devourer_beneath":
      return { doomTokens: 0, devourerIndex: 0 };
    case "scenario_labyrinth_engine":
      return { engineModeIndex: 0 };
    case "scenario_dying_star":
      return { starTokens: 10 };
    default:
      return {};
  }
}
