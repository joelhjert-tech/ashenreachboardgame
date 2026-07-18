import { z } from "zod";
import { statSchema } from "./character.schema.js";
import { gearItemSchema, legacyCompatibleGearItemSchema } from "./gear.schema.js";
import type { GearItem } from "./gear.schema.js";
import { followerSchema, legacyCompatibleFollowerSchema } from "./follower.schema.js";
import { encounterPaymentEffectSchema, type EncounterPaymentEffect } from "./encounterDecision.schema.js";
import { forcedDisplacementEffectSchema, ownerSelectedForcedDisplacementEffectSchema, type ForcedDisplacementEffect, type OwnerSelectedForcedDisplacementEffect } from "./displacement.schema.js";
import {
  CANONICAL_THREAT_EFFECT_KEYS,
  LEGACY_HEAT_THREAT_EFFECT_KEYS
} from "../cards/threatEffectKeys.js";

const followerGrantSchema = followerSchema;
const legacyCompatibleFollowerGrantSchema = legacyCompatibleFollowerSchema;

type FollowerGrant = z.infer<typeof followerGrantSchema>;

const cardBaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  flavor: z.string().min(1)
});

export type GainHeatEffect = {
  type: "gain_heat";
  amount: number;
};

export type GainHeatAllEffect = {
  type: "gain_heat_all";
  amount: number;
};

export type LoseHeatEffect = {
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

type GainSalvageEffect = {
  type: "gain_salvage";
  amount: number;
};

type LoseSalvageEffect = {
  type: "lose_salvage";
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

type DrawArtifactEffect = {
  type: "draw_artifact";
};

type ConsumeArtifactEffect = {
  type: "consume_artifact";
  artifactId: string;
  sourceSectorId?: string;
};

type GainFollowerEffect = {
  type: "gain_follower";
  followerId: string;
  follower?: FollowerGrant;
};

type LegacyCompatibleGainGearEffect = Omit<GainGearEffect, "gear"> & {
  gear?: z.infer<typeof legacyCompatibleGearItemSchema>;
};

type LegacyCompatibleGainFollowerEffect = Omit<GainFollowerEffect, "follower"> & {
  follower?: z.infer<typeof legacyCompatibleFollowerGrantSchema>;
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

type GuardedEscalationEffect = {
  type: "gain_global_escalation_guarded";
  sourceCardId: "gateblind-pulse";
  amount: 1;
  guard: "oneBeforeCollapse";
};

type ReturnThreatToSpaceEffect = {
  type: "return_threat_to_space";
  threatId?: string;
  sourceSectorId?: string;
};

type NextNonBattleTestModifierEffect = {
  type: "next_non_battle_test_modifier";
  amount: -1;
  sourceCardId: "glass-chime-swarm";
} | {
  type: "next_non_battle_test_modifier";
  amount: -1 | 1;
  sourceCardId: "siren-relay-echo";
  stat: "command";
  context: "nonBattleTest";
};

type NextNormalMovementRollModifierEffect = {
  type: "next_normal_movement_roll_modifier";
  amount: -1;
  minimumResult: 1;
  sourceCardId: "spindle-static-squall";
};

type EquipmentSuppressionEffect = {
  type: "equipment_suppression";
  sourceCardId: "relay-husk" | "signal-rotted-engineer";
  mode: "throughNextThreat" | "duringNextBattle";
};

type MemoryTaxChoiceEffect = {
  type: "memory_tax_choice";
  sourceCardId: "memory-tax-gate";
};

type AuthoredSimpleEncounterEffect =
  | TakeWoundEffect
  | HealWoundEffect
  | GainTrophyEffect
  | GainSalvageEffect
  | LoseSalvageEffect
  | GainScarEffect
  | GainGearEffect
  | DrawArtifactEffect
  | ConsumeArtifactEffect
  | GainFollowerEffect
  | GainNoteEffect
  | AdvanceScenarioEffect
  | AdvanceEscalationEffect
  | GuardedEscalationEffect
  | ReturnThreatToSpaceEffect
  | NextNonBattleTestModifierEffect
  | NextNormalMovementRollModifierEffect
  | EquipmentSuppressionEffect
  | MemoryTaxChoiceEffect
  | EncounterPaymentEffect
  | ForcedDisplacementEffect
  | OwnerSelectedForcedDisplacementEffect;

export type LegacyCompatibilityNoopEffect = {
  type: "legacy_compatibility_noop";
};

export type AuthoredEncounterEffect =
  | AuthoredSimpleEncounterEffect
  | { type: "sequence"; effects: AuthoredEncounterEffect[] };

export type EncounterEffect =
  | AuthoredSimpleEncounterEffect
  | LegacyCompatibilityNoopEffect
  | { type: "sequence"; effects: EncounterEffect[] };

export type LegacyCompatibleEncounterEffect =
  | Exclude<AuthoredSimpleEncounterEffect, GainGearEffect | GainFollowerEffect>
  | LegacyCompatibleGainGearEffect
  | LegacyCompatibleGainFollowerEffect
  | LegacyCompatibilityNoopEffect
  | GainHeatEffect
  | GainHeatAllEffect
  | LoseHeatEffect
  | { type: "sequence"; effects: LegacyCompatibleEncounterEffect[] };

const authoredSimpleEffectSchema: z.ZodType<AuthoredSimpleEncounterEffect> = z.union([
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
    type: z.literal("gain_salvage"),
    amount: z.number().int().positive()
  }),
  z.object({
    type: z.literal("lose_salvage"),
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
    type: z.literal("draw_artifact")
  }),
  z.object({
    type: z.literal("consume_artifact"),
    artifactId: z.string().min(1),
    sourceSectorId: z.string().min(1).optional()
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
  }),
  z.object({
    type: z.literal("gain_global_escalation_guarded"),
    sourceCardId: z.literal("gateblind-pulse"),
    amount: z.literal(1),
    guard: z.literal("oneBeforeCollapse")
  }),
  z.object({
    type: z.literal("return_threat_to_space"),
    threatId: z.string().min(1).optional(),
    sourceSectorId: z.string().min(1).optional()
  }),
  z.object({
    type: z.literal("next_non_battle_test_modifier"),
    amount: z.literal(-1),
    sourceCardId: z.literal("glass-chime-swarm")
  }),
  z.object({
    type: z.literal("next_non_battle_test_modifier"),
    amount: z.union([z.literal(-1), z.literal(1)]),
    sourceCardId: z.literal("siren-relay-echo"),
    stat: z.literal("command"),
    context: z.literal("nonBattleTest")
  }),
  z.object({
    type: z.literal("next_normal_movement_roll_modifier"),
    amount: z.literal(-1),
    minimumResult: z.literal(1),
    sourceCardId: z.literal("spindle-static-squall")
  }),
  z.object({
    type: z.literal("equipment_suppression"),
    sourceCardId: z.enum(["relay-husk", "signal-rotted-engineer"]),
    mode: z.enum(["throughNextThreat", "duringNextBattle"])
  }),
  z.object({
    type: z.literal("memory_tax_choice"),
    sourceCardId: z.literal("memory-tax-gate")
  }),
  encounterPaymentEffectSchema,
  forcedDisplacementEffectSchema,
  ownerSelectedForcedDisplacementEffectSchema
]);

const legacyCompatibilityNoopEffectSchema: z.ZodType<LegacyCompatibilityNoopEffect> = z.object({
  type: z.literal("legacy_compatibility_noop")
});

const legacyHeatEffectSchema = z.union([
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
  })
]);

export const authoredEffectSchema: z.ZodType<AuthoredEncounterEffect> = z.lazy(() =>
  z.union([
    authoredSimpleEffectSchema,
    z.object({
      type: z.literal("sequence"),
      effects: z.array(authoredEffectSchema).min(1)
    })
  ])
);

export const effectSchema: z.ZodType<EncounterEffect> = z.lazy(() =>
  z.union([
    authoredSimpleEffectSchema,
    legacyCompatibilityNoopEffectSchema,
    z.object({
      type: z.literal("sequence"),
      effects: z.array(effectSchema).min(1)
    })
  ])
);

export const legacyCompatibleEffectSchema: z.ZodType<LegacyCompatibleEncounterEffect> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal("gain_gear"),
      gearId: z.string().min(1),
      gear: legacyCompatibleGearItemSchema.optional()
    }),
    z.object({
      type: z.literal("gain_follower"),
      followerId: z.string().min(1),
      follower: legacyCompatibleFollowerGrantSchema.optional()
    }),
    authoredSimpleEffectSchema,
    legacyCompatibilityNoopEffectSchema,
    legacyHeatEffectSchema,
    z.object({
      type: z.literal("sequence"),
      effects: z.array(legacyCompatibleEffectSchema).min(1)
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

export const threatLaneSchema = z.enum(["red", "blue", "yellow"]);
export const threatResolutionTypeSchema = z.enum(["event", "enemy", "encounter", "asset", "nemesis"]);
export const cardRaritySchema = z.enum(["common", "uncommon", "rare"]);
export const cardTempoSchema = z.enum(["stall", "neutral", "push"]);
export const cardResourceTagSchema = z.enum([
  "loot",
  "wound",
  "scar",
  "salvage",
  "gear",
  "artifact",
  "contract",
  "trophy",
  "movement",
  "boon",
  "follower",
  "scenario",
  "escalation"
]);
export const legacyCompatibleCardResourceTagSchema = z.union([cardResourceTagSchema, z.literal("heat")]);
export const threatEffectKeySchema = z.enum(CANONICAL_THREAT_EFFECT_KEYS);
export const legacyCompatibleThreatEffectKeySchema = z.enum([
  ...CANONICAL_THREAT_EFFECT_KEYS,
  ...LEGACY_HEAT_THREAT_EFFECT_KEYS
]);

const threatBaseSchema = cardBaseSchema.extend({
  type: z.literal("threat"),
  severity: z.number().int().min(1).max(5),
  enemyFamily: threatFamilySchema.optional(),
  threatLane: threatLaneSchema.optional(),
  resolutionType: threatResolutionTypeSchema.optional(),
  rarity: cardRaritySchema.optional(),
  tempo: cardTempoSchema.optional(),
  resourceTags: z.array(cardResourceTagSchema).optional(),
  region: z.enum(["outer", "middle", "inner", "center", "global"]).optional(),
  stat: statSchema,
  difficulty: z.number().int().min(2).max(12),
  effectKey: threatEffectKeySchema.optional(),
  revealEffectKey: threatEffectKeySchema.optional(),
  combatEffectKeys: z.array(threatEffectKeySchema).optional(),
  successEffectKey: threatEffectKeySchema.optional(),
  defeatEffectKey: threatEffectKeySchema.optional(),
  failEffectKey: threatEffectKeySchema.optional()
});

const legacyCompatibleThreatBaseSchema = threatBaseSchema.extend({
  resourceTags: z.array(legacyCompatibleCardResourceTagSchema).optional(),
  effectKey: legacyCompatibleThreatEffectKeySchema.optional(),
  revealEffectKey: legacyCompatibleThreatEffectKeySchema.optional(),
  combatEffectKeys: z.array(legacyCompatibleThreatEffectKeySchema).optional(),
  successEffectKey: legacyCompatibleThreatEffectKeySchema.optional(),
  defeatEffectKey: legacyCompatibleThreatEffectKeySchema.optional(),
  failEffectKey: legacyCompatibleThreatEffectKeySchema.optional()
});

export const HAZARD_SUCCESS_EFFECT_RETIREMENT_IDS = [
  "cinder-gate-backlash",
  "lantern-moth-swarm",
  "mirror-rot-interference",
  "webglass-snarefield"
] as const;

const hazardSuccessEffectRetirementIds = new Set<string>(HAZARD_SUCCESS_EFFECT_RETIREMENT_IDS);

export const authoredHazardThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("hazard"),
  successEffect: authoredEffectSchema.optional(),
  failEffect: authoredEffectSchema
}).superRefine((card, context) => {
  if (card.id === "gateblind-pulse" && card.failEffect.type !== "gain_global_escalation_guarded") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Gateblind Pulse requires its approved guarded Global Escalation failure",
      path: ["failEffect"]
    });
  }
  if (card.id === "memory-tax-gate" && card.failEffect.type !== "memory_tax_choice") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Memory Tax Gate requires its approved private choice failure",
      path: ["failEffect"]
    });
  }
  if (card.failEffect.type === "memory_tax_choice" && card.id !== card.failEffect.sourceCardId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Memory Tax choice must remain scoped to Memory Tax Gate",
      path: ["failEffect", "sourceCardId"]
    });
  }
  if (card.failEffect.type === "gain_global_escalation_guarded" && card.id !== card.failEffect.sourceCardId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Guarded Global Escalation must remain scoped to Gateblind Pulse",
      path: ["failEffect", "sourceCardId"]
    });
  }
  if (!card.successEffect && !hazardSuccessEffectRetirementIds.has(card.id)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Hazard threats require a success effect unless explicitly retired",
      path: ["successEffect"]
    });
  }
});

export const authoredEnemyThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("enemy"),
  enemyName: z.string().min(1),
  trophyValue: z.number().int().min(0),
  defeatReward: authoredEffectSchema,
  woundOnLoss: authoredEffectSchema.optional()
}).superRefine((card, context) => {
  if (!card.woundOnLoss && card.id !== "rust-choir-peddlers") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enemy threats require a loss effect unless explicitly retired",
      path: ["woundOnLoss"]
    });
  }
});

export const authoredThreatCardSchema = z.union([
  authoredHazardThreatCardSchema,
  authoredEnemyThreatCardSchema
]);

export const runtimeHazardThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("hazard"),
  successEffect: effectSchema.optional(),
  failEffect: effectSchema
});

export const runtimeEnemyThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("enemy"),
  enemyName: z.string().min(1),
  trophyValue: z.number().int().min(0),
  defeatReward: effectSchema,
  woundOnLoss: effectSchema.optional()
});

export const runtimeThreatCardSchema = z.union([
  runtimeHazardThreatCardSchema,
  runtimeEnemyThreatCardSchema
]);

export const hazardThreatCardSchema = authoredHazardThreatCardSchema;
export const enemyThreatCardSchema = authoredEnemyThreatCardSchema;
export const threatCardSchema = authoredThreatCardSchema;

export const legacyCompatibleThreatCardSchema = z.union([
  legacyCompatibleThreatBaseSchema.extend({
    cardType: z.literal("hazard"),
    successEffect: legacyCompatibleEffectSchema.optional(),
    failEffect: legacyCompatibleEffectSchema
  }),
  legacyCompatibleThreatBaseSchema.extend({
    cardType: z.literal("enemy"),
    enemyName: z.string().min(1),
    trophyValue: z.number().int().min(0),
    defeatReward: legacyCompatibleEffectSchema,
    woundOnLoss: legacyCompatibleEffectSchema.optional()
  })
]);

export const anomalyCardSchema = cardBaseSchema.extend({
  type: z.literal("anomaly"),
  instability: z.number().int().min(1).max(5),
  regionHint: z.enum(["outer", "middle", "inner", "global"]).optional(),
  resolutionSummary: z.string().min(1),
  resolveEffect: authoredEffectSchema
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
  missionRewardEligible: z.boolean().optional(),
  eliteThreatRewardEligible: z.boolean().optional(),
  rareShopEligible: z.boolean().optional(),
  scenarioRewardEligible: z.boolean().optional(),
  startingEligible: z.literal(false).optional(),
  normalShopCommon: z.literal(false).optional(),
  charge: z.number().int().min(0),
  resolutionSummary: z.string().min(1),
  resolveEffect: authoredEffectSchema
});

export const scarCardSchema = cardBaseSchema.extend({
  type: z.literal("scar"),
  trigger: z.string().min(1),
  penalty: z.string().min(1),
  effect: authoredEffectSchema,
  relief: z.string().min(1),
  upside: z.string().min(1).optional()
});

export const escalationCardSchema = cardBaseSchema.extend({
  type: z.literal("escalation"),
  step: z.number().int().min(1),
  resolutionSummary: z.string().min(1),
  resolveEffect: authoredEffectSchema.optional(),
  escalationDelta: z.number().int()
});

export const cardSchema = z.union([
  authoredThreatCardSchema,
  anomalyCardSchema,
  artifactCardSchema,
  scarCardSchema,
  escalationCardSchema
]);

export type ThreatCard = z.infer<typeof runtimeThreatCardSchema>;
export type AuthoredThreatCard = z.infer<typeof authoredThreatCardSchema>;
export type LegacyCompatibleThreatCard = z.infer<typeof legacyCompatibleThreatCardSchema>;
export type ThreatFamily = z.infer<typeof threatFamilySchema>;
export type ThreatLane = z.infer<typeof threatLaneSchema>;
export type ThreatResolutionType = z.infer<typeof threatResolutionTypeSchema>;
export type CardRarity = z.infer<typeof cardRaritySchema>;
export type CardTempo = z.infer<typeof cardTempoSchema>;
export type CardResourceTag = z.infer<typeof cardResourceTagSchema>;
export type HazardThreatCard = z.infer<typeof runtimeHazardThreatCardSchema>;
export type EnemyThreatCard = z.infer<typeof runtimeEnemyThreatCardSchema>;
export type AnomalyCard = z.infer<typeof anomalyCardSchema>;
export type ArtifactCard = z.infer<typeof artifactCardSchema>;
export type ScarCard = z.infer<typeof scarCardSchema>;
export type EscalationCard = z.infer<typeof escalationCardSchema>;
export type Card = z.infer<typeof cardSchema>;
