import type { ThreatIcon } from "../data/boardSpaces.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";

export const PERSISTENT_HAZARD_IDS = {
  emberlungVent: "emberlung-vent",
  knotrailCaveIn: "knotrail-cave-in",
  deadwireRepeater: "deadwire-repeater",
  ledgerMoldBloom: "ledger-mold-bloom",
  latchfogNullfield: "latchfog-nullfield"
} as const;

export const KNOTRAIL_ROUTE_BLOCK_REASON =
  "Route blocked: Knotrail Cave-In may be entered and cleared, but it cannot be crossed.";

export const LEDGER_MOLD_SERVICE_LOCK_REASON =
  "Service locked — clear Ledger-Mold Bloom before using this sector's services.";

export function hasPersistentHazard(
  state: GameState,
  sectorId: string,
  hazardId: string
): boolean {
  if (
    (state.edgeHazardSuppressions ?? []).some(
      (entry) => entry.sectorId === sectorId && entry.hazardId === hazardId
    )
  ) {
    return false;
  }
  return state.sectors
    .find((sector) => sector.id === sectorId)
    ?.persistentThreatIds?.includes(hazardId) ?? false;
}

export function getPersistentEnemyDifficultyModifier(
  state: GameState,
  sectorId: string
): number {
  const sector = state.sectors.find((entry) => entry.id === sectorId);
  if (!sector) return 0;
  return [sector.id, ...sector.neighbors].some((candidateId) =>
    hasPersistentHazard(state, candidateId, PERSISTENT_HAZARD_IDS.emberlungVent)
  ) ? 1 : 0;
}

export function getPersistentHazardMovementBlockReason(
  state: GameState,
  player: PlayerState,
  fromSectorId: string
): string | null {
  if (fromSectorId === player.character.currentSpaceId) return null;
  return hasPersistentHazard(state, fromSectorId, PERSISTENT_HAZARD_IDS.knotrailCaveIn)
    ? KNOTRAIL_ROUTE_BLOCK_REASON
    : null;
}

export function getPersistentHazardExtraThreatLane(
  state: GameState,
  sectorId: string,
  firstPrintedLane: ThreatIcon | undefined
): ThreatIcon | null {
  if (!firstPrintedLane) return null;
  return hasPersistentHazard(state, sectorId, PERSISTENT_HAZARD_IDS.deadwireRepeater)
    ? firstPrintedLane
    : null;
}

export function getPersistentHazardServiceLockReason(
  state: GameState,
  sectorId: string
): string | null {
  return hasPersistentHazard(state, sectorId, PERSISTENT_HAZARD_IDS.ledgerMoldBloom)
    ? LEDGER_MOLD_SERVICE_LOCK_REASON
    : null;
}

export function isFirstThreatGearSuppressed(
  progress: GameState["tileArrivalThreatProgress"]
): boolean {
  if (!progress || progress.nextThreatIconIndex !== 1) return false;
  return (progress.threatRuleIds ?? []).some((ruleId) =>
    ruleId.startsWith(`persistent:${PERSISTENT_HAZARD_IDS.latchfogNullfield}:`)
  );
}
