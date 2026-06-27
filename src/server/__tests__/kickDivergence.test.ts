import { describe, expect, it } from "vitest";
import type { MoveRequestedAction } from "../../game/engine/actions.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

describe("kick turn-order regression", () => {
  it("keeps reducer turn ownership aligned with server turnOrder after the active seat is kicked", () => {
    const server = new GameRoomServer(createInitialSessionState("ROOM1", "multiplayer"));
    server.joinSeat("A", "void-marshal");
    server.joinSeat("B", "signal-witch");
    server.joinSeat("C", "grave-engineer");
    server.setSeatReady("seat-1", true);
    server.setSeatReady("seat-2", true);
    server.setSeatReady("seat-3", true);
    server.startSession();

    (server as unknown as { kickSeat(targetSeatId: string): void }).kickSeat("seat-1");

    const state = server.getState();
    const activeSeatId = state.turnOrder[state.activeSeatIndex];
    const activePlayer = state.players.find((player) => player.seatId === activeSeatId);
    const activeSector = state.sectors.find((sector) => sector.id === activePlayer?.character.currentSpaceId);
    const targetSectorId = activeSector?.neighbors[0];

    expect(activeSeatId).toBe("seat-2");
    expect(targetSectorId).toBeTruthy();
    if (!activeSeatId || !targetSectorId) {
      throw new Error("Kick regression fixture did not produce an active seat with a legal move");
    }

    const result = reduceGameState(state, {
      type: "MOVE_REQUESTED",
      seatId: activeSeatId,
      toSectorId: targetSectorId,
      createdAt: new Date().toISOString()
    } satisfies MoveRequestedAction);

    expect(result.ok).toBe(true);
  });
});
