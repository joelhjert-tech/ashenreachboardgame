import { describe, expect, it } from "vitest";
import { describeEquipmentComparison } from "../equipmentComparison.js";
import type { GearItem } from "../types.js";

const chain: GearItem = { id: "oath-chain", name: "Oath Chain", slot: "utility", statBonus: { stat: "command", amount: 1 }, effectModel: "permanent" };
const lantern: GearItem = { id: "signal-lantern", name: "Signal Lantern", slot: "utility", statBonus: { stat: "signal", amount: 1 }, effectModel: "permanent" };
const character = { id: "operative", heldGear: [chain], equippedGear: { weapon: null, armor: null, utility: chain.id } };

describe("equipment comparison", () => {
  it("shows both the lost and gained bonuses when replacing a different stat", () => {
    const text = describeEquipmentComparison(lantern, character);
    expect(text).toContain("Currently equipped: Oath Chain");
    expect(text).toContain("Command -1");
    expect(text).toContain("Signal +1");
  });
  it("calls out duplicate bonuses and empty slots", () => {
    expect(describeEquipmentComparison(chain, character)).toContain("no equipment bonus change");
    expect(describeEquipmentComparison(lantern, { ...character, equippedGear: { ...character.equippedGear, utility: null } })).toContain("slot is empty");
  });
  it("does not describe a conditional effect as a permanent bonus", () => {
    const text = describeEquipmentComparison({ ...lantern, effectModel: "conditional", activeText: "Gain +1 Signal in battle." }, character);
    expect(text).toContain("Gain +1 Signal in battle.");
    expect(text).not.toContain("equipment bonus change");
  });
});
