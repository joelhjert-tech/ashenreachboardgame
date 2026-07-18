import { describe, expect, it } from "vitest";
import { loadGear } from "../../content/gear.js";
import { reduceGameState } from "../reducer.js";
import type { GameState } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { buildMovementRoutePlan } from "../../rules/movementPlanner.js";

function createState(): GameState {
  const state = createInitialSessionState("route-star", "single-player");
  const seatId = state.players[0]!.seatId;
  const template = state.sectors[0]!;
  const star = loadGear().get("route-star")!;
  state.status = "active"; state.phase = "navigation"; state.turnOrder = [seatId]; state.activeSeatIndex = 0;
  state.players[0]!.sectorId = "origin"; state.players[0]!.character.currentSpaceId = "origin";
  state.players[0]!.character.heldGear = [{ ...star, instanceId: "star-a", currentCharges: 2 }, { ...star, instanceId: "star-b", currentCharges: 2 }];
  state.players[0]!.character.equippedGear.utility = "route-star";
  state.movementRolls = { [seatId]: 2 }; state.movementRouteRevisions = { [seatId]: 4 };
  state.sectors = [
    { ...template, id: "origin", name: "Origin", neighbors: ["left", "right"] },
    { ...template, id: "left", name: "Scorched Road", neighbors: ["origin", "destination"] },
    { ...template, id: "right", name: "Blastworks", neighbors: ["origin", "destination"] },
    { ...template, id: "destination", name: "Ashen Chapel", neighbors: ["left", "right"] }
  ];
  return state;
}

describe("Route Star — Least-Hungry Road", () => {
  it("spends one exact-instance charge and commits only a non-default authoritative variant", () => {
    const state = createState(); const seatId = state.players[0]!.seatId;
    const variants = buildMovementRoutePlan(state, seatId)!.routes.filter((route) => route.sectorId === "destination");
    const selected = variants[1]!;
    const result = reduceGameState(state, { type: "SELECT_ROUTE_STAR_VARIANT", seatId, instanceId: "star-a", destinationId: "destination", routeId: selected.routeId, movementRevision: 4, createdAt: "2026-07-13T00:00:00.000Z" });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.state.routeStarChoices?.[seatId]).toMatchObject({ routeId: selected.routeId, destinationId: "destination", movementRevision: 4 });
    expect(result.state.players[0]!.character.heldGear.map((item) => item.currentCharges)).toEqual([1, 2]);
    expect(result.state.lastOutcomeSummary?.summary).toBe("Route Star consulted.");
  });

  it("rejects default, stale, duplicate, wrong-seat, and depleted uses without spending", () => {
    const state = createState(); const seatId = state.players[0]!.seatId;
    const variants = buildMovementRoutePlan(state, seatId)!.routes.filter((route) => route.sectorId === "destination");
    const action = { type: "SELECT_ROUTE_STAR_VARIANT" as const, seatId, instanceId: "star-a", destinationId: "destination", routeId: variants[1]!.routeId, movementRevision: 4, createdAt: "2026-07-13T00:00:00.000Z" };
    expect(reduceGameState(state, { ...action, routeId: variants[0]!.routeId }).ok).toBe(false);
    expect(reduceGameState(state, { ...action, movementRevision: 3 }).ok).toBe(false);
    const used = reduceGameState(state, action); expect(used.ok).toBe(true); if (!used.ok) return;
    expect(reduceGameState(used.state, { ...action, instanceId: "star-b" }).ok).toBe(false);
    state.players[0]!.character.heldGear[0]!.currentCharges = 0;
    expect(reduceGameState(state, action).ok).toBe(false);
    expect(state.players[0]!.character.heldGear[0]!.currentCharges).toBe(0);
  });

  it("clears the committed choice after Compass revision or movement resolution without refunding", () => {
    const state = createState(); const seatId = state.players[0]!.seatId;
    const selected = buildMovementRoutePlan(state, seatId)!.routes.filter((route) => route.sectorId === "destination")[1]!;
    const used = reduceGameState(state, { type: "SELECT_ROUTE_STAR_VARIANT", seatId, instanceId: "star-a", destinationId: "destination", routeId: selected.routeId, movementRevision: 4, createdAt: "2026-07-13T00:00:00.000Z" });
    expect(used.ok).toBe(true); if (!used.ok) return;
    const cleared = reduceGameState(used.state, { type: "CLEAR_ROUTE_STAR_CHOICE", seatId, createdAt: "2026-07-13T00:00:01.000Z" });
    expect(cleared.ok).toBe(true); if (!cleared.ok) return;
    expect(cleared.state.routeStarChoices?.[seatId]).toBeUndefined();
    expect(cleared.state.players[0]!.character.heldGear[0]!.currentCharges).toBe(1);
  });
});
