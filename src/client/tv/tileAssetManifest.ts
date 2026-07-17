export const TILE_ASSETS = {
  "north-dock-bastion": "/assets/map/tiles/map_tile_north_docks.png",
  outer_waymarket: "/assets/map/tiles/map_tile_anchor_market.png",
  "coldwind-wharf": "/assets/map/tiles/map_tile_coldwind_wharf.png",
  outer_broken_causeway: "/assets/map/tiles/map_tile_dock_wreckage.png",
  "emberwatch-step": "/assets/map/tiles/map_tile_ember_stair.png",
  "cinder-fields": "/assets/map/tiles/map_tile_cinder_fields.png",
  "glassmere-spindle": "/assets/map/tiles/map_tile_ironbridge_span.png",
  outer_ember_sanctum: "/assets/map/tiles/map_tile_ruined_outskirts.png",
  "mirecoil-beacon": "/assets/map/tiles/map_tile_transit_gate.png",
  outer_oathpost: "/assets/map/tiles/map_tile_census_hall.png",
  "colony-outskirts": "/assets/map/tiles/map_tile_colony_outskirts.png",
  "deadwater-marsh": "/assets/map/tiles/map_tile_deadwater_marsh.png",
  "votive-engine-room": "/assets/map/tiles/map_tile_ashfall_plains.png",
  "ashwake-crossing": "/assets/map/tiles/map_tile_hollow_gate.png",
  outer_surgery_tent: "/assets/map/tiles/map_tile_wardens_bay.png",
  outer_salt_flats: "/assets/map/tiles/map_tile_colony_outskirts.png",
  "rustveil-yard": "/assets/map/tiles/map_tile_rustveil_yard.png",
  "sunken-pier": "/assets/map/tiles/map_tile_north_docks.png",
  "shattered-causeway": "/assets/map/tiles/map_tile_shattered_causeway.png",
  "kettleward-foundry": "/assets/map/tiles/map_tile_deadwater_marsh.png",
  "flooded-locks": "/assets/map/tiles/map_tile_flooded_locks.png",
  "transit-gate": "/assets/map/tiles/map_tile_transit_gate.png",
  outer_relay_camp: "/assets/map/tiles/map_tile_ironbridge_span.png",
  "hollow-veil-yard": "/assets/map/tiles/map_tile_shattered_causeway.png",

  middle_red_march_outpost: "/assets/map/tiles/map_tile_scorched_road.png",
  middle_anomaly_well: "/assets/map/tiles/map_tile_blastworks.png",
  middle_shard_sprawl: "/assets/map/tiles/map_tile_ashen_chapel.png",
  middle_rivalry_pit: "/assets/map/tiles/map_tile_reavers_den.png",
  "black-relay-spire": "/assets/map/tiles/map_tile_choir_court.png",
  middle_relic_cache: "/assets/map/tiles/map_tile_graveyard_belt.png",
  "the-salt-archive": "/assets/map/tiles/map_tile_smelters_gate.png",
  middle_webglass_breach: "/assets/map/tiles/map_tile_broken_conduit.png",
  middle_scar_surgery: "/assets/map/tiles/map_tile_melted_gate.png",
  "weeping-ammunition-shrine": "/assets/map/tiles/map_tile_rifted_approach.png",
  middle_guardian_span: "/assets/map/tiles/map_tile_ember_stair.png",
  "red-lantern-trenches": "/assets/map/tiles/map_tile_furnace_spire.png",
  "scorched-road": "/assets/map/tiles/map_tile_scorched_road.png",
  blastworks: "/assets/map/tiles/map_tile_blastworks.png",
  "ashen-chapel": "/assets/map/tiles/map_tile_ashen_chapel.png",
  "reavers-den": "/assets/map/tiles/map_tile_reavers_den.png",

  inner_gate_of_cinders: "/assets/map/tiles/map_tile_last_signal_well.png",
  inner_choir_shrine: "/assets/map/tiles/map_tile_saint_engine_crypt.png",
  inner_cinder_lattice: "/assets/map/tiles/map_tile_bone_meridian.png",
  "choir-execution-court": "/assets/map/tiles/map_tile_choir_court.png",
  inner_veil_rift: "/assets/map/tiles/map_tile_melted_gate.png",
  inner_tomb_gate: "/assets/map/tiles/map_tile_rifted_approach.png",
  inner_blackstar_shortcut: "/assets/map/tiles/map_tile_dead_star_reliquary.png",
  "the-bone-meridian": "/assets/map/tiles/map_tile_bone_meridian.png",

  center_cinder_gate: "/assets/map/tiles/map_core_breach_seal_panel.png"
} as const satisfies Record<string, string>;

export function getTileAssetPath(nodeId: string): string | null {
  return TILE_ASSETS[nodeId as keyof typeof TILE_ASSETS] ?? null;
}

export function getExpectedTileAssetPath(nodeId: string): string {
  return `/assets/map/tiles/${nodeId}.png`;
}
