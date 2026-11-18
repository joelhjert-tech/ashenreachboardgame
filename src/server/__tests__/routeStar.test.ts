import { EventEmitter } from "node:events";
import type { WebSocketServer } from "ws";
import { describe, expect, it, vi } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { gameStateSchema } from "../../game/schema/session.schema.js";
import { createInitialSessionState } from "../sessionState.js";
import { GameRoomServer, type ConnectedClient, createPhoneProjection, createTvProjection } from "../roomServer.js";

vi.mock("../../game/data/boardSpaces.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../game/data/boardSpaces.js")>();
  const template = actual.getBoardSpace("outer_ember_sanctum")!;
  const fixtureIds = new Set(["origin", "left", "right", "destination", "other"]);
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
    { ...template, id: "left", name: "Left Route", neighbors: ["origin", "destination", "other"] },
    { ...template, id: "right", name: "Right Route", neighbors: ["origin", "destination"] },
    { ...template, id: "destination", name: "Destination", neighbors: ["left", "right"] },
    { ...template, id: "other", name: "Other destination", neighbors: ["left"] }
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


describe("Route Star movement intent boundary", () => {
  function harness() {
    const state = createState();
    state.players[0]!.character.heldGear[0]!.currentCharges = 2;
    const server = new GameRoomServer(state);
    const messages: Array<Record<string, unknown>> = [];
    const client: ConnectedClient = { seatId: "seat-1", view: "phone", socket: {
      send: (payload: string) => messages.push(JSON.parse(payload)), close() {}
    } as unknown as ConnectedClient["socket"] };
    const tvMessages: Array<{ type: string; payload?: import("../../client/shared/types.js").PublicPatchPayload }> = [];
    const tvSocket = Object.assign(new EventEmitter(), { send: (payload: string) => tvMessages.push(JSON.parse(payload)), close() {} });
    const connections = new EventEmitter();
    server.attach(connections as unknown as WebSocketServer);
    connections.emit("connection", tvSocket, { url: "/?view=tv" });
    const tvPlanner = () => tvMessages.filter((message) => message.type === "STATE_PATCH").at(-1)?.payload?.movementPlanner;
    const planner = () => (createPhoneProjection(server.getState(), "seat-1") as unknown as import("../../client/shared/types.js").PhonePatchPayload).movementPlanner!;
    const select = () => {
      const plan = planner(); const destination = plan.destinations.find((entry) => entry.sectorId === "destination")!;
      const route = destination.routeVariants!.find((entry) => entry.routeId !== destination.defaultRouteId)!;
      server.handleIntent(client, { type: "SELECT_ROUTE_STAR_VARIANT", seatId: "seat-1", instanceId: "star-a",
        destinationId: "destination", routeId: route.routeId, movementRevision: plan.movementRevision! });
      return { type: "ABANDON_ROUTE_STAR_CHOICE" as const, seatId: "seat-1", destinationId: "destination",
        routeId: route.routeId, movementRevision: plan.movementRevision!, toSectorId: null };
    };
    return { server, client, messages, planner, tvPlanner, select };
  }
  it("keeps the paid choice and charges through null, same and other destination previews", () => {
    const { server, client, messages, planner, tvPlanner, select } = harness(); select();
    const before = JSON.stringify(server.getState());
    for (const toSectorId of [null, "destination", "other"]) {
      server.handleIntent(client, { type: "MOVEMENT_DESTINATION_PREVIEWED", seatId: "seat-1", toSectorId });
      expect(JSON.stringify(server.getState())).toBe(before);
      expect(planner().routeStarCommitted).toBe(true);
      expect(tvPlanner()?.selectedDestinationId).toBe("destination");
    }
    expect(messages.filter((message) => message.type === "INTENT_REJECTED")).toEqual([]);
    const restored = gameStateSchema.parse(JSON.parse(JSON.stringify(server.getState())));
    const phone = createPhoneProjection(restored, "seat-1") as unknown as import("../../client/shared/types.js").PhonePatchPayload;
    expect(phone.movementPlanner?.selectedDestinationId).toBe("destination");
    expect(phone.movementPlanner?.selectedRouteId).toBe(planner().selectedRouteId);
    expect(restored.players[0]!.character.heldGear[0]!.currentCharges).toBe(1);
  });
  it("publishes the new preview only after explicit abandonment with the revised route identity", () => {
    const { server, client, planner, tvPlanner, select } = harness(); const intent = select();
    server.handleIntent(client, { ...intent, toSectorId: "other" });
    expect(server.getState().routeStarChoices?.["seat-1"]).toBeUndefined();
    expect(server.getState().players[0]!.character.heldGear[0]!.currentCharges).toBe(1);
    expect(tvPlanner()?.selectedDestinationId).toBe("other");
    const destination = planner().destinations.find((entry) => entry.sectorId === "other")!;
    expect(tvPlanner()?.destinations.find((entry) => entry.sectorId === "other")?.routeId).toBe(destination.routeId);
    expect(destination.routeId).toMatch(/^route-8-/);
  });
  it("rejects forged, stale and duplicate discard requests without destroying a newer choice", () => {
    const { server, client, messages, select } = harness(); const intent = select();
    const before = JSON.stringify(server.getState());
    for (const invalid of [{ ...intent, seatId: "seat-2" }, { ...intent, routeId: "wrong" },
      { ...intent, destinationId: "wrong" }, { ...intent, movementRevision: 6 }, { ...intent, toSectorId: "unknown" }]) {
      server.handleIntent(client, invalid);
      expect(messages.at(-1)?.type).toBe("INTENT_REJECTED");
      expect(JSON.stringify(server.getState())).toBe(before);
    }
    server.handleIntent(client, intent);
    expect(server.getState().routeStarChoices?.["seat-1"]).toBeUndefined();
    expect(server.getState().players[0]!.character.heldGear[0]!.currentCharges).toBe(1);
    server.handleIntent(client, intent);
    expect(messages.at(-1)?.type).toBe("INTENT_REJECTED");
    const newer = select(); const newerState = JSON.stringify(server.getState());
    server.handleIntent(client, intent);
    expect(messages.at(-1)?.type).toBe("INTENT_REJECTED");
    expect(JSON.stringify(server.getState())).toBe(newerState);
    expect(newer.movementRevision).toBe(8);
  });
});
