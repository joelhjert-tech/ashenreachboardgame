import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function createGateState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialSessionState("play-feel-test", "single-player");

  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1"],
    seats: base.seats.map((seat) => ({
      ...seat,
      displayName: "Solo",
      connected: true,
      ready: true
    })),
    players: base.players.map((player) => ({
      ...player,
      sectorId: "center_cinder_gate",
      character: {
        ...player.character,
        currentSpaceId: "center_cinder_gate",
        heldGear: []
      }
    })),
    ...overrides
  };
}

describe("play-feel guardrails", () => {
  it("soft-exiles recently drawn threats while the sector has fresh alternatives", () => {
    const state = createInitialSessionState("play-feel-test", "single-player");
    const server = new GameRoomServer(
      {
        ...state,
        recentEncounterCardIds: ["old-threat"]
      },
      [],
      createSequenceRandomSource([0])
    );

    expect((server as any).drawThreatIdWithSoftExile(["old-threat", "fresh-threat"])).toBe("fresh-threat");
  });

  it("falls back to the local deck when every threat is still in cooldown", () => {
    const state = createInitialSessionState("play-feel-test", "single-player");
    const server = new GameRoomServer(
      {
        ...state,
        recentEncounterCardIds: ["only-threat"]
      },
      [],
      createSequenceRandomSource([0])
    );

    expect((server as any).drawThreatIdWithSoftExile(["only-threat"])).toBe("only-threat");
  });

  it("rejects a Broken Seal final confrontation before the final gate is earned", () => {
    const server = new GameRoomServer(
      createGateState({
        activeScenarioId: "scenario_broken_seal",
        scenarioProgress: { sealTokens: 3 }
      }),
      [],
      createSequenceRandomSource([0])
    );

    expect(() =>
      (server as any).resolveScenarioConfrontationIntent({
        type: "SCENARIO_CONFRONTATION_REQUESTED",
        seatId: "seat-1"
      })
    ).toThrow(/Final gate locked/);
  });

  it("allows a Broken Seal final confrontation when enough seals are restored", () => {
    const server = new GameRoomServer(
      createGateState({
        activeScenarioId: "scenario_broken_seal",
        scenarioProgress: { sealTokens: 4 }
      }),
      [],
      createSequenceRandomSource([5, 5, 5, 5, 5, 5])
    );

    (server as any).resolveScenarioConfrontationIntent({
      type: "SCENARIO_CONFRONTATION_REQUESTED",
      seatId: "seat-1"
    });

    expect(server.getState().scenarioProgress.sealRestorationMarks).toBeGreaterThan(0);
  });
});

