import { describe, expect, it } from "vitest";
import { loadScarCards } from "../../content/scars.js";
import { reduceGameState } from "../../engine/reducer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { evaluateScarRule, type ScarRuleContext } from "../scarPersistentRules.js";
import {
  createInitialScarDecks,
  createScarChoice,
  normalizeScarDecks,
  removeScarFromOwner,
  resolveScarChoice,
  resolveScarThresholdPolicy,
  retireScarredOperative,
  validateScarCatalog
} from "../scarSystem.js";

const effect = (source: "flesh" | "mind" | "machine" | "rift" | "unbound") => ({
  type: "gain_scar_choice" as const,
  amount: 1 as const,
  source,
  sourceCardId: `test-${source}`
});

describe("canonical Scar system", () => {
  it("contains exactly 24 typed cursed adaptations at the approved distribution", () => {
    const cards = [...loadScarCards().values()];
    expect(validateScarCatalog()).toEqual([]);
    expect(cards).toHaveLength(24);
    expect(Object.fromEntries(["flesh", "mind", "machine", "rift", "unbound"].map((source) => [source, cards.filter((card) => card.source === source).length]))).toEqual({ flesh: 6, mind: 6, machine: 6, rift: 4, unbound: 2 });
    expect(cards.every((card) => card.burden.key && card.adaptation.key && !/heat/i.test(JSON.stringify(card)))).toBe(true);
  });

  it("builds deterministic copied-session decks and exact two-card offers", () => {
    expect(createInitialScarDecks("same-seed")).toEqual(createInitialScarDecks("same-seed"));
    const state = createInitialSessionState("scar-choice-deterministic", "single-player");
    const first = createScarChoice(state, "seat-1", effect("flesh"), "source-1", "now");
    const second = createScarChoice(state, "seat-1", effect("flesh"), "source-1", "now");
    expect(first.offered).toBe(true);
    expect(first.state.pendingScarChoice?.candidateIds).toHaveLength(2);
    expect(first.state.pendingScarChoice?.candidateIds).toEqual(second.state.pendingScarChoice?.candidateIds);
    expect(new Set(first.state.pendingScarChoice?.candidateIds).size).toBe(2);
  });

  it("rejects wrong, stale and unoffered selection while returning the rejected card to its source deck", () => {
    const state = createInitialSessionState("scar-choice-validation", "multiplayer", undefined, "co-op", "standard", 2);
    const offered = createScarChoice(state, "seat-1", effect("mind"), "source-2", "now").state;
    const pending = offered.pendingScarChoice!;
    expect(resolveScarChoice(offered, "seat-2", pending.selectionId, pending.candidateIds[0]!, "now")).toMatchObject({ ok: false });
    expect(resolveScarChoice(offered, "seat-1", "stale", pending.candidateIds[0]!, "now")).toMatchObject({ ok: false });
    expect(resolveScarChoice(offered, "seat-1", pending.selectionId, "not-offered", "now")).toMatchObject({ ok: false });
    const resolved = resolveScarChoice(offered, "seat-1", pending.selectionId, pending.candidateIds[0]!, "now");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const rejected = pending.candidateIds[1]!;
    const source = loadScarCards().get(rejected)!.source;
    expect(normalizeScarDecks(resolved.state)[source].at(-1)).toBe(rejected);
    expect(resolveScarChoice(resolved.state, "seat-1", pending.selectionId, pending.candidateIds[0]!, "again")).toMatchObject({ ok: false });
  });

  it("fails safely rather than duplicating when fewer than two cards remain", () => {
    const base = createInitialSessionState("scar-exhausted", "single-player");
    const cards = [...loadScarCards().keys()];
    const owned = cards.slice(0, 23);
    const exhausted = {
      ...base,
      players: base.players.map((player) => ({ ...player, character: { ...player.character, scars: owned } })),
      scarDecks: { flesh: [], mind: [], machine: [], rift: [], unbound: [cards[23]!] }
    };
    const result = createScarChoice(exhausted, "seat-1", effect("unbound"), "source-exhausted", "now");
    expect(result.offered).toBe(false);
    expect(result.state.pendingScarChoice).toBeNull();
    expect(result.state.eventLog.at(-1)).toMatchObject({ type: "SCAR_CHOICE_REJECTED" });
  });

  it("queues the third Scar and retires only after explicit threshold resolution", () => {
    const base = createInitialSessionState("scar-threshold", "single-player");
    const withTwo = { ...base, players: base.players.map((player) => ({ ...player, character: { ...player.character, scars: ["scar-wound-1", "scar-wound-2"] } })) };
    const offered = createScarChoice(withTwo, "seat-1", effect("machine"), "source-3", "now").state;
    const pending = offered.pendingScarChoice!;
    const chosen = resolveScarChoice(offered, "seat-1", pending.selectionId, pending.candidateIds[0]!, "now");
    expect(chosen.ok).toBe(true);
    if (!chosen.ok) return;
    expect(chosen.state.players[0]!.character.status).toBe("active");
    expect(chosen.state.pendingScarThreshold?.policy).toBe("retire");
    const retired = retireScarredOperative(chosen.state, "seat-1", "later");
    expect(retired.players[0]!.character.status).toBe("recalled");
    expect(retired.players[0]!.character.scars).toEqual([]);
  });

  it("dispatches transform and custom threshold policies only through typed scenario handlers", () => {
    const base = createInitialSessionState("scar-threshold-handlers", "single-player");
    const withThree = {
      ...base,
      players: base.players.map((player) => ({
        ...player,
        character: { ...player.character, scars: ["scar-wound-1", "scar-wound-2", "scar-wound-3"] }
      }))
    };
    expect(resolveScarThresholdPolicy(withThree, "seat-1", "transform", "now")).toMatchObject({
      ok: false,
      reason: "Scar threshold policy transform has no production handler"
    });
    const transform = resolveScarThresholdPolicy(withThree, "seat-1", "transform", "now", {
      transform: (state, seatId) => ({
        ...state,
        pendingScarThreshold: null,
        players: state.players.map((player) => player.seatId === seatId
          ? { ...player, character: { ...player.character, status: "recalled" as const } }
          : player),
        eventLog: [...state.eventLog, { type: "SCAR_THRESHOLD_RESOLVED", seatId, policy: "transform", createdAt: "now" }]
      })
    });
    expect(transform.ok && transform.state.players[0]!.character.status).toBe("recalled");
    const custom = resolveScarThresholdPolicy(withThree, "seat-1", "custom", "now", {
      custom: (state, seatId) => ({
        ...state,
        pendingScarThreshold: null,
        eventLog: [...state.eventLog, { type: "SCAR_THRESHOLD_RESOLVED", seatId, policy: "custom", createdAt: "now" }]
      })
    });
    expect(custom.ok && custom.state.eventLog.at(-1)).toMatchObject({ policy: "custom" });
  });

  it("removal clears usage and returns the exact Scar to the deck", () => {
    const base = createInitialSessionState("scar-removal", "single-player");
    const initialDecks = normalizeScarDecks(base);
    const state = {
      ...base,
      scarDecks: { ...initialDecks, flesh: initialDecks.flesh.filter((id) => id !== "scar-wound-1") },
      players: base.players.map((player) => ({ ...player, character: { ...player.character, scars: ["scar-wound-1"] } })),
      scarUsage: [{ usageId: "u", seatId: "seat-1", scarId: "scar-wound-1", ruleKey: "first-grit-penalty" as const, scope: "round" as const, scopeId: "r", sourceEventId: "e", createdAt: "now" }]
    };
    const removed = removeScarFromOwner(state, "seat-1", "scar-wound-1", "now")!;
    expect(removed.players[0]!.character.scars).toEqual([]);
    expect(removed.scarUsage).toEqual([]);
    expect(normalizeScarDecks(removed).flesh.at(-1)).toBe("scar-wound-1");
  });

  it("routes CHOOSE_SCAR through the canonical reducer", () => {
    const base = createInitialSessionState("scar-reducer", "single-player");
    const offered = createScarChoice(base, "seat-1", effect("rift"), "source-reducer", "now").state;
    const pending = offered.pendingScarChoice!;
    const result = reduceGameState(offered, { type: "CHOOSE_SCAR", seatId: "seat-1", selectionId: pending.selectionId, scarId: pending.candidateIds[0]!, createdAt: "now" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.players[0]!.character.scars).toContain(pending.candidateIds[0]);
  });

  it("has an executable typed result for every one of the 48 Burden and Adaptation keys", () => {
    const cards = [...loadScarCards().values()];
    const contexts: ScarRuleContext[] = [
      { eventId: "e", timing: "beforeRoll", stat: "grit", mode: "check", helperCount: 0 },
      { eventId: "e", timing: "beforeRoll", stat: "grit", mode: "battle", encounterKind: "enemy", enemyFamily: "machine", elite: true, boss: true, success: true, margin: -1, wounds: 2, battleAwardedSalvage: false },
      { eventId: "e", timing: "beforeRoll", stat: "signal", mode: "check", encounterKind: "anomaly", naturalRoll: 1, success: false, sectorTags: ["rift", "blue"] },
      { eventId: "e", timing: "beforeRoll", stat: "command", mode: "assistance", encounterKind: "gate", helperCount: 0 },
      { eventId: "e", timing: "service", stat: "forge", mode: "service", serviceKind: "repair", success: true, difficulty: 10 },
      { eventId: "e", timing: "service", mode: "service", serviceKind: "healing" },
      { eventId: "e", timing: "event", mode: "event", optionCount: 3, success: false },
      { eventId: "e", timing: "movement", mode: "movement", encounterKind: "route" },
      { eventId: "e", timing: "afterRoll", stat: "guile", mode: "check", encounterKind: "anomaly", success: true, sectorTags: ["relay", "shrine", "toxic"] },
      { eventId: "e", timing: "after", stat: "signal", mode: "check", encounterKind: "escalation", success: true }
      ,{ eventId: "e", timing: "after", stat: "grit", mode: "check", encounterKind: "hazard", success: false }
      ,{ eventId: "e", timing: "arrival", stat: "grit", mode: "check", encounterKind: "anomaly", success: false, sectorTags: ["inner", "anomaly"] }
    ];
    const missing = cards.flatMap((card) => [card.burden.key, card.adaptation.key]).filter((key) => !contexts.some((context) => evaluateScarRule(key, context)));
    expect(missing).toEqual([]);
  });
});
