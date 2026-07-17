import { z } from "zod";
import {
  authoredEffectSchema,
  effectSchema,
  legacyCompatibleEffectSchema
} from "./card.schema.js";

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

const routeTargetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["spaceId", "tag"]),
  value: z.string().min(1),
  label: z.string().min(1)
});

const multiStopRouteObjectiveSchema = z.object({
  type: z.literal("multiStopRoute"),
  ordered: z.boolean(),
  targets: z.array(routeTargetSchema).min(2).max(4)
});

export const shopTransactionActionSchema = z.enum(["buyEquipment", "sellGear", "repairGear", "upgradeGear", "trade"]);

const shopTransactionObjectiveSchema = z.object({
  type: z.literal("shopTransaction"),
  action: shopTransactionActionSchema,
  requiredShopType: z.string().min(1).optional(),
  requiredSectorId: z.string().min(1).optional(),
  requiredCount: z.number().int().min(1),
  minimumSalvageSpent: z.number().int().min(1).optional(),
  label: z.string().min(1)
});

const tileChallengeResolvedObjectiveSchema = z.object({
  type: z.literal("tileChallengeResolved"),
  challengeId: z.string().min(1).optional(),
  sectorId: z.string().min(1).optional(),
  challengeType: z.enum(["hazard", "anomaly"]).optional(),
  challengeTag: z.string().min(1).optional(),
  requireSuccess: z.boolean().optional(),
  target: z.number().int().min(1),
  label: z.string().min(1)
});

export const contractObjectiveSchema = z.discriminatedUnion("type", [
  defeatCountObjectiveSchema,
  spaceTextResolvedObjectiveSchema,
  multiStopRouteObjectiveSchema,
  shopTransactionObjectiveSchema,
  tileChallengeResolvedObjectiveSchema
]);

const contractCardBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  factionGiver: factionGiverSchema,
  text: z.string().min(1),
  objective: contractObjectiveSchema
});

export const authoredContractCardSchema = contractCardBaseSchema.extend({
  reward: authoredEffectSchema
});

export const contractCardSchema = contractCardBaseSchema.extend({
  reward: effectSchema
});

export const legacyCompatibleContractCardSchema = contractCardBaseSchema.extend({
  reward: legacyCompatibleEffectSchema
});

export type FactionGiver = z.infer<typeof factionGiverSchema>;
export type ContractObjective = z.infer<typeof contractObjectiveSchema>;
export type ContractCard = z.infer<typeof contractCardSchema>;
export type LegacyCompatibleContractCard = z.infer<typeof legacyCompatibleContractCardSchema>;
