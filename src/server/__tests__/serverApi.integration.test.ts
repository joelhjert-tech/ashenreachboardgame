import { afterEach, describe, expect, it } from "vitest";
import { SCENARIOS } from "../../game/data/scenarios.js";
import { createInitialScenarioProgress } from "../../game/rules/scenarioAmbient.js";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";

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
});
