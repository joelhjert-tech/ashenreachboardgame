// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicPatchPayload, PublicPlayer, PublicSeat, StatePatch } from "../../shared/types.js";
import { SignalTheatreHost } from "../SignalTheatreHost.js";

const activeSeat = {
  seatId: "seat-1",
  displayName: "Nera",
  connected: true,
  ready: true,
  startingMissionSelected: true,
  kicked: false
} as PublicSeat;

const activePlayer = {
  seatId: "seat-1",
  sectorId: "scorched-road",
  character: { id: "char_bjornis", name: "Bjornis" }
} as PublicPlayer;

function makePatch(overrides: Partial<PublicPatchPayload> = {}, sequence = 14): StatePatch<PublicPatchPayload> {
  return {
    type: "STATE_PATCH",
    sessionId: "EMBER",
    sequence,
    phase: "broadcast",
    payload: {
      status: "active",
      sessionMode: "single-player",
      winnerSeatId: null,
      activeScenario: {
        id: "scenario-broken-seal",
        name: "The Broken Seal"
      } as PublicPatchPayload["activeScenario"],
      scenarioTelemetry: [],
      scenarioProgress: {},
      seats: [activeSeat],
      sectors: [{
        id: "scorched-road",
        name: "Scorched Road",
        regionTier: "outer",
        neighbors: [],
        danger: 1,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      }],
      players: [activePlayer],
      activeSeatIndex: 0,
      turnOrder: ["seat-1"],
      escalationLevel: 0,
      escalationThreshold: 8,
      escalationModifier: 0,
      availableContracts: [],
      encounter: null,
      pendingEnemyRoll: null,
      outcomeSummary: null,
      recentAbilityTriggers: [],
      nemesis: null,
      requiredAction: {
        id: "action-1",
        kind: "movement",
        actorSeatId: "seat-1",
        actorDisplayName: "Nera",
        requiredTab: "move",
        label: "Choose a route",
        detail: "Choose one legal destination.",
        canAct: true,
        waiting: false,
        privacy: "public"
      },
      movementPlanner: {
        active: true,
        movementValue: 3,
        rollResolutionId: "roll-3",
        currentSectorId: "scorched-road",
        currentSectorName: "Scorched Road",
        selectedDestinationId: "glass-causeway",
        destinations: [{
          sectorId: "glass-causeway",
          name: "Glass Causeway",
          ring: "outer",
          distance: 3,
          route: ["scorched-road", "relay-step", "glass-causeway"],
          routeNames: ["Scorched Road", "Relay Step", "Glass Causeway"],
          routeId: "route-1",
          tags: [],
          threatIcons: [],
          ruleText: "Resolve the printed signal.",
          faceUpThreats: [],
          occupants: [],
          strategicTags: []
        }]
      },
      ...overrides
    }
  };
}

function renderSignal(patch = makePatch(), synchronized = true) {
  return render(
    <SignalTheatreHost
      patch={patch}
      roomCode="EMBER"
      activeSeat={activeSeat}
      activePlayer={activePlayer}
      currentStepCopy="Choose one legal destination."
      synchronized={synchronized}
      connectionStatus="open"
    />
  );
}

describe("SignalTheatreHost", () => {
  afterEach(cleanup);

  it("renders the active sector as a full-screen environment with a heraldic operative piece", () => {
    const rendered = renderSignal();
    expect(screen.getByTestId("signal-theatre-host")).toHaveAttribute("data-signal-state", "movement");
    expect(screen.getByRole("heading", { name: "Scorched Road" })).toBeVisible();
    const stableTrack = screen.getByTestId("signal-journey-track");
    expect(stableTrack).toHaveClass("signal-journey-track--stable");
    expect(stableTrack.querySelectorAll(".signal-journey-track__node")).toHaveLength(7);
    expect(within(stableTrack).getByText("Event stop")).toBeVisible();
    expect(screen.getByRole("img", { name: "Nera, Bjornis, at the event stop" })).toHaveAttribute(
      "data-piece-id",
      "beacon"
    );
    expect(screen.getByText("Glass Causeway")).toBeVisible();
    expect(screen.getByText("Route confirmed")).toBeVisible();
    expect(rendered.container.querySelector("[data-signal-action-coin]")).toHaveAttribute(
      "data-signal-action-coin",
      "movement"
    );
    expect(screen.getByLabelText(/route confirmed.*scorched road.*movement action seal/i)).toBeVisible();

    const sources = Array.from(rendered.container.querySelectorAll("img")).map((image) => image.getAttribute("src"));
    expect(sources).toContain("/assets/riftfall/environments/signal-theatre/sectors/scorched-road.png");
    expect(sources).toContain("/assets/riftfall/characters/char_bjornis.png");
    expect(sources).not.toContain("/assets/riftfall/ui/signal-theatre/arrival-seal.png");
    expect(sources.every((source) => !source?.includes("/assets/map/tiles/"))).toBe(true);
  });

  it("announces an inward crossing from the authoritative current sector", () => {
    const gatePlayer = {
      ...activePlayer,
      sectorId: "outer_ember_sanctum"
    };
    render(
      <SignalTheatreHost
        patch={makePatch({
          movementPlanner: null,
          players: [gatePlayer],
          sectors: [{
            id: "outer_ember_sanctum",
            name: "Pilgrim Lock Gate",
            regionTier: "outer",
            neighbors: ["middle_red_march_outpost"],
            danger: 1,
            encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
          }]
        })}
        roomCode="EMBER"
        activeSeat={activeSeat}
        activePlayer={gatePlayer}
        currentStepCopy="Prepare the next route."
        synchronized
        connectionStatus="open"
      />
    );

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Inward route available");
    expect(note).toHaveTextContent("Choir Bastion");
    expect(note).toHaveTextContent("Harder challenges · stronger rewards");
  });

  it("uses public-safe host copy for an owner-private decision", () => {
    renderSignal(makePatch({
      movementPlanner: null,
      requiredAction: {
        id: "private-1",
        kind: "scar",
        actorSeatId: "seat-1",
        actorDisplayName: "Nera",
        requiredTab: "action",
        label: "Choose a hidden Scar",
        detail: "Secret Alpha or Secret Beta",
        canAct: true,
        waiting: true,
        privacy: "owner",
        hostInstruction: "Awaiting operative decision."
      }
    }));

    expect(screen.getByText("Awaiting operative decision.")).toBeVisible();
    expect(screen.queryByText(/Secret Alpha|Secret Beta/)).not.toBeInTheDocument();
  });

  it("shows a cinematic public-safe mission handoff while private choices stay on the owner phone", () => {
    const rendered = renderSignal(makePatch({
      movementPlanner: null,
      pendingMissionSelectionStatus: {
        ownerSeatId: "seat-1",
        status: "awaitingSelection"
      },
      requiredAction: {
        id: "mission:seat-1:15",
        kind: "mission",
        actorSeatId: "seat-1",
        actorDisplayName: "Nera",
        requiredTab: null,
        label: "Waiting for Nera",
        detail: "Waiting for Nera to choose a new private Contract.",
        canAct: false,
        waiting: true,
        privacy: "public",
        transitionStage: "private-resolution",
        revision: 15
      }
    }, 15));

    const mission = screen.getByTestId("signal-mission-selection");
    expect(mission).toHaveTextContent("Mission complete");
    expect(mission).toHaveTextContent("Nera is choosing a new private mission");
    expect(mission).toHaveTextContent("Mission details remain private");
    expect(rendered.container.querySelectorAll(".signal-theatre__mission-dossiers article")).toHaveLength(3);
    expect(rendered.container.querySelector(".signal-theatre__base")).toHaveAttribute("aria-hidden", "true");
    expect(rendered.container.querySelector("[data-signal-action-coin]")).toHaveAttribute(
      "data-signal-action-coin",
      "mission"
    );
    expect(mission).not.toHaveTextContent(/objective|reward:|contract id/i);
  });

  it("displays only server-authored totals without exposing the arithmetic breakdown", () => {
    const rendered = renderSignal(makePatch({
      movementPlanner: null,
      battlePresentation: {
        id: "battle-fixed",
        revision: 4,
        stage: "result",
        actorSeatId: "seat-1",
        actorDisplayName: "Nera",
        encounter: { name: "Ward Lock", category: "Hazard" },
        test: { stat: "forge", label: "Forge", opposed: false },
        operative: {
          name: "Bjornis",
          baseValue: 4,
          modifiers: [{ label: "Tool", value: 1, kind: "equipment" }],
          rawDice: [5],
          diceTotal: 5,
          finalTotal: 10
        },
        opponent: {
          name: "Ward Lock",
          baseValue: 8,
          modifiers: [],
          rawDice: [],
          diceTotal: 0,
          finalTotal: 8
        },
        outcome: "success",
        publicConsequence: "The seal opens.",
        publicRewardSummary: null,
        waiting: null,
        restored: false
      }
    }));

    const battle = screen.getByTestId("signal-sector-resolution");
    expect(battle).toHaveAttribute("data-resolution-mode", "sector-test");
    expect(battle).toHaveTextContent("10");
    expect(battle).toHaveTextContent("8");
    expect(battle).not.toHaveTextContent("Base");
    expect(battle).not.toHaveTextContent("Dice");
    expect(battle).not.toHaveTextContent("Tool +1");
    expect(battle).not.toHaveTextContent("FIXED");
    expect(screen.getByLabelText(/forge challenge.*ward lock.*forge challenge seal/i)).toBeVisible();
    expect(document.querySelector("[data-signal-action-coin='forge']")).toBeInTheDocument();
    expect(rendered.container.querySelector(".signal-theatre__base")).toHaveAttribute("aria-hidden", "true");

    rendered.rerender(
      <SignalTheatreHost
        patch={makePatch({ movementPlanner: null, battlePresentation: null })}
        roomCode="EMBER"
        activeSeat={activeSeat}
        activePlayer={activePlayer}
        currentStepCopy="Awaiting action."
        synchronized
        connectionStatus="open"
      />
    );
    expect(rendered.container.querySelector(".signal-theatre__base")).not.toHaveAttribute("aria-hidden");
  });

  it("focuses the resolution actor sector without substituting the active-turn player", () => {
    const resolutionSeat = {
      ...activeSeat,
      seatId: "seat-2",
      displayName: "Ilya",
      signalPieceId: "compass"
    } as PublicSeat;
    const resolutionPlayer = {
      seatId: "seat-2",
      sectorId: "ashen-chapel",
      character: { id: "char_vespera", name: "Vespera" }
    } as PublicPlayer;
    const rendered = renderSignal(makePatch({
      seats: [activeSeat, resolutionSeat],
      players: [activePlayer, resolutionPlayer],
      movementPlanner: null,
      battlePresentation: {
        id: "battle-other-actor",
        revision: 1,
        stage: "battle_ready",
        actorSeatId: "seat-2",
        actorDisplayName: "Ilya",
        encounter: { name: "Ash Warden", category: "Battle" },
        test: { stat: "grit", label: "Grit", opposed: true },
        operative: { name: "Vespera", baseValue: 4, modifiers: [], rawDice: [], diceTotal: null, finalTotal: null },
        opponent: { name: "Ash Warden", baseValue: 5, modifiers: [], rawDice: [], diceTotal: null, finalTotal: null },
        outcome: null,
        publicConsequence: null,
        publicRewardSummary: null,
        waiting: null,
        restored: false
      }
    }));

    expect(screen.getByTestId("signal-theatre-host")).toHaveAttribute("data-sector-id", "ashen-chapel");
    expect(rendered.container.querySelector(".signal-theatre__environment-image")).toHaveAttribute(
      "src",
      "/assets/riftfall/environments/signal-theatre/sectors/ashen-chapel.png"
    );
    expect(rendered.container.querySelector(".signal-journey-track__marker")).toHaveAttribute(
      "data-piece-id",
      "compass"
    );
    expect(rendered.container.querySelector(".signal-theatre__base")).toHaveAttribute("aria-hidden", "true");
  });

  it("does not show a false resolution marker when the actor is absent", () => {
    const rendered = renderSignal(makePatch({
      movementPlanner: null,
      battlePresentation: {
        id: "battle-missing-actor",
        revision: 1,
        stage: "battle_ready",
        actorSeatId: "seat-missing",
        actorDisplayName: "Missing operative",
        encounter: { name: "Ash Warden", category: "Battle" },
        test: { stat: "grit", label: "Grit", opposed: true },
        operative: { name: "Missing operative", baseValue: 4, modifiers: [], rawDice: [], diceTotal: null, finalTotal: null },
        opponent: { name: "Ash Warden", baseValue: 5, modifiers: [], rawDice: [], diceTotal: null, finalTotal: null },
        outcome: null,
        publicConsequence: null,
        publicRewardSummary: null,
        waiting: null,
        restored: false
      }
    }));

    expect(rendered.container.querySelector(".signal-journey-track__marker")).not.toBeInTheDocument();
  });

  it("finishes the authoritative arrival journey before showing the sector resolution", () => {
    const previousPatch = makePatch({}, 30);
    const currentPatch = makePatch({
      players: [{ ...activePlayer, sectorId: "glass-causeway" }],
      movementPlanner: null,
      battlePresentation: {
        id: "arrival-battle",
        revision: 1,
        stage: "battle_ready",
        actorSeatId: "seat-1",
        actorDisplayName: "Nera",
        encounter: { name: "Latchspire Raider", category: "Battle", imageKey: "latchspire-raider" },
        test: { stat: "grit", label: "Grit", opposed: true },
        operative: {
          name: "Bjornis",
          baseValue: 4,
          modifiers: [],
          rawDice: [],
          diceTotal: null,
          finalTotal: null
        },
        opponent: {
          name: "Latchspire Raider",
          baseValue: 3,
          modifiers: [],
          rawDice: [],
          diceTotal: null,
          finalTotal: null
        },
        outcome: null,
        publicConsequence: null,
        publicRewardSummary: null,
        waiting: null,
        restored: false
      }
    }, 31);

    render(
      <SignalTheatreHost
        patch={currentPatch}
        previousPatch={previousPatch}
        roomCode="EMBER"
        activeSeat={activeSeat}
        activePlayer={activePlayer}
        currentStepCopy="Resolve the encounter."
        synchronized
        connectionStatus="open"
      />
    );

    expect(screen.getByTestId("signal-theatre-host")).toHaveAttribute("data-signal-state", "movement");
    const movingTrack = screen.getByTestId("signal-journey-track");
    expect(movingTrack).toHaveAttribute("data-route-variant");
    expect(movingTrack).toHaveClass("signal-journey-track--departure");
    expect(movingTrack.querySelector("[data-piece-id='beacon']")).toBeInTheDocument();
    expect(screen.queryByTestId("signal-sector-resolution")).not.toBeInTheDocument();
  });

  it("keeps the stable state visible while reconnecting without changing its motion identity", () => {
    const patch = makePatch({}, 21);
    const first = renderSignal(patch, true);
    first.rerender(
      <SignalTheatreHost
        patch={patch}
        roomCode="EMBER"
        activeSeat={activeSeat}
        activePlayer={activePlayer}
        currentStepCopy="Choose one legal destination."
        synchronized={false}
        connectionStatus="open"
      />
    );

    expect(screen.getByTestId("signal-theatre-host")).toHaveAttribute("data-motion-id", "network:EMBER");
    expect(screen.getByText("Restoring authoritative state")).toBeVisible();
    expect(screen.getByText("No completed presentation will replay.")).toBeVisible();

    first.rerender(
      <SignalTheatreHost
        patch={patch}
        roomCode="EMBER"
        activeSeat={activeSeat}
        activePlayer={activePlayer}
        currentStepCopy="Choose one legal destination."
        synchronized={false}
        connectionStatus="open"
      />
    );
    expect(screen.getByTestId("signal-theatre-host")).toHaveAttribute("data-motion-id", "network:EMBER");
  });

  it("keeps six public seats present in the compact roster", () => {
    const seats = Array.from({ length: 6 }, (_, index) => ({
      ...activeSeat,
      seatId: `seat-${index + 1}`,
      displayName: `Op ${index + 1}`,
      connected: index !== 4
    })) as PublicSeat[];
    renderSignal(makePatch({ seats }));

    const roster = screen.getByRole("region", { name: "Operative connection and location status" });
    for (let index = 1; index <= 6; index += 1) {
      expect(within(roster).getByText(`Op ${index}`)).toBeVisible();
    }
    expect(within(roster).getByText(/Reconnecting/)).toBeVisible();
  });

  it("removes nonessential animation when reduced motion is requested", () => {
    const css = readFileSync(resolve("src/client/tv/SignalTheatreHost.css"), "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important");
  });
});
