// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneInventoryPanel } from "../PhoneInventoryPanel.js";
import { PortraitControllerView } from "../PortraitControllerView.js";
import type { CharacterCatalogEntry, PhonePatchPayload } from "../../shared/types.js";

const combatWeapon = {
  id: "black-route-fuse",
  name: "Black Route Fuse",
  slot: "weapon" as const,
  category: "dangerous" as const,
  statBonus: { stat: "grit" as const, amount: 1 },
  activeText: "Break for +3 combat pressure, then advance escalation by 1.",
  useLimit: "discard" as const,
  heatCost: 1
};

const passiveArmor = {
  id: "coffin-rig",
  name: "Coffin Rig",
  slot: "armor" as const,
  category: "passive" as const,
  statBonus: { stat: "forge" as const, amount: 1 }
};

const relic = {
  id: "choir-static-censer",
  name: "Choir Static Censer",
  slot: "utility" as const,
  category: "chargedRelic" as const,
  statBonus: { stat: "signal" as const, amount: 1 },
  activeText: "Spend 1 charge to reduce anomaly instability by 1 or lose 1 heat after a signal check.",
  useLimit: "charge" as const,
  charges: 2
};

const consumable = {
  id: "cinder-suture-kit",
  name: "Cinder Suture Kit",
  slot: "utility" as const,
  category: "consumable" as const,
  statBonus: { stat: "forge" as const, amount: 1 },
  activeText: "Discard to heal 1 wound, then gain 1 heat.",
  useLimit: "discard" as const
};

const questItem = {
  id: "oath-chain-ledger",
  name: "Oath-Chain Ledger",
  slot: "utility" as const,
  category: "contractObject" as const,
  statBonus: { stat: "command" as const, amount: 1 },
  activeText: "Mark a contract bargain and bank one safer completion route.",
  useLimit: "oncePerRound" as const
};

function createPatch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  const patch: PhonePatchPayload = {
    phase: "action",
    status: "active",
    sessionMode: "multiplayer",
    winnerSeatId: null,
    activeScenario: null,
    scenarioTelemetry: [],
    scenarioProgress: {},
    activeSeatIndex: 0,
    seats: [{ seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false }],
    turnOrder: ["seat-1"],
    sectors: [
      {
        id: "ashwake-crossing",
        name: "Ashwake Crossing",
        regionTier: "borderlight",
        neighbors: [],
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
          heat: 1,
          wounds: 0,
          scars: [],
          heldGearCount: 5,
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
      id: "cinder-veil-stalker",
      title: "Cinder-Veil Stalker",
      cardType: "enemy",
      enemyName: "Cinder-Veil Stalker",
      flavor: "The ash around it boils before the strike.",
      difficulty: 6,
      stat: "grit"
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
        heat: 1,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [combatWeapon, passiveArmor, relic, consumable, questItem],
        equippedGear: { weapon: null, armor: null, utility: null },
        followers: [
          {
            id: "choir-defector",
            name: "Choir Defector",
            role: "ritualist",
            text: "Once per round, reduce an anomaly instability or signal difficulty by 1 before rolling.",
            useLimit: "oncePerRound"
          }
        ],
        abilities: []
      }
    },
    nemesis: null
  };

  return {
    ...patch,
    ...overrides
  };
}

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

afterEach(() => {
  cleanup();
});

describe("PhoneInventoryPanel", () => {
  it("groups private inventory cards by type and shows usability status", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} />);

    expect(screen.getAllByText("Weapons").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Armor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Relics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Consumables").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Followers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Quest Items").length).toBeGreaterThan(0);
    expect(screen.getByText("Black Route Fuse")).toBeInTheDocument();
    expect(screen.getByText("Coffin Rig")).toBeInTheDocument();
    expect(screen.getAllByText("Passive").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Usable now").length).toBeGreaterThan(0);
  });

  it("sends a gear-use intent from a usable combat card", () => {
    const onIntent = vi.fn();

    render(<PhoneInventoryPanel patch={createPatch()} onIntent={onIntent} onlyUsable />);

    fireEvent.click(screen.getByRole("button", { name: /use black route fuse/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "black-route-fuse"
    });
  });

  it("exposes the portrait Inventory tab without replacing quick actions permanently", () => {
    render(
      <PortraitControllerView
        self={createPatch().self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId="seat-1"
        activeContractCard={null}
        patch={createPatch()}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /inventory/i }));

    expect(screen.getByLabelText("Inventory")).toHaveTextContent(/black route fuse/i);

    fireEvent.click(screen.getByRole("tab", { name: /player card/i }));

    expect(screen.getByTestId("phone-battle-assist")).toBeInTheDocument();
  });

  it("shows a locked pre-game character screen with Back instead of bottom navigation", () => {
    const onLobbyBack = vi.fn();
    const lobbyPatch = createPatch({
      phase: "start",
      status: "lobby",
      seats: [{ seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false }]
    });

    render(
      <PortraitControllerView
        self={lobbyPatch.self}
        roomCode="RT7P4"
        displayName="Lane"
        connectionStatus="open"
        activeSeatId={null}
        activeContractCard={null}
        patch={lobbyPatch}
        characters={characters}
        onIntent={vi.fn()}
        onLeave={vi.fn()}
        onLobbyBack={onLobbyBack}
      />
    );

    expect(screen.getByText(/character locked/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting for host to start the game/i)).toBeInTheDocument();
    expect(screen.getByText(/lane/i)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /inventory/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ready$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^back$/i }));

    expect(onLobbyBack).toHaveBeenCalledOnce();
  });

  it("keeps the combat-card drawer filtered to usable timing-window cards", () => {
    render(<PhoneInventoryPanel patch={createPatch()} onIntent={vi.fn()} onlyUsable />);

    const inventory = screen.getByLabelText(/inventory/i);

    expect(within(inventory).getByText("Black Route Fuse")).toBeInTheDocument();
    expect(within(inventory).queryByText("Coffin Rig")).not.toBeInTheDocument();
  });
});
