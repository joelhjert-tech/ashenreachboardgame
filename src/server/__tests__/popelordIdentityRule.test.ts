import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../game/content/threats.js";
import type { ConnectedClient } from "../roomServer.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function clientFor(seatId: string, sent: Array<Record<string, unknown>>): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(value: string) { sent.push(JSON.parse(value) as Record<string, unknown>); },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

describe("Popelord display-name rule", () => {
  it("forces a kebab-named player to select Popelord during setup", () => {
    const server = new GameRoomServer(createInitialSessionState("popelord-setup", "multiplayer"));
    const joined = server.joinSeat("KeBaB");

    expect(() => server.selectSeatCharacter(joined.seatId, "char_deepdale")).toThrow(/Popelord is required/i);
    expect(() => server.selectSeatCharacter(joined.seatId, "char_popelord")).not.toThrow();
    expect(server.getState().seats.find((seat) => seat.seatId === joined.seatId)?.characterId).toBe("char_popelord");
  });

  it("enforces Popelord again when Wounds require a replacement", () => {
    const server = new GameRoomServer(createInitialSessionState("popelord-replacement", "multiplayer"));
    const joined = server.joinSeat("Kebab");
    server.selectSeatCharacter(joined.seatId, "char_popelord");
    const state = server.getState();
    state.status = "active";
    state.phase = "action";
    state.turnOrder = [joined.seatId];
    state.activeSeatIndex = 0;
    const player = state.players.find((entry) => entry.seatId === joined.seatId)!;
    player.character.status = "recalled";
    const sent: Array<Record<string, unknown>> = [];

    server.handleIntent(clientFor(joined.seatId, sent), {
      type: "RECRUIT_REPLACEMENT",
      seatId: joined.seatId,
      replacementCharacterId: "char_deepdale"
    });

    expect(sent.find((message) => message.type === "INTENT_REJECTED")?.reason).toMatch(/Popelord is required/i);
    expect(player.character.id).toBe("char_popelord");
  });

  it("allows an owner to equip an exact starting Gear instance during setup", () => {
    const server = new GameRoomServer(createInitialSessionState("starting-gear-setup", "multiplayer"));
    const joined = server.joinSeat("Lane");
    server.selectSeatCharacter(joined.seatId, "char_deepdale");
    const player = server.getState().players.find((entry) => entry.seatId === joined.seatId)!;
    const startingGear = player.character.heldGear[0]!;
    const sent: Array<Record<string, unknown>> = [];

    server.handleIntent(clientFor(joined.seatId, sent), {
      type: "EQUIP_GEAR",
      seatId: joined.seatId,
      gearId: startingGear.id,
      instanceId: startingGear.instanceId,
      slot: startingGear.slot
    });

    expect(sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    const updated = server.getState().players.find((entry) => entry.seatId === joined.seatId)!;
    expect(updated.character.equippedGear[startingGear.slot]).toBe(startingGear.id);
    expect(updated.character.equippedGearInstances?.[startingGear.slot]).toBe(startingGear.instanceId ?? null);
  });

  it("can stage the next queued enemy after recruiting a replacement", () => {
    const server = new GameRoomServer(createInitialSessionState("replacement-queued-enemy", "single-player"));
    const joined = server.joinSeat("Lane");
    server.selectSeatCharacter(joined.seatId, "char_deepdale");
    const state = server.getState();
    const enemy = [...loadThreatCards().values()].find((card) => card.cardType === "enemy")!;
    state.status = "active";
    state.phase = "action";
    state.turnOrder = [joined.seatId];
    state.activeSeatIndex = 0;
    state.currentEncounter = enemy;
    state.activeResolution = null;
    state.players.find((entry) => entry.seatId === joined.seatId)!.character.status = "recalled";
    const sent: Array<Record<string, unknown>> = [];
    const client = clientFor(joined.seatId, sent);

    server.handleIntent(client, {
      type: "RECRUIT_REPLACEMENT",
      seatId: joined.seatId,
      replacementCharacterId: "black-ledger-agent"
    });
    server.handleIntent(client, {
      type: "COMBAT_REQUESTED",
      seatId: joined.seatId,
      stat: enemy.stat
    });

    expect(sent.find((message) => message.type === "INTENT_REJECTED")).toBeUndefined();
    expect(server.getState().activeResolution?.stage).toBe("battle_setup");
    expect(server.getState().activeResolution?.card?.id).toBe(enemy.id);
  });
});
