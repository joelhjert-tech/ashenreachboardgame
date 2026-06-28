import type { BoardNode } from "../../data/riftfallBoardNodes.js";

export const MAP_BOARD_BASE_PATH = "/assets/map/board/ashen_reach_board_base.png";

export const MAP_REGION_LAYER_PATHS = {
  outer: "/assets/map/board/map_region_outer_broken_perimeter.png",
  middle: "/assets/map/board/map_region_middle_war_choir_line.png",
  inner: "/assets/map/board/map_region_inner_relic_wound.png",
  center: "/assets/map/board/map_region_core_ashen_reach.png"
} as const satisfies Record<BoardNode["ring"], string>;

export const MAP_CORNER_TILE_PATHS = {
  northwest: "/assets/map/corners/map_corner_northwest.png",
  northeast: "/assets/map/corners/map_corner_northeast.png",
  southeast: "/assets/map/corners/map_corner_southeast.png",
  southwest: "/assets/map/corners/map_corner_southwest.png"
} as const;

const canonicalTilePathByNodeId: Record<string, string> = {
  outer_waymarket: "/assets/map/tiles/map_tile_anchor_market.png",
  outer_broken_causeway: "/assets/map/tiles/map_tile_north_docks.png",
  "emberwatch-step": "/assets/map/tiles/map_tile_coldwind_wharf.png",
  outer_ember_sanctum: "/assets/map/tiles/map_tile_ruined_outskirts.png",
  "glassmere-spindle": "/assets/map/tiles/map_tile_ironbridge_span.png",
  "mirecoil-beacon": "/assets/map/tiles/map_tile_cinder_fields.png",
  "votive-engine-room": "/assets/map/tiles/map_tile_ashfall_plains.png",
  "ashwake-crossing": "/assets/map/tiles/map_tile_census_hall.png",
  outer_oathpost: "/assets/map/tiles/map_tile_hollow_gate.png",
  outer_surgery_tent: "/assets/map/tiles/map_tile_wardens_bay.png",
  outer_salt_flats: "/assets/map/tiles/map_tile_colony_outskirts.png",
  "kettleward-foundry": "/assets/map/tiles/map_tile_deadwater_marsh.png",
  outer_relay_camp: "/assets/map/tiles/map_tile_rustveil_yard.png",
  "hollow-veil-yard": "/assets/map/tiles/map_tile_shattered_causeway.png",
  middle_red_march_outpost: "/assets/map/tiles/map_tile_scorched_road.png",
  middle_anomaly_well: "/assets/map/tiles/map_tile_blastworks.png",
  middle_shard_sprawl: "/assets/map/tiles/map_tile_ashen_chapel.png",
  middle_rivalry_pit: "/assets/map/tiles/map_tile_reavers_den.png",
  "black-relay-spire": "/assets/map/tiles/map_tile_choir_court.png",
  middle_relic_cache: "/assets/map/tiles/map_tile_graveyard_belt.png",
  "the-salt-archive": "/assets/map/tiles/map_tile_smelters_gate.png",
  "red-lantern-trenches": "/assets/map/tiles/map_tile_furnace_spire.png",
  middle_guardian_span: "/assets/map/tiles/map_tile_ember_stair.png",
  middle_webglass_breach: "/assets/map/tiles/map_tile_broken_conduit.png",
  middle_scar_surgery: "/assets/map/tiles/map_tile_melted_gate.png",
  "weeping-ammunition-shrine": "/assets/map/tiles/map_tile_rifted_approach.png",
  inner_veil_rift: "/assets/map/tiles/map_tile_saint_engine_crypt.png",
  inner_tomb_gate: "/assets/map/tiles/map_tile_dead_star_reliquary.png",
  inner_choir_shrine: "/assets/map/tiles/map_tile_bone_meridian.png",
  inner_cinder_lattice: "/assets/map/tiles/map_tile_last_signal_well.png",
  inner_blackstar_shortcut: "/assets/map/tiles/map_tile_ashen_reach_core.png",
  "the-bone-meridian": "/assets/map/tiles/map_tile_transit_gate.png",
  "choir-execution-court": "/assets/map/tiles/map_tile_flooded_locks.png",
  inner_gate_of_cinders: "/assets/map/tiles/map_tile_dock_wreckage.png",
  center_cinder_gate: "/assets/map/tiles/map_core_breach_seal_panel.png"
};

const fallbackTilePathByNodeId: Record<string, string> = {
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

export function getMapBoardBaseAssetPath(): string {
  return MAP_BOARD_BASE_PATH;
}

export function getMapRegionLayerAssetPath(ring: BoardNode["ring"]): string {
  return MAP_REGION_LAYER_PATHS[ring];
}

export function getMapCornerTileAssetPath(corner: keyof typeof MAP_CORNER_TILE_PATHS): string {
  return MAP_CORNER_TILE_PATHS[corner];
}

export function getMapTileAssetPath(nodeId: string): string {
  return canonicalTilePathByNodeId[nodeId] ?? "/assets/map/tiles/map_tile_ashen_reach_core.png";
}

export function getMapTileFallbackAssetPath(nodeId: string): string {
  return fallbackTilePathByNodeId[nodeId] ?? fallbackTilePathByNodeId.center_cinder_gate;
}

export function getMapTileBackgroundImage(nodeId: string, tone: string): string {
  const fallback = getMapTileFallbackAssetPath(nodeId);

  return [
    `linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.44))`,
    `var(--map-tile-fallback-${tone})`,
    `url("${getMapTileAssetPath(nodeId)}")`,
    fallback ? `url("${fallback}")` : null
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(", ");
}

export function getBoardMapRuntimeAssetPaths(): string[] {
  return [
    MAP_BOARD_BASE_PATH,
    ...Object.values(MAP_REGION_LAYER_PATHS),
    ...Object.values(MAP_CORNER_TILE_PATHS),
    ...Object.values(canonicalTilePathByNodeId),
    ...Object.values(fallbackTilePathByNodeId)
  ].filter((value, index, paths) => paths.indexOf(value) === index);
}
