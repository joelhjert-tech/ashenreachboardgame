import { describe, expect, it } from "vitest";
import { BOARD_SPACES, type ThreatIcon } from "../../game/data/boardSpaces.js";
import {
  GRINNING_TITHE_ASSAULT_CARD_IDS,
  GRINNING_TITHE_MINION_IDS
} from "../../game/data/scenarios.js";
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
  const expectedCounts: Record<ThreatIcon, number> = { red: 62, blue: 72, yellow: 66 };

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

  it("makes all 200 standard Threats reachable and every one of the 58 printed slots drawable", () => {
    const server = createBagServer(10958);
    const reachable = new Set<string>();
    for (const lane of ["red", "blue", "yellow"] as const) {
      server.prepareThreatBag(lane, "seat-1");
      server.getState().threatDrawBags![lane]!.remainingCardIds.forEach((cardId) => reachable.add(cardId));
    }
    expect(reachable.size).toBe(200);
    expect(reachable).toEqual(
      new Set([...catalog.keys()].filter(
        (cardId) => !GRINNING_TITHE_ASSAULT_CARD_IDS.includes(
          cardId as typeof GRINNING_TITHE_ASSAULT_CARD_IDS[number]
        )
      ))
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

  it("adds one dedicated Pallid Retinue minion to each complete normal lane in The Grinning Tithe", () => {
    const server = createBagServer(3306, "scenario_grinning_tithe");
    const laneCards = [
      ["red", GRINNING_TITHE_MINION_IDS[0]],
      ["blue", GRINNING_TITHE_MINION_IDS[1]],
      ["yellow", GRINNING_TITHE_MINION_IDS[2]]
    ] as const;

    for (const [lane, cardId] of laneCards) {
      server.prepareThreatBag(lane, "seat-1");
      const firstCycle = server.getState().threatDrawBags?.[lane]?.remainingCardIds ?? [];
      const normalLaneCardIds = [...catalog.values()]
        .filter(
          (card) =>
            card.threatLane === lane &&
            !GRINNING_TITHE_ASSAULT_CARD_IDS.includes(
              card.id as typeof GRINNING_TITHE_ASSAULT_CARD_IDS[number]
            )
        )
        .map((card) => card.id);

      expect(firstCycle).toHaveLength(normalLaneCardIds.length + 1);
      expect(new Set(firstCycle)).toEqual(new Set([...normalLaneCardIds, cardId]));
      expect(
        firstCycle.some(
          (drawnId) =>
            !GRINNING_TITHE_MINION_IDS.includes(
              drawnId as typeof GRINNING_TITHE_MINION_IDS[number]
            )
        )
      ).toBe(true);
      expect(firstCycle).not.toContain(GRINNING_TITHE_ASSAULT_CARD_IDS[3]);
      expect(catalog.get(cardId)?.threatLane).toBe(lane);

      server.getState().threatDrawBags![lane]!.remainingCardIds = [];
      server.prepareThreatBag(lane, "seat-1");
      const secondCycle = server.getState().threatDrawBags?.[lane];
      expect(secondCycle?.cycle).toBe(2);
      expect(new Set(secondCycle?.remainingCardIds)).toEqual(new Set([...normalLaneCardIds, cardId]));
    }
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
