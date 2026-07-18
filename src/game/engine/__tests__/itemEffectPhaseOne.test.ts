import { describe, expect, it } from "vitest";
import { loadCharacters } from "../../content/characters.js";
import { loadGear } from "../../content/gear.js";
import { getEquippedGearModifierSources } from "../gear.js";

function characterWithGear(gearId: string, equipped: boolean) {
  const source = loadCharacters().get("void-marshal");
  const gear = loadGear().get(gearId);
  if (!source || !gear) throw new Error(`Missing item effect fixture ${gearId}`);
  return {
    ...source,
    heldGear: [gear],
    equippedGear: { weapon: null, armor: null, utility: null, [gear.slot]: equipped ? gear.id : null }
  };
}

describe("Phase 1 item effect models", () => {
  it("applies permanent passives only while equipped and removes them with the item", () => {
    const equipped = characterWithGear("rivetplate-vest", true);
    expect(getEquippedGearModifierSources(equipped, "grit")).toEqual([{ label: "Rivetplate Vest", value: 1 }]);

    const carried = characterWithGear("rivetplate-vest", false);
    expect(getEquippedGearModifierSources(carried, "grit")).toEqual([]);

    const unequipped = { ...equipped, equippedGear: { ...equipped.equippedGear, armor: null } };
    expect(getEquippedGearModifierSources(unequipped, "grit")).toEqual([]);

    const removed = { ...equipped, heldGear: [], equippedGear: { ...equipped.equippedGear, armor: null } };
    expect(getEquippedGearModifierSources(removed, "grit")).toEqual([]);
  });

  it("applies battle-only weapons in battles but not resting values or unrelated checks", () => {
    const equipped = characterWithGear("nailspike-maul", true);
    expect(getEquippedGearModifierSources(equipped, "grit", { mode: "battle" })).toEqual([{ label: "Nailspike Maul", value: 1 }]);
    expect(getEquippedGearModifierSources(equipped, "grit", { mode: "check" })).toEqual([]);
    expect(getEquippedGearModifierSources(equipped, "grit", { mode: "resting" })).toEqual([]);
    expect(getEquippedGearModifierSources(equipped, "signal", { mode: "battle" })).toEqual([]);
  });
});
