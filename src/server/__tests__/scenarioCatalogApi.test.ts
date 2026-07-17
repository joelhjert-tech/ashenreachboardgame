import { afterEach, describe, expect, it } from "vitest";
import { SCENARIOS } from "../../game/data/scenarios.js";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";

function createTestPort(): number {
  return 19000 + Math.floor(Math.random() * 1000);
}

describe("/api/scenarios", () => {
  let harness: StartedAshenReachServer | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = null;
    }
  });

  it("returns authored scenario previews with pressure, duration, and linked nemesis data", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const response = await fetch(`${baseUrl}/api/scenarios`);
    const payload = (await response.json()) as {
      scenarios: Array<{
        id: string;
        sheetArtPath: string | null;
        pressureRule: string;
        expectedDuration: string;
        nemesis: { name: string; title: string; faction: string } | null;
      }>;
    };

    expect(response.ok).toBe(true);
    expect(payload.scenarios).toHaveLength(SCENARIOS.length);

    for (const scenario of payload.scenarios) {
      expect(scenario.pressureRule).toBeTruthy();
      expect(scenario.expectedDuration).toMatch(/min/i);
    }

    expect(payload.scenarios.find((scenario) => scenario.id === "scenario_broken_seal")?.nemesis).toBeNull();
    expect(payload.scenarios.find((scenario) => scenario.id === "scenario_broken_seal")?.sheetArtPath).toBe(
      "/assets/scenarios/broken-seal.png"
    );
    expect(payload.scenarios.find((scenario) => scenario.id === "scenario_mirror_of_false_heroes")?.sheetArtPath).toBe(
      "/assets/scenarios/mirror-of-false-heroes.png"
    );
    expect(payload.scenarios.find((scenario) => scenario.id === "scenario_dying_star")?.nemesis).toEqual({
      name: "Kharvox",
      title: "The Red Maw",
      faction: "Red Maw Raiders"
    });
  });
});
