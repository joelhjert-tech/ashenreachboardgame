import { afterEach, describe, expect, it } from "vitest";
import { createInitialSessionState } from "../sessionState.js";
import { applyPhaseOneQaFixture } from "../phaseOneQaFixture.js";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";

const started: StartedAshenReachServer[] = [];

afterEach(async () => {
  await Promise.all(started.splice(0).map((server) => server.close()));
});

describe("Phase 1 QA fixture", () => {
  it("sets deterministic route and shop states without changing their rules", () => {
    const state = createInitialSessionState("QA001", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    state.phase = "navigation";

    applyPhaseOneQaFixture(state, "seat-1", { kind: "route", stage: "first" });
    expect(state.players[0]?.character.activeContract).toMatchObject({ contractId: "choir-echo-triangulation", progress: 0 });
    expect(state.players[0]?.sectorId).toBe("ashwake-crossing");
    expect(state.movementRolls?.["seat-1"]).toBe(1);

    applyPhaseOneQaFixture(state, "seat-1", { kind: "route", stage: "duplicate" });
    expect(state.players[0]?.character.activeContract).toMatchObject({ progress: 1, completedTargetIds: ["echo-a"] });

    applyPhaseOneQaFixture(state, "seat-1", { kind: "shop", stage: "valid-final" });
    expect(state.players[0]?.character.activeContract).toMatchObject({ contractId: "dominion-foundry-proof-marks", progress: 1 });
    expect(state.players[0]?.sectorId).toBe("kettleward-foundry");
    expect(state.players[0]?.character.salvage).toBeGreaterThanOrEqual(20);

    state.players[0]!.character.activeContract!.progress = 2;
    applyPhaseOneQaFixture(state, "seat-1", { kind: "shop", stage: "completion-ready" });
    expect(state.phase).toBe("action");
    expect(state.players[0]?.character.activeContract?.progress).toBe(2);
  });

  it("does not expose the QA endpoint unless explicitly enabled", async () => {
    const normal = await startAshenReachServer({ port: 18180, host: "127.0.0.1", maxPortAttempts: 5, logUrls: false });
    started.push(normal);
    const normalResponse = await fetch(`http://127.0.0.1:${normal.port}/api/qa/phase1-fixture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    expect(normalResponse.status).toBe(404);
    await normal.close();
    started.pop();

    const qa = await startAshenReachServer({ port: 18180, host: "127.0.0.1", maxPortAttempts: 5, logUrls: false, qaFixturesEnabled: true });
    started.push(qa);
    const qaResponse = await fetch(`http://127.0.0.1:${qa.port}/api/qa/phase1-fixture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    expect(qaResponse.status).toBe(400);
  });
});
