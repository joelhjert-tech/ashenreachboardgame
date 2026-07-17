import { z } from "zod";

export const memoryTaxOptionIdSchema = z.enum([
  "lose-salvage-1",
  "next-non-battle-test-minus-1"
]);

export const pendingMemoryTaxChoiceSchema = z.object({
  choiceId: z.string().min(1),
  choiceVersion: z.number().int().positive(),
  ownerSeatId: z.string().min(1),
  sourceCardId: z.literal("memory-tax-gate"),
  sourceEventId: z.string().min(1),
  sourceResolutionId: z.string().min(1),
  legalOptionIds: z.array(memoryTaxOptionIdSchema).min(1),
  createdAt: z.string().min(1),
  status: z.literal("pending")
});

export type MemoryTaxOptionId = z.infer<typeof memoryTaxOptionIdSchema>;
export type PendingMemoryTaxChoice = z.infer<typeof pendingMemoryTaxChoiceSchema>;
