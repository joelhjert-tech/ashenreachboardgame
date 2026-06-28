import type { ReactElement } from "react";
import { RIFTFALL_BOARD_NODES, type BoardNode } from "../../data/riftfallBoardNodes.js";
import { getBoardSpace } from "../../game/data/boardSpaces.js";
import type { BoardRect } from "./boardGeometry.js";

const tileArtByNodeId: Record<string, string> = {
  outer_ember_sanctum: "/assets/riftfall/board/tiles/outer/outer_saint_sanctuary.png",
  "ashwake-crossing": "/assets/riftfall/board/tiles/outer/outer_shrine_road.png",
  outer_waymarket: "/assets/riftfall/board/tiles/outer/outer_black_market.png",
  "glassmere-spindle": "/assets/riftfall/board/tiles/outer/outer_portal_ruins.png",
  outer_relay_camp: "/assets/riftfall/board/tiles/outer/outer_spaceport.png",
  "mirecoil-beacon": "/assets/riftfall/board/tiles/outer/outer_iron_synod_workshop.png",
  outer_salt_flats: "/assets/riftfall/board/tiles/outer/outer_toxic_wastes.png",
  "hollow-veil-yard": "/assets/riftfall/board/tiles/outer/outer_crash_site.png",
  outer_surgery_tent: "/assets/riftfall/board/tiles/outer/outer_tavern.png",
  "emberwatch-step": "/assets/riftfall/board/tiles/outer/outer_forge_dock.png",
  outer_oathpost: "/assets/riftfall/board/tiles/outer/outer_city.png",
  outer_broken_causeway: "/assets/riftfall/board/tiles/outer/outer_ruins.png",
  "votive-engine-room": "/assets/riftfall/board/tiles/outer/outer_iron_synod_workshop.png",
  "kettleward-foundry": "/assets/riftfall/board/tiles/outer/outer_forge_dock.png",
  middle_guardian_span: "/assets/riftfall/board/tiles/middle/middle_guardian_span.png",
  middle_red_march_outpost: "/assets/riftfall/board/tiles/middle/middle_burning_battlefield.png",
  middle_anomaly_well: "/assets/riftfall/board/tiles/middle/middle_relay_spire.png",
  middle_webglass_breach: "/assets/riftfall/board/tiles/middle/middle_webglass_breach.png",
  middle_relic_cache: "/assets/riftfall/board/tiles/middle/middle_ancient_machine_ruins.png",
  middle_shard_sprawl: "/assets/riftfall/board/tiles/middle/middle_ashstack_sprawl.png",
  middle_scar_surgery: "/assets/riftfall/board/tiles/middle/middle_monastery.png",
  middle_rivalry_pit: "/assets/riftfall/board/tiles/middle/middle_breachspawn_pit.png",
  "black-relay-spire": "/assets/riftfall/board/tiles/middle/middle_relay_spire.png",
  "the-salt-archive": "/assets/riftfall/board/tiles/middle/middle_ancient_machine_ruins.png",
  "red-lantern-trenches": "/assets/riftfall/board/tiles/middle/middle_burning_battlefield.png",
  "weeping-ammunition-shrine": "/assets/riftfall/board/tiles/middle/middle_guardian_span.png",
  inner_veil_rift: "/assets/riftfall/board/tiles/inner/inner_veil_rift.png",
  inner_choir_shrine: "/assets/riftfall/board/tiles/inner/inner_mortuary_domain.png",
  inner_gate_of_cinders: "/assets/riftfall/board/tiles/inner/inner_rift_gate.png",
  inner_blackstar_shortcut: "/assets/riftfall/board/tiles/inner/inner_gilded_stair.png",
  inner_cinder_lattice: "/assets/riftfall/board/tiles/inner/inner_lattice_maze.png",
  inner_tomb_gate: "/assets/riftfall/board/tiles/inner/inner_tomb_complex.png",
  "the-bone-meridian": "/assets/riftfall/board/tiles/inner/inner_tomb_complex.png",
  "choir-execution-court": "/assets/riftfall/board/tiles/inner/inner_mortuary_domain.png",
  center_cinder_gate: "/assets/riftfall/board/center/center_scenario_space.png"
};

export function getBoardTileAssetPaths(): string[] {
  return Object.values(tileArtByNodeId).filter((value, index, paths) => paths.indexOf(value) === index);
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
    horizontal: { width: 0.118, height: 0.112 },
    vertical: { width: 0.078, height: 0.162 },
    center: { width: 0.118, height: 0.112 }
  },
  middle: {
    horizontal: { width: 0.106, height: 0.09 },
    vertical: { width: 0.07, height: 0.128 },
    center: { width: 0.106, height: 0.09 }
  },
  inner: {
    horizontal: { width: 0.092, height: 0.074 },
    vertical: { width: 0.064, height: 0.104 },
    center: { width: 0.092, height: 0.074 }
  },
  center: {
    horizontal: { width: 0.2, height: 0.15 },
    vertical: { width: 0.2, height: 0.15 },
    center: { width: 0.2, height: 0.15 }
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
  debugEnabled?: boolean;
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

  return Math.abs(node.y - 0.5) > Math.abs(node.x - 0.5) ? "horizontal" : "vertical";
}

export function TalismanBoardSurface({
  imageRect,
  activeNodeId = null,
  selectedNodeId = null,
  legalTargetIds,
  debugEnabled = false
}: TalismanBoardSurfaceProps): ReactElement {
  return (
    <div
      className="talisman-board-surface"
      aria-hidden="true"
      style={{
        left: `${imageRect.left}px`,
        top: `${imageRect.top}px`,
        width: `${imageRect.width}px`,
        height: `${imageRect.height}px`
      }}
    >
      <div className="talisman-board-backdrop" />
      <div className="talisman-board-ring talisman-board-ring-outer" />
      <div className="talisman-board-ring talisman-board-ring-middle" />
      <div className="talisman-board-ring talisman-board-ring-inner" />
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
        const art = tileArtByNodeId[node.id] ?? tileArtByNodeId.center_cinder_gate;
        const tone = getTileTone(node);
        const isActive = activeNodeId === node.id;
        const isSelected = selectedNodeId === node.id;
        const isLegal = legalTargetIds?.has(node.id) ?? false;

        return (
          <div
            key={node.id}
            className={[
              "talisman-board-tile",
              `talisman-board-tile-${node.ring}`,
              `talisman-board-tile-${side}`,
              `talisman-board-tile-${tone}`,
              isActive ? "talisman-board-tile-active" : "",
              isActive ? "talisman-board-tile-current" : "",
              isSelected ? "talisman-board-tile-selected" : "",
              isLegal ? "talisman-board-tile-legal" : "",
              debugEnabled ? "talisman-board-tile-debug" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${tileWidth}px`,
              height: `${tileHeight}px`,
              backgroundImage: `url("${art}")`
            }}
          >
            <div className="talisman-board-tile-scrim" />
            <span className="talisman-board-tile-label">{node.label}</span>
            <small>{node.ring === "center" ? "Final" : tileLabelByRing[node.ring]}</small>
          </div>
        );
      })}
    </div>
  );
}
