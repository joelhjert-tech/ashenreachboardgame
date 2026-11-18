import { describe, expect, it } from "vitest";
import type { PhonePatchPayload } from "../../client/shared/types.js";
import { loadCharacters } from "../../game/content/characters.js";
import { loadFollowers } from "../../game/content/followers.js";
import { loadGear } from "../../game/content/gear.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { EncounterEffect } from "../../game/schema/card.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { chooseAiRivalIntent } from "../aiRival.js";
import { createPhoneProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function stateWith(followerId?: string, characterId = "void-marshal") {
  const state = createInitialSessionState("follower-review", "multiplayer", "scenario_throne_of_ash", "rivalry", "standard", 2);
  state.status = "active";
  state.phase = "action";
  state.turnOrder = ["seat-1", "seat-2"];
  state.activeSeatIndex = 0;
  state.seats.forEach((seat) => { seat.connected = true; seat.displayName = seat.seatId; });
  const player = state.players[0]!;
  player.character = { ...loadCharacters().get(characterId)!, heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null }, salvage: 4,
    followers: followerId ? [{ ...loadFollowers().get(followerId)!, instanceId: `${followerId}:owned` }] : [] };
  player.sectorId = player.character.currentSpaceId;
  return state;
}

function serverFor(state: GameState, dice = [0, 0, 5, 5]) {
  return new GameRoomServer(state, [], createSequenceRandomSource(dice), undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, { mode: "simulation" });
}

function patch(state: GameState) { return createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload; }

function send(server: GameRoomServer, intent: ClientIntent, seatId = "seat-1") {
  const messages: Array<{ type: string; reason?: string }> = [];
  server.handleIntent({ seatId, view: "phone", socket: {
    send: (message: string) => messages.push(JSON.parse(message)), close() {}
  } as unknown as ConnectedClient["socket"] }, intent);
  return messages.filter((message) => message.type === "INTENT_REJECTED");
}

function prepareHazard(state: GameState, effect?: EncounterEffect) {
  const source = loadThreatCards().get("glass-chime-swarm")!;
  if (source.cardType !== "hazard") throw new Error("Expected hazard");
  state.currentEncounter = { ...source, ...(effect ? { failEffect: effect } : {}) };
  state.activeResolution = { id: "follower-hazard", playerId: "seat-1", source: "threat", stage: "battle_setup",
    card: { id: source.id, title: source.title, type: "hazard" },
    battle: { stat: source.stat, difficulty: source.difficulty, modifiers: [] } };
  state.lastOutcomeSummary = { seatId: "seat-1", movedToSectorId: state.players[0]!.sectorId,
    encounterCardId: source.id, encounterTitle: source.title, encounterCardType: "hazard", checkStat: source.stat,
    die1: null, die2: null, statBonus: null, checkTotal: null, difficulty: source.difficulty, success: null, summary: "Hazard revealed" };
}

function failHazard(state: GameState, effect: EncounterEffect) {
  prepareHazard(state, effect);
  const server = serverFor(state);
  expect(send(server, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" })).toEqual([]);
  expect(server.getState().activeResolution?.roll?.success).toBe(false);
  return server;
}

describe("character and follower function review", () => {
  it("Quartermaster prevents one Salvage loss and preserves unrelated consequences", () => {
    const server = failHazard(stateWith("burnt-road-quartermaster"), { type: "sequence", effects: [
      { type: "lose_salvage", amount: 3 }, { type: "take_wound", amount: 1 }
    ] });
    expect(send(server, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "burnt-road-quartermaster" })).toEqual([]);
    expect(server.getState().pendingEffect).toEqual({ type: "sequence", effects: [
      { type: "lose_salvage", amount: 2 }, { type: "take_wound", amount: 1 }
    ] });
    expect(server.getState().activeResolution?.roll?.success).toBe(false);
    expect(server.getState().lastOutcomeSummary?.success).toBe(false);
    expect(send(server, { type: "CONTINUE_RESOLUTION", seatId: "seat-1" })).toEqual([]);
    expect(server.getState().players[0]!.character).toMatchObject({ salvage: 2, wounds: 1 });
  });

  it("Ash Porter prevents only one suppression inside a compound failure", () => {
    const server = failHazard(stateWith("ash-porter"), { type: "sequence", effects: [
      { type: "equipment_suppression", sourceCardId: "relay-husk", mode: "throughNextThreat" },
      { type: "take_wound", amount: 1 }
    ] });
    expect(send(server, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "ash-porter" })).toEqual([]);
    expect(server.getState().pendingEffect).toEqual({ type: "sequence", effects: [{ type: "take_wound", amount: 1 }] });
  });

  it("Votive Gunner opens a real battle reaction and prevents exactly one Wound", () => {
    const state = stateWith("votive-gunner");
    const enemy = loadThreatCards().get("ash-lane-cutters")!;
    if (enemy.cardType !== "enemy") throw new Error("Expected enemy");
    state.currentEncounter = { ...enemy, woundOnLoss: { type: "sequence", effects: [
      { type: "take_wound", amount: 2 }, { type: "lose_salvage", amount: 1 }
    ] } };
    state.activeResolution = { id: "follower-battle", playerId: "seat-1", source: "threat", stage: "battle_setup",
      card: { id: enemy.id, title: enemy.title, type: "enemy" },
      battle: { stat: "grit", difficulty: enemy.difficulty, modifiers: [] } };
    state.players[0]!.character.stats.grit = 0;
    state.players[0]!.character.heldGear = [loadGear().get("artifact-blackstar-ampoule")!];
    const server = serverFor(state);
    expect(send(server, { type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "grit" })).toEqual([]);
    const roller = server.getState().pendingEnemyRoll?.assignedRollerSeatId;
    if (roller) expect(send(server, { type: "ENEMY_ROLL_REQUESTED", seatId: roller }, roller)).toEqual([]);
    expect({ pending: server.getState().pendingFailureReaction, roll: server.getState().activeResolution?.roll,
      phase: server.getState().phase, effect: server.getState().pendingEffect }).toMatchObject({
      pending: { testType: "battle" }, roll: { success: false }
    });
    expect(patch(server.getState()).objectUseStates?.find((entry) => entry.id === "votive-gunner")?.disabledReason).toBeNull();
    expect(patch(server.getState()).objectUseStates?.find((entry) => entry.id === "artifact-blackstar-ampoule")?.disabledReason).toMatch(/not battles/i);
    const reconnect = serverFor(JSON.parse(JSON.stringify(server.getState())) as GameState);
    const choice = chooseAiRivalIntent(patch(reconnect.getState()), "seat-1");
    expect(choice?.intent).toEqual({ type: "USE_FOLLOWER", seatId: "seat-1", followerId: "votive-gunner" });
    expect(send(reconnect, choice!.intent)).toEqual([]);
    expect(reconnect.getState().pendingEffect).toEqual({ type: "sequence", effects: [
      { type: "take_wound", amount: 1 }, { type: "lose_salvage", amount: 1 }
    ] });
    expect(reconnect.getState().players[0]!.character.followers).toEqual([]);
    expect(send(reconnect, { type: "CONTINUE_RESOLUTION", seatId: "seat-1" })).toEqual([]);
    expect(reconnect.getState().players[0]!.character).toMatchObject({ wounds: 1, salvage: 3 });
  });

  it("Votive Gunner cannot cancel hazard consequences", () => {
    const server = failHazard(stateWith("votive-gunner"), { type: "take_wound", amount: 1 });
    expect(patch(server.getState()).objectUseStates?.[0]?.disabledReason).toMatch(/failed battle/i);
    expect(send(server, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "votive-gunner" })).toHaveLength(1);
    expect(server.getState().players[0]!.character.followers).toHaveLength(1);
  });

  it("Cinder Surgeon cannot be wasted at full health and bots heal through its normal intent", () => {
    const state = stateWith("cinder-surgeon");
    const healthy = serverFor(state);
    expect(patch(healthy.getState()).objectUseStates?.[0]?.disabledReason).toMatch(/no Wounds/i);
    expect(send(healthy, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "cinder-surgeon" })).toHaveLength(1);
    const wounded = serverFor({ ...state, players: state.players.map((player, index) => index ? player
      : { ...player, character: { ...player.character, wounds: 2 } }) });
    const choice = chooseAiRivalIntent(patch(wounded.getState()), "seat-1");
    expect(choice?.intent).toEqual({ type: "USE_FOLLOWER", seatId: "seat-1", followerId: "cinder-surgeon" });
    expect(send(wounded, choice!.intent)).toEqual([]);
    expect(wounded.getState().players[0]!.character.wounds).toBe(1);
    expect(wounded.getState().players[0]!.character.followers).toEqual([]);
  });

  it("Choir Defector cannot spend its use without an eligible unrolled test", () => {
    const state = stateWith("choir-defector");
    const idle = serverFor(state);
    expect(patch(idle.getState()).objectUseStates?.[0]?.disabledReason).toMatch(/before rolling/i);
    expect(send(idle, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "choir-defector" })).toHaveLength(1);
    prepareHazard(state);
    const server = serverFor(state);
    expect(send(server, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "choir-defector" })).toEqual([]);
    expect(patch(server.getState()).objectUseStates?.[0]?.activeModifier).toMatchObject({ value: 1, stat: "signal", mode: "check" });
    expect(send(server, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" })).toEqual([]);
    expect(server.getState().activeResolution?.roll?.modifierTotal).toBe(3);
    expect(send(server, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "choir-defector" })).toHaveLength(1);
  });

  it.each(["grave-engineer", "salvage-warden"])("%s can actually reuse gear readied by Stabilize", (id) => {
    const state = stateWith(undefined, id);
    const gear = { ...loadGear().get("red-march-warbell")!, instanceId: "warbell:owned" };
    state.players[0]!.character.heldGear = [gear];
    state.players[0]!.character.equippedGear.weapon = gear.id;
    state.players[0]!.character.equippedGearInstances = { weapon: gear.instanceId, armor: null, utility: null };
    state.currentEncounter = loadThreatCards().get("ash-lane-cutters")!;
    const server = serverFor(state);
    const use: ClientIntent = { type: "USE_GEAR", seatId: "seat-1", gearId: gear.id, instanceId: gear.instanceId };
    expect(send(server, use)).toEqual([]);
    // Finish that encounter; no round boundary occurs before the ability readies the item.
    server.getState().currentEncounter = null;
    server.getState().activeResolution = null;
    server.getState().escalationLevel = 2;
    expect(send(server, { type: "STABILIZE_REQUESTED", seatId: "seat-1" })).toEqual([]);
    expect(server.getState().players[0]!.character.heldGear[0]?.exhausted).toBe(false);
    const restoredState = JSON.parse(JSON.stringify(server.getState())) as GameState;
    restoredState.phase = "action";
    restoredState.activeSeatIndex = 0;
    restoredState.activeResolution = null;
    restoredState.currentEncounter = loadThreatCards().get("ash-lane-cutters")!;
    const restored = serverFor(restoredState);
    expect(patch(restored.getState()).objectUseStates?.find((entry) => entry.id === gear.id)?.disabledReason).toBeNull();
    expect(send(restored, use)).toEqual([]);
    expect(send(restored, use)).toHaveLength(1);
    expect(restored.getState().players[0]!.character.salvage).toBe(2);
  });

  it("Cinder Wattle bots use their projected ability once before rolling", () => {
    const state = stateWith(undefined, "cinder-wattle");
    prepareHazard(state);
    const server = serverFor(state);
    const choice = chooseAiRivalIntent(patch(server.getState()), "seat-1");
    expect(choice?.intent).toEqual({ type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });
    expect(send(server, choice!.intent)).toEqual([]);
    expect(chooseAiRivalIntent(patch(server.getState()), "seat-1")?.intent.type).toBe("CHECK_REQUESTED");
  });

  it("Old Oaths survives an unrelated Signal roll, then expires after the Command check", () => {
    const state = stateWith(undefined, "fleet-elder");
    prepareHazard(state);
    state.eventLog.push({ type: "ABILITY_TRIGGERED", seatId: "seat-1", abilityId: "old-oaths",
      rollModifier: { label: "Old Oaths", stat: "command", mode: "check", value: 1 }, createdAt: "2026-11-17T12:00:00.000Z" });
    const server = serverFor(state);
    expect(send(server, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" })).toEqual([]);
    const readModifiers = () => (server as unknown as {
      getPendingRollModifierSources(seat: string, stat: string, mode: string): Array<{ label: string; value: number }>
    }).getPendingRollModifierSources("seat-1", "command", "check");
    expect(readModifiers()).toEqual([{ label: "Old Oaths", value: 1 }]);
    const next = server.getState();
    next.phase = "action";
    next.pendingEffect = null;
    next.pendingFailureReaction = null;
    prepareHazard(next);
    next.currentEncounter = { ...next.currentEncounter!, stat: "command" };
    next.activeResolution!.battle!.stat = "command";
    expect(send(server, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "command" })).toEqual([]);
    expect(server.getState().activeResolution?.roll?.modifierTotal).toBe(6);
    expect(readModifiers()).toEqual([]);
  });

  it.each(["dice_roll", "roll_result"] as const)("Cinder Wattle is unavailable during cooperative %s", (stage) => {
    const state = stateWith(undefined, "cinder-wattle");
    prepareHazard(state);
    state.activeResolution!.stage = stage;
    state.pendingCooperativeTest = { id: "pending-test", activeSeatId: "seat-1", sourceKind: "boardSpace",
      sourceId: "signal-test", sourceTitle: "Signal test", stat: "signal", difficulty: 9,
      requiresHelper: false, createdAt: "2026-11-17T12:00:00.000Z" };
    const server = serverFor(state);
    const projection = patch(state);
    expect(projection.characterAbilityAction?.available).toBe(false);
    expect(projection.characterAbilityAction?.disabledReason).toMatch(/before dice/i);
    expect(chooseAiRivalIntent(projection, "seat-1")?.intent.type).not.toBe("USE_CHARACTER_ABILITY");
    expect(send(server, { type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" })).toHaveLength(1);
  });

  it("an assisted Concordance Command test consumes Old Oaths once", () => {
    const state = stateWith(undefined, "fleet-elder");
    state.interactionMode = "co-op";
    state.activeScenarioId = "scenario_broken_concordance";
    state.seats.forEach((seat) => { seat.characterSelected = true; });
    state.players[0]!.sectorId = "middle_webglass_breach";
    state.players[0]!.character.currentSpaceId = "middle_webglass_breach";
    state.eventLog.push({ type: "ABILITY_TRIGGERED", seatId: "seat-1", abilityId: "old-oaths",
      rollModifier: { label: "Old Oaths", stat: "command", mode: "check", value: 1 }, createdAt: "2026-11-17T12:00:00.000Z" });
    const server = serverFor(state, [5, 5]);
    expect(send(server, { type: "BROKEN_CONCORDANCE_NODE_REQUESTED", seatId: "seat-1", nodeId: "concordance-node-webglass" })).toEqual([]);
    const test = server.getState().pendingCooperativeTest!;
    expect(send(server, { type: "COOPERATIVE_ASSISTANCE_REQUESTED", seatId: "seat-1", sourceId: test.sourceId,
      stat: test.stat, helperSeatIds: ["seat-2"] })).toEqual([]);
    const requestId = server.getState().cooperativeAssistance!.id;
    expect(send(server, { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId, accept: true }, "seat-2")).toEqual([]);
    expect(send(server, { type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId: "seat-1", requestId })).toEqual([]);
    expect(send(server, { type: "COOPERATIVE_TEST_ROLL_REQUESTED", seatId: "seat-1", testId: test.id })).toEqual([]);
    expect(server.getState().activeResolution?.battle?.modifiers).toContainEqual({ label: "Old Oaths", value: 1 });
    expect((server as unknown as {
      getPendingRollModifierSources(seat: string, stat: string, mode: string): unknown[]
    }).getPendingRollModifierSources("seat-1", "command", "check")).toEqual([]);
  });

  it.each([false, true])("Ashwake Step checks real persistent blockers (blocked: %s), not the legacy deck", (blocked) => {
    const state = stateWith();
    const sector = state.sectors.find((entry) => entry.id === state.players[0]!.sectorId)!;
    expect(sector.encounterDecks.threat.length).toBeGreaterThan(0);
    sector.persistentThreatIds = blocked ? ["ash-lane-cutters"] : [];
    const server = serverFor(state);
    (server as unknown as { maybeTriggerAbilityOnTurnStarted(seatId: string): void }).maybeTriggerAbilityOnTurnStarted("seat-1");
    const triggers = server.getState().eventLog.filter((entry) => (entry as { abilityId?: string }).abilityId === "ashwake-step");
    expect(triggers).toHaveLength(blocked ? 0 : 1);
  });

  it("Fandiablos's escalated bonus expires after exactly two battles", () => {
    const state = stateWith("fandiablos");
    const enemy = loadThreatCards().get("ash-lane-cutters")!;
    state.currentEncounter = enemy;
    state.activeResolution = { id: "dogs-battle-0", playerId: "seat-1", source: "threat", stage: "battle_setup",
      card: { id: enemy.id, title: enemy.title, type: "enemy" }, battle: { stat: "grit", difficulty: enemy.difficulty, modifiers: [] } };
    const server = serverFor(state, [5, 5, 5, 0, 0, 5, 5, 0, 0, 5, 5, 0, 0]);
    expect(send(server, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "fandiablos", escalate: true })).toEqual([]);
    expect(server.getState().players[0]!.character.temporaryAllStatBoost?.remainingEligibleResolutions).toBe(2);
    for (let index = 0; index < 3; index++) {
      const next = server.getState();
      next.phase = "action";
      next.pendingEffect = null;
      next.pendingFailureReaction = null;
      next.currentEncounter = enemy;
      next.activeResolution = { ...state.activeResolution!, id: `dogs-battle-${index}` };
      expect(send(server, { type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "grit" })).toEqual([]);
      const event = [...server.getState().eventLog].reverse().find((entry) => (entry as { type?: string }).type === "COMBAT_RESOLVED") as
        { modifierSources: Array<{ label: string; value: number }> };
      expect(event.modifierSources.filter((source) => source.label === "Too Many Dogs")).toHaveLength(index < 2 ? 1 : 0);
      expect(server.getState().players[0]!.character.temporaryAllStatBoost?.remainingEligibleResolutions).toBe(index === 0 ? 1 : undefined);
    }
  });

  it("movement and a reroll do not spend additional Fandiablos boost uses", () => {
    const moving = stateWith();
    moving.phase = "navigation";
    moving.players[0]!.character.temporaryAllStatBoost = { value: 2, remainingEligibleResolutions: 2 };
    const mover = serverFor(moving);
    expect(send(mover, { type: "MOVEMENT_ROLL_REQUESTED", seatId: "seat-1" })).toEqual([]);
    const planner = patch(mover.getState()).movementPlanner!;
    const target = planner.destinations.find((destination) => !destination.disabledReason)!;
    expect(send(mover, { type: "MOVE_REQUESTED", seatId: "seat-1", toSectorId: target.sectorId,
      routeId: target.defaultRouteId ?? target.routeId, movementRevision: planner.movementRevision })).toEqual([]);
    expect(mover.getState().players[0]!.character.temporaryAllStatBoost?.remainingEligibleResolutions).toBe(2);

    const state = stateWith();
    const mirror = { ...loadGear().get("mirror-reroll-token")!, instanceId: "mirror:owned" };
    state.players[0]!.character.heldGear = [mirror];
    state.players[0]!.character.equippedGear.utility = mirror.id;
    state.players[0]!.character.stats.signal = 0;
    state.players[0]!.character.temporaryAllStatBoost = { value: 2, remainingEligibleResolutions: 2 };
    const server = failHazard(state, { type: "take_wound", amount: 1 });
    expect(server.getState().players[0]!.character.temporaryAllStatBoost?.remainingEligibleResolutions).toBe(1);
    expect(send(server, { type: "USE_GEAR", seatId: "seat-1", gearId: mirror.id, instanceId: mirror.instanceId })).toEqual([]);
    expect(server.getState().players[0]!.character.temporaryAllStatBoost?.remainingEligibleResolutions).toBe(1);
  });

  it("Fandiablos cannot charge a Wound for a mismatched or already rolled test", () => {
    const state = stateWith("fandiablos");
    prepareHazard(state);
    const server = serverFor(state);
    expect(send(server, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "fandiablos" })).toHaveLength(1);
    expect(server.getState().players[0]!.character.wounds).toBe(0);
    expect(patch(server.getState()).objectUseStates?.[0]?.disabledReason).toMatch(/Forge\/Guile/i);
    state.currentEncounter = { ...state.currentEncounter!, stat: "forge" };
    state.activeResolution!.battle!.stat = "forge";
    expect(patch(state).objectUseStates?.[0]?.disabledReason).toBeNull();
    state.players[0]!.character.wounds = 2;
    expect(patch(state).objectUseStates?.[0]?.disabledReason).toMatch(/capacity/i);
  });
});
