import { describe, expect, it } from "vitest";
import type { TrophyPileEntry } from "../../schema/character.schema.js";
import { planTrophySpend, TROPHY_RESERVE_CARD_ID } from "../trophySpend.js";

function trophy(cardId: string, trophyValue: number, spentValue = 0): TrophyPileEntry {
  return {
    cardId,
    name: cardId,
    trophyValue,
    spentValue,
    stat: "signal",
    cardType: "enemy"
  };
}

describe("canonical Trophy spending", () => {
  it("spends one card exactly", () => {
    const plan = planTrophySpend([trophy("one", 4)], 4, 4);
    expect(plan.totalSpent).toBe(4);
    expect(plan.remainingPile).toEqual([]);
    expect(plan.receipt).toEqual([
      expect.objectContaining({ cardId: "one", originalValue: 4, spentValue: 4, remainingValue: 0 })
    ]);
  });

  it("spends multiple cards oldest-first", () => {
    const plan = planTrophySpend([trophy("one", 1), trophy("two", 2), trophy("three", 3)], 6, 6);
    expect(plan.receipt.map((line) => [line.cardId, line.spentValue])).toEqual([
      ["one", 1],
      ["two", 2],
      ["three", 3]
    ]);
    expect(plan.remainingPile).toEqual([]);
  });

  it("preserves the unpaid portion of a partially spent card", () => {
    const plan = planTrophySpend([trophy("six", 6)], 4, 6);
    expect(plan.receipt).toEqual([
      expect.objectContaining({ cardId: "six", originalValue: 6, spentValue: 4, remainingValue: 2 })
    ]);
    expect(plan.remainingPile).toEqual([
      expect.objectContaining({ cardId: "six", trophyValue: 6, spentValue: 4 })
    ]);
  });

  it("supports ten one-value contributing cards", () => {
    const pile = Array.from({ length: 10 }, (_, index) => trophy(`one-${index + 1}`, 1));
    const plan = planTrophySpend(pile, 10, 10);
    expect(plan.receipt).toHaveLength(10);
    expect(plan.totalSpent).toBe(10);
    expect(plan.remainingPile).toEqual([]);
  });

  it("uses one neutral reserve line for legacy balance without pile metadata", () => {
    const plan = planTrophySpend([], 3, 3);
    expect(plan.receipt).toEqual([
      expect.objectContaining({ cardId: TROPHY_RESERVE_CARD_ID, spentValue: 3, remainingValue: 0 })
    ]);
  });
});
