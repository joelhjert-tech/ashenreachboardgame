import { z } from "zod";

export const encounterPaymentResultSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none"), summary: z.string().min(1).optional() }),
  z.object({ type: z.literal("heal_wound"), amount: z.literal(1) }),
  z.object({ type: z.literal("gain_note"), text: z.string().min(1) })
]);

export const encounterPaymentEffectSchema = z.object({
  type: z.literal("encounter_payment"),
  decisionKey: z.string().min(1),
  mode: z.enum(["required", "optional"]),
  prompt: z.string().min(1),
  salvageCost: z.number().int().positive(),
  paidOptionId: z.string().min(1),
  paidLabel: z.string().min(1),
  paidEffect: encounterPaymentResultSchema,
  declineOptionId: z.string().min(1).optional(),
  declineLabel: z.string().min(1).optional(),
  declineEffect: encounterPaymentResultSchema.optional(),
  unavailableEffect: encounterPaymentResultSchema
}).superRefine((effect, context) => {
  const hasDecline = Boolean(effect.declineOptionId || effect.declineLabel || effect.declineEffect);
  if (effect.mode === "optional" && (!effect.declineOptionId || !effect.declineLabel || !effect.declineEffect)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Optional encounter payment requires one explicit free decline option", path: ["declineOptionId"] });
  }
  if (effect.mode === "required" && hasDecline) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Required encounter payment cannot declare a decline option", path: ["declineOptionId"] });
  }
  if (effect.declineOptionId === effect.paidOptionId) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Encounter payment option IDs must be unique", path: ["declineOptionId"] });
  }
});

export const pendingEncounterDecisionSchema = z.object({
  decisionId: z.string().min(1),
  decisionVersion: z.number().int().positive(),
  seatId: z.string().min(1),
  sourceCardId: z.string().min(1),
  sourceResolutionId: z.string().min(1),
  sourceBranch: z.enum(["defeatReward", "woundOnLoss"]),
  decisionKey: z.string().min(1),
  mode: z.enum(["required", "optional"]),
  prompt: z.string().min(1),
  salvageCost: z.number().int().positive(),
  paidOptionId: z.string().min(1),
  paidLabel: z.string().min(1),
  paidEffect: encounterPaymentResultSchema,
  declineOptionId: z.string().min(1).nullable(),
  declineLabel: z.string().min(1).nullable(),
  declineEffect: encounterPaymentResultSchema.nullable(),
  unavailableEffect: encounterPaymentResultSchema,
  legalOptionIds: z.array(z.string().min(1)).min(1),
  createdAt: z.string().min(1),
  status: z.literal("pending")
});

export type EncounterPaymentResult = z.infer<typeof encounterPaymentResultSchema>;
export type EncounterPaymentEffect = z.infer<typeof encounterPaymentEffectSchema>;
export type PendingEncounterDecision = z.infer<typeof pendingEncounterDecisionSchema>;
