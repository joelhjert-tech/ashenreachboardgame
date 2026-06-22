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
  "glassmere-spindle": 3,
  "mirecoil-beacon": 4,
  "hollow-veil-yard": 3,
  "emberwatch-step": 5,
  middle_shard_sprawl: 5,
  middle_guardian_span: 6,
  middle_webglass_breach: 6,
  inner_veil_rift: 7,
  inner_cinder_lattice: 8,
  inner_gate_of_cinders: 8,
  center_cinder_gate: 10
};

const encounterDecksBySpaceId: Partial<Record<string, EncounterDecks>> = {
  "ashwake-crossing": {
    threat: ["smoke-leech-clutch", "cinder-veil-stalker"],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: []
  },
  "glassmere-spindle": {
    threat: ["glass-chime-swarm", "latchspire-raider"],
    anomaly: ["anomaly-glassmere", "anomaly-choir-static"],
    contract: [],
    artifact: [],
    escalation: []
  },
  "mirecoil-beacon": {
    threat: ["relay-husk", "slag-drone", "cinder-veil-stalker"],
    anomaly: [],
    contract: ["contract-beacon", "contract-lantern-run"],
    artifact: [],
    escalation: []
  },
  "hollow-veil-yard": {
    threat: ["grave-silt-press"],
    anomaly: [],
    contract: [],
    artifact: ["artifact-yard", "artifact-bell-votive"],
    escalation: []
  },
  "emberwatch-step": {
    threat: [],
    anomaly: [],
    contract: [],
    artifact: [],
    escalation: ["escalation-emberwatch", "escalation-ridge-suture"]
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
