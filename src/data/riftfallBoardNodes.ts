export type BoardNode = {
  id: string;
  label: string;
  ring: "outer" | "middle" | "inner" | "center";
  x: number;
  y: number;
  connections: string[];
};

type RingNodeSeed = Omit<BoardNode, "x" | "y" | "connections"> & {
  links?: string[];
};

const outerSeeds: RingNodeSeed[] = [
  { id: "outer_waymarket", label: "Anchor Market", ring: "outer", links: ["outer_ember_sanctum"] },
  { id: "outer_broken_causeway", label: "Dock Nine Wreckage", ring: "outer" },
  { id: "emberwatch-step", label: "Ember Stair", ring: "outer" },
  { id: "outer_ember_sanctum", label: "Pilgrim Lock", ring: "outer", links: ["middle_relic_cache"] },
  { id: "glassmere-spindle", label: "Glass Signal Pier", ring: "outer", links: ["black-relay-spire", "ashwake-crossing"] },
  { id: "mirecoil-beacon", label: "Rusted Transit Gate", ring: "outer", links: ["middle_webglass_breach"] },
  { id: "votive-engine-room", label: "Votive Engine Room", ring: "outer", links: ["weeping-ammunition-shrine"] },
  { id: "ashwake-crossing", label: "Ashwalk Bridge", ring: "outer", links: ["outer_ember_sanctum"] },
  { id: "outer_oathpost", label: "Broken Census Hall", ring: "outer", links: ["the-salt-archive"] },
  { id: "outer_surgery_tent", label: "Old Mercy Bay", ring: "outer" },
  { id: "outer_salt_flats", label: "Mire Vent Colony", ring: "outer" },
  { id: "kettleward-foundry", label: "Kettleward Foundry", ring: "outer", links: ["middle_shard_sprawl"] },
  { id: "outer_relay_camp", label: "Lantern Post 47", ring: "outer" },
  { id: "hollow-veil-yard", label: "Fallen Hab-Stack", ring: "outer" }
];

const middleSeeds: RingNodeSeed[] = [
  { id: "middle_red_march_outpost", label: "Choir Bastion", ring: "middle", links: ["choir-execution-court"] },
  { id: "middle_anomaly_well", label: "Static Chapel", ring: "middle", links: ["inner_cinder_lattice"] },
  { id: "middle_shard_sprawl", label: "Chain-Maul Yard", ring: "middle" },
  { id: "middle_rivalry_pit", label: "Mirror Barracks", ring: "middle" },
  { id: "black-relay-spire", label: "Black Relay Spire", ring: "middle" },
  { id: "middle_relic_cache", label: "Crucible of Names", ring: "middle" },
  { id: "the-salt-archive", label: "The Salt Archive", ring: "middle" },
  { id: "red-lantern-trenches", label: "Red Lantern Trenches", ring: "middle" },
  { id: "middle_guardian_span", label: "The Hollow Customs Gate", ring: "middle", links: ["inner_veil_rift"] },
  { id: "middle_webglass_breach", label: "Grave-Rail Junction", ring: "middle" },
  { id: "middle_scar_surgery", label: "Sable Machine Choir", ring: "middle" },
  { id: "weeping-ammunition-shrine", label: "Weeping Ammunition Shrine", ring: "middle" }
];

const innerSeeds: RingNodeSeed[] = [
  { id: "inner_veil_rift", label: "Gate of Three Ashes", ring: "inner" },
  { id: "inner_tomb_gate", label: "The Pale Marshal's Road", ring: "inner" },
  { id: "inner_choir_shrine", label: "Saint Engine Crypt", ring: "inner" },
  { id: "inner_cinder_lattice", label: "The Crownless Observatory", ring: "inner" },
  { id: "inner_blackstar_shortcut", label: "Dead Star Reliquary", ring: "inner", links: ["center_cinder_gate"] },
  { id: "the-bone-meridian", label: "The Bone Meridian", ring: "inner" },
  { id: "choir-execution-court", label: "Choir Execution Court", ring: "inner" },
  { id: "inner_gate_of_cinders", label: "The Last Signal Well", ring: "inner", links: ["center_cinder_gate"] }
];

const centerSeed: RingNodeSeed = {
  id: "center_cinder_gate",
  label: "The Ashen Reach Core",
  ring: "center"
};

function ringPosition(index: number, count: number, radiusX: number, radiusY: number, startDegrees: number): { x: number; y: number } {
  const angle = ((startDegrees + (360 / count) * index) * Math.PI) / 180;

  return {
    x: Number((0.5 + Math.cos(angle) * radiusX).toFixed(4)),
    y: Number((0.5 + Math.sin(angle) * radiusY).toFixed(4))
  };
}

function addConnection(connectionsById: Map<string, Set<string>>, from: string, to: string): void {
  if (!connectionsById.has(from) || !connectionsById.has(to)) {
    throw new Error(`Board route references unknown sector ${from} -> ${to}`);
  }

  connectionsById.get(from)?.add(to);
  connectionsById.get(to)?.add(from);
}

function connectRing(connectionsById: Map<string, Set<string>>, seeds: RingNodeSeed[]): void {
  seeds.forEach((seed, index) => {
    const next = seeds[(index + 1) % seeds.length];

    if (next) {
      addConnection(connectionsById, seed.id, next.id);
    }
  });
}

function buildBoardNodes(): BoardNode[] {
  const positionedSeeds: BoardNode[] = [
    ...outerSeeds.map((seed, index) => ({
      ...seed,
      ...ringPosition(index, outerSeeds.length, 0.46, 0.38, 90),
      connections: []
    })),
    ...middleSeeds.map((seed, index) => ({
      ...seed,
      ...ringPosition(index, middleSeeds.length, 0.32, 0.26, 90),
      connections: []
    })),
    ...innerSeeds.map((seed, index) => ({
      ...seed,
      ...ringPosition(index, innerSeeds.length, 0.18, 0.15, 90),
      connections: []
    })),
    { ...centerSeed, x: 0.5, y: 0.5, connections: [] }
  ];
  const connectionsById = new Map(positionedSeeds.map((seed) => [seed.id, new Set<string>()] as const));

  connectRing(connectionsById, outerSeeds);
  connectRing(connectionsById, middleSeeds);
  connectRing(connectionsById, innerSeeds);

  [...outerSeeds, ...middleSeeds, ...innerSeeds].forEach((seed) => {
    seed.links?.forEach((targetId) => addConnection(connectionsById, seed.id, targetId));
  });

  return positionedSeeds.map((seed) => ({
    ...seed,
    connections: [...(connectionsById.get(seed.id) ?? [])]
  }));
}

export const RIFTFALL_BOARD_NODES: BoardNode[] = buildBoardNodes();

export const RIFTFALL_BOARD_NODE_INDEX = new Map(RIFTFALL_BOARD_NODES.map((node) => [node.id, node] as const));
