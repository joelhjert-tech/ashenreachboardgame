import type { Stat } from "../schema/character.schema.js";

export type ThreatIcon = "red" | "blue" | "yellow";
export type BoardTier = "outer" | "middle" | "inner" | "center";

export interface MovementBoxDefinition {
  title: string;
  text: string;
  effectKey: string;
}

export interface TextBoxChoice {
  id: string;
  label: string;
}

export interface TextBoxDefinition {
  title: string;
  text: string;
  effectKey: string;
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
      effectKey: "outer_ashwakeClearLane",
      test: {
        stats: ["guile"],
        difficulty: 6
      }
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
      effectKey: "outer_glassmereChorus",
      test: {
        stats: ["signal"],
        difficulty: 7
      }
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
      effectKey: "outer_mirecoilTraffic",
      test: {
        stats: ["signal", "forge"],
        difficulty: 8
      }
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
      effectKey: "outer_hollowVeilSweep",
      test: {
        stats: ["forge", "guile"],
        difficulty: 7
      }
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
      effectKey: "outer_emberwatchBrace",
      test: {
        stats: ["grit"],
        difficulty: 8
      }
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
      text: "If no hostiles remain, press the locals for passage stock or field gossip.",
      effectKey: "middle_shardSprawlBargain",
      test: {
        stats: ["command", "guile"],
        difficulty: 8
      }
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
      text: "This is the only legal staging point into the inner breach. If you hold a key artifact, you may line up entry.",
      effectKey: "middle_guardianSpanThreshold"
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
      text: "If the breach is clear, reroute through a hidden lane or draw unwanted attention.",
      effectKey: "middle_webglassFracture",
      test: {
        stats: ["guile", "signal"],
        difficulty: 9
      }
    }
  },
  {
    id: "inner_veil_rift",
    name: "Veil Rift",
    tier: "inner",
    index: 0,
    threatIcons: [],
    textBox: {
      title: "Breach Entry",
      text: "Movement stops here on entry. During engagement, press deeper based on the breach surge and your committed resources.",
      effectKey: "inner_veilRiftEntry"
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
      text: "The lattice always resolves as printed text in the inner tier.",
      effectKey: "inner_cinderLatticeTrial",
      test: {
        stats: ["guile", "signal"],
        difficulty: 10
      }
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
      text: "Choose your best approach and force entry into the core chamber.",
      effectKey: "inner_gateOfCindersTrial",
      test: {
        stats: ["grit", "signal", "guile"],
        difficulty: 12
      }
    }
  },
  {
    id: "center_cinder_gate",
    name: "The Cinder Gate",
    tier: "center",
    index: 0,
    threatIcons: [],
    textBox: {
      title: "Confrontation",
      text: "Resolve the active scenario confrontation at the core chamber.",
      effectKey: "center_resolveScenarioConfrontation"
    },
    notes: "Center endgame space controlled by scenario data."
  }
];

const boardSpaceIndex = new Map(BOARD_SPACES.map((space) => [space.id, space] as const));

export function getBoardSpace(spaceId: string): BoardSpaceDefinition | null {
  return boardSpaceIndex.get(spaceId) ?? null;
}
