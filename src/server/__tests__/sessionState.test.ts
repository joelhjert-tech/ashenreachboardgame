import { describe, expect, it } from "vitest";
import { RIFTFALL_BOARD_NODES } from "../../data/riftfallBoardNodes.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createCanonicalSectorGraph, validateCanonicalSectorGraph } from "../../game/data/canonicalSectorGraph.js";
import { BOARD_SPACES } from "../../game/data/boardSpaces.js";
import { SCENARIOS } from "../../game/data/scenarios.js";
import { loadContracts } from "../../game/content/contracts.js";
import { loadFollowers } from "../../game/content/followers.js";
import { loadGear } from "../../game/content/gear.js";
import { reduceGameState } from "../../game/engine/reducer.js";
import { applyStartingLoadout } from "../../game/rules/startingLoadout.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";
import { validateJoinToken } from "../auth.js";
import { createInitialSessionState } from "../sessionState.js";
import { loadTileChallenges } from "../../game/content/tileChallenges.js";
import { attachTileChallengesToSectors } from "../../game/rules/tileChallenges.js";
import { GameRoomServer, type ConnectedClient } from "../roomServer.js";
import type { PhonePatchPayload, PublicPatchPayload } from "../../client/shared/types.js";
import type { ContractCard } from "../../game/schema/contract.schema.js";

describe("canonical sector graph", () => {
  it("attaches Rift Whispers as a recurring anomaly challenge instead of a threat", () => {
    const state = createInitialSessionState("tile-challenge-session");
    const chapel = state.sectors.find((sector) => sector.id === "ashen-chapel");
    expect(chapel?.encounterDecks.threat).not.toContain("rift-whispers");
    expect(chapel?.tileChallenges).toEqual([
      expect.objectContaining({ id: "rift-whispers-ashen-chapel", challengeType: "anomaly", testStat: "signal", recurring: true })
    ]);
  });

  it("rejects unknown sectors and duplicate authored order", () => {
    const sectors = createCanonicalSectorGraph();
    const challenge = [...loadTileChallenges().values()][0]!;
    expect(() => attachTileChallengesToSectors(sectors, [{ ...challenge, sectorId: "missing-sector" }])).toThrow(/unknown sector/i);
    expect(() => attachTileChallengesToSectors(sectors, [challenge, { ...challenge, id: `${challenge.id}-copy` }])).toThrow(/authored order is duplicated/i);
  });

  it("opens a persisted recurring tile challenge before sector threats", () => {
    const state = createInitialSessionState("tile-challenge-lifecycle", "single-player");
    state.status = "active";
    state.phase = "sector";
    state.players[0]!.sectorId = "ashen-chapel";
    state.players[0]!.character.currentSpaceId = "ashen-chapel";
    const server = new GameRoomServer(state);
    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    const pending = server.getState().pendingTileChallenge;
    expect(pending).toMatchObject({ challengeId: "rift-whispers-ashen-chapel", challengeType: "anomaly", testStat: "signal", rolled: false });
    expect(server.getState().currentEncounter?.cardType).toBe("hazard");
    expect(server.getState().sectors.find((sector) => sector.id === "ashen-chapel")?.tileChallenges).toHaveLength(1);
    expect(server.getState().players[0]?.character.trophyPile).toEqual([]);
  });

  it("keeps challenges recurring across outcomes, authored order, revisits, and operatives", () => {
    const outcomeState = createInitialSessionState("tile-challenge-outcomes", "single-player");
    const challenge = outcomeState.sectors.find((sector) => sector.id === "ashen-chapel")!.tileChallenges![0]!;
    for (const success of [true, false]) {
      const state = structuredClone(outcomeState);
      state.status = "active";
      state.phase = "resolution";
      state.resolutionSource = "tileChallenge";
      state.pendingEffect = success ? challenge.successEffect : challenge.failureEffect;
      const result = reduceGameState(state, { type: "RESOLUTION_APPLIED", seatId: "seat-1", createdAt: "2026-07-11T00:00:00.000Z", effect: state.pendingEffect, sourceCardId: challenge.id, success });
      expect(result.state.sectors.find((sector) => sector.id === "ashen-chapel")?.tileChallenges).toContainEqual(challenge);
      expect(result.state.players[0]?.character.trophyPile).toEqual([]);
      expect(result.state.players[0]?.character.heldGear.some((item) => item.id === challenge.id)).toBe(false);
    }

    const state = createInitialSessionState("tile-challenge-order");
    const chapel = state.sectors.find((sector) => sector.id === "ashen-chapel")!;
    const second = { ...challenge, id: `${challenge.id}-second`, name: "Second Rift", authoredOrder: 1 };
    chapel.tileChallenges = [second, challenge];
    for (const player of state.players.slice(0, 2)) {
      player.sectorId = "ashen-chapel";
      player.character.currentSpaceId = "ashen-chapel";
    }
    const server = new GameRoomServer(state);
    const start = (seatId: string) => (server as unknown as { startNextTileChallenge: (id: string) => boolean }).startNextTileChallenge(seatId);
    expect(start("seat-1")).toBe(true);
    expect(server.getState().pendingTileChallenge?.challengeId).toBe(challenge.id);
    server.getState().pendingTileChallenge = null;
    server.getState().tileChallengeProgress = { seatId: "seat-1", sectorId: "ashen-chapel", resolvedChallengeIds: [challenge.id] };
    expect(start("seat-1")).toBe(true);
    expect(server.getState().pendingTileChallenge?.challengeId).toBe(second.id);
    server.getState().pendingTileChallenge = null;
    server.getState().tileChallengeProgress = null;
    expect(start("seat-1")).toBe(true);
    expect(server.getState().pendingTileChallenge?.challengeId).toBe(challenge.id);
    server.getState().pendingTileChallenge = null;
    server.getState().tileChallengeProgress = null;
    expect(start("seat-2")).toBe(true);
    expect(server.getState().pendingTileChallenge).toMatchObject({ seatId: "seat-2", challengeId: challenge.id });
  });

  it("keeps challenge details public but the pending resolution id owner-private", () => {
    const state = createInitialSessionState("tile-challenge-projection");
    state.status = "active";
    state.phase = "sector";
    state.players[0]!.sectorId = "ashen-chapel";
    state.players[0]!.character.currentSpaceId = "ashen-chapel";
    const server = new GameRoomServer(state);
    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    const tv = createTvProjection(server.getState()) as unknown as PublicPatchPayload;
    const owner = createPhoneProjection(server.getState(), "seat-1") as unknown as PhonePatchPayload;
    const other = createPhoneProjection(server.getState(), "seat-2") as unknown as PhonePatchPayload;
    expect(tv.sectors.find((sector) => sector.id === "ashen-chapel")?.tileChallenges?.[0]).toMatchObject({ challengeType: "anomaly", recurring: true });
    expect(tv.pendingTileChallenge).toMatchObject({ challengeId: "rift-whispers-ashen-chapel", testStat: "signal" });
    expect(JSON.stringify(tv)).not.toContain(server.getState().pendingTileChallenge?.id);
    expect(owner.pendingTileChallengePrivate?.id).toBe(server.getState().pendingTileChallenge?.id);
    expect(other.pendingTileChallengePrivate).toBeNull();
  });

  it("spends one exact Choir Lantern charge for only the pending anomaly Signal challenge", () => {
    const state = createInitialSessionState("choir-light-lifecycle", "single-player");
    state.status = "active";
    state.phase = "sector";
    state.players[0]!.sectorId = "ashen-chapel";
    state.players[0]!.character.currentSpaceId = "ashen-chapel";
    const lantern = { ...loadGear().get("choir-lantern")!, instanceId: "choir-instance", currentCharges: 2, maxCharges: 2 };
    state.players[0]!.character.heldGear.push(lantern);
    state.players[0]!.character.equippedGear.utility = "choir-lantern";
    const server = new GameRoomServer(state);
    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    const pendingId = server.getState().pendingTileChallenge!.id;
    const sent: Array<Record<string, unknown>> = [];
    const client: ConnectedClient = { seatId: "seat-1", view: "phone", socket: { send: (payload: string) => sent.push(JSON.parse(payload)), close() {} } as unknown as ConnectedClient["socket"] };
    server.handleIntent(client, { type: "USE_GEAR", seatId: "seat-1", gearId: "choir-lantern", instanceId: "choir-instance", pendingTileChallengeId: pendingId });
    expect(sent.filter((message) => message.type === "INTENT_REJECTED")).toEqual([]);
    const owned = server.getState().players[0]!.character.heldGear.find((item) => item.instanceId === "choir-instance");
    expect(owned?.currentCharges).toBe(1);
    expect(server.getState().pendingTileChallenge?.modifierSources).toEqual([expect.objectContaining({ label: "Choir Lantern", value: 2, sourceInstanceId: "choir-instance" })]);
    server.handleIntent(client, { type: "USE_GEAR", seatId: "seat-1", gearId: "choir-lantern", instanceId: "choir-instance", pendingTileChallengeId: pendingId });
    expect(server.getState().players[0]!.character.heldGear.find((item) => item.instanceId === "choir-instance")?.currentCharges).toBe(1);
    expect(sent.some((message) => message.type === "INTENT_REJECTED" && /already committed/i.test(String(message.reason)))).toBe(true);

    server.getState().pendingTileChallenge = { ...server.getState().pendingTileChallenge!, id: "signal-hazard", challengeType: "hazard", modifierSources: [] };
    server.handleIntent(client, { type: "USE_GEAR", seatId: "seat-1", gearId: "choir-lantern", instanceId: "choir-instance", pendingTileChallengeId: "signal-hazard" });
    expect(server.getState().players[0]!.character.heldGear.find((item) => item.instanceId === "choir-instance")?.currentCharges).toBe(1);
  });

  it("suppresses exactly one pending anomaly failure effect with one exact Choir Static Censer charge", () => {
    const state = createInitialSessionState("static-intercession", "single-player");
    const challenge = state.sectors.find((sector) => sector.id === "ashen-chapel")!.tileChallenges![0]!;
    state.status = "active";
    state.phase = "resolution";
    state.resolutionSource = "tileChallenge";
    state.pendingTileChallenge = {
      id: "pending-static-intercession",
      challengeId: challenge.id,
      sectorId: challenge.sectorId,
      seatId: "seat-1",
      challengeType: "anomaly",
      testStat: challenge.testStat,
      difficulty: challenge.difficulty,
      sourceTags: challenge.tags,
      successEffect: challenge.successEffect,
      failureEffect: challenge.failureEffect,
      authoredOrder: challenge.authoredOrder,
      totalChallenges: 1,
      rolled: true,
      modifierSources: [],
      createdAt: "2026-07-12T00:00:00.000Z"
    };
    state.activeResolution = {
      id: "pending-static-intercession",
      playerId: "seat-1",
      source: "anomaly",
      stage: "roll_result",
      roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: 8, success: false }
    };
    state.pendingEffect = {
      type: "sequence",
      effects: [{ type: "gain_scar", scarId: "scar-wound-6" }, { type: "take_wound", amount: 1 }]
    };
    state.pendingStaticIntercessionReaction = {
      id: "pending-static-intercession:static-intercession",
      seatId: "seat-1",
      pendingTileChallengeId: "pending-static-intercession",
      suppressibleEffects: [{ effectId: "pending-static-intercession:failure-effect", effect: state.pendingEffect }],
      selectedEffectId: null,
      createdAt: "2026-07-12T00:00:00.000Z"
    };
    const definition = loadGear().get("choir-static-censer")!;
    state.players[0]!.character.heldGear.push(
      { ...definition, instanceId: "censer-a", currentCharges: 2, maxCharges: 2 },
      { ...definition, instanceId: "censer-b", currentCharges: 2, maxCharges: 2 }
    );
    state.players[0]!.character.equippedGear.utility = "choir-static-censer";
    const server = new GameRoomServer(state);
    const sent: Array<Record<string, unknown>> = [];
    const client: ConnectedClient = { seatId: "seat-1", view: "phone", socket: { send: (payload: string) => sent.push(JSON.parse(payload)), close() {} } as unknown as ConnectedClient["socket"] };

    const owner = createPhoneProjection(server.getState(), "seat-1") as unknown as PhonePatchPayload;
    expect(owner.pendingTileChallengePrivate?.pendingFailureEffects).toEqual([
      expect.objectContaining({ effectId: "pending-static-intercession:failure-effect" })
    ]);
    server.handleIntent(client, {
      type: "USE_GEAR", seatId: "seat-1", gearId: "choir-static-censer", instanceId: "censer-a",
      pendingTileChallengeId: "pending-static-intercession", staticIntercessionReactionId: "pending-static-intercession:static-intercession",
      pendingTileChallengeEffectId: "pending-static-intercession:failure-effect"
    });

    expect(sent.filter((message) => message.type === "INTENT_REJECTED")).toEqual([]);
    expect(server.getState().pendingEffect).toBeNull();
    expect(server.getState().pendingStaticIntercessionReaction?.selectedEffectId).toBe("pending-static-intercession:failure-effect");
    expect(server.getState().activeResolution?.roll?.success).toBe(false);
    expect(server.getState().players[0]!.character.heldGear.find((item) => item.instanceId === "censer-a")?.currentCharges).toBe(1);
    expect(server.getState().players[0]!.character.heldGear.find((item) => item.instanceId === "censer-b")?.currentCharges).toBe(2);
    expect(server.getState().sectors.find((sector) => sector.id === "ashen-chapel")?.tileChallenges).toContainEqual(challenge);

    server.handleIntent(client, {
      type: "USE_GEAR", seatId: "seat-1", gearId: "choir-static-censer", instanceId: "censer-b",
      pendingTileChallengeId: "pending-static-intercession", staticIntercessionReactionId: "pending-static-intercession:static-intercession",
      pendingTileChallengeEffectId: "pending-static-intercession:failure-effect"
    });
    expect(server.getState().pendingEffect).toBeNull();
    expect(server.getState().players[0]!.character.heldGear.find((item) => item.instanceId === "censer-b")?.currentCharges).toBe(2);
    expect(sent.some((message) => message.type === "INTENT_REJECTED" && /stale|unavailable|already affected/i.test(String(message.reason)))).toBe(true);
  });

  it("routes tile challenge mission completion through COMPLETE_CONTRACT exactly once", () => {
    const state = createInitialSessionState("tile-challenge-contract", "single-player");
    const mission: ContractCard = {
      id: "contract-rift-witness",
      name: "Rift Witness",
      factionGiver: "Glass Choir",
      text: "Resolve Rift Whispers and return with the signal intact.",
      objective: {
        type: "tileChallengeResolved",
        challengeId: "rift-whispers-ashen-chapel",
        sectorId: "ashen-chapel",
        challengeType: "anomaly",
        challengeTag: "anomaly",
        requireSuccess: true,
        target: 1,
        label: "Succeed at Rift Whispers"
      },
      reward: { type: "gain_salvage", amount: 2 }
    };
    const missionTwo = state.availableContracts.find((contract) => contract.id !== mission.id)!;
    state.availableContracts.push(mission);
    state.status = "active";
    state.phase = "resolution";
    state.resolutionSource = "tileChallenge";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.players[0]!.sectorId = "ashen-chapel";
    state.players[0]!.character.currentSpaceId = "ashen-chapel";
    state.players[0]!.character.activeContract = { contractId: mission.id, progress: 0 };
    const startingSalvage = state.players[0]!.character.salvage ?? 0;
    const challenge = state.sectors.find((sector) => sector.id === "ashen-chapel")!.tileChallenges![0]!;
    const chapel = state.sectors.find((sector) => sector.id === "ashen-chapel")!;
    chapel.threatIcons = [];
    chapel.encounterDecks = { threat: [], anomaly: [], artifact: [], contract: [], escalation: [] };
    state.pendingTileChallenge = {
      id: "pending-rift-contract",
      challengeId: challenge.id,
      sectorId: challenge.sectorId,
      seatId: "seat-1",
      challengeType: challenge.challengeType,
      testStat: challenge.testStat,
      difficulty: challenge.difficulty,
      sourceTags: challenge.tags,
      successEffect: challenge.successEffect,
      failureEffect: challenge.failureEffect,
      authoredOrder: challenge.authoredOrder,
      totalChallenges: 1,
      rolled: true,
      modifierSources: [],
      createdAt: "2026-07-11T00:00:00.000Z"
    };
    state.lastOutcomeSummary = {
      seatId: "seat-1", movedToSectorId: "ashen-chapel", encounterCardId: challenge.id, encounterTitle: challenge.name,
      encounterCardType: "hazard", checkStat: "signal", die1: 4, die2: 5, statBonus: 1, checkTotal: 10, difficulty: 8,
      enemyRollerSeatId: null, enemyDie1: null, enemyDie2: null, enemyBonus: null, enemyTotal: null, success: true, summary: "Rift Whispers resolved."
    };

    const server = new GameRoomServer(state);
    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    server.getState().activeResolution = null;
    server.getState().currentEncounter = null;
    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    const completed = server.getState().players[0]!.character;
    expect(completed.salvage).toBe(startingSalvage + 2);
    expect(completed.completedContracts).toEqual([mission.id]);
    expect(completed.activeContract).toBeNull();
    expect(server.getState().eventLog.filter((event) => (event as { type?: string; contractId?: string }).type === "COMPLETE_CONTRACT" && (event as { contractId?: string }).contractId === mission.id)).toHaveLength(1);
    expect(server.getState().sectors.find((sector) => sector.id === "ashen-chapel")?.tileChallenges).toContainEqual(challenge);

    const phone = createPhoneProjection(server.getState(), "seat-1") as unknown as PhonePatchPayload & { activeContractCard: unknown };
    const tv = createTvProjection(server.getState()) as unknown as PublicPatchPayload;
    expect(phone.activeContractCard).toBeNull();
    expect((phone.self as unknown as { character: { completedContracts: string[] } }).character.completedContracts).toEqual([mission.id]);
    expect(tv.players.find((player) => player.seatId === "seat-1")?.character.activeContract ?? null).toBeNull();

    server.getState().phase = "action";
    const sent: Array<Record<string, unknown>> = [];
    const client: ConnectedClient = { seatId: "seat-1", view: "phone", socket: { send: (payload: string) => sent.push(JSON.parse(payload)), close() {} } as unknown as ConnectedClient["socket"] };
    server.handleIntent(client, { type: "ACCEPT_CONTRACT", seatId: "seat-1", contractId: missionTwo.id });
    expect(server.getState().players[0]!.character.activeContract?.contractId).toBe(missionTwo.id);

    server.getState().phase = "resolution";
    server.getState().resolutionSource = "tileChallenge";
    server.getState().pendingTileChallenge = structuredClone(state.pendingTileChallenge);
    server.getState().lastOutcomeSummary = { ...state.lastOutcomeSummary, success: true };
    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    expect(server.getState().players[0]!.character.salvage).toBe(startingSalvage + 2);
    expect(server.getState().players[0]!.character.completedContracts).toEqual([mission.id]);
    expect(server.getState().eventLog.filter((event) => (event as { type?: string; contractId?: string }).type === "COMPLETE_CONTRACT" && (event as { contractId?: string }).contractId === mission.id)).toHaveLength(1);
  });
  it("creates one live sector for every board node and keeps ids aligned", () => {
    const sectors = createCanonicalSectorGraph();

    validateCanonicalSectorGraph(sectors);

    expect(sectors).toHaveLength(BOARD_SPACES.length);
    expect(sectors.map((sector) => sector.id).sort()).toEqual(RIFTFALL_BOARD_NODES.map((node) => node.id).sort());
  });

  it("keeps the live threat deck broad and every canonical threat reference resolvable", () => {
    const sectors = createCanonicalSectorGraph();
    const threats = loadThreatCards();
    const referencedThreatIds = new Set([
      ...sectors.flatMap((sector) => sector.encounterDecks.threat),
      ...[...loadTileChallenges().values()].map((challenge) => challenge.artCardId)
    ]);
    const severities = new Set([...threats.values()].map((threat) => threat.severity));

    expect(threats.size).toBeGreaterThanOrEqual(40);
    expect(referencedThreatIds.size).toBe(threats.size);
    expect([...referencedThreatIds].filter((threatId) => !threats.has(threatId))).toEqual([]);
    expect([...severities].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("starts the session on the canonical board using each character's authored starting space", () => {
    const state = createInitialSessionState("session-alpha");
    const liveSectorIds = new Set(state.sectors.map((sector) => sector.id));

    expect(state.sectors).toHaveLength(BOARD_SPACES.length);
    expect(state.seats).toHaveLength(6);
    expect(state.players).toHaveLength(6);
    expect(state.turnOrder).toEqual(["seat-1", "seat-2", "seat-3", "seat-4", "seat-5", "seat-6"]);
    expect(state.activeScenarioId).toBe("scenario_broken_seal");
    expect(state.scenarioProgress).toEqual({});
    expect(state.scenarioPreparation.resources).toEqual({ sealIntegrity: 6 });
    expect(state.woundThreshold).toBe(3);

    for (const player of state.players) {
      expect(player.sectorId).toBe(player.character.currentSpaceId);
      expect(liveSectorIds.has(player.sectorId)).toBe(true);
    }
  });

  it("applies normal starting salvage and character gear without auto-assigning starting contracts", () => {
    const state = createInitialSessionState("session-alpha", "multiplayer");
    const firstPlayer = state.players[0];

    expect(firstPlayer?.character.salvage).toBe(3);
    expect(firstPlayer?.character.activeContract).toBeNull();
    expect(state.seats[0]?.startingContractOptions).toEqual([]);
    expect(state.seats[0]?.selectedStartingContractId).toBeNull();
    expect(firstPlayer?.character.heldGear.map((item) => item.id)).toEqual(["rustknife-carbine", "chapel-guard-harness"]);
    expect(firstPlayer?.character.followers ?? []).toEqual([]);
    expect(state.soloRerollCharges).toEqual({});
  });

  it("creates non-forgeable per-seat join tokens for new sessions", () => {
    const first = createInitialSessionState("session-alpha", "single-player");
    const second = createInitialSessionState("session-alpha", "single-player");

    expect(first.seats[0]?.joinToken).toMatch(/^seat:session-alpha:seat-1:/);
    expect(first.seats[0]?.joinToken).not.toBe("seat:session-alpha:seat-1");
    expect(first.seats[0]?.joinToken).not.toBe(second.seats[0]?.joinToken);
  });

  it("rejects legacy unsigned join token helpers", () => {
    expect(validateJoinToken("seat:session-alpha:seat-1", "session-alpha")).toBeNull();
    expect(validateJoinToken("seat:session-alpha:seat-1:", "session-alpha")).toBeNull();
  });

  it("creates a true single-player session when requested", () => {
    const state = createInitialSessionState("session-solo", "single-player");
    const tvProjection = createTvProjection(state) as {
      sessionMode: string;
      escalationThreshold: number;
      seats: Array<{ seatId: string }>;
      players: Array<{ seatId: string }>;
    };

    expect(state.sessionMode).toBe("single-player");
    expect(state.seats.map((seat) => seat.seatId)).toEqual(["seat-1"]);
    expect(state.players.map((player) => player.seatId)).toEqual(["seat-1"]);
    expect(state.turnOrder).toEqual(["seat-1"]);
    expect(state.reflectionPressureThreshold).toBe(8);
    expect(state.woundThreshold).toBe(4);
    expect(state.scenarioProgress).toEqual({});
    expect(state.scenarioPreparation.resources).toEqual({ sealIntegrity: 8 });
    expect(state.soloRerollCharges).toEqual({ "seat-1": 1 });
    expect(state.players[0]?.character.salvage).toBe(4);
    expect(state.players[0]?.character.activeContract).toBeNull();
    expect(state.seats[0]?.startingContractOptions).toEqual([]);
    expect(state.seats[0]?.selectedStartingContractId).toBeNull();
    expect(state.players[0]?.character.heldGear.map((item) => item.id)).toEqual(["rustknife-carbine", "chapel-guard-harness"]);
    expect(state.players[0]?.character.followers?.map((follower) => follower.id)).toEqual(["grave-scribe"]);
    expect(tvProjection.sessionMode).toBe("single-player");
    expect(tvProjection.escalationThreshold).toBe(8);
    expect(tvProjection.seats).toHaveLength(1);
    expect(tvProjection.players).toHaveLength(0);
  });

  it.each([
    ["cooperative", "co-op"],
    ["rivalry", "rivalry"]
  ] as const)("initializes the Mirror reflection-pressure cutoff to 6 in %s multiplayer", (_label, interactionMode) => {
    const state = createInitialSessionState(`session-${_label}`, "multiplayer", "scenario_mirror_of_false_heroes", interactionMode, "standard", 2);
    expect(state.reflectionPressureThreshold).toBe(6);
  });

  it("lets character starting-loadout overrides replace solo mode defaults", () => {
    const base = createInitialSessionState("session-override", "single-player").players[0]!.character;
    const loaded = applyStartingLoadout(
      {
        ...base,
        salvage: 0,
        activeContract: null,
        heldGear: [],
        followers: [],
        startingSalvage: 7,
        startingGear: ["tuning-spines"],
        startingFollower: ["glassmere-mapper"],
        startingContract: "choir-hush-census"
      },
      {
        sessionMode: "single-player",
        seatIndex: 0,
        catalogs: {
          contracts: [...loadContracts().values()],
          gear: loadGear(),
          followers: loadFollowers()
        }
      }
    );

    expect(loaded.salvage).toBe(7);
    expect(loaded.activeContract).toEqual({ contractId: "choir-hush-census", progress: 0 });
    expect(loaded.heldGear.map((item) => item.id)).toEqual(["tuning-spines"]);
    expect(loaded.followers?.map((follower) => follower.id)).toEqual(["glassmere-mapper"]);
  });

  it("seeds the requested scenario instead of always defaulting to Broken Seal", () => {
    const state = createInitialSessionState("session-devourer", "multiplayer", "scenario_devourer_beneath");

    expect(state.activeScenarioId).toBe("scenario_devourer_beneath");
    expect(state.scenarioProgress).toEqual({ doomTokens: 0, devourerIndex: 0 });
  });

  it("can initialize every authored scenario id without falling back or breaking progress seeding", () => {
    for (const scenario of SCENARIOS) {
      const state = createInitialSessionState(`session-${scenario.id}`, "multiplayer", scenario.id);

      expect(state.activeScenarioId).toBe(scenario.id);
      expect(state.scenarioProgress).toBeDefined();
      expect(typeof state.scenarioProgress).toBe("object");
    }
  });

  it("includes the active scenario in both TV and phone projections", () => {
    const state = createInitialSessionState("session-alpha");
    const tvProjection = createTvProjection(state) as {
      activeScenario: {
        id: string;
        name: string;
        theme: string;
        sheetArtPath?: string | null;
        difficulty: string;
        pressureSummary: string;
        progress: number;
        threshold: number;
        finalGateRequirement?: string;
        scenarioRewards?: Array<{ id: string }>;
        setup: string[];
        specialRules: string[];
        confrontationSteps: string[];
        victoryText: string;
      } | null;
      scenarioPressure: {
        scenarioId: string;
        mode: string;
        scenarioStatus: string;
        pressureTrack: { name: string; current: number; max: number };
        collapseTrack: { name: string; current: number; max: number; failureAtMax: boolean };
        objectiveProgress: { label: string; current: number; required: number; completed: boolean };
        modeSpecific: { privateAgenda: string };
      } | null;
      scenarioProgress: Record<string, number>;
      scenarioState: { preparation: { resources: Record<string, number> } };
      nemesis: { id: string } | null;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      activeScenario: { confrontationTitle: string; specialRules: string[]; victoryText: string } | null;
      scenarioPressure: {
        scenarioId: string;
        pressureTrack: { current: number; max: number };
        objectiveProgress: { current: number; required: number };
      } | null;
      scenarioProgress: Record<string, number>;
      scenarioState: { preparation: { resources: Record<string, number> } };
      nemesis: { id: string } | null;
    };

    expect(tvProjection.activeScenario?.id).toBe("scenario_broken_seal");
    expect(tvProjection.activeScenario?.sheetArtPath).toBe("/assets/scenarios/broken-seal.png");
    expect(tvProjection.activeScenario?.theme).toContain("Ashen Reach Core");
    expect(tvProjection.activeScenario?.difficulty).toBe("easy-medium");
    expect(tvProjection.activeScenario?.pressureSummary).toContain("6 seals remain");
    expect(tvProjection.activeScenario?.finalGateRequirement).toContain("4+ Seal");
    expect(tvProjection.activeScenario?.scenarioRewards?.length).toBeGreaterThanOrEqual(4);
    expect(tvProjection.activeScenario?.progress).toBe(0);
    expect(tvProjection.activeScenario?.threshold).toBe(2);
    expect(tvProjection.activeScenario?.setup.length).toBeGreaterThan(0);
    expect(tvProjection.activeScenario?.specialRules.length).toBeGreaterThan(0);
    expect(tvProjection.activeScenario?.confrontationSteps.length).toBeGreaterThan(0);
    expect(tvProjection.activeScenario?.victoryText).toContain("win");
    expect(phoneProjection.activeScenario?.confrontationTitle).toBe("Reseal the Prison");
    expect(phoneProjection.activeScenario?.specialRules.length).toBeGreaterThan(0);
    expect(phoneProjection.activeScenario?.victoryText).toContain("win");
    expect(tvProjection.scenarioPressure).toMatchObject({
      scenarioId: "scenario_broken_seal",
      mode: "rivalry",
      scenarioStatus: "active",
      pressureTrack: {
        name: "Seal Integrity",
        current: 6,
        max: 6
      },
      collapseTrack: {
        name: "Escalation",
        current: 0,
        max: 6,
        failureAtMax: true
      },
      objectiveProgress: {
        label: "Seal Restoration Marks",
        current: 0,
        required: 2,
        completed: false
      },
      modeSpecific: {
        privateAgenda: "phone-only"
      }
    });
    expect(phoneProjection.scenarioPressure).toMatchObject({
      scenarioId: "scenario_broken_seal",
      pressureTrack: {
        current: 6,
        max: 6
      },
      objectiveProgress: {
        current: 0,
        required: 2
      }
    });
    expect(tvProjection.scenarioProgress).toEqual({});
    expect(phoneProjection.scenarioProgress).toEqual({});
    expect(tvProjection.scenarioState.preparation.resources).toEqual({ sealIntegrity: 6 });
    expect(phoneProjection.scenarioState.preparation.resources).toEqual({ sealIntegrity: 6 });
    expect(tvProjection.nemesis).toBeNull();
    expect(phoneProjection.nemesis).toBeNull();
  });

  it("adds private rivalry objectives only to phone projections", () => {
    const state = createInitialSessionState("session-rivalry");
    state.players[0] = {
      ...state.players[0]!,
      private: {
        ...state.players[0]!.private,
        notes: ["Watch salvage", "Delay the vote", "Claim credit", "Keep it quiet"]
      },
      character: {
        ...state.players[0]!.character,
        trophies: 2
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      privateRivalry: {
        active: boolean;
        mode: string;
        secrecy: string;
        tableWarning: string;
        objective: {
          id: string;
          title: string;
          progressLabel: string;
          progress: number;
          target: number;
        };
        recentPrivateNotes: string[];
        revealState: string;
        reveal: { state: string; available: boolean; hint: string; lockedReason: string };
      } | null;
    };
    const tvProjection = createTvProjection(state) as Record<string, unknown>;
    const tvJson = JSON.stringify(tvProjection);

    expect(phoneProjection.privateRivalry).toMatchObject({
      active: true,
      mode: "rivalry",
      secrecy: "private",
      objective: {
        id: "claim-trophies",
        title: "Claim the Black Ledger",
        progressLabel: "Trophies held",
        progress: 2,
        target: 3
      },
      revealState: "revealLocked",
      reveal: {
        state: "revealLocked",
        available: false,
        hint: "Reveal is locked until this agenda's table moment becomes available.",
        lockedReason: "Reveal window has not opened."
      }
    });
    expect(phoneProjection.privateRivalry?.tableWarning).toContain("only on this phone");
    expect(phoneProjection.privateRivalry?.recentPrivateNotes).toEqual(["Keep it quiet", "Claim credit", "Delay the vote"]);
    expect(tvProjection.privateRivalry).toBeUndefined();
    expect(tvJson).toContain("scenarioPressure");
    expect(tvJson).toContain("phone-only");
    expect(tvJson).not.toContain("Claim the Black Ledger");
    expect(tvJson).not.toContain("Claim the Black Ledger");
  });

  it("omits private rivalry objectives for co-op and single-player sessions", () => {
    const coOpState = createInitialSessionState("session-coop", "multiplayer", undefined, "co-op");
    const soloState = createInitialSessionState("session-solo", "single-player");
    const coOpPhoneProjection = createPhoneProjection(coOpState, "seat-1") as { privateRivalry: unknown };
    const soloPhoneProjection = createPhoneProjection(soloState, "seat-1") as { privateRivalry: unknown };

    expect(coOpPhoneProjection.privateRivalry).toBeNull();
    expect(soloPhoneProjection.privateRivalry).toBeNull();
  });

  it("projects public result deltas to TV and owner-private agenda deltas only to the owner phone", () => {
    const state = createInitialSessionState("session-rivalry-deltas");
    state.eventLog.push(
      {
        type: "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED",
        seatId: "seat-1",
        triggerType: "contractCompleted",
        amount: 1,
        summary: "Contract completed: +1 objective progress.",
        createdAt: "2026-07-02T00:00:00.000Z"
      } as never,
      {
        type: "CONTRACT_PROGRESS_UPDATED",
        seatId: "seat-1",
        contractId: "dominion-warbell-recovery",
        progress: 1,
        summary: "Contract +1 from resolving the sector.",
        createdAt: "2026-07-02T00:00:30.000Z"
      } as never,
      {
        type: "RIVALRY_AGENDA_PROGRESS_TRIGGERED",
        seatId: "seat-1",
        triggerType: "contractCompleted",
        amount: 1,
        summary: "Private trigger: claim the black ledger.",
        publicCompletionSummary: "A Rivalry Agenda advanced.",
        createdAt: "2026-07-02T00:01:00.000Z"
      } as never
    );

    const tvProjection = createTvProjection(state) as {
      publicResultDeltas: Array<{ type: string; publicText: string; privateText?: string }>;
    };
    const ownerPhone = createPhoneProjection(state, "seat-1") as {
      playerResultDeltas: Array<{ type: string; publicText: string; privateText?: string; visibility: string }>;
    };
    const otherPhone = createPhoneProjection(state, "seat-2") as {
      playerResultDeltas: Array<{ type: string; publicText: string; privateText?: string; visibility: string }>;
    };
    const tvJson = JSON.stringify(tvProjection);
    const ownerJson = JSON.stringify(ownerPhone);
    const otherJson = JSON.stringify(otherPhone);

    expect(tvProjection.publicResultDeltas.some((delta) => delta.type === "scenarioProgress")).toBe(true);
    expect(tvProjection.publicResultDeltas.some((delta) => delta.type === "contractProgress")).toBe(true);
    expect(ownerPhone.playerResultDeltas.some((delta) => delta.type === "agendaProgress" && delta.visibility === "ownerPrivate")).toBe(true);
    expect(otherPhone.playerResultDeltas.some((delta) => delta.type === "agendaProgress")).toBe(false);
    expect(ownerJson).toContain("Private trigger: claim the black ledger.");
    expect(tvJson).not.toContain("Private trigger");
    expect(otherJson).not.toContain("Private trigger");
  });

  it("builds public movement planner intel from legal sectors without leaking hidden deck cards", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 1 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "votive-engine-room",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "votive-engine-room"
      }
    };

    const tvProjection = createTvProjection(state) as {
      movementPlanner: {
        movementValue: number;
        currentSectorName: string;
        destinations: Array<{
          sectorId: string;
          name: string;
          route: string[];
          faceUpThreats: Array<{ name: string }>;
        }>;
      } | null;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        movementValue: number;
        currentSectorName: string;
        destinations: Array<{
          sectorId: string;
          name: string;
          ring: string;
          route: string[];
          threatIcons: string[];
          tags: string[];
          shop?: { status: string; servicesPreview: string[] };
          strategicTags: string[];
          faceUpThreats: Array<{ name: string }>;
        }>;
      } | null;
    };

    expect(phoneProjection.movementPlanner?.movementValue).toBe(1);
    expect(phoneProjection.movementPlanner?.currentSectorName).toBe("Votive Engine Room");
    expect(tvProjection.movementPlanner?.movementValue).toBe(phoneProjection.movementPlanner?.movementValue);
    expect(tvProjection.movementPlanner?.currentSectorName).toBe(phoneProjection.movementPlanner?.currentSectorName);
    expect(tvProjection.movementPlanner?.destinations.map((destination) => destination.sectorId).sort()).toEqual(
      phoneProjection.movementPlanner?.destinations.map((destination) => destination.sectorId).sort()
    );

    const bridge = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "ashwake-crossing");
    const tvBridge = tvProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "ashwake-crossing");

    expect(bridge).toMatchObject({
      name: "Ashwalk Bridge",
      ring: "outer",
      route: ["votive-engine-room", "ashwake-crossing"]
    });
    expect(tvBridge?.route).toEqual(bridge?.route);
    expect(bridge?.threatIcons).toEqual(["yellow"]);
    expect(bridge?.faceUpThreats).toEqual([]);
    expect(JSON.stringify(phoneProjection.movementPlanner)).not.toContain("scrap-toll-gangers");
    expect(JSON.stringify(tvProjection.movementPlanner)).not.toContain("scrap-toll-gangers");
  });

  it("projects public sector exploration math for TV and the owning phone", () => {
    const state = createInitialSessionState("session-alpha");
    const threat = loadThreatCards().get("gate-tax-collectors") ?? loadThreatCards().values().next().value;
    state.status = "active";
    state.phase = "action";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.currentEncounter = threat ?? null;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_waymarket",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_waymarket"
      }
    };

    const tvProjection = createTvProjection(state) as {
      sectorExplorationSummary: {
        sectorId: string;
        sectorName: string;
        unresolvedThreats: Array<{ name: string; blocksSectorText: boolean }>;
        drawCountsDue: Record<string, number>;
        explanationLines: string[];
        sectorTextLocked: boolean;
      } | null;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      sectorExplorationSummary: typeof tvProjection.sectorExplorationSummary;
    };
    const tvJson = JSON.stringify(tvProjection);

    expect(tvProjection.sectorExplorationSummary?.sectorId).toBe("outer_waymarket");
    expect(tvProjection.sectorExplorationSummary?.sectorName).toBe("Anchor Market");
    expect(tvProjection.sectorExplorationSummary?.unresolvedThreats[0]?.blocksSectorText).toBe(true);
    expect(tvProjection.sectorExplorationSummary?.sectorTextLocked).toBe(true);
    expect(tvProjection.sectorExplorationSummary?.drawCountsDue).toMatchObject({ red: 0, blue: 0, yellow: 0 });
    expect(tvProjection.sectorExplorationSummary?.explanationLines.join(" ")).toMatch(
      /printed icons|unresolved blockers|no new draw/i
    );
    expect(phoneProjection.sectorExplorationSummary).toEqual(tvProjection.sectorExplorationSummary);
    expect(tvJson).not.toContain("Claim the Black Ledger");
  });

  it("omits the TV movement planner outside active movement", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "action";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };

    const tvProjection = createTvProjection(state) as {
      movementPlanner: unknown;
    };

    expect(tvProjection.movementPlanner).toBeNull();
  });

  it("projects the owning phone active mission card from the player active contract", () => {
    const state = createInitialSessionState("session-alpha");
    const activeContract = state.availableContracts[0]!;
    const poolOnlyContract = state.availableContracts[1]!;
    state.status = "active";
    state.phase = "action";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      character: {
        ...state.players[0]!.character,
        activeContract: {
          contractId: activeContract.id,
          progress: 1
        }
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      activeContractCard: { id: string; name: string } | null;
    };

    expect(phoneProjection.activeContractCard).toMatchObject({
      id: activeContract.id,
      name: activeContract.name
    });
    expect(phoneProjection.activeContractCard?.id).not.toBe(poolOnlyContract.id);
  });

  it("hides movement planner routes until the active player rolls movement", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: unknown;
    };
    const tvProjection = createTvProjection(state) as {
      movementPlanner: unknown;
    };

    expect(phoneProjection.movementPlanner).toBeNull();
    expect(tvProjection.movementPlanner).toBeNull();
  });

  it("builds exact rolled-distance movement routes from the authoritative graph", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 2 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        movementValue: number;
        destinations: Array<{ sectorId: string; distance: number; route: string[] }>;
      } | null;
    };
    const tvProjection = createTvProjection(state) as {
      movementPlanner: {
        movementValue: number;
        destinations: Array<{ sectorId: string; distance: number; route: string[] }>;
      } | null;
    };

    const cinderFields = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "cinder-fields");

    expect(phoneProjection.movementPlanner?.movementValue).toBe(2);
    expect(cinderFields).toMatchObject({
      distance: 2,
      route: ["outer_ember_sanctum", "glassmere-spindle", "cinder-fields"]
    });
    expect(phoneProjection.movementPlanner?.destinations.every((destination) => destination.distance === 2)).toBe(true);
    expect(phoneProjection.movementPlanner?.destinations.some((destination) => destination.sectorId === "outer_waymarket")).toBe(false);
    expect(tvProjection.movementPlanner?.destinations).toEqual(phoneProjection.movementPlanner?.destinations);
  });

  it("builds exact three-step movement routes without teleporting", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 3 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        movementValue: number;
        destinations: Array<{ sectorId: string; distance: number; route: string[] }>;
      } | null;
    };
    const emberwatch = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "emberwatch-step");

    expect(phoneProjection.movementPlanner?.movementValue).toBe(3);
    expect(emberwatch).toMatchObject({
      distance: 3,
      route: ["outer_ember_sanctum", "glassmere-spindle", "cinder-fields", "emberwatch-step"]
    });
    expect(phoneProjection.movementPlanner?.destinations.every((destination) => destination.route.length === 4)).toBe(true);
    expect(phoneProjection.movementPlanner?.destinations.some((destination) => destination.route.includes("missing-sector"))).toBe(false);
  });

  it("does not inflate legal destinations by chaining shortcut links during exact movement", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 4 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "ashwake-crossing",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "ashwake-crossing"
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        movementValue: number;
        destinations: Array<{ sectorId: string; distance: number; route: string[] }>;
      } | null;
    };
    const destinationIds = phoneProjection.movementPlanner?.destinations.map((destination) => destination.sectorId).sort();

    expect(phoneProjection.movementPlanner?.movementValue).toBe(4);
    expect(destinationIds).toEqual(["outer_oathpost", "sunken-pier"]);
    expect(phoneProjection.movementPlanner?.destinations).toHaveLength(2);
    expect(phoneProjection.movementPlanner?.destinations.every((destination) => destination.distance === 4)).toBe(true);
    expect(
      phoneProjection.movementPlanner?.destinations.some((destination) =>
        destination.route.some((sectorId) => sectorId.startsWith("middle_") || sectorId.startsWith("inner_"))
      )
    ).toBe(false);
  });

  it("allows cross-region movement only through authored transition sectors", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 1 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        destinations: Array<{ sectorId: string; distance: number; route: string[]; disabledReason?: string }>;
      } | null;
    };
    const middleTransition = phoneProjection.movementPlanner?.destinations.find(
      (destination) => destination.sectorId === "middle_red_march_outpost"
    );

    expect(middleTransition).toMatchObject({
      distance: 1,
      route: ["outer_ember_sanctum", "middle_red_march_outpost"]
    });
    expect(middleTransition?.disabledReason).toBeUndefined();
  });

  it("blocks direct cross-region neighbors that are not authored transition links", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 1 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_waymarket",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_waymarket"
      }
    };
    state.sectors = state.sectors.map((sector) => {
      if (sector.id === "outer_waymarket") {
        return { ...sector, neighbors: [...sector.neighbors, "middle_relic_cache"] };
      }

      if (sector.id === "middle_relic_cache") {
        return { ...sector, neighbors: [...sector.neighbors, "outer_waymarket"] };
      }

      return sector;
    });

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        destinations: Array<{ sectorId: string; disabledReason?: string; route: string[] }>;
      } | null;
    };
    const fakeCrossRing = phoneProjection.movementPlanner?.destinations.find(
      (destination) => destination.sectorId === "middle_relic_cache"
    );

    expect(fakeCrossRing?.disabledReason).toContain("requires a transition tile");
    expect(fakeCrossRing?.route).toEqual(["outer_waymarket", "middle_relic_cache"]);
  });

  it("allows reducer movement only to destinations in the rolled-distance planner", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 2 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "outer_ember_sanctum",
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "outer_ember_sanctum"
      }
    };

    const legal = reduceGameState(state, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "cinder-fields",
      createdAt: "2026-06-30T00:00:00.000Z"
    });
    const illegal = reduceGameState(state, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "outer_waymarket",
      createdAt: "2026-06-30T00:00:00.000Z"
    });

    expect(legal.ok).toBe(true);
    expect(illegal.ok).toBe(false);
    expect(illegal.ok ? null : illegal.rejection.reason).toContain("current movement value");
  });

  it("marks gated movement destinations with disabled reasons", () => {
    const state = createInitialSessionState("session-alpha");
    state.status = "active";
    state.phase = "navigation";
    state.turnOrder = ["seat-1"];
    state.activeSeatIndex = 0;
    state.movementRolls = { "seat-1": 1 };
    state.seats[0] = { ...state.seats[0]!, connected: true, displayName: "Lane", characterId: "void-marshal" };
    state.players[0] = {
      ...state.players[0]!,
      sectorId: "middle_guardian_span",
      private: {
        ...state.players[0]!.private,
        notes: []
      },
      character: {
        ...state.players[0]!.character,
        currentSpaceId: "middle_guardian_span",
        heldGear: [{ id: "void-key", instanceId: "void-key:test", name: "Void Key", slot: "utility", category: "chargedRelic", statBonus: { stat: "command", amount: 1 }, tier: "artifact", useLimit: "charge", effectModel: "charged", requiresEquipped: true, activationTiming: ["movementRouteConfirmation"], maxCharges: 2, startingCharges: 2, currentCharges: 2, chargeCost: 1, rechargeRule: "none", chargedEffect: "personalGateOverride" }],
        equippedGear: { ...state.players[0]!.character.equippedGear, utility: "void-key" }
      }
    };

    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      movementPlanner: {
        destinations: Array<{ sectorId: string; disabledReason?: string; strategicTags: string[]; voidKeyPrompt?: { instanceId: string; currentCharges: number; maxCharges: number } }>;
      } | null;
    };
    const innerGate = phoneProjection.movementPlanner?.destinations.find((destination) => destination.sectorId === "inner_veil_rift");

    expect(innerGate?.disabledReason).toBe("Resolve Guardian Span before entering the inner breach");
    expect(innerGate?.strategicTags).toContain("gate");
    expect(innerGate?.voidKeyPrompt).toMatchObject({ instanceId: "void-key:test", currentCharges: 2, maxCharges: 2 });

    const used = reduceGameState(state, { type: "MOVE_REQUESTED", seatId: "seat-1", toSectorId: "inner_veil_rift", voidKeyInstanceId: "void-key:test", createdAt: "2026-07-11T00:00:00.000Z" });
    expect(used.ok).toBe(true);
    if (used.ok) expect(used.state.players[0]?.character.heldGear[0]?.currentCharges).toBe(1);

    const ordinary = reduceGameState(state, { type: "MOVE_REQUESTED", seatId: "seat-1", toSectorId: "inner_veil_rift", createdAt: "2026-07-11T00:00:01.000Z" });
    expect(ordinary.ok).toBe(false);
  });

  it("includes the linked nemesis block in TV and phone projections", () => {
    const state = createInitialSessionState("session-alpha");
    state.activeScenarioId = "scenario_throne_of_ash";
    state.scenarioProgress = { throneClaims: 2 };

    const tvProjection = createTvProjection(state) as {
      activeScenario: { threshold: number } | null;
      nemesis: { id: string; life: number; damageDealt: number } | null;
    };
    const phoneProjection = createPhoneProjection(state, "seat-1") as {
      nemesis: { id: string; life: number; damageDealt: number } | null;
    };

    expect(tvProjection.activeScenario?.threshold).toBe(6);
    expect(tvProjection.nemesis).toMatchObject({
      id: "nemesis_hollow_regent",
      life: 6,
      damageDealt: 2
    });
    expect(phoneProjection.nemesis).toMatchObject({
      id: "nemesis_hollow_regent",
      life: 6,
      damageDealt: 2
    });
  });

  it("builds scenario telemetry for all six authored scenarios with live, scenario-specific readouts", () => {
    const expectations: Record<string, string[]> = {
      scenario_broken_seal: ["Seal Integrity", "Turn Pressure", "Collapses", "Final Restoration"],
      scenario_throne_of_ash: ["Crown Claims", "Crown Holders", "Active Crowns"],
      scenario_mirror_of_false_heroes: ["Mirror Breaks", "Scar Pressure", "Reflection Feed"],
      scenario_devourer_beneath: ["Doom Tokens", "Devourer", "Collapse Pulse"],
      scenario_labyrinth_engine: ["Engine Mode", "Rotation", "Shutdown"],
      scenario_dying_star: ["Starfire", "Wound Burn", "Ignition"]
    };

    for (const scenario of SCENARIOS) {
      const state = createInitialSessionState(`telemetry-${scenario.id}`, "multiplayer", scenario.id);
      state.seats[0] = { ...state.seats[0]!, displayName: "Joel", connected: true };
      const tvProjection = createTvProjection(state) as {
        scenarioTelemetry: Array<{ label: string; value: string }>;
        activeScenario: { pressureSummary: string } | null;
      };
      const phoneProjection = createPhoneProjection(state, "seat-1") as {
        scenarioTelemetry: Array<{ label: string; value: string }>;
      };

      expect(tvProjection.activeScenario?.pressureSummary).toBeTruthy();
      expect(tvProjection.scenarioTelemetry.map((entry) => entry.label)).toEqual(expectations[scenario.id]);
      expect(phoneProjection.scenarioTelemetry.map((entry) => entry.label)).toEqual(expectations[scenario.id]);
      expect(tvProjection.scenarioTelemetry.every((entry) => entry.value.length > 0)).toBe(true);
      expect(phoneProjection.scenarioTelemetry.every((entry) => entry.value.length > 0)).toBe(true);
    }
  });

  it("only allows movement into authored neighboring sectors from the initial session state", () => {
    const initialState = createInitialSessionState("session-alpha");
    const started = reduceGameState(initialState, {
      type: "SESSION_STARTED",
      seatId: "seat-1",
      createdAt: new Date().toISOString()
    });

    if (!started.ok) {
      throw new Error(started.rejection.reason);
    }

    const rolled = reduceGameState(started.state, {
      type: "MOVEMENT_ROLLED",
      seatId: "seat-1",
      movementValue: 1,
      roll: { faces: [1], total: 1 },
      createdAt: new Date().toISOString()
    });

    if (!rolled.ok) {
      throw new Error(rolled.rejection.reason);
    }

    const legalMove = reduceGameState(rolled.state, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "votive-engine-room",
      createdAt: new Date().toISOString()
    });
    const illegalMove = reduceGameState(rolled.state, {
      type: "MOVE_REQUESTED",
      seatId: "seat-1",
      toSectorId: "hollow-veil-yard",
      createdAt: new Date().toISOString()
    });

    expect(legalMove.ok).toBe(true);
    expect(illegalMove.ok).toBe(false);

    if (!illegalMove.ok) {
      expect(illegalMove.rejection.reason).toContain("not reachable");
    }
  });
});
