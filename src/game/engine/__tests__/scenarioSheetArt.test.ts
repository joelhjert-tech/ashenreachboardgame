import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../../data/scenarios.js";
import { getScenarioSheetArtOutputPath, getScenarioSheetArtPath } from "../../data/scenarioSheetArt.js";
import { scenarioSheetPrompts } from "../../assets/design/scenarioSheetPrompts.js";

describe("scenario sheet art paths", () => {
  it("maps generated scenario sheets to canonical public asset paths", () => {
    expect(getScenarioSheetArtPath("scenario_broken_seal")).toBe("/assets/scenarios/broken-seal.png");
    expect(getScenarioSheetArtPath("scenario_throne_of_ash")).toBe("/assets/scenarios/crown-gate-siege.png");
    expect(getScenarioSheetArtPath("scenario_devourer_beneath")).toBe("/assets/scenarios/ashwalk-breach.png");
    expect(getScenarioSheetArtPath("scenario_labyrinth_engine")).toBe("/assets/scenarios/manufactorum-hollow-choir.png");
    expect(getScenarioSheetArtPath("scenario_dying_star")).toBe("/assets/scenarios/relic-core-awakens.png");
  });

  it("falls back safely for scenarios without final sheet art", () => {
    expect(getScenarioSheetArtPath("scenario_mirror_of_false_heroes")).toBeNull();

    const mirror = SCENARIOS.find((scenario) => scenario.id === "scenario_mirror_of_false_heroes")!;
    expect(getScenarioSheetArtOutputPath(mirror)).toBe("/assets/scenarios/scenario_mirror_of_false_heroes.png");
  });

  it("keeps generated prompt outputs out of legacy Riftfall paths", () => {
    expect(scenarioSheetPrompts.every((prompt) => prompt.outputPath.startsWith("/assets/scenarios/"))).toBe(true);
    expect(scenarioSheetPrompts.some((prompt) => prompt.outputPath.includes("/assets/riftfall/scenarios"))).toBe(false);
  });
});

