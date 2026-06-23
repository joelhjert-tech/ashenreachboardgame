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
      { seatId: "seat-1", characterId: "void-marshal", displayName: "Seat One", connected: true, kicked: false, joinToken: "seat:session-alpha:seat-1" },
      { seatId: "seat-2", characterId: "signal-witch", displayName: "Seat Two", connected: true, kicked: false, joinToken: "seat:session-alpha:seat-2" },
      { seatId: "seat-3", characterId: "grave-engineer", displayName: "Seat Three", connected: true, kicked: false, joinToken: "seat:session-alpha:seat-3" }
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
    eventLog: [],
    escalationLevel: 0,
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
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

describe("active objects and table interaction", () => {
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
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), createThreats(), createCharacters(), createGear(), createContracts());

    runIntent(server, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "cinder-suture-kit"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.wounds).toBe(0);
    expect(player?.character.heat).toBe(1);
    expect(player?.character.heldGear).toHaveLength(0);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Cinder Suture Kit used");
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
    expect(player?.character.heat).toBe(1);
    expect(player?.character.followers).toHaveLength(1);
    expect(server.getState().lastOutcomeSummary?.summary).toContain("Crownless Advocate used");
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
});

describe("movement rolls", () => {
  it("succeeds against a low-danger node without changing Heat", () => {
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

  it("still completes the move on a failed roll and applies Heat", () => {
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

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    const summary = server.getState().lastOutcomeSummary;

    expect(player?.character.currentSpaceId).toBe("sector-b");
    expect(player?.character.heat).toBe(1);
    expect(summary?.success).toBe(false);
    expect(summary?.difficulty).toBe(8);
  });

  it("triggers the recall flow when failed movement Heat reaches the threshold", () => {
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

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    const seat1 = server.getState().players.find((entry) => entry.seatId === "seat-1");

    expect(seat1?.character.currentSpaceId).toBe("sector-b");
    expect(seat1?.character.heat).toBe(2);
    expect(seat1?.character.status).toBe("recalled");
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

  it("lets the Cinder Monk turn a cleared Emberwatch line into an Ash Psalm reset", () => {
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

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ember Vigil kept the dangerous sector from dictating the tempo."
    );
  });

  it("lets Choir Lash cool the Signal Witch when escalation spikes on their turn", () => {
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
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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
    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ridge suture anchored. The watch posts can still hold for one more convoy."
    );
    expect(server.getState().sectors.find((sector) => sector.id === "emberwatch-step")?.encounterDecks.escalation).toEqual([
      "escalation-emberwatch"
    ]);
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

    server.handleIntent(client as never, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "center_cinder_gate"
    });

    expect(String(client.socket.send.mock.calls[0]?.[0] ?? "")).toContain("Resolve the Gate of Cinders");
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

    expect(server.getState().players[0]?.character.trophies).toBe(6);
  });

  it("spends trophies to raise a stat, feeds escalation, and consumes the turn", () => {
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

    runIntent(server, {
      type: "RAISE_STAT_REQUESTED",
      seatId: "seat-1",
      stat: "command"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.stats.command).toBe(4);
    expect(player?.character.trophies).toBe(0);
    expect(server.getState().escalationLevel).toBe(1);
    expect(server.getState().activeSeatIndex).toBe(1);
  });

  it("rejects raise-stat requests when underfunded or already at the cap", () => {
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
        (message) => message.type === "INTENT_REJECTED" && String(message.reason).includes("Not enough trophies")
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
                  trophies: 4,
                  stats: {
                    ...entry.character.stats,
                    command: 9
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
    expect(player?.character.scars).toEqual(["scar-ember"]);
  });

  it("uses a raised stat on a later check outcome", () => {
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

    expect(baselineServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(1);

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
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "sector-b"
    });
    runIntent(boostedServer, {
      type: "PHASE_ADVANCED",
      seatId: "seat-2",
      toPhase: "resolution"
    });
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

    expect(boostedServer.getState().players.find((entry) => entry.seatId === "seat-1")?.character.stats.command).toBe(4);
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

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
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

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
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

  it("lets the Rift Cartographer map a cleared lane into lower Heat and a route note", () => {
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

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
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

  it("lets Fleet Memory calm the Fleet Elder at the start of a pressured turn", () => {
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

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.private.notes).toContain(
      "Fleet Memory read the pressure pattern before the convoy line could panic."
    );
  });

  it("lets Old Oaths calm the Fleet Elder when a new route job is accepted", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.heat).toBe(0);
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ashwake Step marked the opening lane before anyone else had to test it."
    );
  });

  it("lets Void Command cool the Void Marshal after clearing a live lane", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Signal Relay amplified allied pressure in the Marshal's sector."
    );
  });

  it("lets Silent Audit cool the Black Ledger Agent after a cleared-sector read", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

  it("lets Grave Spark cool the Grave Engineer after a successful forge check", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

  it("lets Cinder Oath steady the Cinder Monk before a scenario confrontation", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
          sessionMode: "single-player",
          phase: "action",
          turnOrder: ["seat-1"],
          seats: [{ ...createState().seats[0]!, characterId: "cinder-monk" }],
          players: [
            {
              ...createState().players[0]!,
              sectorId: "center_cinder_gate",
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

    runIntent(server, {
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Cinder Oath made the confrontation feel survivable before the first test landed."
    );
  });

  it("lets Ash Tithe cool the Oathbroken Prince when a contract pays out", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Ash Tithe skimmed tribute off the quiet victory before the lane could cool."
    );
  });

  it("lets Crown Debt cool the Oathbroken Prince after a marked kill", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Crown Debt pressed the kill into service as collected obligation."
    );
  });

  it("lets Ruin Courtesy cool the Oathbroken Prince on a clean movement through broken ground", () => {
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

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

  it("lets Ghost Mile cool the Rift Cartographer on a clean movement through a false lane", () => {
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

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

  it("lets the Rift Cartographer turn a successful Webglass route choice into a cooler mapped lane", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Webglass hidden lane mapped through shifting lanes."
    );
    expect(server.getState().players[0]?.private.notes).toContain(
      "Breach Atlas logged a safer approach through the mapped lane."
    );
  });

  it("lets Siege Discipline calm the Siege Medic at the start of a pressured turn", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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

  it("lets Scar Ledger cool the Siege Medic when a contract closes cleanly", () => {
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "Scar Ledger filed the surviving harm into something the crew could carry."
    );
  });

  it("lets Scrap Bastion cool the Salvage Warden after a successful forge check", () => {
    const characters = createAbilityCharacters();
    const server = new GameRoomServer(
      createState({
        phase: "action",
        currentEncounter: {
          id: "forge-surge",
          type: "threat",
          cardType: "hazard",
          title: "Forge Surge",
          text: "Heat blows through the wreck frame while the line buckles.",
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

    expect(server.getState().players[0]?.character.heat).toBe(0);
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
                  heat: 2,
                  activeContract: { contractId: "choir-hush-census", progress: 1 }
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
      contractId: "choir-hush-census"
    });
    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract).toEqual({
      contractId: "choir-hush-census",
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
                  heat: 2,
                  activeContract: { contractId: "choir-hush-census", progress: 2 }
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
      contractId: "choir-hush-census"
    });

    const player = readyServer.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.activeContract).toBeNull();
    expect(player?.character.heat).toBe(0);
  });

  it("accepts a contract, wins two combats across turns, completes it, and receives the reward", () => {
    const contracts = createContracts();
    const server = new GameRoomServer(
      withOnlyConnectedSeat(
        createState({
        phase: "navigation",
        players: createState({
          phase: "navigation"
        }).players.map((entry) =>
          entry.seatId === "seat-1"
            ? {
                ...entry,
                character: {
                  ...entry.character,
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

    runIntent(server, {
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

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "sector-c"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-2",
      stat: "signal"
    });

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "sector-a"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-3",
      stat: "signal"
    });

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-c"
    });
    runIntent(server, {
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    expect(server.getState().players.find((entry) => entry.seatId === "seat-1")?.character.activeContract?.progress).toBe(2);

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "sector-b"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-2",
      stat: "signal"
    });

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "sector-b"
    });
    runIntent(server, {
      type: "CHECK_REQUESTED",
      seatId: "seat-3",
      stat: "signal"
    });

    runIntent(server, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "sector-b"
    });
    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "compact-cleanse-ledger"
    });

    const player = server.getState().players.find((entry) => entry.seatId === "seat-1");
    expect(player?.character.activeContract).toBeNull();
    expect(player?.character.heldGear.some((item) => item.id === "veil-hook")).toBe(true);
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
