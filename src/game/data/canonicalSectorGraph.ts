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
      "bellwire-snare",
      "scrap-toll-gangers",
      "furnace-ditch-collapse",
      "gate-tax-collectors",
      "redglass-stray",
      "cinder-veil-stalker",
      "starless-taxation"
    ],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: []
  },
  outer_waymarket: {
    threat: [
      "scrap-toll-gangers",
      "gate-tax-collectors",
      "rust-choir-peddlers",
      "pale-cartel-shakedown",
      "pale-contract-collector"
    ],
    anomaly: [],
    contract: ["cartel-quiet-route", "clan-salvage-tithe", "compact-ember-courier", "cartel-ledger-skim"],
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
      "glass-tick-cloud",
      "starless-taxation"
    ],
    anomaly: [
      "anomaly-glassmere",
      "anomaly-choir-static",
      "anomaly-bellrain-inversion",
      "anomaly-cinder-mirage-lane",
      "anomaly-ashfall-murmur",
      "anomaly-relay-ghost-loop"
    ],
    contract: [],
    artifact: [],
    escalation: []
  },
  outer_relay_camp: {
    threat: [
      "lantern-moth-swarm",
      "relay-pilgrim-riot",
      "siren-relay-echo",
      "roadside-bone-oracle",
      "spindle-static-squall"
    ],
    anomaly: ["anomaly-choir-static", "anomaly-bellrain-inversion", "anomaly-relay-ghost-loop"],
    contract: ["choir-hush-census", "choir-spindle-harmonics"],
    artifact: [],
    escalation: []
  },
  "mirecoil-beacon": {
    threat: [
      "relay-husk",
      "slag-drone",
      "cinder-veil-stalker",
      "beacon-cable-snare",
      "broken-mast-collapse",
      "siren-relay-echo",
      "relay-pilgrim-riot",
      "void-salt-sickness",
      "pale-cartel-shakedown",
      "specimen-null-arrives"
    ],
    anomaly: [],
    contract: ["contract-beacon", "contract-lantern-run", "compact-ember-courier"],
    artifact: [],
    escalation: []
  },
  outer_salt_flats: {
    threat: ["void-salt-sickness", "mudglass-sinkhole", "beacon-cable-snare", "mirror-mite-bloom", "redglass-stray"],
    anomaly: ["anomaly-glassmere", "anomaly-cinder-mirage-lane", "anomaly-void-salt-tide", "anomaly-saltglass-fata-morgana"],
    contract: ["clan-salt-burial"],
    artifact: ["artifact-void-salt-poultice"],
    escalation: []
  },
  "hollow-veil-yard": {
    threat: [
      "grave-silt-press",
      "copperjaw-vermin",
      "mudglass-sinkhole",
      "yard-ghoul-welders",
      "rust-choir-peddlers",
      "pale-cartel-shakedown"
    ],
    anomaly: [],
    contract: [],
    artifact: [
      "artifact-yard",
      "artifact-bell-votive",
      "artifact-ashen-route-compass",
      "artifact-oath-chain-ledger",
      "artifact-ember-burden-idol"
    ],
    escalation: []
  },
  outer_surgery_tent: {
    threat: ["yard-ghoul-welders", "grave-silt-press", "smoke-leech-clutch", "copperjaw-vermin", "glass-tick-cloud"],
    anomaly: [],
    contract: ["compact-surgery-bond"],
    artifact: ["artifact-yard", "artifact-cinder-suture-kit", "artifact-void-salt-poultice", "artifact-last-breath-rivet", "artifact-saintwire-splint"],
    escalation: []
  },
  "emberwatch-step": {
    threat: ["emberwatch-sparkfall", "suture-storm", "red-march-cannoneer", "starless-taxation"],
    anomaly: ["anomaly-red-suture-field"],
    contract: [],
    artifact: [],
    escalation: ["escalation-emberwatch", "escalation-ridge-suture", "escalation-ashfall-curfew", "escalation-saltwind-lockdown"]
  },
  outer_oathpost: {
    threat: ["pale-cartel-shakedown", "gate-tax-collectors", "furnace-ditch-collapse", "bellwire-snare", "pale-contract-collector"],
    anomaly: [],
    contract: ["warden-span-vigil", "cartel-crossing-thread", "cartel-exposed-object"],
    artifact: [],
    escalation: []
  },
  outer_broken_causeway: {
    threat: ["furnace-ditch-collapse", "beacon-cable-snare", "emberwatch-sparkfall", "suture-storm", "broken-mast-collapse"],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: ["escalation-ridge-suture", "escalation-bellglass-riot", "escalation-gate-tax-mandate"]
  },
  middle_shard_sprawl: {
    threat: [
      "shardvine-ambushers",
      "shardwind-front",
      "marrow-tax-auditors",
      "guardian-bridge-duelist",
      "ash-court-duelist",
      "false-route-procession",
      "bone-rivet-brute",
      "red-march-cannoneer"
    ],
    anomaly: ["anomaly-warbell-parallax"],
    contract: ["cartel-ledger-skim"],
    artifact: [],
    escalation: []
  },
  middle_relic_cache: {
    threat: ["marrow-tax-auditors", "breach-lens-overload", "memory-tax-gate", "mourning-engine-pup", "iron-synod-hunter", "starless-taxation"],
    anomaly: [],
    contract: [],
    artifact: [
      "artifact-yard",
      "artifact-bell-votive",
      "artifact-ashen-route-compass",
      "artifact-choir-static-censer",
      "artifact-heat-sink-prayer",
      "artifact-mirror-reroll-token",
      "artifact-oath-chain-ledger",
      "artifact-red-march-warbell",
      "artifact-pale-ledger-token",
      "artifact-ember-burden-idol",
      "artifact-rift-anchor-spike"
    ],
    escalation: ["escalation-artifact-wake"]
  },
  middle_scar_surgery: {
    threat: ["ash-choir-crusader", "suture-storm", "marrow-tax-auditors", "bone-rivet-brute", "red-march-cannoneer"],
    anomaly: ["anomaly-marrow-clock-drift", "anomaly-scar-tide-lattice"],
    contract: ["compact-surgery-bond"],
    artifact: ["artifact-cinder-suture-kit", "artifact-void-salt-poultice"],
    escalation: ["escalation-emberwatch", "escalation-red-march-levy", "escalation-marrow-surgery-debt"]
  },
  middle_guardian_span: {
    threat: [
      "guardian-bridge-duelist",
      "ash-court-duelist",
      "iron-synod-hunter",
      "bone-rivet-brute",
      "red-march-cannoneer",
      "suture-storm",
      "mirror-rot-interference",
      "specimen-null-arrives"
    ],
    anomaly: ["anomaly-red-suture-field", "anomaly-table-fire-writ", "anomaly-warbell-parallax"],
    contract: ["dominion-gate-tithe"],
    artifact: [],
    escalation: ["escalation-red-march-levy", "escalation-gate-tax-mandate"]
  },
  middle_rivalry_pit: {
    threat: ["shardvine-ambushers", "guardian-bridge-duelist", "webglass-snarefield", "ash-court-duelist", "iron-synod-hunter", "false-route-procession"],
    anomaly: ["anomaly-red-suture-field"],
    contract: ["cartel-quiet-route", "compact-cleanse-ledger", "cartel-exposed-object", "cartel-ledger-skim"],
    artifact: ["artifact-red-march-warbell", "artifact-pale-ledger-token", "artifact-black-route-fuse"],
    escalation: ["escalation-bellglass-riot", "escalation-pit-blood-claim"]
  },
  middle_red_march_outpost: {
    threat: ["red-march-cannoneer", "iron-synod-hunter", "mourning-engine-pup", "bone-rivet-brute", "ash-choir-crusader", "suture-storm"],
    anomaly: ["anomaly-red-suture-field", "anomaly-marrow-clock-drift", "anomaly-warbell-parallax"],
    contract: ["warden-span-vigil", "clan-salvage-tithe", "dominion-warbell-recovery", "clan-bone-road-guide"],
    artifact: ["artifact-red-march-warbell"],
    escalation: ["escalation-ashfall-curfew", "escalation-webglass-afterimage", "escalation-gate-tax-mandate"]
  },
  middle_webglass_breach: {
    threat: [
      "webglass-echo-trap",
      "webglass-snarefield",
      "breach-lens-overload",
      "ash-choir-crusader",
      "choir-static-burst",
      "false-route-procession",
      "mirror-rot-interference",
      "specimen-null-arrives"
    ],
    anomaly: ["anomaly-webglass-stutter", "anomaly-gutter-star-orbit"],
    contract: ["clan-bone-road-guide"],
    artifact: [],
    escalation: ["escalation-webglass-afterimage", "escalation-choir-feedback"]
  },
  middle_anomaly_well: {
    threat: [
      "webglass-echo-trap",
      "breach-lens-overload",
      "memory-tax-gate",
      "choir-static-burst",
      "webglass-snarefield",
      "false-route-procession",
      "veil-rift-judicator"
    ],
    anomaly: [
      "anomaly-glassmere",
      "anomaly-choir-static",
      "anomaly-marrow-clock-drift",
      "anomaly-void-salt-tide",
      "anomaly-table-fire-writ",
      "anomaly-gutter-star-orbit",
      "anomaly-webglass-stutter",
      "anomaly-scar-tide-lattice"
    ],
    contract: ["choir-well-canticle"],
    artifact: ["artifact-bell-votive", "artifact-choir-static-censer", "artifact-gate-saint-key", "artifact-marrow-route-key", "artifact-rift-anchor-spike"],
    escalation: ["escalation-webglass-afterimage", "escalation-crownfall-writ", "escalation-blackstar-hunger"]
  },
  inner_veil_rift: {
    threat: ["veil-rift-judicator", "gateblind-pulse", "ashen-doppelganger", "saint-of-ashes-echo", "starless-taxation", "specimen-null-arrives"],
    anomaly: ["anomaly-crownfall-echo-court", "anomaly-saint-static-aperture", "anomaly-blackstar-breath", "anomaly-cinder-gate-echo"],
    contract: [],
    artifact: ["artifact-gate-saint-key", "artifact-throne-crown-fragment", "artifact-marrow-route-key", "artifact-rift-anchor-spike"],
    escalation: ["escalation-webglass-afterimage", "escalation-crownfall-writ", "escalation-blackstar-hunger", "escalation-throne-shadow"]
  },
  inner_tomb_gate: {
    threat: ["tomb-gate-colossus", "throne-soot-knight", "last-lock-warden", "cinder-lattice-maw", "saint-of-ashes-echo", "starless-taxation"],
    anomaly: ["anomaly-crownfall-echo-court", "anomaly-throne-shadow-jury", "anomaly-blackstar-breath"],
    contract: [],
    artifact: ["artifact-gate-saint-key", "artifact-marrow-route-key", "artifact-ember-burden-idol"],
    escalation: ["escalation-crownfall-writ", "escalation-throne-shadow"]
  },
  inner_cinder_lattice: {
    threat: ["cinder-lattice-maw", "cinder-gate-backlash", "last-lock-warden", "gate-choir-executioner", "tomb-gate-colossus", "specimen-null-arrives"],
    anomaly: ["anomaly-saint-static-aperture", "anomaly-cinder-gate-echo", "anomaly-throne-shadow-jury"],
    contract: [],
    artifact: ["artifact-throne-crown-fragment", "artifact-rift-anchor-spike"],
    escalation: ["escalation-gate-saint-wake", "escalation-artifact-wake", "escalation-throne-shadow"]
  },
  inner_blackstar_shortcut: {
    threat: ["specimen-null-arrives", "ashen-doppelganger", "cinder-gate-backlash", "gate-choir-executioner", "cinder-lattice-maw", "starless-taxation"],
    anomaly: ["anomaly-blackstar-breath", "anomaly-gutter-star-orbit"],
    contract: ["umbral-blackstar-sample"],
    artifact: [
      "artifact-bell-votive",
      "artifact-blackstar-ampoule",
      "artifact-throne-crown-fragment",
      "artifact-rift-anchor-spike",
      "artifact-ember-burden-idol",
      "artifact-heat-sink-prayer",
      "artifact-mirror-reroll-token",
      "artifact-black-route-fuse"
    ],
    escalation: ["escalation-ridge-suture", "escalation-crownfall-writ", "escalation-gate-saint-wake", "escalation-blackstar-hunger"]
  },
  inner_choir_shrine: {
    threat: ["veil-rift-judicator", "gateblind-pulse", "throne-soot-knight", "saint-of-ashes-echo", "gate-choir-executioner", "specimen-null-arrives"],
    anomaly: ["anomaly-choir-static", "anomaly-crownfall-echo-court", "anomaly-saint-static-aperture", "anomaly-cinder-gate-echo"],
    contract: ["umbral-shrine-confession"],
    artifact: ["artifact-bell-votive", "artifact-choir-static-censer", "artifact-gate-saint-key", "artifact-pale-ledger-token", "artifact-marrow-route-key"],
    escalation: ["escalation-gate-saint-wake", "escalation-choir-feedback", "escalation-throne-shadow"]
  },
  inner_gate_of_cinders: {
    threat: [
      "gate-choir-executioner",
      "gateblind-pulse",
      "cinder-gate-backlash",
      "tomb-gate-colossus",
      "last-lock-warden",
      "saint-of-ashes-echo",
      "cinder-lattice-maw",
      "ashen-doppelganger",
      "specimen-null-arrives"
    ],
    anomaly: ["anomaly-table-fire-writ", "anomaly-cinder-gate-echo", "anomaly-throne-shadow-jury"],
    contract: ["dominion-gate-tithe"],
    artifact: ["artifact-gate-saint-key", "artifact-throne-crown-fragment", "artifact-marrow-route-key", "artifact-rift-anchor-spike", "artifact-pale-ledger-token"],
    escalation: ["escalation-crownfall-writ", "escalation-gate-saint-wake", "escalation-throne-shadow"]
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
