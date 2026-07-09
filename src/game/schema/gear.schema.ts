import { z } from "zod";

export const gearSlotSchema = z.enum(["weapon", "armor", "utility"]);
export const gearBonusStatSchema = z.enum(["command", "grit", "signal", "guile", "forge"]);
export const gearTierSchema = z.enum(["starter", "standard", "advanced", "artifact"]);
export const gearTimingWindowSchema = z.enum([
  "beforeThreatDraw",
  "beforeBattleRoll",
  "afterBattleRoll",
  "beforeTakingDamage",
  "startOfTurn",
  "movement",
  "shop",
  "anyTime"
]);
export const gearCategorySchema = z.enum([
  "passive",
  "active",
  "consumable",
  "chargedRelic",
  "dangerous",
  "contractObject",
  "followerLinked"
]);
export const shopCategorySchema = z.enum([
  "forge-armoury",
  "market",
  "medicae-shrine",
  "relic-dealer",
  "contract-broker"
]);
export const gearUseLimitSchema = z.enum(["oncePerTurn", "oncePerRound", "discard", "charge"]);

export const gearItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slot: gearSlotSchema,
  category: gearCategorySchema.optional(),
  shopCategories: z.array(shopCategorySchema).min(1).optional(),
  statBonus: z.object({
    stat: gearBonusStatSchema,
    amount: z.number().int().positive()
  }),
  cost: z.number().int().min(0).optional(),
  sellValue: z.number().int().min(0).optional(),
  sellable: z.boolean().optional(),
  tier: gearTierSchema.optional(),
  progressionWeight: z.number().min(0).optional(),
  flavor: z.string().min(1).optional(),
  timingWindows: z.array(gearTimingWindowSchema).optional(),
  exhausted: z.boolean().optional(),
  activeText: z.string().min(1).optional(),
  useLimit: gearUseLimitSchema.optional(),
  charges: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(0).optional(),
  heatCost: z.number().int().min(0).optional(),
  linkedFollowerRole: z.string().min(1).optional()
});

export type GearSlot = z.infer<typeof gearSlotSchema>;
export type GearCategory = z.infer<typeof gearCategorySchema>;
export type ShopCategory = z.infer<typeof shopCategorySchema>;
export type GearTier = z.infer<typeof gearTierSchema>;
export type GearTimingWindow = z.infer<typeof gearTimingWindowSchema>;
export type GearItem = z.infer<typeof gearItemSchema>;
