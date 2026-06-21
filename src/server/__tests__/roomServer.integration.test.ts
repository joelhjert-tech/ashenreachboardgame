import { once } from "node:events";
import type { AddressInfo } from "node:net";
import WebSocket, { WebSocketServer } from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { createCharacters } from "../../game/engine/__tests__/testData.js";
import type { ClientIntent } from "../../game/engine/actions.js";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import type { Character } from "../../game/schema/character.schema.js";
import type { ContractCard } from "../../game/schema/contract.schema.js";
import type { GearItem } from "../../game/schema/gear.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { createHostToken, createJoinToken } from "../auth.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

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
    }
  | {
      type: "REJOIN_ACCEPTED";
      sessionId: string;
      seatId: string;
    }
  | {
      type: "REJOIN_REJECTED";
      sessionId: string;
      reason: string;
    };

type ClientSocketMessage =
  | ClientIntent
  | {
      type: "REJOIN";
      sessionId: string;
      seatToken: string;
    }
  | {
      type: "KICK_SEAT";
      targetSeatId: string;
    }
  | {
      type: "RESTART_SESSION";
    };

function cloneCharacter(character: Character | undefined): Character {
  if (!character) {
    throw new Error("Missing character fixture");
  }

  return {
    ...character,
    activeContract: character.activeContract ? { ...character.activeContract } : null,
    heldGear: [...character.heldGear],
    equippedGear: { ...character.equippedGear },
    abilities: [...character.abilities],
    scars: [...character.scars]
  };
}

function createGear(): Map<string, GearItem> {
  return new Map<string, GearItem>([
    [
      "marshal-seal",
      {
        id: "marshal-seal",
        name: "Marshal Seal",
        slot: "utility",
        statBonus: { stat: "command", amount: 1 }
      }
    ],
    [
      "tuning-spines",
      {
        id: "tuning-spines",
        name: "Tuning Spines",
        slot: "utility",
        statBonus: { stat: "signal", amount: 1 }
      }
    ],
    [
      "coffin-rig",
      {
        id: "coffin-rig",
        name: "Coffin Rig",
        slot: "armor",
        statBonus: { stat: "forge", amount: 1 }
      }
    ],
    [
      "veil-hook",
      {
        id: "veil-hook",
        name: "Veil Hook",
        slot: "weapon",
        statBonus: { stat: "grit", amount: 1 }
      }
    ]
  ]);
}

function createThreats(): Map<string, ThreatCard> {
  return new Map<string, ThreatCard>([
    [
      "ash-static-1",
      {
        id: "ash-static-1",
        type: "threat",
        cardType: "hazard",
        title: "Ash Static",
        text: "Loose relay sparks jump the rail bed and turn every waypoint into a false positive.",
        flavor: "The path hums wrong before it breaks.",
        severity: 1,
        stat: "signal",
        difficulty: 7,
        successEffect: {
          type: "gain_note",
          text: "You tagged the clean band before the static folded back in."
        },
        failEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ],
    [
      "ash-static-2",
      {
        id: "ash-static-2",
        type: "threat",
        cardType: "hazard",
        title: "Ash Echo",
        text: "A burst of mirrored signals drags your attention off the safe line and toward a watchful ruin.",
        flavor: "Even the warning lights lie here.",
        severity: 1,
        stat: "signal",
        difficulty: 7,
        successEffect: {
          type: "gain_note",
          text: "You caught the false cadence and marked a safer route."
        },
        failEffect: {
          type: "gain_heat",
          amount: 1
        }
      }
    ],
    [
      "hook-runner",
      {
        id: "hook-runner",
        type: "threat",
        cardType: "enemy",
        title: "Hook Runner",
        enemyName: "Hook Runner",
        text: "A lane skimmer cuts in low and swings a hooked blade from the ash haze.",
        flavor: "It commits the instant it smells hesitation.",
        severity: 2,
        stat: "grit",
        difficulty: 6,
        defeatReward: {
          type: "gainGear",
          gearId: "veil-hook"
        },
        woundOnLoss: {
          type: "take_wound",
          amount: 1
        }
      }
    ],
    [
      "rail-maw",
      {
        id: "rail-maw",
        type: "threat",
        cardType: "enemy",
        title: "Rail Maw",
        enemyName: "Rail Maw",
        text: "A plated scavenger beast bursts from beneath the cinders and snaps at anything carrying fresh charge.",
        flavor: "The ground bulges half a breath before the strike.",
        severity: 2,
        stat: "grit",
        difficulty: 6,
        defeatReward: {
          type: "gain_note",
          text: "You charted the beast's burrow vents for the next pass."
        },
        woundOnLoss: {
          type: "take_wound",
          amount: 1
        }
      }
    ]
  ]);
}

function createContracts(): Map<string, ContractCard> {
  return new Map<string, ContractCard>([
    [
      "choir-quietus",
      {
        id: "choir-quietus",
        name: "Quietus Ledger",
        factionGiver: "Glass Choir",
        text: "The Choir will scrub one mark from your trail if you silence a single hunter on their listening road.",
        objective: { type: "defeatCount", target: 1 },
        reward: { type: "reduceHeat", amount: 1 }
      }
    ]
  ]);
}

function createState(overrides: Partial<GameState> = {}): GameState {
  const characters = createCharacters();
  const availableContracts = [...createContracts().values()];
  const sectorIds = [
    "seat-1-start",
    "seat-2-start",
    "seat-3-start",
    "hazard-east",
    "hazard-west",
    "enemy-yard",
    "contract-hunt"
  ];

  const neighbors = sectorIds;

  return {
    sessionId: "session-alpha",
    status: "active",
    winnerSeatId: null,
    phase: "navigation",
    resolutionSource: null,
    activeSeatIndex: 0,
    turnOrder: ["seat-1", "seat-2", "seat-3"],
    heatThreshold: 2,
    sequence: 0,
    escalationLevel: 0,
    sectors: [
      {
        id: "seat-1-start",
        name: "Gloam Spur",
        regionTier: "borderlight",
        neighbors,
        danger: 1,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "seat-2-start",
        name: "Shard Bypass",
        regionTier: "borderlight",
        neighbors,
        danger: 1,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "seat-3-start",
        name: "Mourn Lift",
        regionTier: "borderlight",
        neighbors,
        danger: 1,
        encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "hazard-east",
        name: "Hazard East",
        regionTier: "borderlight",
        neighbors,
        danger: 2,
        encounterDecks: { threat: ["ash-static-1"], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "hazard-west",
        name: "Hazard West",
        regionTier: "borderlight",
        neighbors,
        danger: 2,
        encounterDecks: { threat: ["ash-static-2"], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "enemy-yard",
        name: "Enemy Yard",
        regionTier: "borderlight",
        neighbors,
        danger: 3,
        encounterDecks: { threat: ["hook-runner"], anomaly: [], contract: [], artifact: [], escalation: [] }
      },
      {
        id: "contract-hunt",
        name: "Contract Hunt",
        regionTier: "borderlight",
        neighbors,
        danger: 3,
        encounterDecks: { threat: ["rail-maw"], anomaly: [], contract: [], artifact: [], escalation: [] }
      }
    ],
    seats: [
      {
        seatId: "seat-1",
        characterId: "void-marshal",
        displayName: "Seat One",
        connected: false,
        kicked: false,
        joinToken: createJoinToken({ sessionId: "session-alpha", seatId: "seat-1" })
      },
      {
        seatId: "seat-2",
        characterId: "signal-witch",
        displayName: "Seat Two",
        connected: false,
        kicked: false,
        joinToken: createJoinToken({ sessionId: "session-alpha", seatId: "seat-2" })
      },
      {
        seatId: "seat-3",
        characterId: "grave-engineer",
        displayName: "Seat Three",
        connected: false,
        kicked: false,
        joinToken: createJoinToken({ sessionId: "session-alpha", seatId: "seat-3" })
      }
    ],
    players: [
      {
        seatId: "seat-1",
        sectorId: "seat-1-start",
        private: { hand: ["route-slate"], notes: ["Watch the east lane."] },
        character: {
          ...cloneCharacter(characters.get("void-marshal")),
          currentSpaceId: "seat-1-start"
        }
      },
      {
        seatId: "seat-2",
        sectorId: "seat-2-start",
        private: { hand: ["coil-map"], notes: ["Find a clean strike lane."] },
        character: {
          ...cloneCharacter(characters.get("signal-witch")),
          currentSpaceId: "seat-2-start"
        }
      },
      {
        seatId: "seat-3",
        sectorId: "seat-3-start",
        private: { hand: ["choir-token"], notes: ["Take the Choir's contract when the path opens."] },
        character: {
          ...cloneCharacter(characters.get("grave-engineer")),
          currentSpaceId: "seat-3-start",
          heat: 1
        }
      }
    ],
    availableContracts,
    eventLog: [],
    currentEncounter: null,
    pendingEnemyRoll: null,
    pendingEffect: null,
    lastOutcomeSummary: null,
    ...overrides
  };
}

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

  mark(): number {
    return this.messages.length;
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
      const timer = setTimeout(() => {
        this.waiters.delete(waiter);
        reject(new Error("Timed out waiting for socket message"));
      }, timeoutMs);

      const waiter = { predicate, resolve, reject, timer };
      this.waiters.add(waiter);
    });
  }

  async waitForSince(
    startIndex: number,
    predicate: (message: ServerEnvelope) => boolean,
    timeoutMs = 4000
  ): Promise<ServerEnvelope> {
    return await this.waitFor((message, index) => index >= startIndex && predicate(message), timeoutMs);
  }

  send(message: ClientSocketMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  close(): void {
    this.socket.terminate();
  }
}

interface Harness {
  roomServer: GameRoomServer;
  server: WebSocketServer;
  port: number;
  hostToken: string;
}

async function startHarness(
  randomSequence: number[] = [0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 5, 5],
  state: GameState = createState()
): Promise<Harness> {
  const hostToken = createHostToken({ sessionId: state.sessionId, secret: "tv-host" });
  const roomServer = new GameRoomServer(
    state,
    [],
    createSequenceRandomSource(randomSequence),
    createThreats(),
    createCharacters(),
    createGear(),
    createContracts()
  );
  roomServer.setHostToken(hostToken);
  const server = new WebSocketServer({ port: 0 });

  roomServer.attach(server);
  await once(server, "listening");

  return {
    roomServer,
    server,
    port: (server.address() as AddressInfo).port,
    hostToken
  };
}

async function connectClient(url: string): Promise<SocketProbe> {
  const socket = new WebSocket(url);
  const probe = new SocketProbe(socket);

  await once(socket, "open");

  return probe;
}

async function waitForClose(socket: WebSocket, timeoutMs = 4000): Promise<[number, Buffer]> {
  socket.on("error", () => {});

  return await new Promise<[number, Buffer]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for socket close")), timeoutMs);

    socket.once("close", (code, reason) => {
      clearTimeout(timer);
      resolve([code, reason]);
    });
  });
}

async function waitForServerTick(delayMs = 25): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function stopHarness(harness: Harness | null, probes: SocketProbe[]): Promise<void> {
  for (const probe of probes) {
    probe.close();
  }

  if (harness) {
    await new Promise<void>((resolve, reject) => {
      harness.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

function isStatePatch(message: ServerEnvelope): message is Extract<ServerEnvelope, { type: "STATE_PATCH" }> {
  return message.type === "STATE_PATCH";
}

function isIntentRejected(message: ServerEnvelope): message is Extract<ServerEnvelope, { type: "INTENT_REJECTED" }> {
  return message.type === "INTENT_REJECTED";
}

function isRejoinAccepted(message: ServerEnvelope): message is Extract<ServerEnvelope, { type: "REJOIN_ACCEPTED" }> {
  return message.type === "REJOIN_ACCEPTED";
}

function isRejoinRejected(message: ServerEnvelope): message is Extract<ServerEnvelope, { type: "REJOIN_REJECTED" }> {
  return message.type === "REJOIN_REJECTED";
}

function statePatchForPhase(
  phase: GameState["phase"],
  activeSeatIndex?: number
): (message: ServerEnvelope) => boolean {
  return (message) =>
    isStatePatch(message) &&
    message.phase === phase &&
    (activeSeatIndex === undefined || Number(message.payload.activeSeatIndex) === activeSeatIndex);
}

function statePatchWithSeatConnection(seatId: string, connected: boolean): (message: ServerEnvelope) => boolean {
  return (message) =>
    isStatePatch(message) &&
    Array.isArray(message.payload.seats) &&
    message.payload.seats.some(
      (seat) =>
        typeof seat === "object" &&
        seat !== null &&
        "seatId" in seat &&
        "connected" in seat &&
        seat.seatId === seatId &&
        seat.connected === connected
    );
}

function statePatchWithSeatKick(seatId: string, kicked: boolean): (message: ServerEnvelope) => boolean {
  return (message) =>
    isStatePatch(message) &&
    Array.isArray(message.payload.seats) &&
    message.payload.seats.some(
      (seat) =>
        typeof seat === "object" &&
        seat !== null &&
        "seatId" in seat &&
        "kicked" in seat &&
        seat.seatId === seatId &&
        seat.kicked === kicked
    );
}

function statePatchWithStatus(status: string, winnerSeatId?: string | null): (message: ServerEnvelope) => boolean {
  return (message) =>
    isStatePatch(message) &&
    message.payload.status === status &&
    (winnerSeatId === undefined || message.payload.winnerSeatId === winnerSeatId);
}

function statePatchWithPendingEnemyRoll(
  fighterSeatId: string,
  assignedRollerSeatId?: string
): (message: ServerEnvelope) => boolean {
  return (message) =>
    isStatePatch(message) &&
    typeof message.payload.pendingEnemyRoll === "object" &&
    message.payload.pendingEnemyRoll !== null &&
    "fighterSeatId" in message.payload.pendingEnemyRoll &&
    "assignedRollerSeatId" in message.payload.pendingEnemyRoll &&
    message.payload.pendingEnemyRoll.fighterSeatId === fighterSeatId &&
    (assignedRollerSeatId === undefined ||
      message.payload.pendingEnemyRoll.assignedRollerSeatId === assignedRollerSeatId);
}

function statePatchWithOpposedOutcome(seatId: string): (message: ServerEnvelope) => boolean {
  return (message) =>
    isStatePatch(message) &&
    typeof message.payload.outcomeSummary === "object" &&
    message.payload.outcomeSummary !== null &&
    "seatId" in message.payload.outcomeSummary &&
    "enemyDie1" in message.payload.outcomeSummary &&
    "enemyDie2" in message.payload.outcomeSummary &&
    "enemyTotal" in message.payload.outcomeSummary &&
    message.payload.outcomeSummary.seatId === seatId &&
    message.payload.outcomeSummary.enemyDie1 !== null &&
    message.payload.outcomeSummary.enemyDie2 !== null &&
    message.payload.outcomeSummary.enemyTotal !== null;
}

function getSeatConnectionFromPatch(message: Extract<ServerEnvelope, { type: "STATE_PATCH" }>, seatId: string): boolean | null {
  const seats = Array.isArray(message.payload.seats) ? message.payload.seats : [];
  const seat = seats.find(
    (entry) =>
      typeof entry === "object" && entry !== null && "seatId" in entry && "connected" in entry && entry.seatId === seatId
  );

  return seat && typeof seat.connected === "boolean" ? seat.connected : null;
}

function getSelfCharacterFromPatch(message: Extract<ServerEnvelope, { type: "STATE_PATCH" }>) {
  const self = message.payload.self;

  if (!self || typeof self !== "object" || !("character" in self)) {
    return null;
  }

  return self.character as {
    id: string;
    heat: number;
    activeContract: { contractId: string; progress: number } | null;
    heldGear: Array<{ id: string }>;
    equippedGear: { weapon: string | null; armor: string | null; utility: string | null };
    status: string;
  };
}

function getSeatFromPatch(message: Extract<ServerEnvelope, { type: "STATE_PATCH" }>, seatId: string) {
  const seats = Array.isArray(message.payload.seats) ? message.payload.seats : [];
  const seat = seats.find(
    (entry) => typeof entry === "object" && entry !== null && "seatId" in entry && entry.seatId === seatId
  );

  return seat as
    | {
        seatId: string;
        characterId: string;
        displayName: string | null;
        connected: boolean;
      }
    | undefined;
}

describe("roomServer websocket integration", () => {
  let harness: Harness | null = null;
  const probes: SocketProbe[] = [];

  afterEach(async () => {
    await stopHarness(harness, probes);
    harness = null;
    probes.length = 0;
  });

  it("rejects missing and invalid join tokens before session state changes", async () => {
    harness = await startHarness();

    const missingTokenSocket = new WebSocket(`ws://127.0.0.1:${harness.port}/?view=phone`);
    const invalidTokenSocket = new WebSocket(`ws://127.0.0.1:${harness.port}/?view=phone&token=seat:wrong-session:seat-1`);

    const [[missingCode, missingReason], [invalidCode, invalidReason]] = await Promise.all([
      waitForClose(missingTokenSocket),
      waitForClose(invalidTokenSocket)
    ]);

    expect(missingCode).toBe(4001);
    expect(String(missingReason)).toContain("Missing join token");
    expect(invalidCode).toBe(4002);
    expect(String(invalidReason)).toContain("Invalid join token");
    expect(harness.roomServer.getState().sequence).toBe(0);
  }, 10000);

  it("keeps the chosen character aligned between seat state, player state, and phone snapshots after joining", async () => {
    harness = await startHarness([0, 0, 0, 0], createInitialSessionState("session-alpha"));

    const joinResult = harness.roomServer.joinSeat("Joel", "signal-witch");
    const joinedSeat = harness.roomServer.getState().seats.find((seat) => seat.seatId === joinResult.seatId);
    const joinedPlayer = harness.roomServer.getState().players.find((player) => player.seatId === joinResult.seatId);

    expect(joinedSeat?.characterId).toBe("signal-witch");
    expect(joinedSeat?.displayName).toBe("Joel");
    expect(joinedPlayer?.character.id).toBe("signal-witch");

    const phone = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&token=${joinResult.seatToken}`);
    probes.push(phone);

    const snapshot = (await phone.waitFor(
      (message) => isStatePatch(message) && Object.hasOwn(message.payload, "self")
    )) as Extract<ServerEnvelope, { type: "STATE_PATCH" }>;

    const snapshotSeat = getSeatFromPatch(snapshot, joinResult.seatId);
    const snapshotSelf = getSelfCharacterFromPatch(snapshot);

    expect(snapshotSeat?.characterId).toBe("signal-witch");
    expect(snapshotSeat?.displayName).toBe("Joel");
    expect(snapshotSelf?.id).toBe("signal-witch");
  });

  it("starts a single-player session with one joined seat", async () => {
    harness = await startHarness([0, 0, 0, 0], createInitialSessionState("session-alpha"));

    const joinResult = harness.roomServer.joinSeat("Solo", "signal-witch");
    const phone = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&token=${joinResult.seatToken}`);
    probes.push(phone);

    await phone.waitFor((message) => isStatePatch(message) && Object.hasOwn(message.payload, "self"));

    harness.roomServer.startSession();

    const startedSnapshot = (await phone.waitFor(
      (message) =>
        isStatePatch(message) &&
        message.payload.status === "active" &&
        Array.isArray(message.payload.turnOrder) &&
        message.payload.turnOrder.length === 1
    )) as Extract<ServerEnvelope, { type: "STATE_PATCH" }>;

    expect(startedSnapshot.phase).toBe("navigation");
    expect(startedSnapshot.payload.status).toBe("active");
    expect(startedSnapshot.payload.turnOrder).toEqual(["seat-1"]);
    expect(Number(startedSnapshot.payload.activeSeatIndex)).toBe(0);
  });

  it("drives a full multi-seat session through real socket intents and public/private patches", async () => {
    harness = await startHarness([
      0, 0, 0, 0, 0,
      5, 5, 5, 5, 5, 5, 5,
      0, 0, 0, 0, 0, 0, 0, 0,
      5, 5, 5, 5, 5, 5, 5, 5,
      0, 0, 0, 0, 0, 0
    ]);

    const tv = await connectClient(`ws://127.0.0.1:${harness.port}/?view=tv`);
    const phone1 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-1" })}`
    );
    const phone2 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-2" })}`
    );
    const phone3 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-3" })}`
    );

    probes.push(tv, phone1, phone2, phone3);

    const initialPhone1 = await phone1.waitFor(statePatchForPhase("navigation", 0));
    const initialPhone2 = await phone2.waitFor(statePatchForPhase("navigation", 0));
    const initialPhone3 = await phone3.waitFor(statePatchForPhase("navigation", 0));

    expect(isStatePatch(initialPhone1) && Object.hasOwn(initialPhone1.payload, "self")).toBe(true);
    expect(isStatePatch(initialPhone2) && Object.hasOwn(initialPhone2.payload, "self")).toBe(true);
    expect(isStatePatch(initialPhone3) && Object.hasOwn(initialPhone3.payload, "self")).toBe(true);

    const rejectionMarker = phone2.mark();
    phone2.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "enemy-yard"
    });
    const rejection = await phone2.waitForSince(
      rejectionMarker,
      (message) => message.type === "INTENT_REJECTED" && message.actionType === "MOVE_REQUESTED"
    );
    expect(isIntentRejected(rejection) && rejection.reason).toContain("outside its turn");

    let marker = tv.mark();
    phone1.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "hazard-east"
    });
    await tv.waitForSince(marker, statePatchForPhase("action", 0));

    marker = tv.mark();
    const phone1CheckMarker = phone1.mark();
    const phone2CheckMarker = phone2.mark();
    const phone3CheckMarker = phone3.mark();
    phone1.send({
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });
    await tv.waitForSince(marker, statePatchForPhase("navigation", 1));

    const phone1PostCheck = phone1.messages
      .slice(phone1CheckMarker)
      .find((message) => isStatePatch(message) && Object.hasOwn(message.payload, "self")) as
      | Extract<ServerEnvelope, { type: "STATE_PATCH" }>
      | undefined;
    expect(phone1PostCheck ? Object.hasOwn(phone1PostCheck.payload, "self") : false).toBe(true);
    expect(phone1.messages.slice(phone1CheckMarker).some((message) => message.type === "INTENT_REJECTED")).toBe(false);
    expect(
      phone2.messages
        .slice(phone2CheckMarker)
        .every(
          (message) =>
            !isStatePatch(message) ||
            ((message.payload.self as { seatId?: string } | undefined)?.seatId ?? "seat-2") === "seat-2"
        )
    ).toBe(true);
    expect(
      phone3.messages
        .slice(phone3CheckMarker)
        .every(
          (message) =>
            !isStatePatch(message) ||
            ((message.payload.self as { seatId?: string } | undefined)?.seatId ?? "seat-3") === "seat-3"
        )
    ).toBe(true);

    marker = tv.mark();
    phone2.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "enemy-yard"
    });
    await tv.waitForSince(marker, statePatchForPhase("action", 1));

    marker = tv.mark();
    const phone2CombatMarker = phone2.mark();
    const phone1CombatMarker = phone1.mark();
    const phone3CombatMarker = phone3.mark();
    phone2.send({
      type: "COMBAT_REQUESTED",
      seatId: "seat-2",
      stat: "grit"
    });
    await tv.waitForSince(marker, statePatchWithPendingEnemyRoll("seat-2"));
    const assignedSeat2EnemyRoller = harness.roomServer.getState().pendingEnemyRoll?.assignedRollerSeatId;
    const assignedSeat2Probe =
      assignedSeat2EnemyRoller === "seat-1" ? phone1 : assignedSeat2EnemyRoller === "seat-3" ? phone3 : null;
    expect(assignedSeat2Probe).not.toBeNull();
    const assignedSeat2Marker = assignedSeat2Probe!.mark();
    assignedSeat2Probe!.send({
      type: "ENEMY_ROLL_REQUESTED",
      seatId: assignedSeat2EnemyRoller!
    });
    const assignedSeat2Result = await assignedSeat2Probe!.waitForSince(
      assignedSeat2Marker,
      (message) => isIntentRejected(message) || statePatchWithOpposedOutcome("seat-2")(message)
    );
    if (isIntentRejected(assignedSeat2Result)) {
      throw new Error(`Assigned enemy roller was rejected: ${assignedSeat2Result.reason}`);
    }
    await waitForServerTick();
    expect(harness.roomServer.getState().activeSeatIndex).toBe(2);
    expect(harness.roomServer.getState().phase).toBe("navigation");

    const phone2CombatPatch = phone2.messages
      .slice(phone2CombatMarker)
      .find((message) => isStatePatch(message) && Object.hasOwn(message.payload, "self")) as
      | Extract<ServerEnvelope, { type: "STATE_PATCH" }>
      | undefined;
    expect(phone2CombatPatch ? Object.hasOwn(phone2CombatPatch.payload, "self") : false).toBe(true);
    expect(
      phone1.messages
        .slice(phone1CombatMarker)
        .every(
          (message) =>
            !isStatePatch(message) ||
            ((message.payload.self as { seatId?: string } | undefined)?.seatId ?? "seat-1") === "seat-1"
        )
    ).toBe(true);
    expect(
      phone3.messages
        .slice(phone3CombatMarker)
        .every(
          (message) =>
            !isStatePatch(message) ||
            ((message.payload.self as { seatId?: string } | undefined)?.seatId ?? "seat-3") === "seat-3"
        )
    ).toBe(true);

    marker = tv.mark();
    phone3.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "seat-1-start"
    });
    await tv.waitForSince(marker, statePatchForPhase("action", 2));

    phone3.send({
      type: "ACCEPT_CONTRACT",
      seatId: "seat-3",
      contractId: "choir-quietus"
    });
    marker = tv.mark();
    phone3.send({
      type: "PHASE_ADVANCED",
      seatId: "seat-3",
      toPhase: "resolution"
    });
    await tv.waitForSince(marker, statePatchForPhase("navigation", 0));

    marker = tv.mark();
    phone1.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "hazard-west"
    });
    await tv.waitForSince(marker, statePatchForPhase("action", 0));

    marker = tv.mark();
    phone1.send({
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });
    await tv.waitForSince(marker, statePatchForPhase("navigation", 1));
    const recalledPlayer = harness.roomServer
      .getState()
      .players.find((player) => player.seatId === "seat-1");
    expect(recalledPlayer?.character.status).toBe("recalled");

    marker = tv.mark();
    phone2.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "seat-2-start"
    });
    await tv.waitForSince(marker, statePatchForPhase("action", 1));
    phone2.send({
      type: "EQUIP_GEAR",
      seatId: "seat-2",
      gearId: "veil-hook",
      slot: "weapon"
    });
    marker = tv.mark();
    phone2.send({
      type: "PHASE_ADVANCED",
      seatId: "seat-2",
      toPhase: "resolution"
    });
    await tv.waitForSince(marker, statePatchForPhase("navigation", 2));

    marker = tv.mark();
    phone3.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "contract-hunt"
    });
    await tv.waitForSince(marker, statePatchForPhase("action", 2));

    marker = tv.mark();
    phone3.send({
      type: "COMBAT_REQUESTED",
      seatId: "seat-3",
      stat: "grit"
    });
    await tv.waitForSince(marker, statePatchWithPendingEnemyRoll("seat-3"));
    const assignedSeat3EnemyRoller = harness.roomServer.getState().pendingEnemyRoll?.assignedRollerSeatId;
    const assignedSeat3Probe =
      assignedSeat3EnemyRoller === "seat-1" ? phone1 : assignedSeat3EnemyRoller === "seat-2" ? phone2 : null;
    expect(assignedSeat3Probe).not.toBeNull();
    const assignedSeat3Marker = assignedSeat3Probe!.mark();
    assignedSeat3Probe!.send({
      type: "ENEMY_ROLL_REQUESTED",
      seatId: assignedSeat3EnemyRoller!
    });
    const assignedSeat3Result = await assignedSeat3Probe!.waitForSince(
      assignedSeat3Marker,
      (message) => isIntentRejected(message) || statePatchWithOpposedOutcome("seat-3")(message)
    );
    if (isIntentRejected(assignedSeat3Result)) {
      throw new Error(`Assigned enemy roller was rejected: ${assignedSeat3Result.reason}`);
    }
    await waitForServerTick();
    expect(harness.roomServer.getState().activeSeatIndex).toBe(0);
    expect(harness.roomServer.getState().phase).toBe("action");
    const contractProgress = harness.roomServer
      .getState()
      .players.find((player) => player.seatId === "seat-3")
      ?.character.activeContract;
    expect(contractProgress).toEqual({ contractId: "choir-quietus", progress: 1 });

    marker = tv.mark();
    phone1.send({
      type: "RECRUIT_REPLACEMENT",
      seatId: "seat-1",
      replacementCharacterId: "void-marshal"
    });
    await tv.waitForSince(marker, statePatchForPhase("navigation", 1));
    const replacedPlayer = harness.roomServer
      .getState()
      .players.find((player) => player.seatId === "seat-1");
    expect(replacedPlayer?.character.status).toBe("active");
    expect(replacedPlayer?.character.heat).toBe(0);

    marker = tv.mark();
    phone2.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "seat-3-start"
    });
    await tv.waitForSince(marker, statePatchForPhase("action", 1));
    marker = tv.mark();
    phone2.send({
      type: "PHASE_ADVANCED",
      seatId: "seat-2",
      toPhase: "resolution"
    });
    await tv.waitForSince(marker, statePatchForPhase("navigation", 2));

    marker = tv.mark();
    phone3.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "seat-2-start"
    });
    await tv.waitForSince(marker, statePatchForPhase("action", 2));

    marker = tv.mark();
    phone3.send({
      type: "COMPLETE_CONTRACT",
      seatId: "seat-3",
      contractId: "choir-quietus"
    });
    await tv.waitForSince(marker, statePatchForPhase("navigation", 0));

    const finalState = harness.roomServer.getState();
    const seat2State = finalState.players.find((player) => player.seatId === "seat-2");
    const seat3State = finalState.players.find((player) => player.seatId === "seat-3");

    expect(seat2State?.character.equippedGear.weapon).toBe("veil-hook");
    expect(seat2State?.character.heldGear.some((item) => item.id === "veil-hook")).toBe(true);
    expect(seat3State?.character.activeContract).toBeNull();
    expect(seat3State?.character.heat).toBe(0);
    expect(tv.messages.every((message) => !isStatePatch(message) || !Object.hasOwn(message.payload, "self"))).toBe(true);
  }, 15000);

  it("assigns an enemy roller over the wire and broadcasts dual-dice combat data to the table", async () => {
    harness = await startHarness(
      [0, 5, 5, 0, 0],
      createState({
        phase: "action",
        activeSeatIndex: 0,
        turnOrder: ["seat-1", "seat-2", "seat-3"],
        currentEncounter: createThreats().get("hook-runner") ?? null,
        lastOutcomeSummary: {
          seatId: "seat-1",
          movedToSectorId: "enemy-yard",
          encounterCardId: "hook-runner",
          encounterTitle: "Hook Runner",
          encounterCardType: "enemy",
          checkStat: "grit",
          die1: null,
          die2: null,
          statBonus: null,
          checkTotal: null,
          difficulty: 6,
          enemyRollerSeatId: null,
          enemyDie1: null,
          enemyDie2: null,
          enemyBonus: null,
          enemyTotal: null,
          success: null,
          summary: "Hook Runner closes the lane."
        }
      })
    );

    const tv = await connectClient(`ws://127.0.0.1:${harness.port}/?view=tv`);
    const phone1 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-1" })}`
    );
    const phone2 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-2" })}`
    );
    const phone3 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-3" })}`
    );

    probes.push(tv, phone1, phone2, phone3);

    await tv.waitFor(statePatchForPhase("action", 0));

    const marker = tv.mark();
    const phone1Marker = phone1.mark();
    const phone2Marker = phone2.mark();
    const phone3Marker = phone3.mark();
    phone1.send({
      type: "COMBAT_REQUESTED",
      seatId: "seat-1",
      stat: "grit"
    });

    const pendingPatch = (await tv.waitForSince(marker, statePatchWithPendingEnemyRoll("seat-1"))) as Extract<
      ServerEnvelope,
      { type: "STATE_PATCH" }
    >;
    const pendingEnemyRoll = pendingPatch.payload.pendingEnemyRoll as
      | { assignedRollerSeatId: string }
      | null
      | undefined;
    const assignedRollerSeatId =
      pendingEnemyRoll
        ? String(pendingEnemyRoll.assignedRollerSeatId)
        : null;

    expect(assignedRollerSeatId).not.toBe("seat-1");
    expect(assignedRollerSeatId === "seat-2" || assignedRollerSeatId === "seat-3").toBe(true);

    const wrongSeatProbe = assignedRollerSeatId === "seat-2" ? phone3 : phone2;
    const wrongSeatId = assignedRollerSeatId === "seat-2" ? "seat-3" : "seat-2";
    const wrongSeatMarker = wrongSeatProbe.mark();
    wrongSeatProbe.send({
      type: "ENEMY_ROLL_REQUESTED",
      seatId: wrongSeatId
    });
    const rejection = await wrongSeatProbe.waitForSince(
      wrongSeatMarker,
      (message) => message.type === "INTENT_REJECTED" && message.actionType === "ENEMY_ROLL_REQUESTED"
    );
    expect(isIntentRejected(rejection) && rejection.reason).toContain("assigned enemy roller");

    const assignedProbe = assignedRollerSeatId === "seat-2" ? phone2 : phone3;
    const assignedProbeMarker = assignedProbe.mark();
    assignedProbe.send({
      type: "ENEMY_ROLL_REQUESTED",
      seatId: assignedRollerSeatId!
    });

    const tvOutcome = (await tv.waitForSince(marker, statePatchWithOpposedOutcome("seat-1"))) as Extract<
      ServerEnvelope,
      { type: "STATE_PATCH" }
    >;
    const phone1Outcome = (await phone1.waitForSince(phone1Marker, statePatchWithOpposedOutcome("seat-1"))) as Extract<
      ServerEnvelope,
      { type: "STATE_PATCH" }
    >;
    const assignedOutcome = (await assignedProbe.waitForSince(
      assignedProbeMarker,
      statePatchWithOpposedOutcome("seat-1")
    )) as Extract<ServerEnvelope, { type: "STATE_PATCH" }>;
    const tvOutcomeSummary = tvOutcome.payload.outcomeSummary as
      | { enemyDie1: number | null; enemyDie2: number | null; enemyTotal: number | null }
      | undefined;
    const phone1OutcomeSummary = phone1Outcome.payload.outcomeSummary as
      | { enemyRollerSeatId: string | null }
      | undefined;
    const assignedOutcomeSummary = assignedOutcome.payload.outcomeSummary as
      | { enemyTotal: number | null }
      | undefined;

    expect(Object.hasOwn(tvOutcome.payload, "self")).toBe(false);
    expect(Object.hasOwn(phone1Outcome.payload, "self")).toBe(true);
    expect(tvOutcomeSummary?.enemyDie1).not.toBeNull();
    expect(tvOutcomeSummary?.enemyDie2).not.toBeNull();
    expect(tvOutcomeSummary?.enemyTotal).not.toBeNull();
    expect(phone1OutcomeSummary?.enemyRollerSeatId).toBe(assignedRollerSeatId);
    expect(assignedOutcomeSummary?.enemyTotal).not.toBeNull();
    expect(
      phone2.messages
        .slice(phone2Marker)
        .every(
          (message) =>
            !isStatePatch(message) ||
            ((message.payload.self as { seatId?: string } | undefined)?.seatId ?? "seat-2") === "seat-2"
        )
    ).toBe(true);
    expect(
      phone3.messages
        .slice(phone3Marker)
        .every(
          (message) =>
            !isStatePatch(message) ||
            ((message.payload.self as { seatId?: string } | undefined)?.seatId ?? "seat-3") === "seat-3"
        )
    ).toBe(true);
  }, 15000);

  it("preserves seat state across disconnect and restores it on rejoin", async () => {
    harness = await startHarness([
      0, 0, 0, 0, 0,
      5, 5, 5, 5, 5, 5, 5,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0
    ]);
    let step = "connect clients";

    try {
      const seat1Token = createJoinToken({ sessionId: "session-alpha", seatId: "seat-1" });
      const seat2Token = createJoinToken({ sessionId: "session-alpha", seatId: "seat-2" });
      const seat3Token = createJoinToken({ sessionId: "session-alpha", seatId: "seat-3" });

      const tv = await connectClient(`ws://127.0.0.1:${harness.port}/?view=tv`);
      const phone1 = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&token=${seat1Token}`);
      const phone2 = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&token=${seat2Token}`);
      const phone3 = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&token=${seat3Token}`);

      probes.push(tv, phone1, phone2, phone3);

      step = "await initial presence";
      const initialTvPatch = await tv.waitFor(statePatchWithSeatConnection("seat-3", true));
      expect(isStatePatch(initialTvPatch) ? getSeatConnectionFromPatch(initialTvPatch, "seat-1") : null).toBe(true);
      expect(isStatePatch(initialTvPatch) ? getSeatConnectionFromPatch(initialTvPatch, "seat-2") : null).toBe(true);
      expect(isStatePatch(initialTvPatch) ? getSeatConnectionFromPatch(initialTvPatch, "seat-3") : null).toBe(true);

      let marker = tv.mark();
    phone1.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "hazard-east"
    });
      step = "seat1 move";
      await tv.waitForSince(marker, statePatchForPhase("action", 0));

      marker = tv.mark();
    phone1.send({
      type: "CHECK_REQUESTED",
      seatId: "seat-1",
      stat: "signal"
    });
      step = "seat1 resolve";
      await tv.waitForSince(marker, statePatchForPhase("navigation", 1));

      marker = tv.mark();
    phone2.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "enemy-yard"
    });
      step = "seat2 move to enemy";
      await tv.waitForSince(marker, statePatchForPhase("action", 1));

      marker = tv.mark();
    phone2.send({
      type: "COMBAT_REQUESTED",
      seatId: "seat-2",
      stat: "grit"
    });
      await tv.waitForSince(marker, statePatchWithPendingEnemyRoll("seat-2"));
      const reconnectAssignedSeat2Roller = harness.roomServer.getState().pendingEnemyRoll?.assignedRollerSeatId;
      const reconnectAssignedSeat2Probe =
        reconnectAssignedSeat2Roller === "seat-1" ? phone1 : reconnectAssignedSeat2Roller === "seat-3" ? phone3 : null;
      if (!reconnectAssignedSeat2Probe) {
        throw new Error("Assigned enemy roller probe was not available");
      }
      const reconnectAssignedSeat2Marker = reconnectAssignedSeat2Probe.mark();
      reconnectAssignedSeat2Probe.send({
        type: "ENEMY_ROLL_REQUESTED",
        seatId: reconnectAssignedSeat2Roller!
      });
      const reconnectAssignedSeat2Result = await reconnectAssignedSeat2Probe.waitForSince(
        reconnectAssignedSeat2Marker,
        (message) => isIntentRejected(message) || statePatchWithOpposedOutcome("seat-2")(message)
      );
      if (isIntentRejected(reconnectAssignedSeat2Result)) {
        throw new Error(`Assigned enemy roller was rejected: ${reconnectAssignedSeat2Result.reason}`);
      }
      await waitForServerTick();
      step = "seat2 combat";
      expect(harness.roomServer.getState().activeSeatIndex).toBe(2);
      expect(harness.roomServer.getState().phase).toBe("navigation");

      marker = tv.mark();
    phone3.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "seat-1-start"
    });
      step = "seat3 move to contract accept setup";
      await tv.waitForSince(marker, statePatchForPhase("action", 2));

    phone3.send({
      type: "ACCEPT_CONTRACT",
      seatId: "seat-3",
      contractId: "choir-quietus"
    });
      marker = tv.mark();
    phone3.send({
      type: "PHASE_ADVANCED",
      seatId: "seat-3",
      toPhase: "resolution"
    });
      step = "seat3 end turn";
      await tv.waitForSince(marker, statePatchForPhase("navigation", 0));

      marker = tv.mark();
    phone1.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "seat-1-start"
    });
      step = "seat1 empty move";
      await tv.waitForSince(marker, statePatchForPhase("action", 0));

      marker = tv.mark();
    phone1.send({
      type: "PHASE_ADVANCED",
      seatId: "seat-1",
      toPhase: "resolution"
    });
      step = "seat1 empty resolve";
      await tv.waitForSince(marker, statePatchForPhase("navigation", 1));

      marker = tv.mark();
    phone2.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-2",
      toSectorId: "seat-2-start"
    });
      step = "seat2 move to equip";
      await tv.waitForSince(marker, statePatchForPhase("action", 1));
    phone2.send({
      type: "EQUIP_GEAR",
      seatId: "seat-2",
      gearId: "veil-hook",
      slot: "weapon"
    });
      marker = tv.mark();
    phone2.send({
      type: "PHASE_ADVANCED",
      seatId: "seat-2",
      toPhase: "resolution"
    });
      step = "seat2 equip end turn";
      await tv.waitForSince(marker, statePatchForPhase("navigation", 2));

    const seat2StateBeforeDrop = harness.roomServer.getState().players.find((player) => player.seatId === "seat-2");
    expect(seat2StateBeforeDrop?.character.equippedGear.weapon).toBe("veil-hook");

      const disconnectTvMarker = tv.mark();
    const disconnectPhone1Marker = phone1.mark();
    phone2.socket.terminate();
      step = "seat2 disconnect presence false";
      await tv.waitForSince(disconnectTvMarker, statePatchWithSeatConnection("seat-2", false));
      await phone1.waitForSince(disconnectPhone1Marker, statePatchWithSeatConnection("seat-2", false));
    expect(harness.roomServer.getState().players.find((player) => player.seatId === "seat-2")?.character.equippedGear.weapon).toBe(
      "veil-hook"
    );
    expect(harness.roomServer.getState().players.find((player) => player.seatId === "seat-2")?.character.heldGear.some((item) => item.id === "veil-hook")).toBe(true);

      step = "invalid rejoin connect";
      const invalidRejoin = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&joinMode=rejoin`);
    probes.push(invalidRejoin);
    const invalidRejoinMarker = invalidRejoin.mark();
    invalidRejoin.send({
      type: "REJOIN",
      sessionId: "session-alpha",
      seatToken: "seat:session-alpha:not-a-seat"
    });
      step = "invalid rejoin reject";
      const invalidRejoinMessage = await invalidRejoin.waitForSince(invalidRejoinMarker, (message) => message.type === "REJOIN_REJECTED");
    expect(isRejoinRejected(invalidRejoinMessage) && invalidRejoinMessage.reason).toContain("Invalid seat token");
    const [invalidRejoinCode, invalidRejoinReason] = await waitForClose(invalidRejoin.socket);
    expect(invalidRejoinCode).toBe(4002);
    expect(String(invalidRejoinReason)).toContain("Invalid rejoin token");

      step = "seat2 rejoin connect";
      const seat2Rejoin = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&joinMode=rejoin`);
    probes.push(seat2Rejoin);
    const seat2RejoinMarker = seat2Rejoin.mark();
    const reconnectTvMarker = tv.mark();
    const reconnectPhone1Marker = phone1.mark();
    seat2Rejoin.send({
      type: "REJOIN",
      sessionId: "session-alpha",
      seatToken: seat2Token
    });
      step = "seat2 rejoin accepted";
      const seat2Accepted = await seat2Rejoin.waitForSince(seat2RejoinMarker, (message) => message.type === "REJOIN_ACCEPTED");
    expect(isRejoinAccepted(seat2Accepted) && seat2Accepted.seatId).toBe("seat-2");
      step = "seat2 rejoin snapshot";
      const seat2Snapshot = (await seat2Rejoin.waitForSince(
      seat2RejoinMarker,
      (message) => isStatePatch(message) && Object.hasOwn(message.payload, "self")
    )) as Extract<ServerEnvelope, { type: "STATE_PATCH" }>;
    const seat2Character = getSelfCharacterFromPatch(seat2Snapshot);
    expect(seat2Character?.equippedGear.weapon).toBe("veil-hook");
    expect(seat2Character?.heldGear.some((item) => item.id === "veil-hook")).toBe(true);
      step = "seat2 reconnect presence true";
      await tv.waitForSince(reconnectTvMarker, statePatchWithSeatConnection("seat-2", true));
      await phone1.waitForSince(reconnectPhone1Marker, statePatchWithSeatConnection("seat-2", true));

      step = "seat2 newest connect";
      const staleClosePromise = waitForClose(seat2Rejoin.socket);
      const seat2Newest = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&joinMode=rejoin`);
    probes.push(seat2Newest);
    const newestRejoinMarker = seat2Newest.mark();
    seat2Newest.send({
      type: "REJOIN",
      sessionId: "session-alpha",
      seatToken: seat2Token
    });
      step = "seat2 newest accepted";
      await seat2Newest.waitForSince(newestRejoinMarker, (message) => message.type === "REJOIN_ACCEPTED");
      step = "seat2 newest snapshot";
      await seat2Newest.waitForSince(newestRejoinMarker, (message) => isStatePatch(message) && Object.hasOwn(message.payload, "self"));
    const [staleCode, staleReason] = await staleClosePromise;
    expect(staleCode).toBe(4003);
    expect(String(staleReason)).toContain("Replaced by newer connection");

      marker = tv.mark();
    phone3.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-3",
      toSectorId: "contract-hunt"
    });
      step = "seat3 move to active disconnect";
      await tv.waitForSince(marker, statePatchForPhase("action", 2));

      const activeDisconnectTvMarker = tv.mark();
    const activeDisconnectPhone1Marker = phone1.mark();
    phone3.socket.terminate();
      step = "seat3 disconnect presence false";
      await tv.waitForSince(activeDisconnectTvMarker, statePatchWithSeatConnection("seat-3", false));
      await phone1.waitForSince(activeDisconnectPhone1Marker, statePatchWithSeatConnection("seat-3", false));
    expect(harness.roomServer.getState().activeSeatIndex).toBe(2);
    expect(harness.roomServer.getState().phase).toBe("action");

      step = "seat3 rejoin connect";
      const seat3Rejoin = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&joinMode=rejoin`);
    probes.push(seat3Rejoin);
    const seat3RejoinMarker = seat3Rejoin.mark();
    const seat3ReconnectTvMarker = tv.mark();
    const seat3ReconnectPhone1Marker = phone1.mark();
    seat3Rejoin.send({
      type: "REJOIN",
      sessionId: "session-alpha",
      seatToken: seat3Token
    });
      step = "seat3 rejoin accepted";
      await seat3Rejoin.waitForSince(seat3RejoinMarker, (message) => message.type === "REJOIN_ACCEPTED");
      step = "seat3 rejoin snapshot";
      const seat3Snapshot = (await seat3Rejoin.waitForSince(
      seat3RejoinMarker,
      (message) => isStatePatch(message) && Object.hasOwn(message.payload, "self")
    )) as Extract<ServerEnvelope, { type: "STATE_PATCH" }>;
    const seat3Character = getSelfCharacterFromPatch(seat3Snapshot);
    expect(seat3Snapshot.phase).toBe("action");
    expect(Number(seat3Snapshot.payload.activeSeatIndex)).toBe(2);
    expect(seat3Character?.heat).toBe(1);
    expect(seat3Character?.activeContract).toEqual({ contractId: "choir-quietus", progress: 0 });
      step = "seat3 reconnect presence true";
      await tv.waitForSince(seat3ReconnectTvMarker, statePatchWithSeatConnection("seat-3", true));
      await phone1.waitForSince(seat3ReconnectPhone1Marker, statePatchWithSeatConnection("seat-3", true));

      marker = tv.mark();
    seat3Rejoin.send({
      type: "COMBAT_REQUESTED",
      seatId: "seat-3",
      stat: "grit"
    });
      await tv.waitForSince(marker, statePatchWithPendingEnemyRoll("seat-3"));
      const reconnectAssignedSeat3Roller = harness.roomServer.getState().pendingEnemyRoll?.assignedRollerSeatId;
      const reconnectAssignedSeat3Probe =
        reconnectAssignedSeat3Roller === "seat-1"
          ? phone1
          : reconnectAssignedSeat3Roller === "seat-2"
            ? seat2Newest
            : null;
      if (!reconnectAssignedSeat3Probe) {
        throw new Error("Assigned enemy roller probe was not available after rejoin");
      }
      const reconnectAssignedSeat3Marker = reconnectAssignedSeat3Probe.mark();
      reconnectAssignedSeat3Probe.send({
        type: "ENEMY_ROLL_REQUESTED",
        seatId: reconnectAssignedSeat3Roller!
      });
      const reconnectAssignedSeat3Result = await reconnectAssignedSeat3Probe.waitForSince(
        reconnectAssignedSeat3Marker,
        (message) => isIntentRejected(message) || statePatchWithOpposedOutcome("seat-3")(message)
      );
      if (isIntentRejected(reconnectAssignedSeat3Result)) {
        throw new Error(`Assigned enemy roller was rejected: ${reconnectAssignedSeat3Result.reason}`);
      }
      await waitForServerTick();
      step = "seat3 resume combat";
      expect(harness.roomServer.getState().activeSeatIndex).toBe(0);
      expect(harness.roomServer.getState().phase).toBe("navigation");
      expect(harness.roomServer.getState().activeSeatIndex).toBe(0);
      expect(harness.roomServer.getState().phase).toBe("navigation");
      expect(harness.roomServer.getState().players.find((player) => player.seatId === "seat-3")?.character.activeContract).toEqual({
        contractId: "choir-quietus",
        progress: 0
      });
    } catch (error) {
      throw new Error(`Reconnect test failed at step: ${step}`, { cause: error });
    }
  }, 20000);

  it("treats disconnects separately from kicks and ends the game only after host kicks down to one seat", async () => {
    harness = await startHarness();

    const hostTv = await connectClient(`ws://127.0.0.1:${harness.port}/?view=tv&hostToken=${encodeURIComponent(harness.hostToken)}`);
    const phone1 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-1" })}`
    );
    const phone2 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-2" })}`
    );
    const phone3 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-3" })}`
    );

    probes.push(hostTv, phone1, phone2, phone3);

    await hostTv.waitFor(statePatchWithSeatConnection("seat-3", true));

    const disconnectMarker = hostTv.mark();
    phone3.socket.terminate();
    await hostTv.waitForSince(disconnectMarker, statePatchWithSeatConnection("seat-3", false));

    expect(harness.roomServer.getState().status).toBe("active");
    expect(harness.roomServer.getState().turnOrder).toContain("seat-3");

    const seat3Rejoin = await connectClient(`ws://127.0.0.1:${harness.port}/?view=phone&joinMode=rejoin`);
    probes.push(seat3Rejoin);
    const rejoinMarker = seat3Rejoin.mark();
    const rejoinPresenceMarker = hostTv.mark();
    seat3Rejoin.send({
      type: "REJOIN",
      sessionId: "session-alpha",
      seatToken: createJoinToken({ sessionId: "session-alpha", seatId: "seat-3" })
    });
    await seat3Rejoin.waitForSince(rejoinMarker, (message) => message.type === "REJOIN_ACCEPTED");
    await hostTv.waitForSince(rejoinPresenceMarker, statePatchWithSeatConnection("seat-3", true));

    const phoneRejectionMarker = phone1.mark();
    phone1.send({
      type: "KICK_SEAT",
      targetSeatId: "seat-3"
    });
    const hostRejection = await phone1.waitForSince(
      phoneRejectionMarker,
      (message) => message.type === "INTENT_REJECTED" && message.actionType === "KICK_SEAT"
    );
    expect(isIntentRejected(hostRejection) && hostRejection.reason).toContain("Only the host TV");

    const kickedSeatClose = waitForClose(seat3Rejoin.socket);
    const kickMarker = hostTv.mark();
    hostTv.send({
      type: "KICK_SEAT",
      targetSeatId: "seat-3"
    });
    await hostTv.waitForSince(kickMarker, statePatchWithSeatKick("seat-3", true));
    const [kickCode, kickReason] = await kickedSeatClose;
    expect(kickCode).toBe(4005);
    expect(String(kickReason)).toContain("Removed by host");
    expect(harness.roomServer.getState().turnOrder).not.toContain("seat-3");

    const winnerMarker = hostTv.mark();
    hostTv.send({
      type: "KICK_SEAT",
      targetSeatId: "seat-2"
    });
    await hostTv.waitForSince(winnerMarker, statePatchWithStatus("ended", "seat-1"));
    expect(harness.roomServer.getState().winnerSeatId).toBe("seat-1");

    const endedRejectionMarker = phone1.mark();
    phone1.send({
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "hazard-east"
    });
    const endedRejection = await phone1.waitForSince(
      endedRejectionMarker,
      (message) => message.type === "INTENT_REJECTED" && message.actionType === "MOVE_REQUESTED"
    );
    expect(isIntentRejected(endedRejection) && endedRejection.reason).toContain("Session has ended");
  }, 20000);

  it("restarts from active and ended states, resetting connected non-kicked seats while keeping kicked seats excluded", async () => {
    const mutatedState = createState({
      players: createState().players.map((player) =>
        player.seatId === "seat-1"
          ? {
              ...player,
              sectorId: "enemy-yard",
              private: { hand: ["old-card"], notes: ["stale note"] },
              character: {
                ...player.character,
                currentSpaceId: "enemy-yard",
                heat: 3,
                wounds: 2,
                activeContract: { contractId: "choir-quietus", progress: 1 },
                heldGear: [],
                equippedGear: { weapon: null, armor: null, utility: null }
              }
            }
          : player
      )
    });

    harness = await startHarness([0], mutatedState);

    const hostTv = await connectClient(`ws://127.0.0.1:${harness.port}/?view=tv&hostToken=${encodeURIComponent(harness.hostToken)}`);
    const phone1 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-1" })}`
    );
    const phone2 = await connectClient(
      `ws://127.0.0.1:${harness.port}/?view=phone&token=${createJoinToken({ sessionId: "session-alpha", seatId: "seat-2" })}`
    );

    probes.push(hostTv, phone1, phone2);
    await hostTv.waitFor(statePatchWithSeatConnection("seat-2", true));

    const restartMarker = hostTv.mark();
    hostTv.send({ type: "RESTART_SESSION" });
    await hostTv.waitForSince(restartMarker, statePatchWithStatus("lobby", null));

    const restartedSeat1 = harness.roomServer.getState().players.find((player) => player.seatId === "seat-1");
    expect(harness.roomServer.getState().phase).toBe("start");
    expect(harness.roomServer.getState().turnOrder).toEqual(["seat-1", "seat-2"]);
    expect(restartedSeat1?.character.currentSpaceId).toBe("seat-1-start");
    expect(restartedSeat1?.character.heat).toBe(0);
    expect(restartedSeat1?.character.wounds).toBe(0);
    expect(restartedSeat1?.character.activeContract).toBeNull();
    expect(restartedSeat1?.character.equippedGear.utility).toBe("marshal-seal");
    expect(restartedSeat1?.private.hand).toEqual([]);

    const kickSeat2Marker = hostTv.mark();
    hostTv.send({ type: "KICK_SEAT", targetSeatId: "seat-2" });
    await hostTv.waitForSince(kickSeat2Marker, statePatchWithSeatKick("seat-2", true));
    const kickSeat3Marker = hostTv.mark();
    hostTv.send({ type: "KICK_SEAT", targetSeatId: "seat-3" });
    await hostTv.waitForSince(kickSeat3Marker, statePatchWithStatus("ended", "seat-1"));

    const endedRestartMarker = hostTv.mark();
    hostTv.send({ type: "RESTART_SESSION" });
    await hostTv.waitForSince(endedRestartMarker, statePatchWithStatus("lobby", null));

    expect(harness.roomServer.getState().turnOrder).toEqual(["seat-1"]);
    expect(harness.roomServer.getState().seats.find((seat) => seat.seatId === "seat-2")?.kicked).toBe(true);
    expect(harness.roomServer.getState().seats.find((seat) => seat.seatId === "seat-3")?.kicked).toBe(true);
  }, 20000);
});
