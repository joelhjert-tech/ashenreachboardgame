import { z } from "zod";

export const gearSlotSchema = z.enum(["weapon", "armor", "utility"]);
export const gearBonusStatSchema = z.enum(["command", "grit", "signal", "guile", "forge"]);
export const gearCategorySchema = z.enum([
  "passive",
  "active",
  "consumable",
  "chargedRelic",
  "dangerous",
  "contractObject",
  "followerLinked"
]);
export const gearUseLimitSchema = z.enum(["oncePerTurn", "oncePerRound", "discard", "charge"]);

export const gearItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slot: gearSlotSchema,
  category: gearCategorySchema.optional(),
  statBonus: z.object({
    stat: gearBonusStatSchema,
    amount: z.number().int().positive()
  }),
  activeText: z.string().min(1).optional(),
  useLimit: gearUseLimitSchema.optional(),
  charges: z.number().int().min(0).optional(),
  heatCost: z.number().int().min(0).optional(),
  linkedFollowerRole: z.string().min(1).optional()
});

export type GearSlot = z.infer<typeof gearSlotSchema>;
export type GearCategory = z.infer<typeof gearCategorySchema>;
export type GearItem = z.infer<typeof gearItemSchema>;
