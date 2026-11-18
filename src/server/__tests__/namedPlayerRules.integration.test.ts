import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { getSessionStartReadiness } from "../../game/rules/sessionStart.js";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import type { GameAction } from "../../game/engine/actions.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import type { PhonePatchPayload } from "../../client/shared/types.js";
import { GameRoomServer, createPhoneProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function joinedServer(name: string, mode: "single-player" | "multiplayer" = "multiplayer") {
  const server = new GameRoomServer(createInitialSessionState(`named-${name.toLowerCase()}`, mode));
  const joined = server.joinSeat(name);
  return { server, joined };
}

describe("server-authoritative named player rules", () => {
  it("preserves an ordinary player's Poopydiperlord selection when nobody reserves it", () => {
    const { server, joined } = joinedServer("Lane");
    server.selectSeatCharacter(joined.seatId, "char_popelord");
    expect(server.getState().seats.find((seat) => seat.seatId === joined.seatId)).toMatchObject({
      characterId: "char_popelord",
      characterSelected: true
    });
    const restored = new GameRoomServer(structuredClone(server.getState()));
    expect(restored.getState().seats.find((seat) => seat.seatId === joined.seatId)).toMatchObject({
      characterId: "char_popelord",
      characterSelected: true
    });
  });

  it("auto-selects and reserves Poopydiperlord for the earliest exact Kebab", () => {
    const server = new GameRoomServer(createInitialSessionState("named-kebab", "multiplayer"));
    const first = server.joinSeat("Lane");
    server.selectSeatCharacter(first.seatId, "char_popelord");
    const kebab = server.joinSeat(" KEBAB ");

    expect(server.getState().seats.find((seat) => seat.seatId === first.seatId)?.characterSelected).toBe(false);
    expect(server.getState().seats.find((seat) => seat.seatId === kebab.seatId)).toMatchObject({
      characterId: "char_popelord",
      characterSelected: true
    });
    expect(() => server.selectSeatCharacter(first.seatId, "char_popelord")).toThrow(/reserved/i);
  });

  it("blocks a second Kebab without fabricating another Poopydiperlord", () => {
    const server = new GameRoomServer(createInitialSessionState("named-two-kebabs", "multiplayer"));
    const first = server.joinSeat("Kebab");
    const second = server.joinSeat("kebab");
    expect(server.getState().seats.find((seat) => seat.seatId === first.seatId)?.characterSelected).toBe(true);
    expect(server.getState().seats.find((seat) => seat.seatId === second.seatId)?.characterSelected).toBe(false);
    expect(getSessionStartReadiness({ sessionMode: "multiplayer", seats: server.getState().seats }).reason)
      .toBe("Only one Poopydiperlord is available. Change one player name before starting.");
  });

  it.each(["Annette", "NENNE"])("guarantees one bound Fandiablos for %s", (name) => {
    const { server, joined } = joinedServer(name);
    server.selectSeatCharacter(joined.seatId, "char_deepdale");
    const followers = server.getState().players.find((player) => player.seatId === joined.seatId)?.character.followers ?? [];
    expect(followers.filter((follower) => follower.id === "fandiablos")).toHaveLength(1);
    expect(followers.find((follower) => follower.id === "fandiablos")?.instanceId).toBe(`named-player:${joined.seatId}:fandiablos`);
    const projection = createPhoneProjection(server.getState(), joined.seatId) as unknown as PhonePatchPayload;
    expect(projection.objectUseStates?.find((entry) => entry.id === "fandiablos")?.boundReason).toBe("BOUND — Granted by player identity");

    const restored = new GameRoomServer(structuredClone(server.getState()));
    const restoredFollowers = restored.getState().players.find((player) => player.seatId === joined.seatId)?.character.followers ?? [];
    expect(restoredFollowers.filter((follower) => follower.id === "fandiablos")).toHaveLength(1);
  });

  it("allows Annette and Nenne one narrow bound copy each", () => {
    const server = new GameRoomServer(createInitialSessionState("named-fandiablos-pair", "multiplayer"));
    const annette = server.joinSeat("Annette");
    const nenne = server.joinSeat("Nenne");
    server.selectSeatCharacter(annette.seatId, "char_deepdale");
    server.selectSeatCharacter(nenne.seatId, "char_kira_dog");
    for (const seatId of [annette.seatId, nenne.seatId]) {
      expect(server.getState().players.find((player) => player.seatId === seatId)?.character.followers?.filter((follower) => follower.id === "fandiablos")).toHaveLength(1);
    }
  });

  it("does not remove or reward a forged discard of bound Fandiablos", () => {
    const { server, joined } = joinedServer("Annette");
    server.selectSeatCharacter(joined.seatId, "char_deepdale");
    const before = server.getState();
    const salvage = before.players.find((player) => player.seatId === joined.seatId)!.character.salvage;
    const result = reduceGameState(before, {
      type: "USE_FOLLOWER",
      seatId: joined.seatId,
      followerId: "fandiablos",
      followerInstanceId: `named-player:${joined.seatId}:fandiablos`,
      effect: null,
      discard: true,
      summary: "Forged discard attempt",
      createdAt: "2026-07-22T00:00:00.000Z"
    });
    expect(result.ok).toBe(false);
    const player = before.players.find((entry) => entry.seatId === joined.seatId)!;
    expect(player.character.followers?.filter((follower) => follower.id === "fandiablos")).toHaveLength(1);
    expect(player.character.salvage).toBe(salvage);
  });

  it("projects MASTER ALPHA only to Joel and rejects forged selection", () => {
    const server = new GameRoomServer(createInitialSessionState("named-joel", "multiplayer"));
    const joel = server.joinSeat("JOEL");
    const other = server.joinSeat("Joel2");
    const joelPhone = createPhoneProjection(server.getState(), joel.seatId) as unknown as PhonePatchPayload;
    const otherPhone = createPhoneProjection(server.getState(), other.seatId) as unknown as PhonePatchPayload;

    expect(joelPhone.characterOptions?.find((option) => option.character.id === "char_master_alpha")).toMatchObject({ eligible: true, developerQa: true });
    expect(otherPhone.characterOptions?.some((option) => option.character.id === "char_master_alpha")).toBe(false);
    expect(() => server.selectSeatCharacter(other.seatId, "char_master_alpha")).toThrow(/restricted to developer testing/i);
    expect(() => server.selectSeatCharacter(joel.seatId, "char_master_alpha")).not.toThrow();
  });

  it("adds CW opposition once without changing the enemy card or reward", () => {
    const enemy = [...loadThreatCards().values()].find((card): card is Extract<ThreatCard, { cardType: "enemy" }> => card.cardType === "enemy")!;
    const resolve = (name: string) => {
      const server = new GameRoomServer(createInitialSessionState(`named-${name.toLowerCase()}-combat`, "single-player"), [], createSequenceRandomSource([0, 0, 0, 0]));
      const joined = server.joinSeat(name);
      server.selectSeatCharacter(joined.seatId, "char_deepdale");
      const state = server.getState();
      state.status = "active";
      state.phase = "action";
      state.turnOrder = [joined.seatId];
      state.activeSeatIndex = 0;
      state.currentEncounter = enemy;
      (server as unknown as { resolveOpposedCombat: (seatId: string, stat: "grit", encounter: typeof enemy, enemyRollerSeatId: null) => void })
        .resolveOpposedCombat(joined.seatId, "grit", enemy, null);
      const action = [...server.getState().eventLog].reverse().find((entry) => (entry as { type?: string }).type === "COMBAT_RESOLVED") as Extract<GameAction, { type: "COMBAT_RESOLVED" }>;
      const projection = createPhoneProjection(server.getState(), joined.seatId) as { battlePresentation?: { opponent?: { modifiers?: Array<{ label: string; value: number }> } } };
      return { action, projection };
    };
    const baseline = resolve("Lane");
    const cw = resolve("CW");
    expect(cw.action.enemyBonus).toBe(baseline.action.enemyBonus + 1);
    expect(cw.action.enemyTotal).toBe(baseline.action.enemyTotal + 1);
    expect(cw.action.effect).toEqual(baseline.action.effect);
    expect(cw.projection.battlePresentation?.opponent?.modifiers).toContainEqual({ label: "Marked adversary", value: 1, kind: "named-rule" });
  });

  it("applies CW only to explicitly enemy-tagged fixed opposition", () => {
    const hazard = [...loadThreatCards().values()].find((card): card is Extract<ThreatCard, { cardType: "hazard" }> => card.cardType === "hazard")!;
    const resolve = (sourceTags: string[]) => {
      const server = new GameRoomServer(createInitialSessionState(`named-cw-fixed-${sourceTags.join("-") || "environment"}`, "single-player"), [], createSequenceRandomSource([0, 0]));
      const joined = server.joinSeat("CW");
      server.selectSeatCharacter(joined.seatId, "char_deepdale");
      const state = server.getState();
      state.status = "active";
      state.phase = "action";
      state.turnOrder = [joined.seatId];
      state.activeSeatIndex = 0;
      state.currentEncounter = hazard;
      state.pendingTileChallenge = {
        id: `fixed:${sourceTags.join("-")}`,
        challengeId: "fixed-opposition",
        sectorId: state.players[0]!.character.currentSpaceId,
        seatId: joined.seatId,
        challengeType: "hazard",
        testStat: hazard.stat,
        difficulty: hazard.difficulty,
        sourceTags,
        authoredOrder: 0,
        totalChallenges: 1,
        rolled: false,
        modifierSources: [],
        successEffect: hazard.successEffect ?? { type: "gain_note", text: "Resolved." },
        failureEffect: hazard.failEffect,
        createdAt: "2026-07-22T00:00:00.000Z"
      };
      server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: joined.seatId, stat: hazard.stat });
      return [...server.getState().eventLog].reverse().find((entry) => (entry as { type?: string }).type === "CHECK_ROLLED") as Extract<GameAction, { type: "CHECK_ROLLED" }>;
    };
    const environmental = resolve(["hazard"]);
    const enemyFacing = resolve(["hazard", "enemy"]);
    expect(enemyFacing.difficulty).toBe(environmental.difficulty + 1);
    expect(enemyFacing.oppositionModifierSources).toEqual([{ label: "Marked adversary", value: 1 }]);
    expect(environmental.oppositionModifierSources).toEqual([]);
  });
});
