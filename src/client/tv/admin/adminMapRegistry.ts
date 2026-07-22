import { RIFTFALL_BOARD_NODES, type BoardNode } from "../../../data/riftfallBoardNodes.js";
import { createCanonicalSectorGraph } from "../../../game/data/canonicalSectorGraph.js";
import { getBoardSpace, type BoardSpaceDefinition } from "../../../game/data/boardSpaces.js";
import { getMovementStepBlockReason, buildMovementRoutePlan, type MovementRoutePlan } from "../../../game/rules/movementPlanner.js";
import type { GameState, PlayerState } from "../../../game/schema/session.schema.js";
import type { SectorNode } from "../../../game/schema/sector.schema.js";
import { BOARD_TILE_LAYOUT, type BoardTileLayoutEntry } from "../boardTileLayout.js";
import { TILE_ASSETS } from "../tileAssetManifest.js";
import { adminLibraryCards } from "./adminLibraryRegistry.js";
import { canonicalTileChallengeReferences } from "./adminMapReferences.js";
import { buildTileFunctionDefinition, simulateTileArrival, type TileFunctionDefinition } from "../../../game/rules/tileFunctions.js";

export type AdminMapView = "artwork" | "connections" | "content" | "images" | "movement";
export type AdminConnectionType = "normal" | "ring-transition" | "gate" | "bridge" | "ferry" | "invalid";

export interface AdminMapContent {
  id: string;
  name: string;
  kind: "hazard" | "enemy" | "anomaly" | "contract" | "artifact" | "escalation" | "tile-challenge" | "service";
  difficulty?: number | string;
  skill?: string;
  libraryCardId: string | null;
}

export interface AdminMapConnection {
  id: string;
  sourceTileId: string;
  targetTileId: string;
  connectionType: AdminConnectionType;
  isBidirectional: boolean;
  requirements: string[];
  blockedReason: string | null;
  warnings: string[];
}

export interface AdminMapTile {
  id: string;
  name: string;
  ring: BoardNode["ring"];
  region: string;
  index: number;
  position: BoardTileLayoutEntry | null;
  tileType: string;
  danger: number;
  tags: string[];
  threatIcons: string[];
  connections: AdminMapConnection[];
  hazards: AdminMapContent[];
  challenges: AdminMapContent[];
  encounters: AdminMapContent[];
  services: AdminMapContent[];
  contracts: AdminMapContent[];
  artifacts: AdminMapContent[];
  escalations: AdminMapContent[];
  artworkUrl: string | null;
  artworkPath: string | null;
  artworkFolder: string | null;
  dataSourcePath: string;
  dataSourceFolder: string;
  layoutSourcePath: string;
  rules: string[];
  metadataWarnings: string[];
  tileFunction: TileFunctionDefinition | null;
  arrivalSimulation: ReturnType<typeof simulateTileArrival> | null;
}

export interface AdminMapAudit {
  tileCount: number;
  connectionCount: number;
  directedConnectionCount: number;
  oneWayConnectionCount: number;
  invalidConnectionCount: number;
  missingArtworkCount: number;
  duplicateArtworkTileCount: number;
  duplicatePositionTileCount: number;
  structurallyUnreachableTileIds: string[];
  warningTileIds: string[];
}

export interface AdminMovementSimulation {
  plan: MovementRoutePlan | null;
  stateFingerprintBefore: string;
  stateFingerprintAfter: string;
}

const DATA_SOURCE_PATH = "src/game/data/boardSpaces.ts";
const LAYOUT_SOURCE_PATH = "src/client/tv/boardTileLayout.ts";
const libraryById = new Map(adminLibraryCards.map((card) => [card.id, card] as const));
const sectorGraph = createCanonicalSectorGraph();

function folderOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/") + 1);
}

function contentFor(id: string, kind: AdminMapContent["kind"]): AdminMapContent {
  const card = libraryById.get(id);
  return {
    id,
    name: card?.name ?? id.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    kind: card?.encounterType === "enemy" ? "enemy" : card?.encounterType === "hazard" ? "hazard" : kind,
    difficulty: card?.difficulty,
    skill: card?.skills[0]?.name,
    libraryCardId: card ? id : null
  };
}

function getRequirementCopy(space: BoardSpaceDefinition | null): string[] {
  return (space?.movementRequirements ?? []).flatMap((requirement) => [
    ...(requirement.allowedFrom?.length ? [`Allowed from: ${requirement.allowedFrom.join(", ")}`] : []),
    ...(requirement.requiredNotes?.length ? [`Requires: ${requirement.requiredNotes.join(", ")}`] : [])
  ]);
}

function buildConnection(node: BoardNode, targetId: string, nodeIndex: ReadonlyMap<string, BoardNode>): AdminMapConnection {
  const target = nodeIndex.get(targetId);
  const targetSpace = getBoardSpace(targetId);
  const requirements = getRequirementCopy(targetSpace);
  const warnings: string[] = [];
  if (!target) warnings.push(`Connection references missing destination ${targetId}.`);
  const isBidirectional = Boolean(target?.connections.includes(node.id));
  if (target && !isBidirectional) warnings.push("Connection is one-way in canonical topology.");
  if (targetId === node.id) warnings.push("Self-connection detected.");
  const connectionType: AdminConnectionType = !target
    ? "invalid"
    : node.ring !== target.ring && requirements.length > 0
      ? "gate"
      : node.ring !== target.ring
        ? "ring-transition"
        : "normal";
  return {
    id: `${node.id}--${targetId}`,
    sourceTileId: node.id,
    targetTileId: targetId,
    connectionType,
    isBidirectional,
    requirements,
    blockedReason: targetSpace?.movementRequirements?.[0]?.errorMessage ?? null,
    warnings
  };
}

function buildStructuralReachability(nodes: BoardNode[]): string[] {
  const index = new Map(nodes.map((node) => [node.id, node] as const));
  const start = nodes.find((node) => node.ring === "outer");
  if (!start) return nodes.map((node) => node.id);
  const visited = new Set([start.id]);
  const queue = [start.id];
  while (queue.length > 0) {
    const current = index.get(queue.shift() ?? "");
    for (const targetId of current?.connections ?? []) {
      if (!index.has(targetId) || visited.has(targetId)) continue;
      visited.add(targetId);
      queue.push(targetId);
    }
  }
  return nodes.filter((node) => !visited.has(node.id)).map((node) => node.id);
}

export function buildAdminMapRegistry(
  nodes: BoardNode[] = RIFTFALL_BOARD_NODES,
  sectors: SectorNode[] = sectorGraph,
  layout: Record<string, BoardTileLayoutEntry> = BOARD_TILE_LAYOUT,
  tileAssets: Record<string, string> = TILE_ASSETS
): { tiles: AdminMapTile[]; audit: AdminMapAudit } {
  const nodeIndex = new Map(nodes.map((node) => [node.id, node] as const));
  const sectorsById = new Map(sectors.map((sector) => [sector.id, sector] as const));
  const artCounts = new Map<string, number>();
  const positionCounts = new Map<string, number>();
  for (const node of nodes) {
    const artwork = tileAssets[node.id];
    if (artwork) artCounts.set(artwork, (artCounts.get(artwork) ?? 0) + 1);
    const entry = layout[node.id];
    if (entry) {
      const key = `${entry.x}:${entry.y}`;
      positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);
    }
  }

  const tiles = nodes.map((node): AdminMapTile => {
    const sector = sectorsById.get(node.id);
    const boardSpace = getBoardSpace(node.id);
    const position = layout[node.id] ?? null;
    const artworkUrl = tileAssets[node.id] ?? null;
    const connections = node.connections.map((targetId) => buildConnection(node, targetId, nodeIndex));
    const metadataWarnings = connections.flatMap((connection) => connection.warnings);
    if (!sector) metadataWarnings.push("Tile has no canonical sector record.");
    if (!boardSpace) metadataWarnings.push("Tile has no canonical board-space definition.");
    if (!position) metadataWarnings.push("Tile is absent from the rendered board layout.");
    if (!artworkUrl) metadataWarnings.push("Missing canonical tile artwork reference.");
    if (position && (position.x < 0 || position.x > 1 || position.y < 0 || position.y > 1)) metadataWarnings.push("Tile position is outside the board boundary.");
    if (position && (positionCounts.get(`${position.x}:${position.y}`) ?? 0) > 1) metadataWarnings.push("Multiple tiles occupy this board position.");
    if (artworkUrl && (artCounts.get(artworkUrl) ?? 0) > 1) metadataWarnings.push(`Duplicate artwork reference: public${artworkUrl}.`);
    if (connections.length === 0) metadataWarnings.push("Tile has no movement connections.");

    const threat = sector?.encounterDecks.threat ?? [];
    const challenges = canonicalTileChallengeReferences.filter((challenge) => challenge.sectorId === node.id).map((challenge) => contentFor(challenge.id, "tile-challenge"));
    const encounters = threat.map((id) => contentFor(id, "hazard"));
    const hazards = encounters.filter((entry) => entry.kind === "hazard");
    const enemies = encounters.filter((entry) => entry.kind === "enemy");
    const anomaly = (sector?.encounterDecks.anomaly ?? []).map((id) => contentFor(id, "anomaly"));
    const services = boardSpace?.tags.filter((tag) => tag === "shop" || tag === "risk-shop" || tag === "recovery").map((tag) => contentFor(`${node.id}:${tag}`, "service")) ?? [];
    const artworkPath = artworkUrl ? `public${artworkUrl}` : null;
    const rules = [boardSpace?.movementBox?.text, boardSpace?.textBox.text, boardSpace?.ruleText, ...(boardSpace?.movementRequirements?.map((requirement) => requirement.errorMessage) ?? [])].filter((value): value is string => Boolean(value));

    const tileChallenges = canonicalTileChallengeReferences.filter((challenge) => challenge.sectorId === node.id);
    const tileFunction = boardSpace ? buildTileFunctionDefinition(boardSpace, tileChallenges) : null;
    const arrivalSimulation = boardSpace ? simulateTileArrival(boardSpace, tileChallenges) : null;
    if (tileFunction?.arrival.some((rule) => !rule.supported) || tileFunction?.optionalActions.some((rule) => !rule.supported)) {
      metadataWarnings.push("Tile function contains an unsupported executable rule.");
    }

    return {
      id: node.id,
      name: boardSpace?.name ?? node.label,
      ring: node.ring,
      region: sector?.regionTier ?? node.ring,
      index: boardSpace?.index ?? nodes.indexOf(node),
      position,
      tileType: boardSpace?.tags[0] ?? "normal",
      danger: sector?.danger ?? 0,
      tags: boardSpace?.tags ?? [],
      threatIcons: boardSpace?.threatIcons ?? [],
      connections,
      hazards,
      challenges: [...challenges, ...anomaly],
      encounters: enemies,
      services,
      contracts: (sector?.encounterDecks.contract ?? []).map((id) => contentFor(id, "contract")),
      artifacts: (sector?.encounterDecks.artifact ?? []).map((id) => contentFor(id, "artifact")),
      escalations: (sector?.encounterDecks.escalation ?? []).map((id) => contentFor(id, "escalation")),
      artworkUrl,
      artworkPath,
      artworkFolder: artworkPath ? folderOf(artworkPath) : null,
      dataSourcePath: DATA_SOURCE_PATH,
      dataSourceFolder: folderOf(DATA_SOURCE_PATH),
      layoutSourcePath: LAYOUT_SOURCE_PATH,
      rules,
      metadataWarnings,
      tileFunction,
      arrivalSimulation
    };
  });

  const allConnections = tiles.flatMap((tile) => tile.connections);
  const undirected = new Set(allConnections.map((connection) => [connection.sourceTileId, connection.targetTileId].sort().join("--")));
  const structurallyUnreachableTileIds = buildStructuralReachability(nodes);
  return {
    tiles,
    audit: {
      tileCount: tiles.length,
      connectionCount: undirected.size,
      directedConnectionCount: allConnections.length,
      oneWayConnectionCount: allConnections.filter((connection) => !connection.isBidirectional).length,
      invalidConnectionCount: allConnections.filter((connection) => connection.connectionType === "invalid").length,
      missingArtworkCount: tiles.filter((tile) => !tile.artworkUrl).length,
      duplicateArtworkTileCount: tiles.filter((tile) => tile.metadataWarnings.some((warning) => warning.startsWith("Duplicate artwork"))).length,
      duplicatePositionTileCount: tiles.filter((tile) => tile.metadataWarnings.some((warning) => warning.includes("board position"))).length,
      structurallyUnreachableTileIds,
      warningTileIds: tiles.filter((tile) => tile.metadataWarnings.length > 0).map((tile) => tile.id)
    }
  };
}

function createSimulationState(startTileId: string, movementDistance: number, notes: string[]): GameState {
  const seatId = "admin-map-simulation";
  const player = {
    seatId,
    sectorId: startTileId,
    private: { hand: [], notes: [...notes] },
    character: { currentSpaceId: startTileId }
  } as unknown as PlayerState;
  return {
    sessionId: "admin-map-simulation",
    gameMode: "standard",
    sectors: createCanonicalSectorGraph(),
    players: [player],
    movementRolls: { [seatId]: movementDistance },
    movementRouteRevisions: { [seatId]: 0 }
  } as unknown as GameState;
}

export function buildAdminMovementSimulation(startTileId: string, movementDistance: number, notes: string[] = []): AdminMovementSimulation {
  const state = createSimulationState(startTileId, movementDistance, notes);
  const before = JSON.stringify(state);
  const plan = buildMovementRoutePlan(state, "admin-map-simulation");
  return { plan, stateFingerprintBefore: before, stateFingerprintAfter: JSON.stringify(state) };
}

export function checkAdminReachability(startTileId: string, notes: string[] = []): string[] {
  const state = createSimulationState(startTileId, 1, notes);
  const player = state.players[0]!;
  const visited = new Set([startTileId]);
  const queue = [startTileId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const sector = state.sectors.find((entry) => entry.id === current);
    for (const targetId of sector?.neighbors ?? []) {
      if (visited.has(targetId) || getMovementStepBlockReason(state, player, current, targetId)) continue;
      visited.add(targetId);
      queue.push(targetId);
    }
  }
  return state.sectors.filter((sector) => !visited.has(sector.id)).map((sector) => sector.id);
}

export const { tiles: adminMapTiles, audit: adminMapAudit } = buildAdminMapRegistry();
export const adminMapTileIndex = new Map(adminMapTiles.map((tile) => [tile.id, tile] as const));
export const canonicalMovementRequirementNotes = [...new Set(adminMapTiles.flatMap((tile) => tile.connections.flatMap((connection) => connection.requirements.filter((requirement) => requirement.startsWith("Requires: ")).flatMap((requirement) => requirement.replace("Requires: ", "").split(", ")))))].sort();
