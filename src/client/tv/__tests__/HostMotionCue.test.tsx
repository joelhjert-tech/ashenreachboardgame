// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PublicPatchPayload, PublicPlayer, PublicSeat, StatePatch } from "../../shared/types.js";
import { HostMotionCue, buildHostMotionCueModel } from "../HostMotionCue.js";

const activeSeat = {
  seatId: "seat-1",
  displayName: "Mara",
  connected: true,
  ready: true,
  startingMissionSelected: true,
  kicked: false
} as PublicSeat;

const activePlayer = {
  seatId: "seat-1",
  sectorId: "ashen-chapel",
  character: { name: "Mara Vex" }
} as PublicPlayer;

function makePatch(overrides: Partial<PublicPatchPayload> = {}, sequence = 10): StatePatch<PublicPatchPayload> {
  return {
    type: "STATE_PATCH",
    sessionId: "ROOM",
    sequence,
    phase: "broadcast",
    payload: {
      status: "active",
      sessionMode: "single-player",
      winnerSeatId: null,
      activeScenario: null,
      scenarioTelemetry: [],
      scenarioProgress: {},
      seats: [activeSeat],
      sectors: [{ id: "ashen-chapel", name: "Ashen Chapel", regionTier: "outer", neighbors: [], danger: 1, encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] } }],
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
        kind: "action",
        actorSeatId: "seat-1",
        actorDisplayName: "Mara",
        requiredTab: "action",
        label: "Choose an action",
        detail: "Choose one legal action.",
        canAct: true,
        waiting: false,
        privacy: "public"
      },
      ...overrides
    }
  };
}

function build(overrides: Partial<PublicPatchPayload> = {}, movementPresenting = false) {
  return buildHostMotionCueModel({
    patch: makePatch(overrides),
    activeSeat,
    activePlayer,
    currentStepCopy: "Choose one legal action.",
    movementPresenting,
    synchronized: true
  });
}

describe("HostMotionCue", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  it("presents the authoritative active actor and next action", () => {
    const model = build();
    expect(model).toMatchObject({
      kind: "turn",
      title: "Mara",
      actor: "Mara",
      activeProgressIndex: 1
    });
  });

  it("presents server-authored movement without creating a route", () => {
    const model = build({
      movementPlanner: {
        active: true,
        movementValue: 4,
        rollResolutionId: "roll-4",
        currentSectorId: "ashen-chapel",
        currentSectorName: "Ashen Chapel",
        selectedDestinationId: "iron-choir",
        destinations: [{
          sectorId: "iron-choir",
          name: "Iron Choir",
          ring: "outer",
          distance: 4,
          route: ["ashen-chapel", "iron-choir"],
          routeNames: ["Ashen Chapel", "Iron Choir"],
          routeId: "route-1",
          tags: [],
          threatIcons: [],
          ruleText: "Resolve the printed threat.",
          faceUpThreats: [],
          occupants: [],
          strategicTags: []
        }]
      }
    });
    expect(model).toMatchObject({ kind: "movement", title: "Iron Choir", location: "Iron Choir" });
    expect(model?.detail).toContain("4 steps");
  });

  it("yields presentation ownership to the focused movement journey", () => {
    const model = build({
      movementPlanner: {
        active: true,
        movementValue: 2,
        rollResolutionId: "roll-2",
        currentSectorId: "ashen-chapel",
        currentSectorName: "Ashen Chapel",
        selectedDestinationId: null,
        destinations: []
      }
    }, true);
    expect(model).toBeNull();
  });

  it("keeps arrival ahead of encounter focus", () => {
    const model = build({
      activeResolution: {
        id: "resolution-1",
        playerId: "seat-1",
        source: "threat",
        stage: "card_reveal",
        card: { id: "enemy-1", title: "Ash-Lane Cutters", type: "enemy" }
      },
      tileArrival: {
        arrivalId: "arrival-1",
        seatId: "seat-1",
        tileId: "iron-choir",
        tileName: "Iron Choir",
        lore: "The route settles.",
        currentRuleId: "hazard-1",
        mandatoryRemaining: 1,
        canEndTurn: false,
        blockedReason: "Resolve the Hazard.",
        rules: [{
          id: "hazard-1",
          order: 1,
          kind: "tile-challenge",
          label: "Furnace Collapse",
          detail: "Test Grit.",
          mandatory: true,
          repeatPolicy: "EVERY_ARRIVAL",
          marker: "Hazard",
          supported: true,
          status: "current"
        }]
      }
    });
    expect(model?.progress).toEqual(["Movement", "Arrival", "Resolve", "Turn actions"]);
    expect(model?.kind).toBe("arrival");
  });

  it("shows calculation stage before battle outcome", () => {
    const model = build({
      battlePresentation: {
        id: "battle-1",
        revision: 2,
        stage: "resolving",
        actorSeatId: "seat-1",
        actorDisplayName: "Mara",
        encounter: { name: "Ash-Lane Cutters", category: "Enemy" },
        test: { stat: "grit", label: "Grit", opposed: true },
        operative: { name: "Mara", baseValue: 2, modifiers: [], rawDice: [4, 2], diceTotal: 6, finalTotal: 8 },
        opponent: { name: "Cutters", baseValue: 3, modifiers: [], rawDice: [3, 2], diceTotal: 5, finalTotal: 8 },
        outcome: null,
        publicConsequence: null,
        publicRewardSummary: null,
        waiting: null,
        restored: false
      }
    });
    expect(model).toMatchObject({ kind: "battle", activeProgressIndex: 2 });
    expect(model?.detail).not.toMatch(/success|failure/i);
  });

  it("uses only public result deltas for a reward cue", () => {
    const model = build({
      battlePresentation: {
        id: "battle-1",
        revision: 3,
        stage: "result",
        actorSeatId: "seat-1",
        actorDisplayName: "Mara",
        encounter: { name: "Ash-Lane Cutters", category: "Enemy" },
        test: { stat: "grit", label: "Grit", opposed: true },
        operative: { name: "Mara", baseValue: 2, modifiers: [], rawDice: [6, 5], diceTotal: 11, finalTotal: 13 },
        opponent: { name: "Cutters", baseValue: 3, modifiers: [], rawDice: [2, 1], diceTotal: 3, finalTotal: 6 },
        outcome: "success",
        publicConsequence: null,
        publicRewardSummary: "Threat defeated.",
        waiting: null,
        restored: false
      },
      publicResultDeltas: [
        { id: "private", type: "salvage", label: "Private cache", value: 9, sign: "gain", targetScope: "personal", visibility: "ownerPrivate", publicText: "Hidden", privateText: "Secret option", severity: "private" },
        { id: "public", type: "threatDefeated", label: "Threat defeated", sign: "gain", targetScope: "sector", visibility: "public", publicText: "Threat defeated", severity: "reward" }
      ]
    });
    expect(model?.kind).toBe("reward");
    expect(model?.delta?.label).toBe("Threat defeated");
    expect(JSON.stringify(model)).not.toContain("Secret option");
  });

  it("uses public-safe waiting copy for owner decisions", () => {
    const model = build({
      requiredAction: {
        id: "private-1",
        kind: "scar",
        actorSeatId: "seat-1",
        actorDisplayName: "Mara",
        requiredTab: "action",
        label: "Choose a private Scar",
        detail: "Secret card Alpha or Secret card Beta",
        canAct: true,
        waiting: true,
        privacy: "owner",
        hostInstruction: "Awaiting operative decision."
      }
    });
    expect(model?.detail).toBe("Awaiting operative decision.");
    expect(JSON.stringify(model)).not.toContain("Secret card");
  });

  it("restores a reconnecting state without replaying its entrance", () => {
    const patch = makePatch();
    const props = { patch, activeSeat, activePlayer, currentStepCopy: "Choose one legal action.", movementPresenting: false, synchronized: true };
    const first = render(<HostMotionCue {...props} />);
    expect(screen.getByTestId("host-motion-cue").classList.contains("host-motion-cue--entering")).toBe(true);
    first.unmount();
    render(<HostMotionCue {...props} />);
    expect(screen.getByTestId("host-motion-cue").classList.contains("host-motion-cue--settled")).toBe(true);
  });

  it("announces a handoff from the authoritative handoff identity", () => {
    const model = build({
      requiredAction: {
        id: "action-2",
        kind: "action",
        actorSeatId: "seat-2",
        actorDisplayName: "Dessa",
        requiredTab: "action",
        label: "Choose an action",
        detail: "Choose an action.",
        canAct: true,
        waiting: false,
        privacy: "public",
        handoff: {
          id: "handoff-1",
          fromSeatId: "seat-1",
          fromDisplayName: "Mara",
          toSeatId: "seat-2",
          toDisplayName: "Dessa",
          roundWrapped: false
        }
      }
    });
    expect(model).toMatchObject({ id: "handoff:handoff-1", title: "Dessa", activeProgressIndex: 2 });
  });

  it("renders fixed final-stage instructions without inventing an outcome", () => {
    const model = build({
      matchProgress: {
        revision: 4,
        mode: "solo",
        stage: "final_stage",
        winProgress: null,
        lossPressure: null,
        thresholdWarning: null,
        finalStage: {
          id: "final-1",
          title: "Cinder Gate",
          publicInstruction: "Reach the gate and resolve the confrontation.",
          locationName: "Cinder Gate",
          stageLabel: "Final",
          progressLabel: null
        },
        publicResult: null,
        allowedCommands: []
      }
    });
    expect(model).toMatchObject({ kind: "final", title: "Cinder Gate", activeProgressIndex: 2 });
    expect(JSON.stringify(model)).not.toMatch(/victory|defeat/i);
  });

  it("does not render over the stable endgame result", () => {
    const model = build({ status: "ended" });
    expect(model).toBeNull();
  });
});
