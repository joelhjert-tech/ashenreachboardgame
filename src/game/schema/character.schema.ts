import { z } from "zod";
import { gearItemSchema } from "./gear.schema.js";

export const statSchema = z.enum(["command", "grit", "signal", "guile", "forge"]);

export const statBlockSchema = z.object(
  Object.fromEntries(statSchema.options.map((stat) => [stat, z.number().int().min(0)])) as Record<
    z.infer<typeof statSchema>,
    z.ZodNumber
  >
);

export const abilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  text: z.string().min(1)
});

export const characterStatusSchema = z.enum(["active", "recalled"]);
export const activeContractSchema = z
  .object({
    contractId: z.string().min(1),
    progress: z.number().int().min(0)
  })
  .nullable();

export const equippedGearSchema = z.object({
  weapon: z.string().min(1).nullable(),
  armor: z.string().min(1).nullable(),
  utility: z.string().min(1).nullable()
});

export const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  archetype: z.string().min(1),
  currentSpaceId: z.string().min(1),
  status: characterStatusSchema,
  stats: statBlockSchema,
  trophies: z.number().int().min(0),
  heat: z.number().int().min(0),
  wounds: z.number().int().min(0),
  scars: z.array(z.string()),
  activeContract: activeContractSchema,
  heldGear: z.array(gearItemSchema),
  equippedGear: equippedGearSchema,
  abilities: z.array(abilitySchema)
});

export type Stat = z.infer<typeof statSchema>;
export type StatBlock = z.infer<typeof statBlockSchema>;
export type Ability = z.infer<typeof abilitySchema>;
export type CharacterStatus = z.infer<typeof characterStatusSchema>;
export type ActiveContract = z.infer<typeof activeContractSchema>;
export type EquippedGear = z.infer<typeof equippedGearSchema>;
export type Character = z.infer<typeof characterSchema>;
