// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhonePatchPayload } from "../../shared/types.js";
import {
  PhoneHazardChallengeView,
  isPhoneChallengeRelevantToSeat
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

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("PhoneHazardChallengeView", () => {
  it("renders the selected cinematic layout from canonical test and effect data", () => {
    const view = renderView();
    expect(screen.getByLabelText(/Anomaly trial: The Broken Processional/i)).toBeVisible();
    expect(screen.getByTestId("phone-battle-subject-details")).toHaveTextContent("Guile test · Target 4");
    expect(screen.getByText("Pass safely and gain 1 Salvage.")).toBeVisible();
    expect(screen.getByText("Gain 1 Wound, lose 1 Salvage, then resolve the Scar warning.")).toBeVisible();
    expect(screen.getByTestId("phone-test-primary-action")).toHaveTextContent("Attempt Challenge");
    expect(view.container.querySelector(".phone-encounter-art")).toBeInTheDocument();
    expect(screen.getByTestId("phone-action-active-panel")).toHaveAttribute("data-hazard-challenge-layout", "trial-theatre");
    expect(screen.getByTestId("phone-trial-cinematic-stage")).toHaveAccessibleName(/Sable Vey faces Anomaly/i);
    expect(screen.getByAltText("Sable Vey")).toHaveAttribute("src", expect.stringContaining("/assets/riftfall/characters/"));
    expect(view.container.querySelector(".phone-trial-rift img")).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/signal-theatre/stat-seals/guile.png"
    );
    expect(screen.getByTestId("phone-trial-total-comparison")).toHaveTextContent(/Your total—AgainstAnomaly total4/i);
  });

  it("preserves the authoritative action and blocks duplicate submission", () => {
    const action = vi.fn();
    renderView(action);
    fireEvent.click(screen.getByRole("button", { name: "Attempt Challenge" }));
    expect(screen.getByRole("button", { name: /Waiting for server/ })).toBeDisabled();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("ignores totals and outcomes from a stale presentation before the authoritative roll", () => {
    const stale = patch();
    stale.battlePresentation = {
      id: "resolution-from-previous-encounter",
      revision: 91,
      stage: "result",
      actorSeatId: "seat-1",
      actorDisplayName: "Lane",
      encounter: {
        name: "Previous Threat",
        category: "Hazard",
        imageKey: "previous-threat",
        publicSummary: "This summary belongs to the previous encounter."
      },
      test: { stat: "signal", label: "Signal", opposed: false },
      operative: {
        name: "Lane",
        secondaryName: "Sable Vey",
        imageKey: "void-marshal",
        baseValue: 4,
        modifiers: [],
        rawDice: [6, 6],
        diceCount: 2,
        diceTotal: 12,
        finalTotal: 13
      },
      opponent: {
        name: "Previous Threat",
        secondaryName: "Difficulty",
        imageKey: "previous-threat",
        baseValue: 6,
        modifiers: [],
        rawDice: [],
        diceCount: 0,
        diceTotal: null,
        finalTotal: 6
      },
      outcome: "success",
      publicConsequence: "Gain 9 Salvage.",
      publicRewardSummary: "Gain 9 Salvage.",
      waiting: null,
      restored: false
    };

    render(
      <PhoneHazardChallengeView
        patch={stale}
        resolution={stale.activeResolution ?? null}
        actions={[{ key: "attempt", label: "Attempt Challenge", onClick: vi.fn() }]}
        canContinue={false}
        onContinue={vi.fn()}
        resultDeltas={[]}
      />
    );

    expect(screen.getByRole("button", { name: "Attempt Challenge" })).toBeVisible();
    expect(screen.queryByText("Previous Threat")).not.toBeInTheDocument();
    expect(screen.queryByText(/Gain 9 Salvage/i)).not.toBeInTheDocument();
    expect(screen.queryByText("13")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Success$/i)).not.toBeInTheDocument();
  });

  it("keeps details collapsed by default", () => {
    renderView();
    expect(screen.queryByRole("region", { name: "Encounter details" })).not.toBeInTheDocument();
  });

  it("promotes a completed challenge into the reconnect-safe cinematic result gate", () => {
    const resolved = patch();
    resolved.pendingTileChallenge = {
      ...resolved.pendingTileChallenge!,
      rolled: true
    };
    resolved.activeResolution = {
      ...resolved.activeResolution!,
      stage: "outcome_summary",
      roll: {
        dice: [4, 3],
        baseTotal: 7,
        modifierTotal: 1,
        finalTotal: 8,
        target: 4,
        success: true
      },
      outcome: {
        title: "Route broken",
        text: "The Processional loses your trail.",
        effects: ["Gain 1 Salvage."]
      }
    };

    const view = render(
      <PhoneHazardChallengeView
        patch={resolved}
        resolution={resolved.activeResolution}
        actions={[]}
        canContinue
        onContinue={vi.fn()}
        resultDeltas={[]}
      />
    );

    expect(screen.getByTestId("phone-action-active-panel")).toHaveAttribute("data-hazard-challenge-layout", "result-gate");
    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/Route broken/i);
    expect(screen.getByTestId("phone-resolution-card")).toHaveTextContent(/Processional loses your trail/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveTextContent(/^Total8$/i);
    expect(screen.getByTestId("phone-roll-result")).toHaveAccessibleName("Your total 8, Challenge 4");
    expect(screen.getByTestId("phone-resolution-card")).not.toHaveTextContent(/your total|anomaly\s*4|vs/i);
    expect(screen.getByAltText(/operative portrait/i)).toHaveClass("phone-result-gate__portrait-art");
    expect(screen.getByTestId("phone-resolution-card").querySelector(".phone-result-gate__environment")).toHaveAttribute(
      "src",
      "/assets/riftfall/ui/result-ready/verdict-gate.webp"
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeVisible();
    expect(screen.queryByTestId("phone-trial-cinematic-stage")).not.toBeInTheDocument();
    expect(view.container.querySelectorAll("canvas")).toHaveLength(0);
  });

  it("focuses the challenge only for its authoritative owner and suppresses a replay after restoration", () => {
    const activePatch = patch();
    expect(isPhoneChallengeRelevantToSeat(activePatch, "seat-1")).toBe(true);
    expect(isPhoneChallengeRelevantToSeat(activePatch, "seat-2")).toBe(false);

    const first = renderView();
    expect(screen.getByTestId("phone-action-active-panel")).toHaveAttribute("data-trial-restored", "false");
    first.unmount();

    renderView();
    expect(screen.getByTestId("phone-action-active-panel")).toHaveAttribute("data-trial-restored", "true");
  });
});
