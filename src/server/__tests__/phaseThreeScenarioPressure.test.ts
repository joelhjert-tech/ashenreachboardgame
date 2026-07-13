import { describe, expect, it } from "vitest";
import type { GameState } from "../../game/schema/session.schema.js";
import { GameRoomServer, createPhoneProjection, createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function createActiveState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("phase-three-pressure", "multiplayer", "scenario_throne_of_ash", "co-op", "standard", 2);

  return {
    ...base,
    status: "active",
    phase: "broadcast",
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

function completeBroadcastTurn(server: GameRoomServer, seatId: string): void {
  (server as unknown as { completeBroadcastTurn: (seatId: string) => void }).completeBroadcastTurn(seatId);
}

describe("Phase 3A scenario mode pressure foundation", () => {
  it("advances shared round pressure once per multiplayer round, not once per player", () => {
    const server = new GameRoomServer(createActiveState());

    completeBroadcastTurn(server, "seat-1");

    expect(server.getState().activeSeatIndex).toBe(1);
    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().eventLog.filter((entry) => (entry as { type?: string }).type === "ROUND_COMPLETED")).toHaveLength(0);

    server.getState().phase = "broadcast";
    completeBroadcastTurn(server, "seat-2");

    expect(server.getState().activeSeatIndex).toBe(0);
    expect(server.getState().escalationLevel).toBe(1);
    expect(server.getState().eventLog.filter((entry) => (entry as { type?: string }).type === "ROUND_COMPLETED")).toHaveLength(1);
  });

  it("marks the scenario failed when the public collapse pressure reaches max", () => {
    const state = createActiveState({
      turnOrder: ["seat-1"],
      seats: createActiveState().seats.slice(0, 1),
      players: createActiveState().players.slice(0, 1),
      escalationLevel: 5
    });
    const server = new GameRoomServer(state);

    completeBroadcastTurn(server, "seat-1");

    expect(server.getState().status).toBe("ended");
    expect(server.getState().winnerSeatId).toBeNull();
    const tvProjection = createTvProjection(server.getState()) as {
      scenarioPressure: {
        scenarioStatus: string;
        collapseTrack: { current: number; max: number; failureAtMax: boolean };
      } | null;
    };
    expect(tvProjection.scenarioPressure).toMatchObject({
      scenarioStatus: "failed",
      collapseTrack: {
        current: 6,
        max: 6,
        failureAtMax: true
      }
    });
  });

  it("projects public scenario pressure to TV and phone while keeping rivalry directives private", () => {
    const state = createInitialSessionState("phase-three-rivalry", "multiplayer", "scenario_throne_of_ash", "rivalry");
    state.players[0] = {
      ...state.players[0]!,
      private: {
        ...state.players[0]!.private,
        notes: ["Private agenda marker"]
      }
    };

    const tvProjection = createTvProjection(state) as {
      scenarioPressure: { mode: string; modeSpecific: { privateAgenda: string } } | null;
      privateRivalry?: unknown;
    };
    const ownerPhone = createPhoneProjection(state, "seat-1") as {
      scenarioPressure: { mode: string; modeSpecific: { privateAgenda: string } } | null;
      privateRivalry: { recentPrivateNotes: string[] } | null;
    };
    const otherPhone = createPhoneProjection(state, "seat-2") as {
      scenarioPressure: { mode: string; modeSpecific: { privateAgenda: string } } | null;
      privateRivalry: { recentPrivateNotes: string[] } | null;
    };
    const tvJson = JSON.stringify(tvProjection);

    expect(tvProjection.scenarioPressure).toMatchObject({
      mode: "rivalry",
      modeSpecific: {
        privateAgenda: "phone-only"
      }
    });
    expect(ownerPhone.scenarioPressure).toMatchObject(tvProjection.scenarioPressure!);
    expect(ownerPhone.privateRivalry?.recentPrivateNotes).toEqual(["Private agenda marker"]);
    expect(otherPhone.privateRivalry?.recentPrivateNotes).toEqual([]);
    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvJson).not.toContain("Private agenda marker");
  });
});
