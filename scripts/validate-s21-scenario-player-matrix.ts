import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import WebSocket from "ws";
import type { ConnectedClient } from "../src/server/roomServer.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../src/server/roomServer.js";
import { createInitialSessionState } from "../src/server/sessionState.js";
import { createSequenceRandomSource } from "../src/game/engine/dice.js";
import { reduceGameState } from "../src/game/engine/reducer.js";
import { getEscalationCollapseLevel, getEscalationModifier } from "../src/game/engine/escalation.js";
import {
  getScenarioDefinition,
  isScenarioEligibleForSession,
  SCENARIOS,
  type ScenarioDefinition
} from "../src/game/data/scenarios.js";
import { nemeses } from "../src/game/data/nemeses.js";
import type { SectorCollapsedAction } from "../src/game/engine/actions.js";
import { sessionSnapshotSchema, type GameState, type SessionMode } from "../src/game/schema/session.schema.js";

interface MatrixCase {
  id: string;
  scenarioId: string;
  scenarioName: string;
  playerCount: number;
  sessionMode: SessionMode;
  interactionMode: "co-op";
}

interface MatrixResult {
  id: string;
  scenarioId: string;
  scenarioName: string;
  playerCount: number;
  authoredEligible: boolean;
  runtimeEligible: boolean;
  setupPass: boolean;
  handoffPass: boolean;
  waitingPass: boolean;
  reconnectPass: boolean;
  privacyPass: boolean;
  victoryPass: boolean;
  defeatPass: boolean;
  handoffs: Array<{ from: string; to: string }>;
  errors: string[];
  pass: boolean;
}

const outputRoot = resolve(".tmp-playtest/s21-full-game-campaign");

function matrixCases(): MatrixCase[] {
  return SCENARIOS.flatMap((scenario) =>
    Array.from(
      { length: scenario.supportedPlayerCounts.max - scenario.supportedPlayerCounts.min + 1 },
      (_, index) => scenario.supportedPlayerCounts.min + index
    ).map((playerCount) => ({
      id: `${scenario.id}:${playerCount}p`,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      playerCount,
      sessionMode: playerCount === 1 ? "single-player" as const : "multiplayer" as const,
      interactionMode: "co-op" as const
    }))
  );
}

function makeClient(seatId: string, errors: string[]): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      readyState: WebSocket.OPEN,
      send(payload: string) {
        const message = JSON.parse(payload) as { type?: string; reason?: string };
        if (message.type === "INTENT_REJECTED") {
          errors.push(message.reason ?? "Intent rejected");
        }
      },
      close() {}
    } as ConnectedClient["socket"]
  };
}

function configuredRoundState(testCase: MatrixCase): GameState {
  const state = createInitialSessionState(
    `s21-matrix-${testCase.scenarioId}-${testCase.playerCount}`,
    testCase.sessionMode,
    testCase.scenarioId,
    testCase.interactionMode,
    "standard",
    testCase.playerCount
  );
  const occupiedSeatIds = state.seats.slice(0, testCase.playerCount).map((seat) => seat.seatId);

  return {
    ...state,
    status: "active",
    phase: "broadcast",
    activeSeatIndex: 0,
    turnOrder: occupiedSeatIds,
    setupHostSeatId: occupiedSeatIds[0] ?? null,
    lobbyConfigured: true,
    seats: state.seats.slice(0, testCase.playerCount).map((seat, index) => ({
      ...seat,
      displayName: `Matrix P${index + 1}`,
      connected: true,
      ready: true,
      characterSelected: true
    })),
    players: state.players.slice(0, testCase.playerCount)
  };
}

function forbiddenPublicKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((entry) => forbiddenPublicKeys(entry, found));
    return found;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (["joinToken", "seatToken", "hostToken", "private", "hand"].includes(key)) found.add(key);
    forbiddenPublicKeys(entry, found);
  }
  return found;
}

function runRoundAndReconnect(testCase: MatrixCase): Pick<
  MatrixResult,
  "setupPass" | "handoffPass" | "waitingPass" | "reconnectPass" | "privacyPass" | "handoffs" | "errors"
> {
  const errors: string[] = [];
  let state = configuredRoundState(testCase);
  const startingSeatId = state.turnOrder[state.activeSeatIndex]!;
  const handoffs: Array<{ from: string; to: string }> = [];
  let waitingPass = true;

  const setupPass =
    state.seats.length === testCase.playerCount &&
    state.players.length === testCase.playerCount &&
    state.turnOrder.length === testCase.playerCount &&
    state.activeScenarioId === testCase.scenarioId;

  for (let step = 0; step < testCase.playerCount; step += 1) {
    const from = state.turnOrder[state.activeSeatIndex]!;
    for (const seatId of state.turnOrder) {
      const projection = createPhoneProjection(state, seatId);
      const required = projection.requiredAction as { canAct?: boolean; waiting?: boolean } | null | undefined;
      if (seatId === from) {
        waitingPass &&= !required || required.canAct !== false;
      } else {
        waitingPass &&= Boolean(required?.waiting || required?.canAct === false);
      }
    }

    const advanced = reduceGameState(state, {
      type: "PHASE_ADVANCED",
      seatId: from,
      toPhase: "start",
      createdAt: `matrix-handoff-${step}`
    });
    if (!advanced.ok) {
      errors.push(`Handoff ${step + 1} rejected: ${advanced.rejection.reason}`);
      break;
    }
    const to = advanced.state.turnOrder[advanced.state.activeSeatIndex]!;
    handoffs.push({ from, to });
    state = { ...advanced.state, phase: "broadcast" };
  }

  const handoffPass =
    handoffs.length === testCase.playerCount &&
    state.turnOrder[state.activeSeatIndex] === startingSeatId;

  let reconnectPass = false;
  try {
    const restored = sessionSnapshotSchema.parse({
      saveVersion: 2,
      sessionId: state.sessionId,
      sequence: state.sequence,
      state: JSON.parse(JSON.stringify(state))
    }).state;
    const beforeTv = createTvProjection(state);
    const afterTv = createTvProjection(restored);
    const beforeOwner = createPhoneProjection(state, startingSeatId);
    const afterOwner = createPhoneProjection(restored, startingSeatId);
    reconnectPass =
      restored.activeScenarioId === state.activeScenarioId &&
      restored.activeSeatIndex === state.activeSeatIndex &&
      JSON.stringify(beforeTv.requiredAction) === JSON.stringify(afterTv.requiredAction) &&
      JSON.stringify(beforeOwner.requiredAction) === JSON.stringify(afterOwner.requiredAction);
  } catch (error) {
    errors.push(`Reconnect restoration failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const tvProjection = createTvProjection(state);
  const privacyPass = forbiddenPublicKeys(tvProjection).size === 0;
  if (!privacyPass) {
    errors.push(`TV projection exposed forbidden keys: ${[...forbiddenPublicKeys(tvProjection)].join(", ")}`);
  }

  return { setupPass, handoffPass, waitingPass, reconnectPass, privacyPass, handoffs, errors };
}

function configuredTerminalState(testCase: MatrixCase): GameState {
  const definition = getScenarioDefinition(testCase.scenarioId);
  if (!definition) throw new Error(`Unknown scenario ${testCase.scenarioId}`);
  const state = createInitialSessionState(
    `s21-terminal-${testCase.scenarioId}-${testCase.playerCount}`,
    testCase.sessionMode,
    testCase.scenarioId,
    testCase.interactionMode,
    "standard",
    testCase.playerCount
  );
  const occupiedSeatIds = state.seats.slice(0, testCase.playerCount).map((seat) => seat.seatId);
  const linkedNemesis = nemeses.find((nemesis) => nemesis.scenarioId === testCase.scenarioId) ?? null;
  const effectiveVictoryThreshold = linkedNemesis?.stats.life ?? definition.victoryThreshold;

  const configured: GameState = {
    ...state,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    turnOrder: occupiedSeatIds,
    seats: state.seats.slice(0, testCase.playerCount).map((seat, index) => ({
      ...seat,
      displayName: `Terminal P${index + 1}`,
      connected: true,
      ready: true,
      characterSelected: true
    })),
    players: state.players.slice(0, testCase.playerCount).map((player) =>
      player.seatId === "seat-1"
        ? {
            ...player,
            sectorId: "center_cinder_gate",
            character: {
              ...player.character,
              currentSpaceId: "center_cinder_gate",
              heat: 0,
              wounds: 0,
              trophies: 10,
              stats: { command: 20, grit: 20, signal: 20, guile: 20, forge: 20 }
            }
          }
        : player
    ),
    scenarioProgress: {
      ...state.scenarioProgress,
      [definition.winConditionKey]: Math.max(
        effectiveVictoryThreshold,
        state.scenarioProgress[definition.winConditionKey] ?? 0
      ),
      sealTokens: Math.max(6, state.scenarioProgress.sealTokens ?? 0),
      starTokens: Math.max(5, state.scenarioProgress.starTokens ?? 0),
      engineKeys: Math.max(3, state.scenarioProgress.engineKeys ?? 0)
    }
  };

  if (testCase.scenarioId === "scenario_broken_concordance") {
    configured.scenarioPreparation = {
      ...configured.scenarioPreparation,
      resources: { ...configured.scenarioPreparation.resources, concordanceNodes: 3 },
      completedObjectiveIds: [
        "concordance-node-black-relay",
        "concordance-node-webglass",
        "concordance-node-cinder-lattice"
      ]
    };
    configured.scenarioConfrontation = {
      ...configured.scenarioConfrontation,
      progress: { ...configured.scenarioConfrontation.progress, concordanceStages: 2 }
    };
    const active = configured.players.find((player) => player.seatId === "seat-1");
    if (active) active.private.notes = [...active.private.notes, "gate-of-cinders-breached"];
  }

  return configured;
}

function runVictory(testCase: MatrixCase): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  const server = new GameRoomServer(
    configuredTerminalState(testCase),
    [],
    createSequenceRandomSource(Array.from({ length: 40 }, () => 5))
  );
  server.handleIntent(makeClient("seat-1", errors), {
    type: "SCENARIO_CONFRONTATION_REQUESTED",
    seatId: "seat-1"
  });

  if (testCase.scenarioId === "scenario_broken_concordance") {
    const test = server.getState().pendingCooperativeTest;
    if (!test) {
      errors.push("Broken Concordance did not create its final cooperative test");
    } else {
      server.handleIntent(makeClient("seat-1", errors), {
        type: "COOPERATIVE_ASSISTANCE_REQUESTED",
        seatId: "seat-1",
        sourceId: test.sourceId,
        stat: test.stat,
        helperSeatIds: ["seat-2"]
      });
      const assistance = server.getState().cooperativeAssistance;
      if (!assistance) {
        errors.push("Broken Concordance did not open assistance");
      } else {
        server.handleIntent(makeClient("seat-2", errors), {
          type: "COOPERATIVE_ASSISTANCE_RESPONDED",
          seatId: "seat-2",
          requestId: assistance.id,
          accept: true
        });
        server.handleIntent(makeClient("seat-1", errors), {
          type: "COOPERATIVE_ASSISTANCE_LOCKED",
          seatId: "seat-1",
          requestId: assistance.id
        });
        server.handleIntent(makeClient("seat-1", errors), {
          type: "COOPERATIVE_TEST_ROLL_REQUESTED",
          seatId: "seat-1",
          testId: test.id
        });
      }
    }
  }

  const state = server.getState();
  return { pass: errors.length === 0 && state.status === "ended" && state.winnerSeatId === "seat-1", errors };
}

function runDefeat(testCase: MatrixCase): { pass: boolean; errors: string[] } {
  const state = configuredTerminalState(testCase);
  const threshold = getEscalationCollapseLevel(testCase.sessionMode);
  const action = {
    type: "SECTOR_COLLAPSED",
    seatId: "seat-1",
    threshold,
    modifier: getEscalationModifier(threshold),
    summary: `${testCase.scenarioName} matrix defeat validation`,
    createdAt: `matrix-defeat-${testCase.id}`
  } satisfies SectorCollapsedAction;
  const result = reduceGameState(state, action);
  if (!result.ok) return { pass: false, errors: [result.rejection.reason] };
  return {
    pass: result.state.status === "ended" && result.state.winnerSeatId === null,
    errors: []
  };
}

function authoredEligibility(scenario: ScenarioDefinition, playerCount: number): boolean {
  return playerCount >= scenario.supportedPlayerCounts.min && playerCount <= scenario.supportedPlayerCounts.max;
}

async function main(): Promise<void> {
  const cases = matrixCases();
  if (cases.length !== 40) throw new Error(`Expected 40 authored combinations, found ${cases.length}`);
  const results: MatrixResult[] = [];

  for (const testCase of cases) {
    const scenario = getScenarioDefinition(testCase.scenarioId)!;
    const structural = runRoundAndReconnect(testCase);
    const victory = runVictory(testCase);
    const defeat = runDefeat(testCase);
    const result: MatrixResult = {
      id: testCase.id,
      scenarioId: testCase.scenarioId,
      scenarioName: testCase.scenarioName,
      playerCount: testCase.playerCount,
      authoredEligible: authoredEligibility(scenario, testCase.playerCount),
      runtimeEligible: isScenarioEligibleForSession(
        scenario,
        testCase.sessionMode,
        testCase.interactionMode,
        "standard",
        testCase.playerCount
      ),
      ...structural,
      victoryPass: victory.pass,
      defeatPass: defeat.pass,
      errors: [...structural.errors, ...victory.errors, ...defeat.errors],
      pass: false
    };
    result.pass =
      result.authoredEligible &&
      result.runtimeEligible &&
      result.setupPass &&
      result.handoffPass &&
      result.waitingPass &&
      result.reconnectPass &&
      result.privacyPass &&
      result.victoryPass &&
      result.defeatPass &&
      result.errors.length === 0;
    results.push(result);
    console.log(`${result.pass ? "PASS" : "FAIL"} ${result.scenarioName} ${result.playerCount}P`);
  }

  const summary = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    combinationCount: results.length,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
    authoredRuntimeMismatches: results
      .filter((result) => result.authoredEligible !== result.runtimeEligible)
      .map((result) => result.id),
    results
  };
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    join(outputRoot, "scenario-player-count-matrix.json"),
    JSON.stringify(summary, null, 2)
  );
  console.log(JSON.stringify({
    combinations: summary.combinationCount,
    passed: summary.passed,
    failed: summary.failed,
    mismatches: summary.authoredRuntimeMismatches.length
  }, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
