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

export const ownerSelectedForcedDisplacementEffectSchema = z.object({
  type: z.literal("ownerSelectedForcedDisplacement"),
  sourceCardId: z.literal("false-route-procession"),
  distance: z.literal(1),
  ringPolicy: z.literal("sameRing"),
  destinationOwner: z.literal("affectedSeat"),
  noDestinationFallback: z.literal("remainInPlace"),
  failureStillCounts: z.literal(true)
});

export const pendingForcedDestinationChoiceSchema = z.object({
  choiceId: z.string().min(1),
  ownerSeatId: z.string().min(1),
  sourceId: z.literal("false-route-procession"),
  sourceEventId: z.string().min(1),
  sourceResolutionId: z.string().min(1),
  sourceSectorId: z.string().min(1),
  ring: z.enum(["outer", "middle", "inner"]),
  candidates: z.array(z.object({
    sectorId: z.string().min(1),
    direction: z.enum(["clockwise", "counterclockwise"])
  })).min(1).max(2),
  distance: z.literal(1),
  ringPolicy: z.literal("sameRing"),
  destinationOwner: z.literal("affectedSeat"),
  createdAt: z.string().min(1),
  status: z.literal("awaitingChoice")
});

export const pendingDisplacementSchema = z.object({
  reactionId: z.string().min(1),
  seatId: z.string().min(1),
  sourceType: z.literal("threat"),
  sourceId: z.string().min(1),
  sourceEventId: z.string().min(1),
  sourceResolutionId: z.string().min(1),
  sourceChoiceId: z.string().min(1).optional(),
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
export type OwnerSelectedForcedDisplacementEffect = z.infer<typeof ownerSelectedForcedDisplacementEffectSchema>;
export type PendingForcedDestinationChoice = z.infer<typeof pendingForcedDestinationChoiceSchema>;
export type PendingDisplacement = z.infer<typeof pendingDisplacementSchema>;
export type PendingSutureStormConsequence = z.infer<typeof pendingSutureStormConsequenceSchema>;
