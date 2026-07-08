// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("disables generic item/follower use shortcuts from server-confirmed use state", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="action"
        patch={createPatch({
          encounter: null,
          objectUseStates: [
            {
              source: "gear",
              id: "red-march-warbell",
              usedThisTurn: true,
              usedThisRound: true,
              remainingUses: 0,
              maxUses: 1,
              disabledReason: "Red March Warbell has already been used this turn."
            },
            {
              source: "follower",
              id: "choir-defector",
              usedThisTurn: true,
              usedThisRound: true,
              remainingUses: 0,
              maxUses: 1,
              disabledReason: "Choir Defector has already been used this round."
            }
          ],
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
              heldGear: [
                {
                  id: "red-march-warbell",
                  name: "Red March Warbell",
                  slot: "weapon",
                  category: "active",
                  statBonus: { stat: "grit", amount: 1 },
                  activeText: "Exhaust to add +2 to combat, then gain 1 heat.",
                  useLimit: "oncePerTurn"
                }
              ],
              equippedGear: { weapon: "red-march-warbell", armor: null, utility: null },
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
          }
        })}
      />
    );

    expect(screen.getByRole("button", { name: /use red march warbell/i })).toBeDisabled();
    expect(screen.getAllByText(/red march warbell has already been used this turn/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /use choir defector/i })).toBeDisabled();
    expect(screen.getAllByText(/choir defector has already been used this round/i).length).toBeGreaterThan(0);
  });

  it("does not show a misleading Use action for passive-only followers", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="action"
        patch={createPatch({
          encounter: null,
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
              heldGear: [],
              equippedGear: { weapon: null, armor: null, utility: null },
              followers: [
                {
                  id: "grave-medic-korr",
                  name: "Grave Medic Korr",
                  role: "medic",
                  text: "Passive: patch wounds after the dust settles.",
                  loyalty: 2,
                  lossCondition: "choice"
                }
              ],
              abilities: []
            }
          }
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /use grave medic korr/i })).not.toBeInTheDocument();
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
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/watch the tv/i);
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
    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--battle");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-battle-panel");
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/glass chime swarm/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/hazard/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/ringing tide skates/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/signal/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/target 6/i);
    expect(screen.getByTestId("phone-battle-subject-art")).toHaveAttribute("src", expect.stringMatching(/\/assets\/cards\/(threats|fallbacks)\//));
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/useful now: signal/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/current value 1/i);
    expect(screen.getByRole("button", { name: /attempt signal check/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /turn actions/i })).toBeInTheDocument();
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
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/cinder-veil stalker/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/enemy/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/battle/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/threat/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/grit/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/opponent 6/i);
    expect(screen.getByRole("button", { name: /enter combat.*cinder-veil stalker/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attempt grit check/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
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
    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--action");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-sector-action-panel");
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
  });

  it("renders movement planner destination intel without leaking hidden deck card names", async () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          activeContractCard: {
            id: "anchor-market-ledger",
            name: "Anchor Market Ledger",
            factionGiver: "Pale Cartels",
            text: "Recover a sealed ledger from Anchor Market before the route disappears.",
            objective: {
              type: "spaceTextResolved",
              effectKey: "outer_waymarketExchange",
              label: "Recover the Anchor Market ledger",
              target: 1
            }
          },
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
          },
          sectorExplorationSummary: {
            sectorId: "outer_ember_sanctum",
            sectorName: "Pilgrim Lock",
            printedThreatIcons: [],
            unresolvedThreats: [],
            drawCountsDue: { red: 0, blue: 0, yellow: 0 },
            sectorTextLocked: false,
            shopLocked: false,
            lockedReason: null,
            sectorTextTitle: "Pilgrim Rest",
            shopName: null,
            explanationLines: ["Pilgrim Lock is clear."]
          },
          publicResultDeltas: [
            {
              id: "move-global-escalation",
              type: "scenarioPressure",
              label: "Global Escalation",
              value: 1,
              sign: "gain",
              targetScope: "scenario",
              visibility: "public",
              source: "scenario",
              publicText: "+1 Global Escalation",
              severity: "scenario"
            }
          ],
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              activeContract: {
                contractId: "anchor-market-ledger",
                progress: 0
              }
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/choose destination/i);
    expect(screen.getByTestId("phone-current-prompt")).toHaveTextContent(/you rolled 1/i);
    expect(screen.queryByText(/turn console/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--move");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-move-panel");
    expect(screen.getByTestId("phone-action-content-root")).toContainElement(screen.getByTestId("phone-action-active-panel"));
    expect(screen.getByTestId("phone-action-content-root")).toContainElement(screen.getByTestId("phone-action-secondary-status"));
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/route and movement tools/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/movement roll 1/i);
    expect(screen.getByTestId("phone-useful-now")).not.toHaveAttribute("open");
    expect(screen.getByTestId("movement-current-tile-card")).toHaveTextContent(/current tile/i);
    expect(screen.getByTestId("movement-current-tile-name")).toHaveTextContent(/pilgrim lock/i);
    expect(screen.getByTestId("movement-current-tile-card")).toHaveTextContent(/pilgrims chain brass prayers/i);
    expect(screen.getByTestId("movement-current-tile-action")).toHaveTextContent(/pilgrim rest/i);
    expect(screen.getByTestId("movement-planner")).toBeInTheDocument();
    expect(screen.getByTestId("movement-dice-animation")).toHaveTextContent(/1/);
    expect(screen.getByTestId("movement-dice-animation").querySelector("[data-testid='combat-dice-animation']")).toHaveClass(
      "combat-dice-animation-compact"
    );
    expect(within(screen.getByTestId("movement-dice-animation")).getByTestId("combat-die-attack")).toHaveTextContent(/1/);
    expect(
      screen.getByTestId("phone-current-prompt").compareDocumentPosition(screen.getByTestId("phone-action-active-panel")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen.getByTestId("movement-list-view").compareDocumentPosition(screen.getByTestId("phone-useful-now")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen.getByTestId("movement-planner").compareDocumentPosition(screen.getByTestId("phone-action-secondary-status")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText(/move 1/i)).toBeInTheDocument();
    expect(screen.getByTestId("movement-summary")).toHaveTextContent(/move value/i);
    expect(screen.getByTestId("movement-summary")).toHaveTextContent(/pilgrim lock/i);
    expect(screen.getByTestId("movement-summary")).toHaveTextContent(/legal destinations/i);
    expect(screen.getAllByTestId("movement-destination-row")).toHaveLength(1);
    expect(screen.getByTestId("movement-destination-mission-marker")).toHaveTextContent(/mission/i);
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attempt signal check/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/global escalation/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/anchor market/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("movement-destination-lore")).toHaveTextContent(/market of sealed crates/i);
    expect(screen.getByTestId("movement-route-preview")).toHaveTextContent(/pilgrim lock -> anchor market/i);
    expect(screen.getByTestId("movement-route-preview")).toHaveTextContent(/^route:/i);
    expect(screen.getByTestId("movement-route-confidence")).toHaveTextContent(/1 step/i);
    expect(screen.getByTestId("movement-route-confidence")).toHaveTextContent(/shop reward/i);
    expect(screen.getByTestId("movement-route-confidence")).toHaveTextContent(/threat risk/i);
    expect(screen.getByTestId("movement-route-confidence")).toHaveTextContent(/0 blockers/i);
    const destinationCard = screen.getByTestId("movement-destination-row").querySelector(".phone-wrap-card");
    expect(destinationCard).toHaveClass("phone-wrap-card--movement", "phone-movement-row-button");
    expect(destinationCard?.querySelector(".phone-wrap-card__media")).toBeInTheDocument();
    expect(destinationCard?.querySelector('[data-testid="movement-tile-image"]')).toHaveAttribute(
      "src",
      "/assets/map/tiles/map_tile_anchor_market.png"
    );
    expect(destinationCard?.querySelector(".phone-wrap-card__actions")).toContainElement(
      screen.getByRole("button", { name: /select anchor market/i })
    );
    expect(screen.queryByText(/legal: exactly 1 step from pilgrim lock/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Icons")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /anchor market/i }));

    await waitFor(() => expect(screen.getByText("Icons")).toBeInTheDocument());
    expect(screen.getByTestId("movement-current-tile-name")).toHaveTextContent(/pilgrim lock/i);
    expect(screen.getByTestId("movement-detail-view")).toHaveTextContent(/anchor market/i);
    expect(screen.getByTestId("movement-detail-route-summary")).toHaveTextContent(/route: pilgrim lock -> anchor market/i);
    const detailCard = screen.getByTestId("movement-detail-view").querySelector(".phone-wrap-card");
    expect(detailCard).toHaveClass("phone-wrap-card--movement", "phone-movement-detail-hero");
    expect(detailCard?.querySelector('[data-testid="movement-tile-image"]')).toHaveAttribute(
      "src",
      "/assets/map/tiles/map_tile_anchor_market.png"
    );
    expect(screen.getByTestId("movement-detail-route-confidence")).toHaveTextContent(/1 step/i);
    expect(screen.getByTestId("movement-detail-route-confidence")).toHaveTextContent(/shop reward/i);
    expect(screen.getByTestId("movement-detail-mission")).toHaveTextContent(/can progress your mission/i);
    expect(detailCard?.querySelector(".phone-wrap-card__actions")).toContainElement(
      screen.getByRole("button", { name: /confirm move/i })
    );
    expect(screen.getByText("Icons")).toBeInTheDocument();
    expect(screen.getAllByText(/legal: exactly 1 step from pilgrim lock/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reward: anchor market services are available/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("movement-route-steps")).toHaveTextContent(/pilgrim lock/i);
    expect(screen.getByTestId("movement-confirm-footer")).toHaveTextContent(/this will end your movement/i);
    expect(screen.getAllByText(/green guile/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/buy gear \/ sell gear/i)).toBeInTheDocument();
    expect(screen.queryByText(/choir bulwark/i)).not.toBeInTheDocument();
  });

  it("shows current tile information before movement is rolled", () => {
    const onIntent = vi.fn<(intent: ClientIntent) => void>();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        selectedTurnTab="move"
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: null,
          activeContractCard: {
            id: "crossing-thread",
            name: "Crossing Thread",
            factionGiver: "Pale Cartels",
            text: "Clear the Ashwake convoy lane.",
            objective: {
              type: "spaceTextResolved",
              effectKey: "outer_ashwakeClearLane",
              label: "Clear the Ashwake convoy lane",
              target: 1
            }
          },
          players: [
            ...createPatch().players,
            {
              seatId: "seat-2",
              sectorId: "ashwake-crossing",
              character: {
                id: "signal-witch",
                name: "Mira",
                archetype: "Signal Witch",
                status: "active",
                activeContract: null,
                stats: { command: 1, grit: 2, signal: 4, guile: 3, forge: 1 },
                trophies: 0,
                heat: 0,
                wounds: 0,
                scars: [],
                heldGearCount: 0,
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          ],
          sectorExplorationSummary: {
            sectorId: "ashwake-crossing",
            sectorName: "Ashwalk Bridge",
            printedThreatIcons: ["yellow"],
            unresolvedThreats: [
              {
                instanceId: "ashwake-crossing:marrow-tax-auditors",
                cardId: "marrow-tax-auditors",
                name: "Marrow-Tax Auditors",
                type: "enemy",
                lane: "yellow",
                blocksShop: true,
                blocksSectorText: true
              }
            ],
            drawCountsDue: { red: 0, blue: 0, yellow: 1 },
            sectorTextLocked: true,
            shopLocked: true,
            lockedReason: "Clear Marrow-Tax Auditors first.",
            sectorTextTitle: "Hold the Bridge",
            shopName: null,
            explanationLines: ["A blocker is holding the bridge."]
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              activeContract: {
                contractId: "crossing-thread",
                progress: 0
              }
            }
          }
        })}
      />
    );

    const currentTile = screen.getByTestId("movement-current-tile-card");
    expect(currentTile).toHaveTextContent(/ashwalk bridge/i);
    expect(screen.getByTestId("movement-current-tile-region")).toHaveTextContent(/outer reach/i);
    expect(screen.getByTestId("movement-current-tile-region")).toHaveTextContent(/hazard/i);
    expect(screen.getByTestId("movement-current-tile-icons")).toHaveTextContent(/printed icons: 1 yellow/i);
    expect(screen.getByTestId("movement-current-tile-blockers")).toHaveTextContent(/blocked: marrow-tax auditors/i);
    expect(screen.getByTestId("movement-current-tile-shop")).toHaveTextContent(/shop: none/i);
    expect(screen.getByTestId("movement-current-tile-action")).toHaveTextContent(/action locked: clear marrow-tax auditors first/i);
    expect(screen.getByTestId("movement-current-tile-mission")).toHaveTextContent(/mission:/i);
    expect(screen.getByTestId("movement-current-tile-mission")).toHaveTextContent(/crossing thread/i);
    expect(screen.getByTestId("movement-current-tile-facts")).toHaveTextContent(/no new draw: printed lane occupied/i);
    expect(screen.getByTestId("movement-current-tile-occupants")).toHaveTextContent(/mira \(mira\)/i);
    expect(screen.getByTestId("movement-current-tile-image")).toHaveAttribute("src", "/assets/map/tiles/map_tile_hollow_gate.png");
    expect(screen.getAllByText(/roll movement to reveal your legal destinations/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("movement-list-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-subject-card")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /roll movement/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVEMENT_ROLL_REQUESTED",
      seatId: "seat-1"
    });
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
    expect(screen.getByRole("button", { name: /moving/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /moving/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "ashwake-crossing"
    });
    expect(onIntent).toHaveBeenCalledTimes(1);
  });

  it("shows compact movement feedback after a confirmed move outcome", async () => {
    vi.useFakeTimers();

    try {
      const initialPatch = createPatch({
        phase: "navigation",
        encounter: null,
        movementPlanner: {
          active: true,
          movementValue: 1,
          currentSectorId: "ashwake-crossing",
          currentSectorName: "Ashwalk Bridge",
          destinations: [
            {
              sectorId: "outer_waymarket",
              name: "Anchor Market",
              ring: "outer",
              distance: 1,
              route: ["ashwake-crossing", "outer_waymarket"],
              routeNames: ["Ashwalk Bridge", "Anchor Market"],
              tags: ["shop"],
              threatIcons: ["yellow"],
              ruleText: "Trade under the iron awnings.",
              faceUpThreats: [],
              occupants: [],
              strategicTags: ["shop", "reward"]
            }
          ]
        }
      });
      const { rerender } = render(
        <PhoneActionPanel
          characters={characters}
          onIntent={vi.fn()}
          selectedTurnTab="move"
          patch={initialPatch}
        />
      );

      rerender(
        <PhoneActionPanel
          characters={characters}
          onIntent={vi.fn()}
          selectedTurnTab="move"
          patch={createPatch({
            phase: "action",
            encounter: null,
            self: {
              ...createPatch().self!,
              sectorId: "outer_waymarket",
              character: {
                ...createPatch().self!.character,
                currentSpaceId: "outer_waymarket"
              }
            },
            players: createPatch().players.map((player) =>
              player.seatId === "seat-1"
                ? {
                    ...player,
                    sectorId: "outer_waymarket"
                  }
                : player
            ),
            outcomeSummary: {
              seatId: "seat-1",
              movedToSectorId: "outer_waymarket",
              encounterCardId: null,
              encounterTitle: null,
              encounterCardType: null,
              checkStat: null,
              die1: null,
              die2: null,
              statBonus: null,
              checkTotal: null,
              difficulty: null,
              summary: "Lane reached Anchor Market.",
              success: true
            }
          })}
        />
      );

      await act(async () => {});

      expect(screen.getByTestId("phone-movement-animation")).toHaveTextContent(/moving/i);
      expect(screen.getByTestId("phone-movement-animation")).toHaveTextContent(/ashwalk bridge to anchor market/i);
      expect(screen.getByTestId("phone-movement-animation")).toHaveAttribute("data-reduced-motion", "false");

      act(() => {
        vi.advanceTimersByTime(1300);
      });

      expect(screen.queryByTestId("phone-movement-animation")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps long movement rows readable and puts confirm in the detail footer", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: {
            active: true,
            movementValue: 6,
            currentSectorId: "ashwake-crossing",
            currentSectorName: "Ashwalk Bridge",
            destinations: [
              {
                sectorId: "pilgrim-lock-gate",
                name: "Weathered Pilgrim Lock Gate With a Very Long Signal Name",
                ring: "outer",
                distance: 6,
                route: [
                  "ashwake-crossing",
                  "votive-engine-room",
                  "deadwater-marsh",
                  "colony-outskirts",
                  "broken-census-hall",
                  "pilgrim-lock-gate"
                ],
                routeNames: [
                  "Ashwalk Bridge",
                  "Votive Engine Room",
                  "Deadwater Marsh",
                  "Colony Outskirts",
                  "Broken Census Hall",
                  "Weathered Pilgrim Lock Gate With a Very Long Signal Name"
                ],
                tags: ["shop", "objective"],
                threatIcons: [],
                ruleText: "If clear, open the Pilgrim trade lock.",
                loreText: "A fortified lock gate controlling access to the trade route.",
                shop: {
                  shopId: "pilgrim-lock-market",
                  shopName: "Pilgrim Lock Gate",
                  status: "open",
                  servicesPreview: ["Buy Gear", "Repair", "Trade"]
                },
                faceUpThreats: [],
                occupants: [],
                strategicTags: ["reward", "shop", "safe"]
              }
            ]
          }
        })}
      />
    );

    const row = screen.getByTestId("movement-destination-row");
    expect(screen.getByTestId("movement-current-sector")).toHaveTextContent("Ashwalk Bridge");
    expect(screen.getByTestId("movement-current-sector")).toHaveClass("phone-movement-summary-current");
    expect(row).toHaveTextContent(/weathered pilgrim lock gate/i);
    expect(screen.getByTestId("movement-destination-lore")).toHaveTextContent(/fortified lock gate/i);
    expect(row).toHaveTextContent(/6 steps/i);
    expect(row).toHaveTextContent(/shop reward/i);
    expect(row).toHaveTextContent(/low risk/i);
    expect(row).toHaveTextContent(/0 blockers/i);
    expect(screen.getByTestId("movement-route-preview")).toHaveClass("phone-movement-row-route");
    expect(screen.getByTestId("movement-route-preview")).toHaveTextContent(/ashwalk bridge -> votive engine room/i);
    expect(row.querySelector('[data-testid="movement-tile-fallback"]')).toBeInTheDocument();

    const scrollRoot = screen.getByTestId("phone-action-content-root");
    scrollRoot.scrollTop = 480;

    fireEvent.click(screen.getByRole("button", { name: /weathered pilgrim lock gate/i }));

    expect(screen.queryByTestId("movement-list-view")).not.toBeInTheDocument();
    expect(scrollRoot.scrollTop).toBe(0);
    expect(screen.getByTestId("movement-detail-view").querySelector(".phone-movement-detail-body")?.firstElementChild).toHaveClass(
      "phone-movement-detail-hero"
    );
    expect(screen.getByTestId("movement-detail-view").querySelector('[data-testid="movement-tile-fallback"]')).toBeInTheDocument();
    expect(screen.getByTestId("movement-detail-route-summary")).toHaveTextContent(/route: ashwalk bridge/i);
    expect(screen.getByTestId("movement-route-steps")).toHaveTextContent(/broken census hall/i);
    expect(screen.getByTestId("movement-detail-view").querySelector(".phone-wrap-card__actions")).toContainElement(
      screen.getByRole("button", { name: /confirm move/i })
    );
    expect(screen.getByTestId("movement-confirm-footer")).toHaveTextContent(/this will end your movement/i);
    expect(
      screen.getByRole("heading", { name: /weathered pilgrim lock gate/i }).compareDocumentPosition(screen.getByTestId("movement-route-steps")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen.getByTestId("movement-route-steps").compareDocumentPosition(screen.getByTestId("movement-confirm-footer")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen.getByTestId("movement-confirm-footer").compareDocumentPosition(screen.getByText(/sector effects/i)) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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
    expect(screen.getAllByText(/ignore this route for now/i).length).toBeGreaterThan(0);
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
                risk: "+1 Risk",
                enabled: true
              }
            ],
            revealedStock: [
              {
                cardId: "coffin-rig",
                name: "Coffin Rig",
                type: "gear",
                shopCategories: ["forge-armoury"],
                cost: { salvage: 3 },
                summary: "Forge +1 while bracing wounds.",
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
    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--shop");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-shop-command-panel");
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/salvage and sellable gear/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/1 item can be sold here/i);
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attempt signal check/i })).not.toBeInTheDocument();
    expect(screen.getByText(/forge market/i)).toBeInTheDocument();
    expect(screen.getAllByText(/forge armoury/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/salvage: 6/i)).toBeInTheDocument();
    expect(screen.getByText(/choose a market service/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("phone-shop-category-icon").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTestId("phone-shop-category-icon")[0]).toHaveAttribute("src", "/assets/riftfall/ui/shop-category-forge-armoury.svg");
    expect(screen.getByRole("button", { name: /skip \/ continue/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /buy gear/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_SERVICE_REQUESTED",
      seatId: "seat-1",
      serviceId: "buy-gear"
    });

    expect(screen.getByText(/coffin rig/i)).toBeInTheDocument();
    expect(screen.getByText(/forge \+1 while bracing wounds/i)).toBeInTheDocument();
    const buyCard = screen.getByText(/coffin rig/i).closest("article");
    expect(buyCard).not.toBeNull();
    expect(buyCard).toHaveClass("phone-wrap-card", "phone-wrap-card--shop");
    expect(buyCard?.querySelector(".phone-wrap-card__media")).toBeInTheDocument();
    expect(buyCard?.querySelector(".phone-wrap-card__image")).toHaveAttribute("src", "/assets/cards/artifacts/artifact-coffin-rig.png");
    expect(buyCard?.querySelector(".phone-wrap-card__description")).toHaveTextContent(/forge \+1 while bracing wounds/i);
    expect(buyCard?.querySelector(".phone-wrap-card__details")).toHaveTextContent(/cost: 3 salvage/i);
    expect(buyCard?.querySelector(".phone-wrap-card__actions")).toContainElement(
      within(buyCard as HTMLElement).getByRole("button", { name: /^buy$/i })
    );
    fireEvent.click(screen.getAllByRole("button", { name: /^buy$/i })[0]);
    expect(screen.getByRole("dialog", { name: /confirm purchase/i })).toHaveTextContent(/buy coffin rig for 3 salvage/i);
    expect(onIntent).not.toHaveBeenCalledWith({
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: "coffin-rig"
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm purchase/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_PURCHASE_REQUESTED",
      seatId: "seat-1",
      cardId: "coffin-rig"
    });

    expect(screen.getAllByText(/not enough salvage/i).length).toBeGreaterThan(0);
    const unaffordableCard = screen.getByText(/saintplate harness/i).closest("article");
    expect(unaffordableCard).not.toBeNull();
    expect(within(unaffordableCard as HTMLElement).getByRole("button", { name: /buy/i })).toBeDisabled();
    expect(unaffordableCard).toHaveTextContent(/ignore until you can pay or free the slot/i);
    expect(screen.getAllByText(/^sell$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/veil hook/i)).toBeInTheDocument();
    expect(screen.getByText(/1 salvage/i)).toBeInTheDocument();
    const nonSellableCard = screen.getByText(/oath-chain ledger/i).closest("article");
    expect(nonSellableCard).not.toBeNull();
    expect(within(nonSellableCard as HTMLElement).getByRole("button", { name: /sell/i })).toBeDisabled();
    expect(within(nonSellableCard as HTMLElement).getAllByText(/cannot sell this item/i).length).toBeGreaterThan(0);
    const sellableCard = screen.getByText(/veil hook/i).closest("article");
    expect(sellableCard).not.toBeNull();
    expect(sellableCard).toHaveClass("phone-wrap-card", "phone-wrap-card--shop", "phone-shop-sell-card");
    expect(sellableCard?.querySelector(".phone-wrap-card__media")).toBeInTheDocument();
    expect(sellableCard?.querySelector(".phone-wrap-card__image")).toHaveAttribute("src", "/assets/cards/artifacts/artifact-veil-hook.png");
    expect(sellableCard?.querySelector(".phone-wrap-card__details")).toHaveTextContent(/sell value: 1 salvage/i);
    expect(sellableCard?.querySelector(".phone-wrap-card__actions")).toContainElement(
      within(sellableCard as HTMLElement).getByRole("button", { name: /^sell$/i })
    );
    fireEvent.click(within(sellableCard as HTMLElement).getByRole("button", { name: /^sell$/i }));
    expect(screen.getByRole("dialog", { name: /confirm sale/i })).toHaveTextContent(/sell veil hook for 1 salvage/i);
    fireEvent.click(screen.getByRole("button", { name: /confirm sale/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-1",
      gearId: "veil-hook"
    });
    fireEvent.click(screen.getByRole("button", { name: /skip \/ continue/i }));
    expect(onIntent).toHaveBeenCalledWith({
      type: "SHOP_SKIP_REQUESTED",
      seatId: "seat-1"
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
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/shop blocked by threat/i);
    expect(screen.getAllByText(/shop blocked by threat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/market stalker/i).length).toBeGreaterThan(0);
  });

  it("allows the shop tab to show a no-shop state", () => {
    render(
      <PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="shop" patch={createPatch({ encounter: null, shopEncounter: null })} />
    );

    expect(screen.getByRole("tab", { name: /shop/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /shop/i })).toHaveTextContent(/locked/i);
    expect(screen.getByRole("tab", { name: /shop/i })).not.toHaveTextContent(/shop locked: no shop here/i);
    expect(screen.getByTestId("phone-turn-tab-reason")).toHaveTextContent(/shop locked/i);
    expect(screen.getByTestId("phone-turn-tab-reason")).toHaveTextContent(/no shop here/i);
    expect(within(screen.getByTestId("phone-action-active-panel")).getByRole("status")).toHaveTextContent(/no shop here/i);
    expect(screen.getByText(/shop services appear when your operative is on a clear market/i)).toBeInTheDocument();
  });

  it("shows a direct battle lock reason when no enemy or check is active", () => {
    render(
      <PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="battle" patch={createPatch({ encounter: null, pendingEnemyRoll: null })} />
    );

    expect(screen.getByRole("tab", { name: /battle/i })).toHaveTextContent(/locked/i);
    expect(screen.getByRole("tab", { name: /battle/i })).not.toHaveTextContent(/battle locked: no enemy here/i);
    expect(screen.getByRole("tab", { name: /battle/i })).toHaveAttribute("title", "Battle locked: no enemy here.");
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
  });

  it("shows a locked shop state during battle without rendering battle controls", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="shop"
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
          shopEncounter: null
        })}
      />
    );

    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--shop");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-shop-command-panel");
    expect(screen.getByTestId("phone-turn-tab-reason")).toHaveTextContent(/shop locked/i);
    expect(screen.getByTestId("phone-turn-tab-reason")).toHaveTextContent(/resolve battle first/i);
    expect(within(screen.getByTestId("phone-action-active-panel")).getByRole("status")).toHaveTextContent(/shop locked/i);
    expect(screen.getAllByText(/shop locked: resolve battle first/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ignore shop until the encounter is cleared/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
  });

  it("shows a locked action state during battle without duplicating battle content", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        selectedTurnTab="action"
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

    expect(screen.getByTestId("phone-action-panel-root")).toHaveClass("phone-action-panel--action");
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-sector-action-panel");
    expect(screen.getByTestId("phone-turn-tab-reason")).toHaveTextContent(/action locked/i);
    expect(screen.getByTestId("phone-turn-tab-reason")).toHaveTextContent(/resolve battle first/i);
    expect(within(screen.getByTestId("phone-action-active-panel")).getByText(/action locked: resolve battle first/i)).toBeInTheDocument();
    expect(within(screen.getByTestId("phone-action-active-panel")).getByText(/ignore sector actions until the battle tab is cleared/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-battle-assist")).not.toBeInTheDocument();
    expect(screen.queryByText(/sector math/i)).not.toBeInTheDocument();
  });

  it("clears stale action-tab content when the selected command screen changes", () => {
    const movementPatch = createPatch({
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
            tags: ["shop"],
            threatIcons: [],
            ruleText: "If clear, buy Gear.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["shop", "reward"]
          }
        ]
      }
    });
    const shopPatch = createPatch({
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
          salvage: 3,
          heat: 1,
          wounds: { current: 0, max: 6 },
          trophies: 0,
          completedContracts: 0
        },
        blockingThreats: [],
        services: [],
        revealedStock: [],
        sellInventory: []
      }
    });
    const battlePatch = createPatch({
      encounter: {
        id: "cinder-veil-stalker",
        title: "Cinder-Veil Stalker",
        cardType: "enemy",
        enemyName: "Cinder-Veil Stalker",
        flavor: "The ash around it boils before the strike.",
        difficulty: 6,
        stat: "grit"
      }
    });
    const actionPatch = createPatch({ encounter: null });

    const { rerender } = render(
      <PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="move" patch={movementPatch} />
    );

    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-move-panel");
    expect(screen.getByTestId("movement-planner")).toBeInTheDocument();

    rerender(<PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="battle" patch={movementPatch} />);
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-battle-panel");
    expect(screen.getByText(/no battle active/i)).toBeInTheDocument();
    expect(screen.getAllByText(/battle cards will appear here/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();

    rerender(<PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="shop" patch={shopPatch} />);
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-shop-command-panel");
    expect(screen.getByTestId("phone-shop-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();

    rerender(<PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="battle" patch={battlePatch} />);
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-battle-panel");
    expect(screen.getByRole("button", { name: /enter combat.*cinder-veil stalker/i })).toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();

    rerender(<PhoneActionPanel characters={characters} onIntent={vi.fn()} selectedTurnTab="action" patch={actionPatch} />);
    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-sector-action-panel");
    expect(screen.getByRole("button", { name: /end turn/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enter combat/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
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
          playerResultDeltas: [
            {
              id: "phone-shop-item",
              type: "itemBought",
              label: "Item bought",
              value: "Ashlock Carbine",
              sign: "gain",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              source: "shop:buy",
              publicText: "Sable Vey bought Ashlock Carbine.",
              severity: "reward"
            },
            {
              id: "phone-shop-salvage",
              type: "salvage",
              label: "Salvage",
              value: 3,
              sign: "loss",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              source: "shop:buy",
              publicText: "Sable Vey spent 3 Salvage.",
              severity: "loss"
            }
          ],
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

    expect(screen.getAllByText(/no stock available/i)).toHaveLength(1);
    expect(screen.getAllByText(/no sellable items/i)).toHaveLength(1);
    expect(screen.getByText(/use a buy service to reveal market stock/i)).toBeInTheDocument();
    expect(screen.getByText(/only sellable carried gear appears here/i)).toBeInTheDocument();
    expect(screen.getByTestId("phone-shop-category-icon")).toHaveAttribute("src", "/assets/riftfall/ui/shop-category-market.svg");
    expect(screen.getByText(/purchased: ashlock carbine/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Item bought: Ashlock Carbine/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/-3 Salvage/i).length).toBeGreaterThan(0);
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

  it("shows private rivalry useful-now hints only from the owner phone payload", () => {
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
            revealState: "revealAvailable",
            tableWarning: "Shown only on this phone.",
            objective: {
              id: "claim-black-ledger",
              title: "Claim the Black Ledger",
              summary: "Secret shop leverage",
              progressLabel: "ledgerMarks",
              progress: 2,
              target: 3,
              stakes: "Keep it quiet"
            },
            recentPrivateNotes: [],
            reveal: {
              state: "revealAvailable",
              available: true,
              label: "Reveal Agenda",
              hint: "Ready to reveal a public agenda moment.",
              lockedReason: null
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/private agenda/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/2\/3 ledgermarks/i);
    expect(screen.getByTestId("phone-useful-now")).toHaveTextContent(/ready to reveal a public agenda moment/i);
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
    expect(screen.getAllByText(/no legal destinations/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /confirm move/i })).not.toBeInTheDocument();
  });

  it("renders a no movement roll state without direct neighbor move buttons", () => {
    const onIntent = vi.fn();

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={onIntent}
        patch={createPatch({
          phase: "navigation",
          encounter: null,
          movementPlanner: null
        })}
      />
    );

    const planner = within(screen.getByTestId("movement-planner"));
    expect(planner.getAllByText(/^roll movement$/i).length).toBeGreaterThan(0);
    expect(planner.getByText(/roll movement to reveal your legal destinations/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /glassmere-spindle/i })).not.toBeInTheDocument();

    fireEvent.click(planner.getByRole("button", { name: /roll movement/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "MOVEMENT_ROLL_REQUESTED",
      seatId: "seat-1"
    });
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
          activeContractCard: {
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
          },
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
    expect(screen.getAllByText(/clear the ashwake convoy lane \(1\/1 clears\)/i).length).toBeGreaterThan(0);
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
              modifiers: [
                { label: "Signal", value: 1 },
                { label: "Affliction: Hollow Belly", value: -2 }
              ]
            },
            roll: {
              dice: [2, 5],
              baseTotal: 7,
              modifierTotal: -1,
              finalTotal: 6,
              target: 7,
              success: false
            },
            outcome: {
              title: "Check failed",
              text: "Failure: the signal collapses.",
              effects: ["Failure: lasting harm is handled by Scars."]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/roll: 2 \+ 5 - 1 = 6/i);
    expect(within(screen.getByTestId("phone-roll-result")).getByTestId("combat-die-attack")).toHaveTextContent("2");
    expect(within(screen.getByTestId("phone-roll-result")).getByTestId("combat-die-defense")).toHaveTextContent("5");
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/target: 7/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/failure/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent("A 6 / D 7 / -1");
    expect(screen.getByTestId("phone-battle-panel")).toHaveTextContent(/affliction: hollow belly -2/i);
    expect(screen.getByTestId("phone-resolution-continue")).toBeVisible();
    expect(
      screen.getByTestId("phone-resolution-continue").compareDocumentPosition(screen.getByTestId("phone-roll-result")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onIntent).toHaveBeenCalledWith({
      type: "CONTINUE_RESOLUTION",
      seatId: "seat-1"
    });
  });

  it("keeps completed movement context out of the battle command screen", () => {
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
          outcomeSummary: {
            seatId: "seat-1",
            movedToSectorId: "ashwake-crossing",
            encounterCardId: "cinder-veil-stalker",
            encounterTitle: "Cinder-Veil Stalker",
            encounterCardType: "enemy",
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
            summary: "Moved into Ashwake Crossing. Cinder-Veil Stalker is revealed."
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-battle-panel");
    expect(screen.queryByTestId("phone-movement-transition")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter combat.*cinder-veil stalker/i })).toBeInTheDocument();
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
            summary: "Failed to enter Red March Outpost. Failure: lasting harm is handled by Scars."
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/roll: 3 \+ 2 \+ 1 = 6/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/target: 7/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/failure/i);
    expect(screen.getAllByText(/failed to enter red march outpost/i).length).toBeGreaterThan(0);
    expect(
      screen.getByTestId("phone-resolution-continue").compareDocumentPosition(screen.getByTestId("phone-roll-result")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

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
              flavor: "The ash around it boils before the strike.",
              artType: "threat"
            },
            battle: {
              enemyName: "Cinder-Veil Stalker",
              stat: "grit",
              difficulty: 8,
              modifiers: [
                { label: "Base Grit", value: 2 },
                { label: "Black Route Fuse", value: 3 },
                { label: "Enemy", value: 6 }
              ]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/battle setup/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/cinder-veil stalker/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/ash around it boils/i);
    expect(screen.getByTestId("phone-battle-subject-art")).toHaveAttribute("src", expect.stringMatching(/\/assets\/cards\/(threats|fallbacks)\//));
    expect(screen.getByTestId("phone-battle-panel")).toHaveTextContent(/cinder-veil stalker/i);
    expect(screen.getByTestId("phone-battle-panel")).toHaveTextContent(/grit vs 8/i);
    expect(screen.getByTestId("phone-battle-panel")).toHaveTextContent(/base grit \+2/i);
    expect(screen.getByTestId("phone-battle-panel")).toHaveTextContent(/black route fuse \+3/i);
  });

  it("renders active anomaly test cards with fallback art and battle controls", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          activeResolution: {
            id: "seat-1:anomaly:unknown-test:setup",
            playerId: "seat-1",
            source: "anomaly",
            stage: "battle_setup",
            card: {
              id: "unknown-anomaly-test",
              title: "Null Choir Interference",
              type: "test",
              flavor: "A dead signal braids itself through the command channel.",
              artType: "anomaly"
            },
            battle: {
              stat: "command",
              difficulty: 7,
              modifiers: [
                { label: "Base Command", value: 3 },
                { label: "Relay Discipline", value: 1 }
              ]
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-battle-panel");
    expect(screen.getByRole("article", { name: /null choir interference test card/i })).toBeInTheDocument();
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/null choir interference/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/test/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/anomaly/i);
    expect(screen.getByTestId("phone-battle-subject-card")).toHaveTextContent(/dead signal braids/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/command/i);
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent(/target 7/i);
    expect(screen.getByTestId("phone-battle-subject-art")).toHaveAttribute("src", "/assets/cards/fallbacks/anomaly.svg");
    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/command vs 7/i);
    expect(screen.queryByTestId("movement-planner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("phone-shop-panel")).not.toBeInTheDocument();
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
        activeText: "Break for +3 Grit before the battle roll, then advance escalation by 1.",
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

  it("does not present Grit-only combat cards during Command battles", () => {
    const heldGear = [
      {
        id: "red-march-warbell",
        name: "Red March Warbell",
        slot: "weapon" as const,
        category: "active" as const,
        statBonus: { stat: "grit" as const, amount: 1 },
        activeText: "Mark the roll unstable to bank +2 Grit before the battle roll.",
        useLimit: "oncePerTurn" as const
      }
    ];

    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: {
            id: "gate-tax-collectors",
            title: "Gate-Tax Collectors",
            cardType: "enemy",
            enemyName: "Gate-Tax Collectors",
            flavor: "The toll stamp is already wet.",
            difficulty: 6,
            stat: "command"
          },
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              heat: 1,
              heldGear,
              equippedGear: { weapon: "red-march-warbell", armor: null, utility: null }
            }
          }
        })}
      />
    );

    expect(screen.getByTestId("phone-battle-assist")).toHaveTextContent(/no combat cards are usable/i);
    expect(screen.queryByRole("button", { name: /open combat cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /use red march warbell/i })).not.toBeInTheDocument();
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

  it("keeps trophies and stat upgrades out of the sector action tab", () => {
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

    expect(screen.getByTestId("phone-action-active-panel")).toHaveClass("phone-sector-action-panel");
    expect(screen.queryByTestId("phone-trophy-pile")).not.toBeInTheDocument();
    expect(screen.queryByText(/spend trophies equal to the next stat value/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grit 2 -> 3\s*cost 3 trophies/i })).not.toBeInTheDocument();
  });

  it("shows stat upgrade disabled reasons and upgrade result chips", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          encounter: null,
          playerResultDeltas: [
            {
              id: "upgrade-cost",
              type: "trophy",
              label: "Trophy",
              value: 4,
              sign: "loss",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              publicText: "Rumi spent 4 Trophies on training.",
              severity: "loss"
            },
            {
              id: "upgrade-stat",
              type: "statUpgrade",
              label: "Grit",
              value: 1,
              sign: "gain",
              targetScope: "personal",
              targetSeatId: "seat-1",
              visibility: "public",
              publicText: "Rumi upgraded Grit to 4.",
              severity: "reward"
            }
          ],
          self: {
            ...createPatch().self!,
            character: {
              ...createPatch().self!.character,
              stats: { command: 6, grit: 3, signal: 1, guile: 2, forge: 1 },
              trophies: 2
            }
          }
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /command 6\s*command is already at the maximum rank/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grit 3 -> 4\s*need 2 more trophies/i })).not.toBeInTheDocument();
    expect(screen.getByText(/-4 trophy/i)).toBeInTheDocument();
    expect(screen.getByText(/\+1 grit/i)).toBeInTheDocument();
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

  it("does not repeat identical success copy as both outcome text and bullet", () => {
    render(
      <PhoneActionPanel
        characters={characters}
        onIntent={vi.fn()}
        patch={createPatch({
          activeResolution: {
            id: "seat-1:threat:marrow-tax-auditors:test",
            playerId: "seat-1",
            source: "threat",
            stage: "outcome_summary",
            card: {
              id: "marrow-tax-auditors",
              title: "Marrow-Tax Auditors",
              type: "hazard"
            },
            outcome: {
              title: "Check passed",
              text: "Success: note added: You found a loophole in a dead empire tariff.",
              effects: ["Success: note added: You found a loophole in a dead empire tariff."]
            }
          }
        })}
      />
    );

    const resolutionCard = screen.getByTestId("phone-resolution-card");

    expect(within(resolutionCard).getAllByText(/you found a loophole in a dead empire tariff/i)).toHaveLength(1);
    expect(within(resolutionCard).queryByRole("listitem", { name: /you found a loophole/i })).not.toBeInTheDocument();
  });
});
