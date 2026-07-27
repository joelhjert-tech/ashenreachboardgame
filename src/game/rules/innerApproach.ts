import { getBoardSpace } from "../data/boardSpaces.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";

export type InnerApproachPathId = "breach-road" | "choir-road";
export type InnerApproachDirection = "advance" | "retreat";

export interface InnerApproachProgress {
  pathId: InnerApproachPathId | null;
  clearedSectorIds: string[];
}

export interface InnerApproachMoveOption {
  sectorId: string;
  route: [string, string];
  direction: InnerApproachDirection;
  label: string;
  disabledReason: string | null;
}

export const INNER_APPROACH_PATHS: Record<InnerApproachPathId, readonly string[]> = {
  "breach-road": [
    "inner_veil_rift",
    "inner_tomb_gate",
    "inner_blackstar_shortcut",
    "the-bone-meridian",
    "inner_gate_of_cinders"
  ],
  "choir-road": [
    "choir-execution-court",
    "inner_cinder_lattice",
    "inner_choir_shrine",
    "the-bone-meridian",
    "inner_gate_of_cinders"
  ]
} as const;

export const INNER_APPROACH_SECTOR_IDS = new Set(
  Object.values(INNER_APPROACH_PATHS).flat()
);

const pathByEntrySector: Record<string, InnerApproachPathId> = {
  inner_veil_rift: "breach-road",
  "choir-execution-court": "choir-road"
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function successfulLegacyClears(state: GameState, seatId: string): string[] {
  const cleared = state.eventLog.flatMap((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("type" in entry) ||
      (entry as { type?: unknown }).type !== "SPACE_TEXT_RESOLVED"
    ) {
      return [];
    }
    const candidate = entry as {
      seatId?: unknown;
      sectorId?: unknown;
      success?: unknown;
    };
    return candidate.seatId === seatId &&
      typeof candidate.sectorId === "string" &&
      candidate.success === true &&
      INNER_APPROACH_SECTOR_IDS.has(candidate.sectorId)
      ? [candidate.sectorId]
      : [];
  });
  return unique(cleared);
}

function inferPathFromPosition(
  state: GameState,
  player: PlayerState,
  clearedSectorIds: readonly string[]
): InnerApproachPathId | null {
  const current = player.character.currentSpaceId;
  if (INNER_APPROACH_PATHS["breach-road"].slice(0, 3).includes(current)) return "breach-road";
  if (INNER_APPROACH_PATHS["choir-road"].slice(0, 3).includes(current)) return "choir-road";

  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const entry = state.eventLog[index];
    if (!entry || typeof entry !== "object" || !("seatId" in entry) || (entry as { seatId?: unknown }).seatId !== player.seatId) {
      continue;
    }
    const candidate = entry as { fromSectorId?: unknown; toSectorId?: unknown };
    for (const sectorId of [candidate.toSectorId, candidate.fromSectorId]) {
      if (typeof sectorId !== "string") continue;
      if (INNER_APPROACH_PATHS["breach-road"].slice(0, 3).includes(sectorId)) return "breach-road";
      if (INNER_APPROACH_PATHS["choir-road"].slice(0, 3).includes(sectorId)) return "choir-road";
    }
  }

  if (clearedSectorIds.some((sectorId) => INNER_APPROACH_PATHS["breach-road"].slice(0, 3).includes(sectorId))) {
    return "breach-road";
  }
  if (clearedSectorIds.some((sectorId) => INNER_APPROACH_PATHS["choir-road"].slice(0, 3).includes(sectorId))) {
    return "choir-road";
  }
  return current === "the-bone-meridian" || current === "inner_gate_of_cinders"
    ? "breach-road"
    : null;
}

export function getInnerApproachPathForEntry(sectorId: string): InnerApproachPathId | null {
  return pathByEntrySector[sectorId] ?? null;
}

export function isInnerApproachSector(sectorId: string): boolean {
  return INNER_APPROACH_SECTOR_IDS.has(sectorId);
}

export function getInnerApproachProgress(
  state: GameState,
  player: PlayerState
): InnerApproachProgress {
  const stored = player.innerApproachProgress;
  const legacyClears = stored ? [] : successfulLegacyClears(state, player.seatId);
  const gateClearedByLegacyNote = !stored && player.private.notes.includes("gate-of-cinders-breached")
    ? ["inner_gate_of_cinders"]
    : [];
  const clearedSectorIds = unique([
    ...(stored?.clearedSectorIds ?? []),
    ...legacyClears,
    ...gateClearedByLegacyNote
  ]).filter((sectorId) => INNER_APPROACH_SECTOR_IDS.has(sectorId));
  return {
    pathId: stored?.pathId ?? inferPathFromPosition(state, player, clearedSectorIds),
    clearedSectorIds
  };
}

export function getInnerApproachPath(
  state: GameState,
  player: PlayerState
): InnerApproachPathId | null {
  return getInnerApproachProgress(state, player).pathId;
}

export function isInnerApproachChallengeCleared(
  state: GameState,
  player: PlayerState,
  sectorId = player.character.currentSpaceId
): boolean {
  return getInnerApproachProgress(state, player).clearedSectorIds.includes(sectorId);
}

function displayName(state: GameState, sectorId: string): string {
  return state.sectors.find((sector) => sector.id === sectorId)?.name
    ?? getBoardSpace(sectorId)?.name
    ?? sectorId;
}

function middleRetreatOptions(
  state: GameState,
  player: PlayerState,
  originId: string
): InnerApproachMoveOption[] {
  const origin = state.sectors.find((sector) => sector.id === originId);
  return (origin?.neighbors ?? [])
    .filter((sectorId) => getBoardSpace(sectorId)?.tier === "middle")
    .sort((left, right) => displayName(state, left).localeCompare(displayName(state, right)))
    .map((sectorId) => ({
      sectorId,
      route: [originId, sectorId],
      direction: "retreat",
      label: `Retreat to ${displayName(state, sectorId)}`,
      disabledReason: null
    }));
}

export function buildInnerApproachMoveOptions(
  state: GameState,
  seatId: string
): InnerApproachMoveOption[] {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player || !isInnerApproachSector(player.character.currentSpaceId)) return [];

  const originId = player.character.currentSpaceId;
  const progress = getInnerApproachProgress(state, player);
  const pathId = progress.pathId ?? getInnerApproachPathForEntry(originId);
  if (!pathId) return [];
  const path = INNER_APPROACH_PATHS[pathId];
  const index = path.indexOf(originId);
  if (index < 0) return [];

  const cleared = progress.clearedSectorIds.includes(originId);
  const advanceSectorId = index === path.length - 1 ? "center_cinder_gate" : path[index + 1]!;
  const advance: InnerApproachMoveOption = {
    sectorId: advanceSectorId,
    route: [originId, advanceSectorId],
    direction: "advance",
    label: advanceSectorId === "center_cinder_gate"
      ? "Enter the Ashen Reach Core"
      : `Advance to ${displayName(state, advanceSectorId)}`,
    disabledReason: cleared
      ? null
      : `Clear ${displayName(state, originId)} before advancing`
  };

  const retreat = index > 0
    ? [{
        sectorId: path[index - 1]!,
        route: [originId, path[index - 1]!] as [string, string],
        direction: "retreat" as const,
        label: `Retreat to ${displayName(state, path[index - 1]!)}`,
        disabledReason: null
      }]
    : middleRetreatOptions(state, player, originId);

  return [advance, ...retreat];
}

export function getInnerApproachRouteProgress(
  state: GameState,
  seatId: string
): {
  pathId: InnerApproachPathId;
  sectorIds: string[];
  currentIndex: number;
  clearedSectorIds: string[];
} | null {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player || !isInnerApproachSector(player.character.currentSpaceId)) return null;
  const progress = getInnerApproachProgress(state, player);
  const pathId = progress.pathId ?? getInnerApproachPathForEntry(player.character.currentSpaceId);
  if (!pathId) return null;
  const sectorIds = [...INNER_APPROACH_PATHS[pathId], "center_cinder_gate"];
  return {
    pathId,
    sectorIds,
    currentIndex: sectorIds.indexOf(player.character.currentSpaceId),
    clearedSectorIds: progress.clearedSectorIds
  };
}
