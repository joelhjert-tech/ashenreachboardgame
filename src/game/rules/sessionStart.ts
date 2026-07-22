import type { GameMode, SessionMode } from "../schema/session.schema.js";
import { NAMED_PLAYER_POPELORD_ID, resolveNamedPlayerRules } from "./namedPlayerRules.js";

export const MULTIPLAYER_MIN_READY_PLAYERS = 2;

export interface SessionStartSeat {
  seatId: string;
  characterId?: string | null;
  characterSelected?: boolean;
  displayName?: string | null;
  selectedStartingContractId?: string | null;
  startingMissionSelected?: boolean;
  ready: boolean;
  kicked?: boolean;
}

export interface SessionStartReadiness {
  canStart: boolean;
  reason: string;
  blockers: string[];
  occupiedSeats: SessionStartSeat[];
  occupiedSeatIds: string[];
  occupiedCount: number;
  selectedCharacterCount: number;
  selectedMissionCount: number;
  readyCount: number;
}

export function getSessionStartReadiness(input: {
  sessionMode: SessionMode;
  gameMode?: GameMode;
  seats: readonly SessionStartSeat[];
}): SessionStartReadiness {
  const occupiedSeats = input.seats.filter((seat) => Boolean(seat.displayName) && !seat.kicked);
  const selectedCharacterCount = occupiedSeats.filter((seat) => Boolean(seat.characterId) && seat.characterSelected !== false).length;
  const selectedMissionCount = occupiedSeats.filter(
    (seat) => Boolean(seat.selectedStartingContractId) || seat.startingMissionSelected === true
  ).length;
  const readyCount = occupiedSeats.filter((seat) => seat.ready).length;
  const base = {
    occupiedSeats,
    occupiedSeatIds: occupiedSeats.map((seat) => seat.seatId),
    occupiedCount: occupiedSeats.length,
    selectedCharacterCount,
    selectedMissionCount,
    readyCount
  };

  const blockers: string[] = [];
  const kebabSeats = occupiedSeats.filter((seat) => resolveNamedPlayerRules({ displayName: seat.displayName }).forcedCharacterId === NAMED_PLAYER_POPELORD_ID);

  if (occupiedSeats.length === 0) {
    blockers.push("Waiting for player to join");
  }

  if (input.sessionMode === "single-player" && occupiedSeats.length > 1) {
    blockers.push("Single-player supports one player");
  }

  if (input.sessionMode !== "single-player" && occupiedSeats.length < MULTIPLAYER_MIN_READY_PLAYERS) {
    blockers.push(`Need at least ${MULTIPLAYER_MIN_READY_PLAYERS} players`);
  }

  if (input.gameMode === "nemesis_relay" && occupiedSeats.length > 4) {
    blockers.push("Nemesis Relay supports up to 4 players");
  }

  if (kebabSeats.length > 1) {
    blockers.push("Only one Popelord is available. Change one player name before starting.");
  }

  for (const seat of occupiedSeats) {
    const name = seat.displayName ?? "Player";
    if (!seat.characterId || seat.characterSelected === false) {
      blockers.push(`${name} must choose an operative`);
    } else if (!seat.selectedStartingContractId && seat.startingMissionSelected !== true) {
      blockers.push(`${name} must choose a starting mission`);
    } else if (!seat.ready) {
      blockers.push(`${name} must press Ready`);
    }
  }

  if (occupiedSeats.length === 0) {
    return {
      ...base,
      canStart: false,
      reason: "Waiting for player to join",
      blockers
    };
  }

  if (input.sessionMode === "single-player" && occupiedSeats.length > 1) {
    return {
      ...base,
      canStart: false,
      reason: "Single-player supports one player",
      blockers
    };
  }

  if (input.sessionMode !== "single-player" && occupiedSeats.length < MULTIPLAYER_MIN_READY_PLAYERS) {
    return {
      ...base,
      canStart: false,
      reason: `Need at least ${MULTIPLAYER_MIN_READY_PLAYERS} players`,
      blockers
    };
  }

  if (input.gameMode === "nemesis_relay" && occupiedSeats.length > 4) {
    return {
      ...base,
      canStart: false,
      reason: "Nemesis Relay supports up to 4 players",
      blockers
    };
  }

  if (kebabSeats.length > 1) {
    return {
      ...base,
      canStart: false,
      reason: "Only one Popelord is available. Change one player name before starting.",
      blockers
    };
  }

  if (selectedCharacterCount < occupiedSeats.length) {
    const waitingSeat = occupiedSeats.find((seat) => !Boolean(seat.characterId) || seat.characterSelected === false);
    const waitingName = waitingSeat?.displayName ?? waitingSeat?.seatId ?? "player";

    return {
      ...base,
      canStart: false,
      reason: `Waiting for ${waitingName} to choose a character`,
      blockers
    };
  }

  if (selectedMissionCount < occupiedSeats.length) {
    const waitingSeat = occupiedSeats.find(
      (seat) => !Boolean(seat.selectedStartingContractId) && seat.startingMissionSelected !== true
    );
    const waitingName = waitingSeat?.displayName ?? waitingSeat?.seatId ?? "player";

    return {
      ...base,
      canStart: false,
      reason: `Waiting for ${waitingName} to choose a starting mission`,
      blockers
    };
  }

  if (readyCount < occupiedSeats.length) {
    const waitingSeat = occupiedSeats.find((seat) => !seat.ready);
    const waitingName = waitingSeat?.displayName ?? waitingSeat?.seatId ?? "player";

    return {
      ...base,
      canStart: false,
      reason: `Waiting for ${waitingName} to press Ready`,
      blockers
    };
  }

  return {
    ...base,
    canStart: true,
    reason: input.sessionMode === "single-player" ? "Single-player ready" : "Multiplayer ready",
    blockers: []
  };
}
