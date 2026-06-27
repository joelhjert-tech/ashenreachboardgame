import type { SessionMode } from "../schema/session.schema.js";

export const MULTIPLAYER_MIN_READY_PLAYERS = 2;

export interface SessionStartSeat {
  seatId: string;
  characterId?: string | null;
  displayName?: string | null;
  ready: boolean;
  kicked?: boolean;
}

export interface SessionStartReadiness {
  canStart: boolean;
  reason: string;
  occupiedSeats: SessionStartSeat[];
  occupiedSeatIds: string[];
  occupiedCount: number;
  selectedCharacterCount: number;
  readyCount: number;
}

export function getSessionStartReadiness(input: {
  sessionMode: SessionMode;
  seats: readonly SessionStartSeat[];
}): SessionStartReadiness {
  const occupiedSeats = input.seats.filter((seat) => Boolean(seat.displayName) && !seat.kicked);
  const selectedCharacterCount = occupiedSeats.filter((seat) => Boolean(seat.characterId)).length;
  const readyCount = occupiedSeats.filter((seat) => seat.ready).length;
  const base = {
    occupiedSeats,
    occupiedSeatIds: occupiedSeats.map((seat) => seat.seatId),
    occupiedCount: occupiedSeats.length,
    selectedCharacterCount,
    readyCount
  };

  if (occupiedSeats.length === 0) {
    return {
      ...base,
      canStart: false,
      reason: "Waiting for player to join"
    };
  }

  if (input.sessionMode === "single-player" && occupiedSeats.length > 1) {
    return {
      ...base,
      canStart: false,
      reason: "Single-player supports one player"
    };
  }

  if (input.sessionMode !== "single-player" && occupiedSeats.length < MULTIPLAYER_MIN_READY_PLAYERS) {
    return {
      ...base,
      canStart: false,
      reason: `Need at least ${MULTIPLAYER_MIN_READY_PLAYERS} players`
    };
  }

  if (selectedCharacterCount < occupiedSeats.length) {
    return {
      ...base,
      canStart: false,
      reason: "Waiting for player to choose character"
    };
  }

  if (readyCount < occupiedSeats.length) {
    return {
      ...base,
      canStart: false,
      reason: "Waiting for player to press Ready"
    };
  }

  return {
    ...base,
    canStart: true,
    reason: input.sessionMode === "single-player" ? "Single-player ready" : "Multiplayer ready"
  };
}
