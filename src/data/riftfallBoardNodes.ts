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
    y: 0.067,
    connections: ["ashwake-crossing", "outer_broken_causeway", "emberwatch-step"]
  },
  {
    id: "ashwake-crossing",
    label: "Ashwake Crossing",
    ring: "outer",
    x: 0.74,
    y: 0.12,
    connections: ["outer_ember_sanctum", "outer_waymarket", "glassmere-spindle"]
  },
  {
    id: "outer_waymarket",
    label: "Waymarket",
    ring: "outer",
    x: 0.9,
    y: 0.29,
    connections: ["ashwake-crossing", "glassmere-spindle"]
  },
  {
    id: "glassmere-spindle",
    label: "Glassmere Spindle",
    ring: "outer",
    x: 0.91,
    y: 0.5,
    connections: ["ashwake-crossing", "outer_waymarket", "outer_relay_camp", "mirecoil-beacon"]
  },
  {
    id: "outer_relay_camp",
    label: "Relay Camp",
    ring: "outer",
    x: 0.84,
    y: 0.71,
    connections: ["glassmere-spindle", "mirecoil-beacon"]
  },
  {
    id: "mirecoil-beacon",
    label: "Mirecoil Beacon",
    ring: "outer",
    x: 0.66,
    y: 0.87,
    connections: ["glassmere-spindle", "outer_relay_camp", "outer_salt_flats", "hollow-veil-yard", "middle_shard_sprawl"]
  },
  {
    id: "outer_salt_flats",
    label: "Void-Salt Flats",
    ring: "outer",
    x: 0.5,
    y: 0.93,
    connections: ["mirecoil-beacon", "hollow-veil-yard"]
  },
  {
    id: "hollow-veil-yard",
    label: "Hollow Veil Yard",
    ring: "outer",
    x: 0.34,
    y: 0.87,
    connections: ["mirecoil-beacon", "outer_salt_flats", "outer_surgery_tent", "emberwatch-step", "middle_shard_sprawl"]
  },
  {
    id: "outer_surgery_tent",
    label: "Cinder Surgery",
    ring: "outer",
    x: 0.16,
    y: 0.71,
    connections: ["hollow-veil-yard", "emberwatch-step"]
  },
  {
    id: "emberwatch-step",
    label: "Emberwatch Step",
    ring: "outer",
    x: 0.09,
    y: 0.5,
    connections: ["hollow-veil-yard", "outer_surgery_tent", "outer_oathpost", "outer_ember_sanctum", "middle_guardian_span"]
  },
  {
    id: "outer_oathpost",
    label: "Oathpost",
    ring: "outer",
    x: 0.1,
    y: 0.29,
    connections: ["emberwatch-step", "outer_broken_causeway"]
  },
  {
    id: "outer_broken_causeway",
    label: "Broken Causeway",
    ring: "outer",
    x: 0.26,
    y: 0.12,
    connections: ["outer_oathpost", "outer_ember_sanctum", "middle_guardian_span"]
  },
  {
    id: "middle_shard_sprawl",
    label: "Shard Sprawl",
    ring: "middle",
    x: 0.34,
    y: 0.7,
    connections: ["hollow-veil-yard", "mirecoil-beacon", "middle_relic_cache", "middle_scar_surgery", "middle_guardian_span", "middle_webglass_breach"]
  },
  {
    id: "middle_relic_cache",
    label: "Relic Cache",
    ring: "middle",
    x: 0.5,
    y: 0.78,
    connections: ["middle_shard_sprawl", "middle_webglass_breach", "middle_anomaly_well"]
  },
  {
    id: "middle_scar_surgery",
    label: "Scar Surgery",
    ring: "middle",
    x: 0.21,
    y: 0.52,
    connections: ["middle_shard_sprawl", "middle_rivalry_pit", "middle_guardian_span"]
  },
  {
    id: "middle_guardian_span",
    label: "Guardian Span",
    ring: "middle",
    x: 0.5,
    y: 0.205,
    connections: [
      "outer_broken_causeway",
      "emberwatch-step",
      "middle_scar_surgery",
      "middle_rivalry_pit",
      "middle_red_march_outpost",
      "middle_webglass_breach",
      "middle_shard_sprawl",
      "inner_veil_rift"
    ]
  },
  {
    id: "middle_rivalry_pit",
    label: "Rivalry Pit",
    ring: "middle",
    x: 0.35,
    y: 0.34,
    connections: ["middle_scar_surgery", "middle_guardian_span", "middle_red_march_outpost"]
  },
  {
    id: "middle_red_march_outpost",
    label: "Red March Outpost",
    ring: "middle",
    x: 0.65,
    y: 0.34,
    connections: ["middle_rivalry_pit", "middle_guardian_span", "middle_webglass_breach"]
  },
  {
    id: "middle_webglass_breach",
    label: "Webglass Breach",
    ring: "middle",
    x: 0.66,
    y: 0.7,
    connections: [
      "middle_red_march_outpost",
      "middle_guardian_span",
      "middle_anomaly_well",
      "middle_relic_cache",
      "middle_shard_sprawl"
    ]
  },
  {
    id: "middle_anomaly_well",
    label: "Anomaly Well",
    ring: "middle",
    x: 0.79,
    y: 0.52,
    connections: ["middle_webglass_breach", "middle_relic_cache", "inner_choir_shrine"]
  },
  {
    id: "inner_veil_rift",
    label: "Veil Rift",
    ring: "inner",
    x: 0.5,
    y: 0.33,
    connections: ["middle_guardian_span", "inner_tomb_gate", "inner_cinder_lattice", "center_cinder_gate"]
  },
  {
    id: "inner_tomb_gate",
    label: "Tomb Gate",
    ring: "inner",
    x: 0.34,
    y: 0.43,
    connections: ["inner_veil_rift", "inner_blackstar_shortcut", "inner_cinder_lattice"]
  },
  {
    id: "inner_cinder_lattice",
    label: "Cinder Lattice",
    ring: "inner",
    x: 0.4,
    y: 0.64,
    connections: ["inner_veil_rift", "inner_tomb_gate", "inner_blackstar_shortcut", "inner_gate_of_cinders", "center_cinder_gate"]
  },
  {
    id: "inner_blackstar_shortcut",
    label: "Blackstar Cut",
    ring: "inner",
    x: 0.6,
    y: 0.64,
    connections: ["inner_tomb_gate", "inner_cinder_lattice", "inner_gate_of_cinders", "inner_choir_shrine"]
  },
  {
    id: "inner_choir_shrine",
    label: "Choir Shrine",
    ring: "inner",
    x: 0.66,
    y: 0.43,
    connections: ["middle_anomaly_well", "inner_blackstar_shortcut", "inner_gate_of_cinders"]
  },
  {
    id: "inner_gate_of_cinders",
    label: "Gate of Cinders",
    ring: "inner",
    x: 0.5,
    y: 0.72,
    connections: ["inner_cinder_lattice", "inner_blackstar_shortcut", "inner_choir_shrine", "center_cinder_gate"]
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
