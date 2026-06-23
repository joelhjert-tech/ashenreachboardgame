export type BoardNode = {
  id: string;
  label: string;
  ring: "outer" | "middle" | "inner" | "center";
  x: number;
  y: number;
  connections: string[];
};

export const RIFTFALL_BOARD_NODES: BoardNode[] = [
  {
    id: "outer_ember_sanctum",
    label: "Ember Sanctum",
    ring: "outer",
    x: 0.5,
    y: 0.1,
    connections: ["ashwake-crossing", "outer_broken_causeway", "middle_guardian_span"]
  },
  {
    id: "ashwake-crossing",
    label: "Ashwake Crossing",
    ring: "outer",
    x: 0.68,
    y: 0.1,
    connections: ["outer_ember_sanctum", "outer_waymarket", "glassmere-spindle"]
  },
  {
    id: "outer_waymarket",
    label: "Waymarket",
    ring: "outer",
    x: 0.84,
    y: 0.22,
    connections: ["ashwake-crossing", "glassmere-spindle", "middle_red_march_outpost"]
  },
  {
    id: "glassmere-spindle",
    label: "Glassmere Spindle",
    ring: "outer",
    x: 0.84,
    y: 0.42,
    connections: ["ashwake-crossing", "outer_waymarket", "outer_relay_camp"]
  },
  {
    id: "outer_relay_camp",
    label: "Relay Camp",
    ring: "outer",
    x: 0.84,
    y: 0.62,
    connections: ["glassmere-spindle", "mirecoil-beacon", "middle_anomaly_well"]
  },
  {
    id: "mirecoil-beacon",
    label: "Mirecoil Beacon",
    ring: "outer",
    x: 0.68,
    y: 0.82,
    connections: ["outer_relay_camp", "outer_salt_flats"]
  },
  {
    id: "outer_salt_flats",
    label: "Void-Salt Flats",
    ring: "outer",
    x: 0.5,
    y: 0.82,
    connections: ["mirecoil-beacon", "hollow-veil-yard", "middle_relic_cache"]
  },
  {
    id: "hollow-veil-yard",
    label: "Hollow Veil Yard",
    ring: "outer",
    x: 0.32,
    y: 0.82,
    connections: ["outer_salt_flats", "outer_surgery_tent"]
  },
  {
    id: "outer_surgery_tent",
    label: "Cinder Surgery",
    ring: "outer",
    x: 0.16,
    y: 0.62,
    connections: ["hollow-veil-yard", "emberwatch-step", "middle_scar_surgery"]
  },
  {
    id: "emberwatch-step",
    label: "Emberwatch Step",
    ring: "outer",
    x: 0.16,
    y: 0.46,
    connections: ["outer_surgery_tent", "outer_oathpost"]
  },
  {
    id: "outer_oathpost",
    label: "Oathpost",
    ring: "outer",
    x: 0.16,
    y: 0.3,
    connections: ["emberwatch-step", "outer_broken_causeway", "middle_rivalry_pit"]
  },
  {
    id: "outer_broken_causeway",
    label: "Broken Causeway",
    ring: "outer",
    x: 0.32,
    y: 0.1,
    connections: ["outer_oathpost", "outer_ember_sanctum"]
  },
  {
    id: "middle_guardian_span",
    label: "Guardian Span",
    ring: "middle",
    x: 0.5,
    y: 0.255,
    connections: ["outer_ember_sanctum", "middle_red_march_outpost", "middle_rivalry_pit", "inner_veil_rift"]
  },
  {
    id: "middle_red_march_outpost",
    label: "Red March Outpost",
    ring: "middle",
    x: 0.64,
    y: 0.325,
    connections: ["outer_waymarket", "middle_guardian_span", "middle_anomaly_well"]
  },
  {
    id: "middle_anomaly_well",
    label: "Anomaly Well",
    ring: "middle",
    x: 0.7,
    y: 0.5,
    connections: ["outer_relay_camp", "middle_red_march_outpost", "middle_webglass_breach", "inner_choir_shrine"]
  },
  {
    id: "middle_webglass_breach",
    label: "Webglass Breach",
    ring: "middle",
    x: 0.64,
    y: 0.675,
    connections: ["middle_anomaly_well", "middle_relic_cache"]
  },
  {
    id: "middle_relic_cache",
    label: "Relic Cache",
    ring: "middle",
    x: 0.5,
    y: 0.745,
    connections: ["outer_salt_flats", "middle_webglass_breach", "middle_shard_sprawl", "inner_blackstar_shortcut"]
  },
  {
    id: "middle_shard_sprawl",
    label: "Shard Sprawl",
    ring: "middle",
    x: 0.36,
    y: 0.675,
    connections: ["middle_relic_cache", "middle_scar_surgery"]
  },
  {
    id: "middle_scar_surgery",
    label: "Scar Surgery",
    ring: "middle",
    x: 0.3,
    y: 0.5,
    connections: ["outer_surgery_tent", "middle_shard_sprawl", "middle_rivalry_pit", "inner_cinder_lattice"]
  },
  {
    id: "middle_rivalry_pit",
    label: "Rivalry Pit",
    ring: "middle",
    x: 0.36,
    y: 0.325,
    connections: ["outer_oathpost", "middle_scar_surgery", "middle_guardian_span"]
  },
  {
    id: "inner_veil_rift",
    label: "Veil Rift",
    ring: "inner",
    x: 0.5,
    y: 0.33,
    connections: ["middle_guardian_span", "inner_choir_shrine", "inner_tomb_gate", "center_cinder_gate"]
  },
  {
    id: "inner_choir_shrine",
    label: "Choir Shrine",
    ring: "inner",
    x: 0.64,
    y: 0.42,
    connections: ["middle_anomaly_well", "inner_veil_rift", "inner_gate_of_cinders"]
  },
  {
    id: "inner_gate_of_cinders",
    label: "Gate of Cinders",
    ring: "inner",
    x: 0.64,
    y: 0.58,
    connections: ["inner_choir_shrine", "inner_blackstar_shortcut", "center_cinder_gate"]
  },
  {
    id: "inner_blackstar_shortcut",
    label: "Blackstar Cut",
    ring: "inner",
    x: 0.5,
    y: 0.67,
    connections: ["middle_relic_cache", "inner_gate_of_cinders", "inner_cinder_lattice"]
  },
  {
    id: "inner_cinder_lattice",
    label: "Cinder Lattice",
    ring: "inner",
    x: 0.36,
    y: 0.58,
    connections: ["middle_scar_surgery", "inner_blackstar_shortcut", "inner_tomb_gate", "center_cinder_gate"]
  },
  {
    id: "inner_tomb_gate",
    label: "Tomb Gate",
    ring: "inner",
    x: 0.36,
    y: 0.42,
    connections: ["inner_cinder_lattice", "inner_veil_rift"]
  },
  {
    id: "center_cinder_gate",
    label: "The Cinder Gate",
    ring: "center",
    x: 0.5,
    y: 0.5,
    connections: ["inner_veil_rift", "inner_cinder_lattice", "inner_gate_of_cinders"]
  }
];

export const RIFTFALL_BOARD_NODE_INDEX = new Map(RIFTFALL_BOARD_NODES.map((node) => [node.id, node] as const));
