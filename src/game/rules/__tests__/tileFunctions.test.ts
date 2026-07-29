import { describe, expect, it } from "vitest";
import { BOARD_SPACES, getBoardSpace } from "../../data/boardSpaces.js";
import { loadTileChallenges } from "../../content/tileChallenges.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import type { PhonePatchPayload, PublicPatchPayload } from "../../../client/shared/types.js";
import {
  buildTileArrivalProjection,
  buildTileFunctionDefinition,
  canEndTurn,
  getServiceThreatGate,
  SERVICE_THREAT_CLEAR_LOCK_REASON,
  simulateTileArrival
} from "../tileFunctions.js";

describe("canonical map tile functions", () => {
  const challenges = [...loadTileChallenges().values()];

  it("gives all 49 active tiles deterministic executable rules and repeat policies", () => {
    expect(BOARD_SPACES).toHaveLength(49);
    for (const space of BOARD_SPACES) {
      const definition = buildTileFunctionDefinition(space, challenges);
      const rules = [...definition.arrival, ...definition.optionalActions, ...definition.persistentRules, ...definition.departure];
      expect(rules.length).toBeGreaterThan(0);
      expect(new Set(rules.map((rule) => rule.id)).size).toBe(rules.length);
      expect(rules.every((rule) => rule.supported && Boolean(rule.repeatPolicy))).toBe(true);
      expect([...definition.arrival].sort((left, right) => left.order - right.order)).toEqual(definition.arrival);
    }
  });

  it("orders recurring challenges before printed Threats and optional actions", () => {
    const chapel = getBoardSpace("ashen-chapel")!;
    const definition = buildTileFunctionDefinition(chapel, challenges);
    expect(definition.arrival.map((rule) => rule.kind)).toEqual(["tile-challenge", "threat-draw"]);
    expect(definition.optionalActions.map((rule) => rule.kind)).toEqual(["board-action", "service"]);
    expect(definition.arrival.every((rule) => rule.mandatory)).toBe(true);
    expect(definition.optionalActions.every((rule) => !rule.mandatory)).toBe(true);
  });

  it("keeps detached arrival simulation deterministic and non-mutating", () => {
    const chapel = getBoardSpace("ashen-chapel")!;
    const before = JSON.stringify(chapel);
    const first = simulateTileArrival(chapel, challenges);
    const second = simulateTileArrival(chapel, challenges);
    expect(first).toEqual(second);
    expect(first.simulationOnly).toBe(true);
    expect(first.effectTrace).toEqual(["01 challenge:rift-whispers-ashen-chapel", "02 threat:0:blue"]);
    expect(JSON.stringify(chapel)).toBe(before);
  });

  it("projects one public-safe arrival stack to TV and phone", () => {
    const state = createInitialSessionState("tile-function-projection", "single-player");
    state.status = "active";
    state.phase = "sector";
    state.players[0]!.sectorId = "ashen-chapel";
    state.players[0]!.character.currentSpaceId = "ashen-chapel";
    const tv = createTvProjection(state) as unknown as PublicPatchPayload;
    const phone = createPhoneProjection(state, "seat-1") as unknown as PhonePatchPayload;
    expect(tv.tileArrival?.tileId).toBe("ashen-chapel");
    expect(tv.tileArrival?.rules.map((rule) => rule.id)).toEqual(phone.tileArrival?.rules.map((rule) => rule.id));
    expect(tv.tileArrival?.rules[0]).toMatchObject({ kind: "tile-challenge", status: "current", mandatory: true });
    expect(JSON.stringify(tv.tileArrival)).not.toMatch(/private|rivalry|mission/i);
  });

  it("blocks end turn for mandatory canonical prompts and allows optional tile actions", () => {
    const state = createInitialSessionState("tile-function-end-turn", "single-player");
    state.status = "active";
    state.phase = "sector";
    expect(canEndTurn(state, "seat-1")).toEqual({ allowed: false, reason: "Finish mandatory tile resolution first." });
    state.phase = "action";
    expect(canEndTurn(state, "seat-1")).toEqual({ allowed: true, reason: null });
    state.pendingMissionSelection = {
      id: "mission-choice",
      ownerSeatId: "seat-1",
      completedContractId: "complete",
      optionIds: ["mission-a"],
      status: "awaitingSelection",
      continuationPhase: "action",
      createdAt: "2026-07-20T00:00:00.000Z"
    };
    expect(canEndTurn(state, "seat-1").reason).toMatch(/next Contract/i);
  });

  it("keeps ten consecutive single-player arrival projections finite and stable", () => {
    const state = createInitialSessionState("tile-function-solo", "single-player");
    state.status = "active";
    const outer = BOARD_SPACES.filter((space) => space.tier === "outer").slice(0, 10);
    for (const [index, space] of outer.entries()) {
      state.phase = "sector";
      state.players[0]!.sectorId = space.id;
      state.players[0]!.character.currentSpaceId = space.id;
      state.movementRouteRevisions = { "seat-1": index + 1 };
      const projection = buildTileArrivalProjection(state, "seat-1");
      expect(projection?.arrivalId).toBe(`arrival:seat-1:${space.id}:${index + 1}`);
      if ((projection?.mandatoryRemaining ?? 0) > 0) expect(projection?.currentRuleId).not.toBeNull();
      expect(projection?.rules.length).toBeGreaterThan(0);
    }
  });

  it("unlocks services only after every Threat in the current arrival succeeds", () => {
    const state = createInitialSessionState("tile-service-success-gate", "single-player");
    state.status = "active";
    state.phase = "action";
    state.players[0]!.sectorId = "ashen-chapel";
    state.players[0]!.character.currentSpaceId = "ashen-chapel";
    state.tileArrivalThreatProgress = {
      arrivalId: "arrival:chapel:1",
      seatId: "seat-1",
      sectorId: "ashen-chapel",
      threatLanes: ["blue"],
      threatRuleIds: ["threat:0:blue"],
      nextThreatIconIndex: 1,
      resolvedThreatOutcomes: [],
      allThreatsSuccessful: null
    };

    expect(getServiceThreatGate(state, "seat-1", "ashen-chapel")).toMatchObject({
      allowed: false,
      pending: true,
      failed: false,
      reason: SERVICE_THREAT_CLEAR_LOCK_REASON
    });

    state.tileArrivalThreatProgress.resolvedThreatOutcomes = [
      { ruleId: "threat:0:blue", lane: "blue", cardId: "blue-card", success: true }
    ];
    state.tileArrivalThreatProgress.allThreatsSuccessful = true;
    expect(getServiceThreatGate(state, "seat-1", "ashen-chapel").allowed).toBe(true);

    state.tileArrivalThreatProgress.resolvedThreatOutcomes[0]!.success = false;
    state.tileArrivalThreatProgress.allThreatsSuccessful = false;
    const failedProjection = buildTileArrivalProjection(state, "seat-1");
    expect(getServiceThreatGate(state, "seat-1", "ashen-chapel")).toMatchObject({
      allowed: false,
      pending: false,
      failed: true
    });
    expect(failedProjection?.rules.find((rule) => rule.id === "threat:0:blue")?.status).toBe("failed");
    expect(failedProjection?.rules.find((rule) => rule.kind === "service")).toMatchObject({
      status: "locked",
      detail: SERVICE_THREAT_CLEAR_LOCK_REASON
    });
    expect(failedProjection?.rules.find((rule) => rule.kind === "board-action")?.status).toBe("optional");

    state.tileArrivalThreatProgress = {
      ...state.tileArrivalThreatProgress,
      arrivalId: "arrival:chapel:2",
      resolvedThreatOutcomes: [
        { ruleId: "threat:0:blue", lane: "blue", cardId: "different-blue-card", success: true }
      ],
      allThreatsSuccessful: true
    };
    expect(getServiceThreatGate(state, "seat-1", "ashen-chapel").allowed).toBe(true);
  });

  it("ignores recurring challenge failure and automatically satisfies no-Threat service sectors", () => {
    const state = createInitialSessionState("tile-service-nonthreat-gate", "single-player");
    state.status = "active";
    state.phase = "action";
    state.players[0]!.sectorId = "ashen-chapel";
    state.players[0]!.character.currentSpaceId = "ashen-chapel";
    state.lastOutcomeSummary = {
      seatId: "seat-1",
      movedToSectorId: "ashen-chapel",
      encounterCardId: null,
      encounterTitle: "Rift Whispers",
      encounterCardType: null,
      checkStat: "signal",
      die1: 1,
      die2: 1,
      statBonus: 0,
      checkTotal: 2,
      difficulty: 7,
      success: false,
      summary: "The recurring challenge failed."
    };
    state.tileArrivalThreatProgress = {
      arrivalId: "arrival:chapel:challenge-failed",
      seatId: "seat-1",
      sectorId: "ashen-chapel",
      threatLanes: ["blue"],
      threatRuleIds: ["threat:0:blue"],
      nextThreatIconIndex: 1,
      resolvedThreatOutcomes: [
        { ruleId: "threat:0:blue", lane: "blue", cardId: "blue-card", success: true }
      ],
      allThreatsSuccessful: true
    };
    expect(getServiceThreatGate(state, "seat-1", "ashen-chapel").allowed).toBe(true);

    const noThreatService = BOARD_SPACES.find((space) =>
      space.threatIcons.length === 0 &&
      buildTileFunctionDefinition(space, challenges).optionalActions.some((rule) => rule.kind === "service")
    );
    expect(noThreatService).toBeDefined();
    state.players[0]!.sectorId = noThreatService!.id;
    state.players[0]!.character.currentSpaceId = noThreatService!.id;
    state.tileArrivalThreatProgress = {
      arrivalId: `arrival:${noThreatService!.id}`,
      seatId: "seat-1",
      sectorId: noThreatService!.id,
      threatLanes: [],
      threatRuleIds: [],
      nextThreatIconIndex: 0,
      resolvedThreatOutcomes: [],
      allThreatsSuccessful: true
    };
    expect(getServiceThreatGate(state, "seat-1", noThreatService!.id).allowed).toBe(true);
  });
});
