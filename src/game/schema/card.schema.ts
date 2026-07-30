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
import { THREAT_FACTION_NAMES } from "../data/threatFactions.js";

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

export const scarSourceSchema = z.enum(["flesh", "mind", "machine", "rift", "unbound"]);
export type ScarSource = z.infer<typeof scarSourceSchema>;
export type ScarRuleKey = z.infer<typeof scarRuleKeySchema>;

type GainScarChoiceEffect = {
  type: "gain_scar_choice";
  amount: 1;
  source: ScarSource;
  sourceCardId: string;
  resolutionId?: string;
};

type GainGearEffect = {
  type: "gain_gear";
  gearId: string;
  sourceArtifactCardId?: string;
  gear?: GearItem;
};

type DrawArtifactEffect = {
  type: "draw_artifact";
};

type DrawAfflictionEffect = {
  type: "draw_affliction";
  amount: number;
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
  | GainScarChoiceEffect
  | GainGearEffect
  | DrawArtifactEffect
  | DrawAfflictionEffect
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

function authoredTrophyAward(effect: AuthoredEncounterEffect): number {
  if (effect.type === "sequence") {
    return effect.effects.reduce((total, entry) => total + authoredTrophyAward(entry), 0);
  }
  return effect.type === "gain_trophy" ? effect.amount : 0;
}

export type EncounterEffect =
  | AuthoredSimpleEncounterEffect
  | GainScarEffect
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
  | GainScarEffect
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
    type: z.literal("gain_scar_choice"),
    amount: z.literal(1),
    source: scarSourceSchema,
    sourceCardId: z.string().min(1),
    resolutionId: z.string().min(1).optional()
  }),
  z.object({
    type: z.literal("gain_gear"),
    gearId: z.string().min(1),
    sourceArtifactCardId: z.string().min(1).optional(),
    gear: gearItemSchema.optional()
  }),
  z.object({
    type: z.literal("draw_artifact")
  }),
  z.object({
    type: z.literal("draw_affliction"),
    amount: z.number().int().positive()
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

const legacyGainScarEffectSchema: z.ZodType<GainScarEffect> = z.object({
  type: z.literal("gain_scar"),
  scarId: z.string().min(1)
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
    legacyGainScarEffectSchema,
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
    legacyGainScarEffectSchema,
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

export const threatFactionSchema = z.enum(THREAT_FACTION_NAMES);
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
  faction: threatFactionSchema.optional(),
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

export const STANDARD_HAZARD_CLEAR_REWARD = {
  type: "gain_salvage",
  amount: 1
} as const;

export const hazardClearRewardSchema = z.object({
  type: z.literal("gain_salvage"),
  amount: z.literal(1)
}).strict();

export const persistentHazardRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("adjacent_enemy_difficulty"),
    amount: z.literal(1),
    radius: z.literal("same_or_adjacent")
  }).strict(),
  z.object({
    type: z.literal("route_cave_in"),
    mode: z.literal("may_enter_not_cross")
  }).strict(),
  z.object({
    type: z.literal("extra_first_printed_threat"),
    amount: z.literal(1)
  }).strict(),
  z.object({
    type: z.literal("service_lock")
  }).strict(),
  z.object({
    type: z.literal("equipment_nullfield"),
    scope: z.literal("first_threat"),
    suppression: z.literal("equipped_gear_bonuses")
  }).strict()
]);

function effectReturnsThreatToSpace(effect: AuthoredEncounterEffect): boolean {
  return effect.type === "return_threat_to_space" ||
    (effect.type === "sequence" && effect.effects.some(effectReturnsThreatToSpace));
}

export const authoredHazardThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("hazard"),
  faction: threatFactionSchema,
  clearReward: hazardClearRewardSchema.default(STANDARD_HAZARD_CLEAR_REWARD),
  persistentRule: persistentHazardRuleSchema.optional(),
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
  if (card.persistentRule && !effectReturnsThreatToSpace(card.failEffect)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Persistent hazards must return themselves to their sector on failure",
      path: ["failEffect"]
    });
  }
});

export const authoredEnemyThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("enemy"),
  faction: threatFactionSchema,
  enemyName: z.string().min(1),
  trophyValue: z.number().int().min(0),
  missionReward: z.boolean().optional(),
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
  const explicitTrophyAward = authoredTrophyAward(card.defeatReward);
  if (explicitTrophyAward > 0 && explicitTrophyAward !== card.trophyValue) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Explicit Trophy reward (${explicitTrophyAward}) must match trophyValue (${card.trophyValue})`,
      path: ["defeatReward"]
    });
  }
});

export const authoredThreatCardSchema = z.union([
  authoredHazardThreatCardSchema,
  authoredEnemyThreatCardSchema
]);

export const runtimeHazardThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("hazard"),
  clearReward: hazardClearRewardSchema.optional(),
  persistentRule: persistentHazardRuleSchema.optional(),
  successEffect: effectSchema.optional(),
  failEffect: effectSchema
});

export const runtimeEnemyThreatCardSchema = threatBaseSchema.extend({
  cardType: z.literal("enemy"),
  enemyName: z.string().min(1),
  trophyValue: z.number().int().min(0),
  missionReward: z.boolean().optional(),
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
    missionReward: z.boolean().optional(),
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

const canonicalArtifactCardSchema = cardBaseSchema.extend({
  type: z.literal("artifact"),
  artifactKind: artifactKindSchema.optional(),
  startingEligible: z.literal(false).optional(),
  normalShopCommon: z.literal(false).optional(),
  charge: z.number().int().min(0),
  resolutionSummary: z.string().min(1),
  resolveEffect: authoredEffectSchema
});

export const artifactCardSchema = canonicalArtifactCardSchema;

export const legacyCompatibleArtifactCardSchema = canonicalArtifactCardSchema.extend({
  missionRewardEligible: z.boolean().optional(),
  eliteThreatRewardEligible: z.boolean().optional(),
  rareShopEligible: z.boolean().optional(),
  scenarioRewardEligible: z.boolean().optional()
});

export const scarRuleKeySchema = z.enum([
  "first-grit-penalty", "first-equipment-battle-exhaust", "inner-anomaly-arrival-wound", "movement-alteration-wound-cost",
  "first-enemy-battle-penalty", "first-failed-hazard-wound", "first-signal-penalty", "command-assistance-blocked",
  "contract-failure-escalation", "first-guile-penalty", "remote-signal-penalty", "owner-turn-escalation-wound",
  "first-trophy-reduction", "paid-service-surcharge", "cross-ring-toll", "first-battle-equipment-exhaust",
  "first-route-test-penalty", "repair-service-surcharge", "assistance-blocked", "anomaly-natural-one-wound",
  "forced-displacement-extra-step", "seal-event-option", "healing-service-surcharge", "first-assistance-reduction",
  "prevent-grit-displacement", "repair-forge-bonus", "toxic-wound-immunity", "rift-signal-reroll",
  "elite-grit-bonus", "grit-hazard-reroll", "ignore-blue-event", "declined-help-command-bonus",
  "contract-complete-heal", "guile-anomaly-reroll", "relay-blue-peek", "escalation-signal-bonus",
  "trophy-advancement-discount", "prevent-equipment-suppression", "gate-test-bonus", "one-below-battle-bonus",
  "machine-enemy-grit-bonus", "forge-charge-restore", "guile-reroll", "anomaly-difficulty-reduction",
  "choose-displacement-direction", "inspect-hidden-consequence", "elite-wounded-salvage", "next-unassisted-bonus"
]);

export const scarPersistentRuleSchema = z.object({
  key: scarRuleKeySchema,
  timing: z.string().min(1),
  limit: z.enum(["oncePerTurn", "oncePerRound", "oncePerBattle", "oncePerVisit", "oncePerGame", "passive"]).default("passive"),
  optional: z.boolean().default(false),
  tags: z.array(z.string().min(1)).default([])
}).strict();

export const scarCardSchema = cardBaseSchema.extend({
  type: z.literal("scar"),
  source: scarSourceSchema,
  origin: z.string().min(1),
  burdenText: z.string().min(1),
  adaptationText: z.string().min(1),
  burden: scarPersistentRuleSchema,
  adaptation: scarPersistentRuleSchema,
  onGain: authoredEffectSchema.optional(),
  removalRestrictions: z.array(z.string().min(1)).default([]),
  artwork: z.string().min(1),
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
export type ThreatFaction = z.infer<typeof threatFactionSchema>;
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
