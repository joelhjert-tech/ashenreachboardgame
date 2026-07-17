import { describe, expect, it } from "vitest";
import { reduceGameState } from "../../engine/reducer.js";
import type { GameState } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createTvProjection } from "../../../server/roomServer.js";
import { buildMovementRoutePlan, getLegalMovementRouteVariant } from "../movementPlanner.js";

function createDiamondState(): GameState {
  const state = createInitialSessionState("route-variant-foundation", "single-player");
  const seatId = state.players[0]!.seatId;
  const template = state.sectors[0]!;
  state.status = "active";
  state.phase = "navigation";
  state.players[0]!.sectorId = "origin";
  state.players[0]!.character.currentSpaceId = "origin";
  state.turnOrder = [seatId];
  state.activeSeatIndex = 0;
  state.movementRolls = { [seatId]: 2 };
  state.movementRouteRevisions = { [seatId]: 7 };
  state.sectors = [
    { ...template, id: "origin", name: "Origin", neighbors: ["left", "right"] },
    { ...template, id: "left", name: "Left", neighbors: ["origin", "destination"] },
    { ...template, id: "right", name: "Right", neighbors: ["origin", "destination"] },
    { ...template, id: "destination", name: "Destination", neighbors: ["left", "right"] }
  ];
  return state;
}

describe("authoritative movement route variants", () => {
  it("preserves distinct exact-distance paths to one destination with deterministic IDs", () => {
    const state = createDiamondState();
    const seatId = state.players[0]!.seatId;
    const first = buildMovementRoutePlan(state, seatId)!;
    const second = buildMovementRoutePlan(structuredClone(state), seatId)!;
    const variants = first.routes.filter((route) => route.sectorId === "destination");

    expect(variants.map((route) => route.route)).toEqual([
      ["origin", "left", "destination"],
      ["origin", "right", "destination"]
    ]);
    expect(new Set(variants.map((route) => route.routeId)).size).toBe(2);
    expect(second.routes).toEqual(first.routes);
    expect(first.revision).toBe(7);
  });

  it("binds explicit selection to destination, route ID, and revision", () => {
    const state = createDiamondState();
    const seatId = state.players[0]!.seatId;
    const plan = buildMovementRoutePlan(state, seatId)!;
    const selected = plan.routes.find((route) => route.route.join(",") === "origin,right,destination")!;

    expect(getLegalMovementRouteVariant(state, seatId, "destination", selected.routeId, 7)).toEqual(selected);
    expect(getLegalMovementRouteVariant(state, seatId, "left", selected.routeId, 7)).toBeNull();
    expect(getLegalMovementRouteVariant(state, seatId, "destination", selected.routeId, 6)).toBeNull();
    expect(getLegalMovementRouteVariant(state, seatId, "destination", "route-7-unknown", 7)).toBeNull();

    const accepted = reduceGameState(state, {
      type: "MOVE_REQUESTED",
      seatId,
      toSectorId: "destination",
      routeId: selected.routeId,
      movementRevision: 7,
      createdAt: "2026-07-12T00:00:00.000Z"
    });
    expect(accepted.ok).toBe(true);

    const stale = reduceGameState(state, {
      type: "MOVE_REQUESTED",
      seatId,
      toSectorId: "destination",
      routeId: selected.routeId,
      movementRevision: 6,
      createdAt: "2026-07-12T00:00:00.000Z"
    });
    expect(stale.ok).toBe(false);
  });

  it("keeps destination-only confirmation on the deterministic default route and regenerates IDs after revision", () => {
    const state = createDiamondState();
    const seatId = state.players[0]!.seatId;
    const initial = buildMovementRoutePlan(state, seatId)!;
    const defaultRoute = initial.routes.find((route) => route.sectorId === "destination")!;
    const accepted = reduceGameState(state, {
      type: "MOVE_REQUESTED",
      seatId,
      toSectorId: "destination",
      createdAt: "2026-07-12T00:00:00.000Z"
    });

    expect(accepted.ok).toBe(true);
    state.movementRouteRevisions = { [seatId]: 8 };
    const regenerated = buildMovementRoutePlan(state, seatId)!.routes.find((route) => route.route.join(",") === defaultRoute.route.join(","))!;
    expect(regenerated.routeId).not.toBe(defaultRoute.routeId);
  });

  it("projects variants grouped under one destination without hidden encounter data", () => {
    const state = createInitialSessionState("route-variant-projection", "single-player");
    const seatId = state.players[0]!.seatId;
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = [seatId];
    state.activeSeatIndex = 0;
    state.players[0]!.sectorId = "inner_veil_rift";
    state.players[0]!.character.currentSpaceId = "inner_veil_rift";
    state.movementRolls = { [seatId]: 4 };
    state.movementRouteRevisions = { [seatId]: 7 };
    const projection = createTvProjection(state);
    const planner = projection.movementPlanner as {
      movementRevision: number;
      destinations: Array<{ sectorId: string; defaultRouteId: string; routeVariants: Array<{ routeId: string; sectorIds: string[] }> }>;
    };
    const destination = planner.destinations.find((entry) => entry.sectorId === "inner_gate_of_cinders")!;

    expect(planner.movementRevision).toBe(7);
    expect(destination.routeVariants).toHaveLength(2);
    expect(destination.defaultRouteId).toBe(destination.routeVariants[0]!.routeId);
    expect(JSON.stringify(destination.routeVariants)).not.toMatch(/threat|contract|agenda|stock/i);
  });

  it("enumerates a branching distance-six fixture within a deterministic bound", () => {
    const state = createDiamondState();
    const seatId = state.players[0]!.seatId;
    const template = state.sectors[0]!;
    const sectors = Array.from({ length: 14 }, (_, index) => ({
      ...template,
      id: `node-${index}`,
      name: `Node ${index}`,
      neighbors: [index - 1, index + 1, index + 2].filter((value) => value >= 0 && value < 14).map((value) => `node-${value}`)
    }));
    state.sectors = sectors;
    state.players[0]!.sectorId = "node-0";
    state.players[0]!.character.currentSpaceId = "node-0";
    state.movementRolls = { [seatId]: 6 };
    const started = performance.now();
    const plan = buildMovementRoutePlan(state, seatId)!;
    const elapsed = performance.now() - started;

    expect(plan.routes.length).toBeGreaterThan(0);
    expect(new Set(plan.routes.map((route) => route.route.join("|"))).size).toBe(plan.routes.length);
    expect(elapsed).toBeLessThan(100);
  });
});
