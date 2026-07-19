import { z } from "zod";
import { effectSchema, scarRuleKeySchema, scarSourceSchema } from "./card.schema.js";

export const scarDecksSchema = z.object({
  flesh: z.array(z.string().min(1)),
  mind: z.array(z.string().min(1)),
  machine: z.array(z.string().min(1)),
  rift: z.array(z.string().min(1)),
  unbound: z.array(z.string().min(1))
}).strict();

export const pendingScarChoiceSchema = z.object({
  selectionId: z.string().min(1),
  ownerSeatId: z.string().min(1),
  source: scarSourceSchema,
  sourceCardId: z.string().min(1),
  sourceEventId: z.string().min(1),
  candidateIds: z.array(z.string().min(1)).length(2),
  continuationPhase: z.enum(["navigation", "sector", "action", "resolution", "broadcast"]),
  createdAt: z.string().min(1),
  status: z.literal("awaitingSelection")
}).strict();

export const scarUsageEntrySchema = z.object({
  usageId: z.string().min(1),
  seatId: z.string().min(1),
  scarId: z.string().min(1),
  ruleKey: scarRuleKeySchema,
  scope: z.enum(["turn", "round", "battle", "visit", "game"]),
  scopeId: z.string().min(1),
  sourceEventId: z.string().min(1),
  createdAt: z.string().min(1)
}).strict();

export const pendingScarThresholdSchema = z.object({
  seatId: z.string().min(1),
  selectionId: z.string().min(1),
  scarIds: z.array(z.string().min(1)).min(3),
  policy: z.enum(["retire", "transform", "custom"]),
  status: z.literal("queued"),
  createdAt: z.string().min(1)
}).strict();

export const scarRemovalChoiceSchema = z.object({
  choiceId: z.string().min(1),
  ownerSeatId: z.string().min(1),
  sectorId: z.literal("middle_scar_surgery"),
  visitId: z.string().min(1),
  scarIds: z.array(z.string().min(1)).min(1),
  salvageCost: z.literal(4),
  createdAt: z.string().min(1)
}).strict();

export const scarRuleOutcomeSchema = z.object({
  modifier: z.number().int().optional(),
  difficultyModifier: z.number().int().optional(),
  contributionModifier: z.number().int().optional(),
  serviceSurcharge: z.number().int().min(0).optional(),
  displacementDistanceModifier: z.number().int().optional(),
  blocksAssistance: z.boolean().optional(),
  blocksEffect: z.boolean().optional(),
  sealedOptionIndex: z.number().int().min(0).optional(),
  effect: effectSchema.optional(),
  summary: z.string().min(1)
}).strict();

export type PendingScarChoice = z.infer<typeof pendingScarChoiceSchema>;
export type ScarDecks = z.infer<typeof scarDecksSchema>;
export type ScarUsageEntry = z.infer<typeof scarUsageEntrySchema>;
export type PendingScarThreshold = z.infer<typeof pendingScarThresholdSchema>;
export type ScarRemovalChoice = z.infer<typeof scarRemovalChoiceSchema>;
export type ScarRuleOutcome = z.infer<typeof scarRuleOutcomeSchema>;
