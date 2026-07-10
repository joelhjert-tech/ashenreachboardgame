import { z } from "zod";
import { gearItemSchema } from "./gear.schema.js";
import { followerSchema } from "./follower.schema.js";

export const statSchema = z.enum(["command", "grit", "signal", "guile", "forge"]);

export const statBlockSchema = z.object(
  Object.fromEntries(statSchema.options.map((stat) => [stat, z.number().int().min(0)])) as Record<
    z.infer<typeof statSchema>,
    z.ZodNumber
  >
);

export const statUpgradeSchema = z.object(
  Object.fromEntries(statSchema.options.map((stat) => [stat, z.number().int().min(0).optional()])) as Record<
    z.infer<typeof statSchema>,
    z.ZodOptional<z.ZodNumber>
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
    progress: z.number().int().min(0),
    completedTargetIds: z.array(z.string().min(1)).optional(),
    salvageSpent: z.number().int().min(0).optional()
  })
  .nullable();

export const trophyPileEntrySchema = z.object({
  cardId: z.string().min(1),
  name: z.string().min(1),
  trophyValue: z.number().int().min(0),
  spentValue: z.number().int().min(0).optional(),
  stat: statSchema.optional(),
  cardType: z.string().min(1).optional()
});

export const equippedGearSchema = z.object({
  weapon: z.string().min(1).nullable(),
  armor: z.string().min(1).nullable(),
  utility: z.string().min(1).nullable()
});

export const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  archetype: z.string().min(1),
  qaOnly: z.boolean().optional(),
  currentSpaceId: z.string().min(1),
  status: characterStatusSchema,
  stats: statBlockSchema,
  statUpgrades: statUpgradeSchema.optional(),
  trophies: z.number().int().min(0),
  trophyPile: z.array(trophyPileEntrySchema).optional(),
  salvage: z.number().int().min(0).optional(),
  heat: z.number().int().min(0),
  wounds: z.number().int().min(0),
  scars: z.array(z.string()),
  activeContract: activeContractSchema,
  heldGear: z.array(gearItemSchema),
  equippedGear: equippedGearSchema,
  followers: z.array(followerSchema).optional(),
  startingSalvage: z.number().int().min(0).optional(),
  startingGear: z.array(z.string().min(1)).optional(),
  startingContract: z.string().min(1).optional(),
  startingFollower: z.array(z.string().min(1)).optional(),
  abilities: z.array(abilitySchema)
});

export type Stat = z.infer<typeof statSchema>;
export type StatBlock = z.infer<typeof statBlockSchema>;
export type StatUpgrades = z.infer<typeof statUpgradeSchema>;
export type Ability = z.infer<typeof abilitySchema>;
export type TrophyPileEntry = z.infer<typeof trophyPileEntrySchema>;
export type CharacterStatus = z.infer<typeof characterStatusSchema>;
export type ActiveContract = z.infer<typeof activeContractSchema>;
export type EquippedGear = z.infer<typeof equippedGearSchema>;
export type Character = z.infer<typeof characterSchema>;
