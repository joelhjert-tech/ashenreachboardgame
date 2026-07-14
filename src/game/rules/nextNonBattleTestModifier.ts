import type { RollModifierSource } from "../engine/actions.js";
import type { GameState, PendingNextNonBattleTestModifier } from "../schema/session.schema.js";

export const GLASS_CHIME_SWARM_ID = "glass-chime-swarm" as const;
export const GLASS_CHIME_SWARM_MODIFIER_LABEL = "Glass-Chime Swarm";
export const GLASS_CHIME_SWARM_MODIFIER_AMOUNT = -1 as const;

export function getPendingNextNonBattleTestModifier(
  state: Pick<GameState, "pendingNextNonBattleTestModifiers">,
  ownerSeatId: string
): PendingNextNonBattleTestModifier | null {
  return state.pendingNextNonBattleTestModifiers?.find((entry) => entry.ownerSeatId === ownerSeatId) ?? null;
}

export function getNextNonBattleTestModifierSource(
  state: Pick<GameState, "pendingNextNonBattleTestModifiers">,
  ownerSeatId: string
): RollModifierSource | null {
  return getPendingNextNonBattleTestModifier(state, ownerSeatId)
    ? { label: GLASS_CHIME_SWARM_MODIFIER_LABEL, value: GLASS_CHIME_SWARM_MODIFIER_AMOUNT }
    : null;
}

export function createOrReplaceNextNonBattleTestModifier(
  state: GameState,
  ownerSeatId: string,
  sourceEventId: string,
  createdAt: string
): GameState {
  if (state.resolvedNextNonBattleTestModifierSourceEventIds?.includes(sourceEventId)) {
    return state;
  }

  const pending: PendingNextNonBattleTestModifier = {
    type: "nextNonBattleTest",
    ownerSeatId,
    amount: GLASS_CHIME_SWARM_MODIFIER_AMOUNT,
    sourceCardId: GLASS_CHIME_SWARM_ID,
    sourceEventId,
    createdAt
  };

  return {
    ...state,
    pendingNextNonBattleTestModifiers: [
      ...(state.pendingNextNonBattleTestModifiers ?? []).filter((entry) => entry.ownerSeatId !== ownerSeatId),
      pending
    ],
    resolvedNextNonBattleTestModifierSourceEventIds: [
      ...(state.resolvedNextNonBattleTestModifierSourceEventIds ?? []),
      sourceEventId
    ]
  };
}

export function consumeNextNonBattleTestModifier(
  state: GameState,
  ownerSeatId: string,
  testEventId: string
): GameState {
  if (state.consumedNextNonBattleTestModifierTestEventIds?.includes(testEventId)) {
    return state;
  }

  if (!getPendingNextNonBattleTestModifier(state, ownerSeatId)) {
    return state;
  }

  return {
    ...state,
    pendingNextNonBattleTestModifiers: (state.pendingNextNonBattleTestModifiers ?? []).filter(
      (entry) => entry.ownerSeatId !== ownerSeatId
    ),
    consumedNextNonBattleTestModifierTestEventIds: [
      ...(state.consumedNextNonBattleTestModifierTestEventIds ?? []),
      testEventId
    ]
  };
}

export function clearNextNonBattleTestModifierForSeat(state: GameState, ownerSeatId: string): GameState {
  return {
    ...state,
    pendingNextNonBattleTestModifiers: (state.pendingNextNonBattleTestModifiers ?? []).filter(
      (entry) => entry.ownerSeatId !== ownerSeatId
    )
  };
}

export function clearAllNextNonBattleTestModifiers(state: GameState): GameState {
  return (state.pendingNextNonBattleTestModifiers?.length ?? 0) === 0
    ? state
    : { ...state, pendingNextNonBattleTestModifiers: [] };
}
