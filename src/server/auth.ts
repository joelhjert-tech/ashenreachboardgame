import { randomUUID } from "node:crypto";

export interface JoinTokenPayload {
  sessionId: string;
  seatId: string;
  secret?: string;
}

export interface HostTokenPayload {
  sessionId: string;
  secret: string;
}

const generatedJoinSecrets = new Map<string, string>();

export function createJoinToken({ sessionId, seatId, secret }: JoinTokenPayload): string {
  const cacheKey = `${sessionId}:${seatId}`;
  const resolvedSecret =
    secret ??
    generatedJoinSecrets.get(cacheKey) ??
    (() => {
      const nextSecret = randomUUID();
      generatedJoinSecrets.set(cacheKey, nextSecret);
      return nextSecret;
    })();

  return ["seat", sessionId, seatId, resolvedSecret].join(":");
}

export function validateJoinToken(token: string, expectedSessionId: string): JoinTokenPayload | null {
  const [prefix, sessionId, seatId, secret] = token.split(":");

  if (prefix !== "seat" || !sessionId || !seatId || !secret || sessionId !== expectedSessionId) {
    return null;
  }

  return { sessionId, seatId, secret };
}

export function createHostToken({ sessionId, secret }: HostTokenPayload): string {
  return `host:${sessionId}:${secret}`;
}

export function validateHostToken(token: string, expectedSessionId: string): HostTokenPayload | null {
  const [prefix, sessionId, secret] = token.split(":");

  if (prefix !== "host" || !sessionId || !secret || sessionId !== expectedSessionId) {
    return null;
  }

  return { sessionId, secret };
}
