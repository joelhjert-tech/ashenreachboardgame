import type { GameState, InteractionMode, PlayerState } from "../schema/session.schema.js";

export type RivalryAgendaTriggerType =
  | "contractCompleted"
  | "threatDefeated"
  | "sectorActionCompleted"
  | "shopPurchaseCompleted"
  | "shopSaleCompleted"
  | "itemAcquired"
  | "scenarioObjectiveProgressed";

export interface RivalryAgendaTriggerEvent {
  type: RivalryAgendaTriggerType;
  seatId: string;
  sectorId?: string;
  contractId?: string;
  threatId?: string;
  threatLane?: string;
  enemyFamily?: string;
  itemId?: string;
  itemCategory?: string;
  shopCategory?: string;
  progressKey?: string;
}

export interface RivalryAgendaDefinition {
  id: string;
  title: string;
  summary: string;
  progressLabel: string;
  target: number;
  stakes: string;
  points: number;
  progressSource: "event" | "state";
  triggers: Array<{
    type: RivalryAgendaTriggerType;
    amount: number;
  }>;
  getProgress: (player: PlayerState) => number;
}

export interface RivalryAgendaProgressSnapshot {
  agendaId: string;
  current: number;
  required: number;
  label: string;
  pointsAwarded: number;
  completedAtRound: number | null;
  completedBySeatId: string | null;
  completionSummary: string | null;
}

export interface RivalryAgendaTriggerResolution {
  agendaId: string;
  progressLabel: string;
  amount: number;
  previous: number;
  next: number;
  required: number;
  completed: boolean;
  pointsAwarded: number;
  publicCompletionTitle: string;
  publicCompletionSummary: string;
  privateCompletionSummary: string;
  triggerType: RivalryAgendaTriggerType;
  summary: string;
}

export const RIVALRY_AGENDAS: RivalryAgendaDefinition[] = [
  {
    id: "claim-trophies",
    title: "Claim the Black Ledger",
    summary: "End the run with the table believing your trophies carried the expedition.",
    progressLabel: "Trophies held",
    target: 3,
    stakes: "Reveal when the crew starts counting who paid the highest price.",
    points: 1,
    progressSource: "state",
    triggers: [{ type: "threatDefeated", amount: 1 }],
    getProgress: (player) => player.character.trophies
  },
  {
    id: "secure-salvage",
    title: "Control the Salvage Chain",
    summary: "Keep enough salvage on hand to decide what the crew can afford.",
    progressLabel: "Salvage held",
    target: 8,
    stakes: "Reveal when one purchase can shift the expedition's loyalty.",
    points: 1,
    progressSource: "state",
    triggers: [
      { type: "shopPurchaseCompleted", amount: 1 },
      { type: "shopSaleCompleted", amount: 1 },
      { type: "itemAcquired", amount: 1 }
    ],
    getProgress: (player) => player.character.salvage ?? 0
  },
  {
    id: "finish-contracts",
    title: "Own the Contract Record",
    summary: "Push your active contract line ahead before the others can claim the story.",
    progressLabel: "Contracts completed",
    target: 3,
    stakes: "Reveal when a completed contract can be credited to your ledger.",
    points: 1,
    progressSource: "event",
    triggers: [{ type: "contractCompleted", amount: 1 }],
    getProgress: () => 0
  },
  {
    id: "stay-clean",
    title: "Leave No Heat Trail",
    summary: "Advance your agenda while keeping your own heat low.",
    progressLabel: "Clean operations",
    target: 2,
    stakes: "Reveal when blame starts moving around the table.",
    points: 1,
    progressSource: "event",
    triggers: [{ type: "sectorActionCompleted", amount: 1 }],
    getProgress: () => 0
  }
];

export function getEffectiveRivalryMode(state: GameState): InteractionMode {
  return state.interactionMode ?? (state.sessionMode === "single-player" ? "co-op" : "rivalry");
}

export function getRivalryAgendaIndex(state: GameState, seatId: string): number {
  const turnOrderIndex = state.turnOrder.indexOf(seatId);

  if (turnOrderIndex >= 0) {
    return turnOrderIndex;
  }

  return Math.max(0, state.players.findIndex((player) => player.seatId === seatId));
}

export function getRivalryAgendaDefinition(state: GameState, seatId: string): RivalryAgendaDefinition | null {
  if (state.sessionMode === "single-player" || getEffectiveRivalryMode(state) === "co-op") {
    return null;
  }

  return RIVALRY_AGENDAS[getRivalryAgendaIndex(state, seatId) % RIVALRY_AGENDAS.length] ?? RIVALRY_AGENDAS[0] ?? null;
}

export function getRivalryAgendaProgressSnapshot(
  player: PlayerState,
  definition: RivalryAgendaDefinition
): RivalryAgendaProgressSnapshot {
  const privateState = player.private.rivalryAgenda;
  const storedCurrent = Math.max(0, privateState?.progressCurrent ?? 0);
  const stateCurrent =
    definition.progressSource === "state"
      ? Math.max(0, Math.trunc(definition.getProgress(player)))
      : 0;
  const current = Math.min(definition.target, Math.max(storedCurrent, stateCurrent));

  return {
    agendaId: definition.id,
    current,
    required: privateState?.progressRequired ?? definition.target,
    label: privateState?.progressLabel ?? definition.progressLabel,
    pointsAwarded: privateState?.pointsAwarded ?? 0,
    completedAtRound: privateState?.completedAtRound ?? null,
    completedBySeatId: privateState?.completedBySeatId ?? null,
    completionSummary: privateState?.privateCompletionSummary ?? null
  };
}

export function resolveRivalryAgendaTrigger(
  state: GameState,
  event: RivalryAgendaTriggerEvent
): RivalryAgendaTriggerResolution | null {
  if (state.sessionMode === "single-player" || getEffectiveRivalryMode(state) === "co-op") {
    return null;
  }

  const player = state.players.find((entry) => entry.seatId === event.seatId);

  if (!player) {
    return null;
  }

  const definition = getRivalryAgendaDefinition(state, event.seatId);

  if (!definition) {
    return null;
  }

  const agendaState = player.private.rivalryAgenda;
  const revealState = agendaState?.revealState ?? "revealLocked";

  if (revealState === "completed" || revealState === "failed") {
    return null;
  }

  const trigger = definition.triggers.find((entry) => entry.type === event.type);

  if (!trigger) {
    return null;
  }

  const snapshot = getRivalryAgendaProgressSnapshot(player, definition);
  const storedCurrent = Math.max(0, player.private.rivalryAgenda?.progressCurrent ?? 0);
  const stateProgress =
    definition.progressSource === "state"
      ? Math.min(definition.target, Math.max(0, Math.trunc(definition.getProgress(player))))
      : 0;
  const next =
    definition.progressSource === "state"
      ? Math.min(definition.target, Math.max(snapshot.current, stateProgress))
      : Math.min(definition.target, storedCurrent + Math.max(0, trigger.amount));
  const amount = Math.max(0, next - storedCurrent);

  if (amount <= 0 && next < definition.target) {
    return null;
  }

  const completed = next >= definition.target;
  const pointsAwarded = completed && (agendaState?.pointsAwarded ?? 0) <= 0 ? definition.points : 0;
  const publicCompletionTitle = "Rivalry Agenda";
  const publicCompletionSummary = `${player.character.name} completed a Rivalry Agenda.`;
  const privateCompletionSummary = `${definition.title} completed. ${definition.progressLabel} ${next}/${definition.target}.`;

  return {
    agendaId: definition.id,
    progressLabel: definition.progressLabel,
    amount: amount > 0 ? amount : trigger.amount,
    previous: storedCurrent,
    next,
    required: definition.target,
    completed,
    pointsAwarded,
    publicCompletionTitle,
    publicCompletionSummary,
    privateCompletionSummary,
    triggerType: event.type,
    summary: completed
      ? publicCompletionSummary
      : `${definition.title} advanced: ${definition.progressLabel} ${next}/${definition.target}.`
  };
}
