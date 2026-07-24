import { describe, expect, it } from "vitest";
import type { PublicPatchPayload } from "../../client/shared/types.js";
import { GameRoomServer, createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

describe("Signal Theatre piece selection", () => {
  it("stores a public presentation choice without changing the operative or movement state", () => {
    const server = new GameRoomServer(createInitialSessionState("signal-piece-choice", "multiplayer"));
    const joined = server.joinSeat("Nera");
    const before = structuredClone(server.getState());

    server.selectSeatCharacter(joined.seatId, "char_deepdale", { signalPieceId: "compass" });

    const after = server.getState();
    const seat = after.seats.find((entry) => entry.seatId === joined.seatId);
    expect(seat).toMatchObject({
      characterId: "char_deepdale",
      signalPieceId: "compass"
    });
    expect(after.turnOrder).toEqual(before.turnOrder);
    expect(after.movementRolls).toEqual(before.movementRolls);
    expect(after.normalMovementRollDetails).toEqual(before.normalMovementRollDetails);

    const projection = createTvProjection(after) as unknown as PublicPatchPayload;
    expect(projection.seats.find((entry) => entry.seatId === joined.seatId)?.signalPieceId).toBe("compass");
  });

  it("restores the same choice from a snapshot", () => {
    const server = new GameRoomServer(createInitialSessionState("signal-piece-restore", "multiplayer"));
    const joined = server.joinSeat("Nera");
    server.selectSeatCharacter(joined.seatId, "char_deepdale", { signalPieceId: "lantern" });

    const restored = new GameRoomServer(structuredClone(server.getState()));
    expect(restored.getState().seats.find((entry) => entry.seatId === joined.seatId)?.signalPieceId).toBe("lantern");
  });

  it("keeps every occupied player's silhouette distinct", () => {
    const server = new GameRoomServer(createInitialSessionState("signal-piece-exclusive", "multiplayer"));
    const first = server.joinSeat("Nera");
    const second = server.joinSeat("Oran");
    server.selectSeatCharacter(first.seatId, "char_deepdale", { signalPieceId: "reliquary" });

    expect(() =>
      server.selectSeatCharacter(second.seatId, "char_bjornis", { signalPieceId: "reliquary" })
    ).toThrow(/already taken/i);
  });
});
