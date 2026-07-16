import { describe, expect, it } from "vitest";
import type { PhoneSelfState } from "../../shared/types.js";
import { getPhoneStatBreakdown } from "../statBreakdown.js";

function selfWith(
  item: PhoneSelfState["character"]["heldGear"][number],
  overrides: Partial<PhoneSelfState["character"]> = {}
): PhoneSelfState {
  return {
    seatId: "seat-1", sectorId: "ashwake-crossing", hand: [], notes: [],
    character: {
      id: "void-marshal", name: "Tarek", archetype: "Marshal", status: "active",
      stats: { command: 3, grit: 3, signal: 2, guile: 2, forge: 2 }, statUpgrades: {}, trophies: 0,
      trophyPile: [], wounds: 0, scars: [], activeContract: null,
      heldGear: [item], equippedGear: { weapon: item.slot === "weapon" ? item.id : null, armor: item.slot === "armor" ? item.id : null, utility: item.slot === "utility" ? item.id : null },
      followers: [], abilities: [], currentSpaceId: "ashwake-crossing",
      ...overrides
    }
  };
}

describe("phone resting stat breakdown item effects", () => {
  it("includes permanent equipped gear automatically in Equipped and Final", () => {
    const breakdown = getPhoneStatBreakdown(selfWith({ id: "vest", name: "Vest", slot: "armor", statBonus: { stat: "grit", amount: 1 }, effectModel: "permanent", requiresEquipped: true }), "grit");
    expect(breakdown.equipped).toBe(1);
    expect(breakdown.companion).toBe(0);
    expect(breakdown.final).toBe(4);
  });

  it("keeps battle-only conditional gear out of resting headline stats", () => {
    const breakdown = getPhoneStatBreakdown(selfWith({ id: "maul", name: "Maul", slot: "weapon", statBonus: { stat: "grit", amount: 1 }, effectModel: "conditional", requiresEquipped: true, conditionType: "battle" }), "grit");
    expect(breakdown.gearFollower).toBe(0);
    expect(breakdown.final).toBe(3);
    expect(breakdown.contextualSources).toEqual([
      expect.objectContaining({ label: "Maul", value: 1, scope: "battle", sourceType: "equipped" })
    ]);
  });

  it("uses the exact equipped instance when duplicate catalog IDs exist", () => {
    const equipped = { id: "vest", instanceId: "vest-b", name: "Reinforced Vest", slot: "armor" as const, statBonus: { stat: "grit" as const, amount: 2 }, effectModel: "permanent" as const, requiresEquipped: true };
    const carried = { ...equipped, instanceId: "vest-a", name: "Worn Vest", statBonus: { stat: "grit" as const, amount: 1 } };
    const self = selfWith(equipped, {
      heldGear: [carried, equipped],
      equippedGear: { weapon: null, armor: "vest", utility: null },
      equippedGearInstances: { weapon: null, armor: "vest-b", utility: null }
    });

    const breakdown = getPhoneStatBreakdown(self, "grit");
    expect(breakdown.equipped).toBe(2);
    expect(breakdown.equippedSources).toEqual([
      expect.objectContaining({ label: "Reinforced Vest", catalogId: "vest", instanceId: "vest-b", value: 2 })
    ]);
    expect(breakdown.final).toBe(5);
  });

  it("removes only the suppressed equipped instance from the neutral final", () => {
    const item = { id: "vest", instanceId: "vest-a", name: "Vest", slot: "armor" as const, statBonus: { stat: "grit" as const, amount: 1 }, effectModel: "permanent" as const, requiresEquipped: true };
    const self = selfWith(item, {
      equippedGearInstances: { weapon: null, armor: "vest-a", utility: null }
    });

    const breakdown = getPhoneStatBreakdown(self, "grit", { suppressedInstanceIds: new Set(["vest-a"]) });
    expect(breakdown.equipped).toBe(0);
    expect(breakdown.final).toBe(3);
  });

  it("keeps upgrades, companions, and contextual effects in distinct sources", () => {
    const item = { id: "lens", name: "Lens", slot: "utility" as const, statBonus: { stat: "signal" as const, amount: 1 }, effectModel: "permanent" as const, requiresEquipped: true };
    const self = selfWith(item, {
      id: "char_rumi",
      stats: { command: 3, grit: 3, signal: 3, guile: 2, forge: 2 },
      statUpgrades: { signal: 1 },
      followers: [{ id: "mira-rift-twin", name: "Mira Rift-Twin", role: "companion", text: "Team bonus." }],
      temporaryAllStatBoost: { value: 2, remainingEligibleResolutions: 1 }
    });

    const breakdown = getPhoneStatBreakdown(self, "signal");
    expect(breakdown.base).toBe(2);
    expect(breakdown.upgrades).toBe(1);
    expect(breakdown.equipped).toBe(1);
    expect(breakdown.companion).toBe(1);
    expect(breakdown.final).toBe(5);
    expect(breakdown.contextualSources).toEqual([
      expect.objectContaining({ label: "Too Many Dogs", value: 2, scope: "battle/check" })
    ]);
  });
});
