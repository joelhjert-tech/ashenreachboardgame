import { describe, expect, it } from "vitest";
import type { GameState } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import {
  getRivalryAgendaDefinition,
  getRivalryAgendaProgressSnapshot,
  resolveRivalryAgendaTrigger
} from "../rivalryAgendaTriggers.js";

function createState(playerCount = 4, overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("rivalry-agenda-rules", "multiplayer", "scenario_broken_seal", "rivalry", "standard", playerCount);

  return {
    ...base,
    status: "active",
    phase: "action",
    seats: base.seats.slice(0, playerCount).map((seat, index) => ({
      ...seat,
      displayName: `Player ${index + 1}`,
      connected: true,
      ready: true
    })),
    players: base.players.slice(0, playerCount),
    turnOrder: base.turnOrder.slice(0, playerCount),
    ...overrides
  };
}

function stateWithAgenda(
  seatId: string,
  agenda: NonNullable<GameState["players"][number]["private"]["rivalryAgenda"]>,
  overrides: Partial<GameState> = {}
): GameState {
  const state = createState(4, overrides);

  return {
    ...state,
    players: state.players.map((player) =>
      player.seatId === seatId
        ? {
            ...player,
            private: {
              ...player.private,
              rivalryAgenda: agenda
            }
          }
        : player
    )
  };
}

describe("rivalry agenda trigger resolver", () => {
  it("progresses matching trigger types and ignores non-matching events", () => {
    const contractState = stateWithAgenda("seat-3", { revealState: "revealAvailable" });
    const contractResult = resolveRivalryAgendaTrigger(contractState, {
      type: "contractCompleted",
      seatId: "seat-3",
      contractId: "cartel-crossing-thread"
    });
    const miss = resolveRivalryAgendaTrigger(contractState, {
      type: "threatDefeated",
      seatId: "seat-3",
      threatId: "bell-mask-pilgrim"
    });

    expect(contractResult).toMatchObject({
      agendaId: "finish-contracts",
      amount: 1,
      previous: 0,
      next: 1,
      required: 3,
      completed: false
    });
    expect(miss).toBeNull();
  });

  it("uses trigger amounts, clamps at required progress, and awards points once on completion", () => {
    const state = stateWithAgenda("seat-3", {
      revealState: "revealed",
      progressCurrent: 2,
      progressRequired: 3,
      progressLabel: "Contracts completed"
    });
    const result = resolveRivalryAgendaTrigger(state, {
      type: "contractCompleted",
      seatId: "seat-3",
      contractId: "cartel-crossing-thread"
    });

    expect(result).toMatchObject({
      agendaId: "finish-contracts",
      amount: 1,
      previous: 2,
      next: 3,
      required: 3,
      completed: true,
      pointsAwarded: 1,
      publicCompletionSummary: expect.stringContaining("completed a Rivalry Agenda")
    });
  });

  it("does not progress completed or failed agendas", () => {
    const completedState = stateWithAgenda("seat-3", {
      revealState: "completed",
      progressCurrent: 3,
      progressRequired: 3
    });
    const failedState = stateWithAgenda("seat-3", {
      revealState: "failed",
      progressCurrent: 1,
      progressRequired: 3
    });

    expect(resolveRivalryAgendaTrigger(completedState, { type: "contractCompleted", seatId: "seat-3" })).toBeNull();
    expect(resolveRivalryAgendaTrigger(failedState, { type: "contractCompleted", seatId: "seat-3" })).toBeNull();
  });

  it("does not create private agenda progress in co-op or single-player", () => {
    const coOpState = createState(2, { interactionMode: "co-op" });
    const soloBase = createInitialSessionState("rivalry-agenda-solo", "single-player", "scenario_broken_seal", "co-op");
    const soloState = {
      ...soloBase,
      status: "active" as const,
      phase: "action" as const
    };

    expect(resolveRivalryAgendaTrigger(coOpState, { type: "threatDefeated", seatId: "seat-1" })).toBeNull();
    expect(resolveRivalryAgendaTrigger(soloState, { type: "threatDefeated", seatId: "seat-1" })).toBeNull();
  });

  it("projects stored private progress over live fallback progress after trigger state exists", () => {
    const state = stateWithAgenda("seat-1", {
      revealState: "revealLocked",
      progressCurrent: 2,
      progressRequired: 3,
      progressLabel: "Trophies held"
    });
    const player = state.players[0]!;
    const definition = getRivalryAgendaDefinition(state, "seat-1")!;

    expect(getRivalryAgendaProgressSnapshot(player, definition)).toMatchObject({
      agendaId: "claim-trophies",
      current: 2,
      required: 3,
      label: "Trophies held"
    });
  });
});
