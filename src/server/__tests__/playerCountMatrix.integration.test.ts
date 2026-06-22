import { once } from "node:events";
import type { AddressInfo } from "node:net";
import WebSocket, { WebSocketServer } from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { createJoinToken, createHostToken } from "../auth.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";
import type { GameState, SessionMode } from "../../game/schema/session.schema.js";

type ServerEnvelope =
  | {
      type: "STATE_PATCH";
      sessionId: string;
      sequence: number;
      phase: GameState["phase"];
      payload: Record<string, unknown>;
    }
  | {
      type: "INTENT_REJECTED";
      sessionId: string;
      sequence: number;
      actionType: string;
      reason: string;
    };

class SocketProbe {
  public readonly messages: ServerEnvelope[] = [];
  private readonly waiters = new Set<{
    predicate: (message: ServerEnvelope, index: number) => boolean;
    resolve: (message: ServerEnvelope) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  public constructor(public readonly socket: WebSocket) {
    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw)) as ServerEnvelope;
      this.messages.push(message);

      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(message, this.messages.length - 1)) {
          clearTimeout(waiter.timer);
          this.waiters.delete(waiter);
          waiter.resolve(message);
        }
      }
    });
  }

  async waitFor(
    predicate: (message: ServerEnvelope, index: number) => boolean,
    timeoutMs = 4000
  ): Promise<ServerEnvelope> {
    const existingIndex = this.messages.findIndex((message, index) => predicate(message, index));

    if (existingIndex >= 0) {
      return this.messages[existingIndex]!;
    }

    return await new Promise<ServerEnvelope>((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters.delete(waiter);
          reject(new Error("Timed out waiting for socket message"));
        }, timeoutMs)
      };

      this.waiters.add(waiter);
    });
  }

  close(): void {
    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.terminate();
    }
  }
}

type Harness = {
  roomServer: GameRoomServer;
  server: WebSocketServer;
  port: number;
};

const joinChoices = [
  "void-marshal",
  "signal-witch",
  "grave-engineer",
  "black-ledger-agent",
  "cinder-monk",
  "salvage-warden"
] as const;

async function startHarness(
  sessionMode: SessionMode,
  randomSequence: number[] = [0, 0, 0, 0]
): Promise<Harness> {
  const sessionId = `matrix-${sessionMode}-${Math.random().toString(36).slice(2, 7)}`;
  const state = createInitialSessionState(sessionId, sessionMode);
  const roomServer = new GameRoomServer(state, [], createSequenceRandomSource(randomSequence));
  roomServer.setHostToken(createHostToken({ sessionId, secret: "tv-host" }));
  const server = new WebSocketServer({ port: 0 });

  roomServer.attach(server);
  await once(server, "listening");

  return {
    roomServer,
    server,
    port: (server.address() as AddressInfo).port
  };
}

async function connectClient(url: string): Promise<SocketProbe> {
  const socket = new WebSocket(url);
  const probe = new SocketProbe(socket);
  await once(socket, "open");
  return probe;
}

async function waitForServerTick(delayMs = 25): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isStatePatch(message: ServerEnvelope): message is Extract<ServerEnvelope, { type: "STATE_PATCH" }> {
  return message.type === "STATE_PATCH";
}

function statePatchForActiveTurnLength(length: number): (message: ServerEnvelope) => boolean {
  return (message) =>
    isStatePatch(message) &&
    message.payload.status === "active" &&
    Array.isArray(message.payload.turnOrder) &&
    message.payload.turnOrder.length === length;
}

function getFirstNeighborForSeat(state: GameState, seatId: string): string {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const sector = state.sectors.find((entry) => entry.id === player?.character.currentSpaceId);
  const neighbor = sector?.neighbors[0];

  if (!neighbor) {
    throw new Error(`Missing neighbor for ${seatId}`);
  }

  return neighbor;
}

describe("player count integration matrix", () => {
  let harness: Harness | null = null;
  let probes: SocketProbe[] = [];

  afterEach(async () => {
    for (const probe of probes) {
      probe.close();
    }

    probes = [];

    if (harness) {
      await new Promise<void>((resolve, reject) => {
        harness!.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    harness = null;
  });

  it.each([
    { playerCount: 1, sessionMode: "single-player" as const },
    { playerCount: 2, sessionMode: "multiplayer" as const },
    { playerCount: 3, sessionMode: "multiplayer" as const },
    { playerCount: 4, sessionMode: "multiplayer" as const },
    { playerCount: 5, sessionMode: "multiplayer" as const },
    { playerCount: 6, sessionMode: "multiplayer" as const }
  ])(
    "supports lobby creation, joining, actions, turns, and disconnect handling for $playerCount player(s)",
    async ({ playerCount, sessionMode }) => {
      harness = await startHarness(sessionMode);

      const joinResults = Array.from({ length: playerCount }, (_, index) =>
        harness!.roomServer.joinSeat(`Player ${index + 1}`, joinChoices[index % joinChoices.length]!)
      );

      const phones = await Promise.all(
        joinResults.map((joinResult) => connectClient(`ws://127.0.0.1:${harness!.port}/?view=phone&token=${joinResult.seatToken}`))
      );
      probes.push(...phones);

      await Promise.all(phones.map((phone) => phone.waitFor((message) => isStatePatch(message) && Object.hasOwn(message.payload, "self"))));

      harness.roomServer.startSession();

      const startedPatch = (await phones[0]!.waitFor(statePatchForActiveTurnLength(playerCount))) as Extract<
        ServerEnvelope,
        { type: "STATE_PATCH" }
      >;
      expect(startedPatch.payload.status).toBe("active");
      expect(startedPatch.payload.sessionMode).toBe(playerCount === 1 ? "single-player" : "multiplayer");
      expect(startedPatch.payload.turnOrder).toHaveLength(playerCount);

      if (playerCount > 1) {
        phones[1]!.socket.send(
          JSON.stringify({
            type: "PHASE_ADVANCED",
            seatId: "seat-2",
            toPhase: "resolution"
          })
        );

        const rejection = await phones[1]!.waitFor(
          (message) => message.type === "INTENT_REJECTED" && message.actionType === "PHASE_ADVANCED"
        );
        expect("reason" in rejection ? rejection.reason : "").toContain("outside its turn");
      }

      const moveTarget = getFirstNeighborForSeat(harness.roomServer.getState(), "seat-1");

      phones[0]!.socket.send(
        JSON.stringify({
          type: "MOVE_REQUESTED",
          seatId: "seat-1",
          toSectorId: moveTarget
        })
      );

      await waitForServerTick();

      phones[0]!.socket.send(
        JSON.stringify({
          type: "PHASE_ADVANCED",
          seatId: "seat-1",
          toPhase: "resolution"
        })
      );

      await waitForServerTick();

      expect(harness.roomServer.getState().status).toBe("active");
      expect(harness.roomServer.getState().turnOrder).toHaveLength(playerCount);
      expect(harness.roomServer.getState().activeSeatIndex).toBe(playerCount === 1 ? 0 : 1);

      phones[playerCount - 1]!.socket.terminate();
      await waitForServerTick(50);

      expect(harness.roomServer.getState().seats[playerCount - 1]?.connected).toBe(false);
    }
  );

  it("rejects a seventh join once the six-seat multiplayer lobby is full", async () => {
    harness = await startHarness("multiplayer");

    for (let joined = 0; joined < 6; joined += 1) {
      const seat = harness.roomServer.joinSeat(`Player ${joined + 1}`, joinChoices[joined]!);
      expect(seat.seatId).toBe(`seat-${joined + 1}`);
    }

    expect(() => harness!.roomServer.joinSeat("Player 7", joinChoices[0]!)).toThrow("No open seats remain");
  });
});
