import { describe, expect, it } from "vitest";
import { parseAndMigrateSessionSnapshot, serializeSessionSnapshotV2 } from "../../game/persistence/sessionSnapshot.js";
import { GameRoomServer, createPhoneProjection, createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function selectMissionAndReady(server: GameRoomServer, seatId: string): void {
  const seat = server.getState().seats.find((entry) => entry.seatId === seatId);
  const contractId = seat?.startingContractOptions[0];
  if (!contractId) throw new Error(`Missing starting Contract for ${seatId}`);
  server.selectStartingContract(seatId, contractId);
  server.setSeatReady(seatId, true);
}

function startTwoPlayerGame(options: { gameMode?: "standard" | "nemesis_relay" } = {}): GameRoomServer {
  const server = new GameRoomServer(
    createInitialSessionState(
      "late-join-room",
      "multiplayer",
      undefined,
      "co-op",
      options.gameMode ?? "standard",
      4
    )
  );
  const first = server.joinSeat("First", "void-marshal");
  const second = server.joinSeat("Second", "signal-witch");
  selectMissionAndReady(server, first.seatId);
  selectMissionAndReady(server, second.seatId);
  server.startSession();
  return server;
}

describe("authoritative mid-game joining", () => {
  it("adds a configured open seat only after private operative and Contract setup", () => {
    const server = startTwoPlayerGame();
    const beforeTurnOrder = [...server.getState().turnOrder];
    const activeSeatId = server.getState().turnOrder[server.getState().activeSeatIndex];
    const lateJoin = server.joinSeat("Late Arrival");

    expect(lateJoin.isHostPhone).toBe(false);
    expect(server.getState().turnOrder).toEqual(beforeTurnOrder);
    expect(server.getState().turnOrder[server.getState().activeSeatIndex]).toBe(activeSeatId);
    expect((createPhoneProjection(server.getState(), lateJoin.seatId) as { lateJoinPending?: boolean; self?: unknown }).lateJoinPending).toBe(true);
    expect((createPhoneProjection(server.getState(), lateJoin.seatId) as { self?: unknown }).self).toBeNull();
    expect((createTvProjection(server.getState()) as { players: Array<{ seatId: string }> }).players.some((player) => player.seatId === lateJoin.seatId)).toBe(false);

    server.selectSeatCharacter(lateJoin.seatId, "grave-engineer");
    const ownerSetup = createPhoneProjection(server.getState(), lateJoin.seatId) as {
      lateJoinPending?: boolean;
      self?: { character?: { id?: string } };
      startingContractOptions?: Array<{ id: string }>;
    };
    expect(ownerSetup.lateJoinPending).toBe(true);
    expect(ownerSetup.self?.character?.id).toBe("grave-engineer");
    expect(ownerSetup.startingContractOptions).toHaveLength(3);
    expect((createTvProjection(server.getState()) as { players: Array<{ seatId: string }> }).players.some((player) => player.seatId === lateJoin.seatId)).toBe(false);

    selectMissionAndReady(server, lateJoin.seatId);

    const state = server.getState();
    const joinedPlayer = state.players.find((player) => player.seatId === lateJoin.seatId);
    const joinedSeat = state.seats.find((seat) => seat.seatId === lateJoin.seatId);
    expect(state.turnOrder).toEqual([...beforeTurnOrder, lateJoin.seatId]);
    expect(state.turnOrder[state.activeSeatIndex]).toBe(activeSeatId);
    expect(joinedSeat?.ready).toBe(true);
    expect(joinedPlayer?.character.activeContract?.contractId).toBe(joinedSeat?.selectedStartingContractId);
    expect(joinedPlayer?.sectorId).toBe(joinedPlayer?.character.currentSpaceId);
    expect((createPhoneProjection(state, lateJoin.seatId) as { lateJoinPending?: boolean }).lateJoinPending).toBe(false);
    expect((createTvProjection(state) as { players: Array<{ seatId: string }> }).players.some((player) => player.seatId === lateJoin.seatId)).toBe(true);
  });

  it("preserves unfinished and completed late joins through a v2 save boundary", () => {
    const pendingServer = startTwoPlayerGame();
    const pendingJoin = pendingServer.joinSeat("Pending", "grave-engineer");
    const pendingSnapshot = parseAndMigrateSessionSnapshot(serializeSessionSnapshotV2(pendingServer.getState()));
    const restoredPending = new GameRoomServer(pendingSnapshot.state);

    expect((createPhoneProjection(restoredPending.getState(), pendingJoin.seatId) as { lateJoinPending?: boolean }).lateJoinPending).toBe(true);
    expect(restoredPending.getState().turnOrder).not.toContain(pendingJoin.seatId);

    selectMissionAndReady(restoredPending, pendingJoin.seatId);
    const completedSnapshot = parseAndMigrateSessionSnapshot(serializeSessionSnapshotV2(restoredPending.getState()));
    expect(completedSnapshot.saveVersion).toBe(2);
    expect(completedSnapshot.state.turnOrder.filter((seatId) => seatId === pendingJoin.seatId)).toHaveLength(1);
    expect(completedSnapshot.state.players.find((player) => player.seatId === pendingJoin.seatId)?.character.activeContract).not.toBeNull();
  });

  it("rejects late joins for unsupported or unavailable sessions", () => {
    const single = new GameRoomServer(createInitialSessionState("solo", "single-player"));
    const soloSeat = single.joinSeat("Solo", "void-marshal");
    selectMissionAndReady(single, soloSeat.seatId);
    single.startSession();
    expect(() => single.joinSeat("Late Solo")).toThrow("not accepting new players");

    const relay = startTwoPlayerGame({ gameMode: "nemesis_relay" });
    expect(() => relay.joinSeat("Late Relay")).toThrow("Nemesis Relay does not support joining");

    const full = startTwoPlayerGame();
    const third = full.joinSeat("Third", "grave-engineer");
    selectMissionAndReady(full, third.seatId);
    const fourth = full.joinSeat("Fourth", "black-ledger-agent");
    selectMissionAndReady(full, fourth.seatId);
    expect(() => full.joinSeat("Fifth")).toThrow("No open seats remain");

    const endedState = structuredClone(full.getState());
    endedState.status = "ended";
    const ended = new GameRoomServer(endedState);
    expect(() => ended.joinSeat("Too Late")).toThrow("Session has ended");
  });

  it("allows an unfinished late join to release its seat without affecting active turn order", () => {
    const server = startTwoPlayerGame();
    const before = [...server.getState().turnOrder];
    const lateJoin = server.joinSeat("Changed Mind", "grave-engineer");

    server.releaseSeatByToken(lateJoin.seatToken);

    expect(server.getState().turnOrder).toEqual(before);
    expect(server.getState().seats.find((seat) => seat.seatId === lateJoin.seatId)?.displayName).toBeNull();
    expect(() => server.joinSeat("Replacement", "grave-engineer", lateJoin.seatId)).not.toThrow();
  });
});
