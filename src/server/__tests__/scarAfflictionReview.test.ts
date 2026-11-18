import { describe, expect, it } from "vitest";
import { loadCharacters } from "../../game/content/characters.js";
import { loadAfflictionCards } from "../../game/content/afflictions.js";
import { loadGear } from "../../game/content/gear.js";
import { loadScarCards } from "../../game/content/scars.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { applyEffectToState, reduceGameState } from "../../game/engine/reducer.js";
import type { CheckRolledAction, ClientIntent, CombatResolvedAction, SoloRerollResolvedAction } from "../../game/engine/actions.js";
import type { EncounterEffect } from "../../game/schema/card.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { evaluateOwnedScarRules } from "../../game/rules/scarPersistentRules.js";
import { preventWoundInEffect, resolveAfflictionDraw, getAfflictionModifierSources } from "../../game/rules/afflictions.js";
import { getOwnedScarAdaptationControls, getScarDisplacementOptions } from "../../game/rules/scarAdaptationControls.js";
import { getRingTrackNeighbor } from "../../game/rules/movementPlanner.js";
import { getCharacterStatBreakdown } from "../../game/engine/gear.js";
import { createTvProjection, GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

const initial = createInitialSessionState("scar-affliction-review", "single-player", "scenario_throne_of_ash");
const threats = loadThreatCards();
const scars = loadScarCards();

function stateFor(cardId = "chain-maul-salvager"): GameState {
  const state = structuredClone(initial);
  state.status = "active";
  state.phase = "action";
  state.turnOrder = ["seat-1"];
  state.activeSeatIndex = 0;
  state.seats[0]!.displayName = "Review operative";
  state.seats[0]!.characterSelected = true;
  state.players[0]!.character = { ...loadCharacters().get("void-marshal")!, heldGear: [],
    equippedGear: { weapon: null, armor: null, utility: null }, scars: [], wounds: 2 };
  state.players[0]!.private.hand = [];
  state.players[0]!.sectorId = state.players[0]!.character.currentSpaceId;
  const card = structuredClone(threats.get(cardId)!);
  state.currentEncounter = card;
  state.activeResolution = { id: "review-battle", playerId: "seat-1", source: "threat", stage: "battle_setup",
    card: { id: card.id, title: card.title, type: card.cardType },
    battle: { stat: card.stat, difficulty: card.difficulty, modifiers: [] } };
  return state;
}

function addAffliction(state: GameState, cardId: string) {
  state.players[0]!.faceupAfflictions = [...(state.players[0]!.faceupAfflictions ?? []),
    { instanceId: cardId, cardId, drawnAt: "now", face: "faceup", resolved: false }];
}

function serverFor(state: GameState, dice = [0, 0, 0, 0]) {
  return new GameRoomServer(state, [], createSequenceRandomSource(dice), undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, { mode: "simulation" });
}

function resultFor(state: GameState, effect: EncounterEffect): CombatResolvedAction {
  return { type: "COMBAT_RESOLVED", seatId: "seat-1", stat: "grit", difficulty: 6,
    roll: { faces: [6, 6], total: 12 }, enemyRoll: { faces: [1, 1], total: 2 },
    statBonus: 0, enemyBonus: 4, total: 12, enemyTotal: 6, success: true,
    effect, cardId: state.currentEncounter!.id, enemyRollerSeatId: null, createdAt: "review-result" };
}

function amountOf(effect: EncounterEffect | null | undefined, type: string): number {
  if (!effect) return 0;
  if (effect.type === "sequence") return effect.effects.reduce((sum, entry) => sum + amountOf(entry, type), 0);
  return effect.type === type && "amount" in effect ? Number(effect.amount) : 0;
}

describe("Scars and Afflictions review", () => {
  it.each([...scars.values()].flatMap((scar) => (["burden", "adaptation"] as const).map((kind) => ({ scar, kind }))))(
    "$scar.title $kind cannot fire outside its authored timing", ({ scar, kind }) => {
      const state = stateFor();
      state.players[0]!.character.scars = [scar.id];
      expect(evaluateOwnedScarRules(state, state.players[0]!, kind, { eventId: "unrelated", timing: "unrelated",
        mode: "battle", stat: "grit", success: false, margin: -1, elite: true, enemyFamily: "machine",
        encounterKind: "enemy", naturalRoll: 1, sectorTags: ["inner", "blue", "toxic", "rift"],
        helperCount: 0, optionCount: 3 })).toEqual([]);
    });

  it("first-test burdens apply before the roll, once per round", () => {
    const state = stateFor();
    const player = state.players[0]!;
    player.character.scars = ["scar-wound-1", "scar-wound-10"];
    const context = { eventId: "battle", timing: "beforeRoll", mode: "battle" as const, stat: "grit" as const };
    const first = evaluateOwnedScarRules(state, player, "burden", context);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ scarId: "scar-wound-1", outcome: { modifier: -1 } });
    state.scarUsage = first.flatMap((entry) => entry.usage ? [entry.usage] : []);
    expect(evaluateOwnedScarRules(state, player, "burden", { ...context, eventId: "battle-2" })).toEqual([]);
  });

  it.each([false, true])("Oath-Chain does not heal or escalate unrelated tests (success: %s)", (success) => {
    const state = stateFor("glass-tick-cloud");
    state.players[0]!.character.scars = ["scar-wound-6"];
    state.players[0]!.character.stats.forge = success ? 20 : 0;
    const server = serverFor(state);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "forge" });
    expect(server.getState().eventLog.filter((entry) =>
      (entry as { type?: string; scarId?: string }).type === "SCAR_RULE_APPLIED"
      && (entry as { scarId?: string }).scarId === "scar-wound-6")).toEqual([]);
    expect(server.getState().players[0]!.character.wounds).toBe(2);
  });

  it.each([false, true])("Marrow Debt reduces only the new Trophy award (explicit: %s)", (explicit) => {
    const state = stateFor();
    state.players[0]!.character.scars = ["scar-wound-10"];
    state.players[0]!.character.trophies = 5;
    if (state.currentEncounter?.cardType !== "enemy") throw new Error("Enemy fixture missing");
    state.currentEncounter.trophyValue = 3;
    const result = reduceGameState(state, resultFor(state, explicit ? { type: "gain_trophy", amount: 3 } : { type: "gain_salvage", amount: 1 }));
    expect(result.ok).toBe(true);
    const applied = result.state.pendingEffect ? applyEffectToState(result.state, "seat-1", result.state.pendingEffect) : result.state;
    expect(applied.players[0]!.character.trophies).toBe(7);
    expect(applied.players[0]!.character.trophyPile?.at(-1)).toMatchObject({ trophyValue: 3, spentValue: 1 });
    expect(applied.scarUsage?.filter((entry) => entry.ruleKey === "first-trophy-reduction")).toHaveLength(1);
  });

  it.each(["forfeit", "conversion"] as const)("Marrow Debt leaves prior Trophies and its use intact after full %s", (kind) => {
    const state = stateFor();
    state.players[0]!.character.scars = ["scar-wound-10"];
    state.players[0]!.character.trophies = 5;
    const action = resultFor(state, { type: "gain_trophy", amount: 3 });
    if (kind === "forfeit") action.edgeForfeitTrophy = true;
    else action.edgeTrophyConversion = 3;
    const result = reduceGameState(state, action);
    expect(result.ok).toBe(true);
    expect(result.state.players[0]!.character.trophies).toBe(5);
    expect(amountOf(result.state.pendingEffect, "gain_trophy")).toBe(0);
    expect(result.state.scarUsage?.some((entry) => entry.ruleKey === "first-trophy-reduction")).toBe(false);
  });

  it.each(["brittle-frame", "severed-grip"])("%s suppresses equipped passive bonuses in actual battles and the TV stats", (afflictionId) => {
    const state = stateFor();
    const player = state.players[0]!;
    const slot = afflictionId === "brittle-frame" ? "armor" : "weapon";
    const gear = { ...loadGear().get(slot === "armor" ? "ironhide-bracers" : "stormcut-axe")!,
      instanceId: "restricted", statBonus: { stat: "grit" as const, amount: 3 }, effectModel: "permanent" as const };
    player.character.heldGear = [gear];
    player.character.equippedGear[slot] = gear.id;
    player.character.equippedGearInstances = { weapon: null, armor: null, utility: null, [slot]: gear.instanceId };
    player.character.stats.grit = 4;
    addAffliction(state, afflictionId);
    const server = serverFor(state);
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "grit" });
    const action = server.getState().eventLog.find((entry) => (entry as { type?: string }).type === "COMBAT_RESOLVED") as CombatResolvedAction;
    expect(action.statBonus).toBe(4);
    expect(action.modifierSources?.some((entry) => entry.label === gear.name)).toBe(false);
    const projection = createTvProjection(state) as { players: Array<{ character: { effectiveStats: { grit: number } } }> };
    expect(projection.players[0]!.character.effectiveStats.grit).toBe(4);
  });

  it("wound prevention reaches nested consequences and shares a single prevention budget", () => {
    const effect: EncounterEffect = { type: "sequence", effects: [
      { type: "sequence", effects: [{ type: "lose_salvage", amount: 2 }, { type: "take_wound", amount: 2 }] },
      { type: "take_wound", amount: 1 }
    ] };
    const protectedEffect = preventWoundInEffect(effect, 1);
    expect(amountOf(protectedEffect, "take_wound")).toBe(2);
    expect(amountOf(protectedEffect, "lose_salvage")).toBe(2);
    expect(amountOf(effect, "take_wound")).toBe(3);
    expect(amountOf(preventWoundInEffect(effect, 3), "take_wound")).toBe(0);
  });

  it("Blood Fury's matched-die Wound survives a successful Future Sickness reroll", () => {
    const state = stateFor();
    addAffliction(state, "blood-fury");
    addAffliction(state, "future-sickness");
    const server = serverFor(state, [0, 5]);
    const internals = server as unknown as {
      maybeOpenAfflictionRollReaction(seatId: string, action: CombatResolvedAction): boolean;
      resolveAfflictionReactionIntent(intent: Extract<ClientIntent, { type: "AFFLICTION_REACTION_RESOLVED" }>): void;
    };
    const action = { ...resultFor(state, { type: "take_wound", amount: 1 }), success: false,
      roll: { faces: [1, 1], total: 2 }, total: 2 };
    expect(internals.maybeOpenAfflictionRollReaction("seat-1", action)).toBe(true);
    for (const afflictionId of ["blood-fury", "future-sickness"]) {
      const pending = server.getState().pendingAfflictionReaction!;
      expect(pending.afflictionId).toBe(afflictionId);
      internals.resolveAfflictionReactionIntent({ type: "AFFLICTION_REACTION_RESOLVED",
        seatId: "seat-1", reactionId: pending.id, use: true, dieIndex: 0 });
    }
    const result = server.getState().eventLog.find((entry) => (entry as { type?: string }).type === "COMBAT_RESOLVED") as CombatResolvedAction;
    expect(result.success).toBe(true);
    expect(amountOf(result.effect, "take_wound")).toBe(1);
    expect(result.afflictionReactionCost).toEqual({ type: "take_wound", amount: 1 });
  });

  it("Borrowed Name earns one bonus only after its reduced assistance succeeds", () => {
    const state = stateFor();
    const player = state.players[0]!;
    player.character.scars = ["scar-borrowed-name"];
    const context = { eventId: "next-roll", timing: "beforeRoll", mode: "check" as const, stat: "grit" as const, helperCount: 0 };
    expect(evaluateOwnedScarRules(state, player, "adaptation", context)).toEqual([]);
    state.scarUsage = [{ usageId: "borrowed", seatId: "seat-1", scarId: "scar-borrowed-name",
      ruleKey: "first-assistance-reduction", scope: "round", scopeId: "round:0", sourceEventId: "assistance", createdAt: "now" }];
    state.eventLog.push({ type: "COOPERATIVE_ASSISTED_ROLL_RESOLVED", requestId: "assistance", seatId: "seat-2",
      contributions: [{ seatId: "seat-1", value: 2 }], success: true });
    expect(evaluateOwnedScarRules(state, player, "adaptation", { ...context, helperCount: 1 })).toEqual([]);
    const bonus = evaluateOwnedScarRules(state, player, "adaptation", context);
    expect(bonus[0]?.outcome.modifier).toBe(1);
    state.scarUsage.push(bonus[0]!.usage!);
    expect(evaluateOwnedScarRules(state, player, "adaptation", context)).toEqual([]);
  });

  it("Marrow Debt also reduces a non-battle Trophy reward once without taxing old Trophies", () => {
    const state = stateFor();
    state.players[0]!.character.scars = ["scar-wound-10"];
    state.players[0]!.character.trophies = 5;
    const next = applyEffectToState(state, "seat-1", { type: "sequence", effects: [
      { type: "gain_trophy", amount: 1 }, { type: "gain_trophy", amount: 2 }
    ] });
    expect(next.players[0]!.character.trophies).toBe(7);
    expect(next.scarUsage).toHaveLength(1);
  });

  it("permanent stat loss cannot leave phantom advancement bonuses below the stat floor", () => {
    const state = stateFor();
    const player = state.players[0]!;
    player.character.stats.guile = 2;
    player.character.statUpgrades = { ...player.character.statUpgrades, guile: 1 };
    const catalog = loadAfflictionCards();
    let next = resolveAfflictionDraw(player, catalog.get("mind-fog")!, catalog, { createdAt: "loss-1" }).player;
    next = resolveAfflictionDraw(next, catalog.get("mind-fog")!, catalog, { createdAt: "loss-2" }).player;
    expect(next.character.stats.guile).toBe(1);
    expect(getCharacterStatBreakdown(next.character, "guile").final).toBe(1);
  });

  it("ongoing Afflictions do not stack duplicate cards or push stacked test penalties below their floor", () => {
    const state = stateFor();
    const catalog = loadAfflictionCards();
    addAffliction(state, "hollow-belly");
    state.players[0]!.character.stats.grit = 3;
    const next = resolveAfflictionDraw(state.players[0]!, catalog.get("hollow-belly")!, catalog, { createdAt: "again" }).player;
    expect(next.faceupAfflictions).toHaveLength(1);
    next.faceupAfflictions!.push({ ...next.faceupAfflictions![0]!, instanceId: "legacy-duplicate" });
    expect(getAfflictionModifierSources(next, "grit", "check", catalog).reduce((sum, source) => sum + source.value, 3)).toBe(1);
  });

  it("a new Affliction cycle skips an ongoing card that is still faceup", () => {
    const state = stateFor();
    addAffliction(state, "blood-fury");
    addAffliction(state, "bile-spit");
    const catalog = loadAfflictionCards();
    state.availableAfflictions = [catalog.get("blood-fury")!, catalog.get("mind-fog")!];
    state.players[0]!.afflictionDrawHistory = [...catalog.keys()].sort();
    state.currentEncounter = null;
    state.activeResolution = null;
    state.pendingAfflictionResolution = { id: "cycle", ownerSeatId: "seat-1", sourceCardId: "review",
      remainingDraws: 1, status: "queued", nextAfflictionId: null, nextDie: null,
      chosenStat: null, excludedCardIds: [], createdAt: "now" };
    const server = serverFor(state);
    (server as unknown as { runAutomaticPhases(seatId: string): void }).runAutomaticPhases("seat-1");
    expect(["blood-fury", "bile-spit"]).not.toContain(server.getState().players[0]!.afflictionDrawHistory?.at(-1));
    const ongoing = server.getState().players[0]!.faceupAfflictions!;
    expect(new Set(ongoing.map((entry) => entry.cardId)).size).toBe(ongoing.length);
  });

  it("Split Horizon changes the actual forced route and Ash-Lanced shortens its destination", () => {
    const state = stateFor();
    const player = state.players[0]!;
    player.character.scars = ["scar-split-horizon", "scar-wound-1"];
    const origin = player.sectorId;
    const first = getRingTrackNeighbor(origin, 1)!;
    const second = getRingTrackNeighbor(first, 1)!;
    state.phase = "resolution";
    state.activeResolution!.stage = "awaiting_continue";
    state.activeResolution!.roll = { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: 6, success: false };
    state.pendingDisplacement = { reactionId: "push", seatId: "seat-1", sourceType: "threat",
      sourceId: state.currentEncounter!.id, sourceEventId: "push-event", sourceResolutionId: state.activeResolution!.id,
      originSectorId: origin, destinationSectorId: second, direction: "clockwise", distance: 2,
      sameRing: true, fallbackEffect: null, failureStillCounts: true, createdAt: "now", status: "pending" };
    const options = getScarDisplacementOptions(state, player);
    const reverse = options.find((entry) => entry.direction === "counterclockwise")!;
    expect(reverse).toBeDefined();
    const server = serverFor(state);
    const split = getOwnedScarAdaptationControls(server.getState(), "seat-1").find((entry) => entry.ruleKey === "choose-displacement-direction")!;
    expect(split.enabled).toBe(true);
    server.resolveScarAdaptationIntent({ type: "USE_SCAR_ADAPTATION", seatId: "seat-1",
      scarId: split.scarId, ruleKey: split.ruleKey, activationId: split.activationId, targetId: reverse.sectorId });
    expect(server.getState().pendingDisplacement).toMatchObject({ direction: "counterclockwise", destinationSectorId: reverse.sectorId });
    const ash = getOwnedScarAdaptationControls(server.getState(), "seat-1").find((entry) => entry.ruleKey === "prevent-grit-displacement")!;
    expect(ash.enabled).toBe(true);
    server.resolveScarAdaptationIntent({ type: "USE_SCAR_ADAPTATION", seatId: "seat-1", scarId: ash.scarId, ruleKey: ash.ruleKey, activationId: ash.activationId });
    expect(server.getState().pendingDisplacement).toMatchObject({ distance: 1, destinationSectorId: getRingTrackNeighbor(origin, -1) });
  });

  it("Static Burn cannot cancel Blue enemies or global event effects", () => {
    const state = stateFor();
    state.players[0]!.character.scars = ["scar-wound-2"];
    state.currentEncounter!.threatLane = "blue";
    state.pendingEffect = { type: "take_wound", amount: 1 };
    state.activeResolution!.stage = "roll_result";
    const control = () => getOwnedScarAdaptationControls(state, "seat-1").find((entry) => entry.ruleKey === "ignore-blue-event")!;
    expect(control().enabled).toBe(false);
    state.currentEncounter = { ...threats.get("glass-tick-cloud")!, threatLane: "blue", resolutionType: "event" };
    expect(control().enabled).toBe(true);
    state.pendingEffect = { type: "advance_escalation", amount: 1 };
    expect(control().enabled).toBe(false);
  });

  it.each(["scar", "solo"] as const)("Future Sickness's draw cost survives a later successful %s reroll", (kind) => {
    const state = stateFor("violet-thorn-toll");
    state.players[0]!.character.scars = ["scar-hollow-reflection"];
    addAffliction(state, "future-sickness");
    const server = serverFor(state, [0, 5, 5]);
    const internals = server as unknown as {
      maybeOpenAfflictionRollReaction(seatId: string, action: CheckRolledAction): boolean;
      resolveAfflictionReactionIntent(intent: Extract<ClientIntent, { type: "AFFLICTION_REACTION_RESOLVED" }>): void;
      createSoloRerollAction(intent: Extract<ClientIntent, { type: "SOLO_REROLL_REQUESTED" }>, createdAt: string): SoloRerollResolvedAction;
    };
    internals.maybeOpenAfflictionRollReaction("seat-1", { type: "CHECK_ROLLED", seatId: "seat-1",
      stat: "guile", difficulty: 6, roll: { faces: [1, 1], total: 2 }, statBonus: 0, total: 2,
      success: false, effect: { type: "take_wound", amount: 1 }, cardId: state.currentEncounter!.id, createdAt: "first-roll" });
    internals.resolveAfflictionReactionIntent({ type: "AFFLICTION_REACTION_RESOLVED", seatId: "seat-1",
      reactionId: server.getState().pendingAfflictionReaction!.id, use: true, dieIndex: 0 });
    expect(amountOf(server.getState().pendingEffect, "draw_affliction")).toBe(1);
    if (kind === "solo") {
      const reroll = internals.createSoloRerollAction({ type: "SOLO_REROLL_REQUESTED", seatId: "seat-1" }, "reroll");
      expect(reroll.success).toBe(true);
      expect(amountOf(reroll.effect, "draw_affliction")).toBe(1);
    } else {
      const control = getOwnedScarAdaptationControls(server.getState(), "seat-1").find((entry) => entry.ruleKey === "guile-reroll")!;
      server.resolveScarAdaptationIntent({ type: "USE_SCAR_ADAPTATION", seatId: "seat-1",
        scarId: control.scarId, ruleKey: control.ruleKey, activationId: control.activationId, rollIndex: 0 });
      expect(server.getState().activeResolution?.roll?.success).toBe(true);
      const consequence = server.getState().eventLog.find((entry) => (entry as { type?: string }).type === "RESOLUTION_APPLIED") as { effect: EncounterEffect };
      expect(amountOf(consequence.effect, "draw_affliction")).toBe(1);
    }
  });
});
