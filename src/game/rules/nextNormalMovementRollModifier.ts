import type { RollModifierSource } from "../engine/actions.js";
import type { GameState, PendingNextNormalMovementRollModifier } from "../schema/session.schema.js";

export const SPINDLE_STATIC_SQUALL_ID = "spindle-static-squall" as const;
export const SPINDLE_STATIC_SQUALL_MODIFIER_LABEL = "Spindle Static Squall";
export const SPINDLE_STATIC_SQUALL_MODIFIER_AMOUNT = -1 as const;
export const SPINDLE_STATIC_SQUALL_MINIMUM_RESULT = 1 as const;

export function getPendingNextNormalMovementRollModifier(
  state: Pick<GameState, "pendingNextNormalMovementRollModifiers">,
  ownerSeatId: string
): PendingNextNormalMovementRollModifier | null {
  return state.pendingNextNormalMovementRollModifiers?.find((entry) => entry.ownerSeatId === ownerSeatId) ?? null;
}

export function getNextNormalMovementRollModifierSource(
  state: Pick<GameState, "pendingNextNormalMovementRollModifiers">,
  ownerSeatId: string
): RollModifierSource | null {
  return getPendingNextNormalMovementRollModifier(state, ownerSeatId)
    ? { label: SPINDLE_STATIC_SQUALL_MODIFIER_LABEL, value: SPINDLE_STATIC_SQUALL_MODIFIER_AMOUNT }
    : null;
}

export function resolveNormalMovementAllowance(
  rolledValue: number,
  modifierSources: readonly RollModifierSource[]
): number {
  return Math.max(
    SPINDLE_STATIC_SQUALL_MINIMUM_RESULT,
    rolledValue + modifierSources.reduce((total, source) => total + source.value, 0)
  );
}

export function createOrReplaceNextNormalMovementRollModifier(
  state: GameState,
  ownerSeatId: string,
  sourceEventId: string,
  createdAt: string
): GameState {
  if (state.resolvedNextNormalMovementRollModifierSourceEventIds?.includes(sourceEventId)) {
    return state;
  }

  const pending: PendingNextNormalMovementRollModifier = {
    type: "nextNormalMovementRoll",
    ownerSeatId,
    amount: SPINDLE_STATIC_SQUALL_MODIFIER_AMOUNT,
    minimumResult: SPINDLE_STATIC_SQUALL_MINIMUM_RESULT,
    sourceCardId: SPINDLE_STATIC_SQUALL_ID,
    sourceEventId,
    createdAt
  };

  return {
    ...state,
    pendingNextNormalMovementRollModifiers: [
      ...(state.pendingNextNormalMovementRollModifiers ?? []).filter((entry) => entry.ownerSeatId !== ownerSeatId),
      pending
    ],
    resolvedNextNormalMovementRollModifierSourceEventIds: [
      ...(state.resolvedNextNormalMovementRollModifierSourceEventIds ?? []),
      sourceEventId
    ]
  };
}

export function consumeNextNormalMovementRollModifier(
  state: GameState,
  ownerSeatId: string,
  movementRollResolutionId: string
): GameState {
  if (state.consumedNextNormalMovementRollResolutionIds?.includes(movementRollResolutionId)) {
    return state;
  }
  if (!getPendingNextNormalMovementRollModifier(state, ownerSeatId)) {
    return state;
  }

  return {
    ...state,
    pendingNextNormalMovementRollModifiers: (state.pendingNextNormalMovementRollModifiers ?? []).filter(
      (entry) => entry.ownerSeatId !== ownerSeatId
    ),
    consumedNextNormalMovementRollResolutionIds: [
      ...(state.consumedNextNormalMovementRollResolutionIds ?? []),
      movementRollResolutionId
    ]
  };
}

export function clearNextNormalMovementRollModifierForSeat(state: GameState, ownerSeatId: string): GameState {
  return {
    ...state,
    pendingNextNormalMovementRollModifiers: (state.pendingNextNormalMovementRollModifiers ?? []).filter(
      (entry) => entry.ownerSeatId !== ownerSeatId
    )
  };
}

export function clearAllNextNormalMovementRollModifiers(state: GameState): GameState {
  return (state.pendingNextNormalMovementRollModifiers?.length ?? 0) === 0
    ? state
    : { ...state, pendingNextNormalMovementRollModifiers: [] };
}
