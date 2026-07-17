import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { loadGear } from "../../game/content/gear.js";
import { loadThreatCards } from "../../game/content/threats.js";
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

function runIntent(server: GameRoomServer, intent: ClientIntent): void {
  server.handleIntent(createClient(intent.seatId), intent);
}

function createActiveRivalryState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("phase-three-rivalry-progress", "multiplayer", "scenario_broken_seal", "rivalry", "standard", 4);

  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1", "seat-2", "seat-3", "seat-4"],
    seats: base.seats.slice(0, 4).map((seat, index) => ({
      ...seat,
      displayName: `Player ${index + 1}`,
      connected: true,
      ready: true
    })),
    players: base.players.slice(0, 4),
    ...overrides
  };
}

function withAgendaState(
  state: GameState,
  seatId: string,
  agenda: NonNullable<GameState["players"][number]["private"]["rivalryAgenda"]>
): GameState {
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

describe("Phase 3C2 rivalry agenda progress foundation", () => {
  it("progresses the contract agenda through real contract completion", () => {
    const state = withAgendaState(createActiveRivalryState({ activeSeatIndex: 2 }), "seat-3", {
      revealState: "revealAvailable",
      progressCurrent: 2,
      progressRequired: 3,
      progressLabel: "Contracts completed"
    });
    state.players[2] = {
      ...state.players[2]!,
      character: {
        ...state.players[2]!.character,
        activeContract: { contractId: "cartel-crossing-thread", progress: 1 }
      }
    };
    const server = new GameRoomServer(state);

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-3",
      contractId: "cartel-crossing-thread"
    });

    const ownerPhone = createPhoneProjection(server.getState(), "seat-3") as {
      privateRivalry: {
        revealState: string;
        objective: { progress: number; target: number; title: string };
        scoring: { pointsAwarded: number; completionSummary: string };
      } | null;
      rivalryAgendaCompletion: { summary: string } | null;
    };
    const tvProjection = createTvProjection(server.getState()) as {
      privateRivalry?: unknown;
      rivalryAgendaCompletion: { summary: string; pointsAwarded: number } | null;
    };
    const otherPhoneJson = JSON.stringify(createPhoneProjection(server.getState(), "seat-1"));
    const tvJson = JSON.stringify(tvProjection);

    expect(ownerPhone.privateRivalry).toMatchObject({
      revealState: "completed",
      objective: {
        title: "Own the Contract Record",
        progress: 3,
        target: 3
      },
      scoring: {
        pointsAwarded: 1,
        completionSummary: "Own the Contract Record completed. Contracts completed 3/3."
      }
    });
    expect(ownerPhone.rivalryAgendaCompletion?.summary).toContain("completed a Rivalry Agenda");
    expect(tvProjection.rivalryAgendaCompletion).toMatchObject({
      summary: expect.stringContaining("completed a Rivalry Agenda"),
      pointsAwarded: 1
    });
    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvJson).not.toContain("Own the Contract Record");
    expect(tvJson).not.toContain("Push your active contract line");
    expect(otherPhoneJson).not.toContain("Own the Contract Record");
  });

  it("progresses a trophy agenda from a real threat defeat", () => {
    const threats = loadThreatCards();
    const redThreat = threats.get("ash-lane-cutters") as Extract<ThreatCard, { cardType: "enemy" }>;
    const state = withAgendaState(
      createActiveRivalryState({ currentEncounter: redThreat }),
      "seat-1",
      {
        revealState: "revealLocked",
        progressCurrent: 0,
        progressRequired: 3,
        progressLabel: "Trophies held"
      }
    );
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5, 0, 0]));

    (server as unknown as { resolveOpposedCombat: (seatId: string, stat: "grit", encounter: typeof redThreat, roller: null) => void }).resolveOpposedCombat(
      "seat-1",
      "grit",
      redThreat,
      null
    );

    const phoneProjection = createPhoneProjection(server.getState(), "seat-1") as {
      privateRivalry: { objective: { progress: number; target: number } } | null;
    };

    expect(phoneProjection.privateRivalry?.objective).toMatchObject({
      progress: 1,
      target: 3
    });
  });

  it("progresses and completes a sector-action agenda through real space text resolution", () => {
    const base = createInitialSessionState("phase-three-rivalry-sector-progress", "multiplayer", "scenario_labyrinth_engine", "rivalry", "standard", 4);
    const state = withAgendaState(
      {
        ...base,
        status: "active",
        phase: "action",
        activeSeatIndex: 3,
        turnOrder: ["seat-1", "seat-2", "seat-3", "seat-4"],
        seats: base.seats.slice(0, 4).map((seat, index) => ({
          ...seat,
          displayName: `Player ${index + 1}`,
          connected: true,
          ready: true
        })),
        players: base.players.slice(0, 4).map((player) =>
          player.seatId === "seat-4"
            ? {
                ...player,
                sectorId: "middle_guardian_span",
                character: {
                  ...player.character,
                  currentSpaceId: "middle_guardian_span"
                }
              }
            : player
        ),
        sectors: base.sectors.map((sector) =>
          sector.id === "middle_guardian_span"
            ? {
                ...sector,
                encounterDecks: { ...sector.encounterDecks, threat: [] }
              }
            : sector
        )
      },
      "seat-4",
      {
        revealState: "revealed",
        progressCurrent: 1,
        progressRequired: 2,
        progressLabel: "Clean operations"
      }
    );
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));

    (server as unknown as { resolveSpaceTextIntent: (intent: Extract<ClientIntent, { type: "RESOLVE_SPACE_TEXT" }>) => void }).resolveSpaceTextIntent({
      type: "RESOLVE_SPACE_TEXT",
      seatId: "seat-4",
      choiceId: "seal-alignment"
    });

    const phoneProjection = createPhoneProjection(server.getState(), "seat-4") as {
      privateRivalry: { revealState: string; objective: { progress: number }; scoring: { pointsAwarded: number } } | null;
    };

    expect(phoneProjection.privateRivalry).toMatchObject({
      revealState: "completed",
      objective: { progress: 2 },
      scoring: { pointsAwarded: 1 }
    });
  });

  it("progresses the salvage agenda from a real shop sale when salvage crosses the threshold", () => {
    const gear = loadGear().get("black-route-fuse")!;
    const state = withAgendaState(createActiveRivalryState({ activeSeatIndex: 1 }), "seat-2", {
      revealState: "revealAvailable",
      progressCurrent: 0,
      progressRequired: 8,
      progressLabel: "Salvage held"
    });
    state.players[1] = {
      ...state.players[1]!,
      sectorId: "outer_waymarket",
      character: {
        ...state.players[1]!.character,
        currentSpaceId: "outer_waymarket",
        salvage: 7,
        heldGear: [...state.players[1]!.character.heldGear, gear]
      }
    };
    const server = new GameRoomServer(state);

    runIntent(server, {
      type: "SHOP_SELL_REQUESTED",
      seatId: "seat-2",
      gearId: "black-route-fuse"
    });

    const phoneProjection = createPhoneProjection(server.getState(), "seat-2") as {
      privateRivalry: { revealState: string; objective: { progress: number; target: number } } | null;
    };

    expect(phoneProjection.privateRivalry).toMatchObject({
      revealState: "completed",
      objective: {
        progress: 8,
        target: 8
      }
    });
  });

  it("does not progress private agendas in co-op", () => {
    const state = createActiveRivalryState({ interactionMode: "co-op" });
    const server = new GameRoomServer(state);

    runIntent(server, {
      type: "COMPLETE_CONTRACT",
      seatId: "seat-1",
      contractId: "cartel-crossing-thread"
    });

    const phoneProjection = createPhoneProjection(server.getState(), "seat-1") as { privateRivalry: unknown };

    expect(phoneProjection.privateRivalry).toBeNull();
  });
});
