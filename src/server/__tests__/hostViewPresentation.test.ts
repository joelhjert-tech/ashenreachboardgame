import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import type { GameState } from "../../game/schema/session.schema.js";
import { GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

type HostViewPatch = {
  payload: {
    hostView: {
      mode: "signal" | "map";
      revision: number;
      requester: { seatId: string; displayName: string } | null;
      automaticReturnReason: string | null;
      canRequestMap: boolean;
      unavailableReason: string | null;
    };
  };
};

function createActiveState(): GameState {
  const initial = createInitialSessionState("HOST-VIEW", "single-player");
  return {
    ...initial,
    status: "active",
    phase: "navigation",
    seats: initial.seats.map((seat, index) => index === 0
      ? { ...seat, displayName: "Joel", connected: true, kicked: false }
      : seat)
  };
}

function client(seatId = "seat-1"): { client: ConnectedClient; sent: Array<Record<string, unknown>> } {
  const sent: Array<Record<string, unknown>> = [];
  return {
    client: {
      view: "phone",
      seatId,
      socket: {
        send: (value: string) => sent.push(JSON.parse(value) as Record<string, unknown>)
      } as unknown as WebSocket
    },
    sent
  };
}

function hostView(server: GameRoomServer): HostViewPatch["payload"]["hostView"] {
  const tvClient = {
    view: "tv",
    socket: { send: () => undefined } as unknown as WebSocket
  } satisfies ConnectedClient;
  return (server as unknown as {
    createPatchEnvelope: (client: ConnectedClient) => HostViewPatch;
  }).createPatchEnvelope(tvClient).payload.hostView;
}

describe("server-authoritative host view", () => {
  it("lets joined players switch the shared display and applies the latest valid request", () => {
    const server = new GameRoomServer(createActiveState());
    const first = client();

    server.handleIntent(first.client, {
      type: "HOST_VIEW_REQUESTED",
      seatId: "seat-1",
      mode: "map"
    });
    expect(hostView(server)).toMatchObject({
      mode: "map",
      revision: 1,
      requester: { seatId: "seat-1", displayName: "Joel" },
      canRequestMap: true
    });

    server.handleIntent(first.client, {
      type: "HOST_VIEW_REQUESTED",
      seatId: "seat-1",
      mode: "signal"
    });
    expect(hostView(server)).toMatchObject({
      mode: "signal",
      revision: 2,
      automaticReturnReason: null
    });
  });

  it("returns automatically for action-critical presentation and does not persist across server restoration", () => {
    const state = createActiveState();
    const server = new GameRoomServer(state);
    const first = client();
    server.handleIntent(first.client, {
      type: "HOST_VIEW_REQUESTED",
      seatId: "seat-1",
      mode: "map"
    });

    (server as unknown as { state: GameState; broadcastPatch: () => void }).state = {
      ...server.getState(),
      phase: "broadcast"
    };
    (server as unknown as { broadcastPatch: () => void }).broadcastPatch();
    expect(hostView(server)).toMatchObject({
      mode: "signal",
      revision: 2,
      automaticReturnReason: "handoff",
      canRequestMap: false
    });

    const restored = new GameRoomServer({ ...server.getState(), phase: "navigation" });
    expect(hostView(restored)).toMatchObject({
      mode: "signal",
      revision: 0,
      requester: null,
      automaticReturnReason: null
    });
  });

  it("rejects map requests while the TV is reserved for a handoff", () => {
    const state = { ...createActiveState(), phase: "broadcast" as const };
    const server = new GameRoomServer(state);
    const phone = client();

    server.handleIntent(phone.client, {
      type: "HOST_VIEW_REQUESTED",
      seatId: "seat-1",
      mode: "map"
    });

    expect(phone.sent).toContainEqual(expect.objectContaining({
      type: "INTENT_REJECTED",
      actionType: "HOST_VIEW_REQUESTED",
      reason: "Turn handoff controls the shared display."
    }));
    expect(hostView(server).mode).toBe("signal");
  });
});
