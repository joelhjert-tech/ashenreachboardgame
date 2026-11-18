import { describe, expect, it } from "vitest";
import type { PhonePatchPayload } from "../../client/shared/types.js";
import { loadCharacters } from "../../game/content/characters.js";
import { loadFollowers } from "../../game/content/followers.js";
import { loadGear } from "../../game/content/gear.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import type { ClientIntent, EncounterDrawnAction, CombatResolvedAction } from "../../game/engine/actions.js";
import type { EncounterEffect, ThreatCard } from "../../game/schema/card.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { createPhoneProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

const catalog = loadThreatCards();
const initial = createInitialSessionState("threat-review", "single-player", "scenario_throne_of_ash");

function stateFor(cardId: string): GameState {
  const state = structuredClone(initial);
  state.status = "active";
  state.phase = "action";
  state.turnOrder = ["seat-1"];
  state.activeSeatIndex = 0;
  state.seats[0]!.connected = true;
  state.players[0]!.character = { ...loadCharacters().get("void-marshal")!, heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null }, salvage: 4, scars: [] };
  state.players[0]!.sectorId = state.players[0]!.character.currentSpaceId;
  state.players[0]!.private.hand = [];
  const card = structuredClone(catalog.get(cardId)!);
  state.currentEncounter = card;
  state.activeResolution = { id: `review:${card.id}`, playerId: "seat-1", source: "threat", stage: "battle_setup",
    card: { id: card.id, title: card.title, type: card.cardType },
    battle: { stat: card.stat, difficulty: card.difficulty, modifiers: [] } };
  state.lastOutcomeSummary = { seatId: "seat-1", movedToSectorId: state.players[0]!.sectorId,
    encounterCardId: card.id, encounterTitle: card.title, encounterCardType: card.cardType, checkStat: card.stat,
    die1: null, die2: null, statBonus: null, checkTotal: null, difficulty: card.difficulty, success: null, summary: "Threat revealed" };
  return state;
}

function serverFor(state: GameState, dice = [0, 0, 5, 5]) {
  return new GameRoomServer(state, [], createSequenceRandomSource(dice), undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, { mode: "simulation" });
}

function send(server: GameRoomServer, intent: ClientIntent) {
  const rejected: unknown[] = [];
  server.handleIntent({ seatId: "seat-1", view: "phone", socket: {
    send(message: string) { const parsed = JSON.parse(message); if (parsed.type === "INTENT_REJECTED") rejected.push(parsed); }, close() {}
  } as unknown as ConnectedClient["socket"] }, intent);
  return rejected;
}

function battle(server: GameRoomServer) {
  const card = server.getState().currentEncounter!;
  expect(send(server, { type: "COMBAT_REQUESTED", seatId: "seat-1", stat: card.stat })).toEqual([]);
  return [...server.getState().eventLog].reverse().find((event) => (event as { type?: string }).type === "COMBAT_RESOLVED") as CombatResolvedAction;
}

type DrawServer = { createEncounterDrawnAction(seatId: string): EncounterDrawnAction;
  createFandiablosWarningEffect(seatId: string): EncounterEffect };

describe("enemy and hazard review", () => {
  it.each([false, true])("armor-disabling enemies remove the actual bonus without double penalties (nullfield: %s)", (suppressed) => {
    const state = stateFor("iron-synod-chirurgeon");
    const player = state.players[0]!;
    const armor = { ...loadGear().get("ironhide-bracers")!, instanceId: "armor:equipped" };
    player.character.heldGear = [armor];
    player.character.equippedGear.armor = armor.id;
    player.character.equippedGearInstances = { weapon: null, armor: armor.instanceId, utility: null };
    player.character.stats.forge = 5;
    if (suppressed) state.tileArrivalThreatProgress = { arrivalId: "nullfield-visit", seatId: "seat-1",
      sectorId: player.sectorId, threatLanes: ["yellow"], threatRuleIds: ["persistent:latchfog-nullfield:yellow"], nextThreatIconIndex: 1 };
    const result = battle(serverFor(state));
    expect(result.statBonus).toBe(5);
    expect(result.modifierSources?.some((source) => source.label === armor.name)).toBe(false);
    expect(result.modifierSources?.some((source) => source.label === "Threat effect" && source.value < 0)).toBe(false);
  });

  it("weapon suppression uses the exact equipped instance and leaves other slots intact", () => {
    const state = stateFor("signal-rotted-engineer");
    const player = state.players[0]!;
    const weapon = { ...loadGear().get("stormcut-axe")!, instanceId: "axe:equipped", statBonus: { stat: "forge" as const, amount: 3 } };
    const spare = { ...weapon, instanceId: "axe:spare", statBonus: { stat: "forge" as const, amount: 1 } };
    const armor = { ...loadGear().get("ironhide-bracers")!, instanceId: "armor:equipped" };
    player.character.heldGear = [spare, weapon, armor];
    player.character.equippedGear = { weapon: weapon.id, armor: armor.id, utility: null };
    player.character.equippedGearInstances = { weapon: weapon.instanceId, armor: armor.instanceId, utility: null };
    player.character.stats.forge = 5;
    expect(battle(serverFor(state)).statBonus).toBe(6);
  });

  it("a returned hazard cannot replace the next persistent hazard or a printed global draw", () => {
    let state = stateFor("deadwire-repeater");
    state.currentEncounter = null;
    state.activeResolution = null;
    state.phase = "sector";
    const sector = state.sectors.find((entry) => entry.id === state.players[0]!.sectorId)!;
    sector.persistentThreatIds = ["emberlung-vent", "knotrail-cave-in"];
    state.threatDrawBags = { red: { cycle: 1, remainingCardIds: ["ash-rat-skitter"] } };
    state.tileArrivalThreatProgress = { arrivalId: "queue-review", seatId: "seat-1", sectorId: sector.id,
      threatLanes: ["red", "red", "red"], nextThreatIconIndex: 0,
      threatRuleIds: ["persistent:emberlung-vent:red", "persistent:knotrail-cave-in:red", "threat:0:red"] };
    // Both hazards are red; the first one returns after a failed test.
    for (const expectedId of ["emberlung-vent", "knotrail-cave-in", "ash-rat-skitter"]) {
      const server = serverFor(JSON.parse(JSON.stringify(state)) as GameState);
      const drawer = server as unknown as DrawServer;
      expect(drawer.createFandiablosWarningEffect("seat-1")).toMatchObject({ text: expect.stringContaining(catalog.get(expectedId)!.title) });
      const action = drawer.createEncounterDrawnAction("seat-1");
      expect(action.card?.id).toBe(expectedId);
      expect(action.drawSource).toBe(expectedId === "ash-rat-skitter" ? "global-bag" : "persistent");
      state = reduceGameState(server.getState(), action).state;
      state.phase = "sector";
      state.currentEncounter = null;
      state.activeResolution = null;
      const currentSector = state.sectors.find((entry) => entry.id === sector.id)!;
      currentSector.persistentThreatIds = [expectedId, ...(currentSector.persistentThreatIds ?? [])];
    }
    expect(state.threatDrawBags?.red?.remainingCardIds).toEqual([]);
  });

  it("a missing queued persistent card skips its slot without consuming the global bag", () => {
    const state = stateFor("deadwire-repeater");
    state.currentEncounter = null;
    state.activeResolution = null;
    state.phase = "sector";
    state.threatDrawBags = { blue: { cycle: 1, remainingCardIds: ["lantern-moth-swarm"] } };
    state.tileArrivalThreatProgress = { arrivalId: "missing-review", seatId: "seat-1", sectorId: state.players[0]!.sectorId,
      threatLanes: ["blue", "blue"], nextThreatIconIndex: 0,
      threatRuleIds: ["persistent:deadwire-repeater:blue", "threat:0:blue"] };
    const server = serverFor(state);
    const action = (server as unknown as DrawServer).createEncounterDrawnAction("seat-1");
    expect(action.card).toBeNull();
    expect(action.drawSource).toBe("persistent");
    expect(action.tileArrivalThreatProgress?.nextThreatIconIndex).toBe(1);
    expect(server.getState().threatDrawBags?.blue?.remainingCardIds).toEqual(["lantern-moth-swarm"]);
  });

  it.each([false, true])("a hazard reroll preserves spent protection on failure and grants normal rewards on success (%s)", (win) => {
    const state = stateFor("glass-tick-cloud");
    state.players[0]!.character.stats.forge = 0;
    state.players[0]!.character.followers = [loadFollowers().get("burnt-road-quartermaster")!];
    const server = serverFor(state, [0, 0, win ? 5 : 0, win ? 5 : 0]);
    expect(send(server, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "forge" })).toEqual([]);
    expect(send(server, { type: "USE_FOLLOWER", seatId: "seat-1", followerId: "burnt-road-quartermaster" })).toEqual([]);
    expect(server.getState().pendingEffect).toBeNull();
    expect(send(server, { type: "SOLO_REROLL_REQUESTED", seatId: "seat-1" })).toEqual([]);
    expect(server.getState().activeResolution?.roll?.success).toBe(win);
    if (!win) expect(server.getState().pendingEffect).toBeNull();
    else expect(server.getState().pendingEffect).toMatchObject({ type: "sequence", effects: expect.arrayContaining([{ type: "gain_salvage", amount: 1 }]) });
  });

  it.each([
    ["scar-hollow-reflection", "pale-cartel-shakedown", "guile-reroll"],
    ["scar-parasite-crown", "chain-maul-salvager", "one-below-battle-bonus"]
  ])("Scar victory awards the complete enemy reward once: %s", (scarId, cardId, ruleKey) => {
    const state = stateFor(cardId!);
    const player = state.players[0]!;
    const card = state.currentEncounter!;
    player.character.scars = [scarId!];
    player.character.stats[card.stat] = 0;
    player.character.temporaryAllStatBoost = { value: 2, remainingEligibleResolutions: 2 };
    const contract = state.availableContracts.find((entry) => entry.objective.type === "defeatCount" && entry.objective.target > 1)!;
    player.character.activeContract = { contractId: contract.id, progress: 0 };
    player.character.activeContracts = [player.character.activeContract];
    const server = serverFor(state, [0, 0, 0, 0, 5]);
    expect(battle(server).success).toBe(false);
    expect(server.getState().pendingFailureReaction?.testType).toBe("battle");
    expect(server.getState().players[0]!.character.wounds).toBe(0);
    // A save/reconnect must retain the optional correction window.
    const restored = serverFor(JSON.parse(JSON.stringify(server.getState())) as GameState, [5]);
    const projection = createPhoneProjection(restored.getState(), "seat-1") as unknown as PhonePatchPayload;
    const control = projection.scarAdaptationControls!.find((entry) => entry.ruleKey === ruleKey)!;
    expect(control.enabled).toBe(true);
    const intent: ClientIntent = { type: "USE_SCAR_ADAPTATION", seatId: "seat-1", scarId: scarId!,
      activationId: control.activationId, ruleKey: control.ruleKey, ...(ruleKey === "guile-reroll" ? { rollIndex: 0 } : {}) };
    expect(send(restored, intent)).toEqual([]);
    const after = restored.getState();
    expect(after.activeResolution?.roll?.success).toBe(true);
    expect(after.players[0]!.character.wounds).toBe(0);
    expect(after.players[0]!.character.trophies).toBe(card.cardType === "enemy" ? card.trophyValue : 0);
    expect(after.players[0]!.character.trophyPile?.filter((entry) => entry.cardId === card.id)).toHaveLength(1);
    expect(after.players[0]!.character.activeContract?.progress).toBe(1);
    expect(after.players[0]!.character.temporaryAllStatBoost?.remainingEligibleResolutions).toBe(1);
    if (cardId === "chain-maul-salvager") expect(after.players[0]!.character.salvage).toBe(5);
    expect(send(restored, intent)).toHaveLength(1);
    const correction = [...after.eventLog].reverse().find((entry) => (entry as CombatResolvedAction).correctedResolutionId) as CombatResolvedAction;
    expect(reduceGameState(after, correction).ok).toBe(false);
    expect(restored.getState().players[0]!.character.trophyPile).toHaveLength(1);
  });

  it("Scar reactions can be declined and cannot alter an accepted result", () => {
    const state = stateFor("pale-cartel-shakedown");
    state.players[0]!.character.scars = ["scar-hollow-reflection"];
    state.players[0]!.character.stats.guile = 0;
    const server = serverFor(state);
    battle(server);
    expect(server.getState().players[0]!.character.wounds).toBe(0);
    const projection = createPhoneProjection(server.getState(), "seat-1") as unknown as PhonePatchPayload;
    const control = projection.scarAdaptationControls!.find((entry) => entry.ruleKey === "guile-reroll")!;
    expect(send(server, { type: "CONTINUE_RESOLUTION", seatId: "seat-1" })).toEqual([]);
    expect(server.getState().players[0]!.character.wounds).toBe(1);
    expect(send(server, { type: "USE_SCAR_ADAPTATION", seatId: "seat-1", scarId: control.scarId,
      ruleKey: control.ruleKey, activationId: control.activationId, rollIndex: 0 })).toHaveLength(1);
  });

  it("a successful Scar hazard reroll settles its reward and can continue", () => {
    const state = stateFor("violet-thorn-toll");
    state.players[0]!.character.scars = ["scar-hollow-reflection"];
    state.players[0]!.character.stats.guile = 0;
    const server = serverFor(state, [0, 0, 5]);
    expect(send(server, { type: "CHECK_REQUESTED", seatId: "seat-1", stat: "guile" })).toEqual([]);
    const projection = createPhoneProjection(server.getState(), "seat-1") as unknown as PhonePatchPayload;
    const control = projection.scarAdaptationControls!.find((entry) => entry.ruleKey === "guile-reroll")!;
    expect(send(server, { type: "USE_SCAR_ADAPTATION", seatId: "seat-1", scarId: control.scarId,
      ruleKey: control.ruleKey, activationId: control.activationId, rollIndex: 0 })).toEqual([]);
    expect(server.getState().activeResolution?.roll?.success).toBe(true);
    expect(server.getState().pendingEffect).toBeNull();
    expect(server.getState().players[0]!.character.salvage).toBe(6);
    expect(send(server, { type: "CONTINUE_RESOLUTION", seatId: "seat-1" })).toEqual([]);
    expect(server.getState().players[0]!.character.salvage).toBe(6);
  });

  describe.each([true, false])("authored Threat outcome coverage (success: %s)", (success) => {
    it.each([...catalog.values()])("resolves $id through the real server", async (card: ThreatCard) => {
      const state = stateFor(card.id);
      state.players[0]!.character.stats[card.stat] = success ? 50 : 0;
      const server = serverFor(state, success ? [5, 5, 0, 0] : [0, 0, 5, 5]);
      expect(send(server, { type: card.cardType === "enemy" ? "COMBAT_REQUESTED" : "CHECK_REQUESTED",
        seatId: "seat-1", stat: card.stat })).toEqual([]);
      const event = [...server.getState().eventLog].reverse().find((entry) =>
        ["COMBAT_RESOLVED", "CHECK_ROLLED"].includes((entry as { type?: string }).type ?? "")) as { success: boolean; cardId: string };
      expect(event).toMatchObject({ cardId: card.id, success });
      expect(createPhoneProjection(server.getState(), "seat-1").activeResolution).toBeTruthy();
      await new Promise<void>((resolve) => setImmediate(resolve));
    });
  });
});
