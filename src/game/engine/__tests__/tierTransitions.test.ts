import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { buildTierTransitionOptions } from "../../rules/movementPlanner.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

function activeTransitionState(
  fromSectorId = "outer_ember_sanctum",
  movementRevision = 4
): GameState {
  const state = createInitialSessionState("tier-transition-test", "single-player");
  state.status = "active";
  state.phase = "navigation";
  state.turnOrder = ["seat-1"];
  state.activeSeatIndex = 0;
  state.movementRouteRevisions = { "seat-1": movementRevision };
  state.seats[0] = {
    ...state.seats[0]!,
    connected: true,
    characterSelected: true,
    ready: true
  };
  state.players[0] = {
    ...state.players[0]!,
    sectorId: fromSectorId,
    character: {
      ...state.players[0]!.character,
      currentSpaceId: fromSectorId,
      status: "active"
    }
  };
  return state;
}

function cross(
  state: GameState,
  destinationSectorId: string,
  options: { movementRevision?: number; voidKeyInstanceId?: string } = {}
) {
  const transition = buildTierTransitionOptions(state, "seat-1")
    .find((entry) => entry.sectorId === destinationSectorId);
  if (!transition) throw new Error(`Expected canonical transition to ${destinationSectorId}`);
  return reduceGameState(state, {
    type: "TIER_TRANSITION_COMPLETED",
    seatId: "seat-1",
    fromSectorId: state.players[0]!.character.currentSpaceId,
    toSectorId: transition.sectorId,
    direction: transition.direction,
    movementRevision: options.movementRevision ?? state.movementRouteRevisions?.["seat-1"] ?? 0,
    voidKeyInstanceId: options.voidKeyInstanceId,
    createdAt: "2026-07-27T12:00:00.000Z"
  });
}

function equipVoidKey(state: GameState): void {
  state.players[0]!.character.heldGear.push({
    id: "void-key",
    instanceId: "void-key:test",
    name: "Void Key",
    slot: "utility",
    category: "chargedRelic",
    statBonus: { stat: "command", amount: 1 },
    tier: "artifact",
    useLimit: "charge",
    effectModel: "charged",
    requiresEquipped: true,
    activationTiming: ["movementRouteConfirmation"],
    maxCharges: 2,
    startingCharges: 2,
    currentCharges: 2,
    chargeCost: 1,
    rechargeRule: "none",
    chargedEffect: "personalGateOverride"
  });
  state.players[0]!.character.equippedGear.utility = "void-key";
}

describe("pre-roll tier transitions", () => {
  it("crosses one canonical edge without dice and starts one arrival lifecycle", () => {
    const state = activeTransitionState();
    const result = cross(state, "middle_red_march_outpost");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]?.character.currentSpaceId).toBe("middle_red_march_outpost");
    expect(result.state.phase).toBe("sector");
    expect(result.state.movementRolls?.["seat-1"]).toBeUndefined();
    expect(result.state.movementRouteRevisions?.["seat-1"]).toBe(5);
    expect(result.state.tileArrivalThreatProgress).toMatchObject({
      seatId: "seat-1",
      sectorId: "middle_red_march_outpost",
      nextThreatIconIndex: 0
    });
    expect(result.state.eventLog.at(-1)).toMatchObject({
      type: "TIER_TRANSITION_COMPLETED",
      fromSectorId: "outer_ember_sanctum",
      toSectorId: "middle_red_march_outpost"
    });
    expect(result.emitted).toEqual([expect.objectContaining({
      type: "MOVED",
      fromSectorId: "outer_ember_sanctum",
      toSectorId: "middle_red_march_outpost"
    })]);
    expect(result.state.lastOutcomeSummary).toMatchObject({
      movedToSectorId: "middle_red_march_outpost",
      die1: null,
      checkTotal: null,
      difficulty: null,
      success: true
    });
  });

  it("rejects a transition after rolling, a stale revision, and a fabricated edge", () => {
    const rolled = activeTransitionState();
    rolled.movementRolls = { "seat-1": 3 };
    expect(cross(rolled, "middle_red_march_outpost").ok).toBe(false);

    const stale = activeTransitionState();
    expect(cross(stale, "middle_red_march_outpost", { movementRevision: 3 }).ok).toBe(false);

    const state = activeTransitionState();
    const fabricated = reduceGameState(state, {
      type: "TIER_TRANSITION_COMPLETED",
      seatId: "seat-1",
      fromSectorId: "outer_ember_sanctum",
      toSectorId: "middle_guardian_span",
      direction: "inward",
      movementRevision: 4,
      createdAt: "2026-07-27T12:00:00.000Z"
    });
    expect(fabricated.ok).toBe(false);
  });

  it("requires an owned Artifact for Inner Reach entry without consuming it", () => {
    const locked = activeTransitionState("middle_guardian_span");
    const option = buildTierTransitionOptions(locked, "seat-1")
      .find((entry) => entry.sectorId === "inner_veil_rift");
    expect(option?.disabledReason).toBe("At least 1 Artifact is required to enter the Inner Reach");
    expect(cross(locked, "inner_veil_rift").ok).toBe(false);

    equipVoidKey(locked);
    const artifactEntry = cross(locked, "inner_veil_rift");
    expect(artifactEntry.ok).toBe(true);
    if (artifactEntry.ok) {
      expect(
        artifactEntry.state.players[0]?.character.heldGear
          .find((item) => item.instanceId === "void-key:test")
          ?.currentCharges
      ).toBe(2);
    }

    const legal = activeTransitionState();
    equipVoidKey(legal);
    expect(cross(legal, "middle_red_march_outpost", { voidKeyInstanceId: "void-key:test" }).ok).toBe(false);
  });

  it.each([
    ["middle_guardian_span", "inner_veil_rift"],
    ["middle_red_march_outpost", "choir-execution-court"],
    ["middle_anomaly_well", "choir-execution-court"],
    ["middle_rivalry_pit", "choir-execution-court"]
  ] as const)("requires an Artifact at every authored Inner Reach entry: %s to %s", (origin, destination) => {
    const state = activeTransitionState(origin);
    expect(
      buildTierTransitionOptions(state, "seat-1")
        .find((entry) => entry.sectorId === destination)
        ?.disabledReason
    ).toBe("At least 1 Artifact is required to enter the Inner Reach");

    equipVoidKey(state);
    const crossed = cross(state, destination);
    expect(crossed.ok).toBe(true);
    if (!crossed.ok) return;
    expect(crossed.state.players[0]?.innerApproachProgress?.pathId).toBe(
      destination === "inner_veil_rift" ? "breach-road" : "choir-road"
    );
  });

  it("does not let the Void Key bypass the Nemesis Relay Crown-Key requirement", () => {
    const state = activeTransitionState("middle_guardian_span");
    state.gameMode = "nemesis_relay";
    equipVoidKey(state);

    const option = buildTierTransitionOptions(state, "seat-1")
      .find((entry) => entry.sectorId === "inner_veil_rift");
    expect(option?.disabledReason).toContain("Crown-Key Fragment");
    expect(cross(state, "inner_veil_rift", { voidKeyInstanceId: "void-key:test" }).ok).toBe(false);
  });
});
