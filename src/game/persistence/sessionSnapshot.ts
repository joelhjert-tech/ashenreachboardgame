import { z } from "zod";
import {
  gameStateSchema,
  legacyCompatibleSessionSnapshotSchemaV2,
  legacySessionSnapshotSchemaV0,
  sessionSnapshotSchema,
  sessionSnapshotSchemaV1,
  type GameState,
  type LegacyCompatibleGameState,
  type LegacyCompatibilityMetadata,
  type SessionSnapshot,
  type SessionSnapshotV1
} from "../schema/session.schema.js";
import { normalizeLegacyCharacter } from "../schema/character.schema.js";
import {
  normalizeLegacyEncounterEffect,
  normalizeLegacyThreatCard
} from "../rules/legacyHeatCompatibility.js";
import { normalizeLegacyEventLog } from "./legacyGameActionCompatibility.js";
import { createInitialScenarioPreparation } from "../rules/scenarioAmbient.js";

export const CURRENT_SAVE_VERSION = 2 as const;

export class UnsupportedSnapshotVersionError extends Error {
  public constructor(public readonly actualVersion: unknown, source = "session snapshot") {
    super(`${source} has unsupported saveVersion ${JSON.stringify(actualVersion)}; supported versions are unversioned legacy v0, legacy v1, and current v2.`);
    this.name = "UnsupportedSnapshotVersionError";
  }
}

function cloneUnknown<T>(input: T): T {
  return structuredClone(input);
}

function readVersion(input: unknown): unknown {
  return input && typeof input === "object" && !Array.isArray(input) && "saveVersion" in input
    ? (input as { saveVersion?: unknown }).saveVersion
    : undefined;
}

function mergeLegacyCharacterHeat(
  state: {
    players: Array<{
      seatId: string;
      character: { id: string; heat?: number };
    }>;
  },
  existing?: LegacyCompatibilityMetadata
): LegacyCompatibilityMetadata | undefined {
  const records = new Map<string, LegacyCompatibilityMetadata["characterHeat"][number]>();
  for (const record of existing?.characterHeat ?? []) {
    records.set(`${record.seatId}\u0000${record.characterId}`, record);
  }
  for (const player of state.players) {
    const heat = player.character.heat;
    if (typeof heat !== "number" || heat <= 0) continue;
    const record = {
      seatId: player.seatId,
      characterId: player.character.id,
      value: heat
    };
    records.set(`${record.seatId}\u0000${record.characterId}`, record);
  }
  const characterHeat = [...records.values()];
  return characterHeat.length > 0 ? { characterHeat } : undefined;
}

export function migrateSessionSnapshotV0ToV1(input: unknown): SessionSnapshotV1 {
  const legacy = legacySessionSnapshotSchemaV0.parse(cloneUnknown(input));
  const characterHeat: LegacyCompatibilityMetadata["characterHeat"] = [];
  const players = legacy.state.players.map((player) => {
    const heat = player.character.heat;
    const character = normalizeLegacyCharacter(player.character);
    if (heat > 0) characterHeat.push({ seatId: player.seatId, characterId: character.id, value: heat });
    return { ...player, character };
  });

  return sessionSnapshotSchemaV1.parse({
    saveVersion: 1,
    sessionId: legacy.sessionId,
    sequence: legacy.sequence,
    state: { ...legacy.state, players },
    ...(characterHeat.length > 0 ? { legacyCompatibility: { characterHeat } } : {})
  });
}

function normalizeScenarioOwnershipState(state: GameState): GameState {
  if (state.activeScenarioId !== "scenario_broken_seal" || state.scenarioPreparation.resources.sealIntegrity !== undefined) {
    return state;
  }

  const legacySealIntegrity = state.scenarioProgress.sealTokens;
  const initial = createInitialScenarioPreparation(state.activeScenarioId, state.sessionMode);
  return {
    ...state,
    scenarioPreparation: {
      ...state.scenarioPreparation,
      resources: {
        ...state.scenarioPreparation.resources,
        sealIntegrity: Number.isInteger(legacySealIntegrity) && legacySealIntegrity! >= 0
          ? legacySealIntegrity!
          : initial.resources.sealIntegrity ?? 0
      }
    }
  };
}

function normalizeLegacyGameState(state: LegacyCompatibleGameState): GameState {
  return gameStateSchema.parse({
    ...state,
    players: state.players.map((player) => ({
      ...player,
      character: normalizeLegacyCharacter(player.character)
    })),
    sectors: state.sectors.map((sector) => ({
      ...sector,
      tileChallenges: sector.tileChallenges?.map((challenge) => ({
        ...challenge,
        successEffect: normalizeLegacyEncounterEffect(challenge.successEffect),
        failureEffect: normalizeLegacyEncounterEffect(challenge.failureEffect)
      }))
    })),
    availableContracts: state.availableContracts.map((contract) => ({
      ...contract,
      reward: normalizeLegacyEncounterEffect(contract.reward)
    })),
    shopStockReveals: state.shopStockReveals.map((reveal) => ({
      ...reveal,
      revealCost: reveal.revealCost
        ? {
            salvage: reveal.revealCost.salvage,
            wounds: reveal.revealCost.wounds,
            trophies: reveal.revealCost.trophies
          }
        : undefined
    })),
    currentEncounter: state.currentEncounter
      ? normalizeLegacyThreatCard(state.currentEncounter)
      : null,
    pendingEffect: state.pendingEffect
      ? normalizeLegacyEncounterEffect(state.pendingEffect)
      : null,
    pendingTileChallenge: state.pendingTileChallenge
      ? {
          ...state.pendingTileChallenge,
          successEffect: normalizeLegacyEncounterEffect(state.pendingTileChallenge.successEffect),
          failureEffect: normalizeLegacyEncounterEffect(state.pendingTileChallenge.failureEffect)
        }
      : state.pendingTileChallenge,
    pendingStaticIntercessionReaction: state.pendingStaticIntercessionReaction
      ? {
          ...state.pendingStaticIntercessionReaction,
          suppressibleEffects: state.pendingStaticIntercessionReaction.suppressibleEffects.map((entry) => ({
            ...entry,
            effect: normalizeLegacyEncounterEffect(entry.effect)
          }))
        }
      : state.pendingStaticIntercessionReaction,
    eventLog: normalizeLegacyEventLog(state.eventLog)
  });
}

export function migrateSessionSnapshotV1ToV2(input: unknown): SessionSnapshot {
  const legacy = sessionSnapshotSchemaV1.parse(cloneUnknown(input));
  const { heatThreshold, ...state } = legacy.state;
  const legacyCompatibility = mergeLegacyCharacterHeat(legacy.state, legacy.legacyCompatibility);

  return sessionSnapshotSchema.parse({
    saveVersion: CURRENT_SAVE_VERSION,
    sessionId: legacy.sessionId,
    sequence: legacy.sequence,
    state: normalizeScenarioOwnershipState(
      normalizeLegacyGameState({ ...state, reflectionPressureThreshold: heatThreshold })
    ),
    ...(legacyCompatibility ? { legacyCompatibility } : {})
  });
}

export function parseAndMigrateSessionSnapshot(input: unknown, source = "session snapshot"): SessionSnapshot {
  const version = readVersion(input);
  if (version === undefined) return migrateSessionSnapshotV1ToV2(migrateSessionSnapshotV0ToV1(input));
  if (version === 1) return migrateSessionSnapshotV1ToV2(input);
  if (version === CURRENT_SAVE_VERSION) {
    const legacyCompatible = legacyCompatibleSessionSnapshotSchemaV2.parse(cloneUnknown(input));
    const legacyCompatibility = mergeLegacyCharacterHeat(
      legacyCompatible.state,
      legacyCompatible.legacyCompatibility
    );
    return sessionSnapshotSchema.parse({
      ...legacyCompatible,
      state: normalizeScenarioOwnershipState(normalizeLegacyGameState(legacyCompatible.state)),
      ...(legacyCompatibility
        ? { legacyCompatibility }
        : { legacyCompatibility: undefined })
    });
  }
  throw new UnsupportedSnapshotVersionError(version, source);
}

export function serializeSessionSnapshotV2(
  state: GameState,
  legacyCompatibility?: LegacyCompatibilityMetadata
): SessionSnapshot {
  return sessionSnapshotSchema.parse({
    saveVersion: CURRENT_SAVE_VERSION,
    sessionId: state.sessionId,
    sequence: state.sequence,
    state: cloneUnknown(normalizeScenarioOwnershipState(state)),
    ...(legacyCompatibility ? { legacyCompatibility: cloneUnknown(legacyCompatibility) } : {})
  });
}
