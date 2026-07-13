import { z } from "zod";
import {
  legacySessionSnapshotSchemaV0,
  sessionSnapshotSchema,
  type GameState,
  type LegacyCompatibilityMetadata,
  type SessionSnapshot
} from "../schema/session.schema.js";

export const CURRENT_SAVE_VERSION = 1 as const;

export class UnsupportedSnapshotVersionError extends Error {
  public constructor(public readonly actualVersion: unknown, source = "session snapshot") {
    super(`${source} has unsupported saveVersion ${JSON.stringify(actualVersion)}; supported versions are unversioned legacy v0 and current v1.`);
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

export function migrateSessionSnapshotV0ToV1(input: unknown): SessionSnapshot {
  const legacy = legacySessionSnapshotSchemaV0.parse(cloneUnknown(input));
  const characterHeat: LegacyCompatibilityMetadata["characterHeat"] = [];
  const players = legacy.state.players.map((player) => {
    const { heat, ...character } = player.character;
    if (heat > 0) characterHeat.push({ seatId: player.seatId, characterId: character.id, value: heat });
    return { ...player, character };
  });

  return sessionSnapshotSchema.parse({
    saveVersion: CURRENT_SAVE_VERSION,
    sessionId: legacy.sessionId,
    sequence: legacy.sequence,
    state: { ...legacy.state, players },
    ...(characterHeat.length > 0 ? { legacyCompatibility: { characterHeat } } : {})
  });
}

export function parseAndMigrateSessionSnapshot(input: unknown, source = "session snapshot"): SessionSnapshot {
  const version = readVersion(input);
  if (version === undefined) return migrateSessionSnapshotV0ToV1(input);
  if (version !== CURRENT_SAVE_VERSION) throw new UnsupportedSnapshotVersionError(version, source);
  return sessionSnapshotSchema.parse(cloneUnknown(input));
}

export function serializeSessionSnapshotV1(
  state: GameState,
  legacyCompatibility?: LegacyCompatibilityMetadata
): SessionSnapshot {
  return sessionSnapshotSchema.parse({
    saveVersion: CURRENT_SAVE_VERSION,
    sessionId: state.sessionId,
    sequence: state.sequence,
    state: cloneUnknown(state),
    ...(legacyCompatibility ? { legacyCompatibility: cloneUnknown(legacyCompatibility) } : {})
  });
}
