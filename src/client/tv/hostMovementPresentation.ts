import type {
  PublicMoveDestination,
  PublicPatchPayload
} from "../shared/types.js";

export interface MovementArrivalModel {
  eventId: string;
  destination: PublicMoveDestination;
  movingSeatId: string;
  playerName: string;
  operativeName: string;
  originName: string;
}

export function getMovementArrivalModel(
  patch: PublicPatchPayload | null | undefined,
  previousPatch: PublicPatchPayload | null | undefined,
  sequence = 0
): MovementArrivalModel | null {
  const planner = previousPatch?.movementPlanner?.active ? previousPatch.movementPlanner : null;

  if (!patch || !planner) {
    return null;
  }

  const previousSectorBySeat = new Map(
    (previousPatch?.players ?? []).map((player) => [player.seatId, player.sectorId] as const)
  );
  const movedPlayer = patch.players.find(
    (player) => previousSectorBySeat.get(player.seatId) !== player.sectorId
  );
  const destination = movedPlayer
    ? planner.destinations.find((entry) => entry.sectorId === movedPlayer.sectorId) ?? null
    : null;

  return movedPlayer && destination
    ? {
        eventId: `${sequence}:${movedPlayer.seatId}:${planner.currentSectorId}:${destination.sectorId}`,
        destination,
        movingSeatId: movedPlayer.seatId,
        playerName:
          patch.seats.find((seat) => seat.seatId === movedPlayer.seatId)?.displayName
          ?? movedPlayer.character.name,
        operativeName: movedPlayer.character.name,
        originName: planner.currentSectorName
      }
    : null;
}
