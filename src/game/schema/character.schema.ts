import { z } from "zod";
import {
  gearItemSchema,
  legacyCompatibleGearItemSchema,
  normalizeLegacyGearItem
} from "./gear.schema.js";
import {
  followerSchema,
  legacyCompatibleFollowerSchema,
  normalizeLegacyFollowerMetadata
} from "./follower.schema.js";

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

export const equippedGearInstancesSchema = z.object({
  weapon: z.string().min(1).nullable(),
  armor: z.string().min(1).nullable(),
  utility: z.string().min(1).nullable()
});

const characterFields = {
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
  temporaryAllStatBoost: z.object({ value: z.number().int().positive(), remainingEligibleResolutions: z.number().int().min(0) }).optional(),
  wounds: z.number().int().min(0),
  scars: z.array(z.string()),
  activeContract: activeContractSchema,
  completedContracts: z.array(z.string().min(1)).optional(),
  heldGear: z.array(gearItemSchema),
  equippedGear: equippedGearSchema,
  equippedGearInstances: equippedGearInstancesSchema.optional(),
  followers: z.array(followerSchema).optional(),
  startingSalvage: z.number().int().min(0).optional(),
  startingGear: z.array(z.string().min(1)).optional(),
  startingContract: z.string().min(1).optional(),
  startingFollower: z.array(z.string().min(1)).optional(),
  abilities: z.array(abilitySchema)
};

/** Current authoritative runtime characters are deliberately Heat-free. */
export const characterSchema = z.object(characterFields).strict();

/** Strict parser for unversioned persisted snapshots created before Phase 1P. */
export const legacyCharacterSchemaV0 = z.object({
  ...characterFields,
  heldGear: z.array(legacyCompatibleGearItemSchema),
  followers: z.array(legacyCompatibleFollowerSchema).optional(),
  heat: z.number().int().min(0)
}).strict();

export const legacyCompatibleCharacterSchema = z.object({
  ...characterFields,
  heldGear: z.array(legacyCompatibleGearItemSchema),
  followers: z.array(legacyCompatibleFollowerSchema).optional(),
  heat: z.number().int().min(0).optional()
}).strict();

export function normalizeLegacyCharacter(
  character: z.infer<typeof legacyCompatibleCharacterSchema>
): z.infer<typeof characterSchema> {
  const { heat: _retiredHeat, ...current } = character;
  return characterSchema.parse({
    ...current,
    heldGear: current.heldGear.map(normalizeLegacyGearItem),
    followers: current.followers?.map(normalizeLegacyFollowerMetadata)
  });
}

// Canonical content definitions deliberately exclude persisted compatibility
// state. Runtime/session characters continue to use characterSchema below.
export const authoredCharacterSchema = z.object(characterFields).strict();

export type Stat = z.infer<typeof statSchema>;
export type StatBlock = z.infer<typeof statBlockSchema>;
export type StatUpgrades = z.infer<typeof statUpgradeSchema>;
export type Ability = z.infer<typeof abilitySchema>;
export type TrophyPileEntry = z.infer<typeof trophyPileEntrySchema>;
export type CharacterStatus = z.infer<typeof characterStatusSchema>;
export type ActiveContract = z.infer<typeof activeContractSchema>;
export type EquippedGear = z.infer<typeof equippedGearSchema>;
export type EquippedGearInstances = z.infer<typeof equippedGearInstancesSchema>;
export type Character = z.infer<typeof characterSchema>;
export type LegacyCharacterV0 = z.infer<typeof legacyCharacterSchemaV0>;
export type LegacyCompatibleCharacter = z.infer<typeof legacyCompatibleCharacterSchema>;
export type AuthoredCharacter = z.infer<typeof authoredCharacterSchema>;
