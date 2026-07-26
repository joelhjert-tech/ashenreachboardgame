import { describe, expect, it } from "vitest";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

type AutomaticServer = {
  getState(): ReturnType<GameRoomServer["getState"]>;
  runAutomaticPhases(seatId: string): void;
  getPhaseAfterResolution(seatId: string): "setup" | "move" | "sector" | "action" | "resolution" | "broadcast";
  resolveContinueResolutionIntent(intent: { type: "CONTINUE_RESOLUTION"; seatId: string }): void;
};

function placeAtGuardianSpan(emptyDeck = false): AutomaticServer {
  const state = createInitialSessionState(`tile-arrival-${emptyDeck ? "empty" : "sequence"}`, "single-player");
  state.status = "active";
  state.phase = "sector";
  state.players[0]!.sectorId = "middle_guardian_span";
  state.players[0]!.character.currentSpaceId = "middle_guardian_span";
  state.tileArrivalThreatProgress = {
    arrivalId: "arrival:seat-1:middle_guardian_span:1",
    seatId: "seat-1",
    sectorId: "middle_guardian_span",
    nextThreatIconIndex: 0
  };
  if (emptyDeck) {
    state.sectors.find((sector) => sector.id === "middle_guardian_span")!.encounterDecks.threat = [];
  }
  return new GameRoomServer(state) as unknown as AutomaticServer;
}

describe("canonical tile arrival lifecycle", () => {
  it("consumes every printed Threat icon in authored order without replaying the arrival", () => {
    const server = placeAtGuardianSpan();

    server.runAutomaticPhases("seat-1");
    expect(server.getState().tileArrivalThreatProgress).toMatchObject({ nextThreatIconIndex: 1 });
    expect(server.getState().phase).toBe("action");

    for (const expectedIndex of [2, 3]) {
      const state = server.getState();
      state.phase = "resolution";
      state.resolutionSource = "encounter";
      state.pendingEffect = null;
      state.activeResolution = null;
      state.pendingEnemyRoll = null;
      state.lastOutcomeSummary = { ...state.lastOutcomeSummary!, success: true };
      server.runAutomaticPhases("seat-1");
      expect(server.getState().tileArrivalThreatProgress).toMatchObject({
        arrivalId: "arrival:seat-1:middle_guardian_span:1",
        nextThreatIconIndex: expectedIndex
      });
    }

    expect(server.getState().phase).toBe("action");
    expect(server.getState().tileArrivalThreatProgress?.nextThreatIconIndex).toBe(3);
  });

  it("continues to the next printed Threat while mandatory icons remain", () => {
    const server = placeAtGuardianSpan();
    server.getState().tileArrivalThreatProgress!.nextThreatIconIndex = 1;
    server.getState().phase = "resolution";
    server.getState().resolutionSource = "encounter";
    server.getState().lastOutcomeSummary = { ...server.getState().lastOutcomeSummary!, success: true };
    expect(server.getPhaseAfterResolution("seat-1")).toBe("sector");
    server.getState().tileArrivalThreatProgress!.nextThreatIconIndex = 3;
    expect(server.getPhaseAfterResolution("seat-1")).toBe("action");
  });

  it("draws from the shared lane bag even when the legacy local deck is empty", () => {
    const server = placeAtGuardianSpan(true);
    server.runAutomaticPhases("seat-1");

    expect(server.getState().activeResolution?.outcome?.title).toBe("Card revealed");
    expect(server.getState().currentEncounter).not.toBeNull();
    expect(server.getState().currentEncounter?.threatLane).toBe("red");
    expect(server.getState().tileArrivalThreatProgress?.nextThreatIconIndex).toBe(1);
    expect(server.getState().threatDrawBags?.red?.remainingCardIds).toHaveLength(25);
    expect(server.getState().sectors.find((sector) => sector.id === "middle_guardian_span")?.encounterDecks.threat).toEqual([]);
  });
});
