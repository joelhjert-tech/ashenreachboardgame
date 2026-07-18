import { z } from "zod";
import { effectSchema } from "./card.schema.js";

export const scarTriggerTypeSchema = z.enum([
  "onScarGained",
  "onTurnStarted",
  "onRoundCompleted",
  "beforeTest",
  "afterTest",
  "onWoundTaken",
  "onMovementResolved",
  "onBattleResolved",
  "onContractResolved",
  "onTrophyGained",
  "onEscalationAdvanced",
  "onScarSuppressed",
  "passive"
]);

export const scarSourceEventSchema = z.object({
  id: z.string().min(1),
  type: scarTriggerTypeSchema,
  seatId: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  stat: z.enum(["command", "grit", "signal", "guile", "forge"]).optional(),
  success: z.boolean().optional()
});

export const pendingScarEffectSchema = z.object({
  effectId: z.string().min(1),
  effect: effectSchema
});

export const pendingScarConsequenceSchema = z.object({
  reactionId: z.string().min(1),
  seatId: z.string().min(1),
  scarInstanceId: z.string().min(1),
  scarCardId: z.string().min(1),
  scarTitle: z.string().min(1),
  triggerType: scarTriggerTypeSchema,
  sourceEventId: z.string().min(1),
  pendingEffects: z.array(pendingScarEffectSchema).min(1),
  createdAt: z.string().min(1),
  status: z.enum(["pending", "resolving"])
});

export type ScarTriggerType = z.infer<typeof scarTriggerTypeSchema>;
export type ScarSourceEvent = z.infer<typeof scarSourceEventSchema>;
export type PendingScarConsequence = z.infer<typeof pendingScarConsequenceSchema>;
