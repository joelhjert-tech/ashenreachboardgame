// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneActionPanel } from "../PhoneActionPanel.js";
import type { CharacterCatalogEntry, PhonePatchPayload } from "../../shared/types.js";

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
      { seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, kicked: false },
      { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira", connected: true, kicked: false }
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

    expect(screen.getByRole("button", { name: /enter combat with cinder-veil stalker/i })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /accept crossing thread \| clear the ashwake convoy lane/i })).toBeInTheDocument();

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
      screen.getByRole("button", { name: /complete crossing thread \| clear the ashwake convoy lane \(1\/1 clears\)/i })
    ).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /stabilize the breach/i })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /resolve clear lane/i })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /hard bargain: take passage stock/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hard bargain: press for gossip/i })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /fracture path: slip the hidden lane/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fracture path: splice the relay seam/i })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /threshold check: align the threshold seals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /threshold check: ghost a route marker/i })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /final gate: brace the cinder locks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /final gate: time the relay pulse/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /final gate: ghost the last breach path/i })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /breach entry: anchor the surge/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /breach entry: slip the fold/i })).toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /lattice trial: trace the ember pulses/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lattice trial: read the ghost angles/i })).toBeInTheDocument();
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

    expect(screen.getByText(/game over - winner: mira/i)).toBeInTheDocument();
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
            { seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, kicked: false },
            { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira", connected: true, kicked: false },
            { seatId: "seat-3", characterId: "grave-engineer", displayName: "Pax", connected: true, kicked: false }
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
});
