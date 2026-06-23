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
    y: 0.105,
    connections: ["ashwake-crossing", "outer_broken_causeway", "middle_guardian_span"]
  },
  {
    id: "ashwake-crossing",
    label: "Ashwake Crossing",
    ring: "outer",
    x: 0.69,
    y: 0.16,
    connections: ["outer_ember_sanctum", "outer_waymarket", "middle_red_march_outpost"]
  },
  {
    id: "outer_waymarket",
    label: "Waymarket",
    ring: "outer",
    x: 0.75,
    y: 0.245,
    connections: ["ashwake-crossing", "glassmere-spindle"]
  },
  {
    id: "glassmere-spindle",
    label: "Glassmere Spindle",
    ring: "outer",
    x: 0.80,
    y: 0.392,
    connections: ["outer_waymarket", "outer_relay_camp", "middle_anomaly_well"]
  },
  {
    id: "outer_relay_camp",
    label: "Relay Camp",
    ring: "outer",
    x: 0.79,
    y: 0.60,
    connections: ["glassmere-spindle", "mirecoil-beacon", "middle_anomaly_well"]
  },
  {
    id: "mirecoil-beacon",
    label: "Mirecoil Beacon",
    ring: "outer",
    x: 0.69,
    y: 0.848,
    connections: ["outer_relay_camp", "outer_salt_flats", "middle_webglass_breach"]
  },
  {
    id: "outer_salt_flats",
    label: "Void-Salt Flats",
    ring: "outer",
    x: 0.5,
    y: 0.922,
    connections: ["mirecoil-beacon", "hollow-veil-yard", "middle_relic_cache"]
  },
  {
    id: "hollow-veil-yard",
    label: "Hollow Veil Yard",
    ring: "outer",
    x: 0.31,
    y: 0.848,
    connections: ["outer_salt_flats", "outer_surgery_tent", "middle_shard_sprawl"]
  },
  {
    id: "outer_surgery_tent",
    label: "Cinder Surgery",
    ring: "outer",
    x: 0.21,
    y: 0.60,
    connections: ["hollow-veil-yard", "emberwatch-step", "middle_scar_surgery"]
  },
  {
    id: "emberwatch-step",
    label: "Emberwatch Step",
    ring: "outer",
    x: 0.20,
    y: 0.50,
    connections: ["outer_surgery_tent", "outer_oathpost", "middle_scar_surgery"]
  },
  {
    id: "outer_oathpost",
    label: "Oathpost",
    ring: "outer",
    x: 0.25,
    y: 0.245,
    connections: ["emberwatch-step", "outer_broken_causeway", "middle_rivalry_pit"]
  },
  {
    id: "outer_broken_causeway",
    label: "Broken Causeway",
    ring: "outer",
    x: 0.31,
    y: 0.16,
    connections: ["outer_oathpost", "outer_ember_sanctum", "middle_rivalry_pit"]
  },
  {
    id: "middle_shard_sprawl",
    label: "Shard Sprawl",
    ring: "middle",
    x: 0.385,
    y: 0.70,
    connections: ["hollow-veil-yard", "middle_relic_cache", "middle_scar_surgery", "inner_cinder_lattice"]
  },
  {
    id: "middle_relic_cache",
    label: "Relic Cache",
    ring: "middle",
    x: 0.50,
    y: 0.772,
    connections: ["outer_salt_flats", "middle_shard_sprawl", "middle_webglass_breach", "inner_blackstar_shortcut"]
  },
  {
    id: "middle_scar_surgery",
    label: "Scar Surgery",
    ring: "middle",
    x: 0.315,
    y: 0.50,
    connections: ["outer_surgery_tent", "emberwatch-step", "middle_shard_sprawl", "middle_rivalry_pit", "inner_cinder_lattice"]
  },
  {
    id: "middle_guardian_span",
    label: "Guardian Span",
    ring: "middle",
    x: 0.50,
    y: 0.215,
    connections: [
      "middle_rivalry_pit",
      "middle_red_march_outpost",
      "outer_ember_sanctum",
      "inner_veil_rift"
    ]
  },
  {
    id: "middle_rivalry_pit",
    label: "Rivalry Pit",
    ring: "middle",
    x: 0.385,
    y: 0.30,
    connections: ["outer_broken_causeway", "outer_oathpost", "middle_scar_surgery", "middle_guardian_span", "inner_tomb_gate"]
  },
  {
    id: "middle_red_march_outpost",
    label: "Red March Outpost",
    ring: "middle",
    x: 0.615,
    y: 0.30,
    connections: ["ashwake-crossing", "middle_guardian_span", "middle_anomaly_well", "inner_choir_shrine"]
  },
  {
    id: "middle_webglass_breach",
    label: "Webglass Breach",
    ring: "middle",
    x: 0.615,
    y: 0.70,
    connections: [
      "middle_anomaly_well",
      "middle_relic_cache",
      "mirecoil-beacon",
      "inner_blackstar_shortcut",
      "inner_gate_of_cinders"
    ]
  },
  {
    id: "middle_anomaly_well",
    label: "Anomaly Well",
    ring: "middle",
    x: 0.685,
    y: 0.50,
    connections: ["glassmere-spindle", "outer_relay_camp", "middle_red_march_outpost", "middle_webglass_breach", "inner_gate_of_cinders"]
  },
  {
    id: "inner_veil_rift",
    label: "Veil Rift",
    ring: "inner",
    x: 0.50,
    y: 0.345,
    connections: ["middle_guardian_span", "inner_tomb_gate", "inner_choir_shrine", "center_cinder_gate"]
  },
  {
    id: "inner_tomb_gate",
    label: "Tomb Gate",
    ring: "inner",
    x: 0.425,
    y: 0.365,
    connections: ["middle_rivalry_pit", "inner_veil_rift", "inner_cinder_lattice"]
  },
  {
    id: "inner_cinder_lattice",
    label: "Cinder Lattice",
    ring: "inner",
    x: 0.39,
    y: 0.50,
    connections: ["middle_scar_surgery", "middle_shard_sprawl", "inner_tomb_gate", "inner_blackstar_shortcut", "center_cinder_gate"]
  },
  {
    id: "inner_blackstar_shortcut",
    label: "Blackstar Cut",
    ring: "inner",
    x: 0.50,
    y: 0.66,
    connections: ["middle_relic_cache", "middle_webglass_breach", "inner_cinder_lattice", "inner_gate_of_cinders"]
  },
  {
    id: "inner_choir_shrine",
    label: "Choir Shrine",
    ring: "inner",
    x: 0.575,
    y: 0.365,
    connections: ["middle_red_march_outpost", "inner_veil_rift", "inner_gate_of_cinders"]
  },
  {
    id: "inner_gate_of_cinders",
    label: "Gate of Cinders",
    ring: "inner",
    x: 0.61,
    y: 0.50,
    connections: ["middle_anomaly_well", "middle_webglass_breach", "inner_blackstar_shortcut", "inner_choir_shrine", "center_cinder_gate"]
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
