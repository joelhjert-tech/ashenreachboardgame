import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { PhonePatchPayload } from "../../client/shared/types.js";
import { chooseAiRivalIntent } from "../aiRival.js";
import { createPhoneProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

describe("encounter outcomes survive incidental escalation", () => {
  it.each(["route-splice", "gateblind-pulse", "memory-tax-gate"])("resolves %s after Glasslung and Cold Brace", (cardId) => {
    const state = createInitialSessionState("scar-outcome-authority", "multiplayer", "scenario_mirror_of_false_heroes", "rivalry", "standard", 2);
    const threat = loadThreatCards().get(cardId)!;
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = threat;
    state.seats[0]!.controllerType = "ai";
    state.seats[0]!.displayName = "Test Rival";
    const player = state.players[0]!;
    player.character.id = "grave-engineer";
    player.character.stats = { command: 1, grit: 1, signal: 1, forge: 1, guile: 1 };
    player.character.scars = ["scar-wound-5"];
    player.character.heldGear = [];
    player.character.equippedGear = { weapon: null, armor: null, utility: null };
    player.sectorId = player.character.currentSpaceId = "black-relay-spire";
    state.activeResolution = { id: `test:${cardId}`, playerId: "seat-1", source: "threat", stage: "battle_setup",
      card: { id: cardId, title: threat.title, type: "hazard" } };
    state.lastOutcomeSummary = { seatId: "seat-1", movedToSectorId: player.sectorId,
      encounterCardId: cardId, encounterTitle: threat.title, encounterCardType: "hazard", checkStat: null,
      die1: null, die2: null, statBonus: null, checkTotal: null, difficulty: null, enemyRollerSeatId: null,
      enemyDie1: null, enemyDie2: null, enemyBonus: null, enemyTotal: null, success: null, summary: "Hazard revealed." };
    const room = new GameRoomServer(state, [], createSequenceRandomSource([0]), undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, { mode: "simulation" });
    const rejected: string[] = [];
    const client: ConnectedClient = { seatId: "seat-1", view: "phone", automated: true,
      onAutomatedRejection: (reason: string) => { rejected.push(reason); },
      socket: { send() {}, close() {} } as unknown as ConnectedClient["socket"] };
    room.handleIntent(client, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: threat.stat });
    expect(rejected).toEqual([]);
    expect(room.getState().activeResolution?.roll?.success).toBe(false);
    expect(room.getState().eventLog).toContainEqual(expect.objectContaining({ type: "ABILITY_TRIGGERED", abilityId: "cold-brace" }));
    expect(room.getState().lastOutcomeSummary).toMatchObject({ encounterCardId: cardId, success: false });
    for (let i = 0; i < 8 && (room.getState().pendingEffect || room.getState().activeResolution); i++) {
      const choice = chooseAiRivalIntent(createPhoneProjection(room.getState(), "seat-1") as unknown as PhonePatchPayload, "seat-1");
      if (!choice) break;
      room.handleIntent(client, choice.intent);
    }
    expect(rejected).toEqual([]);
    expect(room.getState().pendingEffect).toBeNull();
    expect(room.getState().eventLog).toContainEqual(expect.objectContaining({ type: "RESOLUTION_APPLIED", sourceCardId: cardId, success: false }));
  });
});
