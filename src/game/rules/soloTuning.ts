import type { SessionMode } from "../schema/session.schema.js";

export const SOLO_HEAT_THRESHOLD = 8;
export const SOLO_WOUND_THRESHOLD = 4;
export const SOLO_BROKEN_SEAL_TOKENS = 8;
export const MULTIPLAYER_BROKEN_SEAL_TOKENS = 6;
export const SOLO_BROKEN_SEAL_CONFRONTATION_EASE = 2;
export const SOLO_MOVEMENT_DIFFICULTY_EASE = 1;

export function isSinglePlayerMode(sessionMode: SessionMode): boolean {
  return sessionMode === "single-player";
}

export function getHeatThresholdForMode(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_HEAT_THRESHOLD : 6;
}

export function getWoundThresholdForMode(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_WOUND_THRESHOLD : 3;
}

export function getBrokenSealTokenLimit(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_BROKEN_SEAL_TOKENS : MULTIPLAYER_BROKEN_SEAL_TOKENS;
}

export function getSoloMovementDifficultyEase(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_MOVEMENT_DIFFICULTY_EASE : 0;
}

export function easeBrokenSealConfrontationDifficulty(sessionMode: SessionMode, difficulty: number): number {
  return isSinglePlayerMode(sessionMode)
    ? Math.max(1, difficulty - SOLO_BROKEN_SEAL_CONFRONTATION_EASE)
    : difficulty;
}
