// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import React, { StrictMode, useEffect } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import NodeWebSocket, { WebSocketServer } from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { createCharacters } from "../../game/engine/__tests__/testData.js";
import type { Character } from "../../game/schema/character.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import type { PhoneSessionAuth, StatePatch, PhonePatchPayload, PublicPatchPayload } from "../../client/shared/types.js";
import { createJoinToken } from "../auth.js";
import { GameRoomServer } from "../roomServer.js";

let mockedWebSocketOrigin = "";

class TestWebSocket extends NodeWebSocket {
  override close(code?: number, data?: string | Buffer): void {
    try {
      super.close(code, data);
    } catch {
      // Node ws is stricter than the browser during Strict Mode cleanup.
    }
  }
}

vi.mock("../../client/shared/network.js", () => ({
  getWebSocketOrigin: () => mockedWebSocketOrigin
}));

import { useRoomSubscription } from "../../client/shared/useRoomSubscription.js";

function cloneCharacter(character: Character | undefined): Character {
  if (!character) {
    throw new Error("Missing character fixture");
  }

  return {
    ...character,
    activeContract: character.activeContract ? { ...character.activeContract } : null,
    heldGear: [...character.heldGear],
    equippedGear: { ...character.equippedGear },
    abilities: [...character.abilities],
    scars: [...character.scars]
  };
}

function createState(): GameState {
  const sessionId = "session-alpha";
  const seatId = "seat-1";
  const characters = createCharacters();

  return {
    sessionId,
    status: "active",
    sessionMode: "single-player",
    winnerSeatId: null,
    activeScenarioId: "scenario_broken_seal",
    scenarioProgress: {},
    phase: "navigation",
    resolutionSource: null,
    activeSeatIndex: 0,
    turnOrder: [seatId],
    heatThreshold: 6,
    woundThreshold: 3,
    sequence: 0,
    escalationLevel: 0,
    sectors: [
      {
        id: "gloam-spur",
        name: "Gloam Spur",
        regionTier: "borderlight",
        neighbors: ["gloam-spur"],
        danger: 1,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    seats: [
      {
        seatId,
        characterId: "void-marshal",
        displayName: "Seat One",
        connected: false,
        ready: false,
        kicked: false,
        joinToken: createJoinToken({ sessionId, seatId })
      }
    ],
    players: [
      {
        seatId,
        sectorId: "gloam-spur",
        private: { hand: ["route-slate"], notes: ["Hold the lane."] },
        character: {
          ...cloneCharacter(characters.get("void-marshal")),
          currentSpaceId: "gloam-spur"
        }
      }
    ],
    availableContracts: [],
    eventLog: [],
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
    lastOutcomeSummary: null
  };
}

interface Harness {
  server: WebSocketServer;
  roomServer: GameRoomServer;
  port: number;
  getLatestSocket: () => NodeWebSocket | null;
  getConnectionCount: () => number;
}

async function startHarness(): Promise<Harness> {
  const roomServer = new GameRoomServer(
    createState(),
    [],
    createSequenceRandomSource([0, 0, 0, 0]),
    new Map(),
    createCharacters(),
    new Map(),
    new Map()
  );
  const server = new WebSocketServer({ port: 0 });
  let latestSocket: NodeWebSocket | null = null;
  let connectionCount = 0;

  server.on("connection", (socket) => {
    latestSocket = socket;
    connectionCount += 1;
  });

  roomServer.attach(server);
  await once(server, "listening");

  return {
    server,
    roomServer,
    port: (server.address() as AddressInfo).port,
    getLatestSocket: () => latestSocket,
    getConnectionCount: () => connectionCount
  };
}

async function stopHarness(harness: Harness | null): Promise<void> {
  if (!harness) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    harness.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function ConnectionProbe(props: {
  auth: PhoneSessionAuth;
  onStatus: (status: string) => void;
  onPatch: (patch: StatePatch<PublicPatchPayload | PhonePatchPayload>) => void;
}): React.JSX.Element {
  const { status, patch } = useRoomSubscription({ view: "phone", auth: props.auth });

  useEffect(() => {
    props.onStatus(status);
  }, [props, status]);

  useEffect(() => {
    if (patch) {
      props.onPatch(patch);
    }
  }, [patch, props]);

  return <div data-testid="connection-status">{status}</div>;
}

describe("reconnect flapping regression", () => {
  let harness: Harness | null = null;
  let originalWebSocket: typeof globalThis.WebSocket | undefined;

  beforeAll(() => {
    originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = TestWebSocket as unknown as typeof globalThis.WebSocket;
    window.WebSocket = TestWebSocket as unknown as typeof window.WebSocket;
  });

  afterAll(() => {
    if (originalWebSocket) {
      globalThis.WebSocket = originalWebSocket;
      window.WebSocket = originalWebSocket;
    }
  });

  afterEach(async () => {
    cleanup();
    await stopHarness(harness);
    harness = null;
  });

  it("reaches a stable open state after a reconnect instead of looping closed/connecting", async () => {
    harness = await startHarness();
    mockedWebSocketOrigin = `ws://127.0.0.1:${harness.port}`;

    const seatToken = createJoinToken({ sessionId: "session-alpha", seatId: "seat-1" });
    const auth: PhoneSessionAuth = {
      roomCode: "session-alpha",
      seatId: "seat-1",
      seatToken,
      displayName: "Seat One"
    };
    const statuses: string[] = [];
    const patches: Array<StatePatch<PublicPatchPayload | PhonePatchPayload>> = [];

    render(
      <StrictMode>
        <ConnectionProbe
          auth={auth}
          onStatus={(status) => {
            if (statuses.at(-1) !== status) {
              statuses.push(status);
            }
          }}
          onPatch={(patch) => {
            patches.push(patch);
          }}
        />
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByTestId("connection-status")).toHaveTextContent("open");
      expect(patches.length).toBeGreaterThan(0);
    });

    const initialConnectionCount = harness.getConnectionCount();
    const socketToDrop = harness.getLatestSocket();
    expect(socketToDrop).not.toBeNull();
    socketToDrop?.close(1012, "Test disconnect");

    await waitFor(() => {
      expect(screen.getByTestId("connection-status")).toHaveTextContent("open");
      expect(harness?.getConnectionCount()).toBeGreaterThan(initialConnectionCount);
    }, { timeout: 4000 });

    const settledConnectionCount = harness.getConnectionCount();
    const settledStatusCount = statuses.length;

    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(screen.getByTestId("connection-status")).toHaveTextContent("open");
    expect(harness.getConnectionCount()).toBe(settledConnectionCount);
    expect(statuses.length).toBe(settledStatusCount);
    expect(statuses).toContain("closed");
    expect(statuses.at(-1)).toBe("open");
  }, 15000);
});
