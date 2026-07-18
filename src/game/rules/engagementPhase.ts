import type { BoardSpaceDefinition } from "../data/boardSpaces.js";
import type { BoardThreatCard } from "./explorationPhase.js";

const categoryOrder = ["event", "enemy", "nemesis", "encounter", "asset"] as const;
const supportedCategories = new Set<string>(categoryOrder);

export function buildEngagementQueue(cards: BoardThreatCard[]): BoardThreatCard[] {
  const unsupported = cards.find((card) => !supportedCategories.has(card.category));

  if (unsupported) {
    throw new Error(`Unsupported engagement category ${String(unsupported.category)} on ${unsupported.id}`);
  }

  return [...cards].sort(
    (left, right) => categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category)
  );
}

export function shouldResolveSpaceText(space: BoardSpaceDefinition, cards: BoardThreatCard[]): boolean {
  if (space.tier === "center") {
    return true;
  }

  return cards.length === 0;
}
