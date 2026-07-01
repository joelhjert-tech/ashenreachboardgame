import { describe, expect, it } from "vitest";
import { loadGear } from "../../content/gear.js";
import { SCENARIOS } from "../../data/scenarios.js";
import { calculateSkillTestBreakdown, resolveSkillTest } from "../../rules/skillTestResolver.js";
import { filterGearByShopCategory, getGearShopCategories, SHOP_CATEGORY_LABELS } from "../../rules/shopCategories.js";

describe("phase one mechanics foundation", () => {
  it("filters gear by shop category metadata", () => {
    const gear = [...loadGear().values()];
    const forgeStock = filterGearByShopCategory(gear, "forge-armoury").map((item) => item.id);
    const brokerStock = filterGearByShopCategory(gear, "contract-broker").map((item) => item.id);
    const shrineStock = filterGearByShopCategory(gear, "medicae-shrine").map((item) => item.id);

    expect(SHOP_CATEGORY_LABELS["forge-armoury"]).toBe("Forge / Armoury");
    expect(forgeStock).toEqual(expect.arrayContaining(["veil-hook", "coffin-rig", "red-march-warbell"]));
    expect(brokerStock).toEqual(expect.arrayContaining(["marshal-seal", "oath-chain-ledger"]));
    expect(shrineStock).toEqual(expect.arrayContaining(["cinder-suture-kit", "saintwire-splint"]));
    expect(getGearShopCategories(loadGear().get("choir-static-censer")!)).toContain("relic-dealer");
  });

  it("defines explicit scenario mode metadata for every scenario", () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.supportedPlayerCounts.min).toBeGreaterThanOrEqual(1);
      expect(scenario.supportedPlayerCounts.max).toBeGreaterThanOrEqual(scenario.supportedPlayerCounts.min);
      expect(scenario.supportedModes.length).toBeGreaterThan(0);
      expect(scenario.publicDisplay.objective).toBeTruthy();
      expect(scenario.publicDisplay.privacy).toBeTruthy();
      expect(scenario.privateMetadata.hiddenAgendaReveal).toMatch(/^(not-implemented|future)$/);
      expect(scenario.victoryCondition).toContain("Earn");
      expect(scenario.lossCondition).toBeTruthy();
    }
  });

  it("keeps stat checks as base plus gear modifier plus temporary modifier plus roll", () => {
    expect(
      calculateSkillTestBreakdown({
        stat: "grit",
        base: 3,
        gearModifier: 1,
        temporaryModifier: 2,
        roll: 4
      })
    ).toEqual({
      stat: "grit",
      base: 3,
      gearModifier: 1,
      temporaryModifier: 2,
      die: 4,
      roll: 4,
      total: 10
    });

    const result = resolveSkillTest(3, 8, { nextInt: () => 3 }, { stat: "grit", gearModifier: 1, temporaryModifier: 0 });

    expect(result).toMatchObject({
      stat: "grit",
      base: 3,
      gearModifier: 1,
      temporaryModifier: 0,
      roll: 4,
      total: 8,
      success: true
    });
  });
});
