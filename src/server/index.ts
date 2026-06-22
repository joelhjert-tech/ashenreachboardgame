import { createServer, type IncomingMessage, type ServerResponse, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { pathToFileURL, URL } from "node:url";
import { WebSocketServer } from "ws";
import { getLanHosts, getPreferredLanHost } from "./network.js";
import { findAvailablePort, createPortAvailabilityCheck } from "./ports.js";
import { GameRoomServer } from "./roomServer.js";
import { createInitialSessionState } from "./sessionState.js";
import { createHostToken } from "./auth.js";
import type { SessionMode } from "../game/schema/session.schema.js";

const DEFAULT_SERVER_PORT = 8080;
const DEFAULT_CLIENT_PORT = 5173;
const DEFAULT_SERVER_HOST = "0.0.0.0";
const DEFAULT_PORT_ATTEMPTS = 10;

export interface StartAshenReachServerOptions {
  port?: number;
  clientPort?: number;
  host?: string;
  maxPortAttempts?: number;
  logUrls?: boolean;
}

export interface StartedAshenReachServer {
  httpServer: HttpServer;
  websocketServer: WebSocketServer;
  roomServer: GameRoomServer;
  port: number;
  host: string;
  clientPort: number;
  lanHost: string;
  close: () => Promise<void>;
}

let roomCode = createRoomCode();
let hostToken = createRoomCode();
const roomServer = new GameRoomServer(createInitialSessionState(roomCode));
roomServer.setHostToken(createHostToken({ sessionId: roomCode, secret: hostToken }));

function createRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk: Buffer | string) => {
      body += String(chunk);
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response: ServerResponse<IncomingMessage>, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function createHttpServer(): HttpServer {
  return createServer(async (request, response) => {
    if (!request.url) {
      sendJson(response, 400, { error: "Missing request URL" });
      return;
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      });
      response.end();
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

    try {
      if (request.method === "GET" && url.pathname === "/api/session") {
        sendJson(response, 200, {
          roomCode: roomServer.getState().sessionId,
          sessionMode: roomServer.getState().sessionMode,
          status: roomServer.getState().status,
          phase: roomServer.getState().phase,
          seats: roomServer.getState().seats
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/characters") {
        sendJson(response, 200, {
          characters: roomServer.getCharacterCatalog()
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/create") {
        const body = (await readJsonBody(request)) as { sessionMode?: SessionMode };
        const sessionMode = body.sessionMode === "single-player" ? "single-player" : "multiplayer";
        roomCode = createRoomCode();
        hostToken = createRoomCode();
        roomServer.resetSession(createInitialSessionState(roomCode, sessionMode));
        roomServer.setHostToken(createHostToken({ sessionId: roomCode, secret: hostToken }));
        sendJson(response, 200, {
          roomCode,
          sessionMode,
          hostToken: createHostToken({ sessionId: roomCode, secret: hostToken })
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/join") {
        const body = (await readJsonBody(request)) as {
          roomCode?: string;
          displayName?: string;
          characterId?: string;
        };

        if (body.roomCode !== roomServer.getState().sessionId) {
          sendJson(response, 404, { error: "Unknown room code" });
          return;
        }

        if (!body.displayName?.trim() || !body.characterId) {
          sendJson(response, 400, { error: "Display name and character are required" });
          return;
        }

        const joinResult = roomServer.joinSeat(body.displayName.trim(), body.characterId);
        sendJson(response, 200, joinResult);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/start") {
        const body = (await readJsonBody(request)) as { roomCode?: string; hostToken?: string };

        if (body.roomCode !== roomServer.getState().sessionId) {
          sendJson(response, 404, { error: "Unknown room code" });
          return;
        }

        if (body.hostToken !== createHostToken({ sessionId: roomCode, secret: hostToken })) {
          sendJson(response, 403, { error: "Only the host can start the session" });
          return;
        }

        roomServer.startSession();
        sendJson(response, 200, {
          roomCode: roomServer.getState().sessionId,
          status: roomServer.getState().status,
          phase: roomServer.getState().phase
        });
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Request failed"
      });
    }
  });
}

async function listen(httpServer: HttpServer, port: number, host: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      httpServer.off("error", onError);
      reject(error);
    };

    httpServer.once("error", onError);
    httpServer.listen(port, host, () => {
      httpServer.off("error", onError);
      resolve();
    });
  });
}

function printLocalNetworkUrls(port: number, clientPort: number, lanHost: string): void {
  console.log("Ashen Reach dev server");
  console.log(`  API/WS:  http://${lanHost}:${port}`);
  console.log(`  Client:  http://${lanHost}:${clientPort}`);
}

async function resolveListeningPort(
  httpServer: HttpServer,
  host: string,
  requestedPort: number,
  maxAttempts: number
): Promise<number> {
  const checkPort = createPortAvailabilityCheck(host);
  const maxPort = requestedPort + maxAttempts - 1;
  let candidate = await findAvailablePort(requestedPort, {
    maxAttempts,
    isPortFree: checkPort
  });

  while (candidate <= maxPort) {
    try {
      await listen(httpServer, candidate, host);
      return candidate;
    } catch (error) {
      const portError = error as NodeJS.ErrnoException;

      if (portError.code !== "EADDRINUSE") {
        throw error;
      }

      const remainingAttempts = maxPort - candidate;

      if (remainingAttempts <= 0) {
        break;
      }

      candidate = await findAvailablePort(candidate + 1, {
        maxAttempts: remainingAttempts,
        isPortFree: checkPort
      });
    }
  }

  throw new Error(`No free port found starting at ${requestedPort} within ${maxAttempts} attempts.`);
}

export async function startAshenReachServer(
  options: StartAshenReachServerOptions = {}
): Promise<StartedAshenReachServer> {
  const requestedPort = options.port ?? Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
  const clientPort = options.clientPort ?? Number(process.env.CLIENT_PORT ?? DEFAULT_CLIENT_PORT);
  const host = options.host ?? DEFAULT_SERVER_HOST;
  const maxPortAttempts = options.maxPortAttempts ?? DEFAULT_PORT_ATTEMPTS;
  const logUrls = options.logUrls ?? true;
  const httpServer = createHttpServer();
  const websocketServer = new WebSocketServer({ server: httpServer });

  roomServer.attach(websocketServer);

  const port = await resolveListeningPort(httpServer, host, requestedPort, maxPortAttempts);
  const address = httpServer.address() as AddressInfo | null;
  const resolvedPort = address?.port ?? port;
  const lanHost = getPreferredLanHost();

  if (logUrls) {
    printLocalNetworkUrls(resolvedPort, clientPort, lanHost);
  }

  return {
    httpServer,
    websocketServer,
    roomServer,
    port: resolvedPort,
    host,
    clientPort,
    lanHost,
    close: async () =>
      await new Promise<void>((resolve, reject) => {
        websocketServer.close();
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      })
  };
}

export function getServerNetworkHosts(): string[] {
  return getLanHosts();
}

async function runFromCli(): Promise<void> {
  await startAshenReachServer();
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runFromCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
