import type { RollModifierSource } from "../engine/actions.js";
import type { Stat } from "../schema/character.schema.js";
import type { GameState, PendingNextNonBattleTestModifier } from "../schema/session.schema.js";

export const GLASS_CHIME_SWARM_ID = "glass-chime-swarm" as const;
export const GLASS_CHIME_SWARM_MODIFIER_LABEL = "Glass-Chime Swarm";
export const GLASS_CHIME_SWARM_MODIFIER_AMOUNT = -1 as const;
export const SIREN_RELAY_ECHO_ID = "siren-relay-echo" as const;
export const SIREN_RELAY_ECHO_MODIFIER_LABEL = "Siren Relay Echo";

export function getPendingNextNonBattleTestModifier(
  state: Pick<GameState, "pendingNextNonBattleTestModifiers">,
  ownerSeatId: string
): Extract<PendingNextNonBattleTestModifier, { sourceCardId: "glass-chime-swarm" }> | null {
  return state.pendingNextNonBattleTestModifiers?.find(
    (entry): entry is Extract<PendingNextNonBattleTestModifier, { sourceCardId: "glass-chime-swarm" }> =>
      entry.ownerSeatId === ownerSeatId && entry.sourceCardId === GLASS_CHIME_SWARM_ID
  ) ?? null;
}

export function getPendingSirenRelayEchoModifier(
  state: Pick<GameState, "pendingNextNonBattleTestModifiers">,
  ownerSeatId: string
): Extract<PendingNextNonBattleTestModifier, { sourceCardId: "siren-relay-echo" }> | null {
  return state.pendingNextNonBattleTestModifiers?.find(
    (entry): entry is Extract<PendingNextNonBattleTestModifier, { sourceCardId: "siren-relay-echo" }> =>
      entry.ownerSeatId === ownerSeatId && entry.sourceCardId === SIREN_RELAY_ECHO_ID
  ) ?? null;
}

export function getNextNonBattleTestModifierSource(
  state: Pick<GameState, "pendingNextNonBattleTestModifiers">,
  ownerSeatId: string,
  stat?: Stat
): RollModifierSource[] {
  return (state.pendingNextNonBattleTestModifiers ?? [])
    .filter((entry) => entry.ownerSeatId === ownerSeatId)
    .filter((entry) => entry.sourceCardId === GLASS_CHIME_SWARM_ID || (entry.stat === stat && entry.boundTestResolutionId === null))
    .map((entry) => ({
      label: entry.sourceCardId === GLASS_CHIME_SWARM_ID ? GLASS_CHIME_SWARM_MODIFIER_LABEL : SIREN_RELAY_ECHO_MODIFIER_LABEL,
      value: entry.amount
    }));
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
      ...(state.pendingNextNonBattleTestModifiers ?? []).filter(
        (entry) => entry.ownerSeatId !== ownerSeatId || entry.sourceCardId !== GLASS_CHIME_SWARM_ID
      ),
      pending
    ],
    resolvedNextNonBattleTestModifierSourceEventIds: [
      ...(state.resolvedNextNonBattleTestModifierSourceEventIds ?? []),
      sourceEventId
    ]
  };
}

export function createOrReplaceSirenRelayEchoModifier(
  state: GameState,
  ownerSeatId: string,
  amount: -1 | 1,
  sourceEventId: string,
  createdAt: string
): GameState {
  if (state.resolvedNextNonBattleTestModifierSourceEventIds?.includes(sourceEventId)) return state;
  const replaced = getPendingSirenRelayEchoModifier(state, ownerSeatId);
  const consumedReplacedResolutionId = replaced?.boundTestResolutionId &&
    !state.consumedNextNonBattleTestModifierTestEventIds?.includes(replaced.boundTestResolutionId)
      ? replaced.boundTestResolutionId
      : null;

  const pending: PendingNextNonBattleTestModifier = {
    type: "nextNonBattleTest",
    ownerSeatId,
    amount,
    sourceCardId: SIREN_RELAY_ECHO_ID,
    stat: "command",
    context: "nonBattleTest",
    sourceEventId,
    boundTestResolutionId: null,
    createdAt
  };
  return {
    ...state,
    pendingNextNonBattleTestModifiers: [
      ...(state.pendingNextNonBattleTestModifiers ?? []).filter(
        (entry) => entry.ownerSeatId !== ownerSeatId || entry.sourceCardId !== SIREN_RELAY_ECHO_ID
      ),
      pending
    ],
    resolvedNextNonBattleTestModifierSourceEventIds: [
      ...(state.resolvedNextNonBattleTestModifierSourceEventIds ?? []),
      sourceEventId
    ],
    consumedNextNonBattleTestModifierTestEventIds: consumedReplacedResolutionId
      ? [...(state.consumedNextNonBattleTestModifierTestEventIds ?? []), consumedReplacedResolutionId]
      : state.consumedNextNonBattleTestModifierTestEventIds
  };
}

export function reserveSirenRelayEchoModifier(
  state: GameState,
  ownerSeatId: string,
  testResolutionId: string
): GameState {
  const pending = getPendingSirenRelayEchoModifier(state, ownerSeatId);
  if (!pending || pending.boundTestResolutionId) return state;
  return {
    ...state,
    pendingNextNonBattleTestModifiers: (state.pendingNextNonBattleTestModifiers ?? []).map((entry) =>
      entry === pending ? { ...pending, boundTestResolutionId: testResolutionId } : entry
    )
  };
}

export function consumeReservedSirenRelayEchoModifier(state: GameState, ownerSeatId: string): GameState {
  const pending = getPendingSirenRelayEchoModifier(state, ownerSeatId);
  if (!pending?.boundTestResolutionId) return state;
  if (state.consumedNextNonBattleTestModifierTestEventIds?.includes(pending.boundTestResolutionId)) return state;
  return {
    ...state,
    pendingNextNonBattleTestModifiers: (state.pendingNextNonBattleTestModifiers ?? []).filter((entry) => entry !== pending),
    consumedNextNonBattleTestModifierTestEventIds: [
      ...(state.consumedNextNonBattleTestModifierTestEventIds ?? []),
      pending.boundTestResolutionId
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
      (entry) => entry.ownerSeatId !== ownerSeatId || entry.sourceCardId !== GLASS_CHIME_SWARM_ID
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
