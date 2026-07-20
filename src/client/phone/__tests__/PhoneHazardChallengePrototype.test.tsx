// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhonePatchPayload } from "../../shared/types.js";
import {
  PhoneHazardChallengeView
} from "../PhoneHazardChallengePrototype.js";

function patch(): PhonePatchPayload {
  return {
    phase: "resolution",
    status: "active",
    sessionMode: "multiplayer",
    winnerSeatId: null,
    activeScenario: null,
    scenarioTelemetry: [],
    scenarioProgress: {},
    seats: [{ seatId: "seat-1", characterId: "void-marshal", displayName: "Lane", connected: true, ready: true, kicked: false }],
    sectors: [{
      id: "ashwake-crossing",
      name: "Ashwake Crossing",
      regionTier: "outer",
      neighbors: [],
      danger: 2,
      tileChallenges: [{
        id: "broken-processional",
        name: "The Broken Processional Beyond the Salt Archive",
        challengeType: "anomaly",
        sectorId: "ashwake-crossing",
        testStat: "guile",
        difficulty: 4,
        trigger: "onArrival",
        authoredOrder: 0,
        recurring: true,
        tags: ["trial"],
        lore: "The dead route repeats until an operative chooses the one unspoken path.",
        artCardId: "suture-storm",
        successSummary: "Pass safely and gain 1 Salvage.",
        failureSummary: "Gain 1 Wound, lose 1 Salvage, then resolve the Scar warning."
      }],
      encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
    }],
    players: [],
    activeSeatIndex: 0,
    turnOrder: ["seat-1"],
    escalationLevel: 0,
    escalationThreshold: 6,
    escalationModifier: 0,
    availableContracts: [],
    encounter: {
      id: "suture-storm",
      title: "The Broken Processional Beyond the Salt Archive",
      cardType: "hazard",
      presentationType: "hazard",
      flavor: "The dead route repeats until an operative chooses the one unspoken path.",
      difficulty: 4,
      stat: "guile"
    },
    pendingEnemyRoll: null,
    pendingTileChallenge: {
      challengeId: "broken-processional",
      sectorId: "ashwake-crossing",
      seatId: "seat-1",
      challengeType: "anomaly",
      testStat: "guile",
      difficulty: 4,
      authoredOrder: 0,
      totalChallenges: 1,
      rolled: false
    },
    outcomeSummary: null,
    activeResolution: {
      id: "resolution-1",
      playerId: "seat-1",
      source: "anomaly",
      stage: "battle_setup",
      card: {
        id: "suture-storm",
        title: "The Broken Processional Beyond the Salt Archive",
        type: "anomaly",
        flavor: "The dead route repeats until an operative chooses the one unspoken path.",
        artType: "anomaly"
      },
      battle: { stat: "guile", difficulty: 4, modifiers: [] }
    },
    recentAbilityTriggers: [],
    nemesis: null,
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
        stats: { command: 3, grit: 2, signal: 1, guile: 3, forge: 1 },
        trophies: 0,
        wounds: 0,
        scars: [],
        activeContract: null,
        heldGear: [],
        equippedGear: { weapon: null, armor: null, utility: null },
        abilities: []
      }
    }
  };
}

function renderView(onClick = vi.fn()) {
  return render(
    <PhoneHazardChallengeView
      patch={patch()}
      resolution={patch().activeResolution ?? null}
      actions={[{ key: "attempt", label: "Attempt Challenge", onClick }]}
      canContinue={false}
      onContinue={vi.fn()}
      resultDeltas={[]}
    />
  );
}

afterEach(() => cleanup());

describe("PhoneHazardChallengeView", () => {
  it("renders the selected cinematic layout from canonical test and effect data", () => {
    const view = renderView();
    expect(screen.getByText("Guile test · Target 4")).toBeVisible();
    expect(screen.getByText("Pass safely and gain 1 Salvage.")).toBeVisible();
    expect(screen.getByText("Gain 1 Wound, lose 1 Salvage, then resolve the Scar warning.")).toBeVisible();
    expect(screen.getByTestId("phone-test-primary-action")).toHaveTextContent("Attempt Challenge");
    expect(view.container.querySelector(".phone-encounter-art")).toBeInTheDocument();
    expect(screen.getByTestId("phone-action-active-panel")).toHaveAttribute("data-hazard-challenge-layout", "cinematic");
  });

  it("preserves the authoritative action and blocks duplicate submission", () => {
    const action = vi.fn();
    renderView(action);
    fireEvent.click(screen.getByRole("button", { name: "Attempt Challenge" }));
    expect(screen.getByRole("button", { name: /Waiting for server/ })).toBeDisabled();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("keeps details collapsed by default", () => {
    renderView();
    expect(screen.queryByRole("region", { name: "Encounter details" })).not.toBeInTheDocument();
  });
});
