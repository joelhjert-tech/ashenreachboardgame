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
  return {
    phase: "action",
    status: "active",
    winnerSeatId: null,
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
          heat: 0,
          wounds: 0,
          scars: [],
          heldGearCount: 0,
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      }
    ],
    escalationLevel: 0,
    availableContracts: [],
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
        heat: 0,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [],
        equippedGear: { weapon: null, armor: null, utility: null },
        abilities: []
      }
    },
    ...overrides
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
