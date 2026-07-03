import type { CharacterCatalogEntry, GameMode, InteractionMode, PhoneSessionAuth, PublicSeat, ScenarioCatalogEntry, SessionMode } from "./types.js";

interface BrowserOriginParts {
  protocol: string;
  hostname: string;
  origin: string;
}

interface ResolveNetworkOriginOptions {
  protocol: string;
  hostname: string;
  port: string;
  configuredOrigin?: string;
}

interface BuildPhoneJoinUrlOptions {
  roomCode: string;
  currentOrigin: string;
  publicClientOrigin?: string;
}

const defaultBrowserOrigin: BrowserOriginParts =
  typeof window !== "undefined"
    ? {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        origin: window.location.origin
      }
    : {
        protocol: "http:",
        hostname: "localhost",
        origin: "http://localhost"
      };

const apiPort = import.meta.env.VITE_API_PORT ?? "8080";
const wsPort = import.meta.env.VITE_WS_PORT ?? apiPort;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeConfiguredOrigin(origin: string | undefined): string | null {
  const normalized = origin?.trim();
  return normalized ? trimTrailingSlash(normalized) : null;
}

export function resolveApiOrigin({
  protocol,
  hostname,
  port,
  configuredOrigin
}: ResolveNetworkOriginOptions): string {
  return normalizeConfiguredOrigin(configuredOrigin) ?? `${protocol}//${hostname}:${port}`;
}

export function resolveWebSocketOrigin({
  protocol,
  hostname,
  port,
  configuredOrigin
}: ResolveNetworkOriginOptions): string {
  const websocketProtocol = protocol === "https:" ? "wss:" : "ws:";
  return normalizeConfiguredOrigin(configuredOrigin) ?? `${websocketProtocol}//${hostname}:${port}`;
}

export function buildPhoneJoinUrl({
  roomCode,
  currentOrigin,
  publicClientOrigin
}: BuildPhoneJoinUrlOptions): string {
  const joinOrigin = normalizeConfiguredOrigin(publicClientOrigin) ?? trimTrailingSlash(currentOrigin);
  const url = new URL(joinOrigin);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", roomCode);
  return url.toString();
}

const apiOrigin = resolveApiOrigin({
  protocol: defaultBrowserOrigin.protocol,
  hostname: defaultBrowserOrigin.hostname,
  port: apiPort,
  configuredOrigin: import.meta.env.VITE_API_ORIGIN
});
const wsOrigin = resolveWebSocketOrigin({
  protocol: defaultBrowserOrigin.protocol,
  hostname: defaultBrowserOrigin.hostname,
  port: wsPort,
  configuredOrigin: import.meta.env.VITE_WS_ORIGIN
});

export function getApiOrigin(): string {
  return apiOrigin;
}

export function getWebSocketOrigin(): string {
  return wsOrigin;
}

export function getPhoneJoinUrl(roomCode: string): string {
  return buildPhoneJoinUrl({
    roomCode,
    currentOrigin: defaultBrowserOrigin.origin,
    publicClientOrigin: import.meta.env.VITE_PUBLIC_CLIENT_ORIGIN
  });
}

export function getConnectionDiagnostics(): {
  pageUrl: string;
  apiOrigin: string;
  webSocketOrigin: string;
  publicClientOrigin: string | null;
  isLocalhostPage: boolean;
} {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const publicClientOrigin = normalizeConfiguredOrigin(import.meta.env.VITE_PUBLIC_CLIENT_ORIGIN);

  return {
    pageUrl,
    apiOrigin,
    webSocketOrigin: wsOrigin,
    publicClientOrigin,
    isLocalhostPage: defaultBrowserOrigin.hostname === "localhost" || defaultBrowserOrigin.hostname === "127.0.0.1"
  };
}

export async function createSession(
  sessionMode: SessionMode = "multiplayer",
  scenarioId?: string,
  interactionMode?: InteractionMode,
  gameMode: GameMode = "standard",
  playerCount?: number
): Promise<{
  roomCode: string;
  hostToken: string;
  sessionMode: SessionMode;
  gameMode: GameMode;
  interactionMode: InteractionMode;
  scenarioId: string;
  playerCount: number;
}> {
  const response = await fetch(`${apiOrigin}/api/session/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionMode, scenarioId, interactionMode, gameMode, playerCount })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not create session");
  }

  return payload;
}

export async function fetchSessionSummary(): Promise<{
  roomCode: string;
  sessionMode: SessionMode;
  gameMode: GameMode;
  interactionMode: InteractionMode;
  scenarioId: string;
  playerCount: number;
  seats: PublicSeat[];
  status: string;
  phase: string;
}> {
  const response = await fetch(`${apiOrigin}/api/session`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load session");
  }

  return payload as {
    roomCode: string;
    sessionMode: SessionMode;
    gameMode: GameMode;
    interactionMode: InteractionMode;
    scenarioId: string;
    playerCount: number;
    seats: PublicSeat[];
    status: string;
    phase: string;
  };
}

export async function fetchScenarios(): Promise<ScenarioCatalogEntry[]> {
  const response = await fetch(`${apiOrigin}/api/scenarios`);
  const payload = (await response.json()) as { scenarios: ScenarioCatalogEntry[] };
  return payload.scenarios;
}

export async function fetchCharacters(): Promise<CharacterCatalogEntry[]> {
  const includeQa =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).has("debug") ||
      new URLSearchParams(window.location.search).get("qa") === "1");
  const response = await fetch(`${apiOrigin}/api/characters${includeQa ? "?debug=1" : ""}`);
  const payload = (await response.json()) as { characters: CharacterCatalogEntry[] };
  return payload.characters;
}

export async function joinSession(input: {
  roomCode: string;
  displayName: string;
  characterId: string;
  seatId?: string;
}): Promise<PhoneSessionAuth> {
  const response = await fetch(`${apiOrigin}/api/session/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Join failed");
  }

  return {
    roomCode: payload.roomCode,
    seatId: payload.seatId,
    seatToken: payload.seatToken,
    displayName: input.displayName
  };
}

export async function leaveSession(auth: PhoneSessionAuth): Promise<void> {
  const response = await fetch(`${apiOrigin}/api/session/leave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      roomCode: auth.roomCode,
      seatToken: auth.seatToken
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not leave lobby");
  }
}

export async function startSession(roomCode: string): Promise<void> {
  const response = await fetch(`${apiOrigin}/api/session/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      roomCode,
      hostToken: typeof window !== "undefined" ? window.localStorage.getItem("ashen-reach-tv-host-token") : null
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Start failed");
  }
}
