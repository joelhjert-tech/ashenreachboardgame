import { describe, expect, it } from "vitest";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";

function createClient(seatId: string, sent: Array<Record<string, unknown>> = []): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(message: string) {
        sent.push(JSON.parse(message) as Record<string, unknown>);
      },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function runIntent(server: GameRoomServer, intent: ClientIntent, sent: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  server.handleIntent(createClient(intent.seatId, sent), intent);
  return sent;
}

function createRivalryState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("phase-three-hidden-agenda", "multiplayer", "scenario_broken_seal", "rivalry", "standard", 2);

  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1", "seat-2"],
    seats: base.seats.slice(0, 2).map((seat, index) => ({
      ...seat,
      displayName: `Player ${index + 1}`,
      connected: true,
      ready: true
    })),
    players: base.players.slice(0, 2),
    ...overrides
  };
}

function withRevealState(state: GameState, seatId: string, revealState: "revealLocked" | "revealAvailable" | "revealed"): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.seatId === seatId
        ? {
            ...player,
            private: {
              ...player.private,
              rivalryAgenda: {
                revealState,
                publicRevealTitle: revealState === "revealed" ? "Rivalry Agenda" : undefined,
                publicRevealSummary: revealState === "revealed" ? `${player.character.name} revealed a Rivalry Agenda.` : undefined,
                revealedAtRound: revealState === "revealed" ? 1 : undefined,
                revealedBySeatId: revealState === "revealed" ? seatId : undefined
              }
            }
          }
        : player
    )
  };
}

describe("Phase 3C1 hidden-agenda reveal mechanics", () => {
  it("keeps unrevealed agenda text off TV and other phones while owner phone sees it", () => {
    const state = withRevealState(createRivalryState(), "seat-1", "revealAvailable");

    const tvProjection = createTvProjection(state) as {
      privateRivalry?: unknown;
      rivalryAgendaReveal?: unknown;
    };
    const ownerPhone = createPhoneProjection(state, "seat-1") as {
      privateRivalry: { objective: { title: string; summary: string }; reveal: { state: string; available: boolean } } | null;
    };
    const otherPhone = createPhoneProjection(state, "seat-2") as {
      privateRivalry: { objective: { title: string; summary: string } } | null;
    };
    const tvJson = JSON.stringify(tvProjection);
    const otherPhoneJson = JSON.stringify(otherPhone);

    expect(ownerPhone.privateRivalry).toMatchObject({
      objective: {
        title: "Claim the Black Ledger",
        summary: "End the run with the table believing your trophies carried the expedition."
      },
      reveal: {
        state: "revealAvailable",
        available: true
      }
    });
    expect(otherPhone.privateRivalry?.objective.title).not.toBe("Claim the Black Ledger");
    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvProjection.rivalryAgendaReveal).toBeNull();
    expect(tvJson).not.toContain("Claim the Black Ledger");
    expect(tvJson).not.toContain("End the run with the table believing");
    expect(otherPhoneJson).not.toContain("End the run with the table believing");
  });

  it("lets the owner reveal when the agenda is available and projects only the public summary", () => {
    const server = new GameRoomServer(withRevealState(createRivalryState(), "seat-1", "revealAvailable"));

    runIntent(server, {
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      seatId: "seat-1"
    });

    const ownerPhone = createPhoneProjection(server.getState(), "seat-1") as {
      privateRivalry: { revealState: string; reveal: { state: string; publicSummary: string } } | null;
      rivalryAgendaReveal: { summary: string } | null;
    };
    const otherPhone = createPhoneProjection(server.getState(), "seat-2") as {
      privateRivalry: { objective: { summary: string } } | null;
      rivalryAgendaReveal: { summary: string } | null;
    };
    const tvProjection = createTvProjection(server.getState()) as {
      privateRivalry?: unknown;
      rivalryAgendaReveal: { title: string; summary: string; revealedAtRound: number };
    };
    const tvJson = JSON.stringify(tvProjection);

    expect(server.getState().players[0]?.private.rivalryAgenda).toMatchObject({
      revealState: "revealed",
      revealedBySeatId: "seat-1",
      publicRevealTitle: "Rivalry Agenda"
    });
    expect(ownerPhone.privateRivalry?.revealState).toBe("revealed");
    expect(ownerPhone.privateRivalry?.reveal.publicSummary).toContain("revealed a Rivalry Agenda");
    expect(ownerPhone.rivalryAgendaReveal?.summary).toContain("revealed a Rivalry Agenda");
    expect(otherPhone.rivalryAgendaReveal?.summary).toContain("revealed a Rivalry Agenda");
    expect(tvProjection.rivalryAgendaReveal).toMatchObject({
      title: "Rivalry Agenda",
      revealedAtRound: 1
    });
    expect(tvProjection.rivalryAgendaReveal.summary).toContain("revealed a Rivalry Agenda");
    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvJson).not.toContain("End the run with the table believing");
    expect(otherPhone.privateRivalry?.objective.summary).not.toContain("End the run with the table believing");
  });

  it("rejects locked, repeated, spoofed, co-op, and single-player reveal requests", () => {
    const lockedServer = new GameRoomServer(withRevealState(createRivalryState(), "seat-1", "revealLocked"));
    const lockedMessages = runIntent(lockedServer, {
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      seatId: "seat-1"
    });

    expect(lockedMessages.at(-1)).toMatchObject({
      type: "INTENT_REJECTED",
      actionType: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      reason: "Rivalry agenda reveal is locked"
    });

    const revealedServer = new GameRoomServer(withRevealState(createRivalryState(), "seat-1", "revealed"));
    const revealedMessages = runIntent(revealedServer, {
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      seatId: "seat-1"
    });

    expect(revealedMessages.at(-1)).toMatchObject({
      type: "INTENT_REJECTED",
      reason: "Rivalry agenda is already revealed"
    });

    const spoofServer = new GameRoomServer(withRevealState(createRivalryState(), "seat-1", "revealAvailable"));
    const spoofMessages: Array<Record<string, unknown>> = [];
    spoofServer.handleIntent(createClient("seat-2", spoofMessages), {
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      seatId: "seat-1"
    });

    expect(spoofMessages.at(-1)).toMatchObject({
      type: "INTENT_REJECTED",
      reason: "Seat mismatch between token and submitted intent"
    });

    const coOpServer = new GameRoomServer(withRevealState(createRivalryState({ interactionMode: "co-op" }), "seat-1", "revealAvailable"));
    const coOpMessages = runIntent(coOpServer, {
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      seatId: "seat-1"
    });

    expect(coOpMessages.at(-1)).toMatchObject({
      type: "INTENT_REJECTED",
      reason: "Rivalry agendas can only be revealed in rivalry or ruthless mode"
    });

    const singleBase = createInitialSessionState("phase-three-hidden-agenda-solo", "single-player", "scenario_broken_seal", "co-op");
    const singleServer = new GameRoomServer(withRevealState({
      ...singleBase,
      status: "active",
      phase: "action"
    }, "seat-1", "revealAvailable"));
    const singleMessages = runIntent(singleServer, {
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED",
      seatId: "seat-1"
    });

    expect(singleMessages.at(-1)).toMatchObject({
      type: "INTENT_REJECTED",
      reason: "Rivalry agendas can only be revealed in rivalry or ruthless mode"
    });
  });
});
