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
    id: "outer_waymarket",
    name: "Waymarket",
    tier: "outer",
    index: 2,
    threatIcons: ["yellow"],
    textBox: {
      title: "Market Exchange",
      text: "If the stalls are calm, exchange salvage favors for a cool route, a contract lead, or gear gossip.",
      effectKey: "outer_waymarketExchange"
    },
    notes: "Market/exchange space for low-friction early decisions."
  },
  {
    id: "glassmere-spindle",
    name: "Glassmere Spindle",
    tier: "outer",
    index: 3,
    threatIcons: ["blue"],
    textBox: {
      title: "Spindle Chorus",
      text: "If no local threats remain, tune the spindle and gain a stable relay note.",
      effectKey: "outer_glassmereChorus"
    }
  },
  {
    id: "outer_relay_camp",
    name: "Relay Camp",
    tier: "outer",
    index: 4,
    threatIcons: ["blue"],
    textBox: {
      title: "Recruit Route Crew",
      text: "If the camp holds, recruit a route specialist or record a support contact.",
      effectKey: "outer_relayCrew"
    },
    notes: "Follower recruitment post."
  },
  {
    id: "mirecoil-beacon",
    name: "Mirecoil Beacon",
    tier: "outer",
    index: 5,
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
    id: "outer_salt_flats",
    name: "Void-Salt Flats",
    tier: "outer",
    index: 6,
    threatIcons: ["blue"],
    textBox: {
      title: "Salt Crossing",
      text: "If the flats are quiet, harvest void-salt for heat treatment or final-gate bargaining.",
      effectKey: "outer_saltCrossing"
    },
    notes: "Consumable salvage and bargaining-chip space."
  },
  {
    id: "hollow-veil-yard",
    name: "Hollow Veil Yard",
    tier: "outer",
    index: 7,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Salvage Sweep",
      text: "If the yard is quiet, salvage one workable gear piece from the stripped stacks.",
      effectKey: "outer_hollowVeilSweep"
    }
  },
  {
    id: "outer_surgery_tent",
    name: "Cinder Surgery",
    tier: "outer",
    index: 8,
    threatIcons: ["red"],
    textBox: {
      title: "Scar Treatment",
      text: "If the tent is secure, accept rough surgery: heal wounds, cool Heat, or leave with a darker mark.",
      effectKey: "outer_surgeryTreatment"
    },
    notes: "Scar treatment and surgery pressure point."
  },
  {
    id: "emberwatch-step",
    name: "Emberwatch Step",
    tier: "outer",
    index: 9,
    threatIcons: ["red", "blue"],
    textBox: {
      title: "Watch the Ridge",
      text: "If the line is clear, brace through the ridge and take one route note.",
      effectKey: "outer_emberwatchBrace"
    }
  },
  {
    id: "outer_oathpost",
    name: "Oathpost",
    tier: "outer",
    index: 10,
    threatIcons: ["red"],
    textBox: {
      title: "Faction Oath",
      text: "If no one contests the post, take a faction writ that can turn into a contract, aid, or rivalry mark.",
      effectKey: "outer_oathpostWrit"
    },
    notes: "Faction outpost and bounded-rivalry seed."
  },
  {
    id: "outer_broken_causeway",
    name: "Broken Causeway",
    tier: "outer",
    index: 11,
    threatIcons: ["yellow", "red"],
    movementBox: {
      title: "Risky Causeway",
      text: "This shortcut can reach the middle ring quickly, but entering it always ends movement.",
      effectKey: "movement_brokenCauseway"
    },
    textBox: {
      title: "High-Risk Shortcut",
      text: "If the causeway is clear, mark a dangerous shortcut toward Guardian Span.",
      effectKey: "outer_brokenCausewayShortcut"
    },
    notes: "High-risk shortcut toward the middle approach."
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
    id: "middle_relic_cache",
    name: "Artifact Cache",
    tier: "middle",
    index: 1,
    threatIcons: ["yellow"],
    textBox: {
      title: "Crack the Cache",
      text: "If the cache is secure, pull an artifact or salvage burden from the sealed reliquary.",
      effectKey: "middle_relicCache"
    },
    notes: "Artifact cache with salvage pressure."
  },
  {
    id: "middle_scar_surgery",
    name: "Scar Surgery",
    tier: "middle",
    index: 2,
    threatIcons: ["red", "blue"],
    textBox: {
      title: "Field Surgery",
      text: "If the operating pit is clear, heal a wound at the cost of Heat and a hard choice.",
      effectKey: "middle_scarSurgery"
    },
    notes: "Midgame recovery with risk."
  },
  {
    id: "middle_guardian_span",
    name: "Guardian Span",
    tier: "middle",
    index: 3,
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
    id: "middle_rivalry_pit",
    name: "Rivalry Pit",
    tier: "middle",
    index: 4,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Rival Claim",
      text: "If the pit is quiet, mark a bounded rivalry claim that can become aid, trade, or a duel invitation.",
      effectKey: "middle_rivalryClaim"
    },
    notes: "PvP/rivalry pressure point without default hard griefing."
  },
  {
    id: "middle_red_march_outpost",
    name: "Red March Outpost",
    tier: "middle",
    index: 5,
    threatIcons: ["red"],
    textBox: {
      title: "Outpost Bargain",
      text: "If the outpost accepts your proof, secure a gunner, guide, or military favor.",
      effectKey: "middle_redMarchBargain"
    },
    notes: "Faction outpost and follower source."
  },
  {
    id: "middle_webglass_breach",
    name: "Webglass Breach",
    tier: "middle",
    index: 6,
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
    id: "middle_anomaly_well",
    name: "Anomaly Well",
    tier: "middle",
    index: 7,
    threatIcons: ["blue", "yellow"],
    textBox: {
      title: "Read the Well",
      text: "If the well settles, resolve an anomaly and bottle a clue for the inner breach.",
      effectKey: "middle_anomalyWell"
    },
    notes: "Anomaly source that makes blue/yellow icons matter."
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
    id: "inner_tomb_gate",
    name: "Tomb Gate",
    tier: "inner",
    index: 1,
    threatIcons: [],
    textBox: {
      title: "Gatekeeper Trial",
      text: "Force a tomb-gate trial to earn passage, but the gate remembers every failed answer.",
      effectKey: "inner_tombGateTrial"
    },
    notes: "Gatekeeper trial."
  },
  {
    id: "inner_cinder_lattice",
    name: "Cinder Lattice",
    tier: "inner",
    index: 2,
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
    id: "inner_blackstar_shortcut",
    name: "Blackstar Cut",
    tier: "inner",
    index: 3,
    threatIcons: [],
    textBox: {
      title: "Blackstar Shortcut",
      text: "Take the dangerous cut across starless ground to skip the long route, if your nerve holds.",
      effectKey: "inner_blackstarShortcut"
    },
    notes: "High-risk inner shortcut."
  },
  {
    id: "inner_choir_shrine",
    name: "Choir Shrine",
    tier: "inner",
    index: 4,
    threatIcons: [],
    textBox: {
      title: "Corrupted Shrine",
      text: "Petition the corrupted shrine for a blessing, a curse, or a gate artifact omen.",
      effectKey: "inner_choirShrine"
    },
    notes: "Corrupted shrine and cursed artifact source."
  },
  {
    id: "inner_gate_of_cinders",
    name: "Gate of Cinders",
    tier: "inner",
    index: 5,
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
