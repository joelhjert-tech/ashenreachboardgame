import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadFollowers } from "../../content/followers.js";
import { loadGear } from "../../content/gear.js";
import { buildTransitionRouteAidDestinations } from "../../rules/movementPlanner.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

function activeNavigationState(): GameState {
  const state = createInitialSessionState("transition-route-aids", "single-player");
  state.status = "active";
  state.phase = "navigation";
  state.activeSeatIndex = 0;
  state.movementRouteRevisions = { "seat-1": 7 };
  return state;
}

function useAid(
  state: GameState,
  sourceKind: "gear" | "follower",
  instanceId: string,
  destination = buildTransitionRouteAidDestinations(state, "seat-1")[0]
) {
  if (!destination) throw new Error("Expected a reachable transition sector");
  return reduceGameState(state, {
    type: "TRANSITION_ROUTE_AID_USED",
    seatId: "seat-1",
    sourceKind,
    instanceId,
    fromSectorId: state.players[0]!.character.currentSpaceId,
    toSectorId: destination.sectorId,
    route: destination.route,
    movementRevision: 7,
    createdAt: "2026-07-26T12:00:00.000Z"
  });
}

describe("charged transition route aids", () => {
  it("spends one exact equipped gear charge and stops on the canonical same-reach transition sector", () => {
    const state = activeNavigationState();
    const definition = loadGear().get("breachline-sextant");
    expect(definition).toBeDefined();
    const instance = { ...definition!, instanceId: "sextant-1", currentCharges: 2 };
    state.players[0]!.character.heldGear.push(instance);
    state.players[0]!.character.equippedGear.utility = definition!.id;

    const result = useAid(state, "gear", instance.instanceId);

    expect(result.ok).toBe(true);
    const player = result.state.players[0]!;
    const spent = player.character.heldGear.find((item) => item.instanceId === instance.instanceId);
    expect(spent?.currentCharges).toBe(1);
    expect(player.character.currentSpaceId).toBe(result.state.tileArrivalThreatProgress?.sectorId);
    expect(result.state.phase).toBe("sector");
  });

  it("allows exactly two follower uses and rejects the depleted exact instance", () => {
    const state = activeNavigationState();
    const definition = loadFollowers().get("knuckle-rail-scent-hound");
    expect(definition).toBeDefined();
    state.players[0]!.character.followers = [
      { ...definition!, instanceId: "knuckle-1", currentCharges: 2 }
    ];

    const first = useAid(state, "follower", "knuckle-1");
    expect(first.ok).toBe(true);

    const returned = first.state;
    returned.phase = "navigation";
    returned.movementRouteRevisions = { "seat-1": 7 };
    const second = useAid(returned, "follower", "knuckle-1");
    expect(second.ok).toBe(true);
    expect(second.state.players[0]!.character.followers?.[0]?.currentCharges).toBe(0);

    const depleted = second.state;
    depleted.phase = "navigation";
    depleted.movementRouteRevisions = { "seat-1": 7 };
    expect(useAid(depleted, "follower", "knuckle-1").ok).toBe(false);
  });

  it("rejects stale revisions, fabricated routes, and attempts made after rolling", () => {
    const state = activeNavigationState();
    const definition = loadGear().get("gateward-spindle")!;
    state.players[0]!.character.heldGear.push({
      ...definition,
      instanceId: "spindle-1",
      currentCharges: 2
    });
    state.players[0]!.character.equippedGear.utility = definition.id;
    const destination = buildTransitionRouteAidDestinations(state, "seat-1")[0]!;

    const stale = reduceGameState(state, {
      type: "TRANSITION_ROUTE_AID_USED",
      seatId: "seat-1",
      sourceKind: "gear",
      instanceId: "spindle-1",
      fromSectorId: state.players[0]!.character.currentSpaceId,
      toSectorId: destination.sectorId,
      route: destination.route,
      movementRevision: 6,
      createdAt: "2026-07-26T12:00:00.000Z"
    });
    expect(stale.ok).toBe(false);

    const fabricated = useAid(state, "gear", "spindle-1", {
      ...destination,
      route: [...destination.route, state.players[0]!.character.currentSpaceId]
    });
    expect(fabricated.ok).toBe(false);

    state.movementRolls = { "seat-1": 4 };
    expect(useAid(state, "gear", "spindle-1", destination).ok).toBe(false);
  });
});
