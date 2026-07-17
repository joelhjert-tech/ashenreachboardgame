import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES, type BoardNode } from "../../data/riftfallBoardNodes.js";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { ThreatIconBadge } from "../shared/ChallengeBadge.js";
import type { SectorNode } from "../shared/types.js";
import type { BoardRect } from "./boardGeometry.js";
import { getBoardMapRuntimeAssetPaths } from "./mapAssetRegistry.js";
import { getBoardTileLayout, getBoardTileRouteAnchor } from "./boardTileLayout.js";
import { getExpectedTileAssetPath, getTileAssetPath } from "./tileAssetManifest.js";

export function getBoardTileAssetPaths(): string[] {
  return getBoardMapRuntimeAssetPaths();
}

const tileLabelByRing: Record<BoardNode["ring"], string> = {
  outer: "Borderlight",
  middle: "Red March",
  inner: "Crownfall",
  center: "Core"
};

interface TalismanBoardSurfaceProps {
  imageRect: BoardRect;
  activeNodeId?: string | null;
  selectedNodeId?: string | null;
  legalTargetIds?: Set<string>;
  sectorsById?: Map<string, SectorNode>;
  occupantCountsByNodeId?: Map<string, number>;
  playerMarkersByNodeId?: Map<string, TilePlayerMarker[]>;
  missionMarkersByNodeId?: Map<string, TileMissionMarker[]>;
  movingSeatIds?: Set<string>;
  movementAnimations?: TileMovementAnimation[];
  nemesisSectorIds?: Set<string>;
  centerTileArtPath?: string | null;
  centerConfrontationState?: "locked" | "unlocked" | "active" | "completed";
  onSelectNode?: (nodeId: string) => void;
  debugEnabled?: boolean;
}

export interface TilePlayerMarker {
  seatId: string;
  label: string;
  color: string;
}

export interface TileMissionMarker {
  seatId: string;
  playerLabel: string;
  missionTitle: string;
  reason: string;
}

export interface TileMovementAnimation {
  seatId: string;
  label: string;
  color: string;
  fromSectorId: string;
  toSectorId: string;
  routeSectorIds: string[];
  durationMs: number;
}

function getTileTone(node: BoardNode): string {
  const space = getBoardSpace(node.id);
  const icons = space?.threatIcons ?? [];

  if (node.ring === "center") {
    return "center";
  }

  if (node.id.includes("sanctum") || node.id.includes("shrine") || node.id.includes("relic")) {
    return "shrine";
  }

  if (icons.includes("blue")) {
    return "anomaly";
  }

  if (icons.includes("red")) {
    return "hazard";
  }

  if (icons.includes("yellow") || node.id.includes("market") || node.id.includes("cache")) {
    return "salvage";
  }

  return "neutral";
}

function getTileSide(node: BoardNode): "horizontal" | "vertical" | "center" {
  if (node.ring === "center") {
    return "center";
  }

  if (node.y <= 0.13 || node.y >= 0.87) {
    return "horizontal";
  }

  return Math.abs(node.y - 0.5) > Math.abs(node.x - 0.5) ? "horizontal" : "vertical";
}

export function BoardTileImage({ nodeId, label, className = "", overridePath = null }: { nodeId: string; label: string; className?: string; overridePath?: string | null }): ReactElement {
  const fallbackPath = getTileAssetPath(nodeId);
  const expectedPath = getExpectedTileAssetPath(nodeId);
  const [overrideFailed, setOverrideFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const assetPath = overridePath && !overrideFailed ? overridePath : fallbackPath;

  useEffect(() => {
    setOverrideFailed(false);
    setFallbackFailed(false);
  }, [overridePath, nodeId]);

  if (!assetPath || fallbackFailed) {
    if (typeof console !== "undefined") {
      console.warn(`[Ashen Reach] Missing board tile art for ${nodeId}. Expected ${assetPath ?? expectedPath}`);
    }

    return (
      <span className={`talisman-board-missing-art ${className}`.trim()} data-testid={`missing-tile-art-${nodeId}`}>
        <strong>Missing tile art</strong>
        <small>{nodeId}</small>
        <small>{assetPath ?? expectedPath}</small>
      </span>
    );
  }

  return (
    <img
      className={`talisman-board-tile-art ${className}`.trim()}
      src={assetPath}
      alt=""
      aria-hidden="true"
      loading="eager"
      draggable={false}
      onError={() => {
        if (overridePath && !overrideFailed) {
          console.warn(`[Ashen Reach] Missing scenario art for ${nodeId}. Falling back to ${fallbackPath ?? expectedPath}`);
          setOverrideFailed(true);
        } else {
          setFallbackFailed(true);
        }
      }}
      data-testid={`tile-art-${nodeId}`}
      title={label}
    />
  );
}

export function TalismanBoardSurface({
  imageRect,
  activeNodeId = null,
  selectedNodeId = null,
  legalTargetIds,
  sectorsById,
  occupantCountsByNodeId,
  playerMarkersByNodeId,
  missionMarkersByNodeId,
  movingSeatIds,
  movementAnimations = [],
  nemesisSectorIds,
  centerTileArtPath = null,
  centerConfrontationState = "locked",
  onSelectNode,
  debugEnabled = false
}: TalismanBoardSurfaceProps): ReactElement {
  return (
    <div
      className="talisman-board-surface"
      aria-label="Ashen Reach rectangular tactical board"
      style={{
        left: `${imageRect.left}px`,
        top: `${imageRect.top}px`,
        width: `${imageRect.width}px`,
        height: `${imageRect.height}px`
      }}
    >
      <div className="talisman-board-backdrop" />

      {RIFTFALL_BOARD_NODES.map((node) => {
        const side = getTileSide(node);
        const layout = getBoardTileLayout(node.id) ?? {
          x: node.x,
          y: node.y,
          width: 0.1,
          height: 0.1,
          routeAnchor: { x: node.x, y: node.y }
        };
        const tileWidth = layout.width * imageRect.width;
        const tileHeight = layout.height * imageRect.height;
        const left = layout.x * imageRect.width;
        const top = layout.y * imageRect.height;
        const tone = getTileTone(node);
        const isActive = activeNodeId === node.id;
        const isSelected = selectedNodeId === node.id;
        const isLegal = legalTargetIds?.has(node.id) ?? false;
        const boardSpace = getBoardSpace(node.id);
        const liveSector = sectorsById?.get(node.id) ?? null;
        const threatIcons = liveSector?.threatIcons?.length ? liveSector.threatIcons : boardSpace?.threatIcons ?? [];
        const localThreatDeckCount = liveSector?.encounterDecks.threat.length ?? 0;
        const occupantCount = occupantCountsByNodeId?.get(node.id) ?? 0;
        const playerMarkers = playerMarkersByNodeId?.get(node.id) ?? [];
        const missionMarkers = missionMarkersByNodeId?.get(node.id) ?? [];
        const isMissionTarget = missionMarkers.length > 0;
        const isShop = boardSpace?.tags.includes("shop") || boardSpace?.tags.includes("risk-shop");
        const isLockedShop = Boolean(isShop && localThreatDeckCount > 0);
        const hasNemesis = nemesisSectorIds?.has(node.id) ?? false;
        const tileStatus = [
          isActive ? "current location" : null,
          isLegal ? "legal destination" : null,
          isMissionTarget ? "mission target" : null,
          isLockedShop ? "shop locked" : null,
          hasNemesis ? "nemesis present" : null
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <button
            key={node.id}
            type="button"
            data-testid={`sector-node-${node.id}`}
            data-sector-id={node.id}
            data-legal-target={isLegal ? "true" : "false"}
            data-mission-target={isMissionTarget ? "true" : "false"}
            className={[
              "talisman-board-tile",
              "talisman-board-tile-button",
              `talisman-board-tile-${node.ring}`,
              `talisman-board-tile-${side}`,
              `talisman-board-tile-${tone}`,
              isActive ? "talisman-board-tile-active" : "",
              isActive ? "talisman-board-tile-current" : "",
              isSelected ? "talisman-board-tile-selected" : "",
              isLegal ? "talisman-board-tile-legal" : "",
              isMissionTarget ? "talisman-board-tile-mission" : "",
              isLockedShop ? "talisman-board-tile-locked" : "",
              hasNemesis ? "talisman-board-tile-nemesis" : "",
              debugEnabled ? "talisman-board-tile-debug" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${tileWidth}px`,
              height: `${tileHeight}px`,
              ["--tile-rotation" as string]: `${layout.rotation ?? 0}deg`,
              zIndex: layout.zIndex
            }}
            aria-label={`${node.label}, ${node.ring} region${tileStatus ? `, ${tileStatus}` : ""}`}
            aria-current={isActive ? "location" : undefined}
            aria-pressed={isSelected}
            onClick={() => onSelectNode?.(node.id)}
          >
            <BoardTileImage nodeId={node.id} label={node.label} overridePath={node.id === "center_cinder_gate" ? centerTileArtPath : null} />
            <div className="talisman-board-tile-scrim" />
            <span className="talisman-board-tile-region">{node.ring === "center" ? "Final" : tileLabelByRing[node.ring]}</span>
            <span className="talisman-board-tile-label">{node.label}</span>
            {node.id === "center_cinder_gate" ? (
              <span className="talisman-board-mission-badge" data-testid="final-confrontation-marker">
                Final Confrontation · {centerConfrontationState}
              </span>
            ) : null}
            {threatIcons.length > 0 && (
              <span className="talisman-board-tile-icons" aria-hidden="true">
                {threatIcons.slice(0, 3).map((icon, index) => (
                  <ThreatIconBadge key={`${node.id}-${icon}-${index}`} icon={icon} />
                ))}
              </span>
            )}
            {isMissionTarget && (
              <span
                className="talisman-board-mission-badge"
                data-testid={`mission-marker-${node.id}`}
                title={missionMarkers.map((marker) => `${marker.playerLabel}: ${marker.missionTitle}`).join(" | ")}
              >
                Mission
              </span>
            )}
            {playerMarkers.length > 0 && (
              <span className="talisman-board-tile-players" aria-label={`${playerMarkers.length} operative${playerMarkers.length === 1 ? "" : "s"} on ${node.label}`}>
                {playerMarkers.slice(0, 3).map((marker) => (
                  <span
                    key={marker.seatId}
                    data-testid={`token-${marker.seatId}`}
                    data-sector-id={node.id}
                    data-moving={movingSeatIds?.has(marker.seatId) ? "true" : "false"}
                    className={`talisman-board-player-marker${movingSeatIds?.has(marker.seatId) ? " talisman-board-player-marker-moving" : ""}`}
                    title={marker.label}
                    style={{ ["--token-fill" as string]: marker.color }}
                  >
                    {marker.label.slice(0, 1).toUpperCase()}
                  </span>
                ))}
                {playerMarkers.length > 3 && <span className="talisman-board-player-overflow">+{playerMarkers.length - 3}</span>}
              </span>
            )}
            <span className="talisman-board-tile-status" aria-hidden="true">
              {isLockedShop && <span className="talisman-board-lock">!</span>}
              {occupantCount > 0 && playerMarkers.length === 0 && <span className="talisman-board-player-count">{occupantCount}</span>}
              {hasNemesis && <span className="talisman-board-nemesis">Nemesis</span>}
            </span>
          </button>
        );
      })}

      {movementAnimations.map((animation) => {
        const routePoints = animation.routeSectorIds
          .map((sectorId) => {
            const node = RIFTFALL_BOARD_NODE_INDEX.get(sectorId);
            return node ? getBoardTileRouteAnchor(node) : null;
          })
          .filter((point): point is NonNullable<typeof point> => Boolean(point));
        const start = routePoints[0];
        const end = routePoints[routePoints.length - 1];

        if (!start || !end) {
          return null;
        }

        const path = routePoints
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * imageRect.width} ${point.y * imageRect.height}`)
          .join(" ");
        const routeSegments = routePoints.slice(0, -1).map((from, index) => ({
          id: `${animation.seatId}-${index}-${animation.routeSectorIds[index]}-${animation.routeSectorIds[index + 1]}`,
          from,
          to: routePoints[index + 1]!
        }));
        const animationStyle: CSSProperties = {
          ["--token-fill" as string]: animation.color,
          ["--movement-duration" as string]: `${animation.durationMs}ms`,
          ["--movement-path" as string]: `path("${path}")`
        };

        return (
          <span
            key={`${animation.seatId}-${animation.fromSectorId}-${animation.toSectorId}`}
            className="talisman-board-travel"
            data-testid={`movement-token-animation-${animation.seatId}`}
            data-from-sector-id={animation.fromSectorId}
            data-to-sector-id={animation.toSectorId}
            data-route={animation.routeSectorIds.join(" ")}
            style={animationStyle}
            aria-hidden="true"
          >
            <svg className="talisman-board-travel-route" aria-hidden="true">
              {routeSegments.map((segment) => (
                <line
                  key={segment.id}
                  data-testid={`movement-travel-route-${segment.id}`}
                  className="board-route board-route-movement board-route-movement-travel"
                  x1={segment.from.x * imageRect.width}
                  y1={segment.from.y * imageRect.height}
                  x2={segment.to.x * imageRect.width}
                  y2={segment.to.y * imageRect.height}
                />
              ))}
            </svg>
            <span className="talisman-board-travel-token" title={animation.label}>
              {animation.label.slice(0, 1).toUpperCase()}
            </span>
            <span
              className="talisman-board-travel-arrival"
              data-testid={`movement-arrival-pulse-${animation.seatId}`}
              style={{
                left: `${end.x * imageRect.width}px`,
                top: `${end.y * imageRect.height}px`
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
