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
    expect(() => server.joinSeat("Replacement", "grave-engineer")).not.toThrow();
  });

  it("assigns the final open seat once and rejects a competing join without disturbing the turn", () => {
    const server = startTwoPlayerGame();
    const third = server.joinSeat("Third", "grave-engineer");
    selectMissionAndReady(server, third.seatId);
    const activeSeatId = server.getState().turnOrder[server.getState().activeSeatIndex];

    const winner = server.joinSeat("Final seat");
    expect(winner.seatId).toBe("seat-4");
    expect(() => server.joinSeat("Too late")).toThrow("No open seats remain");
    expect(server.getState().seats.filter((seat) => seat.seatId === winner.seatId && seat.displayName === "Final seat")).toHaveLength(1);
    expect(server.getState().turnOrder[server.getState().activeSeatIndex]).toBe(activeSeatId);
  });

  it("rejects a conflicting or stale operative choice and completes each join once", () => {
    const server = startTwoPlayerGame();
    const firstPending = server.joinSeat("First pending");
    const secondPending = server.joinSeat("Second pending");

    server.selectSeatCharacter(firstPending.seatId, "grave-engineer");
    expect(() => server.selectSeatCharacter(secondPending.seatId, "grave-engineer")).toThrow("Character already taken");
    server.selectSeatCharacter(secondPending.seatId, "black-ledger-agent");
    selectMissionAndReady(server, firstPending.seatId);

    expect(() => server.selectSeatCharacter(firstPending.seatId, "cinder-monk")).toThrow("before the session starts");
    expect(() => server.setSeatReady(firstPending.seatId, true)).toThrow("before the session starts");
    expect(server.getState().turnOrder.filter((seatId) => seatId === firstPending.seatId)).toHaveLength(1);
  });

  it("keeps the current authoritative phase and pending resolution intact while a player joins", () => {
    const cases = [
      { phase: "navigation" as const, marker: "movement" },
      { phase: "resolution" as const, marker: "battle" },
      { phase: "action" as const, marker: "shop" },
      { phase: "broadcast" as const, marker: "round transition" }
    ];

    for (const entry of cases) {
      const server = startTwoPlayerGame();
      const state = server.getState();
      state.phase = entry.phase;
      const pendingEffect = { type: "legacy_compatibility_noop" } as const;
      state.pendingEffect = pendingEffect;
      const activeSeatId = state.turnOrder[state.activeSeatIndex];

      server.joinSeat(`Join during ${entry.marker}`);

      expect(server.getState().phase).toBe(entry.phase);
      expect(server.getState().pendingEffect).toBe(pendingEffect);
      expect(server.getState().turnOrder[server.getState().activeSeatIndex]).toBe(activeSeatId);
    }
  });

  it("preserves Host Phone ownership and grants only the normal multiplayer setup package", () => {
    const server = startTwoPlayerGame();
    const hostSeatId = server.getState().setupHostSeatId;
    const lateJoin = server.joinSeat("Late package");

    expect(lateJoin.isHostPhone).toBe(false);
    expect(server.getState().setupHostSeatId).toBe(hostSeatId);
    server.selectSeatCharacter(lateJoin.seatId, "grave-engineer");
    selectMissionAndReady(server, lateJoin.seatId);

    const player = server.getState().players.find((entry) => entry.seatId === lateJoin.seatId);
    expect(player?.character.salvage).toBe(3);
    expect(player?.character.trophies).toBe(0);
    expect(player?.character.trophyPile).toEqual([]);
    expect(player?.character.completedContracts ?? []).toEqual([]);
    expect(player?.character.wounds).toBe(0);
    expect(player?.character.scars).toEqual([]);
    expect(player?.private.notes).toEqual([]);
  });

  it("does not transfer Host Phone authority when its owner is disconnected or after a v2 reload", () => {
    const server = startTwoPlayerGame();
    const hostSeatId = server.getState().setupHostSeatId!;
    const hostSeat = server.getState().seats.find((seat) => seat.seatId === hostSeatId)!;
    hostSeat.connected = false;

    const lateJoin = server.joinSeat("Join while host is away");
    expect(lateJoin.isHostPhone).toBe(false);
    expect(server.getState().setupHostSeatId).toBe(hostSeatId);

    const restored = new GameRoomServer(parseAndMigrateSessionSnapshot(serializeSessionSnapshotV2(server.getState())).state);
    expect(restored.getState().setupHostSeatId).toBe(hostSeatId);
    expect(restored.joinSeat("Another arrival").isHostPhone).toBe(false);
  });

  it("does not assign a current battle or legacy pending enemy roll to a joining player", () => {
    const server = startTwoPlayerGame();
    const state = server.getState();
    const fighterSeatId = state.turnOrder[state.activeSeatIndex]!;
    const rollerSeatId = state.turnOrder.find((seatId) => seatId !== fighterSeatId)!;
    const pendingEnemyRoll = {
      fighterSeatId,
      assignedRollerSeatId: rollerSeatId,
      encounterCardId: "qa-enemy",
      encounterTitle: "QA Enemy",
      stat: "grit" as const
    };
    state.phase = "resolution";
    state.pendingEnemyRoll = pendingEnemyRoll;

    const lateJoin = server.joinSeat("Battle observer");

    expect(server.getState().pendingEnemyRoll).toBe(pendingEnemyRoll);
    expect(server.getState().pendingEnemyRoll?.fighterSeatId).not.toBe(lateJoin.seatId);
    expect(server.getState().pendingEnemyRoll?.assignedRollerSeatId).not.toBe(lateJoin.seatId);
    expect(server.getState().turnOrder).not.toContain(lateJoin.seatId);
  });

  it("lets the host cancel an abandoned pending reservation without kicking the configured seat", () => {
    const server = startTwoPlayerGame();
    const pending = server.joinSeat("Abandoned", "grave-engineer");

    (server as unknown as { kickSeat: (seatId: string) => void }).kickSeat(pending.seatId);

    const released = server.getState().seats.find((seat) => seat.seatId === pending.seatId);
    expect(released).toMatchObject({ displayName: null, connected: false, ready: false, kicked: false, characterSelected: false });
    expect(server.getState().turnOrder).not.toContain(pending.seatId);
    expect(server.joinSeat("Replacement", "grave-engineer").seatId).toBe(pending.seatId);
  });
});
