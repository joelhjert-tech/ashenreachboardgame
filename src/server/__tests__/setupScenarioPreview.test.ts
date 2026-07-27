import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import type { GameState } from "../../game/schema/session.schema.js";
import { GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

type PreviewPatch = {
  payload: {
    setupScenarioPreview: {
      scenarioId: string;
      mode: "single-player" | "co-op" | "rivalry" | "nemesis";
      playerCount: number;
      revision: number;
      requester: { seatId: string; displayName: string };
    } | null;
  };
};

function createLobbyState(): GameState {
  const initial = createInitialSessionState(
    "SETUP-PREVIEW",
    "single-player",
    "scenario_broken_seal",
    "co-op",
    "standard",
    1,
    { lobbyConfigured: false, setupHostSeatId: "seat-1" }
  );
  return {
    ...initial,
    seats: initial.seats.map((seat, index) => index === 0
      ? { ...seat, displayName: "Nera", connected: true, kicked: false }
      : seat)
  };
}

function phone(seatId = "seat-1"): { client: ConnectedClient; sent: Array<Record<string, unknown>> } {
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

function preview(server: GameRoomServer): PreviewPatch["payload"]["setupScenarioPreview"] {
  const tv = {
    view: "tv",
    socket: { send: () => undefined } as unknown as WebSocket
  } satisfies ConnectedClient;
  return (server as unknown as {
    createPatchEnvelope: (client: ConnectedClient) => PreviewPatch;
  }).createPatchEnvelope(tv).payload.setupScenarioPreview;
}

describe("host setup scenario preview", () => {
  it("projects a validated host-phone selection to TV without changing game state", () => {
    const server = new GameRoomServer(createLobbyState());
    const host = phone();
    const before = server.getState();

    server.handleIntent(host.client, {
      type: "HOST_SETUP_PREVIEW_REQUESTED",
      seatId: "seat-1",
      scenarioId: "scenario_broken_seal",
      mode: "single-player",
      playerCount: 1
    });

    expect(preview(server)).toEqual({
      scenarioId: "scenario_broken_seal",
      mode: "single-player",
      playerCount: 1,
      revision: 1,
      requester: { seatId: "seat-1", displayName: "Nera" }
    });
    expect(server.getState()).toBe(before);
  });

  it("rejects non-host requests and does not survive restoration", () => {
    const state = createLobbyState();
    const server = new GameRoomServer(state);
    const other = phone("seat-2");

    server.handleIntent(other.client, {
      type: "HOST_SETUP_PREVIEW_REQUESTED",
      seatId: "seat-2",
      scenarioId: "scenario_broken_seal",
      mode: "single-player",
      playerCount: 1
    });

    expect(other.sent).toContainEqual(expect.objectContaining({
      type: "INTENT_REJECTED",
      actionType: "HOST_SETUP_PREVIEW_REQUESTED",
      reason: expect.stringMatching(/host phone/i)
    }));
    expect(preview(server)).toBeNull();

    const restored = new GameRoomServer(state);
    expect(preview(restored)).toBeNull();
  });
});
