import { z } from "zod";
import {
  legacySessionSnapshotSchemaV0,
  sessionSnapshotSchema,
  sessionSnapshotSchemaV1,
  type GameState,
  type LegacyCompatibilityMetadata,
  type SessionSnapshot,
  type SessionSnapshotV1
} from "../schema/session.schema.js";
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

export function migrateSessionSnapshotV0ToV1(input: unknown): SessionSnapshotV1 {
  const legacy = legacySessionSnapshotSchemaV0.parse(cloneUnknown(input));
  const characterHeat: LegacyCompatibilityMetadata["characterHeat"] = [];
  const players = legacy.state.players.map((player) => {
    const { heat, ...character } = player.character;
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

export function migrateSessionSnapshotV1ToV2(input: unknown): SessionSnapshot {
  const legacy = sessionSnapshotSchemaV1.parse(cloneUnknown(input));
  const { heatThreshold, ...state } = legacy.state;

  return sessionSnapshotSchema.parse({
    saveVersion: CURRENT_SAVE_VERSION,
    sessionId: legacy.sessionId,
    sequence: legacy.sequence,
    state: normalizeScenarioOwnershipState({ ...state, reflectionPressureThreshold: heatThreshold }),
    ...(legacy.legacyCompatibility ? { legacyCompatibility: legacy.legacyCompatibility } : {})
  });
}

export function parseAndMigrateSessionSnapshot(input: unknown, source = "session snapshot"): SessionSnapshot {
  const version = readVersion(input);
  if (version === undefined) return migrateSessionSnapshotV1ToV2(migrateSessionSnapshotV0ToV1(input));
  if (version === 1) return migrateSessionSnapshotV1ToV2(input);
  if (version === CURRENT_SAVE_VERSION) {
    const current = sessionSnapshotSchema.parse(cloneUnknown(input));
    return sessionSnapshotSchema.parse({ ...current, state: normalizeScenarioOwnershipState(current.state) });
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
