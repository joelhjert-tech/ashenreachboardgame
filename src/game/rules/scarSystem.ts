import { loadScarCards } from "../content/scars.js";
import type { EncounterEffect, ScarCard, ScarSource } from "../schema/card.schema.js";
import type { GameState, Phase } from "../schema/session.schema.js";
import type { PendingScarChoice, ScarDecks } from "../schema/scarChoice.schema.js";

export const SCAR_THRESHOLD = 3;
export const SCAR_SOURCE_ORDER: ScarSource[] = ["flesh", "mind", "machine", "rift", "unbound"];

const SCARS = loadScarCards();

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicOrder(ids: string[], seed: string): string[] {
  return [...ids].sort((left, right) => {
    const delta = stableHash(`${seed}:${left}`) - stableHash(`${seed}:${right}`);
    return delta || left.localeCompare(right);
  });
}

export function createInitialScarDecks(sessionId: string): ScarDecks {
  return Object.fromEntries(SCAR_SOURCE_ORDER.map((source) => [
    source,
    deterministicOrder(
      [...SCARS.values()].filter((scar) => scar.source === source).map((scar) => scar.id),
      `${sessionId}:scar-deck:${source}`
    )
  ])) as ScarDecks;
}

export function normalizeScarDecks(state: Pick<GameState, "sessionId" | "scarDecks">): ScarDecks {
  return state.scarDecks ?? createInitialScarDecks(state.sessionId);
}

function continuationPhase(phase: Phase): PendingScarChoice["continuationPhase"] {
  return phase === "navigation" || phase === "sector" || phase === "action" || phase === "resolution" || phase === "broadcast"
    ? phase
    : "resolution";
}

function ownedScarIds(state: GameState): Set<string> {
  return new Set(state.players.flatMap((player) => player.character.scars));
}

function orderedAvailableIds(state: GameState, source: ScarSource): string[] {
  const decks = normalizeScarDecks(state);
  const owned = ownedScarIds(state);
  const reserved = new Set(state.pendingScarChoice?.candidateIds ?? []);
  const eligible = (candidateSource: ScarSource) => decks[candidateSource].filter((id) => !owned.has(id) && !reserved.has(id));
  const order = [source, ...(source === "unbound" ? [] : ["unbound" as const]), ...SCAR_SOURCE_ORDER.filter((entry) => entry !== source && entry !== "unbound")];
  return [...new Set(order.flatMap(eligible))];
}

function removeFromDecks(decks: ScarDecks, ids: readonly string[]): ScarDecks {
  const removed = new Set(ids);
  return Object.fromEntries(SCAR_SOURCE_ORDER.map((source) => [source, decks[source].filter((id) => !removed.has(id))])) as ScarDecks;
}

export interface ScarChoiceCreation {
  state: GameState;
  offered: boolean;
  reason?: string;
}

export function createScarChoice(
  state: GameState,
  seatId: string,
  effect: Extract<EncounterEffect, { type: "gain_scar_choice" }>,
  sourceEventId: string,
  createdAt: string
): ScarChoiceCreation {
  if (state.pendingScarChoice) return { state, offered: false, reason: "Another Scar choice is already pending" };
  if ((state.resolvedScarChoiceSourceEventIds ?? []).includes(sourceEventId)) {
    return { state, offered: false, reason: "Scar source already resolved" };
  }
  const candidates = orderedAvailableIds(state, effect.source).slice(0, 2);
  if (candidates.length !== 2) {
    return {
      state: {
        ...state,
        resolvedScarChoiceSourceEventIds: [...(state.resolvedScarChoiceSourceEventIds ?? []), sourceEventId],
        eventLog: [...state.eventLog, {
          type: "SCAR_CHOICE_REJECTED",
          seatId,
          sourceEventId,
          sourceCardId: effect.sourceCardId,
          reason: `Scar pool offered ${candidates.length} candidates; exactly two are required`,
          createdAt
        }]
      },
      offered: false,
      reason: "Scar pool cannot provide exactly two unique candidates"
    };
  }
  const selectionId = `scar-choice:${sourceEventId}`;
  const decks = removeFromDecks(normalizeScarDecks(state), candidates);
  return {
    offered: true,
    state: {
      ...state,
      scarDecks: decks,
      pendingScarChoice: {
        selectionId,
        ownerSeatId: seatId,
        source: effect.source,
        sourceCardId: effect.sourceCardId,
        sourceEventId,
        candidateIds: candidates,
        continuationPhase: continuationPhase(state.phase),
        createdAt,
        status: "awaitingSelection"
      },
      eventLog: [...state.eventLog, {
        type: "SCAR_CHOICE_OFFERED",
        seatId,
        selectionId,
        source: effect.source,
        sourceCardId: effect.sourceCardId,
        sourceEventId,
        candidateIds: candidates,
        createdAt
      }]
    }
  };
}

function appendToSourceDeck(decks: ScarDecks, scarId: string): ScarDecks {
  const source = SCARS.get(scarId)?.source;
  if (!source || decks[source].includes(scarId)) return decks;
  return { ...decks, [source]: [...decks[source], scarId] };
}

export function getScarCard(scarId: string): ScarCard | undefined {
  return SCARS.get(scarId);
}

export function resolveScarChoice(
  state: GameState,
  seatId: string,
  selectionId: string,
  scarId: string,
  createdAt: string,
  thresholdPolicy: "retire" | "transform" | "custom" = "retire"
): { ok: true; state: GameState; selected: ScarCard } | { ok: false; reason: string } {
  const pending = state.pendingScarChoice;
  if (!pending) return { ok: false, reason: "No Scar choice is waiting" };
  if (pending.ownerSeatId !== seatId) return { ok: false, reason: "Scar choice belongs to another seat" };
  if (pending.selectionId !== selectionId) return { ok: false, reason: "Scar choice is stale" };
  if (!pending.candidateIds.includes(scarId)) return { ok: false, reason: "Scar was not offered" };
  if (state.players.some((player) => player.character.scars.includes(scarId))) return { ok: false, reason: "Scar is already owned" };
  if ((state.resolvedScarChoiceSourceEventIds ?? []).includes(pending.sourceEventId)) return { ok: false, reason: "Scar choice already resolved" };
  const selected = SCARS.get(scarId);
  if (!selected) return { ok: false, reason: "Scar definition is missing" };
  const rejectedId = pending.candidateIds.find((id) => id !== scarId)!;
  const decks = appendToSourceDeck(normalizeScarDecks(state), rejectedId);
  const players = state.players.map((player) => player.seatId === seatId ? {
    ...player,
    character: { ...player.character, scars: [...player.character.scars, scarId] }
  } : player);
  const scarIds = players.find((player) => player.seatId === seatId)?.character.scars ?? [];
  return {
    ok: true,
    selected,
    state: {
      ...state,
      players,
      scarDecks: decks,
      pendingScarChoice: null,
      resolvedScarChoiceSourceEventIds: [...(state.resolvedScarChoiceSourceEventIds ?? []), pending.sourceEventId],
      pendingScarThreshold: scarIds.length >= SCAR_THRESHOLD ? {
        seatId,
        selectionId,
        scarIds,
        policy: thresholdPolicy,
        status: "queued",
        createdAt
      } : state.pendingScarThreshold,
      eventLog: [...state.eventLog, {
        type: "SCAR_SELECTED",
        seatId,
        selectionId,
        sourceEventId: pending.sourceEventId,
        scarId,
        rejectedScarId: rejectedId,
        createdAt
      }]
    }
  };
}

export function retireScarredOperative(state: GameState, seatId: string, createdAt: string): GameState {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player) return state;
  let decks = normalizeScarDecks(state);
  for (const scarId of player.character.scars) decks = appendToSourceDeck(decks, scarId);
  return {
    ...state,
    scarDecks: decks,
    pendingScarThreshold: null,
    scarUsage: (state.scarUsage ?? []).filter((entry) => entry.seatId !== seatId),
    players: state.players.map((entry) => entry.seatId === seatId ? {
      ...entry,
      character: { ...entry.character, status: "recalled", scars: [] }
    } : entry),
    eventLog: [...state.eventLog, {
      type: "SCAR_THRESHOLD_RESOLVED",
      seatId,
      policy: "retire",
      returnedScarIds: player.character.scars,
      createdAt
    }]
  };
}

export type ScarThresholdPolicy = "retire" | "transform" | "custom";
export type ScarThresholdHandler = (state: GameState, seatId: string, createdAt: string) => GameState;

export interface ScarThresholdHandlers {
  transform?: ScarThresholdHandler;
  custom?: ScarThresholdHandler;
}

/**
 * Dispatches the deferred third-Scar consequence through an explicitly typed
 * scenario handler. Production scenarios currently use the canonical retire
 * path; transform/custom cannot become data-only shortcuts around retirement.
 */
export function resolveScarThresholdPolicy(
  state: GameState,
  seatId: string,
  policy: ScarThresholdPolicy,
  createdAt: string,
  handlers: ScarThresholdHandlers = {}
): { ok: true; state: GameState } | { ok: false; reason: string } {
  if (policy === "retire") return { ok: true, state: retireScarredOperative(state, seatId, createdAt) };
  const handler = handlers[policy];
  if (!handler) return { ok: false, reason: `Scar threshold policy ${policy} has no production handler` };
  return { ok: true, state: handler(state, seatId, createdAt) };
}

export function removeScarFromOwner(state: GameState, seatId: string, scarId: string, createdAt: string): GameState | null {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player?.character.scars.includes(scarId)) return null;
  const decks = appendToSourceDeck(normalizeScarDecks(state), scarId);
  return {
    ...state,
    scarDecks: decks,
    scarUsage: (state.scarUsage ?? []).filter((entry) => !(entry.seatId === seatId && entry.scarId === scarId)),
    players: state.players.map((entry) => entry.seatId === seatId ? {
      ...entry,
      character: { ...entry.character, scars: entry.character.scars.filter((id) => id !== scarId) }
    } : entry),
    eventLog: [...state.eventLog, { type: "SCAR_REMOVED", seatId, scarId, createdAt }]
  };
}

export function validateScarCatalog(): string[] {
  const errors: string[] = [];
  if (SCARS.size !== 24) errors.push(`Expected 24 Scars, found ${SCARS.size}`);
  const expected: Record<ScarSource, number> = { flesh: 6, mind: 6, machine: 6, rift: 4, unbound: 2 };
  for (const source of SCAR_SOURCE_ORDER) {
    const count = [...SCARS.values()].filter((scar) => scar.source === source).length;
    if (count !== expected[source]) errors.push(`Expected ${expected[source]} ${source} Scars, found ${count}`);
  }
  for (const scar of SCARS.values()) {
    if (!scar.burden?.key || !scar.adaptation?.key) errors.push(`${scar.id} lacks executable Burden or Adaptation`);
    if (/heat/i.test(JSON.stringify(scar))) errors.push(`${scar.id} references retired Heat`);
  }
  return errors;
}
