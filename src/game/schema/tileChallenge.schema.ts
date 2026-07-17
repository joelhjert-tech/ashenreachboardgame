import { z } from "zod";
import {
  authoredEffectSchema,
  effectSchema,
  legacyCompatibleEffectSchema
} from "./card.schema.js";
import { statSchema } from "./character.schema.js";

export const tileChallengeTypeSchema = z.enum(["hazard", "anomaly"]);
export const tileChallengeTriggerSchema = z.enum(["onArrival", "onEnter", "startOfTurnAtSector", "scenarioPrompt"]);

const tileChallengeBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  challengeType: tileChallengeTypeSchema,
  sectorId: z.string().min(1),
  testStat: statSchema,
  difficulty: z.number().int().min(1),
  trigger: tileChallengeTriggerSchema,
  authoredOrder: z.number().int().min(0),
  recurring: z.literal(true),
  tags: z.array(z.string().min(1)),
  lore: z.string().min(1),
  artCardId: z.string().min(1)
});

export const authoredTileChallengeSchema = tileChallengeBaseSchema.extend({
  successEffect: authoredEffectSchema,
  failureEffect: authoredEffectSchema
});

export const tileChallengeSchema = tileChallengeBaseSchema.extend({
  successEffect: effectSchema,
  failureEffect: effectSchema
});

export const legacyCompatibleTileChallengeSchema = tileChallengeBaseSchema.extend({
  successEffect: legacyCompatibleEffectSchema,
  failureEffect: legacyCompatibleEffectSchema
});

const pendingTileChallengeBaseSchema = z.object({
  id: z.string().min(1),
  challengeId: z.string().min(1),
  sectorId: z.string().min(1),
  seatId: z.string().min(1),
  challengeType: tileChallengeTypeSchema,
  testStat: statSchema,
  difficulty: z.number().int().min(1),
  sourceTags: z.array(z.string()),
  authoredOrder: z.number().int().min(0),
  totalChallenges: z.number().int().min(1),
  rolled: z.boolean(),
  modifierSources: z.array(z.object({ label: z.string(), value: z.number().int(), sourceInstanceId: z.string().optional() })).default([]),
  createdAt: z.string().min(1)
});

export const pendingTileChallengeSchema = pendingTileChallengeBaseSchema.extend({
  successEffect: effectSchema,
  failureEffect: effectSchema
});

export const legacyCompatiblePendingTileChallengeSchema = pendingTileChallengeBaseSchema.extend({
  successEffect: legacyCompatibleEffectSchema,
  failureEffect: legacyCompatibleEffectSchema
});

export type TileChallenge = z.infer<typeof tileChallengeSchema>;
export type PendingTileChallenge = z.infer<typeof pendingTileChallengeSchema>;
