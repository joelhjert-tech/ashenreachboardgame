import type { BoardTier } from "../data/boardSpaces.js";

export interface MovementProfile {
  tier: BoardTier;
  movementRollAllowed: boolean;
  movementAmount: number | null;
  movementModifiersAllowed: boolean;
  skipsExploration: boolean;
  resolveTextBoxAlways: boolean;
}

export function getMovementProfile(tier: BoardTier): MovementProfile {
  if (tier === "inner") {
    return {
      tier,
      movementRollAllowed: false,
      movementAmount: 1,
      movementModifiersAllowed: false,
      skipsExploration: true,
      resolveTextBoxAlways: true
    };
  }

  return {
    tier,
    movementRollAllowed: tier !== "center",
    movementAmount: null,
    movementModifiersAllowed: tier !== "center",
    skipsExploration: tier === "center",
    resolveTextBoxAlways: tier === "center"
  };
}
