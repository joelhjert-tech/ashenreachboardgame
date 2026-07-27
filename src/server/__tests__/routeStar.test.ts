import { describe, expect, it, vi } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { gameStateSchema } from "../../game/schema/session.schema.js";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";

vi.mock("../../game/data/boardSpaces.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../game/data/boardSpaces.js")>();
  const template = actual.getBoardSpace("outer_ember_sanctum")!;
  const fixtureIds = new Set(["origin", "left", "right", "destination"]);
  return {
    ...actual,
    getBoardSpace: (sectorId: string) =>
      fixtureIds.has(sectorId)
        ? { ...template, id: sectorId, name: sectorId, tier: "outer" as const }
        : actual.getBoardSpace(sectorId)
  };
});

function createState() {
  const state = createInitialSessionState("route-star-projection", "single-player");
  const seatId = state.players[0]!.seatId;
  const template = state.sectors[0]!;
  const star = loadGear().get("route-star")!;
  state.status = "active"; state.phase = "navigation"; state.turnOrder = [seatId]; state.activeSeatIndex = 0;
  state.players[0]!.sectorId = "origin"; state.players[0]!.character.currentSpaceId = "origin";
  state.players[0]!.character.heldGear = [{ ...star, instanceId: "star-a", currentCharges: 1 }];
  state.players[0]!.character.equippedGear.utility = "route-star";
  state.players[0]!.character.equippedGearInstances = {
    weapon: state.players[0]!.character.equippedGearInstances?.weapon ?? null,
    armor: state.players[0]!.character.equippedGearInstances?.armor ?? null,
    utility: "star-a"
  };
  state.movementRolls = { [seatId]: 2 }; state.movementRouteRevisions = { [seatId]: 7 };
  state.sectors = [
    { ...template, id: "origin", name: "Origin", neighbors: ["left", "right"] },
    { ...template, id: "left", name: "Left Route", neighbors: ["origin", "destination"] },
    { ...template, id: "right", name: "Right Route", neighbors: ["origin", "destination"] },
    { ...template, id: "destination", name: "Destination", neighbors: ["left", "right"] }
  ];
  return state;
}

describe("Route Star projection and persistence", () => {
  it("offers exact-instance choice only to the owner phone and keeps TV charge-private", () => {
    const state = createState();
    const phone = createPhoneProjection(state, "seat-1") as { movementPlanner: import("../../client/shared/types.js").PublicMovementPlannerState | null };
    const tv = createTvProjection(state) as { movementPlanner: import("../../client/shared/types.js").PublicMovementPlannerState | null };
    const phoneDestination = phone.movementPlanner?.destinations.find((entry) => entry.sectorId === "destination");
    const tvDestination = tv.movementPlanner?.destinations.find((entry) => entry.sectorId === "destination");
    expect(phoneDestination?.routeVariants).toHaveLength(2);
    expect(phoneDestination?.routeStarPrompt).toMatchObject({ instanceId: "star-a", currentCharges: 1, chargeCost: 1 });
    expect(JSON.stringify(tvDestination)).not.toContain("routeStarPrompt");
    expect(JSON.stringify(tvDestination)).not.toContain("currentCharges");
  });

  it("round-trips a committed route choice without refilling charges", () => {
    const state = createState();
    const phone = createPhoneProjection(state, "seat-1") as { movementPlanner: import("../../client/shared/types.js").PublicMovementPlannerState | null };
    const destination = phone.movementPlanner!.destinations.find((entry) => entry.sectorId === "destination")!;
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
