import { RIFTFALL_BOARD_NODE_INDEX, RIFTFALL_BOARD_NODES } from "../../data/riftfallBoardNodes.js";
import { BOARD_SPACES } from "./boardSpaces.js";
import type { EncounterDecks, RegionTier, SectorNode } from "../schema/sector.schema.js";

const DEFAULT_ENCOUNTER_DECKS: EncounterDecks = {
  threat: [],
  anomaly: [],
  contract: [],
  artifact: [],
  escalation: []
};

const regionTierByBoardTier: Record<(typeof BOARD_SPACES)[number]["tier"], RegionTier> = {
  outer: "borderlight",
  middle: "red_march",
  inner: "crownfall",
  center: "cinder_gate"
};

const dangerBySpaceId: Partial<Record<string, number>> = {
  outer_ember_sanctum: 1,
  "ashwake-crossing": 2,
  outer_waymarket: 2,
  "glassmere-spindle": 3,
  outer_relay_camp: 2,
  "mirecoil-beacon": 4,
  outer_salt_flats: 3,
  "hollow-veil-yard": 3,
  outer_surgery_tent: 3,
  "emberwatch-step": 5,
  outer_oathpost: 3,
  outer_broken_causeway: 4,
  middle_shard_sprawl: 5,
  middle_relic_cache: 5,
  middle_scar_surgery: 5,
  middle_guardian_span: 6,
  middle_rivalry_pit: 6,
  middle_red_march_outpost: 6,
  middle_webglass_breach: 6,
  middle_anomaly_well: 6,
  inner_veil_rift: 7,
  inner_tomb_gate: 7,
  inner_cinder_lattice: 8,
  inner_blackstar_shortcut: 9,
  inner_choir_shrine: 8,
  inner_gate_of_cinders: 8,
  center_cinder_gate: 10
};

const encounterDecksBySpaceId: Partial<Record<string, EncounterDecks>> = {
  outer_ember_sanctum: {
    threat: [],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: []
  },
  "ashwake-crossing": {
    threat: [
      "smoke-leech-clutch",
      "ash-rat-skitter",
      "scrap-toll-gangers",
      "furnace-ditch-collapse",
      "gate-tax-collectors",
      "cinder-veil-stalker",
      "starless-taxation"
    ],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: []
  },
  outer_waymarket: {
    threat: ["scrap-toll-gangers", "gate-tax-collectors", "rust-choir-peddlers", "pale-cartel-shakedown"],
    anomaly: [],
    contract: ["cartel-quiet-route", "clan-salvage-tithe"],
    artifact: [],
    escalation: []
  },
  "glassmere-spindle": {
    threat: [
      "glass-chime-swarm",
      "latchspire-raider",
      "lantern-moth-swarm",
      "roadside-bone-oracle",
      "spindle-static-squall",
      "mirror-mite-bloom",
      "starless-taxation"
    ],
    anomaly: ["anomaly-glassmere", "anomaly-choir-static", "anomaly-bellrain-inversion", "anomaly-cinder-mirage-lane"],
    contract: [],
    artifact: [],
    escalation: []
  },
  outer_relay_camp: {
    threat: ["lantern-moth-swarm", "relay-pilgrim-riot", "roadside-bone-oracle", "spindle-static-squall"],
    anomaly: ["anomaly-choir-static", "anomaly-bellrain-inversion"],
    contract: ["choir-hush-census"],
    artifact: [],
    escalation: []
  },
  "mirecoil-beacon": {
    threat: [
      "relay-husk",
      "slag-drone",
      "cinder-veil-stalker",
      "beacon-cable-snare",
      "relay-pilgrim-riot",
      "void-salt-sickness",
      "pale-cartel-shakedown",
      "specimen-null-arrives"
    ],
    anomaly: [],
    contract: ["contract-beacon", "contract-lantern-run"],
    artifact: [],
    escalation: []
  },
  outer_salt_flats: {
    threat: ["void-salt-sickness", "mudglass-sinkhole", "beacon-cable-snare", "mirror-mite-bloom"],
    anomaly: ["anomaly-glassmere", "anomaly-cinder-mirage-lane", "anomaly-void-salt-tide"],
    contract: [],
    artifact: [],
    escalation: []
  },
  "hollow-veil-yard": {
    threat: [
      "grave-silt-press",
      "mudglass-sinkhole",
      "yard-ghoul-welders",
      "rust-choir-peddlers",
      "pale-cartel-shakedown"
    ],
    anomaly: [],
    contract: [],
    artifact: ["artifact-yard", "artifact-bell-votive", "artifact-ashen-route-compass", "artifact-oath-chain-ledger"],
    escalation: []
  },
  outer_surgery_tent: {
    threat: ["yard-ghoul-welders", "grave-silt-press", "smoke-leech-clutch"],
    anomaly: [],
    contract: [],
    artifact: ["artifact-yard", "artifact-cinder-suture-kit"],
    escalation: []
  },
  "emberwatch-step": {
    threat: ["emberwatch-sparkfall", "suture-storm", "red-march-cannoneer", "starless-taxation"],
    anomaly: ["anomaly-red-suture-field"],
    contract: [],
    artifact: [],
    escalation: ["escalation-emberwatch", "escalation-ridge-suture", "escalation-ashfall-curfew"]
  },
  outer_oathpost: {
    threat: ["pale-cartel-shakedown", "gate-tax-collectors", "furnace-ditch-collapse"],
    anomaly: [],
    contract: ["warden-span-vigil", "cartel-crossing-thread"],
    artifact: [],
    escalation: []
  },
  outer_broken_causeway: {
    threat: ["furnace-ditch-collapse", "beacon-cable-snare", "emberwatch-sparkfall", "suture-storm"],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: ["escalation-ridge-suture", "escalation-bellglass-riot"]
  },
  middle_shard_sprawl: {
    threat: [
      "shardvine-ambushers",
      "marrow-tax-auditors",
      "guardian-bridge-duelist",
      "false-route-procession",
      "red-march-cannoneer"
    ],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: []
  },
  middle_relic_cache: {
    threat: ["marrow-tax-auditors", "breach-lens-overload", "iron-synod-hunter", "starless-taxation"],
    anomaly: [],
    contract: [],
    artifact: [
      "artifact-yard",
      "artifact-bell-votive",
      "artifact-ashen-route-compass",
      "artifact-choir-static-censer",
      "artifact-oath-chain-ledger",
      "artifact-red-march-warbell"
    ],
    escalation: []
  },
  middle_scar_surgery: {
    threat: ["ash-choir-crusader", "suture-storm", "marrow-tax-auditors", "red-march-cannoneer"],
    anomaly: ["anomaly-marrow-clock-drift"],
    contract: [],
    artifact: ["artifact-cinder-suture-kit"],
    escalation: ["escalation-emberwatch", "escalation-red-march-levy"]
  },
  middle_guardian_span: {
    threat: [
      "guardian-bridge-duelist",
      "iron-synod-hunter",
      "red-march-cannoneer",
      "suture-storm",
      "specimen-null-arrives"
    ],
    anomaly: ["anomaly-red-suture-field", "anomaly-table-fire-writ"],
    contract: [],
    artifact: [],
    escalation: ["escalation-red-march-levy"]
  },
  middle_rivalry_pit: {
    threat: ["shardvine-ambushers", "guardian-bridge-duelist", "iron-synod-hunter", "false-route-procession"],
    anomaly: ["anomaly-red-suture-field"],
    contract: ["cartel-quiet-route", "compact-cleanse-ledger"],
    artifact: ["artifact-red-march-warbell"],
    escalation: ["escalation-bellglass-riot"]
  },
  middle_red_march_outpost: {
    threat: ["red-march-cannoneer", "iron-synod-hunter", "ash-choir-crusader", "suture-storm"],
    anomaly: ["anomaly-red-suture-field", "anomaly-marrow-clock-drift"],
    contract: ["warden-span-vigil", "clan-salvage-tithe"],
    artifact: [],
    escalation: ["escalation-ashfall-curfew", "escalation-webglass-afterimage"]
  },
  middle_webglass_breach: {
    threat: [
      "webglass-echo-trap",
      "breach-lens-overload",
      "ash-choir-crusader",
      "false-route-procession",
      "specimen-null-arrives"
    ],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: ["escalation-webglass-afterimage"]
  },
  middle_anomaly_well: {
    threat: ["webglass-echo-trap", "breach-lens-overload", "false-route-procession", "veil-rift-judicator"],
    anomaly: [
      "anomaly-glassmere",
      "anomaly-choir-static",
      "anomaly-marrow-clock-drift",
      "anomaly-void-salt-tide",
      "anomaly-table-fire-writ"
    ],
    contract: [],
    artifact: ["artifact-bell-votive", "artifact-choir-static-censer", "artifact-gate-saint-key"],
    escalation: ["escalation-webglass-afterimage", "escalation-crownfall-writ"]
  },
  inner_veil_rift: {
    threat: ["veil-rift-judicator", "saint-of-ashes-echo", "starless-taxation", "specimen-null-arrives"],
    anomaly: ["anomaly-crownfall-echo-court", "anomaly-saint-static-aperture"],
    contract: [],
    artifact: ["artifact-gate-saint-key", "artifact-throne-crown-fragment"],
    escalation: ["escalation-webglass-afterimage", "escalation-crownfall-writ"]
  },
  inner_tomb_gate: {
    threat: ["tomb-gate-colossus", "cinder-lattice-maw", "saint-of-ashes-echo", "starless-taxation"],
    anomaly: ["anomaly-crownfall-echo-court"],
    contract: [],
    artifact: ["artifact-gate-saint-key"],
    escalation: ["escalation-crownfall-writ"]
  },
  inner_cinder_lattice: {
    threat: ["cinder-lattice-maw", "gate-choir-executioner", "tomb-gate-colossus", "specimen-null-arrives"],
    anomaly: ["anomaly-saint-static-aperture"],
    contract: [],
    artifact: ["artifact-throne-crown-fragment"],
    escalation: ["escalation-gate-saint-wake"]
  },
  inner_blackstar_shortcut: {
    threat: ["specimen-null-arrives", "gate-choir-executioner", "cinder-lattice-maw", "starless-taxation"],
    anomaly: [],
    contract: [],
    artifact: ["artifact-bell-votive", "artifact-blackstar-ampoule", "artifact-throne-crown-fragment"],
    escalation: ["escalation-ridge-suture", "escalation-crownfall-writ", "escalation-gate-saint-wake"]
  },
  inner_choir_shrine: {
    threat: ["veil-rift-judicator", "saint-of-ashes-echo", "gate-choir-executioner", "specimen-null-arrives"],
    anomaly: ["anomaly-choir-static", "anomaly-crownfall-echo-court", "anomaly-saint-static-aperture"],
    contract: [],
    artifact: ["artifact-bell-votive", "artifact-choir-static-censer", "artifact-gate-saint-key"],
    escalation: ["escalation-gate-saint-wake"]
  },
  inner_gate_of_cinders: {
    threat: [
      "gate-choir-executioner",
      "tomb-gate-colossus",
      "saint-of-ashes-echo",
      "cinder-lattice-maw",
      "specimen-null-arrives"
    ],
    anomaly: ["anomaly-table-fire-writ"],
    contract: [],
    artifact: ["artifact-gate-saint-key", "artifact-throne-crown-fragment"],
    escalation: ["escalation-crownfall-writ", "escalation-gate-saint-wake"]
  }
};

function cloneEncounterDecks(source: EncounterDecks | undefined): EncounterDecks {
  const decks = source ?? DEFAULT_ENCOUNTER_DECKS;

  return {
    threat: [...decks.threat],
    anomaly: [...decks.anomaly],
    contract: [...decks.contract],
    artifact: [...decks.artifact],
    escalation: [...decks.escalation]
  };
}

export function createCanonicalSectorGraph(): SectorNode[] {
  return BOARD_SPACES.map((space) => {
    const node = RIFTFALL_BOARD_NODE_INDEX.get(space.id);

    if (!node) {
      throw new Error(`Missing board node for canonical space ${space.id}`);
    }

    return {
      id: space.id,
      name: space.name,
      regionTier: regionTierByBoardTier[space.tier],
      neighbors: [...node.connections],
      danger: dangerBySpaceId[space.id] ?? Math.min(10, Math.max(1, node.connections.length + space.threatIcons.length)),
      encounterDecks: cloneEncounterDecks(encounterDecksBySpaceId[space.id])
    };
  });
}

export function validateCanonicalSectorGraph(sectors: SectorNode[]): void {
  const byId = new Map(sectors.map((sector) => [sector.id, sector] as const));

  for (const boardNode of RIFTFALL_BOARD_NODES) {
    if (!byId.has(boardNode.id)) {
      throw new Error(`Missing live sector for board node ${boardNode.id}`);
    }
  }

  for (const sector of sectors) {
    if (!RIFTFALL_BOARD_NODE_INDEX.has(sector.id)) {
      throw new Error(`Live sector ${sector.id} does not exist on the board map`);
    }

    for (const neighborId of sector.neighbors) {
      const neighbor = byId.get(neighborId);

      if (!neighbor) {
        throw new Error(`Sector ${sector.id} links to unknown neighbor ${neighborId}`);
      }

      if (!neighbor.neighbors.includes(sector.id)) {
        throw new Error(`Sector ${sector.id} is not linked back from ${neighborId}`);
      }
    }
  }
}
