import type { Stat } from "../schema/character.schema.js";

export type ThreatIcon = "red" | "blue" | "yellow";
export type BoardTier = "outer" | "middle" | "inner" | "center";

export interface MovementBoxDefinition {
  title: string;
  text: string;
  effectKey: string;
}

export interface MovementRequirementDefinition {
  allowedFrom?: string[];
  requiredNotes?: string[];
  errorMessage: string;
}

export interface TextBoxChoice {
  id: string;
  label: string;
}

export interface TextBoxDefinition {
  title: string;
  text: string;
  effectKey: string;
  intent?: "resolve-space-text" | "scenario-confrontation";
  choices?: TextBoxChoice[];
  test?: {
    stats: Stat[];
    difficulty: number;
  };
}

export interface BoardSpaceDefinition {
  id: string;
  name: string;
  tier: BoardTier;
  index: number;
  threatIcons: ThreatIcon[];
  movementBox?: MovementBoxDefinition;
  movementRequirements?: MovementRequirementDefinition[];
  textBox: TextBoxDefinition;
  notes?: string;
}

export const BOARD_SPACES: BoardSpaceDefinition[] = [
  {
    id: "outer_ember_sanctum",
    name: "Ember Sanctum",
    tier: "outer",
    index: 0,
    threatIcons: [],
    textBox: {
      title: "Sanctum Rest",
      text: "Recover 1 wound. You may also clear one active Heat mark from a recalled or strained operative record.",
      effectKey: "outer_emberSanctumRest"
    },
    notes: "Original Ashen Reach equivalent of the mandatory respawn sanctuary."
  },
  {
    id: "ashwake-crossing",
    name: "Ashwake Crossing",
    tier: "outer",
    index: 1,
    threatIcons: ["yellow"],
    textBox: {
      title: "Clear Lane",
      text: "If the crossing is clear, mark your route and gain a scouting note.",
      effectKey: "outer_ashwakeClearLane"
    }
  },
  {
    id: "glassmere-spindle",
    name: "Glassmere Spindle",
    tier: "outer",
    index: 2,
    threatIcons: ["blue"],
    textBox: {
      title: "Spindle Chorus",
      text: "If no local threats remain, tune the spindle and gain a stable relay note.",
      effectKey: "outer_glassmereChorus"
    }
  },
  {
    id: "mirecoil-beacon",
    name: "Mirecoil Beacon",
    tier: "outer",
    index: 3,
    threatIcons: ["yellow", "blue"],
    textBox: {
      title: "Beacon Traffic",
      text: "If the beacon lane is secure, collect one new contract lead from the mast traffic.",
      effectKey: "outer_mirecoilTraffic"
    },
    movementBox: {
      title: "Beacon Route",
      text: "When you start movement here, you may reroute through a marked outer lane. Entering a new tier ends movement immediately.",
      effectKey: "movement_beaconRoute"
    }
  },
  {
    id: "hollow-veil-yard",
    name: "Hollow Veil Yard",
    tier: "outer",
    index: 4,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Salvage Sweep",
      text: "If the yard is quiet, salvage one workable gear piece from the stripped stacks.",
      effectKey: "outer_hollowVeilSweep"
    }
  },
  {
    id: "emberwatch-step",
    name: "Emberwatch Step",
    tier: "outer",
    index: 5,
    threatIcons: ["red", "blue"],
    textBox: {
      title: "Watch the Ridge",
      text: "If the line is clear, brace through the ridge and take one route note.",
      effectKey: "outer_emberwatchBrace"
    }
  },
  {
    id: "middle_shard_sprawl",
    name: "Shard Sprawl",
    tier: "middle",
    index: 0,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Hard Bargain",
      text: "If no hostiles remain, choose whether to press the locals for passage stock or for field gossip.",
      effectKey: "middle_shardSprawlBargain",
      choices: [
        {
          id: "stock",
          label: "Take passage stock"
        },
        {
          id: "gossip",
          label: "Press for gossip"
        }
      ]
    }
  },
  {
    id: "middle_guardian_span",
    name: "Guardian Span",
    tier: "middle",
    index: 1,
    threatIcons: ["red", "blue", "yellow"],
    textBox: {
      title: "Threshold Check",
      text: "This is the only legal staging point into the inner breach. Choose whether to align the threshold seals directly or ghost a route marker through the span.",
      effectKey: "middle_guardianSpanThreshold",
      choices: [
        {
          id: "seal-alignment",
          label: "Align the threshold seals"
        },
        {
          id: "ghost-marker",
          label: "Ghost a route marker"
        }
      ]
    },
    movementBox: {
      title: "Threshold Hold",
      text: "When you enter this span, movement ends immediately.",
      effectKey: "movement_thresholdHold"
    },
    notes: "Original Ashen Reach equivalent of the mandatory inner-tier gatekeeper."
  },
  {
    id: "middle_webglass_breach",
    name: "Webglass Breach",
    tier: "middle",
    index: 2,
    threatIcons: ["yellow", "blue"],
    textBox: {
      title: "Fracture Path",
      text: "If the breach is clear, choose whether to slip through a hidden lane or splice the relay seam into a mapped route.",
      effectKey: "middle_webglassFracture",
      choices: [
        {
          id: "hidden-lane",
          label: "Slip the hidden lane"
        },
        {
          id: "relay-splice",
          label: "Splice the relay seam"
        }
      ]
    }
  },
  {
    id: "inner_veil_rift",
    name: "Veil Rift",
    tier: "inner",
    index: 0,
    threatIcons: [],
    movementRequirements: [
      {
        allowedFrom: ["middle_guardian_span"],
        requiredNotes: ["guardian-span-clearance"],
        errorMessage: "Resolve Guardian Span before entering the inner breach"
      }
    ],
    textBox: {
      title: "Breach Entry",
      text: "Choose whether to anchor the surge through the rift or slip the fold for a quieter breach line.",
      effectKey: "inner_veilRiftEntry",
      choices: [
        {
          id: "anchor-surge",
          label: "Anchor the surge"
        },
        {
          id: "slip-fold",
          label: "Slip the fold"
        }
      ]
    },
    notes: "Original Ashen Reach equivalent of the first inner-tier breach space."
  },
  {
    id: "inner_cinder_lattice",
    name: "Cinder Lattice",
    tier: "inner",
    index: 1,
    threatIcons: [],
    textBox: {
      title: "Lattice Trial",
      text: "Choose whether to trace the ember pulses or read the ghost angles to line up the final approach.",
      effectKey: "inner_cinderLatticeTrial",
      choices: [
        {
          id: "trace-embers",
          label: "Trace the ember pulses"
        },
        {
          id: "ghost-angles",
          label: "Read the ghost angles"
        }
      ]
    }
  },
  {
    id: "inner_gate_of_cinders",
    name: "Gate of Cinders",
    tier: "inner",
    index: 2,
    threatIcons: [],
    textBox: {
      title: "Final Gate",
      text: "Choose whether to force the cinder locks by endurance, relay timing, or a ghost-path through the last breach.",
      effectKey: "inner_gateOfCindersTrial",
      choices: [
        {
          id: "brace-locks",
          label: "Brace the cinder locks"
        },
        {
          id: "time-relays",
          label: "Time the relay pulse"
        },
        {
          id: "ghost-path",
          label: "Ghost the last breach path"
        }
      ]
    }
  },
  {
    id: "center_cinder_gate",
    name: "The Cinder Gate",
    tier: "center",
    index: 0,
    threatIcons: [],
    movementRequirements: [
      {
        allowedFrom: ["inner_gate_of_cinders"],
        errorMessage: "Only the Gate of Cinders opens the final route into the core chamber"
      },
      {
        requiredNotes: ["gate-of-cinders-breached"],
        errorMessage: "Resolve the Gate of Cinders before entering the Cinder Gate"
      }
    ],
    textBox: {
      title: "Confrontation",
      text: "Resolve the active scenario confrontation at the core chamber.",
      effectKey: "center_resolveScenarioConfrontation",
      intent: "scenario-confrontation"
    },
    notes: "Center endgame space controlled by scenario data."
  }
];

const boardSpaceIndex = new Map(BOARD_SPACES.map((space) => [space.id, space] as const));

export function getBoardSpace(spaceId: string): BoardSpaceDefinition | null {
  return boardSpaceIndex.get(spaceId) ?? null;
}

export function isScenarioConfrontationSpace(spaceId: string): boolean {
  return getBoardSpace(spaceId)?.textBox.intent === "scenario-confrontation";
}
