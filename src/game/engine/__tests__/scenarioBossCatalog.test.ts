import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getNemesisPortraitPath } from "../../../client/shared/assetPaths.js";
import { characterPortraitPrompts } from "../../assets/design/characterPortraitPrompts.js";
import { nemeses } from "../../data/nemeses.js";
import { SCENARIOS } from "../../data/scenarios.js";

describe("scenario boss catalog", () => {
  it("links every authored scenario to exactly one matching named boss", () => {
    const expectedProgressLife: Record<string, number> = {
      scenario_broken_seal: 2,
      scenario_throne_of_ash: 6,
      scenario_mirror_of_false_heroes: 4,
      scenario_devourer_beneath: 5,
      scenario_labyrinth_engine: 5,
      scenario_dying_star: 4,
      scenario_grinning_tithe: 6,
      scenario_broken_concordance: 3
    };

    for (const scenario of SCENARIOS) {
      const linked = nemeses.filter((nemesis) => nemesis.scenarioId === scenario.id);
      expect(linked, scenario.id).toHaveLength(1);
      expect(linked[0]!.name, scenario.id).toBe(scenario.nemesis);
      expect(linked[0]!.scenarioProgressLife ?? linked[0]!.stats.life, scenario.id).toBe(
        expectedProgressLife[scenario.id]
      );
    }
  });

  it("retains bespoke confrontation plans for staged finales", () => {
    const authoredPlanScenarios = nemeses
      .filter((nemesis) => nemesis.scenarioConfrontationMode === "authored-plan")
      .map((nemesis) => nemesis.scenarioId)
      .sort();

    expect(authoredPlanScenarios).toEqual([
      "scenario_broken_concordance",
      "scenario_broken_seal"
    ]);
  });

  it("registers one generated portrait prompt and a real runtime portrait for every scenario boss", () => {
    for (const scenario of SCENARIOS) {
      const boss = nemeses.find((nemesis) => nemesis.scenarioId === scenario.id)!;
      const portraitPath = getNemesisPortraitPath(boss.id);
      const prompt = characterPortraitPrompts.find((entry) => entry.id === `portrait_${boss.id}`);

      expect(portraitPath, boss.id).toBe(`/assets/riftfall/nemeses/${boss.id}.png`);
      expect(existsSync(join(process.cwd(), "public", portraitPath)), portraitPath).toBe(true);
      expect(prompt?.outputPath, boss.id).toBe(portraitPath);
      expect(prompt?.prompt, boss.id).toContain(boss.imagePrompt);
    }
  });
});
