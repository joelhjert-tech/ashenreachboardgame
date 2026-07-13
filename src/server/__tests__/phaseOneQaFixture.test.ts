import { afterEach, describe, expect, it } from "vitest";
import { createInitialSessionState } from "../sessionState.js";
import { applyPhaseOneQaFixture } from "../phaseOneQaFixture.js";
import { buildMovementRoutePlan } from "../../game/rules/movementPlanner.js";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";

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

  it("prepares a normal authoritative two-step route to the recurring Ashen Chapel challenge", () => {
    const state = createInitialSessionState("QA001", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    state.phase = "action";

    const chapelBefore = state.sectors.find((sector) => sector.id === "ashen-chapel");
    const riftBefore = chapelBefore?.tileChallenges?.find((challenge) => challenge.id === "rift-whispers-ashen-chapel");
    expect(riftBefore).toBeTruthy();

    applyPhaseOneQaFixture(state, "seat-1", { kind: "movement-journey", stage: "ashen-chapel", withChoirLantern: true });

    expect(state.players[0]?.sectorId).toBe("scorched-road");
    expect(state.movementRolls?.["seat-1"]).toBe(2);
    expect(state.pendingTileChallenge).toBeNull();
    expect(state.players[0]?.character.heldGear).toContainEqual(expect.objectContaining({ id: "choir-lantern", instanceId: "qa-choir-lantern", currentCharges: 2 }));
    expect(state.players[0]?.character.equippedGear.utility).toBe("choir-lantern");
    const route = buildMovementRoutePlan(state, "seat-1")?.routes.find((entry) => entry.sectorId === "ashen-chapel");
    expect(route).toEqual(expect.objectContaining({ sectorId: "ashen-chapel", distance: 2, route: ["scorched-road", "blastworks", "ashen-chapel"], routeId: expect.any(String) }));
    expect(state.sectors.find((sector) => sector.id === "ashen-chapel")?.tileChallenges).toContainEqual(riftBefore);
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

  it.each([0, 1, 2, 3] as const)("seeds exactly %i completed contracts at a clear relic dealer", (count) => {
    const state = createInitialSessionState("QA001", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    state.seats[0] = { ...state.seats[0]!, displayName: "QA Operative", characterSelected: true, connected: true, ready: true };

    applyPhaseOneQaFixture(state, "seat-1", { kind: "relic-trade", completedContracts: count });

    expect(state.players[0]?.character.currentSpaceId).toBe("outer_surgery_tent");
    expect(state.players[0]?.character.completedContracts).toEqual(
      Array.from({ length: count }, (_, index) => `qa-completed-contract-${index + 1}`)
    );
    const phone = createPhoneProjection(state, "seat-1", true) as { self: { character: { completedContracts: string[] } }; shopEncounter: { services: Array<{ id: string; enabled: boolean }> } };
    const tv = createTvProjection(state) as { players: Array<{ character: { completedContracts: number } }>; shopEncounter: { activePlayer: { completedContracts: number }; services: Array<{ id: string; enabled: boolean }> } };
    const phoneTrade = phone.shopEncounter.services.find((service) => service.id === "trade-missions-for-artifact");
    const tvTrade = tv.shopEncounter.services.find((service) => service.id === "trade-missions-for-artifact");
    expect(phone.self.character.completedContracts).toHaveLength(count);
    expect(tv.players[0]?.character.completedContracts).toBe(count);
    expect(tv.shopEncounter.activePlayer.completedContracts).toBe(count);
    expect(phoneTrade?.enabled).toBe(count === 3);
    expect(tvTrade?.enabled).toBe(count === 3);
  });

  it("requires the current room and a valid signed seat token", async () => {
    const qa = await startAshenReachServer({ port: 18180, host: "127.0.0.1", maxPortAttempts: 5, logUrls: false, qaFixturesEnabled: true });
    started.push(qa);
    const baseUrl = `http://127.0.0.1:${qa.port}`;
    const invalidRoom = await fetch(`${baseUrl}/api/qa/phase1-fixture`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: "WRONG", seatToken: "forged", fixture: { kind: "relic-trade", completedContracts: 3 } })
    });
    expect(invalidRoom.status).toBe(400);

    const invalidToken = await fetch(`${baseUrl}/api/qa/phase1-fixture`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: qa.roomServer.getState().sessionId, seatToken: "forged", fixture: { kind: "relic-trade", completedContracts: 3 } })
    });
    expect(invalidToken.status).toBe(403);
  });
});
