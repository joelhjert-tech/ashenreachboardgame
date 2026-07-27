import { afterEach, describe, expect, it } from "vitest";
import { createInitialSessionState } from "../sessionState.js";
import { applyPhaseOneQaFixture } from "../phaseOneQaFixture.js";
import { buildMovementRoutePlan } from "../../game/rules/movementPlanner.js";
import { startAshenReachServer, type StartedAshenReachServer } from "../index.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";

const started: StartedAshenReachServer[] = [];
let serverPortOffset = 0;

const nextTestServerPort = () => 20_000 + (process.pid % 10_000) + serverPortOffset++ * 20;

afterEach(async () => {
  await Promise.all(started.splice(0).map((server) => server.close()));
});

describe("Phase 1 QA fixture", () => {
  it("creates deterministic P4 result, private, end-turn, and handoff states", () => {
    const createActive = () => {
      const state = createInitialSessionState("QA-P4", "multiplayer", "scenario_broken_seal", "co-op", "standard", 2);
      state.status = "active" as const;
      state.seats.forEach((seat, index) => {
        seat.displayName = index === 0 ? "Joel" : "Erik";
        seat.connected = true;
      });
      return state;
    };

    const result = createActive();
    applyPhaseOneQaFixture(result, "seat-1", { kind: "waiting-handoff", stage: "long-result" });
    expect(result.activeResolution?.stage).toBe("outcome_summary");
    expect(result.activeResolution?.outcome?.effects).toHaveLength(3);

    const privateChoice = createActive();
    applyPhaseOneQaFixture(privateChoice, "seat-1", { kind: "waiting-handoff", stage: "private-choice" });
    expect(privateChoice.pendingEncounterDecision?.seatId).toBe("seat-1");

    const endTurn = createActive();
    applyPhaseOneQaFixture(endTurn, "seat-1", { kind: "waiting-handoff", stage: "end-turn" });
    expect(endTurn.phase).toBe("action");

    const handoff = createActive();
    applyPhaseOneQaFixture(handoff, "seat-1", { kind: "waiting-handoff", stage: "handoff" });
    expect(handoff.eventLog.at(-1)).toMatchObject({ type: "TURN_COMPLETED", seatId: "seat-1" });
  });

  it.each([
    ["payment", 3, "encounter_payment"],
    ["optional-payment", 3, "sequence"],
    ["insufficient", 0, "encounter_payment"],
    ["battle-reward", 3, "gain_salvage"],
    ["event-reward", 3, "gain_salvage"]
  ] as const)("provides a deterministic Salvage %s state", (stage, salvage, effectType) => {
    const state = createInitialSessionState("QA-SALVAGE", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";

    applyPhaseOneQaFixture(state, "seat-1", { kind: "salvage-resolution", stage });

    expect(state.players[0]?.character.salvage).toBe(salvage);
    expect(state.pendingEffect?.type).toBe(effectType);
    expect(state.activeResolution).toMatchObject({
      id: `qa-salvage:${stage}`,
      stage: "roll_result"
    });
  });

  it.each(["enemy", "hazard", "event", "anomaly", "escalation", "persistent"] as const)(
    "provides a deterministic %s card-category state",
    (stage) => {
      const state = createInitialSessionState("QA-CATEGORY", "multiplayer", "scenario_broken_seal", "co-op", "standard", 2);
      state.status = "active";
      applyPhaseOneQaFixture(state, "seat-1", { kind: "card-category", stage });
      expect(state.activeResolution?.origin?.sourceEventId).toBe(`qa-card-category:${stage}`);
      expect(state.activeResolution?.card?.type).toBe(stage === "persistent" ? "anomaly" : stage);
      expect(state.activeResolution?.stage).toBe("roll_result");
    }
  );

  it("provides an environment-gated scenario-selection lobby without bypassing projected setup", () => {
    const state = createInitialSessionState("QA-SETUP", "multiplayer", "scenario_broken_seal", "co-op", "standard", 2);
    state.status = "lobby";

    applyPhaseOneQaFixture(state, "seat-1", { kind: "setup-flow", stage: "scenario-selection" });

    expect(state.status).toBe("lobby");
    expect(state.phase).toBe("start");
    expect(state.lobbyConfigured).toBe(false);
    expect(state.setupHostSeatId).toBe("seat-1");
  });

  it("provides deterministic acquired and used follower states without changing ownership", () => {
    const state = createInitialSessionState("QA-FOLLOWER", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    applyPhaseOneQaFixture(state, "seat-1", { kind: "follower", stage: "acquired" });
    expect(state.players[0]?.character.followers?.map((follower) => follower.id)).toEqual(["lucy-hell-puppy"]);
    expect(state.lastOutcomeSummary?.summary).toContain("joined");

    applyPhaseOneQaFixture(state, "seat-1", { kind: "follower", stage: "used" });
    expect(state.players[0]?.character.followers?.[0]?.exhausted).toBe(true);
    expect(state.players[0]?.character.followers?.[0]?.instanceId).toBe("qa-follower:lucy-hell-puppy");
  });
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

  it("projects deterministic P7 inventory relevance without exposing it on TV", () => {
    const state = createInitialSessionState("QA-P7", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    applyPhaseOneQaFixture(state, "seat-1", { kind: "inventory-player-card", stage: "battle" });

    const phone = createPhoneProjection(state, "seat-1", true) as {
      objectUseStates?: Array<{
        id: string;
        relevantNow?: boolean;
        relevanceKind?: string;
        currentContext?: string | null;
      }>;
    };
    const tv = createTvProjection(state) as Record<string, unknown>;
    const fuse = phone.objectUseStates?.find((entry) => entry.id === "black-route-fuse");
    const armor = phone.objectUseStates?.find((entry) => entry.id === "rivetplate-vest");

    expect(fuse).toMatchObject({ relevantNow: true, relevanceKind: "usable", currentContext: "Battle roll" });
    expect(armor).toMatchObject({ relevantNow: true, relevanceKind: "passive", currentContext: "Battle roll" });
    expect(JSON.stringify(tv)).not.toContain("objectUseStates");
    expect(JSON.stringify(tv)).not.toContain("relevanceKind");
  });

  it("prepares canonical tile-arrival QA stages without changing topology", () => {
    const challenge = createInitialSessionState("QA-TILE-CHALLENGE", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    challenge.status = "active";
    applyPhaseOneQaFixture(challenge, "seat-1", { kind: "tile-arrival", stage: "challenge" });
    expect(challenge.pendingTileChallenge).toMatchObject({ seatId: "seat-1", sectorId: "ashen-chapel", testStat: "signal" });
    expect(challenge.tileArrivalThreatProgress).toMatchObject({ seatId: "seat-1", sectorId: "ashen-chapel" });

    const multi = createInitialSessionState("QA-TILE-MULTI", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    multi.status = "active";
    applyPhaseOneQaFixture(multi, "seat-1", { kind: "tile-arrival", stage: "multi-effect" });
    expect(multi.tileArrivalThreatProgress?.threatLanes).toEqual(["red", "blue", "yellow"]);
    expect(multi.phase).toBe("sector");

    const shop = createInitialSessionState("QA-TILE-SHOP", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    shop.status = "active";
    applyPhaseOneQaFixture(shop, "seat-1", { kind: "tile-arrival", stage: "optional-shop" });
    expect(shop.phase).toBe("action");
    expect(shop.players[0]?.character.currentSpaceId).toBe("outer_waymarket");
  });

  it("prepares a deterministic Trophy upgrade fixture", () => {
    const state = createInitialSessionState("QA-TROPHY", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    applyPhaseOneQaFixture(state, "seat-1", { kind: "inventory-player-card", stage: "trophies" });
    const player = state.players.find((entry) => entry.seatId === "seat-1")!;
    expect(player.character.trophies).toBe(6);
    expect(player.character.trophyPile).toEqual([
      expect.objectContaining({ cardId: "cinder-veil-stalker", trophyValue: 6, spentValue: 0, stat: "grit" })
    ]);
  });

  it("isolates host presentation fixtures from prior movement and arrival state", () => {
    const state = createInitialSessionState("QA-P20-ISOLATION", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";

    applyPhaseOneQaFixture(state, "seat-1", { kind: "movement-journey", stage: "ashen-chapel" });
    expect(state.movementRolls?.["seat-1"]).toBe(2);

    applyPhaseOneQaFixture(state, "seat-1", { kind: "tile-arrival", stage: "multi-effect" });
    expect(state.tileArrivalThreatProgress).not.toBeNull();

    applyPhaseOneQaFixture(state, "seat-1", { kind: "waiting-handoff", stage: "next-turn" });
    expect(state.movementRolls).toBeUndefined();
    expect(state.tileArrivalThreatProgress).toBeNull();
    expect(state.tileChallengeProgress).toBeNull();
  });

  it("prepares Mission progress and readiness without resolving the reward", () => {
    const state = createInitialSessionState("QA-MISSION", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    applyPhaseOneQaFixture(state, "seat-1", { kind: "mission-reward", stage: "progress" });
    expect(state.players[0]?.character.activeContract).toMatchObject({ contractId: "choir-echo-triangulation", progress: 1 });
    expect(state.players[0]?.character.salvage).toBe(4);

    applyPhaseOneQaFixture(state, "seat-1", { kind: "mission-reward", stage: "ready" });
    expect(state.players[0]?.character.activeContract).toMatchObject({ contractId: "choir-echo-triangulation", progress: 3 });
    expect(state.players[0]?.character.completedContracts ?? []).toHaveLength(0);
    expect(state.players[0]?.character.salvage).toBe(4);
  });

  it("prepares four canonical same-tier one-step routes for the movement UI comparison", () => {
    const state = createInitialSessionState("QA001", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    applyPhaseOneQaFixture(state, "seat-1", { kind: "phone-movement", stage: "four-routes" });

    expect(state.players[0]?.sectorId).toBe("ashwake-crossing");
    expect(state.movementRolls?.["seat-1"]).toBe(1);
    const plan = buildMovementRoutePlan(state, "seat-1");
    expect(plan?.routes.map((route) => route.sectorId).sort()).toEqual([
      "glassmere-spindle",
      "outer_ember_sanctum",
      "outer_surgery_tent",
      "votive-engine-room"
    ]);

    applyPhaseOneQaFixture(state, "seat-1", { kind: "phone-movement", stage: "confirmed" });
    expect(state.players[0]?.sectorId).toBe("votive-engine-room");
    expect(state.movementRolls).toBeUndefined();
    expect(state.lastOutcomeSummary).toEqual(expect.objectContaining({
      seatId: "seat-1",
      movedToSectorId: "votive-engine-room",
      success: true
    }));
  });

  it("does not expose the QA endpoint unless explicitly enabled", async () => {
    const normal = await startAshenReachServer({ port: nextTestServerPort(), host: "127.0.0.1", maxPortAttempts: 20, logUrls: false });
    started.push(normal);
    const normalResponse = await fetch(`http://127.0.0.1:${normal.port}/api/qa/phase1-fixture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    expect(normalResponse.status).toBe(404);
    await normal.close();
    started.pop();

    const qa = await startAshenReachServer({ port: nextTestServerPort(), host: "127.0.0.1", maxPortAttempts: 20, logUrls: false, qaFixturesEnabled: true });
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

  it.each([
    "encounter",
    "battle-setup",
    "pending-enemy-roll",
    "rolled-result",
    "success",
    "defeat"
  ] as const)("seeds deterministic phone battle stage %s", (stage) => {
    const state = createInitialSessionState("QA001", "single-player", "scenario_broken_seal", "co-op", "standard", 1);
    state.status = "active";
    state.seats[0] = { ...state.seats[0]!, displayName: "QA Operative", characterSelected: true, connected: true, ready: true };

    applyPhaseOneQaFixture(state, "seat-1", { kind: "phone-battle", stage });

    expect(state.currentEncounter?.id).toBe("lantern-ash-ghoul");
    expect(state.phase).toBe(["rolled-result", "success", "defeat"].includes(stage) ? "resolution" : "action");

    if (stage === "encounter") {
      expect(state.activeResolution).toBeNull();
      return;
    }

    expect(state.activeResolution).toMatchObject({
      id: "qa-phone-battle:seat-1:lantern-ash-ghoul",
      playerId: "seat-1",
      source: "threat",
      card: { id: "lantern-ash-ghoul", artType: "threat" },
      battle: { stat: "grit", difficulty: 12 }
    });
    expect(Boolean(state.pendingEnemyRoll)).toBe(stage === "pending-enemy-roll");
    expect(Boolean(state.activeResolution?.roll)).toBe(["rolled-result", "success", "defeat"].includes(stage));
    expect(state.lastOutcomeSummary?.success ?? null).toBe(stage === "success" ? true : stage === "defeat" ? false : null);
  });

  it("clears a prior private prompt before projecting a different QA state", () => {
    const state = createInitialSessionState("QA-CLEAR", "multiplayer", "scenario_broken_seal", "co-op", "standard", 2);
    state.status = "active";
    for (const seat of state.seats.slice(0, 2)) {
      seat.displayName = seat.seatId;
      seat.connected = true;
      seat.characterSelected = true;
      seat.ready = true;
    }

    applyPhaseOneQaFixture(state, "seat-1", { kind: "scar-system", stage: "choice" });
    expect(state.pendingScarChoice).not.toBeNull();
    applyPhaseOneQaFixture(state, "seat-1", { kind: "phone-battle", stage: "battle-setup" });

    expect(state.pendingScarChoice).toBeNull();
    const waitingProjection = createPhoneProjection(state, "seat-2") as {
      requiredAction?: { kind?: string; detail?: string } | null;
    };
    expect(waitingProjection.requiredAction).toMatchObject({ kind: "battle" });
    expect(waitingProjection.requiredAction?.detail).not.toMatch(/Scar/i);
  });

  it("projects public-safe host rare states without private reaction identifiers", () => {
    const state = createInitialSessionState("QA-RARE", "multiplayer", "scenario_broken_seal", "co-op", "standard", 4);
    state.status = "active";
    for (const seat of state.seats.slice(0, 4)) {
      seat.displayName = seat.seatId;
      seat.connected = true;
      seat.characterSelected = true;
      seat.ready = true;
    }

    applyPhaseOneQaFixture(state, "seat-1", { kind: "host-rare", stage: "stacked-operatives" });
    expect(new Set(state.players.slice(0, 4).map((player) => player.sectorId))).toEqual(new Set(["outer_waymarket"]));

    applyPhaseOneQaFixture(state, "seat-1", { kind: "host-rare", stage: "reaction-pending" });
    const reactionTv = createTvProjection(state) as Record<string, unknown>;
    expect(reactionTv.pendingOrderedConsequence).toMatchObject({ seatId: "seat-1", sourceId: "suture-storm", status: "waiting" });
    expect(JSON.stringify(reactionTv)).not.toMatch(/qa:suture-storm:ordered-consequence|reactionId/);

    applyPhaseOneQaFixture(state, "seat-1", { kind: "host-rare", stage: "scar-pending" });
    const scarTv = createTvProjection(state) as Record<string, unknown>;
    const scarPhone = createPhoneProjection(state, "seat-1", true) as Record<string, unknown>;
    expect(scarTv.scarTriggerStatus).toEqual({ seatId: "seat-1", scarTitle: "Static Burn", status: "waiting" });
    expect(JSON.stringify(scarTv)).not.toMatch(/qa-scar-trigger:seat-1|pendingEffects/);
    expect(scarPhone.pendingScarConsequence).toBeTruthy();

    applyPhaseOneQaFixture(state, "seat-1", { kind: "host-rare", stage: "recall-triggered" });
    expect(state.players[0]?.character).toMatchObject({ status: "recalled", wounds: state.woundThreshold });
    expect(state.players[0]?.character.scars).toContain("scar-wound-1");
  });

  it("provides detached objective presentation states without leaking private Contract or locked Agenda fields", () => {
    const state = createInitialSessionState("QA-OBJECTIVES", "multiplayer", "scenario_broken_seal", "rivalry", "standard", 2);
    state.status = "active";
    state.seats.slice(0, 2).forEach((seat, index) => {
      seat.displayName = index === 0 ? "Joel" : "Anna";
      seat.connected = true;
    });

    applyPhaseOneQaFixture(state, "seat-1", { kind: "objective-presentation", stage: "contract-near" });
    const owner = createPhoneProjection(state, "seat-1") as { activeContractCard?: { id?: string } | null };
    const waiting = createPhoneProjection(state, "seat-2") as { activeContractCard?: { id?: string } | null; players?: Array<{ character?: { activeContract?: unknown } }> };
    const tv = createTvProjection(state) as { players?: Array<{ character?: { activeContract?: unknown } }> };
    expect(owner.activeContractCard?.id).toBe("choir-echo-triangulation");
    expect(waiting.activeContractCard).toBeNull();
    expect(waiting.players?.[0]?.character?.activeContract).toBeNull();
    expect(tv.players?.[0]?.character?.activeContract).toBeNull();

    applyPhaseOneQaFixture(state, "seat-1", { kind: "objective-presentation", stage: "agenda-locked" });
    const lockedOwner = createPhoneProjection(state, "seat-1") as { privateRivalry?: { objective?: unknown } | null };
    expect(lockedOwner.privateRivalry?.objective).toBeUndefined();

    applyPhaseOneQaFixture(state, "seat-1", { kind: "objective-presentation", stage: "agenda-revealed" });
    const revealedOwner = createPhoneProjection(state, "seat-1") as { privateRivalry?: { objective?: { title?: string } } | null };
    expect(revealedOwner.privateRivalry?.objective?.title).toBeTruthy();
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
