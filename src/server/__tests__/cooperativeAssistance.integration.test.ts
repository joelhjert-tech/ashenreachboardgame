import WebSocket from "ws";
import { describe, expect, it, vi } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { loadThreatCards } from "../../game/content/threats.js";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import { sessionSnapshotSchema } from "../../game/schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

const hazard: ThreatCard = {
  id: "cooperative-signal-hazard",
  type: "threat",
  cardType: "hazard",
  title: "Severed Signal",
  text: "A broken relay repeats the wrong command.",
  flavor: "Three voices answer from one wire.",
  severity: 1,
  stat: "signal",
  difficulty: 12,
  successEffect: { type: "legacy_compatibility_noop" },
  failEffect: { type: "legacy_compatibility_noop" }
};

function client(seatId: string) {
  return {
    view: "phone" as const,
    seatId,
    socket: { send: vi.fn(), readyState: WebSocket.OPEN } as unknown as WebSocket
  } satisfies ConnectedClient;
}

function createServer() {
  const initial = createInitialSessionState("assist-integration", "multiplayer", "scenario_broken_concordance", "co-op", "standard", 3);
  const state = {
    ...initial,
    status: "active" as const,
    phase: "action" as const,
    seats: initial.seats.map((seat, index) => ({ ...seat, connected: true, characterSelected: true, displayName: `Player ${index + 1}` })),
    currentEncounter: hazard,
    activeResolution: {
      id: "assist-resolution",
      playerId: "seat-1",
      source: "threat" as const,
      stage: "battle_setup" as const,
      card: { id: hazard.id, title: hazard.title, type: "hazard" },
      battle: { stat: "signal" as const, difficulty: 12, modifiers: [] }
    }
  };
  state.players[1]!.character.stats.signal = 6;
  state.players[1]!.character.statUpgrades = { ...(state.players[1]!.character.statUpgrades ?? {}), signal: 2 };
  return new GameRoomServer(state, [], createSequenceRandomSource([0, 0]));
}

describe("authoritative cooperative assistance lifecycle", () => {
  it("locks one intrinsic helper contribution and applies it exactly once", () => {
    const server = createServer();
    server.handleIntent(client("seat-1"), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: hazard.id,
      stat: "signal",
      helperSeatIds: ["seat-2"]
    });
    server.handleIntent(client("seat-2"), { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId: server.getState().cooperativeAssistance!.id, accept: true });
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId: "seat-1", requestId: server.getState().cooperativeAssistance!.id });

    expect(server.getState().cooperativeAssistance?.lockedContributions).toEqual([{ seatId: "seat-2", value: 4 }]);
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });

    expect(server.getState().cooperativeAssistance).toBeNull();
    expect(server.getState().activeResolution?.assistance).toEqual({
      testedStat: "signal",
      activeSeatId: "seat-1",
      contributions: [{ seatId: "seat-2", value: 4 }],
      total: 4
    });
    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "COOPERATIVE_ASSISTED_ROLL_RESOLVED")).toHaveLength(1);
  });

  it("adds assistance to an enemy battle while rolling each side exactly once", () => {
    const enemy = loadThreatCards().get("ash-choir-crusader")!;
    if (enemy.cardType !== "enemy") throw new Error("Expected enemy fixture");
    const initial = createInitialSessionState("assist-battle", "multiplayer", "scenario_broken_concordance", "co-op", "standard", 3);
    const state = {
      ...initial,
      status: "active" as const,
      phase: "action" as const,
      seats: initial.seats.map((seat, index) => ({ ...seat, connected: true, characterSelected: true, displayName: `Player ${index + 1}` })),
      currentEncounter: enemy,
      activeResolution: {
        id: "assist-battle-resolution",
        playerId: "seat-1",
        source: "threat" as const,
        stage: "battle_setup" as const,
        card: { id: enemy.id, title: enemy.title, type: "enemy" },
        battle: { enemyName: enemy.enemyName, stat: enemy.stat, difficulty: enemy.difficulty, modifiers: [] }
      }
    };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 0, 0]));
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_REQUESTED", seatId: "seat-1", sourceId: enemy.id, stat: enemy.stat, helperSeatIds: ["seat-2"] });
    server.handleIntent(client("seat-2"), { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId: server.getState().cooperativeAssistance!.id, accept: true });
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId: "seat-1", requestId: server.getState().cooperativeAssistance!.id });
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: enemy.stat });

    const combatEvent = [...server.getState().eventLog].reverse().find((event) => (event as { type?: string }).type === "COMBAT_RESOLVED") as { roll: { faces: number[] }; enemyRoll: { faces: number[] } };
    expect(combatEvent.roll.faces).toEqual([1, 1]);
    expect(combatEvent.enemyRoll.faces).toEqual([1, 1]);
    expect(server.getState().activeResolution?.assistance?.contributions).toHaveLength(1);
  });

  it("rejects an unrequested response and preserves the pending request", () => {
    const server = createServer();
    server.handleIntent(client("seat-1"), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: hazard.id,
      stat: "signal",
      helperSeatIds: ["seat-2"]
    });
    const requestId = server.getState().cooperativeAssistance!.id;
    const intruder = client("seat-3");
    server.handleIntent(intruder, { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-3", requestId, accept: true });

    expect(server.getState().cooperativeAssistance?.acceptedSeatIds).toEqual([]);
    expect(vi.mocked(intruder.socket.send)).toHaveBeenCalled();
  });

  it("locks one accepted helper while another response remains pending", () => {
    const server = createServer();
    server.handleIntent(client("seat-1"), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: hazard.id,
      stat: "signal",
      helperSeatIds: ["seat-2", "seat-3"]
    });
    const requestId = server.getState().cooperativeAssistance!.id;
    server.handleIntent(client("seat-2"), { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId, accept: true });
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId: "seat-1", requestId });

    expect(server.getState().cooperativeAssistance).toMatchObject({
      status: "locked",
      acceptedSeatIds: ["seat-2"],
      lockedContributions: [{ seatId: "seat-2", value: 4 }]
    });
  });

  it("rejects a disconnected helper before response but retains an already accepted contribution", () => {
    const beforeAcceptance = createServer();
    beforeAcceptance.handleIntent(client("seat-1"), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: hazard.id,
      stat: "signal",
      helperSeatIds: ["seat-2"]
    });
    const staleRequestId = beforeAcceptance.getState().cooperativeAssistance!.id;
    beforeAcceptance.getState().seats[1]!.connected = false;
    const staleHelper = client("seat-2");
    beforeAcceptance.handleIntent(staleHelper, { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId: staleRequestId, accept: true });
    expect(beforeAcceptance.getState().cooperativeAssistance?.acceptedSeatIds).toEqual([]);
    expect(vi.mocked(staleHelper.socket.send)).toHaveBeenCalled();

    const afterAcceptance = createServer();
    afterAcceptance.handleIntent(client("seat-1"), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: hazard.id,
      stat: "signal",
      helperSeatIds: ["seat-2"]
    });
    const acceptedRequestId = afterAcceptance.getState().cooperativeAssistance!.id;
    afterAcceptance.handleIntent(client("seat-2"), { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId: acceptedRequestId, accept: true });
    afterAcceptance.getState().seats[1]!.connected = false;
    afterAcceptance.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId: "seat-1", requestId: acceptedRequestId });
    expect(afterAcceptance.getState().cooperativeAssistance?.lockedContributions).toEqual([{ seatId: "seat-2", value: 4 }]);
  });

  it("records cancellation and rejects duplicate helper responses", () => {
    const server = createServer();
    server.handleIntent(client("seat-1"), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: hazard.id,
      stat: "signal",
      helperSeatIds: ["seat-2"]
    });
    const requestId = server.getState().cooperativeAssistance!.id;
    server.handleIntent(client("seat-2"), { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId, accept: false });
    const duplicate = client("seat-2");
    server.handleIntent(duplicate, { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId, accept: true });
    expect(vi.mocked(duplicate.socket.send)).toHaveBeenCalled();
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_CANCELLED", seatId: "seat-1", requestId });
    expect(server.getState().cooperativeAssistance).toBeNull();
    expect(server.getState().eventLog.some((event) => (event as { type?: string }).type === "COOPERATIVE_ASSISTANCE_CANCELLED")).toBe(true);
  });

  it("rejects a third helper before creating authoritative request state", () => {
    const initial = createInitialSessionState("assist-four", "multiplayer", "scenario_broken_concordance", "co-op", "standard", 4);
    const template = createServer().getState();
    const state = {
      ...initial,
      status: "active" as const,
      phase: "action" as const,
      seats: initial.seats.map((seat, index) => ({ ...seat, connected: true, characterSelected: true, displayName: `Player ${index + 1}` })),
      currentEncounter: hazard,
      activeResolution: template.activeResolution
    };
    const server = new GameRoomServer(state);
    const active = client("seat-1");
    server.handleIntent(active, { type: "COOPERATIVE_ASSISTANCE_REQUESTED", seatId: "seat-1", sourceId: hazard.id, stat: "signal", helperSeatIds: ["seat-2", "seat-3", "seat-4"] });
    expect(server.getState().cooperativeAssistance).toBeNull();
    expect(vi.mocked(active.socket.send)).toHaveBeenCalled();
  });

  it("projects controls only to the active and requested phones", () => {
    const server = createServer();
    const before = createPhoneProjection(server.getState(), "seat-1") as { cooperativeAssistanceEligibility?: { helpers: unknown[] } };
    expect(before.cooperativeAssistanceEligibility?.helpers).toHaveLength(2);
    server.handleIntent(client("seat-1"), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: hazard.id,
      stat: "signal",
      helperSeatIds: ["seat-2"]
    });

    const active = createPhoneProjection(server.getState(), "seat-1") as { cooperativeAssistance: { viewerRole?: string; eligibleHelperSeatIds?: string[] } };
    const helper = createPhoneProjection(server.getState(), "seat-2") as { cooperativeAssistance: { viewerRole?: string; viewerContribution?: number; eligibleHelperSeatIds?: string[] } };
    const observer = createPhoneProjection(server.getState(), "seat-3") as { cooperativeAssistance: { viewerRole?: string; viewerContribution?: number } };
    const tv = createTvProjection(server.getState()) as { cooperativeAssistance: { viewerRole?: string; eligibleHelperSeatIds?: string[] } };
    expect(active.cooperativeAssistance.viewerRole).toBe("active");
    expect(active.cooperativeAssistance.eligibleHelperSeatIds).toContain("seat-2");
    expect(helper.cooperativeAssistance).toMatchObject({ viewerRole: "requested", viewerContribution: 4 });
    expect(helper.cooperativeAssistance.eligibleHelperSeatIds).toBeUndefined();
    expect(observer.cooperativeAssistance).toMatchObject({ viewerRole: "observer" });
    expect(observer.cooperativeAssistance.viewerContribution).toBeUndefined();
    expect(tv.cooperativeAssistance.viewerRole).toBeUndefined();
    expect(tv.cooperativeAssistance.eligibleHelperSeatIds).toBeUndefined();
  });

  it("round-trips a pending request through save version 2 without changing locked values", () => {
    const server = createServer();
    server.handleIntent(client("seat-1"), {
      type: "COOPERATIVE_ASSISTANCE_REQUESTED",
      seatId: "seat-1",
      sourceId: hazard.id,
      stat: "signal",
      helperSeatIds: ["seat-2"]
    });
    server.handleIntent(client("seat-2"), { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId: server.getState().cooperativeAssistance!.id, accept: true });
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId: "seat-1", requestId: server.getState().cooperativeAssistance!.id });

    const parsed = sessionSnapshotSchema.parse({ saveVersion: 2, sessionId: server.getState().sessionId, sequence: server.getState().sequence, state: server.getState() });
    expect(parsed.saveVersion).toBe(2);
    expect(parsed.state.cooperativeAssistance?.lockedContributions).toEqual([{ seatId: "seat-2", value: 4 }]);
  });

  it("stabilizes a Broken Concordance node once and keeps preparation separate", () => {
    const initial = createInitialSessionState("concordance-node", "multiplayer", "scenario_broken_concordance", "co-op", "standard", 3);
    const state = {
      ...initial,
      status: "active" as const,
      phase: "action" as const,
      seats: initial.seats.map((seat, index) => ({ ...seat, connected: true, characterSelected: true, displayName: `Player ${index + 1}` })),
      players: initial.players.map((player, index) => index === 0
        ? { ...player, sectorId: "black-relay-spire", character: { ...player.character, currentSpaceId: "black-relay-spire", stats: { ...player.character.stats, signal: 5 } } }
        : player)
    };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));
    server.handleIntent(client("seat-1"), { type: "BROKEN_CONCORDANCE_NODE_REQUESTED", seatId: "seat-1", nodeId: "concordance-node-black-relay" });
    const test = server.getState().pendingCooperativeTest!;
    expect(test.requiresHelper).toBe(true);
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_REQUESTED", seatId: "seat-1", sourceId: test.sourceId, stat: test.stat, helperSeatIds: ["seat-2"] });
    server.handleIntent(client("seat-2"), { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId: server.getState().cooperativeAssistance!.id, accept: true });
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId: "seat-1", requestId: server.getState().cooperativeAssistance!.id });
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_TEST_ROLL_REQUESTED", seatId: "seat-1", testId: test.id });

    expect(server.getState().scenarioPreparation.completedObjectiveIds).toEqual(["concordance-node-black-relay"]);
    expect(server.getState().scenarioPreparation.resources.concordanceNodes).toBe(1);
    expect(server.getState().scenarioConfrontation.progress.concordanceStages).toBeUndefined();
  });

  it("grants victory only after the final assisted Core stage at center", () => {
    const initial = createInitialSessionState("concordance-core", "multiplayer", "scenario_broken_concordance", "co-op", "standard", 3);
    const state = {
      ...initial,
      status: "active" as const,
      phase: "action" as const,
      seats: initial.seats.map((seat, index) => ({ ...seat, connected: true, characterSelected: true, displayName: `Player ${index + 1}` })),
      players: initial.players.map((player, index) => index === 0
        ? {
            ...player,
            sectorId: "center_cinder_gate",
            character: { ...player.character, currentSpaceId: "center_cinder_gate", stats: { ...player.character.stats, grit: 6 } },
            private: { ...player.private, notes: [...player.private.notes, "gate-of-cinders-breached"] }
          }
        : player),
      scenarioPreparation: {
        ...initial.scenarioPreparation,
        resources: { concordanceNodes: 3 },
        completedObjectiveIds: ["concordance-node-black-relay", "concordance-node-webglass", "concordance-node-cinder-lattice"]
      },
      scenarioConfrontation: {
        ...initial.scenarioConfrontation,
        progress: { concordanceStages: 2 }
      }
    };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));
    server.resolveScenarioConfrontationIntent({ type: "SCENARIO_CONFRONTATION_REQUESTED", seatId: "seat-1" });
    const test = server.getState().pendingCooperativeTest!;
    expect(test.sourceId).toBe("hold-your-name");
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_REQUESTED", seatId: "seat-1", sourceId: test.sourceId, stat: test.stat, helperSeatIds: ["seat-2"] });
    server.handleIntent(client("seat-2"), { type: "COOPERATIVE_ASSISTANCE_RESPONDED", seatId: "seat-2", requestId: server.getState().cooperativeAssistance!.id, accept: true });
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_ASSISTANCE_LOCKED", seatId: "seat-1", requestId: server.getState().cooperativeAssistance!.id });
    server.handleIntent(client("seat-1"), { type: "COOPERATIVE_TEST_ROLL_REQUESTED", seatId: "seat-1", testId: test.id });

    expect(server.getState().scenarioConfrontation.progress.concordanceStages).toBe(3);
    expect(server.getState().scenarioResult.status).toBe("victory");
    expect(server.getState().scenarioResult.sourceType).toBe("confrontation");
  });
});
