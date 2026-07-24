import { z } from "zod";
import { statSchema } from "./character.schema.js";

export const afflictionSeveritySchema = z.number().int().min(1).max(5);

export const afflictionCategorySchema = z.enum([
  "restriction",
  "testPenalty",
  "drawTrigger",
  "battleReaction",
  "mutationBoon",
  "rerollRisk",
  "capacityModifier",
  "immediateStatLoss",
  "immediateStatGain",
  "immediateHeal",
  "pvpReaction",
  "replacementEffect",
  "movementReaction",
  "immediateDraw",
  "battleBonus"
]);

export const afflictionDurationSchema = z.enum([
  "immediate",
  "ongoing",
  "oncePerTurn",
  "oncePerBattle",
  "reaction"
]);

export const afflictionEffectKindSchema = z.enum([
  "restriction",
  "testModifier",
  "drawTrigger",
  "battleReaction",
  "movementReaction",
  "immediateRollTable",
  "immediateStatLoss",
  "immediateHeal",
  "capacityModifier",
  "immediateDraw",
  "mutationBoon",
  "rerollRisk",
  "replacementEffect",
  "pvpReaction",
  "battleBonus"
]);

export const afflictionEffectPayloadSchema = z
  .object({
    cannotUseArmor: z.boolean().optional(),
    cannotUseWeapons: z.boolean().optional(),
    cannotEvadeEnemies: z.boolean().optional(),
    canEvadeEnemies: z.boolean().optional(),
    stat: statSchema.optional(),
    amount: z.number().int().optional(),
    floor: z.number().int().optional(),
    trigger: z.string().min(1).optional(),
    preventWoundOn: z.array(z.number().int().min(1).max(6)).optional(),
    heal: z.number().int().optional(),
    cap: z.enum(["startingHealth", "maxHealth"]).optional(),
    powerLimitModifier: z.number().int().optional(),
    assetLimitModifier: z.number().int().optional(),
    battleWeaponSlotModifier: z.number().int().optional(),
    innateBattleBonus: z.number().int().optional(),
    drawAffliction: z.number().int().min(1).optional(),
    wound: z.number().int().min(1).optional(),
    replacement: z.string().min(1).optional(),
    choices: z.array(statSchema).optional(),
    rollTable: z
      .array(
        z.object({
          min: z.number().int().min(1).max(6),
          max: z.number().int().min(1).max(6),
          stat: statSchema,
          amount: z.number().int()
        })
      )
      .optional(),
    regionRestriction: z.string().min(1).optional(),
    sourceType: z.literal("affliction").optional()
  })
  .passthrough();

export const afflictionCardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  severity: afflictionSeveritySchema,
  category: afflictionCategorySchema,
  duration: afflictionDurationSchema,
  trigger: z.string().min(1),
  rulesText: z.string().min(1),
  effectKind: afflictionEffectKindSchema,
  effectPayload: afflictionEffectPayloadSchema,
  flipFacedownAfterResolve: z.boolean(),
  isFaceupOngoing: z.boolean(),
  implementationNotes: z.string().min(1).optional()
});

export const afflictionInstanceSchema = z.object({
  instanceId: z.string().min(1),
  cardId: z.string().min(1),
  drawnAt: z.string().min(1),
  face: z.enum(["faceup", "facedown"]),
  resolved: z.boolean().default(false)
});

export const afflictionUsageStateSchema = z.object({
  oncePerTurnUsed: z.record(z.string(), z.boolean()).default({}),
  oncePerBattleUsed: z.record(z.string(), z.boolean()).default({}),
  reactionUsed: z.record(z.string(), z.boolean()).default({})
});

export const pendingAfflictionResolutionSchema = z.object({
  id: z.string().min(1),
  ownerSeatId: z.string().min(1),
  sourceCardId: z.string().min(1),
  remainingDraws: z.number().int().min(1),
  status: z.enum(["queued", "awaitingStatChoice"]),
  nextAfflictionId: z.string().min(1).nullable(),
  nextDie: z.number().int().min(1).max(6).nullable(),
  chosenStat: statSchema.nullable().default(null),
  excludedCardIds: z.array(z.string().min(1)).default([]),
  createdAt: z.string().min(1)
}).strict();

export const pendingAfflictionReactionSchema = z.object({
  id: z.string().min(1),
  ownerSeatId: z.string().min(1),
  afflictionId: z.enum(["blood-fury", "future-sickness", "bile-spit"]),
  kind: z.enum(["battleReroll", "turnReroll", "arrivalWound"]),
  sourceEventId: z.string().min(1),
  targetSeatId: z.string().min(1).nullable(),
  originalRoll: z.array(z.number().int().min(1).max(6)).min(1).max(2),
  createdAt: z.string().min(1)
}).strict();

export type AfflictionCard = z.infer<typeof afflictionCardSchema>;
export type AfflictionInstance = z.infer<typeof afflictionInstanceSchema>;
export type AfflictionUsageState = z.infer<typeof afflictionUsageStateSchema>;
export type PendingAfflictionResolution = z.infer<typeof pendingAfflictionResolutionSchema>;
export type PendingAfflictionReaction = z.infer<typeof pendingAfflictionReactionSchema>;
