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
export const activeContractEntrySchema = z.object({
  contractId: z.string().min(1),
  progress: z.number().int().min(0),
  completedTargetIds: z.array(z.string().min(1)).optional(),
  salvageSpent: z.number().int().min(0).optional()
});
export const activeContractSchema = activeContractEntrySchema.nullable();

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

export const completedMissionRecordSchema = z.object({
  missionId: z.string().min(1),
  completedByPlayerId: z.string().min(1),
  completedAtSequence: z.number().int().min(0),
  rewardGranted: z.boolean(),
  spent: z.boolean(),
  spentFor: z.string().min(1).optional()
}).strict();

const completedMissionRecordsSchema = z.array(completedMissionRecordSchema).superRefine((records, context) => {
  const missionIds = new Set<string>();
  const sequences = new Set<number>();
  records.forEach((record, index) => {
    if (missionIds.has(record.missionId)) context.addIssue({ code: "custom", path: [index, "missionId"], message: "Completed Contract IDs must be unique" });
    if (sequences.has(record.completedAtSequence)) context.addIssue({ code: "custom", path: [index, "completedAtSequence"], message: "Completed Contract sequence values must be unique" });
    if (record.spent !== Boolean(record.spentFor)) context.addIssue({ code: "custom", path: [index, "spentFor"], message: "Spent Missions require a spending purpose; unspent Missions cannot have one" });
    missionIds.add(record.missionId);
    sequences.add(record.completedAtSequence);
  });
});

const characterFields = {
  id: z.string().min(1),
  name: z.string().min(1),
  archetype: z.string().min(1),
  lore: z.string().min(1).optional(),
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
  /**
   * Canonical multi-Mission state. `activeContract` remains the first-entry
   * compatibility mirror for version-2 snapshots and older presentation code.
   */
  activeContracts: z.array(activeContractEntrySchema).max(3).optional(),
  completedContracts: z.array(z.string().min(1)).optional(),
  completedMissionRecords: completedMissionRecordsSchema.optional(),
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
export type ActiveContractEntry = z.infer<typeof activeContractEntrySchema>;
export type ActiveContract = z.infer<typeof activeContractSchema>;
export type CompletedMissionRecord = z.infer<typeof completedMissionRecordSchema>;
export type EquippedGear = z.infer<typeof equippedGearSchema>;
export type EquippedGearInstances = z.infer<typeof equippedGearInstancesSchema>;
export type Character = z.infer<typeof characterSchema>;
export type LegacyCharacterV0 = z.infer<typeof legacyCharacterSchemaV0>;
export type LegacyCompatibleCharacter = z.infer<typeof legacyCompatibleCharacterSchema>;
export type AuthoredCharacter = z.infer<typeof authoredCharacterSchema>;
