import { describe, expect, it } from "vitest";
import { BOARD_SPACES, getBoardSpace } from "../../data/boardSpaces.js";
import { loadTileChallenges } from "../../content/tileChallenges.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import type { PhonePatchPayload, PublicPatchPayload } from "../../../client/shared/types.js";
import { buildTileArrivalProjection, buildTileFunctionDefinition, canEndTurn, simulateTileArrival } from "../tileFunctions.js";

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
    expect(canEndTurn(state, "seat-1").reason).toMatch(/next Mission/i);
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
});
