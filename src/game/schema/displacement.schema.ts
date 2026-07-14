import { z } from "zod";

export const forcedDisplacementFallbackSchema = z.object({
  type: z.literal("take_wound"),
  amount: z.literal(1)
});

export const forcedDisplacementEffectSchema = z.object({
  type: z.literal("forcedDisplacement"),
  direction: z.enum(["clockwise", "counterclockwise"]),
  distance: z.literal(1),
  sameRing: z.literal(true),
  fallbackEffect: forcedDisplacementFallbackSchema.optional(),
  failureStillCounts: z.literal(true)
});

export const pendingDisplacementSchema = z.object({
  reactionId: z.string().min(1),
  seatId: z.string().min(1),
  sourceType: z.literal("threat"),
  sourceId: z.string().min(1),
  sourceEventId: z.string().min(1),
  sourceResolutionId: z.string().min(1),
  originSectorId: z.string().min(1),
  destinationSectorId: z.string().min(1),
  direction: z.enum(["clockwise", "counterclockwise"]),
  distance: z.literal(1),
  sameRing: z.literal(true),
  fallbackEffect: forcedDisplacementFallbackSchema.nullable(),
  failureStillCounts: z.literal(true),
  createdAt: z.string().min(1),
  status: z.literal("pending")
});

export const pendingDisplacementArrivalSchema = z.object({
  seatId: z.string().min(1),
  sectorId: z.string().min(1),
  sourceEventId: z.string().min(1)
});

export const pendingSutureStormConsequenceSchema = z.object({
  seatId: z.string().min(1),
  sourceCardId: z.literal("suture-storm"),
  sourceResolutionId: z.string().min(1),
  sourceEventId: z.string().min(1),
  stage: z.enum(["afterInitialWound", "displacement", "fallbackWound"]),
  requestedWounds: z.literal(1),
  preventedWounds: z.number().int().min(0).max(1),
  actualWounds: z.number().int().min(0).max(1),
  resultingWounds: z.number().int().min(0),
  resultingStatus: z.enum(["active", "recalled"]),
  displacement: forcedDisplacementEffectSchema,
  createdAt: z.string().min(1)
});

export type ForcedDisplacementEffect = z.infer<typeof forcedDisplacementEffectSchema>;
export type PendingDisplacement = z.infer<typeof pendingDisplacementSchema>;
export type PendingSutureStormConsequence = z.infer<typeof pendingSutureStormConsequenceSchema>;
