import { z } from "zod";
import { effectSchema } from "./card.schema.js";

export const factionGiverSchema = z.enum([
  "Meridian Compact",
  "Glass Choir",
  "Veyr Clans",
  "Kaldr Dominion",
  "Pale Cartels",
  "Umbral Bloom"
]);

const defeatCountObjectiveSchema = z.object({
  type: z.literal("defeatCount"),
  target: z.number().int().min(1)
});

const spaceTextResolvedObjectiveSchema = z.object({
  type: z.literal("spaceTextResolved"),
  effectKey: z.string().min(1),
  label: z.string().min(1),
  target: z.number().int().min(1)
});

export const contractObjectiveSchema = z.discriminatedUnion("type", [
  defeatCountObjectiveSchema,
  spaceTextResolvedObjectiveSchema
]);

export const contractCardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  factionGiver: factionGiverSchema,
  text: z.string().min(1),
  objective: contractObjectiveSchema,
  reward: effectSchema
});

export type FactionGiver = z.infer<typeof factionGiverSchema>;
export type ContractObjective = z.infer<typeof contractObjectiveSchema>;
export type ContractCard = z.infer<typeof contractCardSchema>;
