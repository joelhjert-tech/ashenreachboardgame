import { RIFTFALL_BOARD_NODE_INDEX } from "../../data/riftfallBoardNodes.js";
import { getBoardSpace } from "../data/boardSpaces.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";
import { hasCrownKeyFragment } from "./nemesisRelay.js";

export type MovementRoute = {
  sectorId: string;
  distance: number;
  route: string[];
};

export type BlockedMovementRoute = MovementRoute & {
  disabledReason: string;
};

export type MovementRoutePlan = {
  movementValue: number;
  currentSectorId: string;
  routes: MovementRoute[];
  blockedRoutes: BlockedMovementRoute[];
};

function getPlayer(state: GameState, seatId: string): PlayerState | null {
  return state.players.find((entry) => entry.seatId === seatId) ?? null;
}

export function hasMovementRollForSeat(state: GameState, seatId: string): boolean {
  const rolledValue = state.movementRolls?.[seatId];

  return typeof rolledValue === "number" && Number.isInteger(rolledValue) && rolledValue > 0;
}

export function getMovementValueForSeat(state: GameState, seatId: string): number {
  const rolledValue = state.movementRolls?.[seatId];

  return typeof rolledValue === "number" && Number.isInteger(rolledValue) && rolledValue > 0 ? Math.max(1, rolledValue) : 1;
}

function getSectorDisplayName(state: GameState, sectorId: string): string {
  return state.sectors.find((sector) => sector.id === sectorId)?.name ?? getBoardSpace(sectorId)?.name ?? sectorId;
}

function getRegionTransitionBlockReason(state: GameState, fromSectorId: string, toSectorId: string): string | null {
  const fromSpace = getBoardSpace(fromSectorId);
  const toSpace = getBoardSpace(toSectorId);

  if (!fromSpace || !toSpace || fromSpace.tier === toSpace.tier) {
    return null;
  }

  const fromNode = RIFTFALL_BOARD_NODE_INDEX.get(fromSectorId);
  const toNode = RIFTFALL_BOARD_NODE_INDEX.get(toSectorId);

  if (fromNode?.connections.includes(toSectorId) && toNode?.connections.includes(fromSectorId)) {
    return null;
  }

  return `Route blocked: ${getSectorDisplayName(state, toSectorId)} requires a transition tile from ${getSectorDisplayName(state, fromSectorId)}`;
}

export function getMovementStepBlockReason(
  state: GameState,
  player: PlayerState,
  fromSectorId: string,
  toSectorId: string
): string | null {
  const fromSector = state.sectors.find((sector) => sector.id === fromSectorId);
  const targetSpace = getBoardSpace(toSectorId);
  const notes = new Set(player.private.notes);

  if (!fromSector) {
    return `Unknown sector ${fromSectorId}`;
  }

  if (!fromSector.neighbors.includes(toSectorId)) {
    return `Sector ${toSectorId} is not reachable from ${fromSectorId}`;
  }

  const regionTransitionBlockReason = getRegionTransitionBlockReason(state, fromSectorId, toSectorId);

  if (regionTransitionBlockReason) {
    return regionTransitionBlockReason;
  }

  if (
    state.gameMode === "nemesis_relay" &&
    targetSpace &&
    (targetSpace.tier === "inner" || targetSpace.tier === "center") &&
    !hasCrownKeyFragment(state, player.seatId)
  ) {
    return "A Crown-Key Fragment is required to enter the Inner Region during Nemesis Relay";
  }

  for (const requirement of targetSpace?.movementRequirements ?? []) {
    if (requirement.allowedFrom && !requirement.allowedFrom.includes(fromSectorId)) {
      return requirement.errorMessage;
    }

    if (requirement.requiredNotes && !requirement.requiredNotes.every((note) => notes.has(note))) {
      return requirement.errorMessage;
    }
  }

  return null;
}

export function buildMovementRoutePlan(state: GameState, seatId: string): MovementRoutePlan | null {
  const player = getPlayer(state, seatId);

  if (!player) {
    return null;
  }

  const currentSectorId = player.character.currentSpaceId;
  const currentSector = state.sectors.find((sector) => sector.id === currentSectorId);

  if (!currentSector || !hasMovementRollForSeat(state, seatId)) {
    return null;
  }

  const movementValue = getMovementValueForSeat(state, seatId);
  const routesByDestination = new Map<string, MovementRoute>();
  const blockedRoutesByDestination = new Map<string, BlockedMovementRoute>();
  let frontier: string[][] = [[currentSectorId]];

  for (let distance = 1; distance <= movementValue; distance += 1) {
    const nextFrontier: string[][] = [];

    for (const route of frontier) {
      const fromSectorId = route[route.length - 1]!;
      const fromSector = state.sectors.find((sector) => sector.id === fromSectorId);

      if (!fromSector) {
        continue;
      }

      for (const neighborId of fromSector.neighbors) {
        if (route.includes(neighborId)) {
          continue;
        }

        const nextRoute = [...route, neighborId];
        const disabledReason = getMovementStepBlockReason(state, player, fromSectorId, neighborId);

        if (disabledReason) {
          if (distance === 1 && !blockedRoutesByDestination.has(neighborId)) {
            blockedRoutesByDestination.set(neighborId, {
              sectorId: neighborId,
              distance,
              route: nextRoute,
              disabledReason
            });
          }
          continue;
        }

        if (distance === movementValue) {
          if (neighborId !== currentSectorId && !routesByDestination.has(neighborId)) {
            routesByDestination.set(neighborId, {
              sectorId: neighborId,
              distance,
              route: nextRoute
            });
          }
        } else {
          nextFrontier.push(nextRoute);
        }
      }
    }

    frontier = nextFrontier;
  }

  return {
    movementValue,
    currentSectorId,
    routes: [...routesByDestination.values()],
    blockedRoutes: [...blockedRoutesByDestination.values()]
  };
}

export function getLegalMovementRoute(state: GameState, seatId: string, toSectorId: string): MovementRoute | null {
  return buildMovementRoutePlan(state, seatId)?.routes.find((route) => route.sectorId === toSectorId) ?? null;
}

export function getMovementBlockReason(state: GameState, seatId: string, toSectorId: string): string | null {
  const plan = buildMovementRoutePlan(state, seatId);

  if (!plan) {
    return hasMovementRollForSeat(state, seatId) ? "No movement planner is available" : "Roll movement before choosing a destination";
  }

  return plan.blockedRoutes.find((route) => route.sectorId === toSectorId)?.disabledReason ?? null;
}
