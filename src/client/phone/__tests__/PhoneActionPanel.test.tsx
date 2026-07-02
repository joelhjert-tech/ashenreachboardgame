// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/waiting for mira/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/watch the tv command table/i);
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

    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/resolve event/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/glass chime swarm/i);
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

    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/roll battle/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/cinder-veil stalker/i);
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

  it("renders movement planner destination intel without leaking hidden deck card names", async () => {
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

    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/choose destination/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/you rolled 1/i);
    expect(screen.getByTestId("movement-planner")).toBeInTheDocument();
    expect(screen.getByText(/move 1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/anchor market/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/legal: exactly 1 step from pilgrim lock/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reward: anchor market services are available/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Icons")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /anchor market/i }));

    await waitFor(() => expect(screen.getByText("Icons")).toBeInTheDocument());
    expect(screen.getByText("Icons")).toBeInTheDocument();
    expect(screen.getAllByText(/yellow guile/i).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/chain-maul salvager/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/legal: exactly 1 step from pilgrim lock/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/risk: chain-maul salvager/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/mira: signal witch/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.queryByRole("button", { name: /confirm move/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /locked.*ashwalk bridge/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm move/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "ashwake-crossing"
    });
  });

  it("shows disabled gated destinations and prevents confirming them", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: /gate of three ashes/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /confirm move/i })).toBeDisabled());
    expect(screen.getByRole("button", { name: /confirm move/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /confirm move/i }));
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("renders interactive shop services and revealed stock purchases", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          encounter: null,
          shopEncounter: {
            sectorId: "outer_waymarket",
            sectorName: "Anchor Market",
            shopId: "outer_waymarket",
            shopName: "Anchor Market",
            available: true,
            blocked: false,
            shopType: "forge market",
            shopCategory: "forge-armoury",
            stockCategory: "forge-armoury",
            status: "open",
            activePlayer: {
              playerId: "seat-1",
              name: "Sable Vey",
              characterName: "Sable Vey",
              salvage: 6,
              heat: 1,
              wounds: { current: 0, max: 6 },
              trophies: 0,
              completedContracts: 0
            },
            blockingThreats: [],
            services: [
              {
                id: "buy-gear",
                label: "Buy Gear",
                shopCategory: "forge-armoury",
                cost: {},
                enabled: true
              },
              {
                id: "risk-action",
                label: "Risk Action",
                cost: { heat: 1 },
                risk: "+1 Heat",
                enabled: true
              }
            ],
            revealedStock: [
              {
                cardId: "ashlock-carbine",
                name: "Ashlock Carbine",
                type: "gear",
                shopCategories: ["forge-armoury"],
                cost: { salvage: 3 },
                summary: "+1 Grit while fighting enemies.",
                affordable: true
              },
              {
                cardId: "saintplate-harness",
                name: "Saintplate Harness",
                type: "gear",
                cost: { salvage: 8 },
                summary: "Armor against wounds.",
                affordable: false,
                disabledReason: "Not enough Salvage"
              }
            ],
            sellInventory: [
              {
                gearId: "veil-hook",
                name: "Veil Hook",
                type: "gear",
                category: "active",
                sellValue: 1,
                summary: "Grit +1.",
                sellable: true
              },
              {
                gearId: "oath-chain-ledger",
                name: "Oath-Chain Ledger",
                type: "gear",
                category: "contractObject",
                sellValue: 1,
                summary: "Contract leverage.",
                sellable: false,
                disabledReason: "itemNotSellable"
              }
            ]
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/choose shop action/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/anchor market/i);
    expect(screen.getByText(/forge market/i)).toBeInTheDocument();
    expect(screen.getAllByText(/forge armoury/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/salvage: 6/i)).toBeInTheDocument();
    expect(screen.getAllByText(/choose gear to buy/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /buy gear/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });

    expect(screen.getByText(/ashlock carbine/i)).toBeInTheDocument();
    expect(screen.getByText(/\+1 grit while fighting enemies/i)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /^buy$/i })[0]);
    expect(screen.getByRole("dialog", { name: /confirm purchase/i })).toHaveTextContent(/buy ashlock carbine for 3 salvage/i);
    expect(onIntent).not.toHaveBeenCalledWith({
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: "ashlock-carbine"
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm purchase/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: "ashlock-carbine"
    });

    expect(screen.getAllByText(/not enough salvage/i).length).toBeGreaterThan(0);
    const unaffordableCard = screen.getByText(/saintplate harness/i).closest("article");
    expect(unaffordableCard).not.toBeNull();
    expect(within(unaffordableCard as HTMLElement).getByRole("button", { name: /buy/i })).toBeDisabled();
    expect(screen.getAllByText(/^sell$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/veil hook/i)).toBeInTheDocument();
    expect(screen.getByText(/1 salvage/i)).toBeInTheDocument();
    const nonSellableCard = screen.getByText(/oath-chain ledger/i).closest("article");
    expect(nonSellableCard).not.toBeNull();
    expect(within(nonSellableCard as HTMLElement).getByRole("button", { name: /sell/i })).toBeDisabled();
    expect(within(nonSellableCard as HTMLElement).getAllByText(/cannot sell this item/i).length).toBeGreaterThan(0);
    const sellableCard = screen.getByText(/veil hook/i).closest("article");
    expect(sellableCard).not.toBeNull();
    fireEvent.click(within(sellableCard as HTMLElement).getByRole("button", { name: /^sell$/i }));
    expect(screen.getByRole("dialog", { name: /confirm sale/i })).toHaveTextContent(/sell veil hook for 1 salvage/i);
    fireEvent.click(screen.getByRole("button", { name: /confirm sale/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: "veil-hook"
    });
    expect(screen.getByRole("tablist", { name: /turn actions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /shop/i })).toBeInTheDocument();
  });

  it("shows blocked shop reasons from the phone projection", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          shopEncounter: {
            sectorId: "outer_waymarket",
            sectorName: "Anchor Market",
            shopId: "outer_waymarket",
            shopName: "Anchor Market",
            available: false,
            blocked: true,
            blockedReason: "shopBlockedByThreat",
            blockedReasonText: "Shop blocked by threat.",
            shopType: "market",
            shopCategory: "market",
            stockCategory: "market",
            status: "locked",
            activePlayer: {
              playerId: "seat-1",
              name: "Sable Vey",
              characterName: "Sable Vey",
              salvage: 6,
              heat: 1,
              wounds: { current: 0, max: 6 },
              trophies: 0,
              completedContracts: 0
            },
            blockingThreats: [
              {
                cardId: "market-stalker",
                name: "Market Stalker",
                type: "enemy",
                challenge: { stat: "grit", value: 7 }
              }
            ],
            services: [],
            revealedStock: [],
            sellInventory: []
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/shop blocked/i);
    expect(screen.getAllByText(/shop blocked by threat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/market stalker/i).length).toBeGreaterThan(0);
  });

  it("allows the shop tab to show a no-shop state", () => {
    render(
      <PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="shop" patch={createPatch({ encounter: null, shopEncounter: null })} />
    );

    expect(screen.getByRole("tab", { name: /shop/i })).toBeInTheDocument();
    expect(screen.getByText(/no shop here/i)).toBeInTheDocument();
    expect(screen.getByText(/shop services appear when your operative is on a clear market/i)).toBeInTheDocument();
  });

  it("shows empty stock and purchase feedback without exposing rivalry agenda details", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          privateRivalry: {
            active: true,
            mode: "rivalry",
            secrecy: "private",
            revealState: "revealLocked",
            tableWarning: "Do not reveal private agenda data.",
            objective: {
              id: "claim-black-ledger",
              title: "Claim the Black Ledger",
              summary: "Secret shop leverage",
              progressLabel: "ledgerMarks",
              progress: 1,
              target: 3,
              stakes: "Keep it quiet"
            },
            recentPrivateNotes: ["Hidden-agenda reveal moments are not wired yet."],
            reveal: {
              state: "revealLocked",
              available: false,
              label: "Reveal agenda",
              hint: "Reveal is locked until this agenda's table moment becomes available.",
              lockedReason: "Reveal window has not opened."
            }
          },
          shopEncounter: {
            sectorId: "outer_waymarket",
            sectorName: "Anchor Market",
            shopId: "outer_waymarket",
            shopName: "Anchor Market",
            available: true,
            blocked: false,
            shopType: "market",
            shopCategory: "market",
            stockCategory: "market",
            status: "open",
            activePlayer: {
              playerId: "seat-1",
              name: "Sable Vey",
              characterName: "Sable Vey",
              salvage: 3,
              heat: 1,
              wounds: { current: 0, max: 6 },
              trophies: 0,
              completedContracts: 0
            },
            blockingThreats: [],
            services: [],
            revealedStock: [],
            sellInventory: [],
            recentOutcome: {
              operativeName: "Sable Vey",
              shopName: "Anchor Market",
              action: "buy",
              gained: "Ashlock Carbine",
              costPaid: { salvage: 3 },
              remainingSalvage: 3,
              summary: "Sable Vey purchased Ashlock Carbine."
            }
          }
        })}
      />
    );

    expect(screen.getAllByText(/no stock available/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no sellable items/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/purchased: ashlock carbine/i)).toBeInTheDocument();
    expect(screen.queryByText(/claim the black ledger/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/do not reveal private agenda data/i)).not.toBeInTheDocument();
  });

  it("shows sale feedback from recent shop outcomes", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          shopEncounter: {
            sectorId: "outer_waymarket",
            sectorName: "Anchor Market",
            shopId: "outer_waymarket",
            shopName: "Anchor Market",
            available: true,
            blocked: false,
            shopType: "market",
            shopCategory: "market",
            stockCategory: "market",
            status: "open",
            activePlayer: {
              playerId: "seat-1",
              name: "Sable Vey",
              characterName: "Sable Vey",
              salvage: 4,
              heat: 1,
              wounds: { current: 0, max: 6 },
              trophies: 0,
              completedContracts: 0
            },
            blockingThreats: [],
            services: [],
            revealedStock: [],
            sellInventory: [],
            recentOutcome: {
              operativeName: "Sable Vey",
              shopName: "Anchor Market",
              action: "sell",
              sold: "Veil Hook",
              salvageDelta: 1,
              remainingSalvage: 4,
              summary: "Sable Vey sold Veil Hook for 1 Salvage."
            }
          }
        })}
      />
    );

    expect(screen.getByText(/sold: veil hook/i)).toBeInTheDocument();
  });

  it("shows a movement planner empty state when no legal destinations are available", () => {
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
            currentSectorId: "middle_guardian_span",
            currentSectorName: "Guardian Span",
            destinations: []
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/no legal destination/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/you rolled 1/i);
    expect(screen.getByText(/no legal destinations/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm move/i })).not.toBeInTheDocument();
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
          encounter: null,
          sectorExplorationSummary: {
            sectorId: "ashwake-crossing",
            sectorName: "Ashwake Crossing",
            printedThreatIcons: ["red", "yellow"],
            unresolvedThreats: [],
            drawCountsDue: { red: 1, blue: 0, yellow: 1 },
            sectorTextLocked: false,
            shopLocked: false,
            lockedReason: null,
            sectorTextTitle: "Hold the Bridge",
            shopName: null,
            explanationLines: [
              "Printed icons: 1 red, 1 yellow.",
              "No unresolved blockers.",
              "Draw due: 1 red, 1 yellow.",
              "Sector text unlocked: Hold the Bridge."
            ]
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /resolve hold the bridge/i })).toBeInTheDocument();
    expect(screen.getByTestId("phone-sector-exploration")).toHaveTextContent(/sector math/i);
    expect(screen.getByTestId("phone-sector-exploration")).toHaveTextContent(/printed icons: 1 red, 1 yellow/i);
    expect(screen.getByTestId("phone-sector-exploration")).toHaveTextContent(/draw due: 1 red, 1 yellow/i);
    expect(screen.getByTestId("phone-sector-exploration")).toHaveTextContent(/sector text unlocked/i);
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
    expect(screen.getAllByText(/seat-2 is engaged|mira is engaged/i).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/failed to enter red march outpost/i).length).toBeGreaterThan(0);

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
