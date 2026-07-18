import { describe, expect, it } from "vitest";
import type { GearItem } from "../../src/game/schema/gear.schema.js";
import {
  PASSIVE_EQUIPMENT_DEFERRALS,
  validatePassiveEquipmentCatalog,
  validatePassiveEquipmentItem,
  type PassiveEquipmentDeferral
} from "../passive-equipment-validation.js";

const base: GearItem = {
  id: "test-passive",
  name: "Test Passive",
  slot: "armor",
  category: "passive",
  tier: "standard",
  normalShopCommon: true,
  statBonus: { stat: "grit", amount: 1 },
  effectModel: "permanent",
  requiresEquipped: true
};

const catalog = (...items: GearItem[]) => new Map(items.map((item) => [item.id, item]));

describe("passive Equipment catalog guard", () => {
  it("accepts valid permanent, conditional, equipped-only, deferred, and non-passive records", () => {
    expect(validatePassiveEquipmentItem(base, new Set())).toEqual([]);
    expect(validatePassiveEquipmentItem({ ...base, id: "battle", effectModel: "conditional", conditionType: "battle" }, new Set())).toEqual([]);
    expect(validatePassiveEquipmentItem({ ...base, id: "deferred", effectModel: undefined }, new Set(["deferred"]))).toEqual([]);
    expect(validatePassiveEquipmentItem({ ...base, id: "active", category: "active", effectModel: undefined }, new Set())).toEqual([]);
  });

  it("rejects missing equipped state, typed modifiers, and conditional context", () => {
    expect(validatePassiveEquipmentItem({ ...base, requiresEquipped: false }, new Set())).toEqual([
      expect.stringContaining("requiresEquipped is not true")
    ]);
    expect(validatePassiveEquipmentItem({ ...base, statBonus: { stat: "grit", amount: 0 } }, new Set())).toEqual([
      expect.stringContaining("valid typed statBonus")
    ]);
    expect(validatePassiveEquipmentItem({ ...base, effectModel: "conditional", conditionType: undefined }, new Set())).toEqual([
      expect.stringContaining("without conditionType")
    ]);
    expect(validatePassiveEquipmentItem({ ...base, effectModel: "conditional", conditionType: "hazard" as never }, new Set())).toEqual([
      expect.stringContaining("unsupported conditionType hazard")
    ]);
  });

  it("rejects Artifact-only models and contradictory activation fields on normal passive Equipment", () => {
    expect(validatePassiveEquipmentItem({ ...base, effectModel: "charged" }, new Set())).toEqual([
      expect.stringContaining("Artifact-only effect model charged")
    ]);
    expect(validatePassiveEquipmentItem({ ...base, activationTiming: ["anyTime"] }, new Set())).toEqual([
      expect.stringContaining("activation-only fields")
    ]);
  });

  it("requires undeclared passives to use an exact deferral ID", () => {
    const undeclared = { ...base, effectModel: undefined };
    expect(validatePassiveEquipmentItem(undeclared, new Set())).toEqual([
      expect.stringContaining("without effectModel")
    ]);
    expect(validatePassiveEquipmentItem(undeclared, new Set(["test-*", "other"]))).not.toEqual([]);
  });

  it("rejects missing, duplicate, and obsolete deferral entries", () => {
    const legacy = { ...base, id: "legacy", effectModel: undefined };
    const deferral = (id: string): PassiveEquipmentDeferral => ({ id, reason: "test", futurePhase: "test", compatibility: "legacy" });
    expect(validatePassiveEquipmentCatalog(catalog(legacy), [deferral("missing")])).toContainEqual(expect.stringContaining("missing catalog ID missing"));
    expect(validatePassiveEquipmentCatalog(catalog(legacy), [deferral("legacy"), deferral("legacy")])).toContainEqual(expect.stringContaining("repeats ID legacy"));
    expect(validatePassiveEquipmentCatalog(catalog(base), [deferral(base.id)])).toContainEqual(expect.stringContaining("is obsolete"));
  });

  it("keeps the canonical deferral list unique and removable item by item", () => {
    expect(PASSIVE_EQUIPMENT_DEFERRALS).toHaveLength(16);
    expect(new Set(PASSIVE_EQUIPMENT_DEFERRALS.map(({ id }) => id)).size).toBe(16);
    expect(PASSIVE_EQUIPMENT_DEFERRALS.every(({ reason, futurePhase }) => reason.length > 0 && futurePhase.length > 0)).toBe(true);
  });
});
