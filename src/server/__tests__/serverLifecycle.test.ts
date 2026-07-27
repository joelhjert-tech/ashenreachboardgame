import { once } from "node:events";
import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";

function createTestPort(): number {
  return 21000 + Math.floor(Math.random() * 1000);
}

async function expectToSettleWithin(promise: Promise<void>, timeoutMs: number): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Server shutdown exceeded ${timeoutMs} ms.`)), timeoutMs);
  });

  try {
    await Promise.race([promise, timedOut]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

describe("server lifecycle", () => {
  let harness: StartedAshenReachServer | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = null;
    }
  });

  it("closes promptly while a host WebSocket is still connected", async () => {
    harness = await startAshenReachServer({
      port: createTestPort(),
      host: "127.0.0.1",
      maxPortAttempts: 20,
      logUrls: false
    });
    const socket = new WebSocket(`ws://127.0.0.1:${harness.port}`);
    await once(socket, "open");
    const socketClosed = once(socket, "close");

    await expectToSettleWithin(harness.close(), 1_000);
    harness = null;
    await socketClosed;

    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });
});
