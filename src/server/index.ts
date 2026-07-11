import { createServer, type IncomingMessage, type ServerResponse, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { pathToFileURL, URL } from "node:url";
import { WebSocketServer } from "ws";
import { getLanHosts, getPreferredLanHost } from "./network.js";
import { findAvailablePort, createPortAvailabilityCheck } from "./ports.js";
import { GameRoomServer } from "./roomServer.js";
import { createInitialSessionState } from "./sessionState.js";
import { createHostToken, validateJoinToken } from "./auth.js";
import type { GameMode, InteractionMode, SessionMode } from "../game/schema/session.schema.js";
import { SCENARIOS, getScenarioDefinition } from "../game/data/scenarios.js";
import { getScenarioSheetArtPath } from "../game/data/scenarioSheetArt.js";
import { nemeses } from "../game/data/nemeses.js";
import { applyPhaseOneQaFixture, type PhaseOneQaFixture } from "./phaseOneQaFixture.js";

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
  qaFixturesEnabled?: boolean;
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
const roomServer = new GameRoomServer(createInitialSessionState(roomCode, "multiplayer", undefined, "rivalry", "standard", undefined, { lobbyConfigured: false }));
roomServer.setHostToken(createHostToken({ sessionId: roomCode, secret: hostToken }));
const nemesisByScenarioId = new Map(
  nemeses.filter((nemesis) => nemesis.scenarioId).map((nemesis) => [nemesis.scenarioId!, nemesis] as const)
);
const validSessionModes = new Set<SessionMode>(["single-player", "multiplayer"]);
const validGameModes = new Set<GameMode>(["standard", "nemesis_relay"]);
const validInteractionModes = new Set<InteractionMode>(["co-op", "rivalry", "ruthless"]);

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

function getPlayerCountError(sessionMode: SessionMode, gameMode: GameMode, playerCount?: number): string | null {
  if (playerCount === undefined) {
    return null;
  }

  if (!Number.isInteger(playerCount)) {
    return "Player count must be a whole number";
  }

  if (sessionMode === "single-player") {
    return playerCount === 1 ? null : "Single-player sessions must use exactly 1 player";
  }

  if (playerCount < 2 || playerCount > 6) {
    return "Multiplayer sessions must use 2-6 players";
  }

  if (gameMode === "nemesis_relay" && playerCount > 4) {
    return "Nemesis Relay supports 1-4 players";
  }

  return null;
}

function createHttpServer(qaFixturesEnabled: boolean): HttpServer {
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
      if (request.method === "POST" && url.pathname === "/api/qa/phase1-fixture") {
        if (!qaFixturesEnabled) {
          sendJson(response, 404, { error: "Not found" });
          return;
        }
        const body = (await readJsonBody(request)) as { roomCode?: string; seatToken?: string; fixture?: PhaseOneQaFixture };
        if (body.roomCode !== roomServer.getState().sessionId || !body.seatToken || !body.fixture) {
          sendJson(response, 400, { error: "Valid room, seat token, and fixture are required" });
          return;
        }
        const tokenPayload = validateJoinToken(body.seatToken, roomServer.getState().sessionId);
        if (!tokenPayload) {
          sendJson(response, 403, { error: "Invalid seat token" });
          return;
        }
        applyPhaseOneQaFixture(roomServer.getState(), tokenPayload.seatId, body.fixture);
        roomServer.broadcastQaFixtureState();
        sendJson(response, 200, { ok: true, fixture: body.fixture, sequence: roomServer.getState().sequence });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/session") {
        sendJson(response, 200, {
          roomCode: roomServer.getState().sessionId,
          sessionMode: roomServer.getState().sessionMode,
          gameMode: roomServer.getState().gameMode,
          interactionMode:
            roomServer.getState().interactionMode ??
            (roomServer.getState().sessionMode === "single-player" ? "co-op" : "rivalry"),
          status: roomServer.getState().status,
          phase: roomServer.getState().phase,
          setupHostSeatId: roomServer.getState().setupHostSeatId ?? null,
          lobbyConfigured: roomServer.getState().lobbyConfigured !== false,
          hostPhoneConnected: Boolean(
            roomServer.getState().setupHostSeatId &&
              roomServer.getState().seats.find((seat) => seat.seatId === roomServer.getState().setupHostSeatId)?.connected
          ),
          scenarioId: roomServer.getState().activeScenarioId,
          playerCount: roomServer.getState().seats.length,
          seats: roomServer.getState().seats
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/characters") {
        const includeQa =
          url.searchParams.has("debug") ||
          url.searchParams.get("qa") === "1" ||
          url.searchParams.get("includeQa") === "1";

        sendJson(response, 200, {
          characters: roomServer.getCharacterCatalog({ includeQa })
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/scenarios") {
        sendJson(response, 200, {
          scenarios: SCENARIOS.map((scenario) => ({
            id: scenario.id,
            name: scenario.name,
            theme: scenario.theme,
            sheetArtPath: getScenarioSheetArtPath(scenario),
            difficulty: scenario.difficulty,
            mode: scenario.mode,
            publicDisplay: scenario.publicDisplay,
            pressureRule: scenario.pressureRule,
            expectedDuration: scenario.expectedDuration,
            pressureTrack: scenario.pressureTrack,
            finalGateRequirement: scenario.finalGateRequirement,
            scenarioRewards: scenario.scenarioRewards,
            nemesis: (() => {
              const nemesis = nemesisByScenarioId.get(scenario.id) ?? null;

              if (!nemesis) {
                return null;
              }

              return {
                name: nemesis.name,
                title: nemesis.title,
                faction: nemesis.faction
              };
            })(),
            setup: scenario.setup,
            specialRules: scenario.specialRules,
            confrontationTitle: scenario.confrontationTitle,
            confrontationSteps: scenario.confrontationSteps,
            victoryText: scenario.victoryText
          }))
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/create") {
        const body = (await readJsonBody(request)) as {
          sessionMode?: SessionMode;
          gameMode?: GameMode;
          scenarioId?: string;
          interactionMode?: InteractionMode;
          playerCount?: number;
        };
        if (body.sessionMode !== undefined && !validSessionModes.has(body.sessionMode)) {
          sendJson(response, 400, { error: "Invalid session mode" });
          return;
        }

        if (body.gameMode !== undefined && !validGameModes.has(body.gameMode)) {
          sendJson(response, 400, { error: "Invalid game mode" });
          return;
        }

        if (body.interactionMode !== undefined && !validInteractionModes.has(body.interactionMode)) {
          sendJson(response, 400, { error: "Invalid interaction mode" });
          return;
        }

        if (body.scenarioId !== undefined && !getScenarioDefinition(body.scenarioId)) {
          sendJson(response, 400, { error: "Invalid scenario id" });
          return;
        }

        const sessionMode = body.sessionMode ?? "multiplayer";
        const gameMode = body.gameMode ?? "standard";
        const playerCountError = getPlayerCountError(sessionMode, gameMode, body.playerCount);

        if (playerCountError) {
          sendJson(response, 400, { error: playerCountError });
          return;
        }

        const requestedInteractionMode = body.interactionMode;

        if (sessionMode !== "single-player" && requestedInteractionMode === undefined) {
          sendJson(response, 400, { error: "Multiplayer sessions require an explicit interaction mode" });
          return;
        }

        if (sessionMode !== "single-player" && gameMode === "nemesis_relay" && requestedInteractionMode !== "co-op") {
          sendJson(response, 400, { error: "Nemesis Relay multiplayer sessions require co-op interaction mode" });
          return;
        }

        const interactionMode: InteractionMode = sessionMode === "single-player" ? "co-op" : requestedInteractionMode!;
        const scenarioId = body.scenarioId ?? SCENARIOS[0]!.id;
        roomCode = createRoomCode();
        hostToken = createRoomCode();
        roomServer.resetSession(createInitialSessionState(roomCode, sessionMode, scenarioId, interactionMode, gameMode, body.playerCount));
        roomServer.setHostToken(createHostToken({ sessionId: roomCode, secret: hostToken }));
        sendJson(response, 200, {
          roomCode,
          sessionMode,
          gameMode,
          interactionMode,
          scenarioId,
          playerCount: roomServer.getState().seats.length,
          hostToken: createHostToken({ sessionId: roomCode, secret: hostToken })
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/join") {
        const body = (await readJsonBody(request)) as {
          roomCode?: string;
          displayName?: string;
          characterId?: string;
          seatId?: string;
        };

        if (body.roomCode !== roomServer.getState().sessionId) {
          sendJson(response, 404, { error: "Unknown room code" });
          return;
        }

        if (!body.displayName?.trim()) {
          sendJson(response, 400, { error: "Display name is required" });
          return;
        }

        const joinResult = roomServer.joinSeat(body.displayName.trim(), body.characterId, body.seatId);
        sendJson(response, 200, joinResult);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/configure") {
        const body = (await readJsonBody(request)) as {
          roomCode?: string;
          seatToken?: string;
          mode?: "single-player" | "co-op" | "rivalry" | "nemesis";
          scenarioId?: string;
          playerCount?: number;
        };

        if (body.roomCode !== roomServer.getState().sessionId) {
          sendJson(response, 404, { error: "Unknown room code" });
          return;
        }

        if (!body.seatToken) {
          sendJson(response, 400, { error: "Seat token is required" });
          return;
        }

        const tokenPayload = validateJoinToken(body.seatToken, roomServer.getState().sessionId);

        if (!tokenPayload) {
          sendJson(response, 403, { error: "Invalid seat token" });
          return;
        }

        if (body.scenarioId !== undefined && !getScenarioDefinition(body.scenarioId)) {
          sendJson(response, 400, { error: "Invalid scenario id" });
          return;
        }

        if (!body.mode) {
          sendJson(response, 400, { error: "Choose Single Player or Multiplayer mode" });
          return;
        }

        const modeMap: Record<NonNullable<typeof body.mode>, { sessionMode: SessionMode; interactionMode: InteractionMode; gameMode: GameMode; playerCount?: number }> = {
          "single-player": { sessionMode: "single-player", interactionMode: "co-op", gameMode: "standard", playerCount: 1 },
          "co-op": { sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "standard", playerCount: body.playerCount },
          rivalry: { sessionMode: "multiplayer", interactionMode: "rivalry", gameMode: "standard", playerCount: body.playerCount },
          nemesis: { sessionMode: "multiplayer", interactionMode: "co-op", gameMode: "nemesis_relay", playerCount: body.playerCount }
        };
        const mapped = modeMap[body.mode];
        const playerCountError = getPlayerCountError(mapped.sessionMode, mapped.gameMode, mapped.playerCount);

        if (playerCountError) {
          sendJson(response, 400, { error: playerCountError });
          return;
        }

        roomServer.configureLobbyFromHostPhone(tokenPayload.seatId, {
          ...mapped,
          scenarioId: body.scenarioId
        });
        sendJson(response, 200, {
          roomCode: roomServer.getState().sessionId,
          sessionMode: roomServer.getState().sessionMode,
          gameMode: roomServer.getState().gameMode,
          interactionMode: roomServer.getState().interactionMode,
          lobbyConfigured: roomServer.getState().lobbyConfigured !== false,
          playerCount: roomServer.getState().seats.length
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/leave") {
        const body = (await readJsonBody(request)) as {
          roomCode?: string;
          seatToken?: string;
        };

        if (body.roomCode !== roomServer.getState().sessionId) {
          sendJson(response, 404, { error: "Unknown room code" });
          return;
        }

        if (!body.seatToken) {
          sendJson(response, 400, { error: "Seat token is required" });
          return;
        }

        roomServer.releaseSeatByToken(body.seatToken);
        sendJson(response, 200, {
          roomCode: roomServer.getState().sessionId,
          status: roomServer.getState().status,
          phase: roomServer.getState().phase
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/ready") {
        const body = (await readJsonBody(request)) as {
          roomCode?: string;
          seatToken?: string;
          ready?: boolean;
        };

        if (body.roomCode !== roomServer.getState().sessionId) {
          sendJson(response, 404, { error: "Unknown room code" });
          return;
        }

        if (!body.seatToken) {
          sendJson(response, 400, { error: "Seat token is required" });
          return;
        }

        const tokenPayload = validateJoinToken(body.seatToken, roomServer.getState().sessionId);

        if (!tokenPayload) {
          sendJson(response, 403, { error: "Invalid seat token" });
          return;
        }

        roomServer.setSeatReady(tokenPayload.seatId, body.ready ?? true);
        sendJson(response, 200, {
          roomCode: roomServer.getState().sessionId,
          seatId: tokenPayload.seatId,
          ready: body.ready ?? true
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/starting-mission") {
        const body = (await readJsonBody(request)) as {
          roomCode?: string;
          seatToken?: string;
          contractId?: string;
        };

        if (body.roomCode !== roomServer.getState().sessionId) {
          sendJson(response, 404, { error: "Unknown room code" });
          return;
        }

        if (!body.seatToken) {
          sendJson(response, 400, { error: "Seat token is required" });
          return;
        }

        if (!body.contractId) {
          sendJson(response, 400, { error: "Starting mission is required" });
          return;
        }

        const tokenPayload = validateJoinToken(body.seatToken, roomServer.getState().sessionId);

        if (!tokenPayload) {
          sendJson(response, 403, { error: "Invalid seat token" });
          return;
        }

        roomServer.selectStartingContract(tokenPayload.seatId, body.contractId);
        sendJson(response, 200, {
          roomCode: roomServer.getState().sessionId,
          seatId: tokenPayload.seatId,
          selectedStartingContractId: body.contractId
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/session/start") {
        const body = (await readJsonBody(request)) as { roomCode?: string; hostToken?: string; seatToken?: string };

        if (body.roomCode !== roomServer.getState().sessionId) {
          sendJson(response, 404, { error: "Unknown room code" });
          return;
        }

        const hostTokenValid = body.hostToken === createHostToken({ sessionId: roomCode, secret: hostToken });
        const tokenPayload = body.seatToken ? validateJoinToken(body.seatToken, roomServer.getState().sessionId) : null;
        const seatTokenValid = Boolean(tokenPayload && tokenPayload.seatId === roomServer.getState().setupHostSeatId);

        if (!hostTokenValid && !seatTokenValid) {
          sendJson(response, 403, { error: "Only the Host Phone can start the session" });
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
  const httpServer = createHttpServer(options.qaFixturesEnabled ?? false);
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
