import type { ReactElement } from "react";
import { RIFTFALL_BOARD_NODES, type BoardNode } from "../../data/riftfallBoardNodes.js";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import { ThreatIconBadge } from "../shared/ChallengeBadge.js";
import type { SectorNode } from "../shared/types.js";
import type { BoardRect } from "./boardGeometry.js";
import {
  getBoardMapRuntimeAssetPaths,
  getMapRegionLayerAssetPath,
  getMapTileBackgroundImage
} from "./mapAssetRegistry.js";

export function getBoardTileAssetPaths(): string[] {
  return getBoardMapRuntimeAssetPaths();
}

const tileScaleByRing: Record<BoardNode["ring"], number> = {
  outer: 0.112,
  middle: 0.096,
  inner: 0.078,
  center: 0.15
};

const tileSizeByRingAndSide: Record<
  BoardNode["ring"],
  Record<"horizontal" | "vertical" | "center", { width: number; height: number }>
> = {
  outer: {
    horizontal: { width: 0.112, height: 0.116 },
    vertical: { width: 0.096, height: 0.16 },
    center: { width: 0.112, height: 0.116 }
  },
  middle: {
    horizontal: { width: 0.092, height: 0.088 },
    vertical: { width: 0.082, height: 0.128 },
    center: { width: 0.092, height: 0.088 }
  },
  inner: {
    horizontal: { width: 0.128, height: 0.074 },
    vertical: { width: 0.078, height: 0.092 },
    center: { width: 0.128, height: 0.074 }
  },
  center: {
    horizontal: { width: 0.2, height: 0.12 },
    vertical: { width: 0.2, height: 0.12 },
    center: { width: 0.2, height: 0.12 }
  }
};

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
  nemesisSectorIds?: Set<string>;
  onSelectNode?: (nodeId: string) => void;
  debugEnabled?: boolean;
}

export interface TilePlayerMarker {
  seatId: string;
  label: string;
  color: string;
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

export function TalismanBoardSurface({
  imageRect,
  activeNodeId = null,
  selectedNodeId = null,
  legalTargetIds,
  sectorsById,
  occupantCountsByNodeId,
  playerMarkersByNodeId,
  nemesisSectorIds,
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
      <div
        className="talisman-board-ring talisman-board-ring-outer"
        style={{ backgroundImage: `url("${getMapRegionLayerAssetPath("outer")}")` }}
      />
      <div
        className="talisman-board-ring talisman-board-ring-middle"
        style={{ backgroundImage: `url("${getMapRegionLayerAssetPath("middle")}")` }}
      />
      <div
        className="talisman-board-ring talisman-board-ring-inner"
        style={{ backgroundImage: `url("${getMapRegionLayerAssetPath("inner")}")` }}
      />
      <div
        className="talisman-board-ring talisman-board-ring-core"
        style={{ backgroundImage: `url("${getMapRegionLayerAssetPath("center")}")` }}
      />
      <div className="talisman-board-spoke talisman-board-spoke-north" />
      <div className="talisman-board-spoke talisman-board-spoke-east" />
      <div className="talisman-board-spoke talisman-board-spoke-south" />
      <div className="talisman-board-spoke talisman-board-spoke-west" />

      {RIFTFALL_BOARD_NODES.map((node) => {
        const side = getTileSide(node);
        const fallbackTileSize = tileScaleByRing[node.ring] * imageRect.width;
        const tileSize = tileSizeByRingAndSide[node.ring][side];
        const tileWidth = tileSize ? tileSize.width * imageRect.width : fallbackTileSize;
        const tileHeight = tileSize ? tileSize.height * imageRect.height : fallbackTileSize;
        const left = node.x * imageRect.width;
        const top = node.y * imageRect.height;
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
        const isShop = boardSpace?.tags.includes("shop") || boardSpace?.tags.includes("risk-shop");
        const isLockedShop = Boolean(isShop && localThreatDeckCount > 0);
        const hasNemesis = nemesisSectorIds?.has(node.id) ?? false;
        const tileStatus = [
          isActive ? "current location" : null,
          isLegal ? "legal destination" : null,
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
              backgroundImage: getMapTileBackgroundImage(node.id, tone)
            }}
            aria-label={`${node.label}, ${node.ring} region${tileStatus ? `, ${tileStatus}` : ""}`}
            aria-current={isActive ? "location" : undefined}
            aria-pressed={isSelected}
            onClick={() => onSelectNode?.(node.id)}
          >
            <div className="talisman-board-tile-scrim" />
            <span className="talisman-board-tile-region">{node.ring === "center" ? "Final" : tileLabelByRing[node.ring]}</span>
            <span className="talisman-board-tile-label">{node.label}</span>
            {threatIcons.length > 0 && (
              <span className="talisman-board-tile-icons" aria-hidden="true">
                {threatIcons.slice(0, 3).map((icon, index) => (
                  <ThreatIconBadge key={`${node.id}-${icon}-${index}`} icon={icon} />
                ))}
              </span>
            )}
            {playerMarkers.length > 0 && (
              <span className="talisman-board-tile-players" aria-label={`${playerMarkers.length} operative${playerMarkers.length === 1 ? "" : "s"} on ${node.label}`}>
                {playerMarkers.slice(0, 3).map((marker) => (
                  <span
                    key={marker.seatId}
                    data-testid={`token-${marker.seatId}`}
                    data-sector-id={node.id}
                    className="talisman-board-player-marker"
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
    </div>
  );
}
