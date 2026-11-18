import { describe, expect, it } from "vitest";
import type { PhonePatchPayload } from "../../client/shared/types.js";
import { loadGear } from "../../game/content/gear.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { getEquippedGearModifierSources } from "../../game/engine/gear.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import { chooseAiRivalIntent } from "../aiRival.js";
import { createPhoneProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function fixture(id: string, wounds = 1, salvage = 2) {
  const state = createInitialSessionState("item-review", "multiplayer", "scenario_throne_of_ash", "rivalry", "standard", 2);
  state.status = "active";
  state.phase = "action";
  state.turnOrder = ["seat-1", "seat-2"];
  state.activeSeatIndex = 0;
  state.seats.forEach((seat) => { seat.connected = true; seat.displayName = seat.seatId; });
  const item = { ...loadGear().get(id)!, instanceId: `${id}:owned` };
  const character = state.players[0]!.character;
  character.heldGear = [item];
  character.equippedGear = { weapon: null, armor: null, utility: null, [item.slot]: id };
  character.equippedGearInstances = { weapon: null, armor: null, utility: null, [item.slot]: item.instanceId };
  character.wounds = wounds;
  character.salvage = salvage;
  return { state, item, character };
}

function observation(state: ReturnType<typeof fixture>["state"]) {
  return createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;
}

function battleFixture(id: string, grit = 3) {
  const result = fixture(id, 0);
  result.state.currentEncounter = loadThreatCards().get("ash-lane-cutters")!;
  result.character.stats.grit = grit;
  result.state.activeResolution = { id: "item-battle", playerId: "seat-1", source: "threat", stage: "battle_setup" };
  return result;
}

function failedHazardFixture(id: string) {
  const result = fixture(id);
  const { state } = result;
  const card = loadThreatCards().get("glass-chime-swarm")!;
  if (card.cardType !== "hazard") throw new Error("Expected hazard");
  state.phase = "resolution";
  state.currentEncounter = card;
  state.pendingEffect = card.failEffect;
  state.pendingFailureReaction = { id: "item-failure", seatId: "seat-1", testType: "hazard",
    sourceId: card.id, createdAt: "2026-11-17T12:00:00.000Z" };
  state.activeResolution = { id: "item-failed-test", playerId: "seat-1", source: "threat", stage: "roll_result",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: card.difficulty, success: false } };
  state.lastOutcomeSummary = { seatId: "seat-1", movedToSectorId: state.players[0]!.sectorId,
    encounterCardId: card.id, encounterTitle: card.title, encounterCardType: "hazard", checkStat: card.stat,
    die1: 1, die2: 1, statBonus: 0, checkTotal: 2, difficulty: card.difficulty, success: false, summary: "Failed test" };
  return result;
}

function dispatch(server: GameRoomServer, intent: ClientIntent) {
  const messages: Array<{ type: string; reason?: string }> = [];
  const client: ConnectedClient = { seatId: "seat-1", view: "phone", socket: {
    send: (message: string) => messages.push(JSON.parse(message)), close() {}
  } as unknown as ConnectedClient["socket"] };
  server.handleIntent(client, intent);
  return messages.filter((message) => message.type === "INTENT_REJECTED");
}

describe("item function review", () => {
  it.each(["cinder-stim-ampoule", "voidsalt-poultice", "artifact-void-salt-poultice"])("%s heals once without granting a passive bonus", (id) => {
    const { state, item, character } = fixture(id, 2);
    expect(getEquippedGearModifierSources(character, item.statBonus.stat, { mode: "battle" })).toEqual([]);
    const server = new GameRoomServer(state);
    const intent: ClientIntent = { type: "USE_GEAR", seatId: "seat-1", gearId: id, instanceId: item.instanceId };
    expect(dispatch(server, intent)).toEqual([]);
    expect(server.getState().players[0]!.character.wounds).toBe(1);
    expect(server.getState().players[0]!.character.heldGear).toEqual([]);
    expect(dispatch(server, intent)).toHaveLength(1);
    expect(server.getState().players[0]!.character.wounds).toBe(1);
  });

  it.each(["cinder-stim-ampoule", "voidsalt-poultice", "artifact-void-salt-poultice"])("%s cannot be wasted at full health", (id) => {
    const { state, item } = fixture(id, 0);
    expect(observation(state).objectUseStates?.find((entry) => entry.id === id)?.disabledReason).toMatch(/no wounds/i);
    const server = new GameRoomServer(state);
    expect(dispatch(server, { type: "USE_GEAR", seatId: "seat-1", gearId: id, instanceId: item.instanceId })).toHaveLength(1);
    expect(server.getState().players[0]!.character.heldGear).toHaveLength(1);
  });

  it("projects the Warbell's Salvage cost before allowing activation", () => {
    const { state } = fixture("red-march-warbell", 0, 0);
    state.currentEncounter = loadThreatCards().get("ash-lane-cutters")!;
    const use = observation(state).objectUseStates?.find((entry) => entry.id === "red-march-warbell");
    expect(use?.disabledReason).toMatch(/1 Salvage/i);
    expect(use?.usableForCurrentTest).toBe(false);
  });

  it.each(["cinder-stim-ampoule", "voidsalt-poultice", "artifact-void-salt-poultice"])("bots use %s through the ordinary server intent", (id) => {
    const { state, item } = fixture(id, 2);
    const choice = chooseAiRivalIntent(observation(state), "seat-1");
    expect(choice?.intent).toEqual({ type: "USE_GEAR", seatId: "seat-1", gearId: id, instanceId: item.instanceId });
    const server = new GameRoomServer(state);
    expect(dispatch(server, choice!.intent)).toEqual([]);
    expect(server.getState().players[0]!.character.wounds).toBe(1);
  });

  it.each(["cinder-stim-ampoule", "voidsalt-poultice"])("%s is blocked outside its action window", (id) => {
    const { state, item } = fixture(id);
    state.phase = "navigation";
    expect(observation(state).objectUseStates?.[0]?.disabledReason).toMatch(/action window/i);
    const server = new GameRoomServer(state);
    expect(dispatch(server, { type: "USE_GEAR", seatId: "seat-1", gearId: id, instanceId: item.instanceId })).toHaveLength(1);
    expect(server.getState().players[0]!.character.heldGear).toHaveLength(1);
    expect(server.getState().players[0]!.character.wounds).toBe(1);
  });

  it("bots activate the Warbell once, pay its cost, and keep its boost in the roll formula", () => {
    const { state, item } = battleFixture("red-march-warbell");
    const choice = chooseAiRivalIntent(observation(state), "seat-1");
    expect(choice?.intent).toMatchObject({ type: "USE_GEAR", gearId: item.id, instanceId: item.instanceId });
    const server = new GameRoomServer(state);
    expect(dispatch(server, choice!.intent)).toEqual([]);
    expect(server.getState().players[0]!.character).toMatchObject({ salvage: 1, heldGear: [{ exhausted: true }] });
    const next = observation(server.getState());
    expect(next.objectUseStates?.[0]?.activeModifier).toMatchObject({ value: 2, stat: "grit", mode: "battle" });
    expect(chooseAiRivalIntent(next, "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
  });

  it("bots conserve boosts in easy battles and cannot spend unaffordable Salvage", () => {
    const { state, character } = battleFixture("red-march-warbell", 20);
    expect(chooseAiRivalIntent(observation(state), "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
    character.stats.grit = 3;
    character.salvage = 0;
    expect(chooseAiRivalIntent(observation(state), "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
  });

  it("bots use a Fuse with spare pressure but conserve it near collapse", () => {
    const { state, item } = battleFixture("black-route-fuse");
    state.escalationLevel = 2;
    const choice = chooseAiRivalIntent(observation(state), "seat-1");
    expect(choice?.intent).toMatchObject({ type: "USE_GEAR", gearId: item.id });
    const server = new GameRoomServer(state);
    expect(dispatch(server, choice!.intent)).toEqual([]);
    expect(server.getState().players[0]!.character.heldGear).toEqual([]);
    expect(server.getState().escalationLevel).toBe(3);
    state.escalationLevel = 5;
    expect(chooseAiRivalIntent(observation(state), "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
    state.escalationLevel = 3;
    expect(chooseAiRivalIntent(observation(state), "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
    state.escalationLevel = 2;
    state.turnOrder = ["seat-2", "seat-1"];
    state.activeSeatIndex = 1;
    expect(chooseAiRivalIntent(observation(state), "seat-1")?.intent.type).toBe("COMBAT_REQUESTED");
  });

  it.each(["blackstar-ampoule", "artifact-blackstar-ampoule"])("bots use %s to suppress a pending failure without changing the failed result", (id) => {
    const { state, item } = failedHazardFixture(id);
    const choice = chooseAiRivalIntent(observation(state), "seat-1");
    expect(choice?.intent).toMatchObject({ type: "USE_GEAR", gearId: id, instanceId: item.instanceId });
    const server = new GameRoomServer(state);
    expect(dispatch(server, choice!.intent)).toEqual([]);
    expect(server.getState().pendingEffect).toBeNull();
    expect(server.getState().activeResolution?.roll?.success).toBe(false);
    expect(server.getState().players[0]!.character.heldGear).toEqual([]);
    expect(chooseAiRivalIntent(observation(server.getState()), "seat-1")?.intent.type).toBe("CONTINUE_RESOLUTION");
  });

  it("bots can reroll with the Mirror Token and cannot activate an unequipped copy", () => {
    const { state, item, character } = failedHazardFixture("mirror-reroll-token");
    const choice = chooseAiRivalIntent(observation(state), "seat-1");
    expect(choice?.intent).toMatchObject({ type: "USE_GEAR", gearId: item.id, instanceId: item.instanceId });
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));
    expect(dispatch(server, choice!.intent)).toEqual([]);
    // The successful reroll pays one Salvage and earns the hazard's one-Salvage clear reward.
    expect(server.getState().players[0]!.character).toMatchObject({ salvage: 2, heldGear: [{ exhausted: true }] });
    expect(server.getState().eventLog).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "USE_GEAR", gearId: item.id, salvageCost: 1 })
    ]));
    character.equippedGear.utility = null;
    character.equippedGearInstances!.utility = null;
    expect(chooseAiRivalIntent(observation(state), "seat-1")?.intent.type).toBe("CONTINUE_RESOLUTION");
  });

  it("disables Mirror rerolls for committed Edge values without charging or exhausting the item", () => {
    const { state, item } = failedHazardFixture("mirror-reroll-token");
    state.lastEdgeCardPlay = { id: "committed-edge", seatId: "seat-1", cardId: "edge-test", cardName: "Test Edge",
      edgeValue: 4, mode: "commit-value", resolutionId: state.activeResolution!.id,
      publicSummary: "Committed four", createdAt: "2026-11-17T12:00:00.000Z" };
    const patch = observation(state);
    expect(patch.objectUseStates?.[0]?.disabledReason).toMatch(/committed Edge/i);
    expect(patch.objectUseStates?.[0]?.usableForCurrentTest).toBe(false);
    expect(chooseAiRivalIntent(patch, "seat-1")?.intent.type).toBe("CONTINUE_RESOLUTION");
    const server = new GameRoomServer(state);
    expect(dispatch(server, { type: "USE_GEAR", seatId: "seat-1", gearId: item.id, instanceId: item.instanceId })).toHaveLength(1);
    expect(server.getState().players[0]!.character.salvage).toBe(2);
    expect(server.getState().players[0]!.character.heldGear[0]?.exhausted).not.toBe(true);
  });

  it("does not offer Mirror's hazard reroll for a movement-only reaction", () => {
    const { state } = failedHazardFixture("mirror-reroll-token");
    state.pendingFailureReaction!.testType = "movement";
    state.currentEncounter = null;
    expect(observation(state).objectUseStates?.[0]).toMatchObject({ usableForCurrentTest: false,
      disabledReason: expect.stringContaining("failed hazard check") });
    expect(chooseAiRivalIntent(observation(state), "seat-1")?.intent.type).toBe("CONTINUE_RESOLUTION");
  });
});
