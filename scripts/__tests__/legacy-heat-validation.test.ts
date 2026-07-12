import { describe, expect, it } from "vitest";
import { validateLegacyHeatContentRecord } from "../legacy-heat-validation.js";

describe("legacy Heat authoring guard", () => {
  it("accepts explicitly approved compatibility content", () => {
    expect(validateLegacyHeatContentRecord("content/gear/black-route-fuse.json", { id: "black-route-fuse", heatCost: 1, text: "Heat cost" })).toEqual([]);
  });

  it.each([
    [{ id: "new-card", effect: { type: "gain_heat", amount: 1 } }, "gain_heat"],
    [{ id: "new-card", heatCost: 1 }, "heatCost"],
    [{ id: "new-card", text: "Gain 1 Heat." }, "player-facing Heat text"]
  ])("rejects new legacy authoring with a useful error", (record, construct) => {
    const errors = validateLegacyHeatContentRecord("content/new-card.json", record);
    expect(errors.join(" ")).toContain("new-card");
    expect(errors.join(" ")).toContain(construct);
    expect(errors.join(" ")).toContain("explicit design decision");
  });

  it("allows current consequence systems", () => {
    expect(validateLegacyHeatContentRecord("content/current.json", { id: "current", effect: { type: "take_wound", amount: 1 }, scars: [], lossPressure: 1, globalEscalation: 1 })).toEqual([]);
  });
});
