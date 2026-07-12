import { describe, expect, it } from "vitest";
import { gearItemSchema } from "../gear.schema.js";

const base = {
  id: "test-item", name: "Test Item", slot: "weapon", category: "passive",
  statBonus: { stat: "grit", amount: 1 }, tier: "standard"
} as const;

describe("gear effect model schema", () => {
  it("accepts explicit permanent and conditional passive definitions", () => {
    expect(gearItemSchema.safeParse({ ...base, effectModel: "permanent", requiresEquipped: true }).success).toBe(true);
    expect(gearItemSchema.safeParse({ ...base, effectModel: "conditional", requiresEquipped: true, conditionType: "battle" }).success).toBe(true);
  });

  it("rejects missing equipped declarations, missing conditions, and Artifact charge mechanics on Equipment", () => {
    expect(gearItemSchema.safeParse({ ...base, effectModel: "permanent" }).success).toBe(false);
    expect(gearItemSchema.safeParse({ ...base, effectModel: "conditional", requiresEquipped: true }).success).toBe(false);
    expect(gearItemSchema.safeParse({ ...base, useLimit: "charge", charges: 1 }).success).toBe(false);
  });

  it("requires explicit timing, typed effect, and successful-use consumption for consumables", () => {
    expect(gearItemSchema.safeParse({ ...base, category: "consumable", effectModel: "consumable", activationTiming: ["anyTime"], consumeOnUse: true, consumableEffect: "healWound", useLimit: "discard" }).success).toBe(true);
    expect(gearItemSchema.safeParse({ ...base, effectModel: "consumable", consumeOnUse: true, consumableEffect: "healWound" }).success).toBe(false);
    expect(gearItemSchema.safeParse({ ...base, effectModel: "consumable", activationTiming: ["anyTime"], consumeOnUse: false, consumableEffect: "healWound" }).success).toBe(false);
  });

  it("accepts the bounded Void Key charge model and rejects it on normal Equipment", () => {
    const charged = { ...base, tier: "artifact", category: "chargedRelic", useLimit: "charge", effectModel: "charged", requiresEquipped: true, activationTiming: ["movementRouteConfirmation"], maxCharges: 2, startingCharges: 2, chargeCost: 1, rechargeRule: "none", chargedEffect: "personalGateOverride" } as const;
    expect(gearItemSchema.safeParse(charged).success).toBe(true);
    expect(gearItemSchema.safeParse({ ...charged, tier: "standard" }).success).toBe(false);
    expect(gearItemSchema.safeParse({ ...charged, startingCharges: 3 }).success).toBe(false);
  });

  it("accepts the Ashen Route Compass movement-adjustment charge model", () => {
    expect(gearItemSchema.safeParse({ ...base, tier: "artifact", category: "chargedRelic", useLimit: "charge", effectModel: "charged", requiresEquipped: true, activationTiming: ["movement"], maxCharges: 2, startingCharges: 2, chargeCost: 1, rechargeRule: "none", chargedEffect: "movementAdjustment" }).success).toBe(true);
  });

  it("accepts Static Intercession only as a no-recharge charged Artifact", () => {
    const censer = {
      ...base,
      id: "choir-static-censer",
      tier: "artifact",
      category: "chargedRelic",
      useLimit: "charge",
      effectModel: "charged",
      requiresEquipped: true,
      activationTiming: ["afterFailedTest"],
      maxCharges: 2,
      startingCharges: 2,
      chargeCost: 1,
      rechargeRule: "none",
      chargedEffect: "staticIntercession"
    } as const;
    expect(gearItemSchema.safeParse(censer).success).toBe(true);
    expect(gearItemSchema.safeParse({ ...censer, rechargeRule: "round" }).success).toBe(false);
    expect(gearItemSchema.safeParse({ ...censer, effectModel: "exhaust" }).success).toBe(false);
  });
});
