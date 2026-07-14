// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BOARD_SPACES } from "../../../game/data/boardSpaces.js";
import type { PublicPatchPayload } from "../../shared/types.js";
import { BoardMap } from "../BoardMap.js";

afterEach(() => {
  cleanup();
});

function createPatch(): PublicPatchPayload {
  return {
    status: "active",
    sessionMode: "multiplayer",
    winnerSeatId: null,
    activeScenario: {
      id: "scenario_broken_seal",
      name: "The Broken Seal",
      sheetArtPath: "/assets/scenarios/broken-seal.png",
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
    seats: [
      { seatId: "seat-1", characterId: "void-marshal", displayName: "Lane Mercer", connected: true, ready: true, kicked: false },
      { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira Quill", connected: true, ready: true, kicked: false }
    ],
    sectors: [
      {
        id: "ashwake-crossing",
        name: "Ashwake Crossing",
        regionTier: "borderlight",
        neighbors: ["glassmere-spindle", "mirecoil-beacon"],
        danger: 2,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "glassmere-spindle",
        name: "Glassmere Spindle",
        regionTier: "borderlight",
        neighbors: ["ashwake-crossing", "hollow-veil-yard"],
        danger: 3,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "mirecoil-beacon",
        name: "Mirecoil Beacon",
        regionTier: "borderlight",
        neighbors: ["ashwake-crossing", "hollow-veil-yard", "emberwatch-step"],
        danger: 4,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "hollow-veil-yard",
        name: "Hollow Veil Yard",
        regionTier: "borderlight",
        neighbors: ["glassmere-spindle", "mirecoil-beacon", "emberwatch-step"],
        danger: 3,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "emberwatch-step",
        name: "Emberwatch Step",
        regionTier: "borderlight",
        neighbors: ["mirecoil-beacon", "hollow-veil-yard"],
        danger: 5,
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
          wounds: 0,
          scars: [],
          heldGearCount: 0,
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      },
      {
        seatId: "seat-2",
        sectorId: "emberwatch-step",
        character: {
          id: "signal-witch",
          name: "Oris Vale",
          archetype: "Signal Witch",
          status: "active",
          activeContract: null,
          stats: { command: 1, grit: 1, signal: 3, guile: 2, forge: 1 },
          trophies: 0,
          wounds: 0,
          scars: [],
          heldGearCount: 0,
          equippedGear: { weapon: null, armor: null, utility: null }
        }
      }
    ],
    activeSeatIndex: 0,
    turnOrder: ["seat-1", "seat-2"],
    escalationLevel: 0,
    escalationThreshold: 6,
    escalationModifier: 0,
    availableContracts: [],
    recentAbilityTriggers: [],
    encounter: null,
    pendingEnemyRoll: null,
    outcomeSummary: {
      seatId: "seat-1",
      movedToSectorId: "ashwake-crossing",
      encounterCardId: "glass-chime-swarm",
      encounterTitle: "Glass Chime Swarm",
      encounterCardType: "hazard",
      checkStat: "signal",
      die1: 3,
      die2: 2,
      statBonus: 2,
      checkTotal: 7,
      difficulty: 6,
      success: true,
      summary: "Lane Mercer tuned through the swarm and held the path."
    },
    nemesis: null
  };
}

describe("BoardMap", () => {
  it("does not highlight legal targets before movement is rolled", () => {
    render(<BoardMap patch={createPatch()} phase="navigation" />);

    expect(screen.getByTestId("sector-node-glassmere-spindle")).toHaveAttribute("data-legal-target", "false");
    expect(screen.getByTestId("sector-node-mirecoil-beacon")).toHaveAttribute("data-legal-target", "false");
    expect(screen.getByTestId("sector-node-ashwake-crossing")).toHaveAttribute("data-legal-target", "false");
    expect(screen.getByTestId("sector-node-hollow-veil-yard")).toHaveAttribute("data-legal-target", "false");
    expect(screen.getByTestId("sector-node-emberwatch-step")).toHaveAttribute("data-legal-target", "false");
  });

  it("uses the public movement planner instead of falling back to adjacency when exact destinations are projected", () => {
    const patch: PublicPatchPayload = {
      ...createPatch(),
      movementPlanner: {
        active: true,
        movementValue: 2,
        currentSectorId: "ashwake-crossing",
        currentSectorName: "Ashwake Crossing",
        destinations: [
          {
            sectorId: "emberwatch-step",
            name: "Emberwatch Step",
            ring: "outer",
            distance: 2,
            route: ["ashwake-crossing", "mirecoil-beacon", "emberwatch-step"],
            routeNames: ["Ashwake Crossing", "Mirecoil Beacon", "Emberwatch Step"],
            tags: ["hazard"],
            threatIcons: ["red"],
            ruleText: "Cross the ember watch.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["danger"]
          },
          {
            sectorId: "glassmere-spindle",
            name: "Glassmere Spindle",
            ring: "outer",
            distance: 2,
            route: ["ashwake-crossing", "glassmere-spindle"],
            routeNames: ["Ashwake Crossing", "Glassmere Spindle"],
            tags: ["signal"],
            threatIcons: ["blue"],
            ruleText: "The spindle hums.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["safe"]
          },
          {
            sectorId: "hollow-veil-yard",
            name: "Hollow Veil Yard",
            ring: "outer",
            distance: 2,
            route: ["ashwake-crossing", "glassmere-spindle", "hollow-veil-yard"],
            routeNames: ["Ashwake Crossing", "Glassmere Spindle", "Hollow Veil Yard"],
            tags: ["gate"],
            threatIcons: ["blue"],
            ruleText: "The gate remains locked.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["gate"],
            disabledReason: "Resolve the gate first"
          }
        ]
      }
    };

    render(<BoardMap patch={patch} phase="navigation" />);

    expect(screen.getByTestId("sector-node-emberwatch-step")).toHaveAttribute("data-legal-target", "true");
    expect(screen.getByTestId("sector-node-glassmere-spindle")).toHaveAttribute("data-legal-target", "true");
    expect(screen.getByTestId("sector-node-mirecoil-beacon")).toHaveAttribute("data-legal-target", "false");
    expect(screen.getByTestId("sector-node-hollow-veil-yard")).toHaveAttribute("data-legal-target", "false");
    expect(screen.queryByTestId("movement-route-emberwatch-step-0-ashwake-crossing-mirecoil-beacon")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sector-node-emberwatch-step"));

    expect(screen.getByTestId("movement-route-emberwatch-step-0-ashwake-crossing-mirecoil-beacon")).toBeInTheDocument();
    expect(screen.getByTestId("movement-route-emberwatch-step-1-mirecoil-beacon-emberwatch-step")).toBeInTheDocument();
    expect(screen.queryByTestId("movement-route-glassmere-spindle-0-ashwake-crossing-glassmere-spindle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("movement-route-hollow-veil-yard-0-ashwake-crossing-glassmere-spindle")).not.toBeInTheDocument();
  });

  it("shows the selected legal route explanation in the board sidebar", () => {
    const patch: PublicPatchPayload = {
      ...createPatch(),
      movementPlanner: {
        active: true,
        movementValue: 2,
        currentSectorId: "ashwake-crossing",
        currentSectorName: "Ashwake Crossing",
        destinations: [
          {
            sectorId: "emberwatch-step",
            name: "Emberwatch Step",
            ring: "outer",
            distance: 2,
            route: ["ashwake-crossing", "mirecoil-beacon", "emberwatch-step"],
            routeNames: ["Ashwake Crossing", "Mirecoil Beacon", "Emberwatch Step"],
            tags: ["hazard", "objective"],
            threatIcons: ["red"],
            ruleText: "Cross the ember watch.",
            faceUpThreats: [
              {
                instanceId: "emberwatch-step:ash-wolf",
                cardId: "ash-wolf",
                name: "Ash Wolf",
                type: "enemy",
                deck: "red",
                challenge: { stat: "grit", value: 7 },
                blocksShop: true,
                blocksSectorText: true
              }
            ],
            occupants: [],
            strategicTags: ["danger"]
          }
        ]
      }
    };

    render(<BoardMap patch={patch} phase="navigation" />);

    fireEvent.click(screen.getByTestId("sector-node-emberwatch-step"));

    expect(screen.getByTestId("tv-route-preview")).toHaveTextContent(/move 2/i);
    expect(screen.getByTestId("tv-route-preview")).toHaveTextContent(/legal: exactly 2 steps from ashwake crossing/i);
    expect(screen.getByTestId("tv-route-preview")).toHaveTextContent(/ashwake crossing -> mirecoil beacon -> emberwatch step/i);
    expect(screen.getByTestId("tv-route-preview")).toHaveTextContent(/hazard/i);
    expect(screen.getByTestId("tv-route-preview")).toHaveTextContent(/danger: ash wolf/i);
  });

  it("renders rectangular board tiles for the shared board-space layout and keeps live sector ids for active content", () => {
    const { container } = render(<BoardMap patch={createPatch()} phase="action" />);
    const renderedSectorIds = Array.from(container.querySelectorAll("[data-testid^='sector-node-']")).map((element) =>
      element.getAttribute("data-sector-id")
    );
    const uniqueRenderedSectorIds = Array.from(
      new Set(renderedSectorIds.filter((value): value is string => typeof value === "string"))
    );

    expect(uniqueRenderedSectorIds.sort()).toEqual(BOARD_SPACES.map((space) => space.id).sort());
    expect(uniqueRenderedSectorIds).toEqual(expect.arrayContaining(createPatch().sectors.map((sector) => sector.id)));
  });

  it("renders one clickable tile per board space without the old connector graph", () => {
    const { container } = render(<BoardMap patch={createPatch()} phase="action" />);

    expect(container.querySelectorAll("[data-testid^='sector-node-']")).toHaveLength(BOARD_SPACES.length);
    expect(container.querySelectorAll("[data-testid='sector-connector']")).toHaveLength(0);
    expect(screen.getByTestId("host-map-fx-layer")).toBeInTheDocument();
  });

  it("constructs the board from individual tile PNG images instead of text-only cards", () => {
    const { container } = render(<BoardMap patch={createPatch()} phase="action" />);

    expect(container.querySelectorAll(".talisman-board-tile-art")).toHaveLength(BOARD_SPACES.length);
    expect(screen.getByTestId("tile-art-ashwake-crossing")).toHaveAttribute("src", expect.stringContaining("/assets/map/tiles/"));
    expect(screen.queryByTestId(/missing-tile-art-/)).not.toBeInTheDocument();
  });

  it("marks active mission sectors from player active contracts instead of generic contract pool cards", () => {
    const activeMissionPatch: PublicPatchPayload = {
      ...createPatch(),
      players: createPatch().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                activeContract: {
                  contractId: "choir-spindle-harmonics",
                  progress: 0
                }
              }
            }
          : player
      ),
      availableContracts: [
        {
          id: "choir-spindle-harmonics",
          name: "Spindle Harmonics",
          factionGiver: "Glass Choir",
          text: "Tune the Glassmere Spindle before the choir burns its last note.",
          objective: {
            type: "spaceTextResolved",
            effectKey: "outer_glassmereChorus",
            label: "Tune the Glassmere Spindle",
            target: 1
          }
        },
        {
          id: "contract-pool-only",
          name: "Pool Only",
          factionGiver: "Pale Cartels",
          text: "This public pool contract is not assigned to a player.",
          objective: {
            type: "spaceTextResolved",
            effectKey: "outer_ashwakeClearLane",
            label: "Clear Ashwake",
            target: 1
          }
        }
      ],
      movementPlanner: {
        active: true,
        movementValue: 1,
        currentSectorId: "ashwake-crossing",
        currentSectorName: "Ashwake Crossing",
        destinations: [
          {
            sectorId: "glassmere-spindle",
            name: "Glassmere Spindle",
            ring: "outer",
            distance: 1,
            route: ["ashwake-crossing", "glassmere-spindle"],
            routeNames: ["Ashwake Crossing", "Glassmere Spindle"],
            tags: ["signal"],
            threatIcons: ["blue"],
            ruleText: "Tune the spindle if the lane is clear.",
            loreText: "A choir spindle buried in wet glass.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["reward"]
          }
        ]
      }
    };

    const { rerender } = render(<BoardMap patch={activeMissionPatch} phase="navigation" />);

    expect(screen.getByTestId("sector-node-glassmere-spindle")).toHaveAttribute("data-mission-target", "true");
    expect(screen.getByTestId("sector-node-glassmere-spindle")).toHaveAttribute("data-legal-target", "true");
    expect(screen.getByTestId("sector-node-glassmere-spindle")).toHaveClass("talisman-board-tile-legal", "talisman-board-tile-mission");
    expect(screen.getByTestId("mission-marker-glassmere-spindle")).toHaveTextContent(/mission/i);
    expect(screen.getByTestId("sector-node-ashwake-crossing")).toHaveAttribute("data-mission-target", "false");

    const poolOnlyPatch: PublicPatchPayload = {
      ...activeMissionPatch,
      players: activeMissionPatch.players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              character: {
                ...player.character,
                activeContract: null
              }
            }
          : player
      )
    };

    rerender(<BoardMap patch={poolOnlyPatch} phase="navigation" />);

    expect(screen.getByTestId("sector-node-glassmere-spindle")).toHaveAttribute("data-mission-target", "false");
    expect(screen.queryByTestId("mission-marker-glassmere-spindle")).not.toBeInTheDocument();
    expect(screen.getByTestId("sector-node-ashwake-crossing")).toHaveAttribute("data-mission-target", "false");
  });

  it("updates token placement when a character moves to a different sector", () => {
    const patch = createPatch();
    const { rerender } = render(<BoardMap patch={patch} phase="action" />);

    expect(screen.getByTestId("token-seat-1")).toHaveAttribute("data-sector-id", "ashwake-crossing");

    const movedPatch: PublicPatchPayload = {
      ...patch,
      players: patch.players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              sectorId: "glassmere-spindle"
            }
          : player
      )
    };

    rerender(<BoardMap patch={movedPatch} phase="action" />);

    expect(screen.getByTestId("token-seat-1")).toHaveAttribute("data-sector-id", "glassmere-spindle");
  });

  it("marks a moved token as animating when previous and current authoritative sectors differ", () => {
    const previousPatch = createPatch();
    const movedPatch: PublicPatchPayload = {
      ...previousPatch,
      players: previousPatch.players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              sectorId: "glassmere-spindle"
            }
          : player
      )
    };

    render(<BoardMap patch={movedPatch} previousPatch={previousPatch} phase="action" />);

    expect(screen.getByTestId("token-seat-1")).toHaveAttribute("data-sector-id", "glassmere-spindle");
    expect(screen.getByTestId("token-seat-1")).toHaveAttribute("data-moving", "true");
    expect(screen.getByTestId("movement-token-animation-seat-1")).toHaveAttribute("data-from-sector-id", "ashwake-crossing");
    expect(screen.getByTestId("movement-token-animation-seat-1")).toHaveAttribute("data-to-sector-id", "glassmere-spindle");
    expect(screen.getByTestId("movement-arrival-pulse-seat-1")).toBeInTheDocument();
  });

  it("uses the projected movement route for the cinematic travel overlay when it is cached before confirm", () => {
    const previousPatch: PublicPatchPayload = {
      ...createPatch(),
      movementPlanner: {
        active: true,
        movementValue: 2,
        currentSectorId: "ashwake-crossing",
        currentSectorName: "Ashwake Crossing",
        destinations: [
          {
            sectorId: "emberwatch-step",
            name: "Emberwatch Step",
            ring: "outer",
            distance: 2,
            route: ["ashwake-crossing", "mirecoil-beacon", "emberwatch-step"],
            routeNames: ["Ashwake Crossing", "Mirecoil Beacon", "Emberwatch Step"],
            tags: ["hazard"],
            threatIcons: ["red"],
            ruleText: "Cross the ember watch.",
            faceUpThreats: [],
            occupants: [],
            strategicTags: ["danger"]
          }
        ]
      }
    };
    const { rerender } = render(<BoardMap patch={previousPatch} phase="navigation" />);
    const movedPatch: PublicPatchPayload = {
      ...previousPatch,
      movementPlanner: null,
      players: previousPatch.players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              sectorId: "emberwatch-step"
            }
          : player
      )
    };

    rerender(<BoardMap patch={movedPatch} previousPatch={previousPatch} phase="action" />);

    expect(screen.getByTestId("token-seat-1")).toHaveAttribute("data-sector-id", "emberwatch-step");
    expect(screen.getByTestId("movement-token-animation-seat-1")).toHaveAttribute(
      "data-route",
      "ashwake-crossing mirecoil-beacon emberwatch-step"
    );
    expect(screen.getByTestId("movement-travel-route-seat-1-0-ashwake-crossing-mirecoil-beacon")).toBeInTheDocument();
    expect(screen.getByTestId("movement-travel-route-seat-1-1-mirecoil-beacon-emberwatch-step")).toBeInTheDocument();
  });

  it("renders a scenario marker on the board for roaming scenario pressure", () => {
    const patch: PublicPatchPayload = {
      ...createPatch(),
      activeScenario: {
        id: "scenario_devourer_beneath",
        name: "The Devourer Beneath",
        theme: "A world-burrowing maw moves clockwise through the outer ring.",
        difficulty: "medium-hard",
        pressureSummary: "Doom stands at 2/8. The Devourer circles Glassmere Spindle and eats local threats as it moves.",
        confrontationTitle: "Enter the Maw",
        progressLabel: "mawStrikes",
        progress: 0,
        threshold: 1,
        setup: ["Place 1 Devourer token on the outer tier."],
        specialRules: ["At the end of each player turn, move the Devourer token 1 outer space clockwise."],
        confrontationSteps: ["Fight the Final Devourer in a Strength battle 14."],
        victoryText: "If you defeat the Final Devourer, you win the game."
      },
      scenarioTelemetry: [
        { label: "Doom Tokens", value: "2" },
        { label: "Devourer", value: "Glassmere Spindle" }
      ],
      scenarioProgress: {
        doomTokens: 2,
        devourerIndex: 1
      }
    };

    render(<BoardMap patch={patch} phase="action" />);

    expect(screen.getByTestId("scenario-marker-devourer-orbit")).toHaveAttribute("data-sector-id", "glassmere-spindle");
    expect(screen.queryByTestId("scenario-route-devourer-route-preview")).not.toBeInTheDocument();
  });

  it("renders a core aura for Broken Seal pressure at the Cinder Gate", () => {
    render(<BoardMap patch={createPatch()} phase="action" />);

    expect(screen.getByTestId("scenario-aura-broken-seal-aura")).toHaveAttribute("data-sector-id", "center_cinder_gate");
    expect(screen.getByTestId("tile-art-center_cinder_gate")).toHaveAttribute("src", "/assets/scenarios/broken-seal.png");
    expect(screen.getByTestId("sector-node-center_cinder_gate")).toHaveAttribute("data-sector-id", "center_cinder_gate");
    expect(screen.getByTestId("sector-node-center_cinder_gate")).toHaveTextContent("Final Confrontation");
  });

  it("uses the selected scenario art without changing the center-sector identity", () => {
    const patch = createPatch();
    patch.activeScenario = {
      ...patch.activeScenario!,
      id: "scenario_devourer_beneath",
      name: "The Devourer Beneath",
      sheetArtPath: "/assets/scenarios/ashwalk-breach.png"
    };

    render(<BoardMap patch={patch} phase="action" />);

    expect(screen.getByTestId("tile-art-center_cinder_gate")).toHaveAttribute("src", "/assets/scenarios/ashwalk-breach.png");
    expect(screen.getByTestId("sector-node-center_cinder_gate")).toHaveAttribute("data-sector-id", "center_cinder_gate");
  });

  it("falls back to canonical center art when selected scenario art is missing", () => {
    render(<BoardMap patch={createPatch()} phase="action" />);
    const art = screen.getByTestId("tile-art-center_cinder_gate");

    fireEvent.error(art);

    expect(art).toHaveAttribute("src", expect.stringContaining("/assets/map/tiles/"));
    expect(screen.getByTestId("sector-node-center_cinder_gate")).toHaveTextContent("Final Confrontation");
  });

  it("renders the escalation spine marker for the live breach track", () => {
    render(
      <BoardMap
        patch={{
          ...createPatch(),
          escalationLevel: 4,
          escalationThreshold: 6
        }}
        phase="action"
      />
    );

    expect(screen.getByTestId("scenario-marker-escalation-spine")).toHaveTextContent("4/6");
  });

  it("surfaces confrontation intent and entry rules from board-space data in the sidebar", () => {
    const patch = createPatch();
    patch.players[0] = {
      ...patch.players[0]!,
      sectorId: "center_cinder_gate"
    };
    patch.activeSeatIndex = 0;
    patch.seats = [{ ...patch.seats[0]! }];
    patch.turnOrder = ["seat-1"];
    patch.sectors = [
      {
        id: "center_cinder_gate",
        name: "The Cinder Gate",
        regionTier: "cinder_gate",
        neighbors: ["inner_gate_of_cinders"],
        danger: 10,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ];

    render(<BoardMap patch={patch} phase="action" />);

    expect(screen.getByText(/scenario confrontation space/i)).toBeInTheDocument();
    expect(screen.getByText(/reseal the prison/i)).toBeInTheDocument();
    expect(screen.getByText(/sector rule/i)).toBeInTheDocument();
    expect(screen.getByText(/scenario directive controls the final confrontation/i)).toBeInTheDocument();
    expect(screen.getByText(/the ashen reach core is not a place/i)).toBeInTheDocument();
    expect(screen.getByText(/from the last signal well/i)).toBeInTheDocument();
    expect(screen.getByText(/needs gate-of-cinders-breached/i)).toBeInTheDocument();
  });
});
