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
});
