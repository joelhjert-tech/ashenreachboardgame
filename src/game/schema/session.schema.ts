import { z } from "zod";
import {
  legacyCompatiblePendingTileChallengeSchema,
  pendingTileChallengeSchema
} from "./tileChallenge.schema.js";
import {
  characterSchema,
  legacyCharacterSchemaV0,
  legacyCompatibleCharacterSchema,
  statSchema
} from "./character.schema.js";
import { afflictionCardSchema, afflictionInstanceSchema, afflictionUsageStateSchema } from "./affliction.schema.js";
import {
  effectSchema,
  legacyCompatibleEffectSchema,
  legacyCompatibleThreatCardSchema,
  runtimeThreatCardSchema
} from "./card.schema.js";
import {
  contractCardSchema,
  legacyCompatibleContractCardSchema
} from "./contract.schema.js";
import {
  legacyCompatibleSectorNodeSchema,
  sectorNodeSchema
} from "./sector.schema.js";
import { pendingScarConsequenceSchema } from "./scarTrigger.schema.js";
import { pendingEncounterDecisionSchema } from "./encounterDecision.schema.js";
import { pendingDisplacementArrivalSchema, pendingDisplacementSchema, pendingForcedDestinationChoiceSchema, pendingSutureStormConsequenceSchema } from "./displacement.schema.js";
import { pendingMemoryTaxChoiceSchema } from "./memoryTax.schema.js";

export const phaseSchema = z.enum([
  "start",
  "navigation",
  "sector",
  "action",
  "resolution",
  "broadcast"
]);

export const sessionStatusSchema = z.enum(["lobby", "active", "ended"]);
export const sessionModeSchema = z.enum(["multiplayer", "single-player"]);
export const gameModeSchema = z.enum(["standard", "nemesis_relay"]);
export const interactionModeSchema = z.enum(["co-op", "rivalry", "ruthless"]);

export const pendingNextNonBattleTestModifierSchema = z.discriminatedUnion("sourceCardId", [
  z.object({
    type: z.literal("nextNonBattleTest"),
    ownerSeatId: z.string().min(1),
    amount: z.literal(-1),
    sourceCardId: z.literal("glass-chime-swarm"),
    sourceEventId: z.string().min(1),
    createdAt: z.string().min(1)
  }),
  z.object({
    type: z.literal("nextNonBattleTest"),
    ownerSeatId: z.string().min(1),
    amount: z.union([z.literal(-1), z.literal(1)]),
    sourceCardId: z.literal("siren-relay-echo"),
    stat: z.literal("command"),
    context: z.literal("nonBattleTest"),
    sourceEventId: z.string().min(1),
    boundTestResolutionId: z.string().min(1).nullable(),
    createdAt: z.string().min(1)
  }),
  z.object({
    type: z.literal("nextNonBattleTest"),
    ownerSeatId: z.string().min(1),
    amount: z.literal(-1),
    sourceCardId: z.literal("memory-tax-gate"),
    context: z.literal("nonBattleTest"),
    sourceEventId: z.string().min(1),
    boundTestResolutionId: z.string().min(1).nullable(),
    createdAt: z.string().min(1)
  })
]);

export const pendingNextNormalMovementRollModifierSchema = z.object({
  type: z.literal("nextNormalMovementRoll"),
  ownerSeatId: z.string().min(1),
  amount: z.literal(-1),
  minimumResult: z.literal(1),
  sourceCardId: z.literal("spindle-static-squall"),
  sourceEventId: z.string().min(1),
  createdAt: z.string().min(1)
});

export const equipmentSuppressionModeSchema = z.enum(["throughNextThreat", "duringNextBattle"]);

export const pendingEquipmentSuppressionChoiceSchema = z.object({
  choiceId: z.string().min(1),
  ownerSeatId: z.string().min(1),
  sourceThreatId: z.enum(["relay-husk", "signal-rotted-engineer"]),
  sourceEventId: z.string().min(1),
  sourceResolutionId: z.string().min(1),
  mode: equipmentSuppressionModeSchema,
  eligibleInstanceIds: z.array(z.string().min(1)).min(1),
  createdSequence: z.number().int().min(0),
  createdAt: z.string().min(1)
});

export const equipmentSuppressionSchema = z.object({
  ownerSeatId: z.string().min(1),
  sourceThreatId: z.enum(["relay-husk", "signal-rotted-engineer"]),
  sourceEventId: z.string().min(1),
  sourceResolutionId: z.string().min(1),
  itemInstanceId: z.string().min(1),
  itemCatalogId: z.string().min(1),
  mode: equipmentSuppressionModeSchema,
  qualifyingLifecycleId: z.string().min(1).nullable(),
  status: z.literal("active"),
  createdSequence: z.number().int().min(0),
  createdAt: z.string().min(1)
});

export const normalMovementRollDetailSchema = z.object({
  resolutionId: z.string().min(1),
  rolledValue: z.number().int().min(1),
  modifierSources: z.array(z.object({ label: z.string().min(1), value: z.number().int() })),
  finalValue: z.number().int().min(1)
});

export const resolutionStageSchema = z.enum([
  "idle",
  "card_reveal",
  "battle_setup",
  "dice_roll",
  "roll_result",
  "outcome_summary",
  "awaiting_continue"
]);

export const activeResolutionSchema = z.object({
  id: z.string().min(1),
  playerId: z.string().min(1),
  source: z.enum(["movement", "threat", "contract", "anomaly", "artifact", "scenario"]),
  stage: resolutionStageSchema,
  card: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
      type: z.string().min(1),
      flavor: z.string().nullable().optional(),
      artType: z.string().min(1).optional()
    })
    .optional(),
  battle: z
    .object({
      enemyName: z.string().min(1).optional(),
      stat: statSchema,
      difficulty: z.number().int(),
      modifiers: z.array(
        z.object({
          label: z.string().min(1),
          value: z.number().int()
        })
      )
    })
    .optional(),
  roll: z
    .object({
      dice: z.array(z.number().int().min(1).max(6)),
      baseTotal: z.number().int(),
      modifierTotal: z.number().int(),
      finalTotal: z.number().int(),
      target: z.number().int(),
      success: z.boolean()
    })
    .optional(),
  outcome: z
    .object({
      title: z.string().min(1),
      text: z.string().min(1),
      effects: z.array(z.string()),
      salvageLoss: z.object({
        requestedLoss: z.number().int().positive(),
        actualLoss: z.number().int().nonnegative(),
        resultingSalvage: z.number().int().nonnegative(),
        sourceCardId: z.string().min(1)
      }).optional()
    })
    .optional()
});

export const seatSchema = z.object({
  seatId: z.string().min(1),
  characterId: z.string().min(1),
  characterSelected: z.boolean().optional(),
  displayName: z.string().min(1).nullable().optional(),
  startingContractOptions: z.array(z.string().min(1)).default([]),
  selectedStartingContractId: z.string().min(1).nullable().default(null),
  missionSelectedAt: z.string().min(1).nullable().optional(),
  connected: z.boolean(),
  ready: z.boolean(),
  kicked: z.boolean(),
  joinToken: z.string().min(1)
});

export const noteResourceSchema = z.enum(["vow"]);

export const oathchainTargetDescriptorSchema = z.object({
  kind: z.enum(["threat", "sector", "routeStop", "shopAction", "tileChallenge"]),
  id: z.string().min(1),
  label: z.string().min(1),
  sectorId: z.string().min(1).optional(),
  detail: z.string().min(1)
});

export const activeOathchainRevealSchema = z.object({
  revealId: z.string().min(1),
  ownerSeat: z.string().min(1),
  itemInstanceId: z.string().min(1),
  contractId: z.string().min(1),
  contractSignature: z.string().min(1),
  contractName: z.string().min(1),
  objectiveProgress: z.string().min(1),
  revealedTargets: z.array(oathchainTargetDescriptorSchema).min(1),
  createdTurn: z.number().int().min(0),
  expiresAtTurnEnd: z.literal(true)
});

export const playerPrivateStateSchema = z.object({
  hand: z.array(z.string()),
  notes: z.array(z.string()).default([]),
  // Named notes only become counters when a rule can authoritatively spend them.
  noteResources: z.record(noteResourceSchema, z.number().int().min(0)).optional(),
  activeOathchainReveal: activeOathchainRevealSchema.nullable().optional(),
  rivalryAgenda: z
    .object({
      revealState: z.enum(["hidden", "revealLocked", "revealAvailable", "revealed", "completed", "failed"]),
      revealedAtRound: z.number().int().min(0).nullable().optional(),
      revealedBySeatId: z.string().min(1).nullable().optional(),
      publicRevealTitle: z.string().min(1).optional(),
      publicRevealSummary: z.string().min(1).optional(),
      progressCurrent: z.number().int().min(0).optional(),
      progressRequired: z.number().int().min(1).optional(),
      progressLabel: z.string().min(1).optional(),
      pointsAwarded: z.number().int().min(0).optional(),
      completedAtRound: z.number().int().min(0).nullable().optional(),
      completedBySeatId: z.string().min(1).nullable().optional(),
      publicCompletionTitle: z.string().min(1).optional(),
      publicCompletionSummary: z.string().min(1).optional(),
      privateCompletionSummary: z.string().min(1).optional()
    })
    .optional()
});

export const playerStateSchema = z.object({
  seatId: z.string().min(1),
  character: characterSchema,
  sectorId: z.string().min(1),
  private: playerPrivateStateSchema,
  faceupAfflictions: z.array(afflictionInstanceSchema).optional(),
  facedownAfflictions: z.array(afflictionInstanceSchema).optional(),
  afflictionUsageState: afflictionUsageStateSchema.optional(),
  afflictionDrawHistory: z.array(z.string().min(1)).optional()
});

export const legacyPlayerStateSchemaV0 = playerStateSchema.extend({
  character: legacyCharacterSchemaV0
}).strict();

export const nemesisChampionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  boundPlayerId: z.string().min(1),
  sectorId: z.string().min(1),
  strength: z.number().int().min(0),
  craft: z.number().int().min(0).optional(),
  tech: z.number().int().min(0).optional(),
  will: z.number().int().min(0).optional(),
  health: z.number().int().min(0),
  maxHealth: z.number().int().min(1),
  trophies: z.number().int().min(0),
  movementProfile: z.enum(["center_path", "hunt_wounded", "slow_brute", "anomaly_shortcut"]),
  combatProfile: z.enum(["strength", "craft", "tech", "will", "choice"]),
  specialRuleId: z.string().min(1),
  defeated: z.boolean(),
  shield: z.number().int().min(0).optional()
});

export const nemesisNexusCountdownSchema = z.object({
  nemesisId: z.string().min(1),
  remainingTurns: z.number().int().min(0)
});

export const shopStockRevealSchema = z.object({
  seatId: z.string().min(1),
  sectorId: z.string().min(1),
  serviceId: z.string().min(1),
  shopName: z.string().min(1),
  stockIds: z.array(z.string().min(1)),
  revealCost: z
    .object({
      salvage: z.number().int().min(0).optional(),
      wounds: z.number().int().min(0).optional(),
      trophies: z.number().int().min(0).optional()
    })
    .optional(),
  createdAt: z.string().min(1)
});

export const legacyCompatibleShopStockRevealSchema = shopStockRevealSchema.extend({
  revealCost: z
    .object({
      salvage: z.number().int().min(0).optional(),
      heat: z.number().int().min(0).optional(),
      wounds: z.number().int().min(0).optional(),
      trophies: z.number().int().min(0).optional()
    })
    .optional()
});

export const scenarioPreparationStateSchema = z.object({
  resources: z.record(z.string().min(1), z.number().int().min(0)),
  completedObjectiveIds: z.array(z.string().min(1)),
  processedSourceEventIds: z.array(z.string().min(1))
}).strict();

export const scenarioConfrontationStateSchema = z.object({
  active: z.boolean(),
  confrontationId: z.string().min(1).nullable(),
  progress: z.record(z.string().min(1), z.number().int().min(0)),
  stage: z.string().min(1).nullable(),
  processedSourceEventIds: z.array(z.string().min(1))
}).strict();

export const scenarioResultStateSchema = z.object({
  status: z.enum(["unresolved", "victory", "loss"]),
  victoryConditionId: z.string().min(1).nullable(),
  sourceType: z.enum(["confrontation", "scenarioAction"]).nullable(),
  sourceId: z.string().min(1).nullable(),
  winningSeatId: z.string().min(1).nullable(),
  shared: z.boolean().nullable(),
  achievedAtSequence: z.number().int().min(0).nullable()
}).strict();

export function createEmptyScenarioPreparationState() {
  return { resources: {}, completedObjectiveIds: [], processedSourceEventIds: [] };
}

export function createEmptyScenarioConfrontationState() {
  return { active: false, confrontationId: null, progress: {}, stage: null, processedSourceEventIds: [] };
}

export function createEmptyScenarioResultState() {
  return {
    status: "unresolved" as const,
    victoryConditionId: null,
    sourceType: null,
    sourceId: null,
    winningSeatId: null,
    shared: null,
    achievedAtSequence: null
  };
}

export const gameStateSchema = z.object({
  sessionId: z.string().min(1),
  status: sessionStatusSchema,
  sessionMode: sessionModeSchema,
  gameMode: gameModeSchema.default("standard"),
  interactionMode: interactionModeSchema.optional(),
  setupHostSeatId: z.string().min(1).nullable().optional(),
  lobbyConfigured: z.boolean().optional(),
  winnerSeatId: z.string().min(1).nullable(),
  activeScenarioId: z.string().min(1),
  scenarioProgress: z.record(z.string(), z.number().int().min(0)),
  scenarioPreparation: scenarioPreparationStateSchema.default(createEmptyScenarioPreparationState),
  scenarioConfrontation: scenarioConfrontationStateSchema.default(createEmptyScenarioConfrontationState),
  scenarioResult: scenarioResultStateSchema.default(createEmptyScenarioResultState),
  phase: phaseSchema,
  resolutionSource: z.enum(["movement", "encounter", "contract", "tileChallenge"]).nullable(),
  activeSeatIndex: z.number().int().min(0),
  turnOrder: z.array(z.string().min(1)).min(1),
  reflectionPressureThreshold: z.number().int().min(1),
  woundThreshold: z.number().int().min(1),
  sequence: z.number().int().min(0),
  sectors: z.array(sectorNodeSchema),
  seats: z.array(seatSchema),
  players: z.array(playerStateSchema),
  availableContracts: z.array(contractCardSchema),
  availableAfflictions: z.array(afflictionCardSchema).optional(),
  nemesisChampions: z.array(nemesisChampionSchema).default([]),
  nemesisNexusCountdowns: z.array(nemesisNexusCountdownSchema).default([]),
  shopStockReveals: z.array(shopStockRevealSchema).default([]),
  movementRolls: z.record(z.string(), z.number().int().min(1)).optional(),
  normalMovementRollDetails: z.record(z.string(), normalMovementRollDetailSchema).optional(),
  movementRouteRevisions: z.record(z.string(), z.number().int().min(1)).optional(),
  routeStarChoices: z.record(z.string(), z.object({ instanceId: z.string().min(1), destinationId: z.string().min(1), routeId: z.string().min(1), movementRevision: z.number().int().min(1) })).optional(),
  movementAdjustments: z.record(z.string(), z.object({ adjustment: z.union([z.literal(-1), z.literal(1)]), sourceInstanceId: z.string().min(1) })).optional(),
  gateSaintSafeConduct: z.object({ id: z.string(), sourceInstanceId: z.string(), usedSeatIds: z.array(z.string()) }).nullable().optional(),
  soloRerollCharges: z.record(z.string(), z.number().int().min(0)).optional(),
  eventLog: z.array(z.unknown()),
  recentEncounterCardIds: z.array(z.string().min(1)).optional(),
  escalationLevel: z.number().int().min(0),
  resolvedEscalationSourceEventIds: z.array(z.string().min(1)).optional(),
  currentEncounter: runtimeThreatCardSchema.nullable(),
  pendingEnemyRoll: z
    .object({
      fighterSeatId: z.string().min(1),
      assignedRollerSeatId: z.string().min(1),
      encounterCardId: z.string().min(1),
      encounterTitle: z.string().min(1),
      stat: statSchema
    })
    .nullable(),
  pendingEffect: effectSchema.nullable(),
  pendingEncounterDecision: pendingEncounterDecisionSchema.nullable().optional(),
  resolvedEncounterDecisionIds: z.array(z.string().min(1)).optional(),
  pendingMemoryTaxChoice: pendingMemoryTaxChoiceSchema.nullable().optional(),
  resolvedMemoryTaxChoiceSourceEventIds: z.array(z.string().min(1)).optional(),
  pendingForcedDestinationChoice: pendingForcedDestinationChoiceSchema.nullable().optional(),
  pendingDisplacement: pendingDisplacementSchema.nullable().optional(),
  pendingDisplacementArrival: pendingDisplacementArrivalSchema.nullable().optional(),
  pendingSutureStormConsequence: pendingSutureStormConsequenceSchema.nullable().optional(),
  resolvedDisplacementSourceEventIds: z.array(z.string().min(1)).optional(),
  resolvedSalvageLossSourceEventIds: z.array(z.string().min(1)).optional(),
  pendingEquipmentSuppressionChoice: pendingEquipmentSuppressionChoiceSchema.nullable().optional(),
  equipmentSuppressions: z.array(equipmentSuppressionSchema).optional(),
  resolvedEquipmentSuppressionSourceEventIds: z.array(z.string().min(1)).optional(),
  pendingNextNonBattleTestModifiers: z.array(pendingNextNonBattleTestModifierSchema).optional(),
  resolvedNextNonBattleTestModifierSourceEventIds: z.array(z.string().min(1)).optional(),
  consumedNextNonBattleTestModifierTestEventIds: z.array(z.string().min(1)).optional(),
  pendingNextNormalMovementRollModifiers: z.array(pendingNextNormalMovementRollModifierSchema).optional(),
  resolvedNextNormalMovementRollModifierSourceEventIds: z.array(z.string().min(1)).optional(),
  consumedNextNormalMovementRollResolutionIds: z.array(z.string().min(1)).optional(),
  pendingFailureReaction: z.object({
    id: z.string().min(1),
    seatId: z.string().min(1),
    testType: z.enum(["movement", "hazard"]),
    sourceId: z.string().min(1),
    createdAt: z.string().min(1)
  }).nullable().optional(),
  pendingStaticIntercessionReaction: z.object({
    id: z.string().min(1),
    seatId: z.string().min(1),
    pendingTileChallengeId: z.string().min(1),
    suppressibleEffects: z.array(z.object({ effectId: z.string().min(1), effect: effectSchema })).min(1),
    selectedEffectId: z.string().min(1).nullable(),
    createdAt: z.string().min(1)
  }).nullable().optional(),
  pendingScarConsequence: pendingScarConsequenceSchema.nullable().optional(),
  pendingScarConsequenceQueue: z.array(pendingScarConsequenceSchema).optional(),
  resolvedScarSourceEventIds: z.array(z.string().min(1)).optional(),
  pendingTileChallenge: pendingTileChallengeSchema.nullable().optional(),
  tileChallengeProgress: z.object({
    seatId: z.string().min(1),
    sectorId: z.string().min(1),
    resolvedChallengeIds: z.array(z.string().min(1))
  }).nullable().optional(),
  activeResolution: activeResolutionSchema.nullable().optional(),
  lastOutcomeSummary: z
    .object({
      seatId: z.string().min(1),
      movedToSectorId: z.string().min(1),
      encounterCardId: z.string().nullable(),
      encounterTitle: z.string().nullable(),
      encounterCardType: z.enum(["hazard", "enemy"]).nullable(),
      checkStat: z.string().nullable(),
      die1: z.number().int().min(1).max(6).nullable(),
      die2: z.number().int().min(1).max(6).nullable(),
      statBonus: z.number().int().nullable(),
      checkTotal: z.number().int().nullable(),
      difficulty: z.number().int().nullable(),
      enemyRollerSeatId: z.string().nullable().optional(),
      enemyDie1: z.number().int().min(1).max(6).nullable().optional(),
      enemyDie2: z.number().int().min(1).max(6).nullable().optional(),
      enemyBonus: z.number().int().nullable().optional(),
      enemyTotal: z.number().int().nullable().optional(),
      success: z.boolean().nullable(),
      replacementCharacterId: z.string().nullable().optional(),
      summary: z.string().min(1)
    })
    .nullable()
}).strict();

export const legacyCompatiblePlayerStateSchema = playerStateSchema.extend({
  character: legacyCompatibleCharacterSchema
}).strict();

export const legacyCompatibleGameStateSchema = gameStateSchema.extend({
  players: z.array(legacyCompatiblePlayerStateSchema),
  sectors: z.array(legacyCompatibleSectorNodeSchema),
  availableContracts: z.array(legacyCompatibleContractCardSchema),
  shopStockReveals: z.array(legacyCompatibleShopStockRevealSchema).default([]),
  currentEncounter: legacyCompatibleThreatCardSchema.nullable(),
  pendingEffect: legacyCompatibleEffectSchema.nullable(),
  pendingTileChallenge: legacyCompatiblePendingTileChallengeSchema.nullable().optional(),
  pendingStaticIntercessionReaction: z.object({
    id: z.string().min(1),
    seatId: z.string().min(1),
    pendingTileChallengeId: z.string().min(1),
    suppressibleEffects: z.array(z.object({
      effectId: z.string().min(1),
      effect: legacyCompatibleEffectSchema
    })).min(1),
    selectedEffectId: z.string().min(1).nullable(),
    createdAt: z.string().min(1)
  }).nullable().optional()
}).strict();

const legacyThresholdGameStateSchema = legacyCompatibleGameStateSchema
  .omit({ reflectionPressureThreshold: true })
  .extend({ heatThreshold: z.number().int().min(1) })
  .strict();

export const legacyGameStateSchemaV0 = legacyThresholdGameStateSchema.extend({
  players: z.array(legacyPlayerStateSchemaV0)
}).strict();

export const legacySessionSnapshotSchemaV0 = z.object({
  sessionId: z.string().min(1),
  sequence: z.number().int().min(0),
  state: legacyGameStateSchemaV0
}).strict();

export const legacyCharacterHeatRecordSchema = z.object({
  seatId: z.string().min(1),
  characterId: z.string().min(1),
  value: z.number().int().positive()
}).strict();

export const legacyCompatibilityMetadataSchema = z.object({
  characterHeat: z.array(legacyCharacterHeatRecordSchema).min(1)
}).strict().superRefine((metadata, context) => {
  const identities = new Set<string>();
  metadata.characterHeat.forEach((record, index) => {
    const identity = `${record.seatId}\u0000${record.characterId}`;
    if (identities.has(identity)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["characterHeat", index], message: `Duplicate legacy character Heat identity ${record.seatId}/${record.characterId}` });
    }
    identities.add(identity);
  });
});

function validateLegacyCompatibilityOwners(
  snapshot: {
    state: { players: Array<{ seatId: string; character: { id: string } }> };
    legacyCompatibility?: LegacyCompatibilityMetadata;
  },
  context: z.RefinementCtx
): void {
  snapshot.legacyCompatibility?.characterHeat.forEach((record, index) => {
    const owner = snapshot.state.players.find((player) => player.seatId === record.seatId);
    if (!owner) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["legacyCompatibility", "characterHeat", index], message: `Legacy character Heat owner ${record.seatId} does not exist in the snapshot` });
    }
  });
}

export const sessionSnapshotSchemaV1 = z.object({
  saveVersion: z.literal(1),
  sessionId: z.string().min(1),
  sequence: z.number().int().min(0),
  state: legacyThresholdGameStateSchema,
  legacyCompatibility: legacyCompatibilityMetadataSchema.optional()
}).strict().superRefine(validateLegacyCompatibilityOwners);

export const sessionSnapshotSchema = z.object({
  saveVersion: z.literal(2),
  sessionId: z.string().min(1),
  sequence: z.number().int().min(0),
  state: gameStateSchema,
  legacyCompatibility: legacyCompatibilityMetadataSchema.optional()
}).strict().superRefine(validateLegacyCompatibilityOwners);

export const legacyCompatibleSessionSnapshotSchemaV2 = z.object({
  saveVersion: z.literal(2),
  sessionId: z.string().min(1),
  sequence: z.number().int().min(0),
  state: legacyCompatibleGameStateSchema,
  legacyCompatibility: legacyCompatibilityMetadataSchema.optional()
}).strict();

export type Phase = z.infer<typeof phaseSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type SessionMode = z.infer<typeof sessionModeSchema>;
export type GameMode = z.infer<typeof gameModeSchema>;
export type InteractionMode = z.infer<typeof interactionModeSchema>;
export type PendingNextNonBattleTestModifier = z.infer<typeof pendingNextNonBattleTestModifierSchema>;
export type PendingNextNormalMovementRollModifier = z.infer<typeof pendingNextNormalMovementRollModifierSchema>;
export type EquipmentSuppressionMode = z.infer<typeof equipmentSuppressionModeSchema>;
export type PendingEquipmentSuppressionChoice = z.infer<typeof pendingEquipmentSuppressionChoiceSchema>;
export type EquipmentSuppression = z.infer<typeof equipmentSuppressionSchema>;
export type NormalMovementRollDetail = z.infer<typeof normalMovementRollDetailSchema>;
export type ResolutionStage = z.infer<typeof resolutionStageSchema>;
export type ActiveResolution = z.infer<typeof activeResolutionSchema>;
export type Seat = z.infer<typeof seatSchema>;
export type NoteResource = z.infer<typeof noteResourceSchema>;
export type PlayerPrivateState = z.infer<typeof playerPrivateStateSchema>;
export type OathchainTargetDescriptor = z.infer<typeof oathchainTargetDescriptorSchema>;
export type ActiveOathchainReveal = z.infer<typeof activeOathchainRevealSchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
export type NemesisChampion = z.infer<typeof nemesisChampionSchema>;
export type NemesisNexusCountdown = z.infer<typeof nemesisNexusCountdownSchema>;
export type ShopStockReveal = z.infer<typeof shopStockRevealSchema>;
export type ScenarioPreparationState = z.infer<typeof scenarioPreparationStateSchema>;
export type ScenarioConfrontationState = z.infer<typeof scenarioConfrontationStateSchema>;
export type ScenarioResultState = z.infer<typeof scenarioResultStateSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type LegacyCompatibleGameState = z.infer<typeof legacyCompatibleGameStateSchema>;
export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;
export type LegacyCompatibleSessionSnapshotV2 = z.infer<typeof legacyCompatibleSessionSnapshotSchemaV2>;
export type SessionSnapshotV1 = z.infer<typeof sessionSnapshotSchemaV1>;
export type LegacySessionSnapshotV0 = z.infer<typeof legacySessionSnapshotSchemaV0>;
export type LegacyCompatibilityMetadata = z.infer<typeof legacyCompatibilityMetadataSchema>;
