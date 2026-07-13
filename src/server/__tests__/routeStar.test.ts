import { describe, expect, it } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { gameStateSchema } from "../../game/schema/session.schema.js";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";

function createState() {
  const state = createInitialSessionState("route-star-projection", "single-player");
  const seatId = state.players[0]!.seatId;
  const star = loadGear().get("route-star")!;
  state.status = "active"; state.phase = "navigation"; state.turnOrder = [seatId]; state.activeSeatIndex = 0;
  state.players[0]!.sectorId = "inner_veil_rift"; state.players[0]!.character.currentSpaceId = "inner_veil_rift";
  state.players[0]!.character.heldGear = [{ ...star, instanceId: "star-a", currentCharges: 1 }];
  state.players[0]!.character.equippedGear.utility = "route-star";
  state.movementRolls = { [seatId]: 4 }; state.movementRouteRevisions = { [seatId]: 7 };
  return state;
}

describe("Route Star projection and persistence", () => {
  it("offers exact-instance choice only to the owner phone and keeps TV charge-private", () => {
    const state = createState();
    const phone = createPhoneProjection(state, "seat-1") as { movementPlanner: import("../../client/shared/types.js").PublicMovementPlannerState | null };
    const tv = createTvProjection(state) as { movementPlanner: import("../../client/shared/types.js").PublicMovementPlannerState | null };
    const phoneDestination = phone.movementPlanner?.destinations.find((entry) => entry.sectorId === "inner_gate_of_cinders");
    const tvDestination = tv.movementPlanner?.destinations.find((entry) => entry.sectorId === "inner_gate_of_cinders");
    expect(phoneDestination?.routeVariants).toHaveLength(2);
    expect(phoneDestination?.routeStarPrompt).toMatchObject({ instanceId: "star-a", currentCharges: 1, chargeCost: 1 });
    expect(JSON.stringify(tvDestination)).not.toContain("routeStarPrompt");
    expect(JSON.stringify(tvDestination)).not.toContain("currentCharges");
  });

  it("round-trips a committed route choice without refilling charges", () => {
    const state = createState();
    const phone = createPhoneProjection(state, "seat-1") as { movementPlanner: import("../../client/shared/types.js").PublicMovementPlannerState | null };
    const destination = phone.movementPlanner!.destinations.find((entry) => entry.sectorId === "inner_gate_of_cinders")!;
    const alternate = destination.routeVariants!.find((entry) => entry.routeId !== destination.defaultRouteId)!;
    state.routeStarChoices = { "seat-1": { instanceId: "star-a", destinationId: destination.sectorId, routeId: alternate.routeId, movementRevision: 7 } };
    state.players[0]!.character.heldGear[0]!.currentCharges = 0;
    const restored = gameStateSchema.parse(JSON.parse(JSON.stringify(state)));
    const projection = createPhoneProjection(restored, "seat-1") as { movementPlanner: import("../../client/shared/types.js").PublicMovementPlannerState | null };
    expect(restored.routeStarChoices?.["seat-1"]?.routeId).toBe(alternate.routeId);
    expect(restored.players[0]!.character.heldGear[0]!.currentCharges).toBe(0);
    expect(projection.movementPlanner?.selectedRouteId).toBe(alternate.routeId);
    expect(projection.movementPlanner?.routeStarCommitted).toBe(true);
  });
});
