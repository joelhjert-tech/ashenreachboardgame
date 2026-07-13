import type { SessionMode } from "../schema/session.schema.js";

export type SoloDifficultyTier = "outer" | "middle" | "inner" | "center" | "unknown";

export const SOLO_REFLECTION_PRESSURE_THRESHOLD = 8;
export const SOLO_WOUND_THRESHOLD = 4;
export const SOLO_BROKEN_SEAL_TOKENS = 8;
export const MULTIPLAYER_BROKEN_SEAL_TOKENS = 6;
export const SOLO_BROKEN_SEAL_CONFRONTATION_EASE = 2;
export const SOLO_MOVEMENT_DIFFICULTY_EASE = 1;
export const SOLO_OUTER_COMBAT_DIFFICULTY_EASE = 2;
export const SOLO_MIDDLE_COMBAT_DIFFICULTY_EASE = 1;
export const SOLO_DEVOURER_TROPHY_GATE = 5;
export const SOLO_LABYRINTH_ENGINE_KEY_GATE = 2;
export const SOLO_DYING_STAR_TOKEN_GATE = 4;
export const SOLO_DYING_STAR_CONTRACT_GATE = 2;

export function isSinglePlayerMode(sessionMode: SessionMode): boolean {
  return sessionMode === "single-player";
}

export function getReflectionPressureThresholdForMode(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_REFLECTION_PRESSURE_THRESHOLD : 6;
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

export function getSoloCombatDifficultyEase(sessionMode: SessionMode, tier: SoloDifficultyTier): number {
  if (!isSinglePlayerMode(sessionMode)) {
    return 0;
  }

  if (tier === "outer") {
    return SOLO_OUTER_COMBAT_DIFFICULTY_EASE;
  }

  if (tier === "middle") {
    return SOLO_MIDDLE_COMBAT_DIFFICULTY_EASE;
  }

  return 0;
}

export function easeBrokenSealConfrontationDifficulty(sessionMode: SessionMode, difficulty: number): number {
  return isSinglePlayerMode(sessionMode)
    ? Math.max(1, difficulty - SOLO_BROKEN_SEAL_CONFRONTATION_EASE)
    : difficulty;
}

export function getDevourerTrophyGate(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_DEVOURER_TROPHY_GATE : 8;
}

export function getLabyrinthEngineKeyGate(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_LABYRINTH_ENGINE_KEY_GATE : 3;
}

export function getDyingStarTokenGate(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_DYING_STAR_TOKEN_GATE : 5;
}

export function getDyingStarContractGate(sessionMode: SessionMode): number {
  return isSinglePlayerMode(sessionMode) ? SOLO_DYING_STAR_CONTRACT_GATE : 3;
}
