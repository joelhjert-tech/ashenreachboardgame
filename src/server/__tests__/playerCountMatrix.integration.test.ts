import { once } from "node:events";
import type { AddressInfo } from "node:net";
import WebSocket, { WebSocketServer } from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { getBattleAssistViewModel, getInventoryCards } from "../../client/phone/inventoryPresentation.js";
import type { PhonePatchPayload } from "../../client/shared/types.js";
import { loadGear } from "../../game/content/gear.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { EnemyThreatCard } from "../../game/schema/card.schema.js";
import { createJoinToken, createHostToken } from "../auth.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";
import type { GameState, SessionMode } from "../../game/schema/session.schema.js";

type ServerEnvelope =
  | {
      type: "STATE_PATCH";
      sessionId: string;
      sequence: number;
      phase: GameState["phase"];
      payload: Record<string, unknown>;
    }
  | {
      type: "INTENT_REJECTED";
      sessionId: string;
      sequence: number;
      actionType: string;
      reason: string;
    };

class SocketProbe {
  public readonly messages: ServerEnvelope[] = [];
  private readonly waiters = new Set<{
    predicate: (message: ServerEnvelope, index: number) => boolean;
    resolve: (message: ServerEnvelope) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  public constructor(public readonly socket: WebSocket) {
    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw)) as ServerEnvelope;
      this.messages.push(message);

      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(message, this.messages.length - 1)) {
          clearTimeout(waiter.timer);
          this.waiters.delete(waiter);
          waiter.resolve(message);
        }
      }
    });
  }

  async waitFor(
    predicate: (message: ServerEnvelope, index: number) => boolean,
    timeoutMs = 4000
  ): Promise<ServerEnvelope> {
    const existingIndex = this.messages.findIndex((message, index) => predicate(message, index));

    if (existingIndex >= 0) {
      return this.messages[existingIndex]!;
    }

    return await new Promise<ServerEnvelope>((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters.delete(waiter);
          reject(new Error("Timed out waiting for socket message"));
        }, timeoutMs)
      };

      this.waiters.add(waiter);
    });
  }

  close(): void {
    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.terminate();
    }
  }
}

type Harness = {
  roomServer: GameRoomServer;
  server: WebSocketServer;
  port: number;
};

type BroadcastableRoomServer = {
  broadcastPatch: () => void;
};

const joinChoices = [
  "void-marshal",
  "signal-witch",
  "grave-engineer",
  "black-ledger-agent",
  "cinder-monk",
  "salvage-warden"
] as const;

const matrixBattleThreat = {
  id: "matrix-battle-echo",
  type: "threat",
  title: "Matrix Battle Echo",
  cardType: "enemy",
  enemyName: "Matrix Battle Echo",
  text: "A live-room regression enemy used to verify phone battle inventory windows.",
  severity: 1,
  stat: "grit",
  difficulty: 5,
  trophyValue: 1,
  flavor: "A test-only echo wearing the exact shape of a live enemy encounter.",
  defeatReward: { type: "gain_trophy", amount: 1 },
  woundOnLoss: { type: "take_wound", amount: 1 }
} satisfies EnemyThreatCard;

async function startHarness(
  sessionMode: SessionMode,
  randomSequence: number[] = [0, 0, 0, 0]
): Promise<Harness> {
  const sessionId = `matrix-${sessionMode}-${Math.random().toString(36).slice(2, 7)}`;
  const state = createInitialSessionState(sessionId, sessionMode);
  const roomServer = new GameRoomServer(state, [], createSequenceRandomSource(randomSequence));
  roomServer.setHostToken(createHostToken({ sessionId, secret: "tv-host" }));
  const server = new WebSocketServer({ port: 0 });

  roomServer.attach(server);
  await once(server, "listening");

  return {
    roomServer,
    server,
    port: (server.address() as AddressInfo).port
  };
}

async function connectClient(url: string): Promise<SocketProbe> {
  const socket = new WebSocket(url);
  const probe = new SocketProbe(socket);
  await once(socket, "open");
  return probe;
}

async function waitForServerTick(delayMs = 25): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function continueVisibleResolution(harness: Harness, phones: SocketProbe[]): Promise<void> {
  for (let index = 0; index < 4; index += 1) {
    const state = harness.roomServer.getState();
    const activeResolution = state.activeResolution;

    if (
      !activeResolution ||
      !["roll_result", "outcome_summary", "awaiting_continue"].includes(activeResolution.stage)
    ) {
      return;
    }

    const continuingSeatId = state.turnOrder[state.activeSeatIndex] ?? activeResolution.playerId;
    const phoneIndex = state.seats.findIndex((seat) => seat.seatId === continuingSeatId);
    phones[phoneIndex]?.socket.send(
      JSON.stringify({
        type: "CONTINUE_RESOLUTION",
        seatId: continuingSeatId
      })
    );
    await waitForServerTick();
  }
}

function isStatePatch(message: ServerEnvelope): message is Extract<ServerEnvelope, { type: "STATE_PATCH" }> {
  return message.type === "STATE_PATCH";
}

function getPhonePayload(message: ServerEnvelope): PhonePatchPayload {
  if (!isStatePatch(message)) {
    throw new Error(`Expected STATE_PATCH, received ${message.type}`);
  }

  return message.payload as unknown as PhonePatchPayload;
}

function isPhonePatch(message: ServerEnvelope): message is Extract<ServerEnvelope, { type: "STATE_PATCH" }> {
  return isStatePatch(message) && Object.hasOwn(message.payload, "self");
}

function broadcastHarnessPatch(harness: Harness): void {
  (harness.roomServer as unknown as BroadcastableRoomServer).broadcastPatch();
}

function statePatchForActiveTurnLength(length: number): (message: ServerEnvelope) => boolean {
  return (message) =>
    isStatePatch(message) &&
    message.payload.status === "active" &&
    Array.isArray(message.payload.turnOrder) &&
    message.payload.turnOrder.length === length;
}

function getFirstNeighborForSeat(state: GameState, seatId: string): string {
  const player = state.players.find((entry) => entry.seatId === seatId);
  const sector = state.sectors.find((entry) => entry.id === player?.character.currentSpaceId);
  const neighbor = sector?.neighbors[0];

  if (!neighbor) {
    throw new Error(`Missing neighbor for ${seatId}`);
  }

  return neighbor;
}

function seedBattleInventoryWindow(harness: Harness): void {
  const state = harness.roomServer.getState();
  const player = state.players.find((entry) => entry.seatId === "seat-1");
  const fuse = loadGear().get("black-route-fuse");

  if (!player || !fuse) {
    throw new Error("Battle inventory regression setup failed");
  }

  player.character.heldGear = [
    fuse,
    ...player.character.heldGear.filter((item) => item.id !== fuse.id)
  ];
  player.character.heat = Math.max(player.character.heat, fuse.heatCost ?? 0);
  state.phase = "action";
  state.currentEncounter = matrixBattleThreat;
  state.pendingEnemyRoll = null;
  state.pendingEffect = null;
  state.activeResolution = {
    id: "seat-1:threat:matrix-battle-echo:test",
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    card: {
      id: matrixBattleThreat.id,
      title: matrixBattleThreat.title,
      type: matrixBattleThreat.cardType,
      flavor: matrixBattleThreat.flavor,
      artType: "threat"
    }
  };
}

describe("player count integration matrix", () => {
  let harness: Harness | null = null;
  let probes: SocketProbe[] = [];

  afterEach(async () => {
    for (const probe of probes) {
      probe.close();
    }

    probes = [];

    if (harness) {
      await new Promise<void>((resolve, reject) => {
        harness!.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    harness = null;
  });

  it.each([
    { playerCount: 1, sessionMode: "single-player" as const },
    { playerCount: 2, sessionMode: "multiplayer" as const },
    { playerCount: 3, sessionMode: "multiplayer" as const },
    { playerCount: 4, sessionMode: "multiplayer" as const },
    { playerCount: 5, sessionMode: "multiplayer" as const },
    { playerCount: 6, sessionMode: "multiplayer" as const }
  ])(
    "supports lobby creation, joining, actions, turns, and disconnect handling for $playerCount player(s)",
    async ({ playerCount, sessionMode }) => {
      harness = await startHarness(sessionMode);

      const joinResults = Array.from({ length: playerCount }, (_, index) =>
        harness!.roomServer.joinSeat(`Player ${index + 1}`, joinChoices[index % joinChoices.length]!)
      );

      const phones = await Promise.all(
        joinResults.map((joinResult) => connectClient(`ws://127.0.0.1:${harness!.port}/?view=phone&token=${joinResult.seatToken}`))
      );
      probes.push(...phones);

      await Promise.all(phones.map((phone) => phone.waitFor((message) => isStatePatch(message) && Object.hasOwn(message.payload, "self"))));

      for (const joinResult of joinResults) {
        harness.roomServer.setSeatReady(joinResult.seatId, true);
      }

      harness.roomServer.startSession();

      const startedPatch = (await phones[0]!.waitFor(statePatchForActiveTurnLength(playerCount))) as Extract<
        ServerEnvelope,
        { type: "STATE_PATCH" }
      >;
      expect(startedPatch.payload.status).toBe("active");
      expect(startedPatch.payload.sessionMode).toBe(playerCount === 1 ? "single-player" : "multiplayer");
      expect(startedPatch.payload.turnOrder).toHaveLength(playerCount);

      if (playerCount > 1) {
        phones[1]!.socket.send(
          JSON.stringify({
            type: "PHASE_ADVANCED",
            seatId: "seat-2",
            toPhase: "resolution"
          })
        );

        const rejection = await phones[1]!.waitFor(
          (message) => message.type === "INTENT_REJECTED" && message.actionType === "PHASE_ADVANCED"
        );
        expect("reason" in rejection ? rejection.reason : "").toContain("outside its turn");
      }

      const moveTarget = getFirstNeighborForSeat(harness.roomServer.getState(), "seat-1");

      phones[0]!.socket.send(
        JSON.stringify({
          type: "MOVE_REQUESTED",
          seatId: "seat-1",
          toSectorId: moveTarget
        })
      );

      await waitForServerTick();
      await continueVisibleResolution(harness, phones);

      phones[0]!.socket.send(
        JSON.stringify({
          type: "PHASE_ADVANCED",
          seatId: "seat-1",
          toPhase: "resolution"
        })
      );

      await waitForServerTick();
      await continueVisibleResolution(harness, phones);

      expect(harness.roomServer.getState().status).toBe("active");
      expect(harness.roomServer.getState().turnOrder).toHaveLength(playerCount);
      expect(harness.roomServer.getState().activeSeatIndex).toBe(playerCount === 1 ? 0 : 1);

      phones[playerCount - 1]!.socket.terminate();
      await waitForServerTick(50);

      expect(harness.roomServer.getState().seats[playerCount - 1]?.connected).toBe(false);
    }
  );

  it("rejects a seventh join once the six-seat multiplayer lobby is full", async () => {
    harness = await startHarness("multiplayer");

    for (let joined = 0; joined < 6; joined += 1) {
      const seat = harness.roomServer.joinSeat(`Player ${joined + 1}`, joinChoices[joined]!);
      expect(seat.seatId).toBe(`seat-${joined + 1}`);
    }

    expect(() => harness!.roomServer.joinSeat("Player 7", joinChoices[0]!)).toThrow("No open seats remain");
  });

  it.each([
    { playerCount: 1, sessionMode: "single-player" as const },
    { playerCount: 2, sessionMode: "multiplayer" as const },
    { playerCount: 6, sessionMode: "multiplayer" as const }
  ])(
    "surfaces battle inventory assist through live phone patches for $playerCount player(s)",
    async ({ playerCount, sessionMode }) => {
      harness = await startHarness(sessionMode);

      const joinResults = Array.from({ length: playerCount }, (_, index) =>
        harness!.roomServer.joinSeat(`Player ${index + 1}`, joinChoices[index % joinChoices.length]!)
      );
      const phones = await Promise.all(
        joinResults.map((joinResult) => connectClient(`ws://127.0.0.1:${harness!.port}/?view=phone&token=${joinResult.seatToken}`))
      );
      probes.push(...phones);

      await Promise.all(phones.map((phone) => phone.waitFor(isPhonePatch)));

      for (const joinResult of joinResults) {
        harness.roomServer.setSeatReady(joinResult.seatId, true);
      }

      harness.roomServer.startSession();
      await phones[0]!.waitFor(statePatchForActiveTurnLength(playerCount));

      seedBattleInventoryWindow(harness);
      broadcastHarnessPatch(harness);

      const battleWindowPatch = await phones[0]!.waitFor((message) => {
        if (!isPhonePatch(message)) {
          return false;
        }

        const payload = getPhonePayload(message);
        return payload.phase === "action" && payload.activeResolution?.card?.id === matrixBattleThreat.id;
      });
      const battleWindowPayload = getPhonePayload(battleWindowPatch);
      const inventoryCards = getInventoryCards(battleWindowPayload);
      const blackRouteFuse = inventoryCards.find((card) => card.id === "black-route-fuse");
      const battleAssist = getBattleAssistViewModel(battleWindowPayload);
      const publicActivePlayer = battleWindowPayload.players.find((player) => player.seatId === "seat-1");

      expect(blackRouteFuse?.status).toBe("Usable now");
      expect(blackRouteFuse?.useIntent).toEqual({ type: "USE_GEAR", gearId: "black-route-fuse" });
      expect(battleAssist?.enemyName).toBe(matrixBattleThreat.enemyName);
      expect(battleAssist?.enemyBattleValue).toBe(matrixBattleThreat.difficulty);
      expect(battleAssist?.currentTimingWindow).toBe("beforeBattleRoll");
      expect(battleAssist?.usableCards.map((card) => card.id)).toContain("black-route-fuse");
      expect(publicActivePlayer?.character.heldGearCount).toBeGreaterThan(0);
      expect(Object.hasOwn(publicActivePlayer?.character ?? {}, "heldGear")).toBe(false);

      for (const otherPhone of phones.slice(1)) {
        const otherPatch = await otherPhone.waitFor((message) => {
          if (!isPhonePatch(message)) {
            return false;
          }

          const payload = getPhonePayload(message);
          return payload.activeResolution?.card?.id === matrixBattleThreat.id;
        });

        expect(getBattleAssistViewModel(getPhonePayload(otherPatch))).toBeNull();
      }

      phones[0]!.socket.send(
        JSON.stringify({
          type: "USE_GEAR",
          seatId: "seat-1",
          gearId: "black-route-fuse"
        })
      );

      const gearUsePatch = await phones[0]!.waitFor((message) => {
        if (!isPhonePatch(message)) {
          return false;
        }

        const payload = getPhonePayload(message);
        return payload.outcomeSummary?.encounterTitle === "Black Route Fuse";
      });
      const gearUsePayload = getPhonePayload(gearUsePatch);

      expect(gearUsePayload.self?.character.heldGear.some((item) => item.id === "black-route-fuse")).toBe(false);
      expect(gearUsePayload.outcomeSummary?.summary).toContain("Black Route Fuse used");
      expect(harness.roomServer.getState().eventLog.some((entry) => {
        const maybeEntry = entry as { type?: unknown; gearId?: unknown };
        return maybeEntry.type === "USE_GEAR" && maybeEntry.gearId === "black-route-fuse";
      })).toBe(true);

      phones[0]!.socket.send(
        JSON.stringify({
          type: "COMBAT_REQUESTED",
          seatId: "seat-1",
          stat: matrixBattleThreat.stat
        })
      );

      const combatPatch = await phones[0]!.waitFor((message) => {
        if (!isPhonePatch(message)) {
          return false;
        }

        const payload = getPhonePayload(message);
        return (
          payload.activeResolution?.battle?.enemyName === matrixBattleThreat.enemyName &&
          (payload.activeResolution.stage === "battle_setup" ||
            payload.activeResolution.stage === "dice_roll" ||
            Boolean(payload.activeResolution.roll))
        );
      });
      let combatPayload = getPhonePayload(combatPatch);

      if (combatPayload.activeResolution?.stage === "battle_setup" && !combatPayload.activeResolution.roll) {
        phones[0]!.socket.send(
          JSON.stringify({
            type: "COMBAT_REQUESTED",
            seatId: "seat-1",
            stat: matrixBattleThreat.stat
          })
        );

        const rollStartedPatch = await phones[0]!.waitFor((message) => {
          if (!isPhonePatch(message)) {
            return false;
          }

          const payload = getPhonePayload(message);
          return (
            payload.activeResolution?.battle?.enemyName === matrixBattleThreat.enemyName &&
            (Boolean(payload.pendingEnemyRoll) || Boolean(payload.activeResolution.roll))
          );
        });
        combatPayload = getPhonePayload(rollStartedPatch);
      }

      expect(getBattleAssistViewModel(combatPayload)?.enemyName).toBe(matrixBattleThreat.enemyName);

      if (playerCount > 1) {
        const pendingEnemyRoll = combatPayload.pendingEnemyRoll ?? harness.roomServer.getState().pendingEnemyRoll;

        expect(pendingEnemyRoll?.fighterSeatId).toBe("seat-1");
        expect(pendingEnemyRoll?.assignedRollerSeatId).not.toBe("seat-1");

        const rollerIndex = joinResults.findIndex((joinResult) => joinResult.seatId === pendingEnemyRoll?.assignedRollerSeatId);
        phones[rollerIndex]!.socket.send(
          JSON.stringify({
            type: "ENEMY_ROLL_REQUESTED",
            seatId: pendingEnemyRoll!.assignedRollerSeatId
          })
        );
      }

      const rolledPatch = await phones[0]!.waitFor((message) => {
        if (!isPhonePatch(message)) {
          return false;
        }

        const roll = getPhonePayload(message).activeResolution?.roll;
        return Array.isArray(roll?.dice) && roll.dice.length === 2;
      });
      const rollResolution = getPhonePayload(rolledPatch).activeResolution;

      expect(rollResolution?.battle?.enemyName).toBe(matrixBattleThreat.enemyName);
      expect(rollResolution?.roll?.dice).toHaveLength(2);
      expect(typeof rollResolution?.roll?.finalTotal).toBe("number");
      expect(typeof rollResolution?.roll?.target).toBe("number");
      expect(typeof rollResolution?.roll?.success).toBe("boolean");
    }
  );
});
