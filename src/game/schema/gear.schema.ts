import { z } from "zod";

export const gearSlotSchema = z.enum(["weapon", "armor", "utility"]);
export const gearBonusStatSchema = z.enum(["command", "grit", "signal", "guile", "forge"]);

export const gearItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slot: gearSlotSchema,
  statBonus: z.object({
    stat: gearBonusStatSchema,
    amount: z.number().int().positive()
  })
});

export type GearSlot = z.infer<typeof gearSlotSchema>;
export type GearItem = z.infer<typeof gearItemSchema>;
