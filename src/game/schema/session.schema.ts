import { z } from "zod";
import { characterSchema, statSchema } from "./character.schema.js";
import { afflictionCardSchema, afflictionInstanceSchema, afflictionUsageStateSchema } from "./affliction.schema.js";
import { effectSchema, threatCardSchema } from "./card.schema.js";
import { contractCardSchema } from "./contract.schema.js";
import { sectorNodeSchema } from "./sector.schema.js";

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
      effects: z.array(z.string())
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

export const playerPrivateStateSchema = z.object({
  hand: z.array(z.string()),
  notes: z.array(z.string()).default([]),
  // Named notes only become counters when a rule can authoritatively spend them.
  noteResources: z.record(noteResourceSchema, z.number().int().min(0)).optional(),
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
      heat: z.number().int().min(0).optional(),
      wounds: z.number().int().min(0).optional(),
      trophies: z.number().int().min(0).optional()
    })
    .optional(),
  createdAt: z.string().min(1)
});

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
  phase: phaseSchema,
  resolutionSource: z.enum(["movement", "encounter", "contract"]).nullable(),
  activeSeatIndex: z.number().int().min(0),
  turnOrder: z.array(z.string().min(1)).min(1),
  heatThreshold: z.number().int().min(1),
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
  soloRerollCharges: z.record(z.string(), z.number().int().min(0)).optional(),
  eventLog: z.array(z.unknown()),
  recentEncounterCardIds: z.array(z.string().min(1)).optional(),
  escalationLevel: z.number().int().min(0),
  currentEncounter: threatCardSchema.nullable(),
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
});

export const sessionSnapshotSchema = z.object({
  sessionId: z.string().min(1),
  sequence: z.number().int().min(0),
  state: gameStateSchema
});

export type Phase = z.infer<typeof phaseSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type SessionMode = z.infer<typeof sessionModeSchema>;
export type GameMode = z.infer<typeof gameModeSchema>;
export type InteractionMode = z.infer<typeof interactionModeSchema>;
export type ResolutionStage = z.infer<typeof resolutionStageSchema>;
export type ActiveResolution = z.infer<typeof activeResolutionSchema>;
export type Seat = z.infer<typeof seatSchema>;
export type NoteResource = z.infer<typeof noteResourceSchema>;
export type PlayerPrivateState = z.infer<typeof playerPrivateStateSchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
export type NemesisChampion = z.infer<typeof nemesisChampionSchema>;
export type NemesisNexusCountdown = z.infer<typeof nemesisNexusCountdownSchema>;
export type ShopStockReveal = z.infer<typeof shopStockRevealSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;
