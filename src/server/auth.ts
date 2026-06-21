export interface JoinTokenPayload {
  sessionId: string;
  seatId: string;
}

export interface HostTokenPayload {
  sessionId: string;
  secret: string;
}

export function createJoinToken({ sessionId, seatId }: JoinTokenPayload): string {
  return `seat:${sessionId}:${seatId}`;
}

export function validateJoinToken(token: string, expectedSessionId: string): JoinTokenPayload | null {
  const [prefix, sessionId, seatId] = token.split(":");

  if (prefix !== "seat" || !sessionId || !seatId || sessionId !== expectedSessionId) {
    return null;
  }

  return { sessionId, seatId };
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
