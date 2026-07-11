import { z } from "zod";
import { tileChallengeSchema } from "./tileChallenge.schema.js";

export const regionTierSchema = z.enum([
  "borderlight",
  "red_march",
  "crownfall",
  "cinder_gate"
]);

export const encounterDecksSchema = z.object({
  threat: z.array(z.string()),
  anomaly: z.array(z.string()),
  contract: z.array(z.string()),
  artifact: z.array(z.string()),
  escalation: z.array(z.string())
});

export const threatIconSchema = z.enum(["red", "blue", "yellow"]);

export const sectorNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  regionTier: regionTierSchema,
  neighbors: z.array(z.string().min(1)),
  danger: z.number().int().min(0).max(10),
  threatIcons: z.array(threatIconSchema).optional(),
  tileChallenges: z.array(tileChallengeSchema).optional(),
  encounterDecks: encounterDecksSchema
});

export const sectorGraphSchema = z.object({
  nodes: z.array(sectorNodeSchema).min(1)
});

export type RegionTier = z.infer<typeof regionTierSchema>;
export type EncounterDecks = z.infer<typeof encounterDecksSchema>;
export type ThreatIcon = z.infer<typeof threatIconSchema>;
export type SectorNode = z.infer<typeof sectorNodeSchema>;
export type SectorGraph = z.infer<typeof sectorGraphSchema>;
