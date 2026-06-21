import type { BoardSpaceDefinition } from "../data/boardSpaces.js";
import type { BoardThreatCard } from "./explorationPhase.js";

const categoryOrder = ["event", "enemy", "encounter", "asset"] as const;

export function buildEngagementQueue(cards: BoardThreatCard[]): BoardThreatCard[] {
  return [...cards].sort(
    (left, right) => categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category)
  );
}

export function shouldResolveSpaceText(space: BoardSpaceDefinition, cards: BoardThreatCard[]): boolean {
  if (space.tier === "inner" || space.tier === "center") {
    return true;
  }

  return cards.length === 0;
}
