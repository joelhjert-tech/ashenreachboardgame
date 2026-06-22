import type { CharacterCatalogEntry, PhoneSessionAuth, ScenarioCatalogEntry, SessionMode } from "./types.js";

const browserHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const browserProtocol = typeof window !== "undefined" ? window.location.protocol : "http:";
const websocketProtocol = browserProtocol === "https:" ? "wss:" : "ws:";
const apiPort = import.meta.env.VITE_API_PORT ?? "8080";
const wsPort = import.meta.env.VITE_WS_PORT ?? apiPort;
const apiOrigin =
  import.meta.env.VITE_API_ORIGIN ?? `${browserProtocol}//${browserHost}:${apiPort}`;
const wsOrigin =
  import.meta.env.VITE_WS_ORIGIN ?? `${websocketProtocol}//${browserHost}:${wsPort}`;

export function getApiOrigin(): string {
  return apiOrigin;
}

export function getWebSocketOrigin(): string {
  return wsOrigin;
}

export async function createSession(
  sessionMode: SessionMode = "multiplayer",
  scenarioId?: string
): Promise<{ roomCode: string; hostToken: string; sessionMode: SessionMode; scenarioId: string }> {
  const response = await fetch(`${apiOrigin}/api/session/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionMode, scenarioId })
  });

  return await response.json();
}

export async function fetchSessionSummary(): Promise<{
  roomCode: string;
  sessionMode: SessionMode;
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
  const response = await fetch(`${apiOrigin}/api/characters`);
  const payload = (await response.json()) as { characters: CharacterCatalogEntry[] };
  return payload.characters;
}

export async function joinSession(input: {
  roomCode: string;
  displayName: string;
  characterId: string;
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
