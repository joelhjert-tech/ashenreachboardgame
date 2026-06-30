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
  { id: "north-dock-bastion", label: "North Dock Bastion", ring: "outer" },
  { id: "outer_waymarket", label: "Anchor Market", ring: "outer", links: ["outer_ember_sanctum"] },
  { id: "coldwind-wharf", label: "Coldwind Wharf", ring: "outer" },
  { id: "outer_broken_causeway", label: "Dock Nine Wreckage", ring: "outer" },
  { id: "emberwatch-step", label: "Ember Stair", ring: "outer" },
  { id: "cinder-fields", label: "Cinder Fields", ring: "outer" },
  { id: "glassmere-spindle", label: "Glass Signal Pier", ring: "outer", links: ["black-relay-spire", "ashwake-crossing"] },
  { id: "outer_ember_sanctum", label: "Pilgrim Lock Gate", ring: "outer", links: ["middle_red_march_outpost"] },
  { id: "mirecoil-beacon", label: "Rusted Transit Gate", ring: "outer", links: ["middle_webglass_breach"] },
  { id: "outer_oathpost", label: "Broken Census Hall", ring: "outer", links: ["the-salt-archive"] },
  { id: "colony-outskirts", label: "Colony Outskirts", ring: "outer" },
  { id: "deadwater-marsh", label: "Deadwater Marsh", ring: "outer" },
  { id: "votive-engine-room", label: "Votive Engine Room", ring: "outer", links: ["weeping-ammunition-shrine"] },
  { id: "ashwake-crossing", label: "Ashwalk Bridge", ring: "outer", links: ["outer_ember_sanctum"] },
  { id: "outer_surgery_tent", label: "Old Mercy Bay", ring: "outer" },
  { id: "outer_salt_flats", label: "Mire Vent Colony", ring: "outer" },
  { id: "rustveil-yard", label: "Rustveil Yard", ring: "outer" },
  { id: "sunken-pier", label: "Sunken Pier", ring: "outer" },
  { id: "shattered-causeway", label: "Shattered Causeway", ring: "outer" },
  { id: "kettleward-foundry", label: "Kettleward Foundry", ring: "outer", links: ["middle_shard_sprawl"] },
  { id: "flooded-locks", label: "Flooded Locks", ring: "outer" },
  { id: "transit-gate", label: "Transit Gate", ring: "outer", links: ["middle_guardian_span"] },
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
  { id: "middle_webglass_breach", label: "Grave-Rail Junction", ring: "middle" },
  { id: "middle_scar_surgery", label: "Sable Machine Choir", ring: "middle" },
  { id: "weeping-ammunition-shrine", label: "Weeping Ammunition Shrine", ring: "middle" },
  { id: "middle_guardian_span", label: "Customs Gate", ring: "middle", links: ["inner_veil_rift"] },
  { id: "red-lantern-trenches", label: "Red Lantern Trenches", ring: "middle" },
  { id: "scorched-road", label: "Scorched Road", ring: "middle" },
  { id: "blastworks", label: "Blastworks", ring: "middle" },
  { id: "ashen-chapel", label: "Ashen Chapel", ring: "middle" },
  { id: "reavers-den", label: "Reaver's Den", ring: "middle" }
];

const innerSeeds: RingNodeSeed[] = [
  { id: "inner_gate_of_cinders", label: "The Last Signal Well", ring: "inner", links: ["center_cinder_gate"] },
  { id: "inner_choir_shrine", label: "Saint Engine Crypt", ring: "inner" },
  { id: "inner_cinder_lattice", label: "The Crownless Observatory", ring: "inner" },
  { id: "choir-execution-court", label: "Hollow Court", ring: "inner", links: ["middle_rivalry_pit"] },
  { id: "inner_veil_rift", label: "Melted Gate", ring: "inner" },
  { id: "inner_tomb_gate", label: "Rifted Approach", ring: "inner" },
  { id: "inner_blackstar_shortcut", label: "Dead Star Reliquary", ring: "inner", links: ["center_cinder_gate"] },
  { id: "the-bone-meridian", label: "Bone Meridian", ring: "inner" }
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

interface RectangularTrackLayout {
  left: number;
  right: number;
  top: number;
  bottom: number;
  topCount: number;
  rightCount: number;
  bottomCount: number;
  leftCount: number;
}

function spreadPositions(count: number, start: number, end: number): number[] {
  if (count <= 0) {
    return [];
  }

  const step = (end - start) / count;

  return Array.from({ length: count }, (_, index) => Number((start + step * (index + 0.5)).toFixed(4)));
}

function spreadInclusivePositions(count: number, start: number, end: number): number[] {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [Number(((start + end) / 2).toFixed(4))];
  }

  const step = (end - start) / (count - 1);

  return Array.from({ length: count }, (_, index) => Number((start + step * index).toFixed(4)));
}

function rectangularTrackPositions(layout: RectangularTrackLayout): Array<{ x: number; y: number }> {
  const top = spreadInclusivePositions(layout.topCount, layout.left, layout.right).map((x) => ({ x, y: layout.top }));
  const right = spreadPositions(layout.rightCount, layout.top, layout.bottom).map((y) => ({ x: layout.right, y }));
  const bottom = spreadInclusivePositions(layout.bottomCount, layout.right, layout.left).map((x) => ({ x, y: layout.bottom }));
  const left = spreadPositions(layout.leftCount, layout.bottom, layout.top).map((y) => ({ x: layout.left, y }));

  return [...top, ...right, ...bottom, ...left];
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
  const outerPositions = rectangularTrackPositions({
    left: 0.06,
    right: 0.94,
    top: 0.08,
    bottom: 0.92,
    topCount: 8,
    rightCount: 4,
    bottomCount: 8,
    leftCount: 4
  });
  const middlePositions = rectangularTrackPositions({
    left: 0.22,
    right: 0.78,
    top: 0.29,
    bottom: 0.71,
    topCount: 6,
    rightCount: 2,
    bottomCount: 6,
    leftCount: 2
  });
  const innerPositions = rectangularTrackPositions({
    left: 0.34,
    right: 0.66,
    top: 0.4,
    bottom: 0.6,
    topCount: 2,
    rightCount: 2,
    bottomCount: 2,
    leftCount: 2
  });
  const positionedSeeds: BoardNode[] = [
    ...outerSeeds.map((seed, index) => ({
      ...seed,
      ...(outerPositions[index] ?? ringPosition(index, outerSeeds.length, 0.46, 0.38, 90)),
      connections: []
    })),
    ...middleSeeds.map((seed, index) => ({
      ...seed,
      ...(middlePositions[index] ?? ringPosition(index, middleSeeds.length, 0.32, 0.26, 90)),
      connections: []
    })),
    ...innerSeeds.map((seed, index) => ({
      ...seed,
      ...(innerPositions[index] ?? ringPosition(index, innerSeeds.length, 0.18, 0.15, 90)),
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
