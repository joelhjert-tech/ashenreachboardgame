import type { Stat } from "../schema/character.schema.js";

export type ThreatIcon = "red" | "blue" | "yellow";
export type BoardTier = "outer" | "middle" | "inner" | "center";
export type BoardSpaceTag =
  | "shop"
  | "crossroads"
  | "salvage"
  | "hazard"
  | "shrine"
  | "anomaly"
  | "contract"
  | "recovery"
  | "enemy"
  | "artifact"
  | "movement"
  | "scenario"
  | "lore"
  | "risk-shop"
  | "nemesis";

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
  tags: BoardSpaceTag[];
  threatIcons: ThreatIcon[];
  ruleText: string;
  loreText: string;
  movementBox?: MovementBoxDefinition;
  movementRequirements?: MovementRequirementDefinition[];
  textBox: TextBoxDefinition;
  notes?: string;
}

type BoardSpacePresentation = Pick<BoardSpaceDefinition, "tags" | "ruleText" | "loreText">;
type AuthoredBoardSpaceDefinition = Omit<BoardSpaceDefinition, keyof BoardSpacePresentation>;

const RAW_BOARD_SPACES: AuthoredBoardSpaceDefinition[] = [
  {
    id: "outer_ember_sanctum",
    name: "Pilgrim Lock Gate",
    tier: "outer",
    index: 0,
    threatIcons: [],
    textBox: {
      title: "Pilgrim Rest",
      text: "If the lock is quiet, heal 1 Wound.",
      effectKey: "outer_emberSanctumRest"
    },
    notes: "Starter shrine and recovery space on the Broken Perimeter."
  },
  {
    id: "ashwake-crossing",
    name: "Ashwalk Bridge",
    tier: "outer",
    index: 1,
    threatIcons: ["yellow"],
    textBox: {
      title: "Hold the Bridge",
      text: "If the bridge is clear, mark your route and gain a scouting note before the ash wind returns.",
      effectKey: "outer_ashwakeClearLane"
    }
  },
  {
    id: "outer_waymarket",
    name: "Anchor Market",
    tier: "outer",
    index: 2,
    threatIcons: ["yellow"],
    textBox: {
      title: "Market Exchange",
      text: "If the stalls are calm, reveal 2-6 random Equipment options, buy 1, or trade salvage favors for a contract lead.",
      effectKey: "outer_waymarketExchange"
    },
    notes: "Market/exchange space for low-friction early decisions."
  },
  {
    id: "glassmere-spindle",
    name: "Glass Signal Pier",
    tier: "outer",
    index: 3,
    threatIcons: ["blue"],
    textBox: {
      title: "Signal Chorus",
      text: "If no local threats remain, test Signal to tune the pier and recruit its mapper.",
      effectKey: "outer_glassmereChorus"
    }
  },
  {
    id: "outer_relay_camp",
    name: "Lantern Post 47",
    tier: "outer",
    index: 4,
    threatIcons: ["blue"],
    textBox: {
      title: "Lantern Watch",
      text: "If the post holds, test Command to recruit a support contact from the route crew.",
      effectKey: "outer_relayCrew"
    },
    notes: "Follower recruitment post."
  },
  {
    id: "mirecoil-beacon",
    name: "Rusted Transit Gate",
    tier: "outer",
    index: 5,
    threatIcons: ["yellow", "blue"],
    textBox: {
      title: "Transit Traffic",
      text: "If the gate lane is secure, collect one new contract lead and mark a route toward the war line.",
      effectKey: "outer_mirecoilTraffic"
    },
    movementBox: {
      title: "Transit Route",
      text: "When you start movement here, you may reroute through a marked outer lane. Entering a new tier ends movement immediately.",
      effectKey: "movement_beaconRoute"
    }
  },
  {
    id: "outer_salt_flats",
    name: "Mire Vent Colony",
    tier: "outer",
    index: 6,
    threatIcons: ["blue"],
    textBox: {
      title: "Vent Harvest",
      text: "If the colony is quiet, test Forge to harvest void-salt and recruit its bone-reader.",
      effectKey: "outer_saltCrossing"
    },
    notes: "Consumable salvage and bargaining-chip space."
  },
  {
    id: "hollow-veil-yard",
    name: "Fallen Hab-Stack",
    tier: "outer",
    index: 7,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Hab-Stack Sweep",
      text: "If the stack is quiet, test Forge to recover one coffin rig from the collapsed floors.",
      effectKey: "outer_hollowVeilSweep"
    }
  },
  {
    id: "outer_surgery_tent",
    name: "Old Mercy Bay",
    tier: "outer",
    index: 8,
    threatIcons: ["red"],
    textBox: {
      title: "Rough Treatment",
      text: "If the bay is secure, pay salvage to heal wounds, treat Scars, or leave with a darker mark.",
      effectKey: "outer_surgeryTreatment"
    },
    notes: "Scar treatment and surgery pressure point."
  },
  {
    id: "emberwatch-step",
    name: "Ember Stair",
    tier: "outer",
    index: 9,
    threatIcons: ["red", "blue"],
    textBox: {
      title: "Climb the Stair",
      text: "If the stair is clear, brace through the furnace ridge and take one route note.",
      effectKey: "outer_emberwatchBrace"
    }
  },
  {
    id: "outer_oathpost",
    name: "Broken Census Hall",
    tier: "outer",
    index: 10,
    threatIcons: ["red"],
    textBox: {
      title: "Census Writ",
      text: "If no one contests the hall, test Command to claim a faction writ, recruit its witness, and draw a Contract lead.",
      effectKey: "outer_oathpostWrit"
    },
    notes: "Faction outpost and bounded-rivalry seed."
  },
  {
    id: "outer_broken_causeway",
    name: "Dock Nine Wreckage",
    tier: "outer",
    index: 11,
    threatIcons: ["yellow", "red"],
    movementBox: {
      title: "Wreckage Route",
      text: "This shortcut can reach the middle ring quickly, but entering it always ends movement.",
      effectKey: "movement_brokenCauseway"
    },
    textBox: {
      title: "Wreckage Sweep",
      text: "If the dock is clear, test Grit through the wreckage and mark a dangerous shortcut toward the war line.",
      effectKey: "outer_brokenCausewayShortcut"
    },
    notes: "High-risk shortcut toward the middle approach."
  },
  {
    id: "votive-engine-room",
    name: "Votive Engine Room",
    tier: "outer",
    index: 12,
    threatIcons: ["blue"],
    textBox: {
      title: "Read the Votive Salt",
      text: "If the engine room is quiet, test Forge to read the void-salt bloom and recruit its bone-reader.",
      effectKey: "outer_saltCrossing"
    },
    notes: "Outer salvage-shrine space that feeds gear and risk choices."
  },
  {
    id: "kettleward-foundry",
    name: "Kettleward Foundry",
    tier: "outer",
    index: 13,
    threatIcons: ["yellow"],
    textBox: {
      title: "Foundry Bargain",
      text: "If the foundry is calm, test Guile to work its exchange and recruit a Black Lantern broker.",
      effectKey: "outer_waymarketExchange"
    },
    notes: "Outer shop/repair space and a route into the Rusted Host line."
  },
  {
    id: "north-dock-bastion",
    name: "North Dock Bastion",
    tier: "outer",
    index: 14,
    threatIcons: ["yellow"],
    textBox: {
      title: "Bastion Watch",
      text: "If the bastion is clear, test Command to recruit a route contact from the dock watch.",
      effectKey: "outer_relayCrew"
    },
    notes: "Playable northwest corner space on the Broken Perimeter."
  },
  {
    id: "coldwind-wharf",
    name: "Coldwind Wharf",
    tier: "outer",
    index: 15,
    threatIcons: ["blue"],
    textBox: {
      title: "Cold Dock Signal",
      text: "If the wharf is quiet, test Signal to tune the beacon and recruit its mapper.",
      effectKey: "outer_glassmereChorus"
    },
    notes: "Outer dock lane that previews anomaly pressure."
  },
  {
    id: "cinder-fields",
    name: "Cinder Fields",
    tier: "outer",
    index: 16,
    threatIcons: ["red"],
    textBox: {
      title: "Cinder Sweep",
      text: "If the fields are clear, brace through the burning rows and take one route note.",
      effectKey: "outer_emberwatchBrace"
    },
    notes: "Outer combat-warning lane near the pilgrim gate."
  },
  {
    id: "colony-outskirts",
    name: "Colony Outskirts",
    tier: "outer",
    index: 17,
    threatIcons: ["yellow"],
    textBox: {
      title: "Outskirts Sweep",
      text: "If the outskirts are clear, salvage one workable route supply from abandoned colony stores.",
      effectKey: "outer_hollowVeilSweep"
    },
    notes: "Outer salvage lane on the eastern perimeter."
  },
  {
    id: "deadwater-marsh",
    name: "Deadwater Marsh",
    tier: "outer",
    index: 18,
    threatIcons: ["blue"],
    textBox: {
      title: "Deadwater Reading",
      text: "If the marsh is calm, test Forge to harvest void-salt and recruit its bone-reader.",
      effectKey: "outer_saltCrossing"
    },
    notes: "Outer anomaly wetland on the eastern perimeter."
  },
  {
    id: "rustveil-yard",
    name: "Rustveil Yard",
    tier: "outer",
    index: 19,
    threatIcons: ["yellow"],
    textBox: {
      title: "Rustveil Salvage",
      text: "If the yard is quiet, test Forge to recover one coffin rig from the wreckage.",
      effectKey: "outer_hollowVeilSweep"
    },
    notes: "Outer salvage tile on the lower perimeter."
  },
  {
    id: "sunken-pier",
    name: "Sunken Pier",
    tier: "outer",
    index: 20,
    threatIcons: ["blue"],
    textBox: {
      title: "Sunken Signal",
      text: "If the pier is clear, test Command to recruit a support contact from the drowned route crew.",
      effectKey: "outer_relayCrew"
    },
    notes: "Outer waterline tile for route scouting."
  },
  {
    id: "shattered-causeway",
    name: "Shattered Causeway",
    tier: "outer",
    index: 21,
    threatIcons: ["yellow"],
    movementBox: {
      title: "Broken Route",
      text: "This causeway can bend movement around the perimeter, but entering a new tier ends movement immediately.",
      effectKey: "movement_brokenCauseway"
    },
    textBox: {
      title: "Causeway Thread",
      text: "If the causeway is clear, test Grit through the broken route and mark a risky shortcut.",
      effectKey: "outer_brokenCausewayShortcut"
    },
    notes: "Outer lower-track movement tile."
  },
  {
    id: "flooded-locks",
    name: "Flooded Locks",
    tier: "outer",
    index: 22,
    threatIcons: ["blue"],
    textBox: {
      title: "Flooded Lockwork",
      text: "If the locks are calm, test Signal to tune the lockwater and recruit its mapper.",
      effectKey: "outer_glassmereChorus"
    },
    notes: "Outer western water-control tile."
  },
  {
    id: "transit-gate",
    name: "Transit Gate",
    tier: "outer",
    index: 23,
    threatIcons: ["blue"],
    movementBox: {
      title: "Transit Gate",
      text: "When you start movement here, you may route toward the Customs Gate. Entering a new tier ends movement immediately.",
      effectKey: "movement_beaconRoute"
    },
    textBox: {
      title: "Gate Dispatch",
      text: "If the transit gate is secure, collect one contract lead and mark a route toward the War Choir Line.",
      effectKey: "outer_mirecoilTraffic"
    },
    notes: "Outer-to-middle transition point."
  },
  {
    id: "middle_shard_sprawl",
    name: "Chain-Maul Yard",
    tier: "middle",
    index: 0,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Yard Bargain",
      text: "If no hostiles remain, choose whether to press the salvage crews for passage stock or field gossip.",
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
    name: "Crucible of Names",
    tier: "middle",
    index: 1,
    threatIcons: ["yellow"],
    textBox: {
      title: "Name the Trophy",
      text: "If the crucible is secure, test Guile to mark an Artifact claim; failure opens a Machine Scar choice.",
      effectKey: "middle_relicCache"
    },
    notes: "Artifact cache with salvage pressure."
  },
  {
    id: "middle_scar_surgery",
    name: "Sable Machine Choir",
    tier: "middle",
    index: 2,
    threatIcons: ["red", "blue"],
    textBox: {
      title: "Machine Hymn",
      text: "If the choir is clear, test Forge to heal 1 Wound; failure opens a Flesh Scar choice.",
      effectKey: "middle_scarSurgery"
    },
    notes: "Midgame recovery with risk."
  },
  {
    id: "middle_guardian_span",
    name: "Customs Gate",
    tier: "middle",
    index: 3,
    threatIcons: ["red", "blue", "yellow"],
    textBox: {
      title: "Customs Threshold",
      text: "Align the threshold seals with Command or ghost a route marker with Signal to gain Guardian Span Clearance.",
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
      title: "Customs Hold",
      text: "When you enter this span, movement ends immediately.",
      effectKey: "movement_thresholdHold"
    },
    notes: "Middle-ring customs gate and default inner-tier gatekeeper."
  },
  {
    id: "middle_rivalry_pit",
    name: "Mirror Barracks",
    tier: "middle",
    index: 4,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Mirror Drill",
      text: "If the barracks are quiet, test Command to mark a bounded claim and recruit a fixer.",
      effectKey: "middle_rivalryClaim"
    },
    notes: "PvP/rivalry pressure point without default hard griefing."
  },
  {
    id: "middle_red_march_outpost",
    name: "Choir Bastion",
    tier: "middle",
    index: 5,
    threatIcons: ["red"],
    textBox: {
      title: "Bastion Bargain",
      text: "If the bastion accepts your proof, secure a gunner, guide, or military favor from the Ashen Choir line.",
      effectKey: "middle_redMarchBargain"
    },
    notes: "Faction outpost and follower source."
  },
  {
    id: "middle_webglass_breach",
    name: "Grave-Rail Junction",
    tier: "middle",
    index: 6,
    threatIcons: ["yellow", "blue"],
    textBox: {
      title: "Rail Fracture",
      text: "If the junction is clear, choose whether to ride a ghost rail or splice the relay seam into a mapped route.",
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
    name: "Static Chapel",
    tier: "middle",
    index: 7,
    threatIcons: ["blue", "yellow"],
    textBox: {
      title: "Read the Chapel",
      text: "If the chapel settles, test Signal to read the anomaly and bottle a clue for the inner breach.",
      effectKey: "middle_anomalyWell"
    },
    notes: "Anomaly source that makes blue/yellow icons matter."
  },
  {
    id: "black-relay-spire",
    name: "Black Relay Spire",
    tier: "middle",
    index: 8,
    threatIcons: ["blue", "yellow"],
    textBox: {
      title: "Stabilize the Relay",
      text: "If the relay is clear, test Signal to read the anomaly and bottle a clue for the inner breach.",
      effectKey: "middle_anomalyWell"
    },
    notes: "Persistent anomaly pressure point on the War Choir Line."
  },
  {
    id: "the-salt-archive",
    name: "The Salt Archive",
    tier: "middle",
    index: 9,
    threatIcons: ["yellow"],
    textBox: {
      title: "Archive Bargain",
      text: "If the archive opens, choose passage stock or field gossip and resolve the matching test.",
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
    },
    notes: "Middle lore and contract hub."
  },
  {
    id: "red-lantern-trenches",
    name: "Red Lantern Trenches",
    tier: "middle",
    index: 10,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Trench Claim",
      text: "If the trench lamps are clear, test Command to mark a bounded claim and recruit a fixer.",
      effectKey: "middle_rivalryClaim"
    },
    notes: "Middle hostile-contact lane where red threats should feel like warband pressure."
  },
  {
    id: "weeping-ammunition-shrine",
    name: "Weeping Ammunition Shrine",
    tier: "middle",
    index: 11,
    threatIcons: ["red", "blue"],
    textBox: {
      title: "Shrine Bargain",
      text: "If the shrine is quiet, test Command to secure a military favor and recruit a votive gunner.",
      effectKey: "middle_redMarchBargain"
    },
    notes: "Dangerous shop that trades firepower for exposure."
  },
  {
    id: "scorched-road",
    name: "Scorched Road",
    tier: "middle",
    index: 12,
    threatIcons: ["yellow"],
    textBox: {
      title: "Scorched Passage",
      text: "If the road is clear, mark a dangerous route note before the ash gale returns.",
      effectKey: "outer_ashwakeClearLane"
    },
    notes: "Middle-ring route pressure tile."
  },
  {
    id: "blastworks",
    name: "Blastworks",
    tier: "middle",
    index: 13,
    threatIcons: ["red"],
    textBox: {
      title: "Blastworks Toll",
      text: "If the works are clear, choose whether to take passage stock or press for field gossip.",
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
    },
    notes: "Middle industrial war-line tile."
  },
  {
    id: "ashen-chapel",
    name: "Ashen Chapel",
    tier: "middle",
    index: 14,
    threatIcons: ["blue"],
    textBox: {
      title: "Ashen Rite",
      text: "If the chapel settles, resolve an anomaly and bottle a clue for the inner breach.",
      effectKey: "middle_anomalyWell"
    },
    notes: "Middle anomaly shrine tile."
  },
  {
    id: "reavers-den",
    name: "Reaver's Den",
    tier: "middle",
    index: 15,
    threatIcons: ["red"],
    textBox: {
      title: "Den Challenge",
      text: "If the den is cleared, secure a military favor from the Ashen Choir line.",
      effectKey: "middle_redMarchBargain"
    },
    notes: "Middle enemy pressure tile."
  },
  {
    id: "inner_veil_rift",
    name: "Melted Gate",
    tier: "inner",
    index: 0,
    threatIcons: [],
    movementRequirements: [
      {
        allowedFrom: ["middle_guardian_span"],
        requiredNotes: ["guardian-span-clearance"],
        errorMessage: "Requires Guardian Span Clearance"
      }
    ],
    textBox: {
      title: "Three-Ash Entry",
      text: "Choose whether to anchor the surge through the gate or slip the fold for a quieter breach line.",
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
    notes: "First inner-tier relic gate."
  },
  {
    id: "inner_tomb_gate",
    name: "Rifted Approach",
    tier: "inner",
    index: 1,
    threatIcons: [],
    textBox: {
      title: "Marshal's Road",
      text: "Test Command against the grave route. Success records its answer; failure inflicts 1 Wound.",
      effectKey: "inner_tombGateTrial"
    },
    notes: "Gatekeeper trial."
  },
  {
    id: "inner_cinder_lattice",
    name: "The Crownless Observatory",
    tier: "inner",
    index: 2,
    threatIcons: [],
    textBox: {
      title: "Observatory Trial",
      text: "Choose whether to trace the star pulses or read the ghost angles to line up the final approach.",
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
    name: "Dead Star Reliquary",
    tier: "inner",
    index: 3,
    threatIcons: [],
    textBox: {
      title: "Dead Star Claim",
      text: "Test Guile to cross the dead-star route and reveal an Artifact omen; failure inflicts 1 Wound.",
      effectKey: "inner_blackstarShortcut"
    },
    notes: "High-risk inner shortcut."
  },
  {
    id: "inner_choir_shrine",
    name: "Saint Engine Crypt",
    tier: "inner",
    index: 4,
    threatIcons: [],
    textBox: {
      title: "Crypt Petition",
      text: "Test Signal to petition the Saint Engine for an Artifact omen; failure opens a Rift Scar choice.",
      effectKey: "inner_choirShrine"
    },
    notes: "Corrupted shrine and cursed artifact source."
  },
  {
    id: "inner_gate_of_cinders",
    name: "The Last Signal Well",
    tier: "inner",
    index: 5,
    threatIcons: [],
    textBox: {
      title: "Last Signal",
      text: "Choose whether to force the last signal by endurance, relay timing, or a ghost-path through the final breach.",
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
    id: "the-bone-meridian",
    name: "The Bone Meridian",
    tier: "inner",
    index: 6,
    threatIcons: ["red", "yellow"],
    textBox: {
      title: "Meridian Trial",
      text: "Test Command against the grave route. Success records its answer; failure inflicts 1 Wound.",
      effectKey: "inner_tombGateTrial"
    },
    notes: "Inner hazard that taxes gear and trophy hoards."
  },
  {
    id: "choir-execution-court",
    name: "Hollow Court",
    tier: "inner",
    index: 7,
    threatIcons: ["red", "red", "yellow"],
    textBox: {
      title: "Court Petition",
      text: "Test Signal to petition the Hollow Court. Success grants a dangerous blessing; failure draws a Rift Scar choice.",
      effectKey: "inner_choirShrine"
    },
    notes: "Inner elite-enemy court and Choir pressure space."
  },
  {
    id: "center_cinder_gate",
    name: "The Ashen Reach Core",
    tier: "center",
    index: 0,
    threatIcons: [],
    movementRequirements: [
      {
        allowedFrom: ["inner_gate_of_cinders", "inner_blackstar_shortcut"],
        errorMessage: "Enter the Core from the Last Signal Well or Dead Star Reliquary"
      },
      {
        requiredNotes: ["gate-of-cinders-breached"],
        errorMessage: "Breach the Gate of Cinders first"
      }
    ],
    textBox: {
      title: "Final Scenario",
      text: "Resolve the active scenario confrontation at the Ashen Reach Core.",
      effectKey: "center_resolveScenarioConfrontation",
      intent: "scenario-confrontation"
    },
    notes: "Center endgame space controlled by scenario data."
  }
];

const BOARD_SPACE_PRESENTATION: Record<string, BoardSpacePresentation> = {
  "north-dock-bastion": {
    tags: ["crossroads", "salvage", "lore"],
    ruleText: "If clear, test Command to recruit a route contact from the dock watch.",
    loreText: "North Dock Bastion anchors the northwest corner with salt-worn guns and old signal flags."
  },
  outer_ember_sanctum: {
    tags: ["shrine", "recovery", "contract"],
    ruleText: "If no threats are present, heal 1 Wound.",
    loreText: "Pilgrims chain brass prayers to a cracked gate that still opens for the wounded."
  },
  "ashwake-crossing": {
    tags: ["hazard", "crossroads"],
    ruleText: "If the bridge is clear, gain a route note and hold the ash line.",
    loreText: "A scorched bridge leans over the perimeter gap, bright with furnace wind and old warning lamps."
  },
  outer_waymarket: {
    tags: ["shop", "crossroads"],
    ruleText: "If no threats are present, buy Equipment, sell Gear, or reserve a contract lead.",
    loreText: "A bazaar of sealed crates, oath-brokers, and weapons that still remember previous owners."
  },
  "coldwind-wharf": {
    tags: ["anomaly", "crossroads"],
    ruleText: "If clear, test Signal to tune the beacon and recruit its mapper.",
    loreText: "Coldwind Wharf freezes signal bells in place while blue-white sparks crawl over the moorings."
  },
  "glassmere-spindle": {
    tags: ["anomaly", "crossroads"],
    ruleText: "Draw blue pressure. If clear, test Signal to recruit the pier mapper.",
    loreText: "Signal pylons sing over glass water while cold blue light crawls through the pier cables."
  },
  outer_relay_camp: {
    tags: ["crossroads", "lore"],
    ruleText: "If clear, test Command to recruit a route contact.",
    loreText: "Lantern Post 47 keeps a tired watch over the routes no map wants to admit still exist."
  },
  "cinder-fields": {
    tags: ["enemy", "hazard"],
    ruleText: "If clear, brace through the burning rows and take one route note.",
    loreText: "Cinder Fields smolder under low black clouds, each furrow bright with buried furnace glass."
  },
  "mirecoil-beacon": {
    tags: ["movement", "contract", "crossroads"],
    ruleText: "If clear, draw a contract lead. Movement from here may reroute through an outer lane.",
    loreText: "The transit gate coughs rust and signal sparks, still trying to dispatch trains into a dead timetable."
  },
  outer_salt_flats: {
    tags: ["anomaly", "hazard", "salvage"],
    ruleText: "Draw blue pressure. If clear, test Forge to harvest void-salt and recruit its bone-reader.",
    loreText: "Toxic vents breathe green fire through mud, tents, and half-buried colony bells."
  },
  "colony-outskirts": {
    tags: ["salvage", "crossroads"],
    ruleText: "If clear, salvage field equipment from abandoned colony stores.",
    loreText: "Colony Outskirts are all cold cookfires, sealed doors, and hand-painted evacuation arrows."
  },
  "deadwater-marsh": {
    tags: ["anomaly", "hazard"],
    ruleText: "If clear, test Forge to harvest void-salt and recruit its bone-reader.",
    loreText: "Deadwater Marsh reflects a sky the Reach has not had for years."
  },
  "hollow-veil-yard": {
    tags: ["salvage", "enemy"],
    ruleText: "Draw red and yellow pressure. If clear, test Forge to recover a coffin rig.",
    loreText: "A fallen hab-stack spills iron ribs, broken altars, and stairwells full of watching ash."
  },
  outer_surgery_tent: {
    tags: ["recovery", "risk-shop"],
    ruleText: "If no threats are present, pay salvage to heal, treat Scars, or risk surgery.",
    loreText: "Old Mercy Bay trades pain for function under lamps made from scavenged saint-glass."
  },
  "rustveil-yard": {
    tags: ["salvage", "crossroads"],
    ruleText: "If clear, test Forge to recover a coffin rig from the wreckage.",
    loreText: "Rustveil Yard buries machine bones under orange dust and salvage tags."
  },
  "sunken-pier": {
    tags: ["anomaly", "lore"],
    ruleText: "If clear, test Command to recruit a support contact from the drowned route crew.",
    loreText: "Sunken Pier disappears into black water where signal lamps still burn under the surface."
  },
  "shattered-causeway": {
    tags: ["movement", "salvage", "hazard"],
    ruleText: "If clear, test Grit through the broken route and mark a risky shortcut.",
    loreText: "Shattered Causeway is a chain of cracked stone plates over ash, tide, and static."
  },
  "emberwatch-step": {
    tags: ["hazard", "anomaly"],
    ruleText: "If escalation is high, draw extra red pressure before taking the route note.",
    loreText: "The Ember Stair rises through smoke where every step has been repaired with different wars."
  },
  outer_oathpost: {
    tags: ["contract", "lore"],
    ruleText: "If clear, test Command to claim a faction writ, witness, and Contract lead.",
    loreText: "Broken Census Hall still stamps names for citizens, ghosts, fugitives, and debts."
  },
  outer_broken_causeway: {
    tags: ["salvage", "hazard", "movement"],
    ruleText: "If clear, test Grit through the wreckage and mark a risky shortcut.",
    loreText: "Dock Nine Wreckage groans under cranes, salt ash, and cargo that should have stayed sealed."
  },
  "votive-engine-room": {
    tags: ["salvage", "shrine", "risk-shop"],
    ruleText: "If clear, test Forge to read the void-salt bloom and recruit its bone-reader.",
    loreText: "The engine room burns prayers as fuel and answers only when the brass tanks are fed."
  },
  "kettleward-foundry": {
    tags: ["shop", "salvage"],
    ruleText: "If clear, test Guile to work the foundry exchange and recruit a broker.",
    loreText: "Kettleward Foundry hammers broken weapons into shapes that look almost intentional."
  },
  "flooded-locks": {
    tags: ["anomaly", "crossroads"],
    ruleText: "If clear, test Signal to tune the lockwater and recruit its mapper.",
    loreText: "Flooded Locks grind open by inches, spilling cold blue light from drowned machinery."
  },
  "transit-gate": {
    tags: ["movement", "contract", "crossroads"],
    ruleText: "If clear, collect a contract lead and mark a route toward the Customs Gate.",
    loreText: "Transit Gate still announces departures through speakers full of ash."
  },
  middle_shard_sprawl: {
    tags: ["enemy", "salvage"],
    ruleText: "If clear, bargain for passage stock or field gossip.",
    loreText: "Chain-Maul Yard is a salvage mustering ground where every deal is measured in teeth and rivets."
  },
  middle_relic_cache: {
    tags: ["shrine", "artifact", "salvage"],
    ruleText: "If clear, test Guile to mark an Artifact claim; failure opens a Machine Scar choice.",
    loreText: "The Crucible of Names etches victories into iron masks and asks what they cost."
  },
  middle_scar_surgery: {
    tags: ["enemy", "anomaly", "risk-shop"],
    ruleText: "If clear, test Forge to heal 1 Wound; failure opens a Flesh Scar choice.",
    loreText: "The Sable Machine Choir hums inside black cabinets with lungs made of bellows and wire."
  },
  middle_guardian_span: {
    tags: ["crossroads", "contract", "movement"],
    ruleText: "Test Command or Signal to gain Guardian Span Clearance.",
    loreText: "Customs Gate taxes not just salvage, but secrets, blood type, and remembered sins."
  },
  middle_rivalry_pit: {
    tags: ["anomaly", "hazard", "enemy"],
    ruleText: "If clear, test Command to mark a bounded claim and recruit a fixer.",
    loreText: "Mirror Barracks drills reflections until they know how to wound their originals."
  },
  middle_red_march_outpost: {
    tags: ["enemy", "contract"],
    ruleText: "If clear, test Command to secure a military favor and recruit a votive gunner.",
    loreText: "Choir Bastion advances in formation, brass masks forward, hymns crackling through static."
  },
  middle_webglass_breach: {
    tags: ["movement", "salvage", "anomaly"],
    ruleText: "If clear, ride a ghost rail or splice the relay into a mapped route.",
    loreText: "Grave-Rail Junction still dispatches funeral trains through broken signal glass."
  },
  middle_anomaly_well: {
    tags: ["anomaly", "lore"],
    ruleText: "If clear, test Signal to bottle a breach clue; failure advances Global Escalation by 1.",
    loreText: "Static Chapel receives prayers from every dead radio in the Reach at once."
  },
  "black-relay-spire": {
    tags: ["anomaly", "hazard"],
    ruleText: "If clear, test Signal to read the anomaly and bottle a clue for the inner breach.",
    loreText: "The Black Relay Spire points at a star that no longer exists and keeps receiving orders."
  },
  "the-salt-archive": {
    tags: ["contract", "lore"],
    ruleText: "If clear, choose passage stock or field gossip and resolve the matching test.",
    loreText: "The Salt Archive preserves maps in dry crystal, each one labelled with a different failure."
  },
  "red-lantern-trenches": {
    tags: ["hazard", "enemy"],
    ruleText: "Draw red and yellow pressure. If clear, test Command to mark a bounded claim.",
    loreText: "Red Lantern Trenches blink through smoke like a firing line deciding who still counts as alive."
  },
  "weeping-ammunition-shrine": {
    tags: ["risk-shop", "shrine", "enemy"],
    ruleText: "If clear, test Command to secure a military favor and recruit a votive gunner.",
    loreText: "The shrine weeps live rounds into bowls of oil, and every blessing comes chambered."
  },
  "scorched-road": {
    tags: ["movement", "hazard"],
    ruleText: "If clear, mark a dangerous route note before the ash gale returns.",
    loreText: "Scorched Road glows through bootprints, cart-ruts, and the remains of a lost convoy."
  },
  blastworks: {
    tags: ["enemy", "salvage"],
    ruleText: "If clear, choose passage stock or field gossip from the blast crews.",
    loreText: "Blastworks shakes with foundry thunder and the dull red logic of siege machinery."
  },
  "ashen-chapel": {
    tags: ["anomaly", "shrine"],
    ruleText: "If clear, test Signal to read the anomaly and bottle a clue for the inner breach.",
    loreText: "Ashen Chapel keeps its candles lit with static and refuses to say who tends them."
  },
  "reavers-den": {
    tags: ["enemy", "hazard"],
    ruleText: "If clear, secure a military favor from the Ashen Choir line.",
    loreText: "Reaver's Den is a red-lit bunker where trophies hang from chain and rail."
  },
  inner_veil_rift: {
    tags: ["artifact", "movement"],
    ruleText: "Requires inner clearance. Resolve the gate to anchor a surge or slip the fold.",
    loreText: "Melted Gate slumps like black wax around a route that should have closed."
  },
  inner_tomb_gate: {
    tags: ["nemesis", "hazard"],
    ruleText: "If clear, test Command 10; failure inflicts 1 Wound.",
    loreText: "Rifted Approach cuts between ruined walls that keep changing which side they defend."
  },
  inner_choir_shrine: {
    tags: ["artifact", "shrine", "enemy"],
    ruleText: "If clear, test Signal 11 for an Artifact omen; failure opens a Rift Scar choice.",
    loreText: "Saint Engine Crypt houses a machine-saint that blesses only those who survive its audit."
  },
  inner_cinder_lattice: {
    tags: ["anomaly", "scenario"],
    ruleText: "Choose a star-reading route test to line up the final approach.",
    loreText: "The Crownless Observatory sees futures where every crown is empty and every map burns."
  },
  inner_blackstar_shortcut: {
    tags: ["artifact", "hazard"],
    ruleText: "If clear, test Guile 11 and reveal an Artifact omen; failure inflicts 1 Wound.",
    loreText: "Dead Star Reliquary keeps black-light relics behind glass that has never reflected a living face."
  },
  "the-bone-meridian": {
    tags: ["hazard", "salvage"],
    ruleText: "If clear, test Command 10; failure inflicts 1 Wound.",
    loreText: "The Bone Meridian marks the line where useful remains become road material."
  },
  "choir-execution-court": {
    tags: ["enemy", "scenario"],
    ruleText: "Draw two red and one yellow Threat. If clear, test Signal for a dangerous blessing.",
    loreText: "Hollow Court receives emissaries with empty faces, velvet blades, and perfect manners."
  },
  inner_gate_of_cinders: {
    tags: ["scenario", "anomaly", "movement"],
    ruleText: "Resolve the final signal trial before the Ashen Reach Core can be entered.",
    loreText: "The Last Signal Well answers from below the board, repeating coordinates in the voices of the lost."
  },
  center_cinder_gate: {
    tags: ["scenario"],
    ruleText: "Scenario directive controls the final confrontation, victory, collapse, and boss pressure.",
    loreText: "The Ashen Reach Core is not a place so much as the point where every route has been aiming."
  }
};

export const BOARD_SPACES: BoardSpaceDefinition[] = RAW_BOARD_SPACES.map((space) => {
  const presentation = BOARD_SPACE_PRESENTATION[space.id];

  if (!presentation) {
    throw new Error(`Missing board-space presentation for ${space.id}`);
  }

  return {
    ...space,
    ...presentation
  };
});

const boardSpaceIndex = new Map(BOARD_SPACES.map((space) => [space.id, space] as const));

export function getBoardSpace(spaceId: string): BoardSpaceDefinition | null {
  return boardSpaceIndex.get(spaceId) ?? null;
}

export function isScenarioConfrontationSpace(spaceId: string): boolean {
  return getBoardSpace(spaceId)?.textBox.intent === "scenario-confrontation";
}
