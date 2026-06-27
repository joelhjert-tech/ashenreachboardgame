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
  };
};

type SocketProbe = {
  socket: WebSocket;
  messages: StatePatchEnvelope[];
};

async function connectSocket(url: string): Promise<SocketProbe> {
  const socket = new WebSocket(url);
  const messages: StatePatchEnvelope[] = [];

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
  const existing = probe.messages.find((message) => message.type === "STATE_PATCH" && predicate(message));

  if (existing) {
    return existing;
  }

  return await new Promise<StatePatchEnvelope>((resolve, reject) => {
    const timer = setTimeout(() => {
      probe.socket.off("message", onMessage);
      const received = probe.messages
        .map((message) => `${message.type}:${message.phase}:${message.payload.status ?? "unknown"}`)
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
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "single-player",
      scenarioId: "scenario_dying_star"
    });

    expect(response.status).toBe(200);
    expect(response.payload.sessionMode).toBe("single-player");
    expect(response.payload.scenarioId).toBe("scenario_dying_star");
    expect(harness.roomServer.getState().activeScenarioId).toBe("scenario_dying_star");
    expect(harness.roomServer.getState().scenarioProgress).toEqual({ starTokens: 10 });
  });

  it("falls back to the default scenario when an invalid scenario id is requested", async () => {
    harness = await startAshenReachServer({ port: createTestPort(), logUrls: false });
    const baseUrl = `http://127.0.0.1:${harness.port}`;

    const response = await postJson<{
      roomCode: string;
      sessionMode: "single-player" | "multiplayer";
      scenarioId: string;
      hostToken: string;
    }>(baseUrl, "/api/session/create", {
      sessionMode: "multiplayer",
      scenarioId: "scenario_not_real"
    });

    expect(response.status).toBe(200);
    expect(response.payload.scenarioId).toBe("scenario_broken_seal");
    expect(harness.roomServer.getState().activeScenarioId).toBe("scenario_broken_seal");
    expect(harness.roomServer.getState().scenarioProgress).toEqual({ sealTokens: 6 });
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
        scenarioId: scenario.id
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

      expect(startedPatch.payload.scenarioTelemetry?.some((entry) => entry.label === "Star Tokens")).toBe(true);

      const state = harness.roomServer.getState();
      const activePlayer = state.players.find((player) => player.seatId === joined.payload.seatId);
      const currentSector = state.sectors.find((sector) => sector.id === activePlayer?.character.currentSpaceId);
      const neighborSectorId = currentSector?.neighbors[0];

      expect(neighborSectorId).toBeTruthy();

      phone.socket.send(
        JSON.stringify({
          type: "MOVE_REQUESTED",
          seatId: joined.payload.seatId,
          toSectorId: neighborSectorId
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
          message.payload.self?.sectorId === neighborSectorId &&
          message.payload.activeScenario?.id === "scenario_dying_star"
      );

      expect(movedPatch.payload.scenarioTelemetry?.some((entry) => entry.label === "Star Tokens")).toBe(true);
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
      expectedProgress: 4,
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
      expect(
        (harness.roomServer.getState().scenarioProgress as Record<string, number>)[scenarioDefinition!.winConditionKey]
      ).toBe(expectedProgress);
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
        crownClaims: 0,
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
