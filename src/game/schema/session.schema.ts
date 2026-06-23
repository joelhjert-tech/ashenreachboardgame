import { z } from "zod";
import { characterSchema, statSchema } from "./character.schema.js";
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
export const interactionModeSchema = z.enum(["co-op", "rivalry", "ruthless"]);

export const seatSchema = z.object({
  seatId: z.string().min(1),
  characterId: z.string().min(1),
  displayName: z.string().min(1).nullable().optional(),
  connected: z.boolean(),
  kicked: z.boolean(),
  joinToken: z.string().min(1)
});

export const playerPrivateStateSchema = z.object({
  hand: z.array(z.string()),
  notes: z.array(z.string()).default([])
});

export const playerStateSchema = z.object({
  seatId: z.string().min(1),
  character: characterSchema,
  sectorId: z.string().min(1),
  private: playerPrivateStateSchema
});

export const gameStateSchema = z.object({
  sessionId: z.string().min(1),
  status: sessionStatusSchema,
  sessionMode: sessionModeSchema,
  interactionMode: interactionModeSchema.optional(),
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
  eventLog: z.array(z.unknown()),
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
export type InteractionMode = z.infer<typeof interactionModeSchema>;
export type Seat = z.infer<typeof seatSchema>;
export type PlayerPrivateState = z.infer<typeof playerPrivateStateSchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;
