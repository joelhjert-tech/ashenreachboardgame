import { describe, expect, it } from "vitest";
import type { PhoneSelfState } from "../../shared/types.js";
import { getPhoneStatBreakdown } from "../statBreakdown.js";

function selfWith(item: PhoneSelfState["character"]["heldGear"][number]): PhoneSelfState {
  return {
    seatId: "seat-1", sectorId: "ashwake-crossing", hand: [], notes: [],
    character: {
      id: "void-marshal", name: "Tarek", archetype: "Marshal", status: "active",
      stats: { command: 3, grit: 3, signal: 2, guile: 2, forge: 2 }, statUpgrades: {}, trophies: 0,
      trophyPile: [], heat: 0, wounds: 0, scars: [], activeContract: null,
      heldGear: [item], equippedGear: { weapon: item.slot === "weapon" ? item.id : null, armor: item.slot === "armor" ? item.id : null, utility: item.slot === "utility" ? item.id : null },
      followers: [], abilities: [], currentSpaceId: "ashwake-crossing"
    }
  };
}

describe("phone resting stat breakdown item effects", () => {
  it("includes permanent equipped gear in Gear/Follower and Final", () => {
    const breakdown = getPhoneStatBreakdown(selfWith({ id: "vest", name: "Vest", slot: "armor", statBonus: { stat: "grit", amount: 1 }, effectModel: "permanent", requiresEquipped: true }), "grit");
    expect(breakdown.gearFollower).toBe(1);
    expect(breakdown.final).toBe(4);
  });

  it("keeps battle-only conditional gear out of resting headline stats", () => {
    const breakdown = getPhoneStatBreakdown(selfWith({ id: "maul", name: "Maul", slot: "weapon", statBonus: { stat: "grit", amount: 1 }, effectModel: "conditional", requiresEquipped: true, conditionType: "battle" }), "grit");
    expect(breakdown.gearFollower).toBe(0);
    expect(breakdown.final).toBe(3);
  });
});
