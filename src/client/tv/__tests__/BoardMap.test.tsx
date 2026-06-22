// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
      { seatId: "seat-1", characterId: "void-marshal", displayName: "Lane Mercer", connected: true, kicked: false },
      { seatId: "seat-2", characterId: "signal-witch", displayName: "Mira Quill", connected: true, kicked: false }
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
          heat: 0,
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
          heat: 1,
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
  it("highlights exactly the active sector neighbors as legal targets", () => {
    render(<BoardMap patch={createPatch()} phase="navigation" />);

    expect(screen.getByTestId("sector-node-glassmere-spindle")).toHaveAttribute("data-legal-target", "true");
    expect(screen.getByTestId("sector-node-mirecoil-beacon")).toHaveAttribute("data-legal-target", "true");
    expect(screen.getByTestId("sector-node-ashwake-crossing")).toHaveAttribute("data-legal-target", "false");
    expect(screen.getByTestId("sector-node-hollow-veil-yard")).toHaveAttribute("data-legal-target", "false");
    expect(screen.getByTestId("sector-node-emberwatch-step")).toHaveAttribute("data-legal-target", "false");
  });

  it("renders nodes for the shared board-space layout and keeps live sector ids for active content", () => {
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

  it("renders one node per board space and connectors for the board routes", () => {
    const { container } = render(<BoardMap patch={createPatch()} phase="action" />);

    expect(container.querySelectorAll("[data-testid^='sector-node-']")).toHaveLength(BOARD_SPACES.length);
    expect(container.querySelectorAll("[data-testid='sector-connector']").length).toBeGreaterThanOrEqual(6);
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
    expect(screen.getByTestId("scenario-route-devourer-route-preview")).toBeInTheDocument();
  });

  it("renders a core aura for Broken Seal pressure at the Cinder Gate", () => {
    render(<BoardMap patch={createPatch()} phase="action" />);

    expect(screen.getByTestId("scenario-aura-broken-seal-aura")).toHaveAttribute("data-sector-id", "center_cinder_gate");
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
});
