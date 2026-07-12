import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES, type BoardNode } from "../../data/riftfallBoardNodes.js";
import { getBoardSpace } from "../data/boardSpaces.js";
import type { GameState, PlayerState } from "../schema/session.schema.js";
import { hasCrownKeyFragment } from "./nemesisRelay.js";

export type MovementRoute = {
  routeId: string;
  sectorId: string;
  distance: number;
  route: string[];
};

export type BlockedMovementRoute = MovementRoute & {
  disabledReason: string;
};

export type MovementRoutePlan = {
  revision: number;
  movementValue: number;
  currentSectorId: string;
  routes: MovementRoute[];
  blockedRoutes: BlockedMovementRoute[];
};

function hashRouteIdentity(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function getMovementRevision(state: GameState, seatId: string): number {
  return state.movementRouteRevisions?.[seatId] ?? 0;
}

function identifyRoute(state: GameState, seatId: string, route: Omit<MovementRoute, "routeId">): MovementRoute {
  const revision = getMovementRevision(state, seatId);
  const identity = [revision, seatId, route.route[0], route.sectorId, route.distance, ...route.route].join("|");
  return { ...route, routeId: `route-${revision}-${hashRouteIdentity(identity)}` };
}

function identifyBlockedRoute(state: GameState, seatId: string, route: Omit<BlockedMovementRoute, "routeId">): BlockedMovementRoute {
  return { ...identifyRoute(state, seatId, route), disabledReason: route.disabledReason };
}

function getPlayer(state: GameState, seatId: string): PlayerState | null {
  return state.players.find((entry) => entry.seatId === seatId) ?? null;
}

export function hasMovementRollForSeat(state: GameState, seatId: string): boolean {
  const rolledValue = state.movementRolls?.[seatId];

  return typeof rolledValue === "number" && Number.isInteger(rolledValue) && rolledValue > 0;
}

export function getMovementValueForSeat(state: GameState, seatId: string): number {
  const rolledValue = state.movementRolls?.[seatId];
  const adjustment = state.movementAdjustments?.[seatId]?.adjustment ?? 0;
  return typeof rolledValue === "number" && Number.isInteger(rolledValue) && rolledValue > 0 ? Math.max(1, rolledValue + adjustment) : 1;
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

function getRingTrack(ring: BoardNode["ring"]): BoardNode[] {
  return RIFTFALL_BOARD_NODES.filter((node) => node.ring === ring);
}

function getRingTrackNeighbor(sectorId: string, direction: -1 | 1): string | null {
  const node = RIFTFALL_BOARD_NODE_INDEX.get(sectorId);

  if (!node || node.ring === "center") {
    return null;
  }

  const ringTrack = getRingTrack(node.ring);
  const index = ringTrack.findIndex((entry) => entry.id === sectorId);

  if (index < 0 || ringTrack.length < 2) {
    return null;
  }

  const nextIndex = (index + direction + ringTrack.length) % ringTrack.length;
  return ringTrack[nextIndex]?.id ?? null;
}

function isAuthoredTransitionEdge(fromSectorId: string, toSectorId: string): boolean {
  const fromNode = RIFTFALL_BOARD_NODE_INDEX.get(fromSectorId);
  const toNode = RIFTFALL_BOARD_NODE_INDEX.get(toSectorId);

  if (!fromNode || !toNode || fromNode.ring === toNode.ring) {
    return false;
  }

  return fromNode.connections.includes(toSectorId) && toNode.connections.includes(fromSectorId);
}

function addMovementRoute(
  routesByPath: Map<string, MovementRoute>,
  route: MovementRoute,
  currentSectorId: string
): void {
  const pathKey = route.route.join("\u001f");
  if (route.sectorId !== currentSectorId && !routesByPath.has(pathKey)) {
    routesByPath.set(pathKey, route);
  }
}

function addBlockedMovementRoute(
  blockedRoutesByDestination: Map<string, BlockedMovementRoute>,
  route: BlockedMovementRoute
): void {
  if (!blockedRoutesByDestination.has(route.sectorId)) {
    blockedRoutesByDestination.set(route.sectorId, route);
  }
}

function buildRingTrackRoute(
  state: GameState,
  player: PlayerState,
  currentSectorId: string,
  movementValue: number,
  direction: -1 | 1
): MovementRoute | BlockedMovementRoute | null {
  const route = [currentSectorId];
  let fromSectorId = currentSectorId;

  for (let distance = 1; distance <= movementValue; distance += 1) {
    const neighborId = getRingTrackNeighbor(fromSectorId, direction);

    if (!neighborId) {
      return null;
    }

    const nextRoute = [...route, neighborId];
    const disabledReason = getMovementStepBlockReason(state, player, fromSectorId, neighborId);

    if (disabledReason) {
      return identifyBlockedRoute(state, player.seatId, {
        sectorId: neighborId,
        distance,
        route: nextRoute,
        disabledReason
      });
    }

    route.push(neighborId);
    fromSectorId = neighborId;
  }

  return identifyRoute(state, player.seatId, {
    sectorId: fromSectorId,
    distance: movementValue,
    route
  });
}

function buildGraphRoutePlan(state: GameState, player: PlayerState, currentSectorId: string, movementValue: number): MovementRoutePlan {
  const queue: Array<{ sectorId: string; route: string[] }> = [{ sectorId: currentSectorId, route: [currentSectorId] }];
  const routesByDestination = new Map<string, MovementRoute>();
  const blockedRoutesByDestination = new Map<string, BlockedMovementRoute>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const distance = current.route.length - 1;

    if (distance === movementValue) {
      addMovementRoute(
        routesByDestination,
        identifyRoute(state, player.seatId, {
          sectorId: current.sectorId,
          distance,
          route: current.route
        }),
        currentSectorId
      );
      continue;
    }

    const sector = state.sectors.find((entry) => entry.id === current.sectorId);

    if (!sector) {
      continue;
    }

    for (const neighborId of sector.neighbors) {
      const nextDistance = distance + 1;
      const nextRoute = [...current.route, neighborId];
      const disabledReason = getMovementStepBlockReason(state, player, current.sectorId, neighborId);

      if (disabledReason) {
        addBlockedMovementRoute(blockedRoutesByDestination, identifyBlockedRoute(state, player.seatId, {
          sectorId: neighborId,
          distance: nextDistance,
          route: nextRoute,
          disabledReason
        }));
        continue;
      }

      if (current.route.includes(neighborId)) {
        continue;
      }
      queue.push({
        sectorId: neighborId,
        route: nextRoute
      });
    }
  }

  return {
    revision: getMovementRevision(state, player.seatId),
    movementValue,
    currentSectorId,
    routes: [...routesByDestination.values()],
    blockedRoutes: [...blockedRoutesByDestination.values()]
  };
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
  const currentBoardNode = RIFTFALL_BOARD_NODE_INDEX.get(currentSectorId);

  if (!currentBoardNode) {
    return buildGraphRoutePlan(state, player, currentSectorId, movementValue);
  }

  ([-1, 1] as const).forEach((direction) => {
    const route = buildRingTrackRoute(state, player, currentSectorId, movementValue, direction);

    if (!route) {
      return;
    }

    if ("disabledReason" in route) {
      addBlockedMovementRoute(blockedRoutesByDestination, route);
      return;
    }

    addMovementRoute(routesByDestination, route, currentSectorId);
  });

  if (movementValue === 1) {
    for (const neighborId of currentSector.neighbors) {
      const nextRoute = [currentSectorId, neighborId];
      const disabledReason = getMovementStepBlockReason(state, player, currentSectorId, neighborId);

      if (disabledReason) {
        addBlockedMovementRoute(blockedRoutesByDestination, identifyBlockedRoute(state, seatId, {
          sectorId: neighborId,
          distance: 1,
          route: nextRoute,
          disabledReason
        }));
        continue;
      }

      const fromSpace = getBoardSpace(currentSectorId);
      const toSpace = getBoardSpace(neighborId);
      const isSameRegionStep = !fromSpace || !toSpace || fromSpace.tier === toSpace.tier;

      if (isSameRegionStep || isAuthoredTransitionEdge(currentSectorId, neighborId)) {
        addMovementRoute(
          routesByDestination,
          identifyRoute(state, seatId, {
            sectorId: neighborId,
            distance: 1,
            route: nextRoute
          }),
          currentSectorId
        );
      }
    }
  }

  return {
    revision: getMovementRevision(state, seatId),
    movementValue,
    currentSectorId,
    routes: [...routesByDestination.values()],
    blockedRoutes: [...blockedRoutesByDestination.values()]
  };
}

export function getLegalMovementRoute(state: GameState, seatId: string, toSectorId: string): MovementRoute | null {
  return buildMovementRoutePlan(state, seatId)?.routes.find((route) => route.sectorId === toSectorId) ?? null;
}

export function getLegalMovementRouteVariant(
  state: GameState,
  seatId: string,
  toSectorId: string,
  routeId: string,
  revision: number
): MovementRoute | null {
  const plan = buildMovementRoutePlan(state, seatId);
  if (!plan || plan.revision !== revision) return null;
  return plan.routes.find((route) => route.sectorId === toSectorId && route.routeId === routeId) ?? null;
}

export function getMovementBlockReason(state: GameState, seatId: string, toSectorId: string): string | null {
  const plan = buildMovementRoutePlan(state, seatId);

  if (!plan) {
    return hasMovementRollForSeat(state, seatId) ? "No movement planner is available" : "Roll movement before choosing a destination";
  }

  return plan.blockedRoutes.find((route) => route.sectorId === toSectorId)?.disabledReason ?? null;
}

export function getVoidKeyMovementRoute(state: GameState, seatId: string, toSectorId: string): BlockedMovementRoute | null {
  const plan = buildMovementRoutePlan(state, seatId);
  const player = getPlayer(state, seatId);
  if (!plan || !player) return null;
  const blocked = plan.blockedRoutes.find((route) => route.sectorId === toSectorId && route.distance === plan.movementValue);
  const target = getBoardSpace(toSectorId);
  if (!blocked || !target?.movementRequirements?.length) return null;
  const previous = blocked.route.at(-2);
  if (!previous || !state.sectors.find((sector) => sector.id === previous)?.neighbors.includes(toSectorId)) return null;
  const supportedReasons = (target.movementRequirements ?? []).flatMap((requirement) => {
    const blockedByFrom = Boolean(requirement.allowedFrom && !requirement.allowedFrom.includes(previous));
    const notes = new Set(player.private.notes);
    const blockedByNotes = Boolean(requirement.requiredNotes && !requirement.requiredNotes.every((note) => notes.has(note)));
    return blockedByFrom || blockedByNotes ? [requirement.errorMessage] : [];
  });
  return supportedReasons.length === 1 && supportedReasons[0] === blocked.disabledReason ? blocked : null;
}
