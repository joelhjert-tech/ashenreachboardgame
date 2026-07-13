import type { BoardNode } from "../../data/riftfallBoardNodes.js";

export interface BoardTileLayoutEntry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  routeAnchor: {
    x: number;
    y: number;
  };
}

export const BOARD_SURFACE_ASPECT_RATIO = 16 / 9;

export const BOARD_TILE_LAYOUT = {
  "north-dock-bastion": { x: 0.065, y: 0.083, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.065, y: 0.083 } },
  outer_waymarket: { x: 0.189, y: 0.083, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.189, y: 0.083 } },
  "coldwind-wharf": { x: 0.313, y: 0.083, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.313, y: 0.083 } },
  outer_broken_causeway: { x: 0.437, y: 0.083, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.437, y: 0.083 } },
  "emberwatch-step": { x: 0.563, y: 0.083, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.563, y: 0.083 } },
  "cinder-fields": { x: 0.687, y: 0.083, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.687, y: 0.083 } },
  "glassmere-spindle": { x: 0.811, y: 0.083, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.811, y: 0.083 } },
  outer_ember_sanctum: { x: 0.935, y: 0.083, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.935, y: 0.083 } },
  "mirecoil-beacon": { x: 0.935, y: 0.25, width: 0.125, height: 0.168, zIndex: 3, routeAnchor: { x: 0.935, y: 0.25 } },
  outer_oathpost: { x: 0.935, y: 0.417, width: 0.125, height: 0.168, zIndex: 3, routeAnchor: { x: 0.935, y: 0.417 } },
  "colony-outskirts": { x: 0.935, y: 0.583, width: 0.125, height: 0.168, zIndex: 3, routeAnchor: { x: 0.935, y: 0.583 } },
  "deadwater-marsh": { x: 0.935, y: 0.75, width: 0.125, height: 0.168, zIndex: 3, routeAnchor: { x: 0.935, y: 0.75 } },
  "votive-engine-room": { x: 0.935, y: 0.917, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.935, y: 0.917 } },
  "ashwake-crossing": { x: 0.811, y: 0.917, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.811, y: 0.917 } },
  outer_surgery_tent: { x: 0.687, y: 0.917, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.687, y: 0.917 } },
  outer_salt_flats: { x: 0.563, y: 0.917, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.563, y: 0.917 } },
  "rustveil-yard": { x: 0.437, y: 0.917, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.437, y: 0.917 } },
  "sunken-pier": { x: 0.313, y: 0.917, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.313, y: 0.917 } },
  "shattered-causeway": { x: 0.189, y: 0.917, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.189, y: 0.917 } },
  "kettleward-foundry": { x: 0.065, y: 0.917, width: 0.125, height: 0.15, zIndex: 3, routeAnchor: { x: 0.065, y: 0.917 } },
  "flooded-locks": { x: 0.065, y: 0.75, width: 0.125, height: 0.168, zIndex: 3, routeAnchor: { x: 0.065, y: 0.75 } },
  "transit-gate": { x: 0.065, y: 0.583, width: 0.125, height: 0.168, zIndex: 3, routeAnchor: { x: 0.065, y: 0.583 } },
  outer_relay_camp: { x: 0.065, y: 0.417, width: 0.125, height: 0.168, zIndex: 3, routeAnchor: { x: 0.065, y: 0.417 } },
  "hollow-veil-yard": { x: 0.065, y: 0.25, width: 0.125, height: 0.168, zIndex: 3, routeAnchor: { x: 0.065, y: 0.25 } },

  middle_red_march_outpost: { x: 0.22, y: 0.29, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.22, y: 0.29 } },
  middle_anomaly_well: { x: 0.332, y: 0.29, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.332, y: 0.29 } },
  middle_shard_sprawl: { x: 0.444, y: 0.29, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.444, y: 0.29 } },
  middle_rivalry_pit: { x: 0.556, y: 0.29, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.556, y: 0.29 } },
  "black-relay-spire": { x: 0.668, y: 0.29, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.668, y: 0.29 } },
  middle_relic_cache: { x: 0.78, y: 0.29, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.78, y: 0.29 } },
  "the-salt-archive": { x: 0.78, y: 0.43, width: 0.112, height: 0.145, zIndex: 4, routeAnchor: { x: 0.78, y: 0.43 } },
  middle_webglass_breach: { x: 0.78, y: 0.57, width: 0.112, height: 0.145, zIndex: 4, routeAnchor: { x: 0.78, y: 0.57 } },
  middle_scar_surgery: { x: 0.78, y: 0.71, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.78, y: 0.71 } },
  "weeping-ammunition-shrine": { x: 0.668, y: 0.71, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.668, y: 0.71 } },
  middle_guardian_span: { x: 0.556, y: 0.71, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.556, y: 0.71 } },
  "red-lantern-trenches": { x: 0.444, y: 0.71, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.444, y: 0.71 } },
  "scorched-road": { x: 0.332, y: 0.71, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.332, y: 0.71 } },
  blastworks: { x: 0.22, y: 0.71, width: 0.112, height: 0.13, zIndex: 4, routeAnchor: { x: 0.22, y: 0.71 } },
  "ashen-chapel": { x: 0.22, y: 0.57, width: 0.112, height: 0.145, zIndex: 4, routeAnchor: { x: 0.22, y: 0.57 } },
  "reavers-den": { x: 0.22, y: 0.43, width: 0.112, height: 0.145, zIndex: 4, routeAnchor: { x: 0.22, y: 0.43 } },

  inner_gate_of_cinders: { x: 0.39, y: 0.4, width: 0.22, height: 0.112, zIndex: 5, routeAnchor: { x: 0.39, y: 0.4 } },
  inner_choir_shrine: { x: 0.61, y: 0.4, width: 0.22, height: 0.112, zIndex: 5, routeAnchor: { x: 0.61, y: 0.4 } },
  inner_cinder_lattice: { x: 0.66, y: 0.466, width: 0.12, height: 0.134, zIndex: 5, routeAnchor: { x: 0.66, y: 0.466 } },
  "choir-execution-court": { x: 0.66, y: 0.534, width: 0.12, height: 0.134, zIndex: 5, routeAnchor: { x: 0.66, y: 0.534 } },
  inner_veil_rift: { x: 0.61, y: 0.6, width: 0.22, height: 0.112, zIndex: 5, routeAnchor: { x: 0.61, y: 0.6 } },
  inner_tomb_gate: { x: 0.39, y: 0.6, width: 0.22, height: 0.112, zIndex: 5, routeAnchor: { x: 0.39, y: 0.6 } },
  inner_blackstar_shortcut: { x: 0.34, y: 0.534, width: 0.12, height: 0.134, zIndex: 5, routeAnchor: { x: 0.34, y: 0.534 } },
  "the-bone-meridian": { x: 0.34, y: 0.466, width: 0.12, height: 0.134, zIndex: 5, routeAnchor: { x: 0.34, y: 0.466 } },

  center_cinder_gate: { x: 0.5, y: 0.5, width: 0.255, height: 0.19, zIndex: 6, routeAnchor: { x: 0.5, y: 0.5 } }
} as const satisfies Record<string, BoardTileLayoutEntry>;

export function getBoardTileLayout(nodeId: string): BoardTileLayoutEntry | null {
  return BOARD_TILE_LAYOUT[nodeId as keyof typeof BOARD_TILE_LAYOUT] ?? null;
}

export function getBoardTileRouteAnchor(node: BoardNode): { x: number; y: number } {
  return getBoardTileLayout(node.id)?.routeAnchor ?? { x: node.x, y: node.y };
}
