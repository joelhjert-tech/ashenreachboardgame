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

  it("accepts Scar-Sink Prayer only as a no-recharge pending-Scar charged Artifact", () => {
    const prayer = {
      ...base,
      id: "heat-sink-prayer",
      name: "Scar-Sink Prayer",
      tier: "artifact",
      category: "chargedRelic",
      useLimit: "charge",
      effectModel: "charged",
      requiresEquipped: true,
      activationTiming: ["pendingScarConsequence"],
      maxCharges: 2,
      startingCharges: 2,
      chargeCost: 1,
      rechargeRule: "none",
      chargedEffect: "scarSinkPrayer"
    } as const;
    expect(gearItemSchema.safeParse(prayer).success).toBe(true);
    expect(gearItemSchema.safeParse({ ...prayer, rechargeRule: "round" }).success).toBe(false);
    expect(gearItemSchema.safeParse({ ...prayer, name: "Heat-Sink Prayer" }).success).toBe(false);
  });

  it("accepts Oathchain Lens only as an action-phase information charged Artifact", () => {
    const lens = { ...base, id: "oathchain-lens", tier: "artifact", category: "chargedRelic", useLimit: "charge", effectModel: "charged", requiresEquipped: true, activationTiming: ["action"], maxCharges: 2, startingCharges: 2, chargeCost: 1, rechargeRule: "none", chargedEffect: "traceThePromise", activeText: "Trace currently visible Contract targets without changing progress or legality." } as const;
    expect(gearItemSchema.safeParse(lens).success).toBe(true);
    expect(gearItemSchema.safeParse({ ...lens, activationTiming: ["shop"] }).success).toBe(false);
    expect(gearItemSchema.safeParse({ ...lens, rechargeRule: undefined }).success).toBe(false);
  });

  it("accepts Route Star only as a no-recharge authoritative route selector", () => {
    const star = { ...base, id: "route-star", tier: "artifact", category: "chargedRelic", useLimit: "charge", effectModel: "charged", requiresEquipped: true, activationTiming: ["movementRouteConfirmation"], maxCharges: 2, startingCharges: 2, chargeCost: 1, rechargeRule: "none", chargedEffect: "selectAuthoritativeRouteVariant", activeText: "Choose one server-authorized route variant without changing movement distance or legality." } as const;
    expect(gearItemSchema.safeParse(star).success).toBe(true);
    expect(gearItemSchema.safeParse({ ...star, activationTiming: ["movement"] }).success).toBe(false);
    expect(gearItemSchema.safeParse({ ...star, rechargeRule: undefined }).success).toBe(false);
  });
});
