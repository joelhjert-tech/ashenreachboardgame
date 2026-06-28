// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneActionPanel } from "../PhoneActionPanel.js";
import type { CharacterCatalogEntry, ClientIntent, PhonePatchPayload } from "../../shared/types.js";

const characters: CharacterCatalogEntry[] = [
  {
    id: "void-marshal",
    name: "Sable Vey",
    archetype: "Void Marshal",
    currentSpaceId: "ashwake-crossing",
    status: "active",
    stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
    trophies: 0,
    heat: 0,
    wounds: 0,
    scars: [],
    activeContract: null,
    heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null },
    abilities: []
  }
];

function createPatch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  const patch: PhonePatchPayload = {
    phase: "action",
    status: "active",
    sessionMode: "multiplayer",
    winnerSeatId: null,
    activeScenario: {
      id: "scenario_broken_seal",
      name: "The Broken Seal",
      theme: "The last ward around the Cinder Gate is splitting.",
      difficulty: "easy-medium",
      pressureSummary: "6 seals remain. Each turn start, 1-2 weakens the ward and 3-4 heats the active operative.",
      confrontationTitle: "Reseal the Prison",
      progressLabel: "sealRestorationMarks",
      progress: 0,
      threshold: 2,
      setup: ["Place 6 Seal tokens on the scenario sheet."],
      specialRules: ["At the start of each operative turn, roll 1 die."],
      confrontationSteps: ["Test Grit 10 to hold the breached ward shut."],
      victoryText: "Pass at least 2 of the 3 confrontation tests to win."
    },
    scenarioTelemetry: [
      { label: "Seal Tokens", value: "6" },
      { label: "Pressure Roll", value: "1-2 weaken | 3-4 heat surge" }
    ],
    scenarioProgress: {},
    activeSeatIndex: 0,
    seats: [
      { seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false },
      { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira", connected: true, ready: true, kicked: false }
    ],
    turnOrder: ["seat-1", "seat-2"],
    sectors: [
      {
        id: "ashwake-crossing",
        name: "Ashwake Crossing",
        regionTier: "borderlight",
        neighbors: ["glassmere-spindle"],
        danger: 2,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    players: [
      {
        seatId: "seat-1",
        sectorId: "ashwake-crossing",
        character: {
          id: "void-marshal",
          name: "Sable Vey",
          archetype: "Void Marshal",
          status: "active",
          activeContract: null,
          stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
          trophies: 0,
          heat: 0,
          wounds: 0,
          scars: [],
          heldGearCount: 0,
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      }
    ],
    escalationLevel: 0,
    escalationThreshold: 6,
    escalationModifier: 0,
    availableContracts: [],
    recentAbilityTriggers: [],
    encounter: {
      id: "glass-chime-swarm",
      title: "Glass Chime Swarm",
      cardType: "hazard",
      flavor: "A ringing tide skates over the broken rails.",
      difficulty: 6,
      stat: "signal"
    },
    pendingEnemyRoll: null,
    outcomeSummary: null,
    self: {
      seatId: "seat-1",
      sectorId: "ashwake-crossing",
      hand: [],
      notes: [],
      character: {
        id: "void-marshal",
        name: "Sable Vey",
        archetype: "Void Marshal",
        currentSpaceId: "ashwake-crossing",
        status: "active",
        stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
        trophies: 0,
        heat: 0,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [],
        equippedGear: { weapon: null, armor: null, utility: null },
        abilities: []
      }
    },
    nemesis: null
  };

  return {
    ...patch,
    ...overrides,
    activeScenario: overrides.activeScenario ?? patch.activeScenario,
    scenarioProgress: overrides.scenarioProgress ?? patch.scenarioProgress
  };
}

describe("PhoneActionPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("hides action buttons when this seat is not active", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({ activeSeatIndex: 1 })}
      />
    );

    expect(screen.getByText(/waiting for another seat/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attempt signal check/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
  });

  it("shows check and not combat when an active seat faces a hazard", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "glass-chime-swarm",
            title: "Glass Chime Swarm",
            cardType: "hazard",
            flavor: "A ringing tide skates over the broken rails.",
            difficulty: 6,
            stat: "signal"
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /attempt signal check/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
  });

  it("shows combat and not check when an active seat faces an enemy", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /enter combat.*cinder-veil stalker/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attempt grit check/i })).not.toBeInTheDocument();
  });

  it("shows the Cinder Gate confrontation action instead of a generic end turn", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          self: {
            ...createPatch().self!,
            sectorId: "center_cinder_gate",
            character: {
              ...createPatch().self!.character,
              currentSpaceId: "center_cinder_gate"
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /resolve reseal the prison/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /end turn/i })).not.toBeInTheDocument();
  });

  it("renders movement planner destination intel without leaking hidden deck card names", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: {
            active: true,
            movementValue: 1,
            currentSectorId: "outer_ember_sanctum",
            currentSectorName: "Pilgrim Lock",
            destinations: [
              {
                sectorId: "outer_waymarket",
                name: "Anchor Market",
                ring: "outer",
                distance: 1,
                route: ["outer_ember_sanctum", "outer_waymarket"],
                routeNames: ["Pilgrim Lock", "Anchor Market"],
                tags: ["shop", "crossroads"],
                threatIcons: ["yellow"],
                ruleText: "If clear, buy Gear, Supplies, or use Black Market Refresh.",
                loreText: "A market of sealed crates and oath-brokers.",
                shop: {
                  shopId: "outer_waymarketExchange",
                  shopName: "Anchor Market",
                  status: "open",
                  servicesPreview: ["Buy Gear", "Sell Gear", "Black Market Refresh"]
                },
                faceUpThreats: [],
                occupants: [],
                strategicTags: ["shop", "reward", "danger"]
              }
            ]
          }
        })}
      />
    );

    expect(screen.getByTestId("movement-planner")).toBeInTheDocument();
    expect(screen.getByText(/move 1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/anchor market/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Icons")).toBeInTheDocument();
    expect(screen.getByText("Yellow")).toBeInTheDocument();
    expect(screen.getByText(/buy gear \/ sell gear/i)).toBeInTheDocument();
    expect(screen.queryByText(/choir bulwark/i)).not.toBeInTheDocument();
  });

  it("lets the player inspect a route without committing movement, then confirm", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: {
            active: true,
            movementValue: 1,
            currentSectorId: "outer_ember_sanctum",
            currentSectorName: "Pilgrim Lock",
            destinations: [
              {
                sectorId: "ashwake-crossing",
                name: "Ashwalk Bridge",
                ring: "outer",
                distance: 1,
                route: ["outer_ember_sanctum", "ashwake-crossing"],
                routeNames: ["Pilgrim Lock", "Ashwalk Bridge"],
                tags: ["hazard", "crossroads"],
                threatIcons: ["yellow"],
                ruleText: "If clear, mark your route and gain a scouting note.",
                faceUpThreats: [
                  {
                    instanceId: "ashwake-crossing:chain-maul-salvager",
                    cardId: "chain-maul-salvager",
                    name: "Chain-Maul Salvager",
                    type: "enemy",
                    deck: "red",
                    challenge: { stat: "grit", value: 7 },
                    blocksShop: true,
                    blocksSectorText: true
                  }
                ],
                occupants: [{ playerId: "seat-2", name: "Mira", characterName: "Signal Witch" }],
                strategicTags: ["locked", "danger"]
              }
            ]
          }
        })}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /locked.*ashwalk bridge/i }));
    expect(onIntent).not.toHaveBeenCalled();
    expect(screen.getByText(/chain-maul salvager/i)).toBeInTheDocument();
    expect(screen.getByText(/mira: signal witch/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm move/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "ashwake-crossing"
    });
  });

  it("shows disabled gated destinations and prevents confirming them", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: {
            active: true,
            movementValue: 1,
            currentSectorId: "middle_guardian_span",
            currentSectorName: "Guardian Span",
            destinations: [
              {
                sectorId: "inner_veil_rift",
                name: "Gate of Three Ashes",
                ring: "inner",
                distance: 1,
                route: ["middle_guardian_span", "inner_veil_rift"],
                routeNames: ["Guardian Span", "Gate of Three Ashes"],
                tags: ["movement"],
                threatIcons: [],
                ruleText: "Choose whether to anchor the surge or slip the fold.",
                faceUpThreats: [],
                occupants: [],
                strategicTags: ["gate"],
                disabledReason: "Resolve Guardian Span before entering the inner breach"
              }
            ]
          }
        })}
      />
    );

    expect(screen.getAllByText(/resolve guardian span before entering the inner breach/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /confirm move/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /confirm move/i }));
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("surfaces authored contract objective labels on accept and complete actions", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          availableContracts: [
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
              }
            }
          ]
        })}
      />
    );

    expect(screen.getByRole("button", { name: /accept crossing thread/i })).toBeInTheDocument();
    expect(screen.getByText(/clear the ashwake convoy lane/i)).toBeInTheDocument();

    cleanup();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          availableContracts: [
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
              }
            }
          ],
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              activeContract: {
                contractId: "cartel-crossing-thread",
                progress: 1
              }
            }
          }
        })}
      />
    );

    expect(
      screen.getByRole("button", { name: /complete crossing thread/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/clear the ashwake convoy lane \(1\/1 clears\)/i)).toBeInTheDocument();
  });

  it("offers stabilize when escalation is live and no encounter is blocking the action", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          escalationLevel: 2
        })}
      />
    );

    expect(screen.getByRole("button", { name: /stabilize breach/i })).toBeInTheDocument();
  });

  it("offers sector text resolution when the local board space is clear", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null
        })}
      />
    );

    expect(screen.getByRole("button", { name: /resolve hold the bridge/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for authored board-text choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "middle_shard_sprawl",
              name: "Shard Sprawl",
              regionTier: "midreach",
              neighbors: ["ashwake-crossing"],
              danger: 3,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "middle_shard_sprawl",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                heat: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "middle_shard_sprawl",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "middle_shard_sprawl",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              heat: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /take passage stock.*yard bargain/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /press for gossip.*yard bargain/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Webglass authored route choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "middle_webglass_breach",
              name: "Webglass Breach",
              regionTier: "midreach",
              neighbors: ["ashwake-crossing"],
              danger: 3,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "middle_webglass_breach",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                heat: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "middle_webglass_breach",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "middle_webglass_breach",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              heat: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /slip the hidden lane.*rail fracture/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /splice the relay seam.*rail fracture/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Guardian Span breach-entry choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "middle_guardian_span",
              name: "Guardian Span",
              regionTier: "midreach",
              neighbors: ["inner_veil_rift"],
              danger: 4,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "middle_guardian_span",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                heat: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "middle_guardian_span",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "middle_guardian_span",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              heat: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /align the threshold seals.*customs threshold/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ghost a route marker.*customs threshold/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Gate of Cinders final-breach choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "inner_gate_of_cinders",
              name: "Gate of Cinders",
              regionTier: "crownfall",
              neighbors: ["center_cinder_gate"],
              danger: 8,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "inner_gate_of_cinders",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                heat: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "inner_gate_of_cinders",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "inner_gate_of_cinders",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              heat: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /brace the cinder locks.*last signal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /time the relay pulse.*last signal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ghost the last breach path.*last signal/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Veil Rift breach-entry choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "inner_veil_rift",
              name: "Veil Rift",
              regionTier: "crownfall",
              neighbors: ["inner_cinder_lattice"],
              danger: 7,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "inner_veil_rift",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                heat: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "inner_veil_rift",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "inner_veil_rift",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              heat: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /anchor the surge.*three-ash entry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /slip the fold.*three-ash entry/i })).toBeInTheDocument();
  });

  it("renders separate sector-text actions for Cinder Lattice trial choices", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          sectors: [
            {
              id: "inner_cinder_lattice",
              name: "Cinder Lattice",
              regionTier: "crownfall",
              neighbors: ["inner_gate_of_cinders"],
              danger: 8,
              encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
            }
          ],
          players: [
            {
              seatId: "seat-1",
              sectorId: "inner_cinder_lattice",
              character: {
                id: "void-marshal",
                name: "Sable Vey",
                archetype: "Void Marshal",
                status: "active",
                activeContract: null,
                stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
                trophies: 0,
                heat: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          self: {
            seatId: "seat-1",
            sectorId: "inner_cinder_lattice",
            hand: [],
            notes: [],
            character: {
              id: "void-marshal",
              name: "Sable Vey",
              archetype: "Void Marshal",
              currentSpaceId: "inner_cinder_lattice",
              status: "active",
              stats: { command: 3, grit: 2, signal: 1, guile: 2, forge: 1 },
              trophies: 0,
              heat: 0,
              wounds: 0,
              scars: [],
              activeContract: null,
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /trace the ember pulses.*observatory trial/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read the ghost angles.*observatory trial/i })).toBeInTheDocument();
  });

  it("shows game over state and hides action buttons when the session has ended", () => {
    const { queryByRole } = render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          status: "ended",
          winnerSeatId: "seat-2"
        })}
      />
    );

    expect(screen.getByText(/game over: mira wins/i)).toBeInTheDocument();
    expect(queryByRole("button", { name: /attempt signal check/i })).not.toBeInTheDocument();
  });

  it("shows the enemy roll trigger only for the assigned roller", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeSeatIndex: 1,
          pendingEnemyRoll: {
            fighterSeatId: "seat-2",
            assignedRollerSeatId: "seat-1",
            encounterCardId: "cinder-veil-stalker",
            encounterTitle: "Cinder-Veil Stalker",
            stat: "grit"
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /roll for the enemy/i })).toBeInTheDocument();
    expect(screen.getByText(/seat-2 is engaged|mira is engaged/i)).toBeInTheDocument();
  });

  it("shows a waiting state for seats that are neither the fighter nor the assigned roller", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeSeatIndex: 1,
          seats: [
            { seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false },
            { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira", connected: true, ready: true, kicked: false },
            { seatId: "seat-3", characterId: "grave-engineer", displayName: "Pax", connected: true, ready: true, kicked: false }
          ],
          turnOrder: ["seat-2", "seat-3", "seat-1"],
          pendingEnemyRoll: {
            fighterSeatId: "seat-2",
            assignedRollerSeatId: "seat-3",
            encounterCardId: "cinder-veil-stalker",
            encounterTitle: "Cinder-Veil Stalker",
            stat: "grit"
          }
        })}
      />
    );

    expect(screen.getByText(/waiting on pax to roll for the enemy/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /roll for the enemy/i })).not.toBeInTheDocument();
  });

  it("renders active roll result and sends continue intent", () => {
    const onIntent = vi.fn();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          encounter: null,
          activeResolution: {
            id: "seat-1:threat:signal-static:test",
            playerId: "seat-1",
            source: "threat",
            stage: "roll_result",
            card: {
              id: "signal-static",
              title: "Signal Static",
              type: "hazard",
              artType: "threat"
            },
            battle: {
              stat: "signal",
              difficulty: 7,
              modifiers: [{ label: "Signal", value: 1 }]
            },
            roll: {
              dice: [2, 5],
              baseTotal: 7,
              modifierTotal: 1,
              finalTotal: 8,
              target: 7,
              success: true
            },
            outcome: {
              title: "Check passed",
              text: "Success: the signal holds.",
              effects: ["Success: gain a note."]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/roll: 2 \+ 5 \+ 1 = 8/i);
    expect(within(screen.getByTestId("phone-roll-result")).getByTestId("combat-die-attack")).toHaveTextContent("2");
    expect(within(screen.getByTestId("phone-roll-result")).getByTestId("combat-die-defense")).toHaveTextContent("5");
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/target: 7/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/success/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent("A 8 / D 7 / +1");
    expect(screen.getByTestId("phone-resolution-continue")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1"
    });
  });

  it("renders a recovery continue button for orphaned movement roll summaries", () => {
    const onIntent = vi.fn();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "resolution",
          encounter: null,
          activeResolution: null,
          outcomeSummary: {
            seatId: "seat-1",
            movedToSectorId: "ashwake-crossing",
            encounterCardId: null,
            encounterTitle: "Red March Outpost",
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
            summary: "Failed to enter Red March Outpost. Failure: gain 1 Heat."
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/roll: 3 \+ 2 \+ 1 = 6/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/target: 7/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/failure/i);
    expect(screen.getByText(/failed to enter red march outpost/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1"
    });
  });

  it("renders battle setup details from activeResolution", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:threat:cinder-veil-stalker:test",
            playerId: "seat-1",
            source: "threat",
            stage: "battle_setup",
            card: {
              id: "cinder-veil-stalker",
              title: "Cinder-Veil Stalker",
              type: "enemy",
              artType: "threat"
            },
            battle: {
              enemyName: "Cinder-Veil Stalker",
              stat: "grit",
              difficulty: 8,
              modifiers: [
                { label: "Grit", value: 2 },
                { label: "Enemy", value: 6 }
              ]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/battle setup/i);
    expect(screen.getByTestId("phone-battle-panel")).toHaveTextContent(/cinder-veil stalker/i);
    expect(screen.getByTestId("phone-battle-panel")).toHaveTextContent(/grit vs 8/i);
    expect(screen.getByTestId("phone-battle-panel")).toHaveTextContent(/grit \+2/i);
  });

  it("shows battle assist and opens usable combat cards during an enemy encounter", () => {
    const onIntent = vi.fn();
    const heldGear = [
      {
        id: "black-route-fuse",
        name: "Black Route Fuse",
        slot: "weapon" as const,
        category: "dangerous" as const,
        statBonus: { stat: "grit" as const, amount: 1 },
        activeText: "Break for +3 combat pressure, then advance escalation by 1.",
        useLimit: "discard" as const,
        heatCost: 1
      },
      {
        id: "coffin-rig",
        name: "Coffin Rig",
        slot: "armor" as const,
        category: "passive" as const,
        statBonus: { stat: "forge" as const, amount: 1 }
      }
    ];

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              heat: 1,
              heldGear
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-assist")).toHaveTextContent(/cinder-veil stalker/i);
    expect(screen.getByTestId("phone-battle-assist")).toHaveTextContent(/you have 1 card that can help/i);

    fireEvent.click(screen.getByRole("button", { name: /open combat cards/i }));

    expect(screen.getByTestId("phone-combat-card-drawer")).toHaveTextContent(/black route fuse/i);
    expect(screen.getByTestId("phone-combat-card-drawer")).not.toHaveTextContent(/coffin rig/i);

    fireEvent.click(within(screen.getByTestId("phone-combat-card-drawer")).getByRole("button", { name: /use black route fuse/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "black-route-fuse"
    });
  });

  it("does not interrupt battle flow when no combat cards are usable", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "cinder-veil-stalker",
            title: "Cinder-Veil Stalker",
            cardType: "enemy",
            enemyName: "Cinder-Veil Stalker",
            flavor: "The ash around it boils before the strike.",
            difficulty: 6,
            stat: "grit"
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              heldGear: [
                {
                  id: "coffin-rig",
                  name: "Coffin Rig",
                  slot: "armor" as const,
                  category: "passive" as const,
                  statBonus: { stat: "forge" as const, amount: 1 }
                }
              ]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-assist")).toHaveTextContent(/no combat cards are usable/i);
    expect(screen.queryByRole("button", { name: /open combat cards/i })).not.toBeInTheDocument();
  });

  it("shows defeated enemy trophy pile and stat raises available from trophies", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              trophies: 6,
              trophyPile: [
                {
                  cardId: "cinder-veil-stalker",
                  name: "Cinder-Veil Stalker",
                  trophyValue: 6,
                  spentValue: 0,
                  stat: "grit",
                  cardType: "enemy"
                }
              ]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-trophy-pile")).toHaveTextContent(/6 available/i);
    expect(screen.getByTestId("phone-trophy-pile")).toHaveTextContent(/cinder-veil stalker/i);
    expect(screen.getByTestId("phone-trophy-pile")).toHaveTextContent(/trophy 6\/6/i);
    expect(screen.getByTestId("phone-trophy-pile")).toHaveTextContent(/can raise: command, grit, signal, guile, forge/i);
    expect(screen.getByText(/6 held, 4 per rank/i)).toBeInTheDocument();
  });

  it("renders scenario and space outcome summaries from activeResolution", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:scenario:ambient:test",
            playerId: "seat-1",
            source: "scenario",
            stage: "outcome_summary",
            card: {
              id: "scenario_broken_seal",
              title: "Scenario Pressure",
              type: "scenario"
            },
            outcome: {
              title: "Scenario pressure",
              text: "The seal flares before the table can move on.",
              effects: ["Doom rises by 1."]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/outcome/i);
    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/scenario pressure/i);
    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/doom rises by 1/i);
  });
});
