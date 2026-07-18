import { describe, expect, it } from "vitest";
import type { PublicPatchPayload } from "../types.js";
import { buildScenarioMarkers } from "../scenarioBoardVisuals.js";

describe("Broken Concordance board markers", () => {
  it("shows all three public nodes and changes only the stabilized node", () => {
    const patch = {
      activeScenario: { id: "scenario_broken_concordance" },
      scenarioState: {
        preparation: { resources: { concordanceNodes: 1 }, completedObjectiveIds: ["concordance-node-webglass"] },
        confrontation: {},
        result: {}
      },
      sectors: []
    } as unknown as PublicPatchPayload;
    const markers = buildScenarioMarkers(patch);
    expect(markers.map((marker) => marker.nodeId)).toEqual([
      "black-relay-spire",
      "middle_webglass_breach",
      "inner_cinder_lattice"
    ]);
    expect(markers.find((marker) => marker.id === "concordance-node-webglass")?.value).toBe("Stable");
    expect(markers.filter((marker) => marker.value === "Severed")).toHaveLength(2);
  });
});
