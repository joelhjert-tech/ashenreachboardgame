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
    connections: ["ashwake-crossing", "emberwatch-step"]
  },
  {
    id: "ashwake-crossing",
    label: "Ashwake Crossing",
    ring: "outer",
    x: 0.843,
    y: 0.228,
    connections: ["outer_ember_sanctum", "glassmere-spindle"]
  },
  {
    id: "glassmere-spindle",
    label: "Glassmere Spindle",
    ring: "outer",
    x: 0.838,
    y: 0.771,
    connections: ["ashwake-crossing", "mirecoil-beacon"]
  },
  {
    id: "mirecoil-beacon",
    label: "Mirecoil Beacon",
    ring: "outer",
    x: 0.5,
    y: 0.924,
    connections: ["glassmere-spindle", "hollow-veil-yard"]
  },
  {
    id: "hollow-veil-yard",
    label: "Hollow Veil Yard",
    ring: "outer",
    x: 0.162,
    y: 0.771,
    connections: ["mirecoil-beacon", "emberwatch-step"]
  },
  {
    id: "emberwatch-step",
    label: "Emberwatch Step",
    ring: "outer",
    x: 0.162,
    y: 0.229,
    connections: ["hollow-veil-yard", "outer_ember_sanctum"]
  },
  {
    id: "middle_shard_sprawl",
    label: "Shard Sprawl",
    ring: "middle",
    x: 0.291,
    y: 0.701,
    connections: ["middle_guardian_span", "middle_webglass_breach"]
  },
  {
    id: "middle_guardian_span",
    label: "Guardian Span",
    ring: "middle",
    x: 0.5,
    y: 0.205,
    connections: ["middle_shard_sprawl", "middle_webglass_breach", "inner_veil_rift"]
  },
  {
    id: "middle_webglass_breach",
    label: "Webglass Breach",
    ring: "middle",
    x: 0.708,
    y: 0.701,
    connections: ["middle_guardian_span", "middle_shard_sprawl"]
  },
  {
    id: "inner_veil_rift",
    label: "Veil Rift",
    ring: "inner",
    x: 0.5,
    y: 0.372,
    connections: ["middle_guardian_span", "inner_cinder_lattice", "inner_gate_of_cinders", "center_cinder_gate"]
  },
  {
    id: "inner_cinder_lattice",
    label: "Cinder Lattice",
    ring: "inner",
    x: 0.428,
    y: 0.658,
    connections: ["inner_veil_rift", "inner_gate_of_cinders", "center_cinder_gate"]
  },
  {
    id: "inner_gate_of_cinders",
    label: "Gate of Cinders",
    ring: "inner",
    x: 0.572,
    y: 0.658,
    connections: ["inner_veil_rift", "inner_cinder_lattice", "center_cinder_gate"]
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
