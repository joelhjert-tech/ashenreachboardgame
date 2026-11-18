import { describe, expect, it } from "vitest";
import type { PhonePatchPayload } from "../../client/shared/types.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { getSectorTextBlockReason } from "../../game/rules/tileFunctions.js";
import { chooseAiRivalIntent } from "../aiRival.js";
import { createPhoneProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function activeState() {
  const state = createInitialSessionState("throne-balance", "multiplayer", "scenario_throne_of_ash", "rivalry", "standard", 2);
  state.status = "active";
  state.phase = "action";
  state.turnOrder = ["seat-1", "seat-2"];
  state.activeSeatIndex = 0;
  state.seats.forEach((seat) => { seat.connected = true; seat.displayName = seat.seatId; });
  return state;
}

function clearedClaimSector() {
  const state = activeState();
  const sectorId = "red-lantern-trenches";
  state.players[0]!.sectorId = sectorId;
  state.players[0]!.character.currentSpaceId = sectorId;
  state.tileArrivalThreatProgress = { arrivalId: "cleared-arrival", seatId: "seat-1", sectorId,
    threatLanes: ["red", "yellow"], nextThreatIconIndex: 2, allThreatsSuccessful: true,
    resolvedThreatOutcomes: [
      { ruleId: "threat:0:red", cardId: "first", lane: "red", success: true },
      { ruleId: "threat:1:yellow", cardId: "second", lane: "yellow", success: true }
    ] };
  return state;
}

describe("Throne of Ash playable progress", () => {
  it.each([0, 1])("takes a completed Contract victory before emergency stabilization, active index %i", (activeIndex) => {
    const state = activeState();
    state.activeSeatIndex = activeIndex;
    state.escalationLevel = 5;
    state.scenarioProgress.throneClaims = 5;
    const player = state.players[activeIndex]!;
    player.character.activeContract = { contractId: "contract-beacon", progress: 1 };
    player.character.activeContracts = [player.character.activeContract];
    const patch = createPhoneProjection(state, player.seatId) as unknown as PhonePatchPayload;
    const choice = chooseAiRivalIntent(patch, player.seatId);
    expect(choice?.intent).toEqual({ type: "COMPLETE_CONTRACT", seatId: player.seatId, contractId: "contract-beacon" });
    const server = new GameRoomServer(state);
    const messages: string[] = [];
    server.handleIntent({ seatId: player.seatId, view: "phone", socket: {
      send(message: string) { messages.push(message); }, close() {}
    } as unknown as ConnectedClient["socket"] }, choice!.intent);
    expect(messages.some((message) => message.includes("INTENT_REJECTED"))).toBe(false);
    expect(server.getState()).toMatchObject({ status: "ended", winnerSeatId: player.seatId });
    expect(server.getState().scenarioProgress.throneClaims).toBe(6);
  });

  it.each([
    ["scenario_throne_of_ash", "throneClaims", 4, 1],
    ["scenario_throne_of_ash", "throneClaims", 5, 0],
    ["scenario_devourer_beneath", "mawStrikes", 4, 1]
  ])("still stabilizes when the Contract cannot win: %s, %s %i, Contract %i", (scenarioId, key, marks, progress) => {
    const state = activeState();
    state.activeScenarioId = scenarioId;
    state.scenarioProgress[key] = marks;
    state.escalationLevel = 5;
    state.players[0]!.character.activeContract = { contractId: "contract-beacon", progress };
    state.players[0]!.character.activeContracts = [state.players[0]!.character.activeContract];
    const patch = createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;
    expect(chooseAiRivalIntent(patch, "seat-1")?.intent.type).toBe("STABILIZE_REQUESTED");
  });

  it.each([
    ["ash-lane-cutters", 0, 0],
    ["ash-lane-cutters", 1, 1],
    ["throne-echo-medium", 1, 1]
  ])("awards one claim for qualifying victories without counting the newly won Crown: %s, %i Crowns", (id, crowns, expected) => {
    const state = activeState();
    const enemy = loadThreatCards().get(id)!;
    if (enemy.cardType !== "enemy") throw new Error("Expected enemy");
    state.currentEncounter = enemy;
    state.scenarioProgress = { crownClaims: crowns, "crownClaim:seat-1": crowns };
    state.players[0]!.character.stats[enemy.stat] = 6;
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5, 0, 0]));
    (server as unknown as { resolveOpposedCombat(seatId: string, stat: typeof enemy.stat, encounter: typeof enemy, roller: null): void })
      .resolveOpposedCombat("seat-1", enemy.stat, enemy, null);
    expect(server.getState().scenarioProgress.throneClaims ?? 0).toBe(expected);
    expect(server.getState().scenarioProgress["crownClaim:seat-1"]).toBe(crowns + 1);
    expect(server.getState().status).toBe("active");
  });

  it("lets a rival use the displayed optional claim action after shared-bag threats are cleared", () => {
    const state = clearedClaimSector();
    expect(state.sectors.find((sector) => sector.id === "red-lantern-trenches")!.encounterDecks.threat.length).toBeGreaterThan(0);
    const observation = createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;
    observation.privateRivalry = null;
    expect(observation.requiredAction?.allowedCommand).toBe("finish-actions");
    expect(observation.sectorExplorationSummary?.sectorTextLocked).toBe(false);
    const choice = chooseAiRivalIntent(observation, "seat-1");
    expect(choice?.intent.type).toBe("RESOLVE_SPACE_TEXT");
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));
    server.resolveSpaceTextIntent({ type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    expect(server.getState().scenarioProgress.throneClaims).toBe(1);
  });

  it("blocks unfinished, persistent, and another seat's arrivals without applying the stricter shop rule", () => {
    const state = clearedClaimSector();
    const locked = () => expect(getSectorTextBlockReason(state, "seat-1", "red-lantern-trenches")).not.toBeNull();
    state.tileArrivalThreatProgress!.allThreatsSuccessful = false;
    expect(getSectorTextBlockReason(state, "seat-1", "red-lantern-trenches")).toBeNull();
    state.tileArrivalThreatProgress!.allThreatsSuccessful = true;
    state.tileArrivalThreatProgress!.nextThreatIconIndex = 1;
    locked();
    state.tileArrivalThreatProgress!.nextThreatIconIndex = 2;
    const sector = state.sectors.find((entry) => entry.id === "red-lantern-trenches")!;
    sector.persistentThreatIds = ["ledger-mold-bloom"];
    locked();
    sector.persistentThreatIds = [];
    state.tileArrivalThreatProgress!.seatId = "seat-2";
    locked();
  });
});
