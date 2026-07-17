import { once } from "node:events";
import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { getScenarioDefinition, SCENARIOS } from "../../game/data/scenarios.js";
import { createInitialScenarioProgress } from "../../game/rules/scenarioAmbient.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";

type StatePatchEnvelope = {
  type: "STATE_PATCH";
  sessionId: string;
  phase: string;
  payload: {
    status?: string;
    winnerSeatId?: string | null;
    self?: {
      seatId: string;
      sectorId: string;
      character: {
        currentSpaceId: string;
      };
    };
    activeScenario?: {
      id: string;
      progress?: number;
      threshold?: number;
    };
    scenarioTelemetry?: Array<{
      label: string;
      value: string;
    }>;
    activeResolution?: {
      stage: string;
    } | null;
    movementPlanner?: {
      active: boolean;
      movementValue: number;
      currentSectorId: string;
      currentSectorName: string;
      destinations: Array<{
        sectorId: string;
        distance: number;
        route: string[];
      }>;
    } | null;
  };
};

type SocketProbe = {
  socket: WebSocket;
  messages: Array<StatePatchEnvelope | Record<string, unknown>>;
};

async function connectSocket(url: string): Promise<SocketProbe> {
  const socket = new WebSocket(url);
  const messages: Array<StatePatchEnvelope | Record<string, unknown>> = [];

  socket.on("message", (raw) => {
    messages.push(JSON.parse(String(raw)) as StatePatchEnvelope);
  });

  await once(socket, "open");
  return {
    socket,
    messages
  };
}

async function waitForStatePatch(
  probe: SocketProbe,
  predicate: (message: StatePatchEnvelope) => boolean,
  timeoutMs = 10000
): Promise<StatePatchEnvelope> {
  const existing = probe.messages.find(
    (message): message is StatePatchEnvelope => message.type === "STATE_PATCH" && predicate(message as StatePatchEnvelope)
  );

  if (existing) {
    return existing;
  }

  return await new Promise<StatePatchEnvelope>((resolve, reject) => {
    const timer = setTimeout(() => {
      probe.socket.off("message", onMessage);
      const received = probe.messages
        .map((message) => {
          if (message.type === "STATE_PATCH") {
            const patch = message as StatePatchEnvelope;
            return `${patch.type}:${patch.phase}:${patch.payload.status ?? "unknown"}`;
          }

          const socketMessage = message as Record<string, unknown>;
          return `${String(socketMessage.type ?? "UNKNOWN")}:${String(socketMessage.actionType ?? "none")}`;
        })
        .join(", ");
      reject(new Error(`Timed out waiting for state patch. Received: ${received || "none"}`));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(String(raw)) as StatePatchEnvelope;

      if (message.type !== "STATE_PATCH" || !predicate(message)) {
        return;
      }

      clearTimeout(timer);
      probe.socket.off("message", onMessage);
      resolve(message);
    };

    probe.socket.on("message", onMessage);
  });
}

async function postJson<TResponse>(
  baseUrl: string,
  path: string,
  body: unknown
): Promise<{ status: number; payload: TResponse }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return {
    status: response.status,
    payload: (await response.json()) as TResponse
  };
}

function firstStartingContractId(harness: StartedAshenReachServer, seatId: string): string {
  const contractId = harness.roomServer.getState().seats.find((seat) => seat.seatId === seatId)?.startingContractOptions[0];

  if (!contractId) {
    throw new Error(`Missing starting contract option for ${seatId}`);
  }

  return contractId;
}

function selectFirstStartingContract(harness: StartedAshenReachServer, seatId: string): string {
  const contractId = firstStartingContractId(harness, seatId);
  harness.roomServer.selectStartingContract(seatId, contractId);
  return contractId;
}

async function selectFirstStartingMissionViaApi(
  baseUrl: string,
  roomCode: string,
  seatToken: string,
  harness: StartedAshenReachServer,
  seatId: string
): Promise<string> {
  const contractId = firstStartingContractId(harness, seatId);
  const selected = await postJson<{ roomCode: string; seatId: string; selectedStartingContractId: string }>(
    baseUrl,
    "/api/session/starting-mission",
    {
      roomCode,
      seatToken,
      contractId
    }
  );

  expect(selected.status).toBe(200);
  expect(selected.payload).toMatchObject({
    roomCode,
    seatId,
    selectedStartingContractId: contractId
  });

  return contractId;
}

function primeLiveScenarioState(
  state: GameState,
  options: {
    scenarioId: string;
    scenarioProgress: Record<string, number>;
    escalationLevel?: number;
    stats: Partial<GameState["players"][number]["character"]["stats"]>;
  }
): void {
  state.activeScenarioId = options.scenarioId;
  state.scenarioProgress = options.scenarioProgress;
  state.status = "active";
  state.phase = "action";
  state.resolutionSource = null;
  state.currentEncounter = null;
  state.pendingEnemyRoll = null;
  state.pendingEffect = null;
  state.escalationLevel = options.escalationLevel ?? 0;
  state.activeSeatIndex = 0;

  const seatId = state.turnOrder[0] ?? state.seats[0]?.seatId ?? "seat-1";

  state.players = state.players.map((player) =>
    player.seatId === seatId
      ? {
          ...player,
          sectorId: "center_cinder_gate",
          character: {
            ...player.character,
            currentSpaceId: "center_cinder_gate",
            heldGear: [
              {
                id: "choir-static-censer",
                name: "Choir Static Censer",
                slot: "utility",
                category: "chargedRelic",
                tier: "artifact",
                progressionWeight: 2.5,
                statBonus: { stat: "signal", amount: 1 }
              }
            ],
            stats: {
              ...player.character.stats,
              ...options.stats
            }
          }
        }
      : player
  );
}

describe("server API scenario flow", () => {
  let harness: StartedAshenReachServer | null = null;

  function createTestPort(): number {
    return 18080 + Math.floor(Math.random() * 1000);
  }

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = null;
    }
  });

  it("returns the authored scenario catalog from /api/scenarios", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const response = await fetch(`${baseUrl}/api/scenarios`);
    const payload = (await response.json()) as {
      scenarios: Array<{
        id: string;
        name: string;
        theme: string;
        difficulty: string;
        setup: string[];
        specialRules: string[];
        confrontationTitle: string;
        confrontationSteps: string[];
        victoryText: string;
      }>;
    };

    expect(response.status).toBe(200);
    expect(payload.scenarios).toHaveLength(SCENARIOS.length);
    expect(payload.scenarios[0]).toMatchObject({
      id: SCENARIOS[0]?.id,
      name: SCENARIOS[0]?.name
    });
    expect(payload.scenarios.every((scenario) => scenario.setup.length > 0)).toBe(true);
    expect(payload.scenarios.every((scenario) => scenario.specialRules.length > 0)).toBe(true);
  });

  it("creates a session with the requested scenario id and seeds matching progress", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const response = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      interactionMode: string;
      playerCount: number;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "single-player",
      scenarioId: "scenario_dying_star",
      interactionMode: "rivalry",
      playerCount: 1
    });

    expect(response.status).toBe(200);
    expect(response.payload.sessionMode).toBe("single-player");
    expect(response.payload.scenarioId).toBe("scenario_dying_star");
    expect(response.payload.interactionMode).toBe("co-op");
    expect(response.payload.playerCount).toBe(1);
    expect(harness.roomServer.getState().activeScenarioId).toBe("scenario_dying_star");
    expect(harness.roomServer.getState().scenarioProgress).toEqual({ starTokens: 10 });
  });

  it("defaults to Broken Seal when no scenario id is requested", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const response = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      interactionMode: "co-op"
    });

    expect(response.status).toBe(200);
    expect(response.payload.scenarioId).toBe("scenario_broken_seal");
    expect(harness.roomServer.getState().activeScenarioId).toBe("scenario_broken_seal");
    expect(harness.roomServer.getState().scenarioProgress).toEqual({});
    expect(harness.roomServer.getState().scenarioPreparation.resources).toEqual({ sealIntegrity: 6 });
  });

  it("rejects multiplayer session creation until the host selects an interaction mode", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const response = await postJson<{ error: string }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      scenarioId: "scenario_broken_seal",
      playerCount: 2
    });

    expect(response.status).toBe(400);
    expect(response.payload.error).toContain("explicit interaction mode");
  });

  it("rejects an invalid scenario id instead of silently changing setup", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const response = await postJson<{ error: string }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      scenarioId: "scenario_not_real"
    });

    expect(response.status).toBe(400);
    expect(response.payload.error).toContain("Invalid scenario id");
  });

  it("creates a configured multiplayer session with scenario, interaction mode, and player count", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const response = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      interactionMode: string;
      scenarioId: string;
      playerCount: number;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      scenarioId: "scenario_devourer_beneath",
      interactionMode: "co-op",
      playerCount: 2
    });

    expect(response.status).toBe(200);
    expect(response.payload.sessionMode).toBe("multiplayer");
    expect(response.payload.interactionMode).toBe("co-op");
    expect(response.payload.scenarioId).toBe("scenario_devourer_beneath");
    expect(response.payload.playerCount).toBe(2);
    expect(harness.roomServer.getState().seats).toHaveLength(2);
    expect(harness.roomServer.getState().turnOrder).toHaveLength(2);
    expect(harness.roomServer.getState().scenarioProgress).toEqual({ doomTokens: 0, devourerIndex: 0 });
  });

  it("rejects invalid player counts and mode combinations", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const tooFew = await postJson<{ error: string }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      playerCount: 1
    });
    const tooMany = await postJson<{ error: string }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      playerCount: 7
    });
    const relayTooMany = await postJson<{ error: string }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      gameMode: "nemesis_relay",
      playerCount: 5
    });
    const relayRivalry = await postJson<{ error: string }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      gameMode: "nemesis_relay",
      interactionMode: "rivalry",
      playerCount: 2
    });

    expect(tooFew.status).toBe(400);
    expect(tooFew.payload.error).toContain("2-6");
    expect(tooMany.status).toBe(400);
    expect(tooMany.payload.error).toContain("2-6");
    expect(relayTooMany.status).toBe(400);
    expect(relayTooMany.payload.error).toContain("1-4");
    expect(relayRivalry.status).toBe(400);
    expect(relayRivalry.payload.error).toContain("require co-op");
  });

  it("starts the selected scenario without losing the chosen seed", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const created = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "single-player",
      scenarioId: "scenario_labyrinth_engine"
    });

    const joined = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Tester",
      characterId: "void-marshal"
    });

    selectFirstStartingContract(harness, joined.payload.seatId);
    harness.roomServer.setSeatReady(joined.payload.seatId, true);

    const started = await postJson<{
      roomCode: string;
      status: string;
      phase: string;
    }>(baseUrl, "/api/session/start", {
      roomCode: created.payload.roomCode,
      hostToken: created.payload.hostToken
    });

    expect(joined.status).toBe(200);
    expect(started.status).toBe(200);
    expect(started.payload.status).toBe("active");
    expect(harness.roomServer.getState().activeScenarioId).toBe("scenario_labyrinth_engine");
    expect(harness.roomServer.getState().scenarioProgress.engineModeIndex).toBe(1);
  });

  it("marks ready through signed seat tokens and rejects legacy unsigned ready tokens", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const created = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "single-player",
      scenarioId: "scenario_broken_seal"
    });

    const joined = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Ready Tester",
      characterId: "void-marshal"
    });

    const forgedReady = await postJson<{ error: string }>(baseUrl, "/api/session/ready", {
      roomCode: created.payload.roomCode,
      seatToken: `seat:${harness.roomServer.getState().sessionId}:${joined.payload.seatId}`,
      ready: true
    });

    expect(forgedReady.status).toBe(403);
    expect(forgedReady.payload.error).toContain("Invalid seat token");
    expect(harness.roomServer.getState().seats.find((seat) => seat.seatId === joined.payload.seatId)?.ready).toBe(false);

    const missingMissionReady = await postJson<{ error: string }>(baseUrl, "/api/session/ready", {
      roomCode: created.payload.roomCode,
      seatToken: joined.payload.seatToken,
      ready: true
    });

    expect(missingMissionReady.status).toBe(400);
    expect(missingMissionReady.payload.error).toContain("Choose a starting mission");

    await selectFirstStartingMissionViaApi(baseUrl, created.payload.roomCode, joined.payload.seatToken, harness, joined.payload.seatId);

    const ready = await postJson<{
      roomCode: string;
      seatId: string;
      ready: boolean;
    }>(baseUrl, "/api/session/ready", {
      roomCode: created.payload.roomCode,
      seatToken: joined.payload.seatToken,
      ready: true
    });

    expect(ready.status).toBe(200);
    expect(ready.payload).toMatchObject({
      roomCode: created.payload.roomCode,
      seatId: joined.payload.seatId,
      ready: true
    });
    expect(harness.roomServer.getState().seats.find((seat) => seat.seatId === joined.payload.seatId)?.ready).toBe(true);
  });

  it("releases a pre-game character reservation through the leave endpoint", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const created = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      scenarioId: "scenario_broken_seal",
      interactionMode: "rivalry"
    });

    const joined = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Joel",
      characterId: "signal-witch"
    });

    const duplicate = await postJson<{ error: string }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Mira",
      characterId: "signal-witch"
    });

    const left = await postJson<{
      roomCode: string;
      status: string;
      phase: string;
    }>(baseUrl, "/api/session/leave", {
      roomCode: created.payload.roomCode,
      seatToken: joined.payload.seatToken
    });

    expect(joined.status).toBe(200);
    expect(duplicate.status).toBe(400);
    expect(duplicate.payload.error).toContain("Character already taken");
    expect(left.status).toBe(200);
    expect(harness.roomServer.getState().seats.find((seat) => seat.seatId === joined.payload.seatId)?.displayName).toBeNull();

    const rejoined = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Mira",
      characterId: "signal-witch"
    });

    expect(rejoined.status).toBe(200);
    expect(rejoined.payload.seatId).toBe(joined.payload.seatId);
  });

  it("assigns distinct seats server-side to same-machine controller tabs and rejects authored seat ids", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const created = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      playerCount: number;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      scenarioId: "scenario_broken_seal",
      interactionMode: "rivalry",
      playerCount: 2
    });

    const forgedSeat = await postJson<{ error: string }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Seat Forger",
      characterId: "grave-engineer",
      seatId: "seat-2"
    });

    expect(forgedSeat.status).toBe(400);
    expect(forgedSeat.payload.error).toContain("server-authoritative");
    expect(harness.roomServer.getState().seats.every((seat) => seat.displayName === null)).toBe(true);

    const first = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Tab One",
      characterId: "void-marshal"
    });

    const second = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Tab Two",
      characterId: "signal-witch"
    });

    await selectFirstStartingMissionViaApi(baseUrl, created.payload.roomCode, first.payload.seatToken, harness, first.payload.seatId);
    await selectFirstStartingMissionViaApi(baseUrl, created.payload.roomCode, second.payload.seatToken, harness, second.payload.seatId);

    const firstReady = await postJson<{ ready: boolean; seatId: string }>(baseUrl, "/api/session/ready", {
      roomCode: created.payload.roomCode,
      seatToken: first.payload.seatToken,
      ready: true
    });
    const secondReady = await postJson<{ ready: boolean; seatId: string }>(baseUrl, "/api/session/ready", {
      roomCode: created.payload.roomCode,
      seatToken: second.payload.seatToken,
      ready: true
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.payload.seatId).toBe("seat-1");
    expect(second.payload.seatId).toBe("seat-2");
    expect(first.payload.seatToken).not.toBe(second.payload.seatToken);
    expect(firstReady.payload).toMatchObject({ seatId: "seat-1", ready: true });
    expect(secondReady.payload).toMatchObject({ seatId: "seat-2", ready: true });
    expect(harness.roomServer.getState().seats.map((seat) => [seat.seatId, seat.displayName, seat.ready])).toEqual([
      ["seat-1", "Tab One", true],
      ["seat-2", "Tab Two", true]
    ]);
  });

  it("can create every authored scenario through the API with matching seeded progress", async () => {
    for (const scenario of SCENARIOS) {
      harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
      const baseUrl = `http://127.0.0.1:${harness.port}`;

      const response = await postJson<{
        roomCode: string;
        sessionMode: "single-player" | "multiplayer";
        scenarioId: string;
        hostToken: string;
      }>(baseUrl, "/api/session/create", {
        sessionMode: "multiplayer",
        scenarioId: scenario.id,
        interactionMode: "co-op"
      });

      expect(response.status).toBe(200);
      expect(response.payload.scenarioId).toBe(scenario.id);
      expect(harness.roomServer.getState().activeScenarioId).toBe(scenario.id);
      expect(harness.roomServer.getState().scenarioProgress).toEqual(createInitialScenarioProgress(scenario.id));

      await harness.close();
      harness = null;
    }
  });

  it("runs a live room create, join, start, and move flow while preserving scenario telemetry", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const created = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "single-player",
      scenarioId: "scenario_dying_star"
    });

    const joined = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Joel",
      characterId: "signal-witch"
    });

    const phone = await connectSocket(`ws://127.0.0.1:${harness.port}/?view=phone&token=${joined.payload.seatToken}`);

    try {
      await waitForStatePatch(phone, (message) => message.payload.self?.seatId === joined.payload.seatId);

      selectFirstStartingContract(harness, joined.payload.seatId);
      harness.roomServer.setSeatReady(joined.payload.seatId, true);

      const started = await postJson<{
        roomCode: string;
        status: string;
        phase: string;
      }>(baseUrl, "/api/session/start", {
        roomCode: created.payload.roomCode,
        hostToken: created.payload.hostToken
      });

      expect(started.status).toBe(200);

      const startedPatch = await waitForStatePatch(
        phone,
        (message) =>
          message.phase === "navigation" &&
          message.payload.status === "active" &&
          message.payload.activeScenario?.id === "scenario_dying_star"
      );

      expect(startedPatch.payload.scenarioTelemetry?.some((entry) => entry.label === "Starfire")).toBe(true);

      expect(startedPatch.payload.movementPlanner).toBeNull();

      phone.socket.send(
        JSON.stringify({
          type: "MOVEMENT_ROLL_REQUESTED",
          seatId: joined.payload.seatId
        })
      );

      const movementPatch = await waitForStatePatch(
        phone,
        (message) =>
          message.phase === "navigation" &&
          message.payload.status === "active" &&
          Boolean(message.payload.movementPlanner?.destinations.length)
      );

      const state = harness.roomServer.getState();
      const activePlayer = state.players.find((player) => player.seatId === joined.payload.seatId);
      const legalDestinationId = movementPatch.payload.movementPlanner?.destinations[0]?.sectorId;

      expect(activePlayer?.character.currentSpaceId).toBe(movementPatch.payload.movementPlanner?.currentSectorId);
      expect(legalDestinationId).toBeTruthy();

      phone.socket.send(
        JSON.stringify({
          type: "MOVE_REQUESTED",
          seatId: joined.payload.seatId,
          toSectorId: legalDestinationId
        })
      );

      await waitForStatePatch(
        phone,
        (message) => message.payload.activeResolution?.stage === "roll_result"
      );

      phone.socket.send(
        JSON.stringify({
          type: "CONTINUE_RESOLUTION",
          seatId: joined.payload.seatId
        })
      );

      const movedPatch = await waitForStatePatch(
        phone,
        (message) =>
          message.phase === "action" &&
          message.payload.self?.sectorId === legalDestinationId &&
          message.payload.activeScenario?.id === "scenario_dying_star"
      );

      expect(movedPatch.payload.scenarioTelemetry?.some((entry) => entry.label === "Starfire")).toBe(true);
    } finally {
      phone.socket.close();
    }
  });

  it.each([
    {
      label: "Broken Seal",
      scenarioId: "scenario_broken_seal",
      scenarioProgress: { sealRestorationMarks: 1 } as Record<string, number>,
      stats: { command: 20, grit: 20, signal: 20, guile: 20, forge: 20 },
      expectedProgress: 3,
      expectedThreshold: 2
    },
    {
      label: "Throne of Ash",
      scenarioId: "scenario_throne_of_ash",
      scenarioProgress: {
        throneClaims: 5,
        crownClaims: 2,
        "crownClaim:seat-1": 2
      } as Record<string, number>,
      stats: { command: 20, grit: 20, signal: 20, guile: 20, forge: 20 },
      expectedProgress: 7,
      expectedThreshold: 6
    },
    {
      label: "Mirror of False Heroes",
      scenarioId: "scenario_mirror_of_false_heroes",
      scenarioProgress: { mirrorBreaks: 3 } as Record<string, number>,
      stats: { command: 20, grit: 20, signal: 20, guile: 20, forge: 20 },
      expectedProgress: 4,
      expectedThreshold: 4
    },
    {
      label: "Devourer Beneath",
      scenarioId: "scenario_devourer_beneath",
      scenarioProgress: { mawStrikes: 4 } as Record<string, number>,
      stats: { command: 20, grit: 20, signal: 20, guile: 20, forge: 20 },
      expectedProgress: 5,
      expectedThreshold: 5
    },
    {
      label: "Labyrinth Engine",
      scenarioId: "scenario_labyrinth_engine",
      scenarioProgress: { shutdownMarks: 4, engineModeIndex: 1 } as Record<string, number>,
      stats: { command: 20, grit: 20, signal: 20, guile: 20, forge: 20 },
      expectedProgress: 6,
      expectedThreshold: 5
    },
    {
      label: "Dying Star",
      scenarioId: "scenario_dying_star",
      scenarioProgress: { ignitionMarks: 3 } as Record<string, number>,
      stats: { command: 20, grit: 20, signal: 20, guile: 20, forge: 20 },
      expectedProgress: 4,
      expectedThreshold: 4
    }
  ])("closes a full API/socket $label victory path", async ({ scenarioId, scenarioProgress, stats, expectedProgress, expectedThreshold }) => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const created = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "single-player",
      scenarioId
    });

    const joined = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Joel",
      characterId: "signal-witch"
    });

    const phone = await connectSocket(`ws://127.0.0.1:${harness.port}/?view=phone&token=${joined.payload.seatToken}`);

    try {
      await waitForStatePatch(phone, (message) => message.payload.self?.seatId === joined.payload.seatId);

      selectFirstStartingContract(harness, joined.payload.seatId);
      harness.roomServer.setSeatReady(joined.payload.seatId, true);

      const started = await postJson<{
        roomCode: string;
        status: string;
        phase: string;
      }>(baseUrl, "/api/session/start", {
        roomCode: created.payload.roomCode,
        hostToken: created.payload.hostToken
      });

      expect(started.status).toBe(200);

      await waitForStatePatch(
        phone,
        (message) =>
          message.payload.status === "active" &&
          message.payload.activeScenario?.id === scenarioId
      );

      primeLiveScenarioState(harness.roomServer.getState(), {
        scenarioId,
        scenarioProgress,
        stats
      });

      phone.socket.send(
        JSON.stringify({
          type: "SCENARIO_CONFRONTATION_REQUESTED",
          seatId: joined.payload.seatId
        })
      );

      const endedPatch = await waitForStatePatch(
        phone,
        (message) =>
          message.phase === "broadcast" &&
          message.payload.status === "ended" &&
          message.payload.activeScenario?.id === scenarioId
      );
      const scenarioDefinition = getScenarioDefinition(scenarioId);

      expect(harness.roomServer.getState().winnerSeatId).toBe(joined.payload.seatId);
      expect(harness.roomServer.getState().status).toBe("ended");
      expect(scenarioDefinition).not.toBeNull();
      const authoritativeProgress = scenarioId === "scenario_broken_seal"
        ? harness.roomServer.getState().scenarioConfrontation.progress.restorationMarks
        : (harness.roomServer.getState().scenarioProgress as Record<string, number>)[scenarioDefinition!.winConditionKey];
      expect(authoritativeProgress).toBe(expectedProgress);
      expect(endedPatch.payload.activeScenario?.id).toBe(scenarioId);
      expect(endedPatch.payload.activeScenario?.progress).toBe(expectedProgress);
      expect(endedPatch.payload.activeScenario?.threshold).toBe(expectedThreshold);
      expect(harness.roomServer.getState().activeScenarioId).toBe(scenarioId);
    } finally {
      phone.socket.close();
    }
  }, 15000);

  it.each([
    {
      label: "Broken Seal",
      scenarioId: "scenario_broken_seal",
      scenarioProgress: {} as Record<string, number>
    },
    {
      label: "Throne of Ash",
      scenarioId: "scenario_throne_of_ash",
      scenarioProgress: {
        crownClaims: 1,
        "crownClaim:seat-1": 1,
        throneClaims: 0
      } as Record<string, number>
    },
    {
      label: "Mirror of False Heroes",
      scenarioId: "scenario_mirror_of_false_heroes",
      scenarioProgress: {} as Record<string, number>
    },
    {
      label: "Devourer Beneath",
      scenarioId: "scenario_devourer_beneath",
      scenarioProgress: {
        doomTokens: 0,
        devourerIndex: 0
      } as Record<string, number>
    },
    {
      label: "Labyrinth Engine",
      scenarioId: "scenario_labyrinth_engine",
      scenarioProgress: {
        engineModeIndex: 1
      } as Record<string, number>
    },
    {
      label: "Dying Star",
      scenarioId: "scenario_dying_star",
      scenarioProgress: {
        starTokens: 5
      } as Record<string, number>
    }
  ])("collapses a full API/socket $label failure path", async ({ scenarioId, scenarioProgress }) => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const created = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "single-player",
      scenarioId
    });

    const joined = await postJson<{
      roomCode: string;
      seatId: string;
      seatToken: string;
    }>(baseUrl, "/api/session/join", {
      roomCode: created.payload.roomCode,
      displayName: "Joel",
      characterId: "signal-witch"
    });

    const phone = await connectSocket(`ws://127.0.0.1:${harness.port}/?view=phone&token=${joined.payload.seatToken}`);

    try {
      await waitForStatePatch(phone, (message) => message.payload.self?.seatId === joined.payload.seatId);

      selectFirstStartingContract(harness, joined.payload.seatId);
      harness.roomServer.setSeatReady(joined.payload.seatId, true);

      const started = await postJson<{
        roomCode: string;
        status: string;
        phase: string;
      }>(baseUrl, "/api/session/start", {
        roomCode: created.payload.roomCode,
        hostToken: created.payload.hostToken
      });

      expect(started.status).toBe(200);

      await waitForStatePatch(
        phone,
        (message) =>
          message.payload.status === "active" &&
          message.payload.activeScenario?.id === scenarioId
      );

      primeLiveScenarioState(harness.roomServer.getState(), {
        scenarioId,
        scenarioProgress,
        escalationLevel: 7,
        stats: {
          command: 0,
          grit: 0,
          signal: 0,
          guile: 0,
          forge: 0
        }
      });

      phone.socket.send(
        JSON.stringify({
          type: "SCENARIO_CONFRONTATION_REQUESTED",
          seatId: joined.payload.seatId
        })
      );

      const endedPatch = await waitForStatePatch(
        phone,
        (message) =>
          message.phase === "broadcast" &&
          message.payload.status === "ended" &&
          message.payload.winnerSeatId === null &&
          message.payload.activeScenario?.id === scenarioId
      );

      expect(harness.roomServer.getState().winnerSeatId).toBeNull();
      expect(harness.roomServer.getState().status).toBe("ended");
      expect(harness.roomServer.getState().escalationLevel).toBeGreaterThanOrEqual(8);
      expect(endedPatch.payload.activeScenario?.id).toBe(scenarioId);
    } finally {
      phone.socket.close();
    }
  }, 15000);
});
