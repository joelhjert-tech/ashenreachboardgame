import type { Stat, TrophyPileEntry } from "../schema/character.schema.js";

export const TROPHY_RESERVE_CARD_ID = "trophy-reserve";

export interface TrophySpendReceiptLine {
  cardId: string;
  name: string;
  originalValue: number;
  spentValue: number;
  remainingValue: number;
  associatedSkill: Stat | null;
  cardType: string;
}

export interface TrophySpendPlan {
  remainingPile: TrophyPileEntry[];
  receipt: TrophySpendReceiptLine[];
  totalSpent: number;
}

function availableValue(entry: TrophyPileEntry): number {
  return Math.max(0, entry.trophyValue - (entry.spentValue ?? 0));
}

/**
 * Produces the canonical oldest-first trophy spend and its public-safe receipt.
 * `trophyBalance` supports restored sessions whose numeric balance predates the
 * trophy-pile ledger. That legacy value is represented as one neutral reserve
 * line and is never mistaken for a real Threat card.
 */
export function planTrophySpend(
  trophyPile: readonly TrophyPileEntry[] | undefined,
  cost: number,
  trophyBalance: number
): TrophySpendPlan {
  if (!Number.isInteger(cost) || cost < 0) {
    throw new Error("Trophy spend cost must be a non-negative integer");
  }
  if (!Number.isInteger(trophyBalance) || trophyBalance < cost) {
    throw new Error("Trophy balance cannot cover the requested spend");
  }

  let remainingCost = cost;
  const remainingPile: TrophyPileEntry[] = [];
  const receipt: TrophySpendReceiptLine[] = [];

  for (const entry of trophyPile ?? []) {
    const entryAvailable = availableValue(entry);

    if (remainingCost <= 0) {
      if (entryAvailable > 0) remainingPile.push({ ...entry });
      continue;
    }

    if (entryAvailable <= 0) continue;

    const spentValue = Math.min(entryAvailable, remainingCost);
    const remainingValue = entryAvailable - spentValue;
    remainingCost -= spentValue;
    receipt.push({
      cardId: entry.cardId,
      name: entry.name,
      originalValue: entry.trophyValue,
      spentValue,
      remainingValue,
      associatedSkill: entry.stat ?? null,
      cardType: entry.cardType ?? "enemy"
    });

    if (remainingValue > 0) {
      remainingPile.push({
        ...entry,
        spentValue: (entry.spentValue ?? 0) + spentValue
      });
    }
  }

  if (remainingCost > 0) {
    receipt.push({
      cardId: TROPHY_RESERVE_CARD_ID,
      name: "Trophy Reserve",
      originalValue: remainingCost,
      spentValue: remainingCost,
      remainingValue: 0,
      associatedSkill: null,
      cardType: "reserve"
    });
    remainingCost = 0;
  }

  return {
    remainingPile,
    receipt,
    totalSpent: receipt.reduce((total, line) => total + line.spentValue, 0)
  };
}

export function trophySpendReceiptsEqual(
  left: readonly TrophySpendReceiptLine[] | undefined,
  right: readonly TrophySpendReceiptLine[]
): boolean {
  if (!left || left.length !== right.length) return false;
  return left.every((line, index) => {
    const expected = right[index];
    return expected !== undefined
      && line.cardId === expected.cardId
      && line.name === expected.name
      && line.originalValue === expected.originalValue
      && line.spentValue === expected.spentValue
      && line.remainingValue === expected.remainingValue
      && line.associatedSkill === expected.associatedSkill
      && line.cardType === expected.cardType;
  });
}
