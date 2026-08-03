import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { GameRoomServer, createPhoneProjection, createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function ownedBonusCount(server: GameRoomServer, seatId: string): number {
  const character = server.getState().players.find((player) => player.seatId === seatId)?.character;
  return (character?.heldGear.length ?? 0) + (character?.followers?.length ?? 0);
}

describe("starting bonus selection", () => {
  it("offers two private server-random choices twice and grants each selection exactly once", () => {
    const random = createSequenceRandomSource(Array.from({ length: 512 }, () => 0));
    const server = new GameRoomServer(
      createInitialSessionState("starting-bonus-room", "single-player"),
      [],
      random
    );
    const joined = server.joinSeat("Solo", "void-marshal");
    const startingSeat = server.getState().seats.find((seat) => seat.seatId === joined.seatId)!;
    const missionId = startingSeat.startingContractOptions[0]!;
    const ownedBefore = ownedBonusCount(server, joined.seatId);
    expect(ownedBefore).toBe(0);

    server.selectStartingContract(joined.seatId, missionId);

    const firstOfferSeat = server.getState().seats.find((seat) => seat.seatId === joined.seatId)!;
    const firstOfferId = firstOfferSeat.startingBonusOfferId!;
    const firstOptions = firstOfferSeat.startingBonusOfferOptions!;
    const firstKeys = firstOptions.map((option) => `${option.kind}:${option.id}`);
    expect(firstOptions).toHaveLength(2);
    expect(new Set(firstKeys)).toHaveLength(2);
    expect(() => server.setSeatReady(joined.seatId, true)).toThrow(/two starting bonuses/i);

    const phone = createPhoneProjection(server.getState(), joined.seatId) as {
      startingBonusSelection?: { offerId: string; options: Array<{ kind: string; item?: { id: string }; follower?: { id: string } }> };
    };
    expect(phone.startingBonusSelection?.offerId).toBe(firstOfferId);
    expect(phone.startingBonusSelection?.options).toHaveLength(2);

    const tv = createTvProjection(server.getState()) as {
      startingBonusSelection?: unknown;
      seats?: Array<{ startingBonusPickCount?: number; startingBonusComplete?: boolean; startingBonusOfferOptions?: unknown }>;
    };
    expect(tv.startingBonusSelection).toBeUndefined();
    expect(tv.seats?.[0]).toMatchObject({ startingBonusPickCount: 0, startingBonusComplete: false });
    expect(tv.seats?.[0]?.startingBonusOfferOptions).toBeUndefined();

    server.selectStartingBonus(
      joined.seatId,
      firstOfferId,
      firstOptions[0]!.kind,
      firstOptions[0]!.id
    );

    const secondOfferSeat = server.getState().seats.find((seat) => seat.seatId === joined.seatId)!;
    const secondOfferId = secondOfferSeat.startingBonusOfferId!;
    const secondOptions = secondOfferSeat.startingBonusOfferOptions!;
    expect(secondOfferSeat.startingBonusSelections).toEqual([firstOptions[0]]);
    expect(secondOptions).toHaveLength(2);
    expect(secondOptions.every((option) => !firstKeys.includes(`${option.kind}:${option.id}`))).toBe(true);
    expect(ownedBonusCount(server, joined.seatId)).toBe(ownedBefore + 1);
    expect(() =>
      server.selectStartingBonus(
        joined.seatId,
        firstOfferId,
        firstOptions[0]!.kind,
        firstOptions[0]!.id
      )
    ).toThrow(/stale/i);
    expect(ownedBonusCount(server, joined.seatId)).toBe(ownedBefore + 1);

    const restored = new GameRoomServer(
      structuredClone(server.getState()),
      [],
      createSequenceRandomSource([0])
    );
    const restoredSeat = restored.getState().seats.find((seat) => seat.seatId === joined.seatId)!;
    expect(restoredSeat.startingBonusOfferId).toBe(secondOfferId);
    expect(restoredSeat.startingBonusOfferOptions).toEqual(secondOptions);

    restored.selectStartingBonus(
      joined.seatId,
      secondOfferId,
      secondOptions[0]!.kind,
      secondOptions[0]!.id
    );
    const completedSeat = restored.getState().seats.find((seat) => seat.seatId === joined.seatId)!;
    expect(completedSeat.startingBonusSelections).toHaveLength(2);
    expect(completedSeat.startingBonusOfferId).toBeNull();
    expect(completedSeat.startingBonusOfferOptions).toEqual([]);
    expect(ownedBonusCount(restored, joined.seatId)).toBe(2);

    restored.setSeatReady(joined.seatId, true);
    expect(restored.getState().seats.find((seat) => seat.seatId === joined.seatId)?.ready).toBe(true);
  });
});
