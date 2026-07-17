import { describe, expect, it, vi } from "vitest";
import { createCharacters } from "./testData.js";
import { createSequenceRandomSource } from "../dice.js";
import { GameRoomServer, createPhoneProjection, createTvProjection, type ConnectedClient } from "../../../server/roomServer.js";
import type { Character } from "../../schema/character.schema.js";
import type { ContractCard } from "../../schema/contract.schema.js";
import type { Follower } from "../../schema/follower.schema.js";
import type { GearItem } from "../../schema/gear.schema.js";
import type { AnomalyCard, ArtifactCard, EscalationCard, ThreatCard } from "../../schema/card.schema.js";
import type { ClientIntent, GameAction } from "../actions.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";
import { getEquippedGearBonus } from "../gear.js";
import { advanceContractObjectiveState } from "../../contracts/objectives.js";

function createGear(): Map<string, GearItem> {
  return new Map<string, GearItem>([
    [
      "veil-hook",
      {
        id: "veil-hook",
        name: "Veil Hook",
        slot: "weapon",
        statBonus: { stat: "grit", amount: 1 }
      }
    ],
    [
      "ashlock-cleaver",
      {
        id: "ashlock-cleaver",
        name: "Ashlock Cleaver",
        slot: "weapon",
        category: "passive",
        tier: "standard",
        statBonus: { stat: "grit", amount: 1 },
        cost: 4,
        sellValue: 2,
        shopCategories: ["forge-armoury", "market"]
      }
    ],
    [
      "tuning-spines",
      {
        id: "tuning-spines",
        name: "Tuning Spines",
        slot: "utility",
        statBonus: { stat: "signal", amount: 1 }
      }
    ],
    [
      "coffin-rig",
      {
        id: "coffin-rig",
        name: "Coffin Rig",
        slot: "armor",
        statBonus: { stat: "forge", amount: 1 }
      }
    ],
    [
      "marshal-seal",
      {
        id: "marshal-seal",
        name: "Marshal Seal",
        slot: "utility",
        statBonus: { stat: "command", amount: 1 }
      }
    ]
  ]);
}

function createFandiablos(): Follower {
  return {
    id: "fandiablos",
    name: "Fandiablos",
    role: "companion",
    text: "Ultimate companion. Warning Barks, Swarm of Tiny Teeth, Unreasonable Courage, Cable Biters, Too Many Dogs.",
    tier: "ultimate",
    tags: ["companion", "beast-flock", "relic-touched", "chaos", "support"],
    unique: true,
    artifactTier: true,
    ultimateCompanion: true,
    timingWindows: ["beforeThreatDraw", "beforeBattleRoll", "beforeTakingDamage", "anyTime"],
    artCardId: "artifact-fandiablos",
    useLimit: "oncePerTurn",
    loyalty: 5,
    lossCondition: "choice"
  };
}

function createAnomalies(): Map<string, AnomalyCard> {
  return new Map<string, AnomalyCard>([
    [
      "anomaly-glassmere",
      {
        id: "anomaly-glassmere",
        type: "anomaly",
        title: "Glassmere Echo Bloom",
        text: "Mirrored afterimages tear at every clean route.",
        flavor: "Every reflection is a route that almost happened.",
        instability: 2,
        resolutionSummary: "Contained the Glassmere Echo Bloom and harvested a usable signal pattern.",
        resolveEffect: {
          type: "sequence",
          effects: [
            { type: "lose_heat", amount: 1 },
            { type: "gain_note", text: "Glassmere anomaly contained. The spindle now answers the relay choir cleanly." }
          ]
        }
      }
    ],
    [
      "anomaly-choir-static",
      {
        id: "anomaly-choir-static",
        type: "anomaly",
        title: "Choir Static Bloom",
        text: "Dead choir static keeps replaying through the spindle.",
        flavor: "The safest frequency is the one that sounds almost human.",
        instability: 3,
        resolutionSummary: "Bled the Choir Static Bloom into a tuning spine bundle and marked a safer relay band.",
        resolveEffect: {
          type: "sequence",
          effects: [
            { type: "gain_gear", gearId: "tuning-spines" },
            { type: "gain_note", text: "Choir static redirected into a safer relay band." }
          ]
        }
      }
    ]
  ]);
}

function createArtifacts(): Map<string, ArtifactCard> {
  return new Map<string, ArtifactCard>([
    [
      "artifact-yard",
      {
        id: "artifact-yard",
        type: "artifact",
        title: "Yard Bellframe Core",
        text: "A choir-grade salvage heart still hums with route memory.",
        flavor: "It remembers every convoy that died under its watch.",
        charge: 1,
        resolutionSummary: "Recovered the Yard Bellframe Core and pulled a Marshal Seal out of its locked relay housing.",
        resolveEffect: {
          type: "sequence",
          effects: [
            { type: "gain_gear", gearId: "marshal-seal" },
            { type: "gain_note", text: "The Yard Bellframe Core still carries convoy route memory." }
          ]
        }
      }
    ],
    [
      "artifact-bell-votive",
      {
        id: "artifact-bell-votive",
        type: "artifact",
        title: "Bell Votive Casket",
        text: "A sealed reliquary from the yard's watch chapel.",
        flavor: "The dead packed for this crossing like they knew no one else would return.",
        charge: 2,
        resolutionSummary: "Cracked open the Bell Votive Casket and recovered a Veil Hook from the watch cache.",
        resolveEffect: {
          type: "sequence",
          effects: [
            { type: "gain_gear", gearId: "veil-hook" },
            { type: "gain_note", text: "Bell votive cache opened. The yard watch left breach paths in the lining." }
          ]
        }
      }
    ]
  ]);
}

function createEscalations(): Map<string, EscalationCard> {
  return new Map<string, EscalationCard>([
    [
      "escalation-emberwatch",
      {
        id: "escalation-emberwatch",
        type: "escalation",
        title: "Emberwatch Breakline",
        text: "The watch-step vents collapse and the outer lane buckles under live breach pressure.",
        flavor: "The warning bells ring only after the floor is already gone.",
        step: 1,
        resolutionSummary: "Braced through the Emberwatch Breakline and pulled one live breach mark off the spine.",
        resolveEffect: {
          type: "gain_note",
          text: "Emberwatch breakline locked down before the ridge sheared away."
        },
        escalationDelta: -1
      }
    ],
    [
      "escalation-ridge-suture",
      {
        id: "escalation-ridge-suture",
        type: "escalation",
        title: "Ridge Suture Litany",
        text: "The ridge can still be stitched if someone reaches it in time.",
        flavor: "Every prayer on the suture posts was written by a worker who expected not to come back.",
        step: 1,
        resolutionSummary: "Walked the Ridge Suture Litany, sealed the worst fracture, and cooled the operative under pressure.",
        resolveEffect: {
          type: "sequence",
          effects: [
            { type: "lose_heat", amount: 1 },
            { type: "gain_note", text: "Ridge suture anchored. The watch posts can still hold for one more convoy." }
          ]
        },
        escalationDelta: -1
      }
    ]
  ]);
}

function createContracts(): Map<string, ContractCard> {
  return new Map<string, ContractCard>([
    [
      "choir-hush-census",
      {
        id: "choir-hush-census",
        name: "Hush Census",
        factionGiver: "Glass Choir",
        text: "The Choir demands two clean removals so a listening chamber can return to its proper silence.",
        objective: { type: "defeatCount", target: 2 },
        reward: { type: "lose_heat", amount: 1 }
      }
    ],
    [
      "compact-cleanse-ledger",
      {
        id: "compact-cleanse-ledger",
        name: "Cleanse Ledger",
        factionGiver: "Meridian Compact",
        text: "The Compact wants two hostile disruptions erased from a freight lane before the next audit sweep arrives.",
        objective: { type: "defeatCount", target: 2 },
        reward: { type: "gain_gear", gearId: "veil-hook" }
      }
    ],
    [
      "contract-beacon",
      {
        id: "contract-beacon",
        name: "Beacon Quieting",
        factionGiver: "Glass Choir",
        text: "Silence the hostile signal growth around Mirecoil Beacon before it spills into the convoy lattice.",
        objective: { type: "defeatCount", target: 1 },
        reward: {
          type: "sequence",
          effects: [
            { type: "lose_heat", amount: 1 },
            { type: "gain_note", text: "The beacon routes were stabilized for one clean cycle." }
          ]
        }
      }
    ],
    [
      "contract-lantern-run",
      {
        id: "contract-lantern-run",
        name: "Lantern Run",
        factionGiver: "Pale Cartels",
        text: "Thread a black-lantern courier lane and clear two hostile interruptions before the smugglers burn the route.",
        objective: { type: "defeatCount", target: 2 },
        reward: {
          type: "sequence",
          effects: [
            { type: "gain_gear", gearId: "veil-hook" },
            { type: "gain_note", text: "The Lantern Run paid out in contraband route access." }
          ]
        }
      }
    ],
    [
      "cartel-crossing-thread",
      {
        id: "cartel-crossing-thread",
        name: "Crossing Thread",
        factionGiver: "Pale Cartels",
        text: "The Cartels want one convoy lane at Ashwake Crossing charted cleanly before they commit a lantern courier to the route.",
        objective: {
          type: "spaceTextResolved",
          effectKey: "outer_ashwakeClearLane",
          label: "Clear the Ashwake convoy lane",
          target: 1
        },
        reward: {
          type: "sequence",
          effects: [
            { type: "lose_heat", amount: 1 },
            { type: "gain_note", text: "The Cartels opened a clean crossing thread for one black-lantern run." }
          ]
        }
      }
    ]
  ]);
}

function createThreats(): Map<string, ThreatCard> {
  return new Map<string, ThreatCard>([
    [
      "cinder-veil-stalker",
      {
        id: "cinder-veil-stalker",
        type: "threat",
        cardType: "enemy",
        title: "Cinder-Veil Stalker",
        enemyName: "Cinder-Veil Stalker",
        text: "A heat-shimmer shape slips between pylons, then breaks cover with a hooked furnace blade.",
        flavor: "You spot it only when the ash around it begins to boil.",
        severity: 2,
        threatLane: "red",
        stat: "grit",
        difficulty: 6,
        trophyValue: 6,
        defeatReward: {
          type: "gain_gear",
          gearId: "tuning-spines"
        },
        woundOnLoss: {
          type: "take_wound",
          amount: 1
        }
      }
    ],
    [
      "pike-runner",
      {
        id: "pike-runner",
        type: "threat",
        cardType: "enemy",
        title: "Pike Runner",
        enemyName: "Pike Runner",
        text: "A scavenger courier lowers a long ash-pike and charges through the glare.",
        flavor: "The tip sings before the carrier does.",
        severity: 2,
        threatLane: "yellow",
        stat: "grit",
        difficulty: 6,
        trophyValue: 6,
        defeatReward: {
          type: "gain_gear",
          gearId: "veil-hook"
        },
        woundOnLoss: {
          type: "take_wound",
          amount: 1
        }
      }
    ],
    [
      "signal-static",
      {
        id: "signal-static",
        type: "threat",
        cardType: "hazard",
        title: "Signal Static",
        text: "A wash of fractured relay noise blurs every route marker in view.",
        flavor: "The air hisses like a torn wire bundle.",
        severity: 1,
        threatLane: "yellow",
        stat: "signal",
        difficulty: 7,
        successEffect: {
          type: "gain_note",
          text: "You mapped the strongest band before it decayed."
        },
        failEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ],
    [
      "relay-whisper",
      {
        id: "relay-whisper",
        type: "threat",
        cardType: "hazard",
        title: "Relay Whisper",
        text: "A half-born transmission skates across the rails and erases the true path beneath it.",
        flavor: "It sounds close enough to trust until the floor drops away.",
        severity: 1,
        threatLane: "blue",
        stat: "signal",
        difficulty: 7,
        successEffect: {
          type: "gain_note",
          text: "You pinned the false carrier and marked its pulse drift."
        },
        failEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ]
  ]);
}

function cloneCharacter(character: Character | undefined): Character {
  if (!character) {
    throw new Error("Missing character fixture");
  }

  return {
    ...character,
    activeContract: character.activeContract ? { ...character.activeContract } : null,
    heldGear: [...character.heldGear],
    equippedGear: { ...character.equippedGear },
    abilities: [...character.abilities],
    scars: [...character.scars]
  };
}

function createAbilityCharacters(): Map<string, Character> {
  const characters = createCharacters();

  characters.set("black-ledger-agent", {
    id: "black-ledger-agent",
    name: "Joss Var",
    archetype: "Black Ledger Agent",
    currentSpaceId: "sector-a",
    status: "active",
    stats: { command: 1, grit: 1, signal: 2, guile: 3, forge: 2 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: [
      { id: "ledger-broker", name: "Ledger Broker", text: "First contract starts with leverage." },
      { id: "silent-audit", name: "Silent Audit", text: "Cleared sectors yield sharper intelligence." },
      { id: "debt-knife", name: "Debt Knife", text: "Marked kills push contract pressure harder." },
      { id: "black-file", name: "Black File", text: "Finished jobs can be turned into leverage instead of drift." }
    ]
  });

  characters.set("cinder-monk", {
    id: "cinder-monk",
    name: "Mira",
    archetype: "Cinder Monk",
    currentSpaceId: "sector-a",
    status: "active",
    stats: { command: 1, grit: 3, signal: 2, guile: 1, forge: 2 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: [
      { id: "ember-vigil", name: "Ember Vigil", text: "Hold steady in dangerous sectors." },
      { id: "ash-psalm", name: "Ash Psalm", text: "Clear moments become discipline." },
      { id: "bone-bell", name: "Bone Bell", text: "Reduce the first escalation spike each round." },
      { id: "cinder-oath", name: "Cinder Oath", text: "Core-ward confrontations become survivable vows." }
    ]
  });

  characters.set("fleet-elder", {
    id: "fleet-elder",
    name: "Orenna Tash",
    archetype: "Fleet Elder",
    currentSpaceId: "sector-c",
    status: "active",
    stats: { command: 3, grit: 1, signal: 2, guile: 1, forge: 2 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: [
      { id: "convoy-law", name: "Convoy Law", text: "Steady escalation when a contract lead is secured." },
      { id: "old-oaths", name: "Old Oaths", text: "Frightened route crews still answer your call." },
      { id: "chain-signal", name: "Chain Signal", text: "Cleared transport lanes stay useful longer." },
      { id: "fleet-memory", name: "Fleet Memory", text: "You read convoy pressure before panic spreads." }
    ]
  });

  characters.set("oathbroken-prince", {
    id: "oathbroken-prince",
    name: "Reskin Hale",
    archetype: "Oathbroken Prince",
    currentSpaceId: "sector-b",
    status: "active",
    stats: { command: 2, grit: 1, signal: 1, guile: 3, forge: 2 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: [
      { id: "broken-claim", name: "Broken Claim", text: "Turn cleared leverage into contract progress." },
      { id: "ash-tithe", name: "Ash Tithe", text: "Quiet victories still pay a due." },
      { id: "crown-debt", name: "Crown Debt", text: "Marked kills feel like collected obligation." },
      { id: "ruin-courtesy", name: "Ruin Courtesy", text: "Broken grandeur still belongs to you." }
    ]
  });

  characters.set("rift-cartographer", {
    id: "rift-cartographer",
    name: "Senna Pell",
    archetype: "Rift Cartographer",
    currentSpaceId: "sector-a",
    status: "active",
    stats: { command: 1, grit: 1, signal: 2, guile: 3, forge: 2 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: [
      { id: "breach-atlas", name: "Breach Atlas", text: "Map a lane into a safer route note." },
      { id: "ghost-mile", name: "Ghost Mile", text: "False routes stand out before they can bite." },
      { id: "surveyor-cut", name: "Surveyor's Cut", text: "Clean paths become stored leverage." },
      { id: "rift-script", name: "Rift Script", text: "Hostile ground is annotated before it fades." }
    ]
  });

  characters.set("siege-medic", {
    id: "siege-medic",
    name: "Dr. Yuna Castell",
    archetype: "Siege Medic",
    currentSpaceId: "sector-a",
    status: "active",
    stats: { command: 2, grit: 3, signal: 1, guile: 1, forge: 2 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: [
      { id: "field-triage", name: "Field Triage", text: "Heal during stabilize windows and sanctuaries." },
      { id: "scar-ledger", name: "Scar Ledger", text: "Completed jobs become survivable recovery records." },
      { id: "siege-discipline", name: "Siege Discipline", text: "Pressure sharpens your pace." },
      { id: "amber-draught", name: "Amber Draught", text: "Relief arrives in precise doses." }
    ]
  });

  characters.set("salvage-warden", {
    id: "salvage-warden",
    name: "Brask Ode",
    archetype: "Salvage Warden",
    currentSpaceId: "sector-c",
    status: "active",
    stats: { command: 1, grit: 2, signal: 1, guile: 2, forge: 3 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: [
      { id: "salvage-right", name: "Salvage Right", text: "Gear hauls count harder when you secure the site." },
      { id: "scrap-bastion", name: "Scrap Bastion", text: "Forge-heavy checks treat wreckage like useful cover." },
      { id: "yard-warden", name: "Yard Warden", text: "Cleared salvage sites stay useful longer." },
      { id: "last-haul", name: "Last Haul", text: "Recover one more useful item while the run is failing." }
    ]
  });

  characters.set("grave-engineer", {
    id: "grave-engineer",
    name: "Dessa Korr",
    archetype: "Grave Engineer",
    currentSpaceId: "sector-c",
    status: "active",
    stats: { command: 1, grit: 2, signal: 1, guile: 2, forge: 3 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: [
      { id: "coffin-rigging", name: "Coffin Rigging", text: "Salvage yields sturdier field gear." },
      { id: "mortuary-triage", name: "Mortuary Triage", text: "Stabilization becomes procedural calm." },
      { id: "grave-spark", name: "Grave Spark", text: "Dead infrastructure counts as familiar work." },
      { id: "cold-brace", name: "Cold Brace", text: "Wound-driven spikes land softer." }
    ]
  });

  return characters;
}

function createState(overrides: Partial<GameState> = {}): GameState {
  const characters = createCharacters();
  const contracts = [...createContracts().values()];
  const baseState: GameState = {
    sessionId: "session-alpha",
    status: "active",
    sessionMode: "multiplayer",
    gameMode: "standard",
    winnerSeatId: null,
    activeScenarioId: "scenario_broken_seal",
    scenarioProgress: {},
    phase: "action",
    resolutionSource: null,
    activeSeatIndex: 0,
    turnOrder: ["seat-1", "seat-2", "seat-3"],
    heatThreshold: 6,
    woundThreshold: 3,
    sequence: 0,
    sectors: [
      {
        id: "sector-a",
        name: "Ashwake Crossing",
        regionTier: "borderlight",
        neighbors: ["sector-b"],
        danger: 2,
        encounterDecks: { threat: ["signal-static"], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "sector-b",
        name: "Glassmere Spindle",
        regionTier: "borderlight",
        neighbors: ["sector-a", "sector-c"],
        danger: 3,
        encounterDecks: { threat: ["cinder-veil-stalker", "signal-static", "relay-whisper"], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "sector-c",
        name: "Mirecoil Beacon",
        regionTier: "borderlight",
        neighbors: ["sector-b"],
        danger: 4,
        encounterDecks: { threat: ["signal-static", "pike-runner"], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    seats: [
      { seatId: "seat-1", characterId: "void-marshal", displayName: "Seat One", startingContractOptions: [], selectedStartingContractId: null, connected: true, ready: true, kicked: false, joinToken: "seat:session-alpha:seat-1" },
      { seatId: "seat-2", characterId: "signal-witch", displayName: "Seat Two", startingContractOptions: [], selectedStartingContractId: null, connected: true, ready: true, kicked: false, joinToken: "seat:session-alpha:seat-2" },
      { seatId: "seat-3", characterId: "grave-engineer", displayName: "Seat Three", startingContractOptions: [], selectedStartingContractId: null, connected: true, ready: true, kicked: false, joinToken: "seat:session-alpha:seat-3" }
    ],
    players: [
      {
        seatId: "seat-1",
        sectorId: "sector-a",
        private: { hand: [], notes: [] },
        character: {
          ...cloneCharacter(characters.get("void-marshal")),
          currentSpaceId: "sector-a",
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      },
      {
        seatId: "seat-2",
        sectorId: "sector-b",
        private: { hand: [], notes: [] },
        character: {
          ...cloneCharacter(characters.get("signal-witch")),
          currentSpaceId: "sector-b",
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      },
      {
        seatId: "seat-3",
        sectorId: "sector-b",
        private: { hand: [], notes: [] },
        character: {
          ...cloneCharacter(characters.get("grave-engineer")),
          currentSpaceId: "sector-b",
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      }
    ],
    availableContracts: contracts,
    shopStockReveals: [],
    nemesisChampions: [],
    nemesisNexusCountdowns: [],
    eventLog: [],
    escalationLevel: 0,
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
    activeResolution: null,
    lastOutcomeSummary: null
  };

  return {
    ...baseState,
    ...overrides,
    sessionMode: overrides.sessionMode ?? baseState.sessionMode
  };
}

function createClient(seatId: string): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send() {},
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function createCapturingClient(seatId: string, sent: Array<Record<string, unknown>>): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(payload: string) {
        sent.push(JSON.parse(payload) as Record<string, unknown>);
      },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function runIntent(server: GameRoomServer, intent: ClientIntent): void {
  server.handleIntent(createClient(intent.seatId), intent);

  if (intent.type === "CHECK_REQUESTED" || intent.type === "COMBAT_REQUESTED") {
    const activeResolution = server.getState().activeResolution;

    if (activeResolution?.stage === "battle_setup" && activeResolution.playerId === intent.seatId) {
      server.handleIntent(createClient(intent.seatId), intent);
    }
  }

  for (let index = 0; index < 4; index += 1) {
    const activeResolution = server.getState().activeResolution;

    if (
      !activeResolution ||
      !["roll_result", "outcome_summary", "awaiting_continue"].includes(activeResolution.stage)
    ) {
      return;
    }

    const continuingSeatId = server.getState().turnOrder[server.getState().activeSeatIndex] ?? intent.seatId;

    server.handleIntent(createClient(continuingSeatId), {
      type: "CONTINUE_RESOLUTION",
      seatId: continuingSeatId
    });
  }
}

function runOneStepMove(server: GameRoomServer, intent: Extract<ClientIntent, { type: "MOVE_REQUESTED" }>): void {
  server.getState().movementRolls = {
    ...(server.getState().movementRolls ?? {}),
    [intent.seatId]: 1
  };
  runIntent(server, intent);
}

function endBroadcastTurn(server: GameRoomServer): void {
  const seatId = server.getState().turnOrder[server.getState().activeSeatIndex];
  if (server.getState().phase === "broadcast" && seatId) {
    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId,
      toPhase: "start"
    });
  }
}

function withOnlyConnectedSeat(state: GameState, connectedSeatId: string): GameState {
  return {
    ...state,
    seats: state.seats.map((seat) => ({
      ...seat,
      connected: seat.seatId === connectedSeatId
    }))
  };
}

describe("encounter state effects", () => {
  it("draws a local artifact card reward and consumes it from the space deck", () => {
    const state = createState({
      phase: "resolution",
      sectors: createState().sectors.map((sector) =>
        sector.id === "sector-a"
          ? {
              ...sector,
              encounterDecks: { ...sector.encounterDecks, artifact: ["artifact-bell-votive"] }
            }
          : sector
      )
    });
    const server = new GameRoomServer(
      state,
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts()
    );
    const effect = (server as any).resolveEffect({ type: "draw_artifact" }, "seat-1");
    const result = reduceGameState({ ...state, pendingEffect: effect }, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect,
      sourceCardId: "grave-lattice-reclaimer",
      success: true,
      createdAt: "2026-06-27T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.players.find((player) => player.seatId === "seat-1")?.character.heldGear.some((item) => item.id === "veil-hook")).toBe(true);
    expect(result.state.sectors.find((sector) => sector.id === "sector-a")?.encounterDecks.artifact).toEqual([]);
  });

  it("returns a persistent threat to the current space after a failed fight", () => {
    const state = createState({
      phase: "resolution",
      sectors: createState().sectors.map((sector) =>
        sector.id === "sector-a"
          ? {
              ...sector,
              encounterDecks: { ...sector.encounterDecks, threat: [] }
            }
          : sector
      ),
      pendingEffect: {
        type: "return_threat_to_space",
        threatId: "grave-lattice-reclaimer",
        sourceSectorId: "sector-a"
      }
    });
    const result = reduceGameState(state, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: state.pendingEffect!,
      sourceCardId: "grave-lattice-reclaimer",
      success: false,
      createdAt: "2026-06-27T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.sectors.find((sector) => sector.id === "sector-a")?.encounterDecks.threat).toEqual(["grave-lattice-reclaimer"]);
  });
});

describe("first eligible character timing", () => {
  const hazard = (id: string, stat: "command" | "grit" | "signal" | "guile" | "forge", threatLane?: "blue" | "yellow") => ({
    id,
    type: "threat" as const,
    cardType: "hazard" as const,
    title: id,
    text: "Timing fixture.",
    flavor: "Timing fixture.",
    severity: 1,
    stat,
    difficulty: 6,
    ...(threatLane ? { threatLane } : {}),
    successEffect: { type: "gain_note" as const, text: "Passed." },
    failEffect: { type: "gain_heat" as const, amount: 1 }
  });

  const timingServer = (characterId: string, stats: Character["stats"], encounter: ThreatCard) => {
    const base = createState({ currentEncounter: encounter });
    const character: Character = {
      ...base.players[0]!.character,
      id: characterId,
      name: characterId,
      stats,
      abilities: []
    };
    return new GameRoomServer(
      { ...base, players: [{ ...base.players[0]!, character }, ...base.players.slice(1)] },
      [], createSequenceRandomSource([5, 5, 5, 5]), createThreats(), createCharacters(), createGear(), createContracts()
    );
  };

  it.each([
    ["Kira", "char_kira_dog", { command: 1, grit: 5, signal: 1, guile: 1, forge: 1 }, "houndblade-charge", "battle", "grit", { id: "enemy", type: "threat", cardType: "enemy", title: "enemy", enemyName: "enemy", text: "", flavor: "", severity: 1, stat: "grit", difficulty: 6 }],
    ["Rumi", "char_rumi", { command: 1, grit: 1, signal: 5, guile: 4, forge: 1 }, "violet-edge", "check", "signal", hazard("signal-hazard", "signal")],
    ["Lane", "signal-witch", { command: 1, grit: 1, signal: 5, guile: 1, forge: 1 }, "hush-static", "check", "signal", hazard("blue-hazard", "signal", "blue")],
    ["Popelord", "char_popelord", { command: 1, grit: 5, signal: 1, guile: 1, forge: 1 }, "compost-cape", "check", "grit", hazard("yellow-hazard", "grit", "yellow")]
  ] as const)("keeps %s available until its first eligible event, consumes it once, and resets at the intended boundary", (_name, characterId, stats, abilityId, mode, stat, encounter) => {
    const server = timingServer(characterId, stats, encounter as ThreatCard);
    const internals = server as unknown as {
      getCharacterModifierSources: (player: GameState["players"][number], stat: "command" | "grit" | "signal" | "guile" | "forge", mode: "battle" | "check") => Array<{ label: string }>;
      getCharacterDifficultyModifier: (player: GameState["players"][number], encounter: ThreatCard) => number;
      markFirstEligibleCharacterAbility: (seatId: string, stat: "command" | "grit" | "signal" | "guile" | "forge", mode: "battle" | "check", encounter: ThreatCard) => void;
    };
    const player = server.getState().players[0]!;

    // An unrelated completed check is intentionally not an ability marker.
    server.getState().eventLog.push({ type: "CHECK_ROLLED", seatId: "seat-1" } as never);
    const before = mode === "check" ? internals.getCharacterModifierSources(player, stat, mode) : internals.getCharacterModifierSources(player, stat, mode);
    expect(before.length + (internals.getCharacterDifficultyModifier(player, encounter as ThreatCard) === -1 ? 1 : 0)).toBeGreaterThan(0);

    internals.markFirstEligibleCharacterAbility("seat-1", stat, mode, encounter as ThreatCard);
    expect(server.getState().eventLog.some((entry) => (entry as { abilityId?: string }).abilityId === abilityId)).toBe(true);
    internals.markFirstEligibleCharacterAbility("seat-1", stat, mode, encounter as ThreatCard);
    expect(server.getState().eventLog.filter((entry) => (entry as { abilityId?: string }).abilityId === abilityId)).toHaveLength(1);

    server.getState().eventLog.push({ type: abilityId === "houndblade-charge" ? "TURN_COMPLETED" : "ROUND_COMPLETED" } as never);
    internals.markFirstEligibleCharacterAbility("seat-1", stat, mode, encounter as ThreatCard);
    expect(server.getState().eventLog.filter((entry) => (entry as { abilityId?: string }).abilityId === abilityId)).toHaveLength(2);
  });
});

describe("active resolution visibility state", () => {
  it("creates a card reveal stage when a threat is drawn", () => {
    const card = createThreats().get("signal-static")!;
    const state = createState({ phase: "sector" });
    const result = reduceGameState(state, {
      type: "ENCOUNTER_DRAWN",
      seatId: "seat-1",
      sectorId: "sector-a",
      card,
      createdAt: "2026-06-26T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.activeResolution?.stage).toBe("card_reveal");
    expect(result.state.activeResolution?.card?.title).toBe("Signal Static");
  });

  it("advances a check through battle setup and visible roll result", () => {
    const card = createThreats().get("signal-static")!;
    const revealed = reduceGameState(createState({ phase: "sector" }), {
      type: "ENCOUNTER_DRAWN",
      seatId: "seat-1",
      sectorId: "sector-a",
      card,
      createdAt: "2026-06-26T00:00:00.000Z"
    });
    expect(revealed.ok).toBe(true);
    if (!revealed.ok) {
      return;
    }

    const setup = reduceGameState(revealed.state, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal",
      createdAt: "2026-06-26T00:00:01.000Z"
    });
    expect(setup.ok).toBe(true);
    if (!setup.ok) {
      return;
    }
    expect(setup.state.activeResolution?.stage).toBe("battle_setup");
    expect(setup.state.activeResolution?.battle?.difficulty).toBe(7);

    const diceRolling = reduceGameState(setup.state, {
      type: "DICE_ROLL_STARTED",
      seatId: "seat-1",
      stat: "signal",
      cardId: card.id,
      createdAt: "2026-06-26T00:00:01.500Z"
    });
    expect(diceRolling.ok).toBe(true);
    if (!diceRolling.ok) {
      return;
    }
    expect(diceRolling.state.activeResolution?.stage).toBe("dice_roll");
    expect(diceRolling.state.activeResolution?.roll).toBeUndefined();

    const rolled = reduceGameState(diceRolling.state, {
      type: "CHECK_ROLLED",
      seatId: "seat-1",
      stat: "signal",
      difficulty: 7,
      roll: { faces: [2, 3], total: 5 },
      statBonus: 1,
      total: 6,
      success: false,
      effect: { type: "gain_heat", amount: 1 },
      cardId: card.id,
      createdAt: "2026-06-26T00:00:02.000Z"
    });
    expect(rolled.ok).toBe(true);
    if (!rolled.ok) {
      return;
    }
    expect(rolled.state.activeResolution?.stage).toBe("roll_result");
    expect(rolled.state.activeResolution?.roll).toMatchObject({
      dice: [2, 3],
      finalTotal: 6,
      target: 7,
      success: false
    });
    expect(rolled.state.players[0]?.character.heat).toBe(0);
    expect(rolled.state.pendingEffect).toEqual({ type: "gain_heat", amount: 1 });
  });

  it("lets a single-player operative use one visible failed-check reroll per round", () => {
    const state = withOnlyConnectedSeat(
      createState({
        sessionMode: "single-player",
        phase: "action",
        turnOrder: ["seat-1"],
        soloRerollCharges: { "seat-1": 1 },
        currentEncounter: createThreats().get("signal-static") ?? null
      }),
      "seat-1"
    );
    const sent: Array<Record<string, unknown>> = [];
    const server = new GameRoomServer(
      state,
      [],
      createSequenceRandomSource([0, 0, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );
    const client = createCapturingClient("seat-1", sent);

    server.handleIntent(client, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });
    server.handleIntent(client, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });

    expect(server.getState().activeResolution?.roll).toMatchObject({
      dice: [1, 1],
      success: false
    });
    expect((createPhoneProjection(server.getState(), "seat-1") as { soloReroll?: { available: boolean; charges: number } }).soloReroll).toEqual({
      available: true,
      charges: 1
    });

    server.handleIntent(client, { type: "SOLO_REROLL_REQUESTED", seatId: "seat-1" });

    expect(server.getState().soloRerollCharges?.["seat-1"]).toBe(0);
    expect(server.getState().activeResolution?.roll).toMatchObject({
      dice: [6, 6],
      success: true
    });
    expect((createPhoneProjection(server.getState(), "seat-1") as { soloReroll?: { available: boolean; charges: number } }).soloReroll).toEqual({
      available: false,
      charges: 0
    });

    server.handleIntent(client, { type: "SOLO_REROLL_REQUESTED", seatId: "seat-1" });
    expect(sent.some((message) => message.type === "INTENT_REJECTED")).toBe(true);

    const reset = reduceGameState(server.getState(), {
      type: "ROUND_COMPLETED",
      seatId: "seat-1",
      createdAt: "2026-06-28T00:00:00.000Z"
    });

    expect(reset.ok).toBe(true);
    if (reset.ok) {
      expect(reset.state.soloRerollCharges?.["seat-1"]).toBe(1);
    }
  });

  it("rejects solo emergency rerolls in multiplayer", () => {
    const state = withOnlyConnectedSeat(
      createState({
        sessionMode: "multiplayer",
        phase: "resolution",
        currentEncounter: createThreats().get("signal-static") ?? null,
        activeResolution: {
          id: "seat-1:threat:signal-static:failed",
          playerId: "seat-1",
          source: "threat",
          stage: "roll_result",
          card: {
            id: "signal-static",
            title: "Signal Static",
            type: "hazard"
          },
          roll: {
            dice: [1, 1],
            baseTotal: 2,
            modifierTotal: 1,
            finalTotal: 3,
            target: 7,
            success: false
          }
        }
      }),
      "seat-1"
    );
    const sent: Array<Record<string, unknown>> = [];
    const server = new GameRoomServer(
      state,
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.handleIntent(createCapturingClient("seat-1", sent), { type: "SOLO_REROLL_REQUESTED", seatId: "seat-1" });

    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("single-player"))).toBe(true);
    expect((createPhoneProjection(server.getState(), "seat-1") as { soloReroll?: { available: boolean; charges: number } }).soloReroll).toEqual({
      available: false,
      charges: 0
    });
  });

  it("keeps resolution visible until continue reaches an outcome stage", () => {
    const state = createState({
      activeResolution: {
        id: "seat-1:threat:signal-static:test",
        playerId: "seat-1",
        source: "threat",
        stage: "roll_result",
        roll: {
          dice: [4, 4],
          baseTotal: 8,
          modifierTotal: 1,
          finalTotal: 9,
          target: 7,
          success: true
        },
        outcome: {
          title: "Check passed",
          text: "Success: note added.",
          effects: ["Success: note added."]
        }
      }
    });

    const firstContinue = reduceGameState(state, {
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1",
      createdAt: "2026-06-26T00:00:03.000Z"
    });
    expect(firstContinue.ok).toBe(true);
    if (!firstContinue.ok) {
      return;
    }
    expect(firstContinue.state.activeResolution?.stage).toBe("outcome_summary");

    const secondContinue = reduceGameState(firstContinue.state, {
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1",
      createdAt: "2026-06-26T00:00:04.000Z"
    });
    expect(secondContinue.ok).toBe(true);
    if (!secondContinue.ok) {
      return;
    }
    expect(secondContinue.state.activeResolution).toBeNull();
  });

  it("does not apply pending movement failure effects while the outcome summary is visible", () => {
    const server = new GameRoomServer(
      createState({
        phase: "resolution",
        resolutionSource: "movement",
        activeResolution: {
          id: "seat-1:movement:sector-b:test",
          playerId: "seat-1",
          source: "movement",
          stage: "outcome_summary",
          roll: {
            dice: [3, 2],
            baseTotal: 5,
            modifierTotal: 1,
            finalTotal: 6,
            target: 7,
            success: false
          },
          outcome: {
            title: "Movement failed",
            text: "Failed to enter Glassmere Spindle. Failure: legacy pressure.",
            effects: ["Failure: legacy pressure."]
          }
        },
        pendingEffect: { type: "gain_heat", amount: 1 },
        lastOutcomeSummary: {
          seatId: "seat-1",
          movedToSectorId: "sector-b",
          encounterCardId: null,
          encounterTitle: "Glassmere Spindle",
          encounterCardType: null,
          checkStat: "guile",
          die1: 3,
          die2: 2,
          statBonus: 1,
          checkTotal: 6,
          difficulty: 7,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: false,
          summary: "Failed to enter Glassmere Spindle. Failure: legacy pressure."
        }
      }),
      [],
      createSequenceRandomSource([]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as any).runAutomaticPhases("seat-1");

    expect(server.getState().phase).toBe("resolution");
    expect(server.getState().activeResolution?.stage).toBe("outcome_summary");
    expect(server.getState().pendingEffect).toEqual({ type: "gain_heat", amount: 1 });
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
  });

  it("recovers an orphaned resolution state when the player continues", () => {
    const server = new GameRoomServer(
      createState({
        phase: "resolution",
        resolutionSource: "encounter",
        activeResolution: null,
        pendingEffect: null,
        lastOutcomeSummary: {
          seatId: "seat-1",
          movedToSectorId: "sector-b",
          encounterCardId: null,
          encounterTitle: "Glassmere Spindle",
          encounterCardType: null,
          checkStat: "guile",
          die1: 3,
          die2: 2,
          statBonus: 1,
          checkTotal: 6,
          difficulty: 7,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: false,
          summary: "Failed to enter Glassmere Spindle. Failure: legacy pressure."
        }
      }),
      [],
      createSequenceRandomSource([]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.handleIntent(createClient("seat-1"), {
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1"
    });

    expect(server.getState().phase).not.toBe("resolution");
    expect(server.getState().activeResolution).toBeNull();
  });

  it("recovers an orphaned successful encounter by reopening the sector flow", () => {
    const baseState = createState({ sessionMode: "single-player" });
    const encounter = createThreats().get("cinder-veil-stalker");

    if (!encounter) {
      throw new Error("Missing cinder-veil-stalker fixture");
    }

    const server = new GameRoomServer(
      createState({
        sessionMode: "single-player",
        turnOrder: ["seat-1"],
        phase: "resolution",
        resolutionSource: "encounter",
        currentEncounter: encounter,
        activeResolution: null,
        pendingEffect: null,
        sectors: [
          {
            id: "outer_waymarket",
            name: "Anchor Market",
            regionTier: "borderlight",
            neighbors: [],
            danger: 0,
            encounterDecks: { threat: ["signal-static"], anomaly: [], contract: [], artifact: [], escalation: [] }
          }
        ],
        seats: baseState.seats.map((seat) =>
          seat.seatId === "seat-1"
            ? {
                ...seat,
                characterId: "void-marshal",
                displayName: "Solo",
                connected: true
              }
            : seat
        ),
        players: baseState.players
          .filter((player) => player.seatId === "seat-1")
          .map((player) => ({
            ...player,
            sectorId: "outer_waymarket",
            character: {
              ...player.character,
              currentSpaceId: "outer_waymarket",
              status: "active" as const
            }
          })),
        lastOutcomeSummary: {
          seatId: "seat-1",
          movedToSectorId: "outer_waymarket",
          encounterCardId: encounter.id,
          encounterTitle: encounter.title,
          encounterCardType: encounter.cardType,
          checkStat: encounter.stat,
          die1: 6,
          die2: 6,
          statBonus: 3,
          checkTotal: 15,
          difficulty: encounter.difficulty,
          enemyRollerSeatId: null,
          enemyDie1: 1,
          enemyDie2: 1,
          enemyBonus: encounter.difficulty,
          enemyTotal: 8,
          success: true,
          summary: "Cinder-Veil Stalker defeated. Another threat waits in the sector."
        }
      }),
      [],
      createSequenceRandomSource([]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.handleIntent(createClient("seat-1"), {
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1"
    });

    expect(server.getState().phase).toBe("action");
    expect(server.getState().currentEncounter?.id).toBe("signal-static");
    expect(server.getState().activeResolution?.card?.id).toBe("signal-static");
  });

  it("reopens a cleared shop sector after a successful encounter instead of ending a single-player turn", () => {
    const baseState = createState({ sessionMode: "single-player" });
    const encounter = createThreats().get("cinder-veil-stalker");

    if (!encounter) {
      throw new Error("Missing cinder-veil-stalker fixture");
    }

    const server = new GameRoomServer(
      createState({
        sessionMode: "single-player",
        turnOrder: ["seat-1"],
        phase: "resolution",
        resolutionSource: "encounter",
        currentEncounter: encounter,
        pendingEffect: null,
        activeResolution: null,
        sectors: [
          {
            id: "outer_waymarket",
            name: "Anchor Market",
            regionTier: "borderlight",
            neighbors: [],
            danger: 0,
            encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
          }
        ],
        seats: baseState.seats.map((seat) =>
          seat.seatId === "seat-1"
            ? {
                ...seat,
                characterId: "void-marshal",
                displayName: "Solo",
                connected: true
              }
            : seat
        ),
        players: baseState.players
          .filter((player) => player.seatId === "seat-1")
          .map((player) => ({
            ...player,
            sectorId: "outer_waymarket",
            character: {
              ...player.character,
              currentSpaceId: "outer_waymarket",
              salvage: 6,
              status: "active" as const
            }
          })),
        lastOutcomeSummary: {
          seatId: "seat-1",
          movedToSectorId: "outer_waymarket",
          encounterCardId: encounter.id,
          encounterTitle: encounter.title,
          encounterCardType: encounter.cardType,
          checkStat: encounter.stat,
          die1: 6,
          die2: 6,
          statBonus: 3,
          checkTotal: 15,
          difficulty: encounter.difficulty,
          enemyRollerSeatId: null,
          enemyDie1: 1,
          enemyDie2: 1,
          enemyBonus: encounter.difficulty,
          enemyTotal: 8,
          success: true,
          summary: "Cinder-Veil Stalker defeated. Anchor Market is clear."
        }
      }),
      [],
      createSequenceRandomSource([]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");

    expect(server.getState().phase).toBe("action");
    expect(server.getState().currentEncounter).toBeNull();
    expect(server.getState().activeSeatIndex).toBe(0);

    const tvProjection = createTvProjection(server.getState()) as {
      shopEncounter: {
        shopName: string;
        status: string;
        services: Array<{ id: string; enabled: boolean }>;
      } | null;
    };

    expect(tvProjection.shopEncounter).toMatchObject({
      shopName: "Anchor Market",
      status: "open"
    });
    expect(tvProjection.shopEncounter?.services.some((service) => service.id === "buy-gear")).toBe(true);
  });

  it("advances service sectors without printed icons without drawing an automatic threat", () => {
    const baseState = createState({ sessionMode: "single-player" });
    const server = new GameRoomServer(
      createState({
        sessionMode: "single-player",
        turnOrder: ["seat-1"],
        phase: "sector",
        sectors: [
          {
            id: "outer_ember_sanctum",
            name: "Pilgrim Lock Gate",
            regionTier: "borderlight",
            neighbors: [],
            danger: 0,
            encounterDecks: { threat: ["signal-static"], anomaly: [], contract: [], artifact: [], escalation: [] }
          }
        ],
        seats: baseState.seats.map((seat) =>
          seat.seatId === "seat-1"
            ? {
                ...seat,
                characterId: "void-marshal",
                displayName: "Solo",
                connected: true
              }
            : seat
        ),
        players: baseState.players
          .filter((player) => player.seatId === "seat-1")
          .map((player) => ({
            ...player,
            sectorId: "outer_ember_sanctum",
            character: {
              ...player.character,
              currentSpaceId: "outer_ember_sanctum",
              status: "active" as const
            }
          }))
      }),
      [],
      createSequenceRandomSource([]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");

    expect(server.getState().phase).toBe("action");
    expect(server.getState().currentEncounter).toBeNull();
    expect(server.getState().sectors.find((sector) => sector.id === "outer_ember_sanctum")?.encounterDecks.threat).toEqual([
      "signal-static"
    ]);
  });

  it("does not draw another threat while the printed lane has an unresolved blocker", () => {
    const baseState = createState({ sessionMode: "single-player" });
    const signalStatic = createThreats().get("signal-static");

    if (!signalStatic) {
      throw new Error("Missing signal-static fixture");
    }

    const blocker: ThreatCard = { ...signalStatic, threatLane: "yellow" };

    const server = new GameRoomServer(
      createState({
        sessionMode: "single-player",
        turnOrder: ["seat-1"],
        phase: "sector",
        currentEncounter: blocker,
        sectors: [
          {
            id: "ashwake-crossing",
            name: "Ashwalk Bridge",
            regionTier: "borderlight",
            neighbors: [],
            danger: 1,
            encounterDecks: { threat: ["signal-static"], anomaly: [], contract: [], artifact: [], escalation: [] }
          }
        ],
        seats: baseState.seats.map((seat) =>
          seat.seatId === "seat-1"
            ? {
                ...seat,
                characterId: "void-marshal",
                displayName: "Solo",
                connected: true
              }
            : seat
        ),
        players: baseState.players
          .filter((player) => player.seatId === "seat-1")
          .map((player) => ({
            ...player,
            sectorId: "ashwake-crossing",
            character: {
              ...player.character,
              currentSpaceId: "ashwake-crossing",
              status: "active" as const
            }
          })),
        lastOutcomeSummary: {
          seatId: "seat-1",
          movedToSectorId: "ashwake-crossing",
          encounterCardId: blocker.id,
          encounterTitle: blocker.title,
          encounterCardType: blocker.cardType,
          checkStat: blocker.stat,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: blocker.difficulty,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: null,
          summary: "Gate-Tax Collectors block the bridge."
        }
      }),
      [],
      createSequenceRandomSource([]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");

    expect(server.getState().phase).toBe("action");
    expect(server.getState().currentEncounter?.id).toBe("signal-static");
    expect(server.getState().sectors.find((sector) => sector.id === "ashwake-crossing")?.encounterDecks.threat).toEqual([
      "signal-static"
    ]);
  });

  it("draws a threat from the printed yellow lane instead of the top generic threat", () => {
    const baseState = createState({ sessionMode: "single-player" });
    const server = new GameRoomServer(
      createState({
        sessionMode: "single-player",
        turnOrder: ["seat-1"],
        phase: "sector",
        sectors: [
          {
            id: "ashwake-crossing",
            name: "Ashwalk Bridge",
            regionTier: "borderlight",
            neighbors: [],
            danger: 1,
            encounterDecks: { threat: ["relay-whisper", "signal-static"], anomaly: [], contract: [], artifact: [], escalation: [] }
          }
        ],
        seats: baseState.seats.map((seat) =>
          seat.seatId === "seat-1"
            ? {
                ...seat,
                characterId: "void-marshal",
                displayName: "Solo",
                connected: true
              }
            : seat
        ),
        players: baseState.players
          .filter((player) => player.seatId === "seat-1")
          .map((player) => ({
            ...player,
            sectorId: "ashwake-crossing",
            character: {
              ...player.character,
              currentSpaceId: "ashwake-crossing",
              status: "active" as const
            }
          }))
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");

    expect(server.getState().currentEncounter?.id).toBe("signal-static");
    expect(server.getState().sectors.find((sector) => sector.id === "ashwake-crossing")?.encounterDecks.threat).toEqual([
      "relay-whisper"
    ]);
  });

  it("draws a threat from the printed blue lane", () => {
    const baseState = createState({ sessionMode: "single-player" });
    const server = new GameRoomServer(
      createState({
        sessionMode: "single-player",
        turnOrder: ["seat-1"],
        phase: "sector",
        sectors: [
          {
            id: "glassmere-spindle",
            name: "Glass Signal Pier",
            regionTier: "borderlight",
            neighbors: [],
            danger: 1,
            encounterDecks: { threat: ["signal-static", "relay-whisper"], anomaly: [], contract: [], artifact: [], escalation: [] }
          }
        ],
        seats: baseState.seats.map((seat) =>
          seat.seatId === "seat-1"
            ? {
                ...seat,
                characterId: "void-marshal",
                displayName: "Solo",
                connected: true
              }
            : seat
        ),
        players: baseState.players
          .filter((player) => player.seatId === "seat-1")
          .map((player) => ({
            ...player,
            sectorId: "glassmere-spindle",
            character: {
              ...player.character,
              currentSpaceId: "glassmere-spindle",
              status: "active" as const
            }
          }))
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");

    expect(server.getState().currentEncounter?.id).toBe("relay-whisper");
    expect(server.getState().sectors.find((sector) => sector.id === "glassmere-spindle")?.encounterDecks.threat).toEqual([
      "signal-static"
    ]);
  });

  it("lets a blocker in one printed lane leave another mixed lane due", () => {
    const baseState = createState({ sessionMode: "single-player" });
    const signalStatic = createThreats().get("signal-static");

    if (!signalStatic) {
      throw new Error("Missing signal-static fixture");
    }

    const server = new GameRoomServer(
      createState({
        sessionMode: "single-player",
        turnOrder: ["seat-1"],
        phase: "sector",
        currentEncounter: signalStatic,
        sectors: [
          {
            id: "mirecoil-beacon",
            name: "Rusted Transit Gate",
            regionTier: "borderlight",
            neighbors: [],
            danger: 2,
            encounterDecks: { threat: ["relay-whisper"], anomaly: [], contract: [], artifact: [], escalation: [] }
          }
        ],
        seats: baseState.seats.map((seat) =>
          seat.seatId === "seat-1"
            ? {
                ...seat,
                characterId: "void-marshal",
                displayName: "Solo",
                connected: true
              }
            : seat
        ),
        players: baseState.players
          .filter((player) => player.seatId === "seat-1")
          .map((player) => ({
            ...player,
            sectorId: "mirecoil-beacon",
            character: {
              ...player.character,
              currentSpaceId: "mirecoil-beacon",
              status: "active" as const
            }
          })),
        lastOutcomeSummary: {
          seatId: "seat-1",
          movedToSectorId: "mirecoil-beacon",
          encounterCardId: signalStatic.id,
          encounterTitle: signalStatic.title,
          encounterCardType: signalStatic.cardType,
          checkStat: signalStatic.stat,
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: signalStatic.difficulty,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: null,
          summary: "Signal Static occupies the yellow lane."
        }
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");

    expect(server.getState().currentEncounter?.id).toBe("relay-whisper");
    expect(server.getState().sectors.find((sector) => sector.id === "mirecoil-beacon")?.encounterDecks.threat).toEqual([]);
  });

  it("resolves an open shop service as a real transaction", () => {
    const baseState = createState({ sessionMode: "single-player" });
    const server = new GameRoomServer(
      createState({
        ...baseState,
        sessionMode: "single-player",
        phase: "action",
        turnOrder: ["seat-1"],
        activeSeatIndex: 0,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        players: baseState.players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "outer_waymarket",
                character: {
                  ...player.character,
                  currentSpaceId: "outer_waymarket",
                  salvage: 6,
                  heldGear: []
                }
              }
            : player
        ),
        sectors: baseState.sectors.map((sector) =>
          sector.id === "outer_waymarket"
            ? {
                ...sector,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    const sent: Array<Record<string, unknown>> = [];
    const client = createCapturingClient("seat-1", sent);
    server.handleIntent(client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });

    expect(sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    const reveal = server.getState().shopStockReveals.find(
      (entry) => entry.seatId === "seat-1" && entry.sectorId === "outer_waymarket"
    );
    expect(reveal?.stockIds.length).toBeGreaterThan(0);

    const selectedCardId = reveal?.stockIds[0];

    if (!selectedCardId) {
      throw new Error("Expected shop stock reveal to include at least one card");
    }

    server.handleIntent(client, {
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: selectedCardId
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");

    expect(sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    expect(player?.character.salvage).toBe(3);
    expect(player?.character.heldGear).toHaveLength(1);
    expect(server.getState().lastOutcomeSummary?.summary).toMatch(/Bought/i);
    expect(server.getState().eventLog.at(-1)).toMatchObject({
      type: "SHOP_PURCHASE_RESOLVED",
      serviceId: "buy-gear",
      cardId: selectedCardId
    });
  });

  it("covers shop service transactions, affordability gates, and locked-shop rejection", () => {
    const createShopServer = (options: {
      sectorId: string;
      salvage: number;
      heat?: number;
      wounds?: number;
      heldGear?: GearItem[];
      currentEncounterId?: string;
    }) => {
      const baseState = createState({ sessionMode: "single-player" });
      const encounter = options.currentEncounterId ? createThreats().get(options.currentEncounterId) ?? null : null;
      const sent: Array<Record<string, unknown>> = [];
      const server = new GameRoomServer(
        createState({
          ...baseState,
          sessionMode: "single-player",
          phase: "action",
          turnOrder: ["seat-1"],
          activeSeatIndex: 0,
          currentEncounter: encounter,
          pendingEnemyRoll: null,
          pendingEffect: null,
          players: baseState.players.map((player) =>
            player.seatId === "seat-1"
              ? {
                  ...player,
                  sectorId: options.sectorId,
                  private: { ...player.private, notes: [] },
                  character: {
                    ...player.character,
                    currentSpaceId: options.sectorId,
                    salvage: options.salvage,
                    heat: options.heat ?? 0,
                    wounds: options.wounds ?? 0,
                    heldGear: options.heldGear ?? []
                  }
                }
              : player
          )
        }),
        [],
        createSequenceRandomSource([]),
        createThreats(),
        createCharacters(),
        createGear(),
        createContracts()
      );

      return {
        server,
        sent,
        client: createCapturingClient("seat-1", sent)
      };
    };

    const gearCatalog = createGear();
    const veilHook = gearCatalog.get("veil-hook");

    if (!veilHook) {
      throw new Error("Missing veil-hook fixture");
    }

    const sellableVeilHook = { ...veilHook, sellValue: 1 };
    const sold = createShopServer({
      sectorId: "outer_waymarket",
      salvage: 1,
      heldGear: [sellableVeilHook]
    });
    sold.server.handleIntent(sold.client, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: sellableVeilHook.id
    });

    expect(sold.sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    expect(sold.server.getState().players[0]?.character.salvage).toBe(2);
    expect(sold.server.getState().players[0]?.character.heldGear).toEqual([]);

    const repaired = createShopServer({ sectorId: "kettleward-foundry", salvage: 3 });
    repaired.server.handleIntent(repaired.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "repair-gear"
    });

    expect(repaired.sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    expect(repaired.server.getState().players[0]?.character.salvage).toBe(1);
    expect(repaired.server.getState().players[0]?.private.notes.at(-1)).toContain("gear repair");

    const supplied = createShopServer({ sectorId: "kettleward-foundry", salvage: 3 });
    supplied.server.handleIntent(supplied.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-supplies"
    });

    expect(supplied.sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    expect(supplied.server.getState().players[0]?.character.salvage).toBe(2);
    expect(supplied.server.getState().players[0]?.private.notes.at(-1)).toContain("equipment cache");

    const treated = createShopServer({ sectorId: "outer_ember_sanctum", salvage: 4, wounds: 2 });
    treated.server.handleIntent(treated.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-treatment"
    });

    expect(treated.sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    expect(treated.server.getState().players[0]?.character.salvage).toBe(2);
    expect(treated.server.getState().players[0]?.character.wounds).toBe(1);

    const blessed = createShopServer({ sectorId: "outer_ember_sanctum", salvage: 4, heat: 2 });
    blessed.server.handleIntent(blessed.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-boon"
    });

    expect(blessed.sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    expect(blessed.server.getState().players[0]?.character.salvage).toBe(2);
    expect(blessed.server.getState().players[0]?.character.heat).toBe(2);

    const unaffordableService = createShopServer({ sectorId: "kettleward-foundry", salvage: 0 });
    unaffordableService.server.handleIntent(unaffordableService.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "repair-gear"
    });

    expect(unaffordableService.sent.find((message) => message.type === "INTENT_REJECTED")).toMatchObject({
      reason: "insufficientSalvage"
    });

    const unaffordablePurchase = createShopServer({ sectorId: "outer_waymarket", salvage: 0 });
    unaffordablePurchase.server.handleIntent(unaffordablePurchase.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });
    const reveal = unaffordablePurchase.server.getState().shopStockReveals.find((entry) => entry.seatId === "seat-1");
    const selectedCardId = reveal?.stockIds[0];

    if (!selectedCardId) {
      throw new Error("Expected shop stock reveal for affordability test");
    }

    unaffordablePurchase.server.handleIntent(unaffordablePurchase.client, {
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: selectedCardId
    });

    expect(unaffordablePurchase.sent.find((message) => message.type === "INTENT_REJECTED")).toMatchObject({
      reason: "insufficientSalvage"
    });
    expect(unaffordablePurchase.server.getState().players[0]?.character.heldGear).toEqual([]);

    const locked = createShopServer({
      sectorId: "outer_waymarket",
      salvage: 6,
      currentEncounterId: "cinder-veil-stalker"
    });
    locked.server.handleIntent(locked.client, {
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });

    expect(locked.sent.find((message) => message.type === "INTENT_REJECTED")).toMatchObject({
      reason: "shopBlockedByThreat"
    });
  });

  it("renders space-text check rolls through activeResolution", () => {
    const state = createState({
      phase: "action",
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              sectorId: "middle_shard_sprawl",
              character: {
                ...player.character,
                currentSpaceId: "middle_shard_sprawl"
              }
            }
          : player
      ),
      sectors: createState().sectors.map((sector) =>
        sector.id === "sector-a"
          ? {
              ...sector,
              id: "middle_shard_sprawl",
              name: "Shard Sprawl",
              encounterDecks: { ...sector.encounterDecks, threat: [] }
            }
          : sector
      )
    });

    const result = reduceGameState(state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      effectKey: "shard-sprawl-stock",
      summary: "The crossing answers the signal test.",
      effect: { type: "gain_note", text: "Ashwake route stabilized." },
      checkStat: "signal",
      difficulty: 8,
      roll: { faces: [4, 2], total: 6 },
      statBonus: 2,
      total: 8,
      success: true,
      sectorId: "sector-a",
      createdAt: "2026-06-26T00:00:05.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.activeResolution).toMatchObject({
      source: "scenario",
      stage: "roll_result",
      roll: {
        dice: [4, 2],
        finalTotal: 8,
        target: 8,
        success: true
      },
      battle: {
        stat: "signal",
        difficulty: 8
      }
    });
  });

  it("renders scenario progress through activeResolution", () => {
    const baseState = createState({
      phase: "action",
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              sectorId: "center_cinder_gate",
              character: {
                ...player.character,
                currentSpaceId: "center_cinder_gate"
              }
            }
          : player
      )
    });

    const result = reduceGameState(baseState, {
      type: "SCENARIO_PROGRESS_ADVANCED",
      seatId: "seat-1",
      scenarioId: "scenario_broken_seal",
      progressKey: "sealTokens",
      amount: 1,
      summary: "The seal accepts the offering.",
      createdAt: "2026-06-26T00:00:06.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.activeResolution).toMatchObject({
      source: "scenario",
      stage: "outcome_summary",
      outcome: {
        title: "Scenario progress",
        text: "The seal accepts the offering."
      }
    });
  });
});

describe("active objects and table interaction", () => {
  it("shows imported passive Equipment as a named source in battle formula rows", () => {
    const encounter = createThreats().get("cinder-veil-stalker")!;
    const ashlockCleaver = createGear().get("ashlock-cleaver")!;
    const state = createState({
      currentEncounter: encounter,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heldGear: [ashlockCleaver],
                equippedGear: { weapon: ashlockCleaver.id, armor: null, utility: null }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(
      state,
      [],
      createSequenceRandomSource([0, 0, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const enemyRollerSeatId = server.getState().pendingEnemyRoll?.assignedRollerSeatId;

    if (enemyRollerSeatId) {
      runIntent(server, {
        type: "ENEMY_ROLL_REQUESTED",
        seatId: enemyRollerSeatId
      });
    }

    const resolvedCombat = [...server.getState().eventLog].reverse().find((entry) => {
      return (entry as { type?: string }).type === "COMBAT_RESOLVED";
    }) as { statBonus?: number; modifierSources?: Array<{ label: string; value: number }> } | undefined;

    expect(resolvedCombat?.statBonus).toBe(3);
    expect(resolvedCombat?.modifierSources).toEqual(
      expect.arrayContaining([
        { label: "Base Grit", value: 2 },
        { label: "Ashlock Cleaver", value: 1 }
      ])
    );
  });

  it("applies accepted combat item modifiers to the real final total and visible source rows", () => {
    const sent: Array<Record<string, unknown>> = [];
    const encounter = createThreats().get("cinder-veil-stalker")!;
    const blackRouteFuse: GearItem = {
      id: "black-route-fuse",
      name: "Black Route Fuse",
      slot: "weapon",
      category: "dangerous",
      statBonus: { stat: "grit", amount: 1 },
      activeText: "Break for +3 Grit before the battle roll, then advance escalation by 1.",
      useLimit: "discard",
      heatCost: 1
    };
    const state = createState({
      currentEncounter: encounter,
      activeResolution: {
        id: "seat-1:threat:cinder-veil-stalker:test",
        playerId: "seat-1",
        source: "threat",
        stage: "card_reveal",
        card: {
          id: encounter.id,
          title: encounter.title,
          type: encounter.cardType,
          flavor: encounter.flavor,
          artType: "threat"
        }
      },
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heat: 1,
                heldGear: [blackRouteFuse],
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());
    const client = createCapturingClient("seat-1", sent);

    server.handleIntent(client, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "black-route-fuse"
    });

    expect(sent.some((message) => message.type === "INTENT_REJECTED")).toBe(false);
    expect(server.getState().activeResolution?.battle?.modifiers).toContainEqual({ label: "Black Route Fuse", value: 3 });
    expect(server.getState().players[0]?.character.heldGear.some((item) => item.id === "black-route-fuse")).toBe(false);

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const enemyRollerSeatId = server.getState().pendingEnemyRoll?.assignedRollerSeatId;

    if (enemyRollerSeatId) {
      runIntent(server, {
        type: "ENEMY_ROLL_REQUESTED",
        seatId: enemyRollerSeatId
      });
    }

    const resolvedCombat = [...server.getState().eventLog].reverse().find((entry) => {
      return (entry as { type?: string }).type === "COMBAT_RESOLVED";
    }) as { statBonus?: number; total?: number; modifierSources?: Array<{ label: string; value: number }> } | undefined;

    expect(resolvedCombat?.statBonus).toBe(5);
    expect(resolvedCombat?.total).toBe(7);
    expect(resolvedCombat?.modifierSources).toEqual(
      expect.arrayContaining([
        { label: "Base Grit", value: 2 },
        { label: "Black Route Fuse", value: 3 }
      ])
    );

    server.getState().phase = "action";
    server.getState().currentEncounter = encounter;
    server.getState().pendingEnemyRoll = null;
    server.getState().pendingEffect = null;
    server.getState().activeResolution = null;

    const secondCombatStartIndex = server.getState().eventLog.length;

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const secondEnemyRollerSeatId = server.getState().pendingEnemyRoll?.assignedRollerSeatId;

    if (secondEnemyRollerSeatId) {
      runIntent(server, {
        type: "ENEMY_ROLL_REQUESTED",
        seatId: secondEnemyRollerSeatId
      });
    }

    const secondCombat = server.getState().eventLog.slice(secondCombatStartIndex).reverse().find((entry) => {
      return (entry as { type?: string }).type === "COMBAT_RESOLVED";
    }) as { statBonus?: number; modifierSources?: Array<{ label: string; value: number }> } | undefined;

    expect(secondCombat?.statBonus).toBe(2);
    expect(secondCombat?.modifierSources).not.toEqual(expect.arrayContaining([{ label: "Black Route Fuse", value: 3 }]));
  });

  it("rejects combat-only item use outside the battle timing window without changing totals", () => {
    const sent: Array<Record<string, unknown>> = [];
    const blackRouteFuse: GearItem = {
      id: "black-route-fuse",
      name: "Black Route Fuse",
      slot: "weapon",
      category: "dangerous",
      statBonus: { stat: "grit", amount: 1 },
      activeText: "Break for +3 Grit before the battle roll, then advance escalation by 1.",
      useLimit: "discard",
      heatCost: 1
    };
    const state = createState({
      currentEncounter: null,
      activeResolution: null,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heat: 1,
                heldGear: [blackRouteFuse],
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());

    server.handleIntent(createCapturingClient("seat-1", sent), {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "black-route-fuse"
    });

    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("before a battle roll"))).toBe(true);
    expect(server.getState().players[0]?.character.heldGear.some((item) => item.id === "black-route-fuse")).toBe(true);
    expect(server.getState().eventLog.some((entry) => (entry as { type?: string }).type === "USE_GEAR")).toBe(false);
  });

  it("rejects stat-specific combat items during the wrong battle stat", () => {
    const sent: Array<Record<string, unknown>> = [];
    const encounter = {
      ...createThreats().get("cinder-veil-stalker")!,
      stat: "command" as const
    };
    const redMarchWarbell: GearItem = {
      id: "red-march-warbell",
      name: "Red March Warbell",
      slot: "weapon",
      category: "active",
      statBonus: { stat: "grit", amount: 1 },
      activeText: "Gain 1 heat to bank +2 Grit before the battle roll.",
      useLimit: "oncePerTurn"
    };
    const state = createState({
      currentEncounter: encounter,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heat: 0,
                heldGear: [redMarchWarbell],
                equippedGear: { weapon: "red-march-warbell", armor: null, utility: null }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());

    server.handleIntent(createCapturingClient("seat-1", sent), {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "red-march-warbell"
    });

    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("Grit battles"))).toBe(true);
    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("Command"))).toBe(true);
    expect(server.getState().activeResolution?.battle?.modifiers ?? []).not.toContainEqual({ label: "Red March Warbell", value: 2 });
    expect(server.getState().eventLog.some((entry) => (entry as { type?: string }).type === "USE_GEAR")).toBe(false);
  });

  it("keeps passive gear, follower, and permanent stat sources separate in combat math", () => {
    const encounter = {
      ...createThreats().get("cinder-veil-stalker")!,
      stat: "signal" as const
    };
    const rumi: Character = {
      id: "char_rumi",
      name: "Rumi",
      archetype: "Signal Twin",
      currentSpaceId: "sector-a",
      status: "active",
      stats: { command: 1, grit: 1, signal: 4, guile: 1, forge: 1 },
      statUpgrades: { signal: 1 },
      trophies: 0,
      heat: 0,
      wounds: 0,
      scars: [],
      activeContract: null,
      heldGear: [
        {
          id: "tuning-spines",
          name: "Tuning Spines",
          slot: "utility",
          statBonus: { stat: "signal", amount: 1 }
        }
      ],
      equippedGear: { weapon: null, armor: null, utility: "tuning-spines" },
      followers: [
        {
          id: "mira-rift-twin",
          name: "Mira Rift-Twin",
          role: "companion",
          text: "Rumi's rift twin keeps the signal path stable."
        }
      ],
      abilities: []
    };
    const state = createState({
      currentEncounter: encounter,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: rumi
            }
          : player
      )
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(state, "seat-1"),
      [],
      createSequenceRandomSource([0, 0, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });

    const resolvedCombat = [...server.getState().eventLog].reverse().find((entry) => {
      return (entry as { type?: string }).type === "COMBAT_RESOLVED";
    }) as { statBonus?: number; modifierSources?: Array<{ label: string; value: number }> } | undefined;

    expect(resolvedCombat?.statBonus).toBe(7);
    expect(resolvedCombat?.modifierSources).toEqual(
      expect.arrayContaining([
        { label: "Base Signal", value: 3 },
        { label: "Permanent Signal", value: 1 },
        { label: "Tuning Spines", value: 1 },
        { label: "Mira Rift-Twin", value: 1 },
        { label: "Violet Edge", value: 1 }
      ])
    );
  });

  it("uses and discards a consumable gear object from the phone", () => {
    const state = createState({
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                wounds: 1,
                heat: 0,
                heldGear: [
                  {
                    id: "cinder-suture-kit",
                    name: "Cinder Suture Kit",
                    slot: "utility",
                    category: "consumable",
                    statBonus: { stat: "forge", amount: 1 },
                    activeText: "Discard to heal 1 wound, then gain 1 heat.",
                    useLimit: "discard"
                  }
                ],
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(state, "seat-1"),
      [],
      createSequenceRandomSource([0, 0, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "cinder-suture-kit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(0);
    expect(player?.character.heat).toBe(0);
    expect(player?.character.heldGear).toHaveLength(0);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Cinder Suture Kit used");
  });

  it("rejects using once-per-turn gear twice before turn completion", () => {
    const sent: Array<Record<string, unknown>> = [];
    const encounter = createThreats().get("cinder-veil-stalker")!;
    const state = createState({
      currentEncounter: encounter,
      activeResolution: {
        id: "seat-1:threat:cinder-veil-stalker:test",
        playerId: "seat-1",
        source: "threat",
        stage: "card_reveal",
        card: {
          id: encounter.id,
          title: encounter.title,
          type: encounter.cardType,
          flavor: encounter.flavor,
          artType: "threat"
        }
      },
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heat: 0,
                heldGear: [
                  {
                    id: "red-march-warbell",
                    name: "Red March Warbell",
                    slot: "utility",
                    category: "active",
                    statBonus: { stat: "grit", amount: 1 },
                    activeText: "Bank +2 Grit before the battle roll.",
                    useLimit: "oncePerTurn"
                  }
                ],
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(state, "seat-1"),
      [],
      createSequenceRandomSource([0, 0, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );
    const client = createCapturingClient("seat-1", sent);

    server.handleIntent(client, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "red-march-warbell"
    });
    server.handleIntent(client, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "red-march-warbell"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.heat).toBe(0);
    expect(server.getState().activeResolution?.battle?.modifiers).toContainEqual({ label: "Red March Warbell", value: 2 });
    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("already been used this turn"))).toBe(true);

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const resolvedCombat = [...server.getState().eventLog].reverse().find((entry) => {
      return (entry as { type?: string }).type === "COMBAT_RESOLVED";
    }) as { statBonus?: number; total?: number; modifierSources?: Array<{ label: string; value: number }> } | undefined;

    expect(resolvedCombat?.statBonus).toBe(4);
    expect(resolvedCombat?.total).toBe(6);
    expect(resolvedCombat?.modifierSources).toEqual(
      expect.arrayContaining([
        { label: "Base Grit", value: 2 },
        { label: "Red March Warbell", value: 2 }
      ])
    );
  });

  it("rejects Red March Warbell before it can falsely project a battle modifier", () => {
    const sent: Array<Record<string, unknown>> = [];
    const state = createState({
      currentEncounter: null,
      activeResolution: null,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heat: 0,
                heldGear: [
                  {
                    id: "red-march-warbell",
                    name: "Red March Warbell",
                    slot: "utility",
                    category: "active",
                    statBonus: { stat: "grit", amount: 1 },
                    activeText: "Bank +2 Grit before the battle roll.",
                    useLimit: "oncePerTurn"
                  }
                ],
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());
    const client = createCapturingClient("seat-1", sent);

    server.handleIntent(client, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "red-march-warbell"
    });

    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("before a battle roll"))).toBe(true);
    expect(server.getState().eventLog.some((entry) => (entry as { type?: string }).type === "USE_GEAR")).toBe(false);
    expect(server.getState().activeResolution?.battle?.modifiers ?? []).not.toContainEqual({ label: "Red March Warbell", value: 2 });
  });

  it("decrements gear charges and rejects use at zero charges", () => {
    const sent: Array<Record<string, unknown>> = [];
    const state = createState({
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heat: 2,
                heldGear: [
                  {
                    id: "choir-static-censer",
                    name: "Choir Static Censer",
                    slot: "utility",
                    category: "chargedRelic",
                    statBonus: { stat: "signal", amount: 1 },
                    activeText: "Spend 1 charge to steady your scar tremor.",
                    useLimit: "charge",
                    charges: 1
                  }
                ],
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());
    const client = createCapturingClient("seat-1", sent);

    server.handleIntent(client, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "choir-static-censer"
    });
    server.handleIntent(client, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "choir-static-censer"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const censer = player?.character.heldGear.find((item) => item.id === "choir-static-censer");
    const phoneProjection = createPhoneProjection(server.getState(), "seat-1") as {
      objectUseStates?: Array<{ source: string; id: string; remainingUses?: number | null; maxUses?: number | null; disabledReason?: string | null }>;
      playerResultDeltas?: Array<{ type: string; privateText?: string }>;
    };
    const censerUseState = phoneProjection.objectUseStates?.find((entry) => entry.source === "gear" && entry.id === "choir-static-censer");
    expect(player?.character.heat).toBe(2);
    expect(censer?.charges).toBe(0);
    expect(censerUseState).toMatchObject({
      remainingUses: 0,
      maxUses: 1,
      disabledReason: "Choir Static Censer has no charges remaining."
    });
    expect(phoneProjection.playerResultDeltas?.some((delta) => delta.type === "modifierApplied" && delta.privateText?.includes("accepted by server"))).toBe(true);
    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("no charges"))).toBe(true);
  });

  it("uses a follower active effect from the phone", () => {
    const follower: Follower = {
      id: "crownless-advocate",
      name: "Crownless Advocate",
      role: "informant",
      text: "Soften a faction demand.",
      activeEffect: { type: "lose_heat", amount: 1 },
      useLimit: "oncePerRound",
      loyalty: 3,
      lossCondition: "choice"
    };
    const state = createState({
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heat: 2,
                followers: [follower]
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());

    runIntent(server, {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: "crownless-advocate"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.heat).toBe(2);
    expect(player?.character.followers).toHaveLength(1);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Crownless Advocate used");
  });

  it("rejects passive-only follower use instead of synthesizing a phone-only action", () => {
    const sent: Array<Record<string, unknown>> = [];
    const passiveFollower: Follower = {
      id: "grave-medic-korr",
      name: "Grave Medic Korr",
      role: "medic",
      text: "Passive: patch wounds after the dust settles.",
      loyalty: 2,
      lossCondition: "choice"
    };
    const state = createState({
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                heat: 2,
                followers: [passiveFollower]
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());

    server.handleIntent(createCapturingClient("seat-1", sent), {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: "grave-medic-korr"
    });

    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("passive and applies automatically"))).toBe(true);
    expect(server.getState().eventLog.some((entry) => (entry as { type?: string }).type === "USE_FOLLOWER")).toBe(false);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(2);
  });

  it("keeps Fandiablos unique across the whole game", () => {
    const fandiablos = createFandiablos();
    const state = createState({
      phase: "action",
      activeSeatIndex: 1,
      sectors: [
        {
          id: "ashwake-crossing",
          name: "Ashwake Crossing",
          regionTier: "borderlight",
          neighbors: [],
          danger: 1,
          encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
        }
      ],
      players: createState().players.map((player) => ({
        ...player,
        sectorId: "ashwake-crossing",
        character: {
          ...player.character,
          currentSpaceId: "ashwake-crossing",
          followers: player.seatId === "seat-1" ? [fandiablos] : []
        }
      }))
    });

    const result = reduceGameState(state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-2",
      effectKey: "test_gain_fandiablos",
      summary: "A second flock tries to answer the whistle.",
      effect: {
        type: "gain_follower",
        followerId: "fandiablos",
        follower: fandiablos
      },
      createdAt: new Date().toISOString()
    });

    expect(result.ok).toBe(true);
    expect(result.state.players.find((player) => player.seatId === "seat-1")?.character.followers).toHaveLength(1);
    expect(result.state.players.find((player) => player.seatId === "seat-2")?.character.followers).toHaveLength(0);
  });

  it("uses Warning Barks to reveal one local threat without leaking the deck order", () => {
    const fandiablos = createFandiablos();
    const state = createState({
      phase: "sector",
      sectors: createState().sectors.map((sector) =>
        sector.id === "sector-a"
          ? {
              ...sector,
              encounterDecks: { ...sector.encounterDecks, threat: ["cinder-veil-stalker", "signal-static", "relay-whisper"] }
            }
          : sector
      ),
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                followers: [fandiablos]
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 0]), createThreats(), createCharacters(), createGear(), createContracts());

    runIntent(server, {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: "fandiablos"
    });

    const notes = server.getState().players.find((player) => player.seatId === "seat-1")?.private.notes ?? [];
    expect(notes.join(" ")).toContain("Cinder-Veil Stalker");
    expect(notes.join(" ")).not.toContain("Relay Whisper");
    expect(server.getState().currentEncounter?.id).toBe("cinder-veil-stalker");
    expect(server.getState().sectors.find((sector) => sector.id === "sector-a")?.encounterDecks.threat).toEqual([
      "signal-static",
      "relay-whisper"
    ]);
  });

  it("adds Swarm of Tiny Teeth to the real Grit battle total", () => {
    const fandiablos = createFandiablos();
    const state = createState({
      currentEncounter: createThreats().get("cinder-veil-stalker") ?? null,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                followers: [fandiablos]
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(state, "seat-1"),
      [],
      createSequenceRandomSource([5, 0, 0, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: "fandiablos"
    });
    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const resolvedCombat = [...server.getState().eventLog].reverse().find((entry) => {
      return (entry as { type?: string }).type === "COMBAT_RESOLVED";
    }) as { statBonus?: number; success?: boolean } | undefined;

    expect(resolvedCombat?.statBonus).toBe(5);
    expect(resolvedCombat?.success).toBe(false);
  });

  it("adds Cable Biters only to Forge or Guile machine/trap/salvage checks", () => {
    const fandiablos = createFandiablos();
    const threats = createThreats();
    threats.set("machine-lock", {
      id: "machine-lock",
      type: "threat",
      cardType: "hazard",
      title: "Machine Lock",
      text: "A chewing-grade lock blocks the salvage hatch.",
      flavor: "It was not built with tiny teeth in mind.",
      severity: 2,
      stat: "forge",
      difficulty: 4,
      successEffect: { type: "gain_note", text: "Machine lock opened." },
      failEffect: { type: "gain_heat", amount: 1 }
    });
    const state = createState({
      currentEncounter: threats.get("machine-lock") ?? null,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                followers: [fandiablos]
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(state, "seat-1"),
      [],
      createSequenceRandomSource([5, 0, 0]),
      threats,
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: "fandiablos"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "forge"
    });

    const resolvedCheck = [...server.getState().eventLog].reverse().find((entry) => {
      return (entry as { type?: string }).type === "CHECK_ROLLED";
    }) as { statBonus?: number; success?: boolean } | undefined;

    expect(resolvedCheck?.statBonus).toBe(3);
    expect(resolvedCheck?.success).toBe(true);
  });

  it("can prevent the first wound loss in a round with Unreasonable Courage", () => {
    const fandiablos = createFandiablos();
    const state = createState({
      currentEncounter: createThreats().get("cinder-veil-stalker") ?? null,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                followers: [fandiablos]
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(state, "seat-1"),
      [],
      createSequenceRandomSource([0, 0, 5, 5, 3]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(0);
    expect(player?.private.notes.join(" ")).toContain("Fandiablos Unreasonable Courage rolled 4");
  });

  it("triggers Too Many Dogs safely as a legacy pressure no-op on a chaos roll of 1", () => {
    const fandiablos = createFandiablos();
    const state = createState({
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                followers: [fandiablos]
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());

    runIntent(server, {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: "fandiablos"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.heat).toBe(0);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Too Many Dogs");
  });

  it("rejects repeated harmful rivalry pressure against the same target in one round", () => {
    const sent: Array<Record<string, unknown>> = [];
    const state = createState({
      interactionMode: "rivalry",
      eventLog: [
        {
          type: "TABLE_INTERACTION",
          seatId: "seat-3",
          targetSeatId: "seat-2",
          interactionKind: "duel",
          effect: null,
          targetEffect: { type: "gain_heat", amount: 1 },
          summary: "Prior bounded duel.",
          createdAt: new Date().toISOString()
        }
      ]
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());

    server.handleIntent(createCapturingClient("seat-1", sent), {
      type: "TABLE_INTERACTION",
      seatId: "seat-1",
      targetSeatId: "seat-2",
      interactionKind: "interfere"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-2")?.character.heat).toBe(0);
    expect(sent.some((message) => message.type === "INTENT_REJECTED")).toBe(true);
  });

  it("rejects duel and interfere actions in co-op mode", () => {
    const sent: Array<Record<string, unknown>> = [];
    const server = new GameRoomServer(
      createState({ interactionMode: "co-op" }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.handleIntent(createCapturingClient("seat-1", sent), {
      type: "TABLE_INTERACTION",
      seatId: "seat-1",
      targetSeatId: "seat-2",
      interactionKind: "duel"
    });

    expect(server.getState().eventLog.some((event) => (event as { type?: string }).type === "TABLE_INTERACTION")).toBe(false);
    expect(sent.some((message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("Co-op mode"))).toBe(true);
  });

  it("allows duel actions in rivalry mode when the target has not been pressured this round", () => {
    const sent: Array<Record<string, unknown>> = [];
    const server = new GameRoomServer(
      createState({ interactionMode: "rivalry" }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.handleIntent(createCapturingClient("seat-1", sent), {
      type: "TABLE_INTERACTION",
      seatId: "seat-1",
      targetSeatId: "seat-2",
      interactionKind: "duel"
    });

    expect(sent.some((message) => message.type === "INTENT_REJECTED")).toBe(false);
    expect(server.getState().eventLog.some((event) => (event as { type?: string }).type === "TABLE_INTERACTION")).toBe(true);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("bounded rivalry");
  });
});

describe("threat effect keys", () => {
  it("applies a reveal effect key when a threat is drawn", () => {
    const threats = createThreats();
    threats.set("keyed-rats", {
      id: "keyed-rats",
      type: "threat",
      cardType: "hazard",
      title: "Keyed Rats",
      text: "A keyed reveal test threat.",
      flavor: "The rats know the route.",
      severity: 1,
      effectKey: "threat_heat_on_reveal",
      stat: "grit",
      difficulty: 4,
      successEffect: { type: "gain_note", text: "Safe." },
      failEffect: { type: "gain_heat", amount: 1 }
    });
    const state = createState({
      phase: "sector",
      sectors: createState().sectors.map((sector) =>
        sector.id === "sector-a"
          ? {
              ...sector,
              encounterDecks: { ...sector.encounterDecks, threat: ["keyed-rats"] }
            }
          : sector
      ),
      lastOutcomeSummary: {
        seatId: "seat-1",
        movedToSectorId: "sector-a",
        encounterCardId: null,
        encounterTitle: null,
        encounterCardType: null,
        checkStat: null,
        die1: null,
        die2: null,
        statBonus: null,
        checkTotal: null,
        difficulty: null,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: null,
        summary: "Moved into sector-a."
      }
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), threats, createCharacters(), createGear(), createContracts());

    (server as any).runAutomaticPhases("seat-1");

    expect(server.getState().currentEncounter?.id).toBe("keyed-rats");
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Legacy pressure");
  });

  it("applies table-wide and escalation reveal effect keys", () => {
    const heatedThreats = createThreats();
    heatedThreats.set("keyed-broadcast", {
      id: "keyed-broadcast",
      type: "threat",
      cardType: "hazard",
      title: "Keyed Broadcast",
      text: "A keyed table-wide reveal test threat.",
      flavor: "The signal names everyone at once.",
      severity: 3,
      revealEffectKey: "threat_all_heat_on_reveal",
      stat: "signal",
      difficulty: 6,
      successEffect: { type: "gain_note", text: "Safe." },
      failEffect: { type: "gain_heat", amount: 1 }
    });
    const heatedState = createState({
      phase: "sector",
      sectors: createState().sectors.map((sector) =>
        sector.id === "sector-a"
          ? {
              ...sector,
              encounterDecks: { ...sector.encounterDecks, threat: ["keyed-broadcast"] }
            }
          : sector
      ),
      lastOutcomeSummary: {
        seatId: "seat-1",
        movedToSectorId: "sector-a",
        encounterCardId: null,
        encounterTitle: null,
        encounterCardType: null,
        checkStat: null,
        die1: null,
        die2: null,
        statBonus: null,
        checkTotal: null,
        difficulty: null,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: null,
        summary: "Moved into sector-a."
      }
    });
    const heatedServer = new GameRoomServer(
      heatedState,
      [],
      createSequenceRandomSource([0]),
      heatedThreats,
      createCharacters(),
      createGear(),
      createContracts()
    );

    (heatedServer as any).runAutomaticPhases("seat-1");

    expect(heatedServer.getState().players.every((entry) => entry.character.heat === 0)).toBe(true);
    expect(heatedServer.getState().lastOutcomeSummary?.summary).toContain("Legacy pressure");

    const escalatedThreats = createThreats();
    escalatedThreats.set("keyed-bell", {
      id: "keyed-bell",
      type: "threat",
      cardType: "hazard",
      title: "Keyed Bell",
      text: "A keyed escalation reveal test threat.",
      flavor: "The bell rings downward.",
      severity: 4,
      revealEffectKey: "threat_escalate_on_reveal",
      stat: "signal",
      difficulty: 7,
      successEffect: { type: "gain_note", text: "Safe." },
      failEffect: { type: "gain_heat", amount: 1 }
    });
    const escalatedState = createState({
      phase: "sector",
      sectors: createState().sectors.map((sector) =>
        sector.id === "sector-a"
          ? {
              ...sector,
              encounterDecks: { ...sector.encounterDecks, threat: ["keyed-bell"] }
            }
          : sector
      ),
      lastOutcomeSummary: heatedState.lastOutcomeSummary
    });
    const escalatedServer = new GameRoomServer(
      escalatedState,
      [],
      createSequenceRandomSource([0]),
      escalatedThreats,
      createCharacters(),
      createGear(),
      createContracts()
    );

    (escalatedServer as any).runAutomaticPhases("seat-1");

    expect(escalatedServer.getState().escalationLevel).toBe(1);
    expect(escalatedServer.getState().lastOutcomeSummary?.summary).toContain("advance escalation by 1");
  });

  it("combines direct failure effects with a keyed failure effect", () => {
    const threats = createThreats();
    threats.set("keyed-snare", {
      id: "keyed-snare",
      type: "threat",
      cardType: "hazard",
      title: "Keyed Snare",
      text: "A keyed failure test threat.",
      flavor: "The snare is very sure of itself.",
      severity: 2,
      stat: "grit",
      difficulty: 12,
      successEffect: { type: "gain_note", text: "Safe." },
      failEffectKey: "threat_fail_take_wound",
      failEffect: { type: "gain_heat", amount: 1 }
    });
    const state = createState({
      currentEncounter: threats.get("keyed-snare") ?? null,
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                stats: { ...player.character.stats, grit: 0 }
              }
            }
          : player
      )
    });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0]), threats, createCharacters(), createGear(), createContracts());

    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.heat).toBe(0);
    expect(player?.character.wounds).toBe(1);
  });
});

describe("movement rolls", () => {
  it("stores a movement roll for the active seat", () => {
    const result = reduceGameState(createState({ phase: "navigation" }), {
      type: "MOVEMENT_ROLLED",
      seatId: "seat-1",
      movementValue: 4,
      roll: { faces: [4], total: 4 },
      createdAt: new Date().toISOString()
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.state.movementRolls?.["seat-1"] : null).toBe(4);
  });

  it("waits for an explicit movement roll when the session enters navigation", () => {
    const state = createState({
      status: "lobby",
      phase: "start",
      turnOrder: [],
      seats: [
        {
          seatId: "seat-1",
          characterId: "void-marshal",
          displayName: "Seat One",
          startingContractOptions: ["choir-hush-census", "compact-cleanse-ledger", "contract-beacon"],
          selectedStartingContractId: "choir-hush-census",
          connected: true,
          ready: true,
          kicked: false,
          joinToken: "seat:session-alpha:seat-1"
        },
        {
          seatId: "seat-2",
          characterId: "signal-witch",
          displayName: "Seat Two",
          startingContractOptions: ["compact-cleanse-ledger", "contract-beacon", "contract-lantern-run"],
          selectedStartingContractId: "compact-cleanse-ledger",
          connected: true,
          ready: true,
          kicked: false,
          joinToken: "seat:session-alpha:seat-2"
        },
        {
          seatId: "seat-3",
          characterId: "grave-engineer",
          displayName: "Seat Three",
          startingContractOptions: ["contract-beacon", "contract-lantern-run", "cartel-crossing-thread"],
          selectedStartingContractId: "contract-beacon",
          connected: true,
          ready: true,
          kicked: false,
          joinToken: "seat:session-alpha:seat-3"
        }
      ],
      movementRolls: undefined
    });
    const server = new GameRoomServer(
      state,
      [],
      createSequenceRandomSource([2]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.startSession();

    const started = server.getState();
    const tvProjection = createTvProjection(started) as {
      movementPlanner?: { movementValue: number } | null;
    };

    expect(started.phase).toBe("navigation");
    expect(started.movementRolls?.["seat-1"]).toBeUndefined();
    expect(tvProjection.movementPlanner).toBeNull();

    runIntent(server, {
      type: "MOVEMENT_ROLL_REQUESTED",
      seatId: "seat-1"
    });

    const rolled = server.getState();
    const rolledProjection = createTvProjection(rolled) as {
      movementPlanner?: { movementValue: number } | null;
    };

    expect(rolled.movementRolls?.["seat-1"]).toBe(3);
    expect(rolledProjection.movementPlanner?.movementValue).toBe(3);
  });

  it("uses stored movement rolls for longer legal destinations and clears them after movement resolves", () => {
    const baseState = createState({ phase: "navigation" });
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        movementRolls: { "seat-1": 2 },
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                danger: 1,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    const phoneProjection = createPhoneProjection(server.getState(), "seat-1") as {
      movementPlanner?: { movementValue: number } | null;
    };

    expect(phoneProjection.movementPlanner?.movementValue).toBe(2);

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-c"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.currentSpaceId).toBe("sector-c");
    expect(server.getState().movementRolls?.["seat-1"]).toBeUndefined();
  });

  it("clears the previous player's movement roll when the turn advances", () => {
    const result = reduceGameState(
      createState({
        phase: "broadcast",
        movementRolls: { "seat-1": 5 }
      }),
      {
        type: "TURN_COMPLETED",
        seatId: "seat-1",
        createdAt: new Date().toISOString()
      }
    );

    expect(result.ok).toBe(true);
    expect(result.ok ? result.state.activeSeatIndex : null).toBe(1);
    expect(result.ok ? result.state.movementRolls?.["seat-1"] : null).toBeUndefined();
  });

  it("succeeds against a low-danger node without changing legacy heat", () => {
    const baseState = createState({ phase: "navigation" });
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 1,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.getState().movementRolls = { "seat-1": 1 };

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const summary = server.getState().lastOutcomeSummary;

    expect(player?.character.currentSpaceId).toBe("sector-b");
    expect(player?.character.heat).toBe(0);
    expect(summary?.checkStat).toBe("guile");
    expect(summary?.difficulty).toBe(1);
    expect(summary?.success).toBe(true);
    expect(summary?.die1).toBe(1);
    expect(summary?.die2).toBe(1);
  });

  it("leaves the operative in place on a failed roll without applying legacy heat", () => {
    const baseState = createState({ phase: "navigation" });
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 8,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.getState().movementRolls = { "seat-1": 1 };

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const summary = server.getState().lastOutcomeSummary;

    expect(player?.character.currentSpaceId).toBe("sector-a");
    expect(player?.sectorId).toBe("sector-a");
    expect(player?.character.heat).toBe(0);
    expect(summary?.movedToSectorId).toBe("sector-a");
    expect(summary?.success).toBe(false);
    expect(summary?.difficulty).toBe(8);
    expect(summary?.summary).toContain("Failed to enter");
  });

  it("does not allow movement to fail in single-player mode", () => {
    const baseState = createState({ phase: "navigation", sessionMode: "single-player" });
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        sessionMode: "single-player",
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 10,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.getState().movementRolls = { "seat-1": 1 };

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const summary = server.getState().lastOutcomeSummary;

    expect(player?.character.currentSpaceId).toBe("sector-b");
    expect(player?.sectorId).toBe("sector-b");
    expect(player?.character.heat).toBe(0);
    expect(summary?.success).toBe(true);
    expect(summary?.movedToSectorId).toBe("sector-b");
    expect(summary?.summary).toContain("Moved into");
  });

  it("does not allow movement to fail in a one-player multiplayer room", () => {
    const baseState = createState({ phase: "navigation" });
    const onePlayerState = createState({
      phase: "navigation",
      turnOrder: ["seat-1"],
      seats: baseState.seats.filter((seat) => seat.seatId === "seat-1"),
      players: baseState.players.filter((player) => player.seatId === "seat-1"),
      sectors: baseState.sectors.map((sector) =>
        sector.id === "sector-b"
          ? {
              ...sector,
              danger: 10,
              encounterDecks: { ...sector.encounterDecks, threat: [] }
            }
          : sector
      )
    });
    const server = new GameRoomServer(
      onePlayerState,
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.getState().movementRolls = { "seat-1": 1 };

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const summary = server.getState().lastOutcomeSummary;

    expect(player?.character.currentSpaceId).toBe("sector-b");
    expect(player?.character.heat).toBe(0);
    expect(summary?.success).toBe(true);
    expect(summary?.difficulty).toBe(summary?.checkTotal);
  });

  it("rejects forged movement resolution with a mismatched origin", () => {
    const state = createState({ phase: "navigation" });
    const result = reduceGameState(state, {
      type: "MOVEMENT_RESOLVED",
      seatId: "seat-1",
      fromSectorId: "sector-b",
      toSectorId: "sector-c",
      stat: "guile",
      difficulty: 1,
      roll: { faces: [6, 6], total: 12 },
      statBonus: 0,
      total: 12,
      success: true,
      effect: null,
      createdAt: new Date().toISOString()
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.rejection.reason).toContain("does not match current sector");
    expect(result.state.players.find((player) => player.seatId === "seat-1")?.character.currentSpaceId).toBe("sector-a");
  });

  it("rejects forged movement resolution to a non-neighbor", () => {
    const state = createState({ phase: "navigation", movementRolls: { "seat-1": 1 } });
    const result = reduceGameState(state, {
      type: "MOVEMENT_RESOLVED",
      seatId: "seat-1",
      fromSectorId: "sector-a",
      toSectorId: "sector-c",
      stat: "guile",
      difficulty: 1,
      roll: { faces: [6, 6], total: 12 },
      statBonus: 0,
      total: 12,
      success: true,
      effect: null,
      createdAt: new Date().toISOString()
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.rejection.reason).toContain("not reachable");
    expect(result.state.players.find((player) => player.seatId === "seat-1")?.character.currentSpaceId).toBe("sector-a");
  });

  it("does not trigger recall from deprecated failed movement pressure", () => {
    const baseState = createState({ phase: "navigation" });
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        heatThreshold: 2,
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 8,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        ),
        players: baseState.players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  heat: 1
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.getState().movementRolls = { "seat-1": 1 };

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });
    endBroadcastTurn(server);

    const seat1 = server.getState().players.find((entry) => entry.seatId === "seat-1");

    expect(seat1?.character.currentSpaceId).toBe("sector-a");
    expect(seat1?.character.heat).toBe(1);
    expect(seat1?.character.status).toBe("active");
    expect(server.getState().activeSeatIndex).toBe(1);
    expect(server.getState().phase).toBe("navigation");
    expect(server.getState().currentEncounter).toBeNull();
  });
});

describe("wound recall flow", () => {
  it("does not recall a seat while wounds stay below threshold", () => {
    const enemy = createThreats().get("cinder-veil-stalker");

    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: enemy ?? null,
          players: createState().players.map((entry) =>
            entry.seatId === "seat-1"
              ? {
                  ...entry,
                  character: {
                    ...entry.character,
                    wounds: 1
                  }
                }
              : entry
          )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0, 0, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(2);
    expect(player?.character.status).toBe("active");
    expect(player?.character.scars).toEqual([]);
  });

  it("recalls and scars a seat when wounds reach threshold", () => {
    const enemy = createThreats().get("cinder-veil-stalker");

    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          woundThreshold: 2,
          currentEncounter: enemy ?? null,
          players: createState().players.map((entry) =>
            entry.seatId === "seat-1"
              ? {
                  ...entry,
                  character: {
                    ...entry.character,
                    wounds: 1
                  }
                }
              : entry
          )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0, 0, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(2);
    expect(player?.character.status).toBe("recalled");
    expect(player?.character.scars).toContain("scar-wound-1");
  });

  it("blocks move, check, and combat until a recalled seat recruits a replacement", () => {
    const enemy = createThreats().get("cinder-veil-stalker");
    const client = {
      seatId: "seat-1",
      view: "phone" as const,
      socket: {
        send: vi.fn(),
        close: vi.fn()
      }
    };
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: enemy ?? null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  status: "recalled"
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.handleIntent(client as never, { type: "MOVE_REQUESTED", seatId: "seat-1", toSectorId: "sector-b" });
    server.handleIntent(client as never, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });
    server.handleIntent(client as never, { type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "grit" });

    const payloads = client.socket.send.mock.calls.map((call) => String(call[0]));
    expect(payloads).toHaveLength(3);
    expect(payloads.every((payload) => payload.includes("INTENT_REJECTED"))).toBe(true);
    expect(payloads.every((payload) => payload.includes("must recruit a replacement before acting"))).toBe(true);
  });

  it("recruits a replacement with heat and wounds reset while keeping earned scars", () => {
    const server = new GameRoomServer(
      createState({
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  heat: 2,
                  wounds: 3,
                  status: "recalled",
                  scars: ["scar-wound-1"]
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RECRUIT_REPLACEMENT",
      seatId: "seat-1",
      replacementCharacterId: "signal-witch"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.status).toBe("active");
    expect(player?.character.heat).toBe(0);
    expect(player?.character.wounds).toBe(0);
    expect(player?.character.scars).toContain("scar-wound-1");
    expect(player?.character.id).toBe("signal-witch");
  });
});

describe("escalation flow", () => {
  it("does not advance escalation until the turn order wraps", () => {
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: null
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().activeSeatIndex).toBe(1);
    expect(server.getState().escalationLevel).toBe(0);
  });

  it("advances escalation when the turn order wraps back to the first seat", () => {
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          phase: "action",
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: createState().seats.slice(0, 1),
          players: createState().players.slice(0, 1)
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, { type: "PHASE_ADVANCED", seatId: "seat-1", toPhase: "resolution" });

    expect(server.getState().escalationLevel).toBe(1);
  });

  it("applies the escalation modifier to movement and encounter difficulty", () => {
    const moveServer = new GameRoomServer(
      createState({
        phase: "navigation",
        escalationLevel: 2,
        sectors: createState({ phase: "navigation" }).sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                danger: 2,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    moveServer.getState().movementRolls = { "seat-1": 1 };

    runIntent(moveServer, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    expect(moveServer.getState().lastOutcomeSummary?.difficulty).toBe(3);

    const checkServer = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          escalationLevel: 2,
          currentEncounter: createThreats().get("signal-static") ?? null
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(checkServer, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });

    const checkRolledEvent = [...checkServer.getState().eventLog]
      .reverse()
      .find((entry): entry is { type: "CHECK_ROLLED"; difficulty: number } => {
        return Boolean(entry && typeof entry === "object" && "type" in entry && (entry as { type?: string }).type === "CHECK_ROLLED");
      });

    expect(checkRolledEvent?.difficulty).toBe(8);
  });

  it("ends the game with no winner when escalation reaches collapse", () => {
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          phase: "action",
          escalationLevel: 5,
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: createState().seats.slice(0, 1),
          players: createState().players.slice(0, 1)
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().status).toBe("ended");
    expect(server.getState().winnerSeatId).toBeNull();
    expect(server.getState().phase).toBe("broadcast");
    expect(server.getState().escalationLevel).toBe(6);
  });

  it("gives single-player sessions a higher escalation collapse threshold", () => {
    const soloBase = createState({
      sessionMode: "single-player",
      phase: "action",
      escalationLevel: 6,
      currentEncounter: null,
      turnOrder: ["seat-1"],
      seats: createState().seats.slice(0, 1),
      players: createState().players.slice(0, 1)
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(soloBase, "seat-1"),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().status).toBe("active");
    expect(server.getState().escalationLevel).toBe(7);
  });

  it("lets the Cinder Monk blunt the first escalation spike on their turn", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "cinder-monk" }],
          players: [
            {
              ...createState().players[0]!,
              character: {
                ...cloneCharacter(characters.get("cinder-monk")),
                currentSpaceId: "sector-a"
              }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().escalationLevel).toBe(0);
  });

  it("lets the Cinder Monk turn a cleared Emberwatch line into an Ash Psalm vow note", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "emberwatch-step",
                character: {
                  ...cloneCharacter(characters.get("cinder-monk")),
                  currentSpaceId: "emberwatch-step",
                  heat: 1
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "cinder-monk" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                id: "emberwatch-step",
                name: "Emberwatch Step",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(1);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Ash Psalm hardened the cleared line into a disciplined hold."
    );
  });

  it("lets Ember Vigil steady the Cinder Monk at the start of a dangerous turn", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          escalationLevel: 1,
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "cinder-monk" }],
          players: [
            {
              ...createState().players[0]!,
              sectorId: "sector-c",
              character: {
                ...cloneCharacter(characters.get("cinder-monk")),
                currentSpaceId: "sector-c",
                heat: 1
              }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.character.wounds).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ember Vigil kept the dangerous sector from dictating the tempo."
    );
  });

  it("lets Choir Lash mark a route note when escalation spikes on the Signal Witch's turn", () => {
    const characters = createCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "signal-witch" }],
          players: [
            {
              ...createState().players[0]!,
              character: {
                ...cloneCharacter(characters.get("signal-witch")),
                currentSpaceId: "sector-a",
                heat: 1
              }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().escalationLevel).toBe(1);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(1);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Choir Lash bled the breach spike into a controlled pulse."
    );
  });

  it("feeds escalation from wounds taken during resolution effects", () => {
    const baseState = createState({
      phase: "action",
      currentEncounter: null,
      pendingEnemyRoll: null,
      pendingEffect: null,
      turnOrder: ["seat-1"],
      activeSeatIndex: 0
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        {
          ...baseState,
          seats: baseState.seats.slice(0, 1),
          players: baseState.players.slice(0, 1).map((player) => ({
            ...player,
            sectorId: "center_cinder_gate",
            character: {
              ...player.character,
              currentSpaceId: "center_cinder_gate"
            }
          }))
        },
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { applyAction: (action: GameAction) => void }).applyAction({
      type: "SCENARIO_PROGRESS_ADVANCED",
      seatId: "seat-1",
      scenarioId: "scenario_broken_seal",
      progressKey: "sealRestorationMarks",
      amount: 0,
      effect: { type: "take_wound", amount: 2 },
      summary: "The breach lashes back.",
      createdAt: new Date().toISOString()
    });

    expect(server.getState().players[0]?.character.wounds).toBe(2);
    expect(server.getState().escalationLevel).toBe(2);
  });

  it("lets Cold Brace shave a wound-driven escalation spike for the Grave Engineer", () => {
    const characters = createCharacters();
    const baseState = createState({
      phase: "action",
      currentEncounter: null,
      pendingEnemyRoll: null,
      pendingEffect: null,
      turnOrder: ["seat-1"],
      activeSeatIndex: 0,
      seats: [{ ...createState().seats[0]!, characterId: "grave-engineer" }],
      players: [
        {
          ...createState().players[0]!,
          sectorId: "center_cinder_gate",
          character: {
            ...cloneCharacter(characters.get("grave-engineer")),
            currentSpaceId: "center_cinder_gate"
          }
        }
      ]
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(baseState, "seat-1"),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    (server as unknown as { applyAction: (action: GameAction) => void }).applyAction({
      type: "SCENARIO_PROGRESS_ADVANCED",
      seatId: "seat-1",
      scenarioId: "scenario_broken_seal",
      progressKey: "sealRestorationMarks",
      amount: 0,
      effect: { type: "take_wound", amount: 2 },
      summary: "The breach lashes back.",
      createdAt: new Date().toISOString()
    });

    expect(server.getState().players[0]?.character.wounds).toBe(2);
    expect(server.getState().escalationLevel).toBe(1);
    expect(server.getState().players[0]?.private.notes).not.toContain("Cold Brace absorbed part of the spike.");
    expect(
      server
        .getState()
        .eventLog.some(
          (entry) =>
            Boolean(
              entry &&
                typeof entry === "object" &&
                "type" in entry &&
                (entry as { type?: string; abilityId?: string }).type === "ABILITY_TRIGGERED" &&
                (entry as { abilityId?: string }).abilityId === "cold-brace"
            )
        )
    ).toBe(true);
  });

  it("collapses the session when a wound feeder pushes escalation to threshold", () => {
    const baseState = createState({
      phase: "action",
      escalationLevel: 5,
      currentEncounter: null,
      pendingEnemyRoll: null,
      pendingEffect: null,
      turnOrder: ["seat-1"],
      activeSeatIndex: 0
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        {
          ...baseState,
          seats: baseState.seats.slice(0, 1),
          players: baseState.players.slice(0, 1).map((player) => ({
            ...player,
            sectorId: "center_cinder_gate",
            character: {
              ...player.character,
              currentSpaceId: "center_cinder_gate"
            }
          }))
        },
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    (server as unknown as { applyAction: (action: GameAction) => void }).applyAction({
      type: "SCENARIO_PROGRESS_ADVANCED",
      seatId: "seat-1",
      scenarioId: "scenario_broken_seal",
      progressKey: "sealRestorationMarks",
      amount: 0,
      effect: { type: "take_wound", amount: 1 },
      summary: "The breach breaks through.",
      createdAt: new Date().toISOString()
    });

    expect(server.getState().escalationLevel).toBe(6);
    expect(server.getState().status).toBe("ended");
    expect(server.getState().winnerSeatId).toBeNull();
  });

  it("lets the active seat stabilize the breach and clamps escalation at zero", () => {
    const baseState = createState({
      phase: "action",
      currentEncounter: null,
      pendingEnemyRoll: null,
      pendingEffect: null,
      escalationLevel: 1
    });
    const server = new GameRoomServer(
      {
        ...baseState,
        activeSeatIndex: 0
      },
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "STABILIZE_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().activeSeatIndex).toBe(1);
  });

  it("resolves clear sector text from the action phase with its authored skill check", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "ashwake-crossing",
                name: "Ashwake Crossing",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        ).map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                neighbors: ["ashwake-crossing", "sector-c"]
              }
            : sector
        )
        ,
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "ashwake-crossing",
                character: {
                  ...player.character,
                  currentSpaceId: "ashwake-crossing"
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });
    endBroadcastTurn(server);

    expect(server.getState().players[0]?.private.notes).toContain("Ashwake crossing cleared. The convoy lane is charted.");
    expect(server.getState().phase).toBe("navigation");
  });

  it("applies the authored failure branch when clear sector text fails its board check", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "ashwake-crossing",
                name: "Ashwake Crossing",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        ),
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "ashwake-crossing",
                character: {
                  ...player.character,
                  currentSpaceId: "ashwake-crossing"
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.private.notes).not.toContain("Ashwake crossing cleared. The convoy lane is charted.");
    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain("Void Command marked the cleared lane for allied movement.");
  });

  it("requires an authored choice before resolving Shard Sprawl sector text", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "middle_shard_sprawl",
                name: "Shard Sprawl",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        ),
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "middle_shard_sprawl",
                character: {
                  ...player.character,
                  currentSpaceId: "middle_shard_sprawl"
                }
              }
            : player
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().phase).toBe("action");
    expect(server.getState().players[0]?.private.notes).not.toContain(
      "Shard Sprawl passage stock secured for the next route push."
    );
  });

  it("resolves the selected Shard Sprawl sector-text choice and applies its authored effect", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "middle_shard_sprawl",
                character: {
                  ...player.character,
                  heat: 2,
                  currentSpaceId: "middle_shard_sprawl"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "middle_shard_sprawl",
                name: "Shard Sprawl",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1",
      choiceId: "stock"
    });

    expect(server.getState().players[0]?.character.heat).toBe(2);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Shard Sprawl passage stock secured for the next route push."
    );
    expect(server.getState().players[0]?.private.notes).toContain("Void Command marked the cleared lane for allied movement.");
  });

  it("discovers a local Mirecoil contract through sector text and adds it to the live contract pool", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        availableContracts: [],
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "mirecoil-beacon",
                character: {
                  ...player.character,
                  currentSpaceId: "mirecoil-beacon"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                id: "mirecoil-beacon",
                name: "Mirecoil Beacon",
                encounterDecks: { ...sector.encounterDecks, threat: [], contract: ["contract-beacon", "contract-lantern-run"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 5, 5, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    const discoveredContractSummary =
      (
        server.getState().eventLog.find((entry) => {
          const event = entry as { type?: string; summary?: string };
          return event.type === "SPACE_TEXT_RESOLVED";
        }) as { summary?: string } | undefined
      )?.summary ?? "";

    expect(server.getState().availableContracts.map((entry) => entry.id)).toContain("contract-beacon");
    expect(discoveredContractSummary).toContain("Defeat 1 enemy.");
    expect(server.getState().players[0]?.private.notes).toContain("Mirecoil traffic exposed contract Beacon Quieting.");
    expect(server.getState().sectors.find((sector) => sector.id === "mirecoil-beacon")?.encounterDecks.contract).toEqual([
      "contract-lantern-run"
    ]);
  });

  it("can discover the alternate Mirecoil contract from the local beacon deck", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        availableContracts: [],
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "mirecoil-beacon",
                character: {
                  ...player.character,
                  currentSpaceId: "mirecoil-beacon"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                id: "mirecoil-beacon",
                name: "Mirecoil Beacon",
                encounterDecks: { ...sector.encounterDecks, threat: [], contract: ["contract-beacon", "contract-lantern-run"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([1, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().availableContracts.map((entry) => entry.id)).toContain("contract-lantern-run");
    expect(server.getState().players[0]?.private.notes).toContain("Mirecoil traffic exposed contract Lantern Run.");
    expect(server.getState().sectors.find((sector) => sector.id === "mirecoil-beacon")?.encounterDecks.contract).toEqual([
      "contract-beacon"
    ]);
  });

  it("resolves the Glassmere anomaly through sector text and consumes the local anomaly card", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "glassmere-spindle",
                character: {
                  ...player.character,
                  heat: 2,
                  currentSpaceId: "glassmere-spindle"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                id: "glassmere-spindle",
                name: "Glassmere Spindle",
                encounterDecks: { ...sector.encounterDecks, threat: [], anomaly: ["anomaly-glassmere", "anomaly-choir-static"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.heat).toBe(2);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Glassmere anomaly contained. The spindle now answers the relay choir cleanly."
    );
    expect(server.getState().sectors.find((sector) => sector.id === "glassmere-spindle")?.encounterDecks.anomaly).toEqual([
      "anomaly-choir-static"
    ]);
  });

  it("can draw the alternate Glassmere anomaly from the local sector deck", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "glassmere-spindle",
                character: {
                  ...player.character,
                  currentSpaceId: "glassmere-spindle"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                id: "glassmere-spindle",
                name: "Glassmere Spindle",
                encounterDecks: { ...sector.encounterDecks, threat: [], anomaly: ["anomaly-glassmere", "anomaly-choir-static"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([1, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.heldGear.map((item) => item.id)).toContain("tuning-spines");
    expect(server.getState().players[0]?.private.notes).toContain("Choir static redirected into a safer relay band.");
    expect(server.getState().sectors.find((sector) => sector.id === "glassmere-spindle")?.encounterDecks.anomaly).toEqual([
      "anomaly-glassmere"
    ]);
  });

  it("lets the Grave Engineer auto-rig Hollow Veil salvage into equipped armor", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "hollow-veil-yard",
                character: {
                  ...cloneCharacter(createCharacters().get("grave-engineer")),
                  currentSpaceId: "hollow-veil-yard",
                  heldGear: [],
                  equippedGear: { weapon: null, armor: null, utility: null }
                }
              }
            : player
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "grave-engineer" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "hollow-veil-yard",
                name: "Hollow Veil Yard",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.heldGear.some((item) => item.id === "coffin-rig")).toBe(true);
    expect(server.getState().players[0]?.character.equippedGear.armor).toBe("coffin-rig");
  });

  it("recovers the Hollow Veil artifact through sector text and clears the local artifact deck", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "hollow-veil-yard",
                character: {
                  ...player.character,
                  currentSpaceId: "hollow-veil-yard"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "hollow-veil-yard",
                name: "Hollow Veil Yard",
                encounterDecks: { ...sector.encounterDecks, threat: [], artifact: ["artifact-yard", "artifact-bell-votive"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 5, 5, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    const heldGear = server.getState().players[0]?.character.heldGear.map((item) => item.id) ?? [];
    expect(heldGear).toContain("coffin-rig");
    expect(heldGear).toContain("marshal-seal");
    expect(server.getState().players[0]?.private.notes).toContain("The Yard Bellframe Core still carries convoy route memory.");
    expect(server.getState().sectors.find((sector) => sector.id === "hollow-veil-yard")?.encounterDecks.artifact).toEqual([
      "artifact-bell-votive"
    ]);
  });

  it("can draw the alternate Hollow Veil artifact from the local sector deck", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "hollow-veil-yard",
                character: {
                  ...player.character,
                  currentSpaceId: "hollow-veil-yard"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "hollow-veil-yard",
                name: "Hollow Veil Yard",
                encounterDecks: { ...sector.encounterDecks, threat: [], artifact: ["artifact-yard", "artifact-bell-votive"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([1, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    const heldGear = server.getState().players[0]?.character.heldGear.map((item) => item.id) ?? [];
    expect(heldGear).toContain("coffin-rig");
    expect(heldGear).toContain("veil-hook");
    expect(server.getState().players[0]?.private.notes).toContain(
      "Bell votive cache opened. The yard watch left breach paths in the lining."
    );
    expect(server.getState().sectors.find((sector) => sector.id === "hollow-veil-yard")?.encounterDecks.artifact).toEqual([
      "artifact-yard"
    ]);
  });

  it("uses Emberwatch sector text to reduce escalation and consume the local escalation card", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        escalationLevel: 2,
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "emberwatch-step",
                character: {
                  ...player.character,
                  currentSpaceId: "emberwatch-step"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                id: "emberwatch-step",
                name: "Emberwatch Step",
                encounterDecks: { ...sector.encounterDecks, threat: [], escalation: ["escalation-emberwatch", "escalation-ridge-suture"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().escalationLevel).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Emberwatch breakline locked down before the ridge sheared away."
    );
    expect(server.getState().sectors.find((sector) => sector.id === "emberwatch-step")?.encounterDecks.escalation).toEqual([
      "escalation-ridge-suture"
    ]);
  });

  it("can draw the alternate Emberwatch stabilization event from the local sector deck", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        escalationLevel: 2,
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "emberwatch-step",
                character: {
                  ...player.character,
                  heat: 2,
                  currentSpaceId: "emberwatch-step"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                id: "emberwatch-step",
                name: "Emberwatch Step",
                encounterDecks: { ...sector.encounterDecks, threat: [], escalation: ["escalation-emberwatch", "escalation-ridge-suture"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([1, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().escalationLevel).toBe(1);
    expect(server.getState().players[0]?.character.heat).toBe(2);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ridge suture anchored. The watch posts can still hold for one more convoy."
    );
    expect(server.getState().sectors.find((sector) => sector.id === "emberwatch-step")?.encounterDecks.escalation).toEqual([
      "escalation-emberwatch"
    ]);
  });

  it("does not immediately cancel a successful stabilization with same-turn round pressure", () => {
    const baseState = createState();
    const server = new GameRoomServer(
      createState({
        sessionMode: "single-player",
        currentEncounter: null,
        phase: "action",
        escalationLevel: 2,
        turnOrder: ["seat-1"],
        seats: baseState.seats.slice(0, 1),
        players: baseState.players.slice(0, 1).map((player) => ({
          ...player,
          sectorId: "emberwatch-step",
          character: {
            ...player.character,
            heat: 2,
            currentSpaceId: "emberwatch-step"
          }
        })),
        sectors: baseState.sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                id: "emberwatch-step",
                name: "Emberwatch Step",
                encounterDecks: { ...sector.encounterDecks, threat: [], escalation: ["escalation-emberwatch", "escalation-ridge-suture"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([1, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    const escalationEvents = server.getState().eventLog.filter((event): event is GameAction & { amount: number; reason?: string } =>
      (event as GameAction).type === "ESCALATION_ADVANCED"
    );

    expect(server.getState().escalationLevel).toBe(1);
    expect(escalationEvents).toHaveLength(1);
    expect(escalationEvents[0]?.amount).toBe(-1);
    expect(escalationEvents[0]?.reason).toBe("sector stabilization");
  });

  it("blocks entry into the core chamber until the Gate of Cinders text has been resolved", () => {
    const base = createState({
      phase: "navigation",
      turnOrder: ["seat-1"],
      seats: createState().seats.slice(0, 1),
      players: createState().players.slice(0, 1).map((player) => ({
        ...player,
        sectorId: "inner_gate_of_cinders",
        private: { ...player.private, notes: ["guardian-span-clearance"] },
        character: {
          ...player.character,
          currentSpaceId: "inner_gate_of_cinders"
        }
      })),
      sectors: [
        {
          id: "middle_guardian_span",
          name: "Guardian Span",
          regionTier: "red_march",
          neighbors: ["inner_veil_rift"],
          danger: 6,
          encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
        },
        {
          id: "inner_veil_rift",
          name: "Veil Rift",
          regionTier: "crownfall",
          neighbors: ["middle_guardian_span", "inner_gate_of_cinders"],
          danger: 7,
          encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
        },
        {
          id: "inner_gate_of_cinders",
          name: "Gate of Cinders",
          regionTier: "crownfall",
          neighbors: ["inner_veil_rift", "center_cinder_gate"],
          danger: 8,
          encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
        },
        {
          id: "center_cinder_gate",
          name: "The Cinder Gate",
          regionTier: "cinder_gate",
          neighbors: ["inner_gate_of_cinders"],
          danger: 10,
          encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
        }
      ]
    });
    const client = {
      seatId: "seat-1",
      view: "phone" as const,
      socket: {
        send: vi.fn(),
        close: vi.fn()
      }
    };
    const server = new GameRoomServer(
      withOnlyConnectedSeat(base, "seat-1"),
      [],
      createSequenceRandomSource([0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    server.getState().movementRolls = { "seat-1": 1 };

    server.handleIntent(client as never, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "center_cinder_gate"
    });

    expect(String(client.socket.send.mock.calls[0]?.[0] ?? "")).toContain("Resolve the Last Signal Well");
  });

  it("lets Guardian Span board text earn the clearance note and then opens the inner breach move", () => {
    const state = createState({
      phase: "action",
      turnOrder: ["seat-1"],
      seats: createState().seats.slice(0, 1),
      players: createState().players.slice(0, 1).map((player) => ({
        ...player,
        sectorId: "middle_guardian_span",
        character: {
          ...player.character,
          currentSpaceId: "middle_guardian_span"
        }
      })),
      sectors: [
        {
          id: "middle_guardian_span",
          name: "Guardian Span",
          regionTier: "red_march",
          neighbors: ["inner_veil_rift"],
          danger: 6,
          encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
        },
        {
          id: "inner_veil_rift",
          name: "Veil Rift",
          regionTier: "crownfall",
          neighbors: ["middle_guardian_span", "inner_gate_of_cinders"],
          danger: 7,
          encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
        }
      ]
    });
    const server = new GameRoomServer(
      withOnlyConnectedSeat(state, "seat-1"),
      [],
      createSequenceRandomSource([5, 5, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1",
      choiceId: "seal-alignment"
    });

    expect(server.getState().players[0]?.private.notes).toContain("guardian-span-clearance");
    expect(server.getState().players[0]?.private.notes).toContain(
      "Guardian Span threshold aligned for breach entry."
    );

    endBroadcastTurn(server);
    server.getState().movementRolls = { "seat-1": 1 };

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "inner_veil_rift"
    });

    expect(server.getState().players[0]?.sectorId).toBe("inner_veil_rift");
  });

  it("allows entry into the core chamber after Gate of Cinders board text earns the breach note", () => {
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          phase: "action",
          scenarioProgress: { sealTokens: 4 },
          turnOrder: ["seat-1"],
          seats: createState().seats.slice(0, 1),
          players: createState().players.slice(0, 1).map((player) => ({
            ...player,
            sectorId: "inner_gate_of_cinders",
            private: { ...player.private, notes: ["guardian-span-clearance"] },
            character: {
              ...player.character,
              currentSpaceId: "inner_gate_of_cinders"
            }
          })),
          sectors: [
            {
              id: "inner_gate_of_cinders",
              name: "Gate of Cinders",
              regionTier: "crownfall",
              neighbors: ["center_cinder_gate"],
              danger: 8,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            },
            {
              id: "center_cinder_gate",
              name: "The Cinder Gate",
              regionTier: "cinder_gate",
              neighbors: ["inner_gate_of_cinders"],
              danger: 10,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1",
      choiceId: "time-relays"
    });

    expect(server.getState().players[0]?.private.notes).toContain("gate-of-cinders-breached");
    expect(server.getState().players[0]?.private.notes).toContain(
      "Gate of Cinders relay pulse timed cleanly for the core breach."
    );

    endBroadcastTurn(server);
    server.getState().movementRolls = { "seat-1": 1 };
    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "center_cinder_gate"
    });

    expect(server.getState().players[0]?.character.currentSpaceId).toBe("center_cinder_gate");
  });

  it("resolves the selected Veil Rift sector-text choice and applies its authored effect", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "inner_veil_rift",
                character: {
                  ...player.character,
                  heat: 2,
                  currentSpaceId: "inner_veil_rift"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "inner_veil_rift",
                name: "Veil Rift",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1",
      choiceId: "anchor-surge"
    });

    expect(server.getState().players[0]?.character.heat).toBe(2);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Veil Rift surge anchored for deeper breach timing."
    );
  });

  it("resolves the selected Cinder Lattice sector-text choice and applies its authored effect", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "inner_cinder_lattice",
                character: {
                  ...player.character,
                  currentSpaceId: "inner_cinder_lattice"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "inner_cinder_lattice",
                name: "Cinder Lattice",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1",
      choiceId: "trace-embers"
    });

    expect(server.getState().players[0]?.private.notes).toContain(
      "Cinder lattice ember pulse traced into a stable core approach."
    );
  });

  it("rejects generic sector-text resolution at the core chamber and requires the confrontation flow instead", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                sectorId: "center_cinder_gate",
                character: {
                  ...player.character,
                  currentSpaceId: "center_cinder_gate"
                }
              }
            : player
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "center_cinder_gate",
                name: "The Cinder Gate",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().phase).toBe("action");
    expect(server.getState().sequence).toBe(0);
  });
});

describe("trophy progression", () => {
  it("awards trophies from defeated enemies", () => {
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          scenarioProgress: { sealTokens: 4 },
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "void-marshal" }],
        players: [
          {
            ...createState().players[0]!,
            character: {
              ...createState().players[0]!.character,
              currentSpaceId: "sector-b",
              stats: {
                ...createState().players[0]!.character.stats,
                grit: 12
              },
              trophies: 0
            },
            sectorId: "sector-b"
          }
        ],
          currentEncounter: {
            ...(createThreats().get("cinder-veil-stalker") ?? null)!,
            difficulty: 0
          }
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const character = server.getState().players[0]?.character;
    expect(character?.trophies).toBe(6);
    expect(character?.trophyPile).toEqual([
      {
        cardId: "cinder-veil-stalker",
        name: "Cinder-Veil Stalker",
        trophyValue: 6,
        spentValue: 0,
        stat: "grit",
        cardType: "enemy"
      }
    ]);
  });

  it("validates the combat reward to stat upgrade to future roll progression loop", () => {
    const progressionThreats = new Map(createThreats());
    const pikeRunner = progressionThreats.get("pike-runner");
    if (!pikeRunner) {
      throw new Error("Missing pike-runner fixture");
    }
    progressionThreats.set("pike-runner", {
      ...pikeRunner,
      difficulty: 0
    });
    progressionThreats.set("command-lock", {
      id: "command-lock",
      type: "threat",
      cardType: "hazard",
      title: "Command Lock",
      text: "A sealed route yields only to a sharper command cipher.",
      flavor: "The lock remembers who flinched.",
      severity: 2,
      stat: "command",
      difficulty: 15,
      successEffect: { type: "gain_note", text: "The command lock opened cleanly." },
      failEffect: { type: "gain_heat", amount: 1 }
    });

    const baseCharacter = cloneCharacter(createCharacters().get("void-marshal"));
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "void-marshal" }],
          players: [
            {
              ...createState().players[0]!,
              sectorId: "sector-a",
              character: {
                ...baseCharacter,
                currentSpaceId: "sector-a",
                stats: { ...baseCharacter.stats, command: 3 },
                trophies: 0,
                trophyPile: []
              }
            }
          ],
          currentEncounter: progressionThreats.get("pike-runner") ?? null
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0, 5, 5]),
      progressionThreats,
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    let player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.trophies).toBe(6);
    expect(player?.character.trophyPile).toEqual([
      {
        cardId: "pike-runner",
        name: "Pike Runner",
        trophyValue: 6,
        spentValue: 0,
        stat: "grit",
        cardType: "enemy"
      }
    ]);
    expect(player?.character.heldGear.some((item) => item.id === "veil-hook")).toBe(true);

    const phoneAfterReward = createPhoneProjection(server.getState(), "seat-1") as {
      self: { character: { trophies: number; stats: { command: number } } };
    };
    expect(phoneAfterReward.self.character.trophies).toBe(6);
    expect(phoneAfterReward.self.character.stats.command).toBe(3);

    runIntent(server, {
      type: "RAISE_STAT_REQUESTED",
      seatId: "seat-1",
      stat: "command"
    });

    player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.trophies).toBe(2);
    expect(player?.character.stats.command).toBe(4);
    expect(player?.character.statUpgrades?.command).toBe(1);
    expect(player?.character.trophyPile).toEqual([
      expect.objectContaining({
        cardId: "pike-runner",
        trophyValue: 6,
        spentValue: 4
      })
    ]);
    expect(player?.character.equippedGear.utility).toBe("marshal-seal");
    expect(player ? getEquippedGearBonus(player.character, "command") : null).toBe(1);

    const tvAfterUpgrade = createTvProjection(server.getState()) as {
      outcomeSummary: { summary: string } | null;
      publicResultDeltas: Array<{ type: string; sign: string; value?: number | string; publicText: string }>;
    };
    expect(tvAfterUpgrade.outcomeSummary?.summary).toMatch(/upgraded command to 4/i);
    expect(tvAfterUpgrade.publicResultDeltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "trophy", sign: "loss", value: 4 }),
        expect.objectContaining({ type: "statUpgrade", sign: "gain", value: 1, publicText: expect.stringMatching(/Command to 4/i) })
      ])
    );

    const nextState = server.getState();
    nextState.phase = "action";
    nextState.currentEncounter = progressionThreats.get("command-lock") ?? null;
    nextState.pendingEnemyRoll = null;
    nextState.pendingEffect = null;
    nextState.activeResolution = null;

    server.handleIntent(createClient("seat-1"), {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "command"
    });
    if (server.getState().activeResolution?.stage === "battle_setup") {
      server.handleIntent(createClient("seat-1"), {
        type: "CHECK_REQUESTED",
        seatId: "seat-1",
        stat: "command"
      });
    }

    expect(server.getState().activeResolution?.roll).toMatchObject({
      baseTotal: 12,
      modifierTotal: 5,
      finalTotal: 17,
      target: 15,
      success: true
    });
    expect(player?.character.stats.command).toBe(4);
    expect(player ? getEquippedGearBonus(player.character, "command") : null).toBe(1);
  });

  it("spends trophies equal to the next stat value to upgrade a base stat", () => {
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        escalationLevel: 0,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  trophies: 4,
                  trophyPile: [
                    {
                      cardId: "ash-court-duelist",
                      name: "Ash Court Duelist",
                      trophyValue: 2,
                      spentValue: 0,
                      stat: "guile",
                      cardType: "enemy"
                    },
                    {
                      cardId: "pale-contract-collector",
                      name: "Pale Contract Collector",
                      trophyValue: 2,
                      spentValue: 0,
                      stat: "command",
                      cardType: "enemy"
                    }
                  ]
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RAISE_STAT_REQUESTED",
      seatId: "seat-1",
      stat: "command"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.stats.command).toBe(4);
    expect(player?.character.statUpgrades?.command).toBe(1);
    expect(player?.character.trophies).toBe(0);
    expect(player?.character.trophyPile).toEqual([]);
    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().phase).toBe("broadcast");
    expect(server.getState().activeSeatIndex).toBe(0);
    expect(server.getState().lastOutcomeSummary?.summary).toMatch(/upgraded command to 4/i);

    const tvProjection = createTvProjection(server.getState()) as {
      outcomeSummary: { summary: string } | null;
      publicResultDeltas: Array<{ type: string; sign: string; value?: number | string; publicText: string }>;
    };
    expect(tvProjection.outcomeSummary?.summary).toMatch(/upgraded command to 4/i);
    expect(tvProjection.publicResultDeltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "trophy", sign: "loss", value: 4 }),
        expect.objectContaining({ type: "statUpgrade", sign: "gain", value: 1 })
      ])
    );
  });

  it("rejects stat upgrades when underfunded, capped, invalid, unsafe, or qa-only", () => {
    const underfundedServer = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  trophies: 3
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    const underfundedResponses: Array<Record<string, unknown>> = [];
    underfundedServer.handleIntent(
      createCapturingClient("seat-1", underfundedResponses),
      {
        type: "RAISE_STAT_REQUESTED",
        seatId: "seat-1",
        stat: "command"
      }
    );

    expect(
      underfundedResponses.some(
        (message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("Need 1 more Trophy")
      )
    ).toBe(true);

    const cappedServer = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  trophies: 6,
                  stats: {
                    ...entry.character.stats,
                    command: 6
                  }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    const cappedResponses: Array<Record<string, unknown>> = [];
    cappedServer.handleIntent(
      createCapturingClient("seat-1", cappedResponses),
      {
        type: "RAISE_STAT_REQUESTED",
        seatId: "seat-1",
        stat: "command"
      }
    );

    expect(
      cappedResponses.some(
        (message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("already at the maximum")
      )
    ).toBe(true);

    const unsafeServer = new GameRoomServer(
      createState({
        phase: "navigation",
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  trophies: 4
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );
    const unsafeResponses: Array<Record<string, unknown>> = [];
    unsafeServer.handleIntent(
      createCapturingClient("seat-1", unsafeResponses),
      {
        type: "RAISE_STAT_REQUESTED",
        seatId: "seat-1",
        stat: "command"
      }
    );
    expect(
      unsafeResponses.some(
        (message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("safe action or broadcast")
      )
    ).toBe(true);

    const invalidResponses: Array<Record<string, unknown>> = [];
    underfundedServer.handleIntent(
      createCapturingClient("seat-1", invalidResponses),
      {
        type: "RAISE_STAT_REQUESTED",
        seatId: "seat-1",
        stat: "salvage"
      } as never
    );
    expect(
      invalidResponses.some(
        (message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("stat is not allowed")
      )
    ).toBe(true);

    const qaServer = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  id: "char_master_alpha",
                  qaOnly: true,
                  trophies: 99
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );
    const qaResponses: Array<Record<string, unknown>> = [];
    qaServer.handleIntent(
      createCapturingClient("seat-1", qaResponses),
      {
        type: "RAISE_STAT_REQUESTED",
        seatId: "seat-1",
        stat: "command"
      }
    );
    expect(
      qaResponses.some(
        (message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("QA operatives")
      )
    ).toBe(true);
  });

  it("resets trophies when a recalled operative recruits a replacement", () => {
    const server = new GameRoomServer(
      createState({
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  status: "recalled",
                  trophies: 9,
                  trophyPile: [
                    {
                      cardId: "cinder-veil-stalker",
                      name: "Cinder-Veil Stalker",
                      trophyValue: 6,
                      spentValue: 0,
                      stat: "grit",
                      cardType: "enemy"
                    }
                  ],
                  scars: ["scar-ember"]
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RECRUIT_REPLACEMENT",
      seatId: "seat-1",
      replacementCharacterId: "signal-witch"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.id).toBe("signal-witch");
    expect(player?.character.trophies).toBe(0);
    expect(player?.character.trophyPile).toEqual([]);
    expect(player?.character.scars).toEqual(["scar-ember"]);
  });

  it("uses an upgraded base stat and keeps equipped gear modifiers separate on a later check outcome", () => {
    const boostedThreats = new Map(createThreats());
    boostedThreats.set("tight-band", {
      id: "tight-band",
      type: "threat",
      cardType: "hazard",
      title: "Command Lock",
      text: "Only a precise command cipher keeps the route from collapsing shut.",
      flavor: "You either seize the lock or lose the lane.",
      severity: 2,
      stat: "command",
      difficulty: 17,
      successEffect: { type: "gain_note", text: "You locked the command cipher in place." },
      failEffect: { type: "gain_heat", amount: 1 }
    });

    const createCommandState = (withBoost: boolean, phase: GameState["phase"]): GameState =>
      ({
        ...createState({
          phase,
          currentEncounter: null,
          pendingEnemyRoll: null,
          pendingEffect: null,
          sectors: [
            {
              id: "sector-a",
              name: "Ashwake Crossing",
              regionTier: "borderlight",
              neighbors: ["sector-b"],
              danger: 2,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            },
            {
              id: "sector-b",
              name: "Glassmere Spindle",
              regionTier: "borderlight",
              neighbors: ["sector-a"],
              danger: 3,
              encounterDecks: { threat: ["tight-band"], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          seats: createState().seats.slice(0, 2).map((seat, index) => ({
            ...seat,
            characterId: index === 0 ? "void-marshal" : seat.characterId
          })),
          turnOrder: ["seat-1", "seat-2"],
          players: createState().players.slice(0, 2).map((entry, index) =>
            index === 0
              ? {
                  ...entry,
                  sectorId: "sector-a",
                  character: {
                    ...cloneCharacter(createCharacters().get("void-marshal")),
                    currentSpaceId: "sector-a",
                    heldGear: withBoost ? [createGear().get("marshal-seal")!] : [],
                    equippedGear: withBoost ? { weapon: null, armor: null, utility: "marshal-seal" } : { weapon: null, armor: null, utility: null },
                    trophies: withBoost ? 4 : 0
                  }
                }
              : {
                  ...entry,
                  sectorId: "sector-a",
                  character: {
                    ...entry.character,
                    currentSpaceId: "sector-a"
                  }
                }
          )
        }),
        sessionMode: "multiplayer"
      }) as GameState;

    const baselineServer = new GameRoomServer(
      createCommandState(false, "navigation"),
      [],
      createSequenceRandomSource([5, 5]),
      boostedThreats,
      createCharacters(),
      createGear(),
      createContracts()
    );

    baselineServer.getState().movementRolls = { "seat-1": 1 };

    runIntent(baselineServer, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });
    runIntent(baselineServer, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "command"
    });

    expect(baselineServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);

    const boostedServer = new GameRoomServer(
      createCommandState(true, "action"),
      [],
      createSequenceRandomSource([0, 0, 5, 5]),
      boostedThreats,
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(boostedServer, {
      type: "RAISE_STAT_REQUESTED",
      seatId: "seat-1",
      stat: "command"
    });
    runIntent(boostedServer, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "start"
    });
    boostedServer.getState().movementRolls = { "seat-2": 1 };
    runIntent(boostedServer, {
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "sector-b"
    });
    runIntent(boostedServer, {
      type: "PHASE_ADVANCED",
      seatId: "seat-2",
      toPhase: "resolution"
    });
    boostedServer.getState().movementRolls = { "seat-1": 1 };
    runIntent(boostedServer, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });
    runIntent(boostedServer, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "command"
    });

    const boostedPlayer = boostedServer.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(boostedPlayer?.character.stats.command).toBe(4);
    expect(boostedPlayer?.character.equippedGear.utility).toBe("marshal-seal");
    expect(boostedPlayer ? getEquippedGearBonus(boostedPlayer.character, "command") : null).toBe(1);
    expect(boostedServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
  });
});

describe("contracts", () => {
  it("lets the Black Ledger Agent start the first contract with leverage progress", () => {
    const characters = createAbilityCharacters();
    const contracts = createContracts();
    const server = new GameRoomServer(
      createState({
        players: createState().players.map((player) =>
          player.seatId === "seat-1"
            ? {
                ...player,
                character: {
                  ...cloneCharacter(characters.get("black-ledger-agent")),
                  currentSpaceId: "sector-a"
                }
              }
            : player
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "black-ledger-agent" } : seat
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "choir-hush-census",
      progress: 1
    });
  });

  it("accepts a contract when none is active and rejects a second acceptance", () => {
    const contracts = createContracts();
    const server = new GameRoomServer(
      createState(),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const tv = createTvProjection(server.getState()) as {
      availableContracts: Array<{ id: string }>;
      players: Array<{ seatId: string; character: { activeContract: { contractId: string; progress: number } | null } }>;
    };
    const otherPhone = createPhoneProjection(server.getState(), "seat-2") as {
      availableContracts: Array<{ id: string }>;
      players: Array<{ seatId: string; character: { activeContract: { contractId: string; progress: number } | null } }>;
    };

    expect(player?.character.activeContract).toEqual({ contractId: "choir-hush-census", progress: 0 });
    expect(tv.availableContracts.map((entry) => entry.id)).toContain("choir-hush-census");
    expect(tv.players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "choir-hush-census",
      progress: 0
    });
    expect(otherPhone.availableContracts.map((entry) => entry.id)).toContain("choir-hush-census");
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Defeat 2 enemies.");

    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "choir-hush-census",
      progress: 0
    });
  });

  it("advances and completes a board-text-driven contract from authored sector text", () => {
    const contracts = createContracts();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          turnOrder: ["seat-1"],
          currentEncounter: null,
          phase: "action",
          seats: createState().seats.slice(0, 1),
          players: createState().players.slice(0, 1).map((entry) => ({
            ...entry,
            sectorId: "ashwake-crossing",
            character: {
              ...entry.character,
              currentSpaceId: "ashwake-crossing"
            }
          })),
          sectors: createState().sectors.map((sector) =>
            sector.id === "sector-a"
              ? {
                  ...sector,
                  id: "ashwake-crossing",
                  name: "Ashwake Crossing",
                  encounterDecks: { ...sector.encounterDecks, threat: [] }
                }
              : sector
          )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "cartel-crossing-thread"
    });

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.activeContract?.progress).toBe(1);

    runIntent(server, { type: "PHASE_ADVANCED", seatId: "seat-1", toPhase: "start" });
    runIntent(server, { type: "PHASE_ADVANCED", seatId: "seat-1", toPhase: "navigation" });
    runIntent(server, { type: "PHASE_ADVANCED", seatId: "seat-1", toPhase: "sector" });
    runIntent(server, { type: "PHASE_ADVANCED", seatId: "seat-1", toPhase: "action" });

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "cartel-crossing-thread"
    });

    expect(server.getState().players[0]?.character.activeContract).toBeNull();
    expect(server.getState().players[0]?.private.notes).toContain(
      "The Cartels opened a clean crossing thread for one black-lantern run."
    );
  });

  it("increments defeatCount progress only on combat wins, not on hazard wins", () => {
    const contracts = createContracts();
    const characters = createCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
        currentEncounter: createThreats().get("cinder-veil-stalker") ?? null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  activeContract: { contractId: "choir-hush-census", progress: 0 }
                }
              }
            : entry
        )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0]),
      createThreats(),
      characters,
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(1);

    const hazardServer = new GameRoomServer(
      createState({
        currentEncounter: createThreats().get("signal-static") ?? null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  activeContract: { contractId: "choir-hush-census", progress: 0 },
                  stats: { ...entry.character.stats, signal: 10 }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      contracts
    );

    runIntent(hazardServer, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });

    expect(hazardServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(0);
  });

  it("lets the Signal Witch turn a successful signal check into calmer route control", () => {
    const characters = createCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: createThreats().get("signal-static") ?? null,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("signal-witch")),
                  currentSpaceId: "sector-a",
                  heat: 1
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "signal-witch" } : seat
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(1);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Witchglass choir mapped the live signal into a stable route note."
    );
  });

  it("lets the Signal Witch smother a Glassmere anomaly when resolving the spindle", () => {
    const characters = createCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "glassmere-spindle",
                character: {
                  ...cloneCharacter(characters.get("signal-witch")),
                  currentSpaceId: "glassmere-spindle",
                  heat: 3
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "signal-witch" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                id: "glassmere-spindle",
                name: "Glassmere Spindle",
                encounterDecks: { ...sector.encounterDecks, threat: [], anomaly: ["anomaly-glassmere"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(3);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Hush Static drowned the local anomaly in controlled noise."
    );
  });

  it("lets Route Burn leave an allied lane note after the Signal Witch clears a route", () => {
    const characters = createCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "ashwake-crossing",
                character: {
                  ...cloneCharacter(characters.get("signal-witch")),
                  currentSpaceId: "ashwake-crossing"
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "signal-witch" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "ashwake-crossing",
                name: "Ashwake Crossing",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Route Burn marked a safer allied approach through the live lane."
    );
  });

  it("lets Fleet Elder steady escalation when securing a Mirecoil contract lead", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        escalationLevel: 1,
        availableContracts: [],
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "mirecoil-beacon",
                character: {
                  ...cloneCharacter(characters.get("fleet-elder")),
                  currentSpaceId: "mirecoil-beacon"
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "fleet-elder" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                id: "mirecoil-beacon",
                name: "Mirecoil Beacon",
                encounterDecks: { ...sector.encounterDecks, threat: [], contract: ["contract-beacon"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Convoy Law secured the lead and calmed the convoy spine."
    );
  });

  it("lets the Oathbroken Prince turn a cleared lucrative lane into contract progress", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "mirecoil-beacon",
                character: {
                  ...cloneCharacter(characters.get("oathbroken-prince")),
                  currentSpaceId: "mirecoil-beacon",
                  activeContract: {
                    contractId: "choir-hush-census",
                    progress: 0
                  }
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "oathbroken-prince" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-c"
            ? {
                ...sector,
                id: "mirecoil-beacon",
                name: "Mirecoil Beacon",
                encounterDecks: { ...sector.encounterDecks, threat: [], contract: ["contract-beacon"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(1);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Broken Claim converted local leverage into objective progress."
    );
  });

  it("lets the Rift Cartographer map a cleared lane into a route note", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "ashwake-crossing",
                character: {
                  ...cloneCharacter(characters.get("rift-cartographer")),
                  currentSpaceId: "ashwake-crossing",
                  heat: 1
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "rift-cartographer" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "ashwake-crossing",
                name: "Ashwake Crossing",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(1);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Breach Atlas logged a safer approach through the mapped lane."
    );
  });

  it("lets the Siege Medic clear a wound while stabilizing the breach", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        escalationLevel: 1,
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("siege-medic")),
                  currentSpaceId: "sector-a",
                  wounds: 1
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "siege-medic" } : seat
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "STABILIZE_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.wounds).toBe(0);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Field Triage turned the breach hold into practical recovery."
    );
  });

  it("lets Fleet Memory mark convoy pressure for the Fleet Elder at turn start", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          escalationLevel: 1,
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "fleet-elder" }],
          players: [
            {
              ...createState().players[0]!,
              character: {
                ...cloneCharacter(characters.get("fleet-elder")),
                currentSpaceId: "sector-c",
                heat: 1
              }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(1);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Fleet Memory read the pressure pattern before the convoy line could panic."
    );
  });

  it("lets Old Oaths mark convoy discipline when a new route job is accepted", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "fleet-elder" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("fleet-elder")),
                  currentSpaceId: "sector-c",
                  heat: 1
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Old Oaths made the frightened route crews fall into line at once."
    );
  });

  it("lets Chain Signal preserve a cleared convoy lane for the Fleet Elder", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "ashwake-crossing",
                character: {
                  ...cloneCharacter(characters.get("fleet-elder")),
                  currentSpaceId: "ashwake-crossing",
                  heat: 1
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "fleet-elder" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "ashwake-crossing",
                name: "Ashwake Crossing",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(1);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Chain Signal fixed the route into a convoy-safe sequence for the next push."
    );
  });

  it("lets Ashwake Step scout the opening lane for the Void Marshal at turn start", () => {
    const characters = createCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          currentEncounter: null,
          turnOrder: ["seat-1"],
          sectors: createState().sectors.map((sector) =>
            sector.id === "sector-a"
              ? {
                  ...sector,
                  encounterDecks: { ...sector.encounterDecks, threat: [] }
                }
              : sector
          ),
          players: [
            {
              ...createState().players[0]!,
              character: {
                ...cloneCharacter(characters.get("void-marshal")),
                currentSpaceId: "sector-a",
                heat: 1
              }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ashwake Step marked the opening lane before anyone else had to test it."
    );
  });

  it("lets Void Command mark the Void Marshal's cleared live lane", () => {
    const characters = createCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "ashwake-crossing",
                character: {
                  ...cloneCharacter(characters.get("void-marshal")),
                  currentSpaceId: "ashwake-crossing",
                  heat: 1
                }
              }
            : entry
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "ashwake-crossing",
                name: "Ashwake Crossing",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Void Command marked the cleared lane for allied movement."
    );
  });

  it("lets Signal Relay reward a Void Marshal combat win when another operative shares the sector", () => {
    const characters = createCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: createThreats().get("cinder-veil-stalker") ?? null,
          players: createState().players.map((entry) =>
            entry.seatId === "seat-1"
              ? {
                  ...entry,
                  sectorId: "sector-b",
                  character: {
                    ...cloneCharacter(characters.get("void-marshal")),
                    currentSpaceId: "sector-b",
                    heat: 1
                  }
                }
              : entry.seatId === "seat-2"
                ? {
                    ...entry,
                    sectorId: "sector-b",
                    character: {
                      ...entry.character,
                      currentSpaceId: "sector-b"
                    }
                  }
                : entry
          )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Signal Relay amplified allied pressure in the Marshal's sector."
    );
  });

  it("lets Silent Audit mark Black Ledger leverage after a cleared-sector read", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "ashwake-crossing",
                character: {
                  ...cloneCharacter(characters.get("black-ledger-agent")),
                  currentSpaceId: "ashwake-crossing",
                  heat: 1
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "black-ledger-agent" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "ashwake-crossing",
                name: "Ashwake Crossing",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Silent Audit extracted sharper route intelligence from the cleared sector."
    );
  });

  it("lets Debt Knife add extra contract pressure on a marked kill", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: createThreats().get("cinder-veil-stalker") ?? null,
          seats: [{ ...createState().seats[0]!, characterId: "black-ledger-agent" }],
          players: [
            {
              ...createState().players[0]!,
              character: {
                ...cloneCharacter(characters.get("black-ledger-agent")),
                currentSpaceId: "sector-a",
                activeContract: {
                  contractId: "compact-cleanse-ledger",
                  progress: 0
                }
              }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players[0]?.character.activeContract?.progress).toBe(2);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Debt Knife carved extra leverage out of the marked kill."
    );
  });

  it("lets Black File bleed pressure off a completed job", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        escalationLevel: 1,
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "black-ledger-agent" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("black-ledger-agent")),
                  currentSpaceId: "sector-a",
                  heat: 1,
                  activeContract: {
                    contractId: "choir-hush-census",
                    progress: 2
                  }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Black file leverage extracted from the finished contract."
    );
  });

  it("lets Yard Warden keep a Hollow Veil salvage site useful for the Salvage Warden", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        currentEncounter: null,
        phase: "action",
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "hollow-veil-yard",
                character: {
                  ...cloneCharacter(characters.get("salvage-warden")),
                  currentSpaceId: "hollow-veil-yard"
                }
              }
            : entry
        ),
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "salvage-warden" } : seat
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-a"
            ? {
                ...sector,
                id: "hollow-veil-yard",
                name: "Hollow Veil Yard",
                encounterDecks: { ...sector.encounterDecks, threat: [], artifact: ["artifact-yard"] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.private.notes).toContain(
      "Yard Warden secured the salvage site for a second pass and cleaner extraction."
    );
  });

  it("lets Last Haul pull one more useful tool during a stabilize window", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        escalationLevel: 1,
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "salvage-warden" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("salvage-warden")),
                  currentSpaceId: "sector-a"
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "STABILIZE_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.heldGear.map((item) => item.id)).toContain("veil-hook");
    expect(server.getState().players[0]?.private.notes).toContain(
      "Last Haul pried one more useful recovery out of the breaking route."
    );
  });

  it("lets Grave Spark mark the Grave Engineer's successful forge check", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: {
          id: "dead-grid",
          type: "threat",
          cardType: "hazard",
          title: "Dead Grid",
          text: "A collapsed utility spine still carries enough charge to bite.",
          flavor: "It feels dead only until you touch it.",
          severity: 1,
          stat: "forge",
          difficulty: 4,
          successEffect: { type: "gain_note", text: "You made the dead grid answer." },
          failEffect: { type: "gain_heat", amount: 1 }
        },
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "grave-engineer" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("grave-engineer")),
                  currentSpaceId: "sector-c",
                  heat: 1
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "forge"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Grave Spark turned the dead system into one more workable machine."
    );
  });

  it("lets Mortuary Triage shave escalation during a stabilize window", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        escalationLevel: 1,
        currentEncounter: null,
        pendingEnemyRoll: null,
        pendingEffect: null,
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "grave-engineer" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("grave-engineer")),
                  currentSpaceId: "sector-c"
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "STABILIZE_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Mortuary Triage turned panic into a field procedure the line could trust."
    );
  });

  it("spends a typed Vow Note for Cinder Oath and rejects a second use before the confrontation", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          scenarioProgress: { sealTokens: 4 },
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "cinder-monk" }],
          players: [
            {
              ...createState().players[0]!,
              sectorId: "center_cinder_gate",
              private: { hand: [], notes: [], noteResources: {} },
              character: {
                ...cloneCharacter(characters.get("cinder-monk")),
                currentSpaceId: "center_cinder_gate",
                heat: 1
              }
            }
          ],
          sectors: [
            ...createState().sectors,
            {
              id: "center_cinder_gate",
              name: "The Cinder Gate",
              regionTier: "cinder_gate",
              neighbors: ["sector-c"],
              danger: 5,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 5, 5, 5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts(),
      createAnomalies(),
      createArtifacts(),
      createEscalations()
    );

    const sent: Array<Record<string, unknown>> = [];
    const client = createCapturingClient("seat-1", sent);

    server.handleIntent(client, {
      type: "USE_CHARACTER_ABILITY",
      seatId: "seat-1",
      abilityId: "cinder-oath"
    });

    expect(sent.at(-1)).toMatchObject({
      type: "INTENT_REJECTED",
      actionType: "USE_CHARACTER_ABILITY",
      reason: "Cinder Oath requires 1 Vow Note."
    });

    server.getState().players[0]!.private.noteResources = { vow: 1 };

    server.handleIntent(client, {
      type: "USE_CHARACTER_ABILITY",
      seatId: "seat-1",
      abilityId: "cinder-oath"
    });

    expect(server.getState().players[0]?.private.noteResources?.vow).toBe(0);

    server.handleIntent(client, {
      type: "USE_CHARACTER_ABILITY",
      seatId: "seat-1",
      abilityId: "cinder-oath"
    });

    expect(sent.at(-1)).toMatchObject({
      type: "INTENT_REJECTED",
      actionType: "USE_CHARACTER_ABILITY",
      reason: "Cinder Oath has already been prepared this round."
    });

    runIntent(server, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    const confrontation = [...server.getState().eventLog].reverse().find((entry) => {
      return (entry as { type?: string }).type === "SCENARIO_PROGRESS_ADVANCED";
    }) as { summary?: string } | undefined;

    expect(confrontation?.summary).toContain("Cinder Oath +2 applied to each test.");
  });

  it("lets Ash Tithe pay the Oathbroken Prince when a contract closes", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "oathbroken-prince" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("oathbroken-prince")),
                  currentSpaceId: "sector-b",
                  heat: 1,
                  activeContract: {
                    contractId: "choir-hush-census",
                    progress: 2
                  }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ash Tithe skimmed tribute off the quiet victory before the route closed."
    );
  });

  it("lets Crown Debt pay the Oathbroken Prince after a marked kill", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: createThreats().get("cinder-veil-stalker") ?? null,
          seats: [{ ...createState().seats[0]!, characterId: "oathbroken-prince" }],
          players: [
            {
              ...createState().players[0]!,
              character: {
                ...cloneCharacter(characters.get("oathbroken-prince")),
                currentSpaceId: "sector-b",
                heat: 1,
                activeContract: {
                  contractId: "compact-cleanse-ledger",
                  progress: 0
                }
              }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Crown Debt pressed the kill into service as collected obligation."
    );
  });

  it("lets Ruin Courtesy mark a clean movement through broken ground", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        currentEncounter: null,
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "oathbroken-prince" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("oathbroken-prince")),
                  currentSpaceId: "sector-a",
                  heat: 1
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    server.getState().movementRolls = { "seat-1": 1 };

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ruin Courtesy made the shattered approach feel like a hall already claimed."
    );
  });

  it("lets Surveyor's Cut seed the Rift Cartographer's new contract with route leverage", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "rift-cartographer" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("rift-cartographer")),
                  currentSpaceId: "sector-c"
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    expect(server.getState().players[0]?.character.activeContract?.progress).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Surveyor's Cut stored the mapped lead before the breach could distort it."
    );
  });

  it("lets Ghost Mile mark a clean movement through a false lane", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "navigation",
        currentEncounter: null,
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "rift-cartographer" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("rift-cartographer")),
                  currentSpaceId: "sector-a",
                  heat: 1
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    server.getState().movementRolls = { "seat-1": 1 };

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ghost Mile stripped the false path out of the approach before it could set in."
    );
  });

  it("lets Rift Script record a clean hostile-ground annotation after a successful guile check", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: {
          id: "rift-pressure",
          type: "threat",
          cardType: "hazard",
          title: "Rift Pressure",
          text: "The path shifts unless someone reads it before it moves.",
          flavor: "The wrong step writes over the map.",
          severity: 1,
          stat: "guile",
          difficulty: 4,
          successEffect: { type: "gain_note", text: "You annotated the moving lane." },
          failEffect: { type: "gain_heat", amount: 1 }
        },
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "rift-cartographer" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("rift-cartographer")),
                  currentSpaceId: "sector-b"
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "guile"
    });

    expect(server.getState().players[0]?.private.notes).toContain(
      "Rift Script annotated the hostile ground before the path could blur again."
    );
  });

  it("lets the Rift Cartographer turn a successful Webglass route choice into a mapped lane", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: null,
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "rift-cartographer" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                sectorId: "middle_webglass_breach",
                character: {
                  ...cloneCharacter(characters.get("rift-cartographer")),
                  currentSpaceId: "middle_webglass_breach",
                  heat: 1
                }
              }
            : entry
        ),
        sectors: createState().sectors.map((sector) =>
          sector.id === "sector-b"
            ? {
                ...sector,
                id: "middle_webglass_breach",
                name: "Webglass Breach",
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-1",
      choiceId: "hidden-lane"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Webglass hidden lane mapped through shifting lanes."
    );
    expect(server.getState().players[0]?.private.notes).toContain(
      "Breach Atlas logged a safer approach through the mapped lane."
    );
  });

  it("lets Siege Discipline mark the Siege Medic's pressured turn", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          escalationLevel: 1,
          currentEncounter: null,
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "siege-medic" }],
          players: [
            {
              ...createState().players[0]!,
              character: {
                ...cloneCharacter(characters.get("siege-medic")),
                currentSpaceId: "sector-a",
                heat: 1
              }
            }
          ]
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Siege Discipline turned long pressure into a steady working rhythm."
    );
  });

  it("lets Amber Draught clear a wound after a successful grit check", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: {
          id: "surgical-push",
          type: "threat",
          cardType: "hazard",
          title: "Surgical Push",
          text: "The line only holds if someone keeps moving through the pain.",
          flavor: "Precision is all that keeps this from turning ugly.",
          severity: 1,
          stat: "grit",
          difficulty: 4,
          successEffect: { type: "gain_note", text: "You held the line." },
          failEffect: { type: "take_wound", amount: 1 }
        },
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "siege-medic" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("siege-medic")),
                  currentSpaceId: "sector-a",
                  wounds: 1
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players[0]?.character.wounds).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Amber Draught steadied the body before the next hit could land."
    );
  });

  it("lets Scar Ledger heal the Siege Medic when a contract closes cleanly", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "siege-medic" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("siege-medic")),
                  currentSpaceId: "sector-a",
                  heat: 1,
                  activeContract: {
                    contractId: "choir-hush-census",
                    progress: 2
                  }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Scar Ledger filed the surviving harm into something the crew could carry."
    );
  });

  it("lets Scrap Bastion mark the Salvage Warden's successful forge check", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: {
          id: "forge-surge",
          type: "threat",
          cardType: "hazard",
          title: "Forge Surge",
          text: "Scar pressure blows through the wreck frame while the line buckles.",
          flavor: "Only practical hands keep it from turning into shrapnel.",
          severity: 1,
          stat: "forge",
          difficulty: 4,
          successEffect: {
            type: "gain_note",
            text: "The salvage frame held."
          },
          failEffect: {
            type: "gain_heat",
            amount: 1
          }
        },
        seats: createState().seats.map((seat) =>
          seat.seatId === "seat-1" ? { ...seat, characterId: "salvage-warden" } : seat
        ),
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...cloneCharacter(characters.get("salvage-warden")),
                  currentSpaceId: "sector-c",
                  heat: 1
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([5, 5]),
      createThreats(),
      characters,
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "forge"
    });

    expect(server.getState().players[0]?.character.heat).toBe(1);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Scrap Bastion converted damaged cover into a workable defensive shell."
    );
  });

  it("rejects contract completion below target and completes it at target with reward", () => {
    const contracts = createContracts();
    const server = new GameRoomServer(
      createState({
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  activeContract: { contractId: "compact-cleanse-ledger", progress: 1 }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "compact-cleanse-ledger",
      progress: 1
    });

    const readyServer = new GameRoomServer(
      createState({
        players: createState().players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
                  activeContract: { contractId: "compact-cleanse-ledger", progress: 2 }
                }
              }
            : entry
        )
      }),
      [],
      createSequenceRandomSource([0]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runIntent(readyServer, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });

    const player = readyServer.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.activeContract).toBeNull();
    expect(player?.character.heldGear.some((item) => item.id === "veil-hook")).toBe(true);
    expect(player?.character.completedContracts).toEqual(["compact-cleanse-ledger"]);
    expect(readyServer.getState().pendingEffect).toBeNull();
    expect(readyServer.getState().phase).toBe("action");

    runIntent(readyServer, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "choir-hush-census"
    });
    expect(readyServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "choir-hush-census",
      progress: 0
    });

    runIntent(readyServer, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });
    expect(readyServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.completedContracts).toEqual([
      "compact-cleanse-ledger"
    ]);
  });

  it("accepts a contract, wins two combats across turns, completes it, and receives the reward", () => {
    const contracts = createContracts();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          phase: "navigation",
          sectors: createState().sectors.map((sector) =>
            sector.id === "sector-b"
              ? {
                  ...sector,
                  encounterDecks: { ...sector.encounterDecks, threat: ["cinder-veil-stalker"] }
                }
              : sector
          ),
          players: createState({
            phase: "navigation"
          }).players.map((entry) =>
            entry.seatId === "seat-1"
              ? {
                  ...entry,
                  character: {
                    ...entry.character,
                    stats: {
                      ...entry.character.stats,
                      grit: 8
                    },
                    heldGear: [],
                    equippedGear: { weapon: null, armor: null, utility: null }
                  }
                }
              : entry
          )
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([
        0, 0, 0, 5, 5, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 1, 5, 5, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0
      ]),
      createThreats(),
      createCharacters(),
      createGear(),
      contracts
    );

    runOneStepMove(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });
    runIntent(server, {
      type: "ACCEPT_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });
    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(1);
    endBroadcastTurn(server);

    runOneStepMove(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "sector-c"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-2",
      stat: "signal"
    });
    endBroadcastTurn(server);

    runOneStepMove(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "sector-a"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-3",
      stat: "signal"
    });
    endBroadcastTurn(server);

    runOneStepMove(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-c"
    });
    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });
    endBroadcastTurn(server);

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(2);

    server.getState().phase = "action";
    server.getState().activeSeatIndex = 0;

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.activeContract).toBeNull();
    expect(player?.character.heldGear.some((item) => item.id === "veil-hook")).toBe(true);
  });

  it("stores completed missions and consumes three when traded for an artifact", () => {
    const artifact = createGear().get("veil-hook")!;
    const state = createState({
      players: createState().players.map((entry) =>
        entry.seatId === "seat-1"
          ? {
              ...entry,
              character: {
                ...entry.character,
                completedContracts: ["mission-a", "mission-b", "mission-c"]
              }
            }
          : entry
      )
    });
    const result = reduceGameState(state, {
      type: "SHOP_SERVICE_RESOLVED",
      seatId: "seat-1",
      serviceId: "trade-missions-for-artifact",
      serviceLabel: "Trade Missions for Artifact",
      shopName: "Relic Dealer",
      sectorId: "sector-a",
      cost: { completedContracts: 3 },
      result: { gainGear: artifact },
      summary: "Traded three completed Missions for an Artifact.",
      createdAt: new Date().toISOString()
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const player = result.state.players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.completedContracts).toEqual([]);
    expect(player?.character.heldGear.some((item) => item.id === artifact.id)).toBe(true);
  });

  it("completes every mission objective schema through its objective trigger without duplicating ledger or rewards", () => {
    const normalEquipment: GearItem = {
      id: "lifecycle-standard-kit",
      name: "Lifecycle Standard Kit",
      slot: "utility",
      tier: "standard",
      normalShopCommon: true,
      statBonus: { stat: "guile", amount: 1 },
    };
    const replacement: ContractCard = {
      id: "lifecycle-replacement",
      name: "Replacement Contract",
      factionGiver: "Meridian Compact",
      text: "Verify that the active mission slot is available again.",
      objective: { type: "defeatCount", target: 1 },
      reward: { type: "gain_note", text: "Replacement accepted." },
    };
    const cases: Array<{
      contract: ContractCard;
      triggers: Parameters<typeof advanceContractObjectiveState>[2][];
      assertReward: (player: NonNullable<GameState["players"][number]>) => void;
    }> = [
      {
        contract: {
          id: "lifecycle-defeat",
          name: "Defeat Lifecycle",
          factionGiver: "Meridian Compact",
          text: "Defeat one enemy.",
          objective: { type: "defeatCount", target: 1 },
          reward: { type: "gain_salvage", amount: 2 },
        },
        triggers: [{ type: "enemy-defeated" }],
        assertReward: (player) => expect(player.character.salvage).toBe(2),
      },
      {
        contract: {
          id: "lifecycle-space-text",
          name: "Space Text Lifecycle",
          factionGiver: "Pale Cartels",
          text: "Resolve the matching sector text.",
          objective: { type: "spaceTextResolved", effectKey: "lifecycle-effect", label: "Resolve lifecycle text", target: 1 },
          reward: { type: "gain_gear", gearId: normalEquipment.id, gear: normalEquipment },
        },
        triggers: [{ type: "space-text-resolved", effectKey: "lifecycle-effect" }],
        assertReward: (player) => {
          expect(player.character.heldGear.filter((item) => item.id === normalEquipment.id)).toHaveLength(1);
          expect(player.character.heldGear.find((item) => item.id === normalEquipment.id)?.tier).not.toBe("artifact");
        },
      },
      {
        contract: {
          id: "lifecycle-route",
          name: "Route Lifecycle",
          factionGiver: "Glass Choir",
          text: "Visit both route stops.",
          objective: { type: "multiStopRoute", ordered: true, targets: [
            { id: "first", type: "spaceId", value: "lifecycle-a", label: "First" },
            { id: "second", type: "tag", value: "shop", label: "Second" },
          ] },
          reward: { type: "gain_note", text: "Route reward." },
        },
        triggers: [
          { type: "sector-visited", sectorId: "lifecycle-a", sectorTags: [] },
          { type: "sector-visited", sectorId: "lifecycle-b", sectorTags: ["shop"] },
        ],
        assertReward: (player) => expect(player.private.notes).toContain("Route reward."),
      },
      {
        contract: {
          id: "lifecycle-shop",
          name: "Shop Lifecycle",
          factionGiver: "Kaldr Dominion",
          text: "Repair one item at a shop.",
          objective: { type: "shopTransaction", action: "repairGear", requiredShopType: "shop", requiredCount: 1, label: "Repair once" },
          reward: { type: "gain_trophy", amount: 1 },
        },
        triggers: [{ type: "shop-transaction", action: "repairGear", sectorId: "lifecycle-shop", shopTypes: ["shop"], salvageSpent: 1 }],
        assertReward: (player) => expect(player.character.trophies).toBe(1),
      },
    ];

    for (const { contract, triggers, assertReward } of cases) {
      let objectiveState = { progress: 0 };
      for (const trigger of triggers) {
        objectiveState = advanceContractObjectiveState(contract, objectiveState, trigger);
      }
      const activeContract = { contractId: contract.id, ...objectiveState };
      const initialState = createState({
        availableContracts: [contract, replacement],
        players: createState().players.map((entry) => entry.seatId === "seat-1"
          ? { ...entry, character: { ...entry.character, salvage: 0, trophies: 0, heldGear: [], activeContract } }
          : entry),
      });
      const action = {
        type: "COMPLETE_CONTRACT" as const,
        seatId: "seat-1",
        contractId: contract.id,
        contract,
        createdAt: "2026-07-11T00:00:00.000Z",
      };
      const completed = reduceGameState(initialState, action);

      expect(completed.ok, contract.objective.type).toBe(true);
      if (!completed.ok) continue;
      const player = completed.state.players.find((entry) => entry.seatId === "seat-1")!;
      expect(player.character.activeContract).toBeNull();
      expect(player.character.completedContracts).toEqual([contract.id]);
      assertReward(player);

      const duplicate = reduceGameState(completed.state, action);
      expect(duplicate.ok, `${contract.objective.type} duplicate`).toBe(false);
      expect(duplicate.state.players.find((entry) => entry.seatId === "seat-1")?.character.completedContracts).toEqual([contract.id]);
      assertReward(duplicate.state.players.find((entry) => entry.seatId === "seat-1")!);

      const replacementAccepted = reduceGameState(
        { ...completed.state, phase: "action", activeResolution: null },
        { type: "ACCEPT_CONTRACT", seatId: "seat-1", contractId: replacement.id, contract: replacement, createdAt: "2026-07-11T00:00:01.000Z" },
      );
      expect(replacementAccepted.ok, `${contract.objective.type} replacement`).toBe(true);
      expect(replacementAccepted.state.players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.contractId).toBe(replacement.id);
    }
  });

  it("projects completed mission progress from the ledger with a legacy event fallback and trades exactly three for one artifact", () => {
    const artifact: GearItem = {
      id: "lifecycle-artifact",
      name: "Lifecycle Artifact",
      slot: "utility",
      tier: "artifact",
      normalShopCommon: false,
      statBonus: { stat: "signal", amount: 2 },
    };
    const withLedger = createState({
      phase: "action",
      sectors: [{
        id: "outer_surgery_tent",
        name: "Mercy Bay",
        regionTier: "borderlight",
        neighbors: [],
        danger: 0,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] },
      }],
      players: createState().players.map((entry) => entry.seatId === "seat-1"
        ? {
            ...entry,
            sectorId: "outer_surgery_tent",
            character: {
              ...entry.character,
              currentSpaceId: "outer_surgery_tent",
              activeContract: { contractId: "incomplete-contract", progress: 0 },
              completedContracts: ["mission-a", "mission-b", "mission-c"],
              heldGear: [],
            },
          }
        : entry),
    });
    const projection = createTvProjection(withLedger) as {
      players: Array<{ seatId: string; character: { completedContracts?: number } }>;
      shopEncounter: { activePlayer: { completedContracts?: number }; services: Array<{ id: string; enabled: boolean; disabledReason?: string }> } | null;
    };
    const phoneProjection = createPhoneProjection(withLedger, "seat-1") as {
      self: { character: { completedContracts?: string[] } } | null;
    };
    const service = projection.shopEncounter?.services.find((entry) => entry.id === "trade-missions-for-artifact");

    expect(projection.players.find((entry) => entry.seatId === "seat-1")?.character.completedContracts).toBe(3);
    expect(projection.shopEncounter?.activePlayer.completedContracts).toBe(3);
    expect(phoneProjection.self?.character.completedContracts).toEqual(["mission-a", "mission-b", "mission-c"]);
    expect(service).toMatchObject({ enabled: true });

    const tradeAction = {
      type: "SHOP_SERVICE_RESOLVED" as const,
      seatId: "seat-1",
      serviceId: "trade-missions-for-artifact",
      serviceLabel: "Trade Missions for Artifact",
      shopName: "Relic Dealer",
      sectorId: "outer_surgery_tent",
      cost: { completedContracts: 3 },
      result: { gainGear: artifact },
      summary: "Traded three completed Missions for an Artifact.",
      createdAt: "2026-07-11T00:00:00.000Z",
    };
    const traded = reduceGameState(withLedger, tradeAction);

    expect(traded.ok).toBe(true);
    if (!traded.ok) return;
    const tradedPlayer = traded.state.players.find((entry) => entry.seatId === "seat-1")!;
    expect(tradedPlayer.character.completedContracts).toEqual([]);
    expect(tradedPlayer.character.activeContract).toEqual({ contractId: "incomplete-contract", progress: 0 });
    expect(tradedPlayer.character.heldGear).toEqual([artifact]);
    expect(tradedPlayer.character.heldGear.every((item) => item.tier === "artifact")).toBe(true);
    expect(reduceGameState(traded.state, tradeAction).ok).toBe(false);

    const legacy = createState({
      eventLog: Array.from({ length: 3 }, () => ({ type: "COMPLETE_CONTRACT", seatId: "seat-1" } as never)),
      players: createState().players.map((entry) => entry.seatId === "seat-1"
        ? { ...entry, character: { ...entry.character, completedContracts: undefined } }
        : entry),
    });
    const legacyProjection = createTvProjection(legacy) as {
      players: Array<{ seatId: string; character: { completedContracts?: number } }>;
    };
    expect(legacyProjection.players.find((entry) => entry.seatId === "seat-1")?.character.completedContracts).toBe(3);

    const spentLedger = {
      ...legacy,
      players: legacy.players.map((entry) => entry.seatId === "seat-1"
        ? { ...entry, character: { ...entry.character, completedContracts: [] } }
        : entry),
    };
    expect(
      (createTvProjection(spentLedger) as { players: Array<{ seatId: string; character: { completedContracts?: number } }> }).players
        .find((entry) => entry.seatId === "seat-1")?.character.completedContracts,
    ).toBe(0);
  });
});

describe("opposed combat", () => {
  it("assigns a non-active connected non-kicked seat as enemy roller and rejects other seats", () => {
    const server = new GameRoomServer(
      createState({
        currentEncounter: createThreats().get("cinder-veil-stalker") ?? null
      }),
      [],
      createSequenceRandomSource([0, 5, 5, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().pendingEnemyRoll?.assignedRollerSeatId).toBe("seat-2");

    runIntent(server, {
      type: "ENEMY_ROLL_REQUESTED",
      seatId: "seat-3"
    });

    expect(server.getState().pendingEnemyRoll?.assignedRollerSeatId).toBe("seat-2");

    runIntent(server, {
      type: "ENEMY_ROLL_REQUESTED",
      seatId: "seat-2"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(server.getState().pendingEnemyRoll).toBeNull();
    expect(player?.character.heldGear.some((item) => item.id === "tuning-spines")).toBe(true);
  });

  it("falls back to automatic server resolution when no eligible enemy roller exists", () => {
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: createThreats().get("cinder-veil-stalker") ?? null
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([5, 5, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(server.getState().pendingEnemyRoll).toBeNull();
    expect(player?.character.heldGear.some((item) => item.id === "tuning-spines")).toBe(true);
  });

  it("favors the player on ties during opposed combat", () => {
    const tiedEncounter = createThreats().get("cinder-veil-stalker");

    if (!tiedEncounter || tiedEncounter.cardType !== "enemy") {
      throw new Error("Missing enemy test fixture");
    }

    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          currentEncounter: {
            ...tiedEncounter,
            difficulty: 2
          }
        }),
        "seat-1"
      ),
      [],
      createSequenceRandomSource([0, 0, 0, 0]),
      createThreats(),
      createCharacters(),
      createGear(),
      createContracts()
    );

    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(0);
    expect(player?.character.heldGear.some((item) => item.id === "tuning-spines")).toBe(true);
  });
});
