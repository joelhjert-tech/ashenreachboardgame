import { describe, expect, it } from "vitest";
import { BOARD_SPACES, type ThreatIcon } from "../../game/data/boardSpaces.js";
import { GRINNING_TITHE_MINION_IDS } from "../../game/data/scenarios.js";
import { createSeededRandomSource } from "../../game/engine/dice.js";
import { applyEffectToState } from "../../game/engine/reducer.js";
import { loadThreatCards } from "../../game/content/threats.js";
import type { EncounterDrawnAction } from "../../game/engine/actions.js";
import type { EncounterEffect } from "../../game/schema/card.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

type BagServer = {
  getState(): ReturnType<GameRoomServer["getState"]>;
  prepareThreatBag(lane: ThreatIcon, seatId: string): void;
  peekGlobalThreatId(lane: ThreatIcon, seatId: string): string | null;
  createEncounterDrawnAction(seatId: string): EncounterDrawnAction;
  createFandiablosWarningEffect(seatId: string): EncounterEffect;
};

function createBagServer(seed = 0x5eed, scenarioId = "scenario_broken_seal"): BagServer {
  return new GameRoomServer(
    createInitialSessionState(`global-threat-bag-${seed}`, "single-player", scenarioId),
    [],
    createSeededRandomSource(seed)
  ) as unknown as BagServer;
}

describe("server-owned global Threat bags", () => {
  const catalog = loadThreatCards();
  const expectedCounts: Record<ThreatIcon, number> = { red: 27, blue: 36, yellow: 50 };

  it("prepares two complete seeded cycles per lane without duplicates inside a cycle", () => {
    for (const lane of ["red", "blue", "yellow"] as const) {
      const server = createBagServer(700 + expectedCounts[lane]);
      server.prepareThreatBag(lane, "seat-1");
      const first = [...server.getState().threatDrawBags![lane]!.remainingCardIds];
      expect(first).toHaveLength(expectedCounts[lane]);
      expect(new Set(first).size).toBe(expectedCounts[lane]);
      expect(first.every((cardId) => catalog.get(cardId)?.threatLane === lane)).toBe(true);

      server.getState().threatDrawBags![lane]!.remainingCardIds = [];
      server.prepareThreatBag(lane, "seat-1");
      const second = [...server.getState().threatDrawBags![lane]!.remainingCardIds];
      expect(server.getState().threatDrawBags![lane]!.cycle).toBe(2);
      expect(second).toHaveLength(expectedCounts[lane]);
      expect(new Set(second).size).toBe(expectedCounts[lane]);
      expect(second.every((cardId) => catalog.get(cardId)?.threatLane === lane)).toBe(true);
    }
  });

  it("makes all 113 standard Threats reachable and every one of the 58 printed slots drawable", () => {
    const server = createBagServer(10958);
    const reachable = new Set<string>();
    for (const lane of ["red", "blue", "yellow"] as const) {
      server.prepareThreatBag(lane, "seat-1");
      server.getState().threatDrawBags![lane]!.remainingCardIds.forEach((cardId) => reachable.add(cardId));
    }
    expect(reachable.size).toBe(113);
    expect(reachable).toEqual(
      new Set([...catalog.keys()].filter((cardId) => !GRINNING_TITHE_MINION_IDS.includes(cardId as typeof GRINNING_TITHE_MINION_IDS[number])))
    );

    const printedSlots = BOARD_SPACES.flatMap((space) => space.threatIcons);
    expect(printedSlots).toHaveLength(58);
    for (const lane of printedSlots) {
      const cardId = server.peekGlobalThreatId(lane, "seat-1");
      expect(cardId).not.toBeNull();
      expect(catalog.get(cardId!)?.threatLane).toBe(lane);
      server.getState().threatDrawBags![lane]!.remainingCardIds.shift();
    }
  });

  it("uses the shared shuffled Pallid Retinue bag for every Red draw in The Grinning Tithe", () => {
    const server = createBagServer(3306, "scenario_grinning_tithe");
    server.prepareThreatBag("red", "seat-1");
    const firstCycle = [...server.getState().threatDrawBags!.red!.remainingCardIds];

    expect(firstCycle).toHaveLength(3);
    expect(new Set(firstCycle)).toEqual(new Set(GRINNING_TITHE_MINION_IDS));
    expect(firstCycle.every((cardId) => catalog.get(cardId)?.threatLane === "red")).toBe(true);

    const first = server.peekGlobalThreatId("red", "seat-1");
    server.getState().threatDrawBags!.red!.remainingCardIds.shift();
    const second = server.peekGlobalThreatId("red", "seat-6");
    expect(second).not.toBe(first);

    server.getState().threatDrawBags!.red!.remainingCardIds = [];
    server.prepareThreatBag("red", "seat-1");
    expect(server.getState().threatDrawBags!.red).toMatchObject({ cycle: 2 });
    expect(new Set(server.getState().threatDrawBags!.red!.remainingCardIds)).toEqual(new Set(GRINNING_TITHE_MINION_IDS));
  });

  it("shares one bag across seats and keeps its order private from TV and phone projections", () => {
    const server = createBagServer(6106);
    server.prepareThreatBag("blue", "seat-1");
    const first = server.peekGlobalThreatId("blue", "seat-1");
    server.getState().threatDrawBags!.blue!.remainingCardIds.shift();
    const second = server.peekGlobalThreatId("blue", "seat-6");
    expect(second).not.toBe(first);

    expect(JSON.stringify(createTvProjection(server.getState()))).not.toContain("threatDrawBags");
    expect(JSON.stringify(createPhoneProjection(server.getState(), "seat-1"))).not.toContain("threatDrawBags");
    expect(JSON.stringify(createTvProjection(server.getState()))).not.toContain("orderedCardIds");
    expect(JSON.stringify(createPhoneProjection(server.getState(), "seat-1"))).not.toContain("orderedCardIds");
  });

  it("places recently encountered cards at the bottom only when restoring a missing legacy bag", () => {
    const recent = [...catalog.values()].find((card) => card.threatLane === "yellow")!;
    const state = createInitialSessionState("legacy-global-threat-bag", "single-player");
    state.threatDrawBags = undefined;
    state.recentEncounterCardIds = [recent.id];
    const server = new GameRoomServer(state, [], createSeededRandomSource(22)) as unknown as BagServer;

    server.prepareThreatBag("yellow", "seat-1");
    expect(server.getState().threatDrawBags?.yellow?.remainingCardIds.at(-1)).toBe(recent.id);
  });

  it("resolves fixed returned opposition before the printed lane's global draw", () => {
    const returned = [...catalog.values()].find((card) => card.threatLane === "blue" && card.cardType === "enemy")!;
    let state = createInitialSessionState("persistent-before-global", "single-player");
    state.status = "active";
    state.phase = "sector";
    state.players[0]!.sectorId = "ashen-chapel";
    state.players[0]!.character.currentSpaceId = "ashen-chapel";
    state.tileArrivalThreatProgress = {
      arrivalId: "arrival:persistent",
      seatId: "seat-1",
      sectorId: "ashen-chapel",
      nextThreatIconIndex: 0
    };
    state = applyEffectToState(state, "seat-1", {
      type: "return_threat_to_space",
      threatId: returned.id,
      sourceSectorId: "ashen-chapel"
    });
    const server = new GameRoomServer(state, [], createSeededRandomSource(88)) as unknown as BagServer;

    const action = server.createEncounterDrawnAction("seat-1");
    expect(action.card?.id).toBe(returned.id);
    expect(action.drawSource).toBe("persistent");
    expect(action.tileArrivalThreatProgress?.threatRuleIds).toEqual([
      `persistent:${returned.id}:blue`,
      "threat:0:blue"
    ]);
    expect(server.getState().threatDrawBags?.blue).toBeUndefined();
    expect(server.createFandiablosWarningEffect("seat-1")).toMatchObject({
      type: "gain_note",
      text: expect.stringContaining(returned.title)
    });
  });
});
