import { describe, expect, it } from "vitest";
import { LEGACY_HEAT_EFFECT_APPROVALS } from "../../../../scripts/legacy-heat-validation.js";
import { loadThreatCards } from "../../content/threats.js";
import {
  consumeReservedMemoryTaxGateModifier,
  getNextNonBattleTestModifierSource,
  reserveMemoryTaxGateModifier
} from "../../rules/nextNonBattleTestModifier.js";
import type { HazardThreatCard } from "../../schema/card.schema.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { reduceGameState } from "../reducer.js";

const TARGET_ID = "memory-tax-gate";
const threats = loadThreatCards();

function requireTarget(): HazardThreatCard {
  const card = threats.get(TARGET_ID);
  if (!card || card.cardType !== "hazard") throw new Error("Missing Memory Tax Gate");
  return card;
}

function failureState(salvage: number): GameState {
  const card = requireTarget();
  const state = createInitialSessionState(`h9b-${salvage}`, "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = card;
  state.pendingEffect = card.failEffect;
  player.character.salvage = salvage;
  state.activeResolution = {
    id: `${TARGET_ID}:failed-check`,
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: card.difficulty, success: false }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId,
    movedToSectorId: player.sectorId,
    encounterCardId: card.id,
    encounterTitle: card.title,
    encounterCardType: card.cardType,
    checkStat: card.stat,
    die1: 1,
    die2: 1,
    statBonus: 0,
    checkTotal: 2,
    difficulty: card.difficulty,
    success: false,
    summary: "Memory Tax Gate check failed."
  };
  return state;
}

function applyFailure(state: GameState) {
  const card = requireTarget();
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: state.players[0]!.seatId,
    effect: card.failEffect,
    sourceCardId: card.id,
    success: false,
    createdAt: "h9b-failure"
  });
}

function choose(state: GameState, optionId: "lose-salvage-1" | "next-non-battle-test-minus-1") {
  const pending = state.pendingMemoryTaxChoice!;
  return reduceGameState(state, {
    type: "MEMORY_TAX_CHOICE_RESOLVED",
    seatId: pending.ownerSeatId,
    choiceId: pending.choiceId,
    choiceVersion: pending.choiceVersion,
    optionId,
    createdAt: "h9b-choice"
  });
}

describe("Heat Retirement H9B Memory Tax Gate", () => {
  it("preserves card identity and replaces authored Heat with the source-locked choice", () => {
    const card = requireTarget();
    expect(card).toMatchObject({
      id: TARGET_ID,
      title: "Memory Tax Gate",
      cardType: "hazard",
      threatLane: "yellow",
      stat: "command",
      difficulty: 8,
      severity: 3,
      region: "middle",
      rarity: "uncommon",
      failEffect: { type: "memory_tax_choice", sourceCardId: TARGET_ID }
    });
    expect(JSON.stringify(card)).not.toMatch(/gain_heat|lose_heat|\bHeat\b/);
    expect(LEGACY_HEAT_EFFECT_APPROVALS.some((entry) => entry.id === TARGET_ID)).toBe(false);
    expect([...threats.values()]).toHaveLength(109);
  });

  it("creates one mandatory owner-private two-option choice when Salvage is available", () => {
    const applied = applyFailure(failureState(2));
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.pendingMemoryTaxChoice?.legalOptionIds).toEqual([
      "lose-salvage-1",
      "next-non-battle-test-minus-1"
    ]);
    expect(applied.state.pendingEffect).toBeNull();
    const owner = createPhoneProjection(applied.state, "seat-1", true) as Record<string, unknown>;
    const tv = createTvProjection(applied.state) as Record<string, unknown>;
    expect((owner.pendingMemoryTaxChoicePrivate as { options: unknown[] }).options).toHaveLength(2);
    expect(tv.pendingMemoryTaxChoice).toMatchObject({ sourceId: TARGET_ID, status: "waiting" });
    expect(tv).not.toHaveProperty("pendingMemoryTaxChoicePrivate");
    expect(gameStateSchema.safeParse(applied.state).success).toBe(true);
  });

  it("loses exactly 1 Salvage once without creating a modifier", () => {
    const pending = applyFailure(failureState(2));
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    const originalChoice = pending.state.pendingMemoryTaxChoice!;
    const resolved = choose(pending.state, "lose-salvage-1");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.players[0]!.character.salvage).toBe(1);
    expect(resolved.state.pendingNextNonBattleTestModifiers).toEqual([]);
    expect(resolved.state.pendingMemoryTaxChoice).toBeNull();
    expect(reduceGameState(resolved.state, {
      type: "MEMORY_TAX_CHOICE_RESOLVED",
      seatId: originalChoice.ownerSeatId,
      choiceId: originalChoice.choiceId,
      choiceVersion: originalChoice.choiceVersion,
      optionId: "lose-salvage-1",
      createdAt: "duplicate"
    }).ok).toBe(false);
  });

  it("installs one replace-not-stack modifier for the next non-battle test", () => {
    const pending = applyFailure(failureState(2));
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    const resolved = choose(pending.state, "next-non-battle-test-minus-1");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(getNextNonBattleTestModifierSource(resolved.state, "seat-1", "signal")).toEqual([
      { label: "Memory Tax Gate", value: -1 }
    ]);
    expect(getNextNonBattleTestModifierSource(resolved.state, "seat-1", "command")).toEqual([
      { label: "Memory Tax Gate", value: -1 }
    ]);
    const reserved = reserveMemoryTaxGateModifier(resolved.state, "seat-1", "test-resolution");
    expect(getNextNonBattleTestModifierSource(reserved, "seat-1", "signal")).toEqual([]);
    const consumed = consumeReservedMemoryTaxGateModifier(reserved, "seat-1");
    expect(consumed.pendingNextNonBattleTestModifiers).toEqual([]);
    expect(consumed.consumedNextNonBattleTestModifierTestEventIds).toContain("test-resolution");
  });

  it("automatically applies the modifier at zero Salvage without opening a private choice", () => {
    const applied = applyFailure(failureState(0));
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.pendingMemoryTaxChoice).toBeNull();
    expect(applied.state.players[0]!.character.salvage).toBe(0);
    expect(applied.state.pendingNextNonBattleTestModifiers).toHaveLength(1);
    expect(applied.state.resolvedMemoryTaxChoiceSourceEventIds).toHaveLength(1);
    expect(applyFailure(applied.state).ok).toBe(false);
  });

  it("falls back authoritatively to the modifier if the Salvage option becomes stale", () => {
    const pending = applyFailure(failureState(1));
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    pending.state.players[0]!.character.salvage = 0;
    const resolved = choose(pending.state, "lose-salvage-1");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.players[0]!.character.salvage).toBe(0);
    expect(resolved.state.pendingNextNonBattleTestModifiers).toHaveLength(1);
  });

  it("rejects wrong-seat, forged, stale, and bypass submissions while reconnect restores the owner choice", () => {
    const pending = applyFailure(failureState(2));
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    const choice = pending.state.pendingMemoryTaxChoice!;
    const restored = new GameRoomServer(structuredClone(pending.state)).getState();
    expect(restored.pendingMemoryTaxChoice).toEqual(choice);
    expect(reduceGameState(restored, {
      type: "MEMORY_TAX_CHOICE_RESOLVED",
      seatId: "seat-2",
      choiceId: choice.choiceId,
      choiceVersion: choice.choiceVersion,
      optionId: "lose-salvage-1",
      createdAt: "wrong-seat"
    }).ok).toBe(false);
    expect(reduceGameState(restored, {
      type: "MEMORY_TAX_CHOICE_RESOLVED",
      seatId: "seat-1",
      choiceId: "forged",
      choiceVersion: choice.choiceVersion,
      optionId: "lose-salvage-1",
      createdAt: "forged"
    }).ok).toBe(false);
    expect(reduceGameState(restored, { type: "CONTINUE_RESOLUTION", seatId: "seat-1", createdAt: "bypass" }).ok).toBe(false);
  });
});
