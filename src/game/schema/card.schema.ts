import { z } from "zod";
import { statSchema } from "./character.schema.js";
import { gearItemSchema } from "./gear.schema.js";
import type { GearItem } from "./gear.schema.js";

const followerGrantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["scout", "medic", "gunner", "ritualist", "porter", "guide", "informant"]),
  text: z.string().min(1),
  loyalty: z.number().int().min(0).max(5).optional(),
  lossCondition: z.enum(["wound", "heat", "combatLoss", "choice"]).optional()
});

type FollowerGrant = z.infer<typeof followerGrantSchema>;

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

type GainHeatAllEffect = {
  type: "gain_heat_all";
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

type GainTrophyEffect = {
  type: "gain_trophy";
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

type GainFollowerEffect = {
  type: "gain_follower";
  followerId: string;
  follower?: FollowerGrant;
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

type AdvanceEscalationEffect = {
  type: "advance_escalation";
  amount: number;
};

type SimpleEncounterEffect =
  | GainHeatEffect
  | GainHeatAllEffect
  | LoseHeatEffect
  | TakeWoundEffect
  | HealWoundEffect
  | GainTrophyEffect
  | GainScarEffect
  | GainGearEffect
  | GainFollowerEffect
  | GainNoteEffect
  | AdvanceScenarioEffect
  | AdvanceEscalationEffect;

export type EncounterEffect = SimpleEncounterEffect | { type: "sequence"; effects: EncounterEffect[] };

const simpleEffectSchema: z.ZodType<SimpleEncounterEffect> = z.union([
  z.object({
    type: z.literal("gain_heat"),
    amount: z.number().int().positive()
  }),
  z.object({
    type: z.literal("gain_heat_all"),
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
    type: z.literal("gain_trophy"),
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
    type: z.literal("gain_follower"),
    followerId: z.string().min(1),
    follower: followerGrantSchema.optional()
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
  }),
  z.object({
    type: z.literal("advance_escalation"),
    amount: z.number().int()
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

export const threatFamilySchema = z.enum([
  "human",
  "choir",
  "cartel",
  "machine",
  "beast",
  "vermin",
  "breachborn",
  "revenant",
  "bureaucracy",
  "hazard"
]);

const threatBaseSchema = cardBaseSchema.extend({
  type: z.literal("threat"),
  severity: z.number().int().min(1).max(5),
  enemyFamily: threatFamilySchema.optional(),
  region: z.enum(["outer", "middle", "inner", "center", "global"]).optional(),
  stat: statSchema,
  difficulty: z.number().int().min(2).max(12),
  effectKey: z.string().min(1).optional(),
  revealEffectKey: z.string().min(1).optional(),
  combatEffectKeys: z.array(z.string().min(1)).optional(),
  successEffectKey: z.string().min(1).optional(),
  defeatEffectKey: z.string().min(1).optional(),
  failEffectKey: z.string().min(1).optional()
});

export const hazardThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("hazard"),
  successEffect: effectSchema,
  failEffect: effectSchema
});

export const enemyThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("enemy"),
  enemyName: z.string().min(1),
  trophyValue: z.number().int().min(0),
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
  regionHint: z.enum(["outer", "middle", "inner", "global"]).optional(),
  resolutionSummary: z.string().min(1),
  resolveEffect: effectSchema
});

export const artifactKindSchema = z.enum([
  "chargedRelic",
  "gateRelic",
  "cursedRelic",
  "factionRelic",
  "consumableSalvage",
  "burdenRelic"
]);

export const artifactCardSchema = cardBaseSchema.extend({
  type: z.literal("artifact"),
  artifactKind: artifactKindSchema.optional(),
  charge: z.number().int().min(0),
  resolutionSummary: z.string().min(1),
  resolveEffect: effectSchema
});

export const scarCardSchema = cardBaseSchema.extend({
  type: z.literal("scar"),
  trigger: z.string().min(1),
  penalty: z.string().min(1),
  effect: effectSchema,
  relief: z.string().min(1),
  upside: z.string().min(1).optional()
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
export type ThreatFamily = z.infer<typeof threatFamilySchema>;
export type HazardThreatCard = z.infer<typeof hazardThreatCardSchema>;
export type EnemyThreatCard = z.infer<typeof enemyThreatCardSchema>;
export type AnomalyCard = z.infer<typeof anomalyCardSchema>;
export type ArtifactCard = z.infer<typeof artifactCardSchema>;
export type ScarCard = z.infer<typeof scarCardSchema>;
export type EscalationCard = z.infer<typeof escalationCardSchema>;
export type Card = z.infer<typeof cardSchema>;
