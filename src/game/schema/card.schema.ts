import { z } from "zod";
import { statSchema } from "./character.schema.js";
import { gearItemSchema } from "./gear.schema.js";
import type { GearItem } from "./gear.schema.js";

const cardBaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  flavor: z.string().min(1)
});

type GainHeatEffect = {
  type: "gain_heat";
  amount: number;
};

type LoseHeatEffect = {
  type: "lose_heat";
  amount: number;
};

type TakeWoundEffect = {
  type: "take_wound";
  amount: number;
};

type HealWoundEffect = {
  type: "heal_wound";
  amount: number;
};

type GainScarEffect = {
  type: "gain_scar";
  scarId: string;
};

type GainGearEffect = {
  type: "gain_gear";
  gearId: string;
  gear?: GearItem;
};

type GainNoteEffect = {
  type: "gain_note";
  text: string;
};

type AdvanceScenarioEffect = {
  type: "advance_scenario";
  progressKey: string;
  amount: number;
  summary?: string;
};

type SimpleEncounterEffect =
  | GainHeatEffect
  | LoseHeatEffect
  | TakeWoundEffect
  | HealWoundEffect
  | GainScarEffect
  | GainGearEffect
  | GainNoteEffect
  | AdvanceScenarioEffect;

export type EncounterEffect = SimpleEncounterEffect | { type: "sequence"; effects: EncounterEffect[] };

const simpleEffectSchema: z.ZodType<SimpleEncounterEffect> = z.union([
  z.object({
    type: z.literal("gain_heat"),
    amount: z.number().int().positive()
  }),
  z.object({
    type: z.literal("lose_heat"),
    amount: z.number().int().positive()
  }),
  z.object({
    type: z.literal("take_wound"),
    amount: z.number().int().positive()
  }),
  z.object({
    type: z.literal("heal_wound"),
    amount: z.number().int().positive()
  }),
  z.object({
    type: z.literal("gain_scar"),
    scarId: z.string().min(1)
  }),
  z.object({
    type: z.literal("gain_gear"),
    gearId: z.string().min(1),
    gear: gearItemSchema.optional()
  }),
  z.object({
    type: z.literal("gain_note"),
    text: z.string().min(1)
  }),
  z.object({
    type: z.literal("advance_scenario"),
    progressKey: z.string().min(1),
    amount: z.number().int().positive(),
    summary: z.string().min(1).optional()
  })
]);

export const effectSchema: z.ZodType<EncounterEffect> = z.lazy(() =>
  z.union([
    simpleEffectSchema,
    z.object({
      type: z.literal("sequence"),
      effects: z.array(effectSchema).min(1)
    })
  ])
);

const threatBaseSchema = cardBaseSchema.extend({
  type: z.literal("threat"),
  severity: z.number().int().min(1).max(5),
  stat: statSchema,
  difficulty: z.number().int().min(2).max(12)
});

export const hazardThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("hazard"),
  successEffect: effectSchema,
  failEffect: effectSchema
});

export const enemyThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("enemy"),
  enemyName: z.string().min(1),
  defeatReward: effectSchema,
  woundOnLoss: effectSchema
});

export const threatCardSchema = z.union([
  hazardThreatCardSchema,
  enemyThreatCardSchema
]);

export const anomalyCardSchema = cardBaseSchema.extend({
  type: z.literal("anomaly"),
  instability: z.number().int().min(1).max(5),
  resolutionSummary: z.string().min(1),
  resolveEffect: effectSchema
});

export const artifactCardSchema = cardBaseSchema.extend({
  type: z.literal("artifact"),
  charge: z.number().int().min(0),
  resolutionSummary: z.string().min(1),
  resolveEffect: effectSchema
});

export const scarCardSchema = cardBaseSchema.extend({
  type: z.literal("scar"),
  penalty: z.string().min(1)
});

export const escalationCardSchema = cardBaseSchema.extend({
  type: z.literal("escalation"),
  step: z.number().int().min(1),
  resolutionSummary: z.string().min(1),
  resolveEffect: effectSchema.optional(),
  escalationDelta: z.number().int()
});

export const cardSchema = z.union([
  threatCardSchema,
  anomalyCardSchema,
  artifactCardSchema,
  scarCardSchema,
  escalationCardSchema
]);

export type ThreatCard = z.infer<typeof threatCardSchema>;
export type HazardThreatCard = z.infer<typeof hazardThreatCardSchema>;
export type EnemyThreatCard = z.infer<typeof enemyThreatCardSchema>;
export type AnomalyCard = z.infer<typeof anomalyCardSchema>;
export type ArtifactCard = z.infer<typeof artifactCardSchema>;
export type ScarCard = z.infer<typeof scarCardSchema>;
export type EscalationCard = z.infer<typeof escalationCardSchema>;
export type Card = z.infer<typeof cardSchema>;
