import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { BOARD_SPACES, getBoardSpace, isScenarioConfrontationSpace } from "../../game/data/boardSpaces.js";
import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES } from "../../data/riftfallBoardNodes.js";
import type { ContractCard, OutcomeSummary, PublicMoveDestination, PublicPatchPayload, SectorNode, ThreatIcon } from "../shared/types.js";
import { ThreatIconBadge } from "../shared/ChallengeBadge.js";
import { buildRoutePreviewCopy } from "../shared/explainabilityPrompts.js";
import {
  buildEscalationMarker,
  buildScenarioAuras,
  buildScenarioMarkers,
  buildScenarioRoutes,
  type ScenarioAuraEffect,
  type ScenarioMarker,
  type ScenarioRouteEffect
} from "../shared/scenarioBoardVisuals.js";
import { BoardStage } from "./BoardStage.js";
import { pointerToBoardCoordinate, type BoardRect } from "./boardGeometry.js";
import { getBoardTileLayout, getBoardTileRouteAnchor } from "./boardTileLayout.js";
import { HostCinematicFxLayer, type MapFxPoint, type MapFxTrail } from "./HostCinematicFxLayer.js";
import { getMapBoardBaseAssetPath } from "./mapAssetRegistry.js";
import { TalismanBoardSurface, type TileMissionMarker, type TileMovementAnimation, type TilePlayerMarker } from "./TalismanBoardSurface.js";
import { getMissionRelevanceForSector } from "../shared/missionRelevance.js";

interface BoardMapProps {
  patch: PublicPatchPayload;
  previousPatch?: PublicPatchPayload | null;
  phase: string;
  showHeader?: boolean;
  showSidebar?: boolean;
  onMovementDestinationSelected?: (destination: PublicMoveDestination | null) => void;
}

interface CalibrationPoint {
  x: number;
  y: number;
}

function getSeatColor(index: number): string {
  const palette = ["#7fb2d8", "#d9a35d", "#d86f6f", "#7cc3a6", "#dfd8c5", "#a98fd1"];
  return palette[index % palette.length];
}

function outcomeText(outcome: OutcomeSummary | null): string | null {
  if (!outcome?.encounterTitle) {
    return null;
  }

  if (outcome.success === true) {
    return `${outcome.encounterTitle} resolved successfully.`;
  }

  if (outcome.success === false) {
    return `${outcome.encounterTitle} ended in a setback.`;
  }

  return `${outcome.encounterTitle} is unresolved.`;
}

function buildPlayerMarkersByNodeId(patch: PublicPatchPayload): Map<string, TilePlayerMarker[]> {
  const seatIndex = new Map(patch.seats.map((seat, index) => [seat.seatId, index] as const));
  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  const markersByNodeId = new Map<string, TilePlayerMarker[]>();

  patch.players.forEach((player) => {
    if (!RIFTFALL_BOARD_NODE_INDEX.has(player.sectorId)) {
      return;
    }

    const seat = patch.seats.find((entry) => entry.seatId === player.seatId);
    const existing = markersByNodeId.get(player.sectorId) ?? [];
    existing.push({
      color: getSeatColor(seatIndex.get(player.seatId) ?? existing.length),
      label: seat?.displayName ?? player.character.name,
      seatId: player.seatId,
      seatIndex: seatIndex.get(player.seatId) ?? patch.seats.length,
      active: player.seatId === activeSeatId
    });
    markersByNodeId.set(player.sectorId, existing);
  });

  markersByNodeId.forEach((markers) => markers.sort((left, right) => left.seatIndex - right.seatIndex));

  return markersByNodeId;
}

function buildActiveContractLookup(contracts: ContractCard[]): Map<string, ContractCard> {
  return new Map(contracts.map((contract) => [contract.id, contract] as const));
}

function buildMissionMarkersByNodeId(patch: PublicPatchPayload): Map<string, TileMissionMarker[]> {
  const contractById = buildActiveContractLookup(patch.availableContracts);
  const markersByNodeId = new Map<string, TileMissionMarker[]>();

  patch.players.forEach((player) => {
    const activeContract = player.character.activeContract
      ? contractById.get(player.character.activeContract.contractId) ?? null
      : null;

    if (!activeContract) {
      return;
    }

    const playerLabel =
      patch.seats.find((seat) => seat.seatId === player.seatId)?.displayName ??
      player.character.name;

    RIFTFALL_BOARD_NODES.forEach((node) => {
      const boardSpace = getBoardSpace(node.id);
      const liveSector = patch.sectors.find((sector) => sector.id === node.id) ?? null;
      const relevance = getMissionRelevanceForSector(activeContract, node.id, {
        threatIcons: liveSector?.threatIcons?.length ? liveSector.threatIcons : boardSpace?.threatIcons ?? [],
        faceUpThreatCount: 0
      });

      if (!relevance) {
        return;
      }

      const existing = markersByNodeId.get(node.id) ?? [];
      existing.push({
        seatId: player.seatId,
        playerLabel,
        missionTitle: activeContract.name,
        reason: relevance.reason
      });
      markersByNodeId.set(node.id, existing);
    });
  });

  return markersByNodeId;
}

function buildMovingSeatIds(patch: PublicPatchPayload, previousPatch: PublicPatchPayload | null): Set<string> {
  const movingSeatIds = new Set<string>();

  if (!previousPatch) {
    return movingSeatIds;
  }

  const previousSectorBySeatId = new Map(previousPatch.players.map((player) => [player.seatId, player.sectorId] as const));

  patch.players.forEach((player) => {
    const previousSectorId = previousSectorBySeatId.get(player.seatId);

    if (previousSectorId && previousSectorId !== player.sectorId) {
      movingSeatIds.add(player.seatId);
    }
  });

  return movingSeatIds;
}

function buildMovementRouteCacheKey(seatId: string, fromSectorId: string, toSectorId: string): string {
  return `${seatId}:${fromSectorId}:${toSectorId}`;
}

function getMovementAnimationDuration(routeSectorIds: string[]): number {
  const stepCount = Math.max(1, routeSectorIds.length - 1);
  return Math.min(900, Math.max(360, stepCount * 220));
}

function buildMovementAnimations(
  patch: PublicPatchPayload,
  previousPatch: PublicPatchPayload | null,
  routeCache: Map<string, string[]>
): TileMovementAnimation[] {
  if (!previousPatch) {
    return [];
  }

  const previousSectorBySeatId = new Map(previousPatch.players.map((player) => [player.seatId, player.sectorId] as const));
  const seatIndex = new Map(patch.seats.map((seat, index) => [seat.seatId, index] as const));

  return patch.players.flatMap((player): TileMovementAnimation[] => {
    const previousSectorId = previousSectorBySeatId.get(player.seatId);

    if (!previousSectorId || previousSectorId === player.sectorId) {
      return [];
    }

    const routeKey = buildMovementRouteCacheKey(player.seatId, previousSectorId, player.sectorId);
    const cachedRoute = routeCache.get(routeKey);
    const routeSectorIds = cachedRoute?.length ? cachedRoute : [previousSectorId, player.sectorId];

    if (routeSectorIds.some((sectorId) => !RIFTFALL_BOARD_NODE_INDEX.has(sectorId))) {
      return [];
    }

    const seat = patch.seats.find((entry) => entry.seatId === player.seatId);

    return [
      {
        seatId: player.seatId,
        label: seat?.displayName ?? player.character.name,
        color: getSeatColor(seatIndex.get(player.seatId) ?? 0),
        fromSectorId: previousSectorId,
        toSectorId: player.sectorId,
        routeSectorIds,
        durationMs: getMovementAnimationDuration(routeSectorIds)
      }
    ];
  });
}

function threatIconTone(icon: ThreatIcon): MapFxPoint["tone"] {
  if (icon === "blue") {
    return "anomaly";
  }

  return icon;
}

function getNodeSide(node: (typeof RIFTFALL_BOARD_NODES)[number]): "horizontal" | "vertical" | "center" {
  if (node.ring === "center") {
    return "center";
  }

  if (node.y <= 0.13 || node.y >= 0.87) {
    return "horizontal";
  }

  return Math.abs(node.y - 0.5) > Math.abs(node.x - 0.5) ? "horizontal" : "vertical";
}

function getMapFxTileSize(node: (typeof RIFTFALL_BOARD_NODES)[number]): Pick<MapFxPoint, "width" | "height"> {
  const layout = getBoardTileLayout(node.id);

  if (layout) {
    return { width: layout.width, height: layout.height };
  }

  const side = getNodeSide(node);

  if (node.ring === "center") {
    return { width: 0.255, height: 0.19 };
  }

  return side === "vertical" ? { width: 0.125, height: 0.168 } : { width: 0.125, height: 0.15 };
}

function getThreatIconsForNode(nodeId: string, liveSector: SectorNode | null): ThreatIcon[] {
  if (liveSector?.threatIcons?.length) {
    return liveSector.threatIcons;
  }

  return getBoardSpace(nodeId)?.threatIcons ?? [];
}

function buildMapFxPoints(patch: PublicPatchPayload, activeSectorId: string | null): MapFxPoint[] {
  const liveSectors = new Map(patch.sectors.map((sector) => [sector.id, sector] as const));
  const points: MapFxPoint[] = [];

  RIFTFALL_BOARD_NODES.forEach((node) => {
    const boardSpace = getBoardSpace(node.id);
    const liveSector = liveSectors.get(node.id) ?? null;
    const threatIcons = getThreatIconsForNode(node.id, liveSector);
    const tileSize = getMapFxTileSize(node);
    const dominantThreatIcon = threatIcons[0] ?? null;

    if (dominantThreatIcon) {
      points.push({
        id: `${node.id}-threat-field`,
        x: node.x,
        y: node.y,
        tone: threatIconTone(dominantThreatIcon),
        intensity: 0.62 + Math.min(1, (liveSector?.danger ?? boardSpace?.threatIcons.length ?? 1) / 7),
        ...tileSize
      });
    }

    if (boardSpace?.tags.includes("shop") || boardSpace?.tags.includes("risk-shop") || boardSpace?.tags.includes("shrine")) {
      points.push({
        id: `${node.id}-gold-service`,
        x: node.x,
        y: node.y,
        tone: "gold",
        intensity: boardSpace.tags.includes("risk-shop") ? 0.94 : 0.68,
        ...tileSize
      });
    }
  });

  if (activeSectorId) {
    const activeNode = RIFTFALL_BOARD_NODE_INDEX.get(activeSectorId);

    if (activeNode) {
      points.push({
        id: `${activeSectorId}-active`,
        x: activeNode.x,
        y: activeNode.y,
        tone: "active",
        intensity: 1.08,
        ...getMapFxTileSize(activeNode)
      });
    }
  }

  return points;
}

function buildNemesisTrails(patch: PublicPatchPayload, previousPatch: PublicPatchPayload | null | undefined): MapFxTrail[] {
  if (!patch.nemesisChampions?.length || !previousPatch?.nemesisChampions?.length) {
    return [];
  }

  const previousById = new Map(previousPatch.nemesisChampions.map((champion) => [champion.id, champion] as const));

  return patch.nemesisChampions
    .map((champion): MapFxTrail | null => {
      const previous = previousById.get(champion.id);

      if (!previous || previous.sectorId === champion.sectorId) {
        return null;
      }

      const from = RIFTFALL_BOARD_NODE_INDEX.get(previous.sectorId);
      const to = RIFTFALL_BOARD_NODE_INDEX.get(champion.sectorId);

      if (!from || !to) {
        return null;
      }

      const fromAnchor = getBoardTileRouteAnchor(from);
      const toAnchor = getBoardTileRouteAnchor(to);

      return {
        id: `${champion.id}-${previous.sectorId}-${champion.sectorId}`,
        fromX: fromAnchor.x,
        fromY: fromAnchor.y,
        toX: toAnchor.x,
        toY: toAnchor.y
      };
    })
    .filter((trail): trail is MapFxTrail => Boolean(trail));
}

export function BoardMap({ patch, previousPatch = null, phase, showHeader = true, showSidebar = true, onMovementDestinationSelected }: BoardMapProps): ReactElement {
  const boardAssetPath = getMapBoardBaseAssetPath();
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => RIFTFALL_BOARD_NODES[0]?.id ?? "");
  const [calibrationPoint, setCalibrationPoint] = useState<CalibrationPoint | null>(null);
  const [calibrationNodeId, setCalibrationNodeId] = useState<string>(() => RIFTFALL_BOARD_NODES[0]?.id ?? "");
  const movementRouteCacheRef = useRef<Map<string, string[]>>(new Map());
  const boardDebugEnabled =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("boardDebug") === "1";

  const activeSeatId = patch.turnOrder[patch.activeSeatIndex] ?? null;
  const activePlayer = patch.players.find((player) => player.seatId === activeSeatId) ?? null;
  const activeSectorId = activePlayer?.sectorId ?? null;
  const activeNodeId = activeSectorId && RIFTFALL_BOARD_NODE_INDEX.has(activeSectorId) ? activeSectorId : null;

  useEffect(() => {
    if (activeNodeId) {
      setSelectedNodeId(activeNodeId);
    }
  }, [activeNodeId]);

  const sectorsById = useMemo(() => new Map(patch.sectors.map((sector) => [sector.id, sector] as const)), [patch.sectors]);
  const movementPlanner = patch.movementPlanner?.active ? patch.movementPlanner : null;
  useEffect(() => {
    if (movementPlanner?.selectedDestinationId) {
      setSelectedNodeId(movementPlanner.selectedDestinationId);
    }
  }, [movementPlanner?.selectedDestinationId]);
  useEffect(() => {
    if (!movementPlanner || !activeSeatId) {
      return;
    }

    movementPlanner.destinations.forEach((destination) => {
      if (destination.disabledReason || destination.route.length < 2) {
        return;
      }

      movementRouteCacheRef.current.set(
        buildMovementRouteCacheKey(activeSeatId, movementPlanner.currentSectorId, destination.sectorId),
        destination.route
      );
    });
  }, [activeSeatId, movementPlanner]);
  const legalTargetIds = useMemo(
    () =>
      movementPlanner
        ? new Set(
            movementPlanner.destinations
              .filter((destination) => !destination.disabledReason)
              .map((destination) => destination.sectorId)
          )
        : new Set<string>(),
    [movementPlanner]
  );
  const selectedNode = RIFTFALL_BOARD_NODE_INDEX.get(selectedNodeId) ?? RIFTFALL_BOARD_NODES[0];
  const selectedBoardSpace = selectedNode ? getBoardSpace(selectedNode.id) : null;
  const selectedSector = selectedNode ? sectorsById.get(selectedNode.id) ?? null : null;
  const selectedOccupants = selectedNode ? patch.players.filter((player) => player.sectorId === selectedNode.id) : [];
  const selectedMoveDestination =
    selectedNode && movementPlanner
      ? movementPlanner.destinations.find((destination) => destination.sectorId === selectedNode.id) ?? null
      : null;
  useEffect(() => {
    onMovementDestinationSelected?.(selectedMoveDestination);
  }, [onMovementDestinationSelected, selectedMoveDestination]);
  const selectedRoutePreview =
    selectedMoveDestination && movementPlanner
      ? buildRoutePreviewCopy(selectedMoveDestination, movementPlanner.movementValue, movementPlanner.currentSectorName, true)
      : null;
  const movementRouteSegments = useMemo(
    () =>
      selectedMoveDestination && !selectedMoveDestination.disabledReason
        ? selectedMoveDestination.route.slice(0, -1).flatMap((fromNodeId, index) => {
            const toNodeId = selectedMoveDestination.route[index + 1];
            const from = RIFTFALL_BOARD_NODE_INDEX.get(fromNodeId);
            const to = toNodeId ? RIFTFALL_BOARD_NODE_INDEX.get(toNodeId) : null;

            if (!from || !to) {
              return [];
            }

            const fromAnchor = getBoardTileRouteAnchor(from);
            const toAnchor = getBoardTileRouteAnchor(to);

            return [
              {
                id: `${selectedMoveDestination.sectorId}-${index}-${fromNodeId}-${toNodeId}`,
                from: fromAnchor,
                to: toAnchor
              }
            ];
          })
        : [],
    [selectedMoveDestination]
  );
  const selectedGateRules =
    selectedBoardSpace?.movementRequirements?.map((requirement) => {
      const parts = [
        requirement.allowedFrom?.length
          ? `From ${requirement.allowedFrom.map((entry) => getBoardSpace(entry)?.name ?? entry).join(" or ")}`
          : null,
        requirement.requiredNotes?.length ? `Needs ${requirement.requiredNotes.join(", ")}` : null
      ].filter((entry): entry is string => Boolean(entry));

      return parts.length > 0 ? parts.join(" | ") : requirement.errorMessage;
    }) ?? [];
  const selectedActionFocus = selectedNode
    ? isScenarioConfrontationSpace(selectedNode.id)
      ? `Scenario confrontation space | ${patch.activeScenario?.confrontationTitle ?? "Core breach"}`
      : selectedBoardSpace?.textBox.choices?.length
        ? `Choice-driven sector text | ${selectedBoardSpace.textBox.choices.map((choice) => choice.label).join(" | ")}`
        : selectedBoardSpace?.textBox.title ?? "Sector telemetry"
    : "Sector telemetry";
  const scenarioMarkers = buildScenarioMarkers(patch);
  const escalationMarker = buildEscalationMarker(patch);
  const scenarioAuras = buildScenarioAuras(patch);
  const scenarioRoutes = buildScenarioRoutes(patch);
  const mapFxPoints = useMemo(() => buildMapFxPoints(patch, activeSectorId), [activeSectorId, patch]);
  const mapFxTrails = useMemo(() => buildNemesisTrails(patch, previousPatch), [patch, previousPatch]);
  const occupantCountsByNodeId = useMemo(() => {
    const counts = new Map<string, number>();

    patch.players.forEach((player) => {
      counts.set(player.sectorId, (counts.get(player.sectorId) ?? 0) + 1);
    });

    return counts;
  }, [patch.players]);
  const playerMarkersByNodeId = useMemo(() => buildPlayerMarkersByNodeId(patch), [patch]);
  const missionMarkersByNodeId = useMemo(() => buildMissionMarkersByNodeId(patch), [patch]);
  const movingSeatIds = useMemo(() => buildMovingSeatIds(patch, previousPatch), [patch, previousPatch]);
  const movementAnimations = useMemo(
    () => buildMovementAnimations(patch, previousPatch, movementRouteCacheRef.current),
    [patch, previousPatch]
  );
  const nemesisSectorIds = useMemo(
    () => new Set((patch.nemesisChampions ?? []).filter((champion) => !champion.defeated).map((champion) => champion.sectorId)),
    [patch.nemesisChampions]
  );

  const calibrationExport = useMemo(
    () =>
      JSON.stringify(
        RIFTFALL_BOARD_NODES.map((node) =>
          node.id === calibrationNodeId && calibrationPoint
            ? {
                ...node,
                x: Number(calibrationPoint.x.toFixed(4)),
                y: Number(calibrationPoint.y.toFixed(4))
              }
            : node
        ),
        null,
        2
      ),
    [calibrationNodeId, calibrationPoint]
  );

  return (
    <section className="tv-board-panel" aria-label="Tactical campaign board">
      {showHeader && (
        <div className="tv-board-panel-header">
          <div>
            <h2>Tactical Campaign Board</h2>
            <p>Track routes, threat pressure, and team positioning from the command table.</p>
          </div>
        </div>
      )}

      <div className="tv-board-shell">
        <BoardStage
          imageAlt="Tactical campaign board"
          imageSrc={boardAssetPath}
          imageMode="geometry-only"
          geometryAspectRatio={16 / 9}
          onPointerDown={
            boardDebugEnabled
              ? (event, imageRect) => {
                  const coordinate = pointerToBoardCoordinate(event.nativeEvent.offsetX, event.nativeEvent.offsetY, imageRect);

                  if (!coordinate) {
                    return;
                  }

                  setCalibrationPoint(coordinate);
                }
              : undefined
          }
        >
          {({ imageRect }) => {
            return (
              <>
                <TalismanBoardSurface
                  imageRect={imageRect}
                  activeNodeId={activeSectorId}
                  selectedNodeId={selectedNodeId}
                  legalTargetIds={legalTargetIds}
                  sectorsById={sectorsById}
                  occupantCountsByNodeId={occupantCountsByNodeId}
                  playerMarkersByNodeId={playerMarkersByNodeId}
                  missionMarkersByNodeId={missionMarkersByNodeId}
                  movingSeatIds={movingSeatIds}
                  movementAnimations={movementAnimations}
                  nemesisSectorIds={nemesisSectorIds}
                  centerTileArtPath={patch.activeScenario?.sheetArtPath ?? null}
                  centerConfrontationState={
                    patch.scenarioState?.result.status === "victory" || patch.scenarioState?.result.status === "loss"
                      ? "completed"
                      : patch.scenarioState?.confrontation.active
                        ? "active"
                        : patch.scenarioState?.confrontation.locked === false
                          ? "unlocked"
                          : "locked"
                  }
                  onSelectNode={setSelectedNodeId}
                  debugEnabled={boardDebugEnabled}
                />
                <HostCinematicFxLayer
                  variant="map"
                  points={boardDebugEnabled ? mapFxPoints : []}
                  trails={mapFxTrails}
                  scanlineKey={`${patch.escalationLevel}-${patch.escalationThreshold}`}
                  className="host-map-fx-layer"
                  testId="host-map-fx-layer"
                  style={{
                    left: `${imageRect.left}px`,
                    top: `${imageRect.top}px`,
                    width: `${imageRect.width}px`,
                    height: `${imageRect.height}px`
                  }}
                />
                {boardDebugEnabled && (
                  <svg className="board-route-overlay" aria-hidden="true">
                    {scenarioRoutes.map((effect) => {
                      const from = RIFTFALL_BOARD_NODE_INDEX.get(effect.fromNodeId);
                      const to = RIFTFALL_BOARD_NODE_INDEX.get(effect.toNodeId);

                      if (!from || !to) {
                        return null;
                      }

                      return (
                        <line
                          key={effect.id}
                          data-testid={`scenario-route-${effect.id}`}
                          className={`board-route board-route-scenario board-route-scenario-${effect.tone}`}
                          x1={imageRect.left + from.x * imageRect.width}
                          y1={imageRect.top + from.y * imageRect.height}
                          x2={imageRect.left + to.x * imageRect.width}
                          y2={imageRect.top + to.y * imageRect.height}
                        />
                      );
                    })}
                  </svg>
                )}
                {movementRouteSegments.length > 0 && (
                  <svg className="board-route-overlay board-route-overlay-movement" aria-hidden="true">
                    {movementRouteSegments.map((segment) => (
                      <line
                        key={segment.id}
                        data-testid={`movement-route-${segment.id}`}
                        className="board-route board-route-movement"
                        x1={imageRect.left + segment.from.x * imageRect.width}
                        y1={imageRect.top + segment.from.y * imageRect.height}
                        x2={imageRect.left + segment.to.x * imageRect.width}
                        y2={imageRect.top + segment.to.y * imageRect.height}
                      />
                    ))}
                  </svg>
                )}

                <div className="board-scenario-layer" aria-label="Scenario markers">
                  {scenarioAuras.map((effect) => {
                    const node = RIFTFALL_BOARD_NODE_INDEX.get(effect.nodeId);

                    if (!node) {
                      return null;
                    }

                    const left = imageRect.left + node.x * imageRect.width;
                    const top = imageRect.top + node.y * imageRect.height;

                    return (
                      <div
                        key={effect.id}
                        data-testid={`scenario-aura-${effect.id}`}
                        data-sector-id={effect.nodeId}
                        className={`board-scenario-aura board-scenario-aura-${effect.variant} board-scenario-aura-${effect.tone}`}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`
                        }}
                      />
                    );
                  })}

                  {[...scenarioMarkers, escalationMarker].map((marker) => {
                    const node = marker.nodeId ? RIFTFALL_BOARD_NODE_INDEX.get(marker.nodeId) : null;
                    const left = imageRect.left + (marker.x ?? node?.x ?? 0.5) * imageRect.width;
                    const top = imageRect.top + (marker.y ?? node?.y ?? 0.5) * imageRect.height;

                    return (
                      <div
                        key={marker.id}
                        data-testid={`scenario-marker-${marker.id}`}
                        data-sector-id={marker.nodeId}
                        className={`board-scenario-marker board-scenario-marker-${marker.kind} board-scenario-marker-${marker.tone}`}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`
                        }}
                      >
                        <span>{marker.label}</span>
                        <strong>{marker.value}</strong>
                      </div>
                    );
                  })}
                </div>

                {boardDebugEnabled && calibrationPoint && (
                  <div
                    className="board-debug-point"
                    aria-hidden="true"
                    style={{
                      left: `${imageRect.left + calibrationPoint.x * imageRect.width}px`,
                      top: `${imageRect.top + calibrationPoint.y * imageRect.height}px`
                    }}
                  />
                )}
              </>
            );
          }}
        </BoardStage>

        {showSidebar && (
          <aside className="tv-board-sidebar">
            <section className="tv-board-sidebar-card">
              <div className="tv-card-header">
                <h3>Sector Brief</h3>
                <span className="board-sidebar-ring">{selectedNode?.ring ?? "outer"}</span>
              </div>
              <p className="board-sidebar-title">{selectedNode?.label ?? "Unknown node"}</p>
              {selectedMoveDestination && selectedRoutePreview && (
                <div className="board-sidebar-route-preview" data-testid="tv-route-preview">
                  <div>
                    <span>Route preview</span>
                    <strong>{selectedMoveDestination.name}</strong>
                  </div>
                  <p>
                    Move {movementPlanner?.movementValue ?? selectedMoveDestination.distance}: {selectedRoutePreview.exactText}
                  </p>
                  <p>{selectedRoutePreview.pathText}</p>
                  <div className="board-sidebar-tags" aria-label={`${selectedMoveDestination.name} route preview tags`}>
                    {selectedRoutePreview.tagLabels.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <small>{selectedRoutePreview.riskText ?? selectedRoutePreview.rewardText ?? selectedRoutePreview.statusReason}</small>
                </div>
              )}
              {selectedBoardSpace?.tags && selectedBoardSpace.tags.length > 0 && (
                <div className="board-sidebar-tags" aria-label="Sector tags">
                  {selectedBoardSpace.tags.map((tag) => (
                    <span key={tag}>{tag.replace("-", " ")}</span>
                  ))}
                </div>
              )}
              <p className="tv-empty-copy">
                {selectedBoardSpace?.textBox.text ?? "No board-space text available for this marker yet."}
              </p>
              {selectedBoardSpace?.ruleText && (
                <div className="tv-scenario-rules-block">
                  <strong>Sector Rule</strong>
                  <p>{selectedBoardSpace.ruleText}</p>
                </div>
              )}
              {selectedBoardSpace?.loreText && <p className="board-sidebar-lore">{selectedBoardSpace.loreText}</p>}
              <div className="board-sidebar-meta">
                <span>Threat {selectedBoardSpace?.threatIcons.length ?? selectedSector?.danger ?? 0}</span>
                <span>Occupants {selectedOccupants.length}</span>
                {selectedSector && <span>Region {selectedSector.regionTier}</span>}
              </div>
              {selectedBoardSpace?.threatIcons && selectedBoardSpace.threatIcons.length > 0 && (
                <div className="board-sidebar-challenge-icons" aria-label="Printed challenge icons">
                  {selectedBoardSpace.threatIcons.map((icon, index) => (
                    <ThreatIconBadge key={`${icon}-${index}`} icon={icon} />
                  ))}
                </div>
              )}
              <div className="board-sidebar-meta">
                <span>{selectedActionFocus}</span>
              </div>
              {selectedBoardSpace?.textBox.choices && selectedBoardSpace.textBox.choices.length > 0 && (
                <div className="board-sidebar-meta">
                  {selectedBoardSpace.textBox.choices.map((choice) => (
                    <span key={choice.id}>{choice.label}</span>
                  ))}
                </div>
              )}
              {selectedGateRules.length > 0 && (
                <div className="tv-scenario-rules-block">
                  <strong>Entry Rules</strong>
                  {selectedGateRules.map((entry) => (
                    <p key={entry}>{entry}</p>
                  ))}
                </div>
              )}
              {selectedBoardSpace?.movementBox && <p className="board-sidebar-note">{selectedBoardSpace.movementBox.title}</p>}
              {patch.outcomeSummary?.movedToSectorId === selectedNode?.id && (
                <p className="board-sidebar-note">{outcomeText(patch.outcomeSummary)}</p>
              )}
              {selectedOccupants.length > 0 && (
                <ul className="board-sidebar-list">
                  {selectedOccupants.map((player) => {
                    const seat = patch.seats.find((entry) => entry.seatId === player.seatId);

                    return (
                      <li key={player.seatId}>
                        {seat?.displayName ?? player.character.name} | Wounds {player.character.wounds} | Scars {player.character.scars.length}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {boardDebugEnabled && (
              <section className="tv-board-sidebar-card board-debug-card">
                <div className="tv-card-header">
                  <h3>Calibration</h3>
                </div>
                <label className="field">
                  <span>Node</span>
                  <select value={calibrationNodeId} onChange={(event) => setCalibrationNodeId(event.target.value)}>
                    {RIFTFALL_BOARD_NODES.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="tv-empty-copy">
                  Click the board to capture normalized coordinates. Current click:
                  {" "}
                  {calibrationPoint ? `${calibrationPoint.x.toFixed(4)}, ${calibrationPoint.y.toFixed(4)}` : "none"}
                </p>
                <textarea className="board-debug-export" readOnly value={calibrationExport} />
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(calibrationExport);
                  }}
                >
                  Copy JSON
                </button>
              </section>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
