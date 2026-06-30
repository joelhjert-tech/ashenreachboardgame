import { describe, expect, it } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { getScenarioDefinition } from "../../game/data/scenarios.js";
import type { EnemyThreatCard } from "../../game/schema/card.schema.js";
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

const soloEaseEnemy = {
  id: "solo-ease-enemy",
  type: "threat",
  title: "Solo Ease Enemy",
  cardType: "enemy",
  enemyName: "Solo Ease Enemy",
  text: "A test enemy used to verify solo combat pressure.",
  flavor: "It is exactly as hard as the test says it is.",
  severity: 2,
  stat: "grit",
  difficulty: 7,
  trophyValue: 1,
  defeatReward: { type: "gain_trophy", amount: 1 },
  woundOnLoss: { type: "take_wound", amount: 1 }
} satisfies EnemyThreatCard;

function createCombatState(sessionMode: "single-player" | "multiplayer", sectorId: string): GameState {
  const base = createInitialSessionState("play-feel-combat-test", sessionMode);

  return {
    ...base,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: ["seat-1"],
    currentEncounter: soloEaseEnemy,
    pendingEnemyRoll: null,
    pendingEffect: null,
    seats: base.seats.map((seat, index) => ({
      ...seat,
      displayName: index === 0 ? "Solo" : null,
      connected: index === 0,
      ready: index === 0
    })),
    players: base.players
      .filter((player) => player.seatId === "seat-1")
      .map((player) => ({
        ...player,
        sectorId,
        character: {
          ...player.character,
          currentSpaceId: sectorId,
          stats: {
            ...player.character.stats,
            grit: 0
          },
          heldGear: [],
          equippedGear: {
            weapon: null,
            armor: null,
            utility: null
          }
        }
      }))
  };
}

function createScenarioGateState(
  scenarioId: GameState["activeScenarioId"],
  overrides: Partial<GameState> = {}
): GameState {
  const base = createGateState({
    activeScenarioId: scenarioId,
    scenarioProgress: {},
    players: createGateState().players.map((player) => ({
      ...player,
      sectorId: "center_cinder_gate",
      character: {
        ...player.character,
        currentSpaceId: "center_cinder_gate",
        stats: {
          command: 20,
          grit: 20,
          signal: 20,
          guile: 20,
          forge: 20
        },
        heldGear: [],
        trophies: 0,
        heat: 0,
        wounds: 0
      }
    })),
    ...overrides
  });

  return base;
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

  it("eases solo combat difficulty by board tier without changing multiplayer", () => {
    const cases = [
      { label: "outer solo", sessionMode: "single-player" as const, sectorId: "outer_waymarket", expectedDifficulty: 5 },
      { label: "middle solo", sessionMode: "single-player" as const, sectorId: "middle_relic_cache", expectedDifficulty: 6 },
      { label: "inner solo", sessionMode: "single-player" as const, sectorId: "inner_veil_rift", expectedDifficulty: 7 },
      { label: "outer multiplayer", sessionMode: "multiplayer" as const, sectorId: "outer_waymarket", expectedDifficulty: 7 }
    ];

    for (const testCase of cases) {
      const server = new GameRoomServer(
        createCombatState(testCase.sessionMode, testCase.sectorId),
        [],
        createSequenceRandomSource([0, 0, 0, 0])
      );

      (server as any).resolveCombatIntent({
        type: "COMBAT_REQUESTED",
        seatId: "seat-1",
        stat: "grit"
      });

      const combatLog = [...server.getState().eventLog].reverse().find((entry): entry is { difficulty?: number; type: string } => {
        return (entry as { type?: string }).type === "COMBAT_RESOLVED";
      });

      expect(combatLog?.difficulty, testCase.label).toBe(testCase.expectedDifficulty);
    }
  });

  it("uses softer solo final gates for the harshest scenarios", () => {
    const cases: Array<{
      scenarioId: GameState["activeScenarioId"];
      scenarioProgress: Record<string, number>;
      trophies: number;
      completedContracts: number;
      expectedProgressKey: string;
    }> = [
      {
        scenarioId: "scenario_devourer_beneath" as const,
        scenarioProgress: {},
        trophies: 5,
        completedContracts: 0,
        expectedProgressKey: "mawStrikes"
      },
      {
        scenarioId: "scenario_labyrinth_engine" as const,
        scenarioProgress: { engineKeys: 2 },
        trophies: 0,
        completedContracts: 0,
        expectedProgressKey: "shutdownMarks"
      },
      {
        scenarioId: "scenario_dying_star" as const,
        scenarioProgress: { starTokens: 4 },
        trophies: 0,
        completedContracts: 2,
        expectedProgressKey: "ignitionMarks"
      }
    ];

    for (const testCase of cases) {
      const scenario = getScenarioDefinition(testCase.scenarioId);

      if (!scenario) {
        throw new Error(`Missing scenario ${testCase.scenarioId}`);
      }

      const scenarioProgress: Record<string, number> = testCase.scenarioProgress;
      const server = new GameRoomServer(
        createScenarioGateState(testCase.scenarioId, {
          scenarioProgress,
          eventLog: Array.from({ length: testCase.completedContracts }, (_, index) => ({
            type: "COMPLETE_CONTRACT",
            seatId: "seat-1",
            contractId: `solo-contract-${index + 1}`,
            createdAt: new Date().toISOString()
          })),
          players: createScenarioGateState(testCase.scenarioId).players.map((player) => ({
            ...player,
            character: {
              ...player.character,
              trophies: testCase.trophies
            }
          }))
        }),
        [],
        createSequenceRandomSource(Array.from({ length: 12 }, () => 5))
      );

      expect(() =>
        (server as any).resolveScenarioConfrontationIntent({
          type: "SCENARIO_CONFRONTATION_REQUESTED",
          seatId: "seat-1"
        })
      ).not.toThrow();
      expect(server.getState().scenarioProgress[testCase.expectedProgressKey]).toBeGreaterThan(0);
    }
  });
});
