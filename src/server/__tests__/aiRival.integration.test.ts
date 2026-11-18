import { afterEach, describe, expect, it, vi } from "vitest";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { gameStateSchema } from "../../game/schema/session.schema.js";
import type { PhonePatchPayload } from "../../client/shared/types.js";
import {
  AI_RIVAL_THINK_MS,
  chooseAiRivalIntent,
  chooseAiSetupCharacter
} from "../aiRival.js";
import {
  buildSetupProjection,
  createPhoneProjection,
  createTvProjection,
  GameRoomServer,
  type ConnectedClient
} from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";
import { createScarChoice } from "../../game/rules/scarSystem.js";
import { loadThreatCards } from "../../game/content/threats.js";

const supportedScenarios = [
  "scenario_throne_of_ash",
  "scenario_mirror_of_false_heroes",
  "scenario_devourer_beneath"
] as const;

function createLobby(scenarioId: string = supportedScenarios[0]): { server: GameRoomServer; hostSeatId: string } {
  const state = createInitialSessionState(
    `ai-rival-${scenarioId}`,
    "multiplayer",
    scenarioId,
    "rivalry",
    "standard",
    6,
    { lobbyConfigured: true }
  );
  const server = new GameRoomServer(state, [], createSequenceRandomSource(Array.from({ length: 128 }, () => 0)));
  const host = server.joinSeat("Human Host");
  return { server, hostSeatId: host.seatId };
}

function createClient(seatId: string, sent: Array<Record<string, unknown>>): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(message: string) {
        sent.push(JSON.parse(message) as Record<string, unknown>);
      },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function createActiveAiNavigationState(): GameState {
  const base = createInitialSessionState(
    "ai-rival-scheduler",
    "multiplayer",
    "scenario_throne_of_ash",
    "rivalry",
    "standard",
    2,
    { lobbyConfigured: true, setupHostSeatId: "seat-1" }
  );
  return {
    ...base,
    status: "active",
    phase: "navigation",
    activeSeatIndex: 1,
    turnOrder: ["seat-1", "seat-2"],
    seats: base.seats.map((seat, index) => ({
      ...seat,
      controllerType: index === 1 ? "ai" : "human",
      displayName: index === 1 ? "Ashen Rival 2" : "Human Host",
      characterSelected: true,
      connected: index === 0,
      ready: true
    }))
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("AI Rival prototype", () => {
  it.each(supportedScenarios)("adds a fully prepared Standard AI in %s", (scenarioId) => {
    const { server, hostSeatId } = createLobby(scenarioId);
    const aiSeatId = server.addAiRival(hostSeatId);
    const state = server.getState();
    const aiSeat = state.seats.find((seat) => seat.seatId === aiSeatId)!;
    const setup = buildSetupProjection(state);
    const tv = createTvProjection(state) as unknown as { seats: Array<{ seatId: string; controllerType?: "human" | "ai" }> };

    expect(aiSeat).toMatchObject({
      controllerType: "ai",
      connected: false,
      ready: true,
      characterSelected: true
    });
    expect(aiSeat.displayName).toMatch(/^Ashen Rival /);
    expect(aiSeat.selectedStartingContractId).toBeTruthy();
    expect(aiSeat.startingBonusSelections).toHaveLength(2);
    expect(setup).toMatchObject({ automatedCount: 1, controlledCount: 2 });
    expect(tv.seats.find((seat) => seat.seatId === aiSeatId)?.controllerType).toBe("ai");
    expect(state.eventLog).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "AI_RIVAL_ADDED", seatId: aiSeatId, controllerType: "ai" })
    ]));
  });

  it("fills open seats, removes only AI seats in the lobby, and survives a snapshot round trip", () => {
    const { server, hostSeatId } = createLobby();
    const aiSeatIds = Array.from({ length: 5 }, () => server.addAiRival(hostSeatId));

    expect(new Set(aiSeatIds)).toHaveLength(5);
    expect(() => server.addAiRival(hostSeatId)).toThrow(/No open Rivalry seat/i);
    expect(() => server.removeAiRival(hostSeatId, hostSeatId)).toThrow(/occupied AI rival seat/i);

    const restored = gameStateSchema.parse(JSON.parse(JSON.stringify(server.getState())));
    expect(restored.seats.filter((seat) => seat.controllerType === "ai")).toHaveLength(5);

    server.removeAiRival(hostSeatId, aiSeatIds[2]!);
    expect(server.getState().seats.find((seat) => seat.seatId === aiSeatIds[2])).toMatchObject({
      controllerType: "human",
      displayName: null,
      ready: false
    });
  });

  it("rejects unsupported scenarios, non-host management, and physical control of AI seats", () => {
    const unsupported = createInitialSessionState(
      "ai-rival-unsupported",
      "multiplayer",
      "scenario_broken_seal",
      "rivalry",
      "standard",
      3,
      { lobbyConfigured: true }
    );
    const unsupportedServer = new GameRoomServer(unsupported);
    const unsupportedHost = unsupportedServer.joinSeat("Host");
    expect(() => unsupportedServer.addAiRival(unsupportedHost.seatId)).toThrow(/not available for this scenario/i);

    const { server, hostSeatId } = createLobby();
    const secondHuman = server.joinSeat("Second Human");
    expect(() => server.addAiRival(secondHuman.seatId)).toThrow(/Only the Host Phone/i);
    const aiSeatId = server.addAiRival(hostSeatId);
    const sent: Array<Record<string, unknown>> = [];
    server.handleIntent(createClient(aiSeatId, sent), { type: "MOVEMENT_ROLL_REQUESTED", seatId: aiSeatId });
    expect(sent).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "INTENT_REJECTED",
        actionType: "MOVEMENT_ROLL_REQUESTED",
        reason: "AI rival seats cannot be controlled by a phone client"
      })
    ]));
  });

  it("keeps another player's private notes out of the AI observation and public TV state", () => {
    const { server, hostSeatId } = createLobby();
    const aiSeatId = server.addAiRival(hostSeatId);
    const privateMarker = "HUMAN-SECRET-ROUTE-9F4";
    const state = server.getState();
    const privateState: GameState = {
      ...state,
      players: state.players.map((player) => player.seatId === hostSeatId ? {
        ...player,
        private: { ...player.private, notes: [...player.private.notes, privateMarker] }
      } : player)
    };

    const aiObservation = createPhoneProjection(privateState, aiSeatId, false);
    const tv = createTvProjection(privateState);
    expect(JSON.stringify(aiObservation)).not.toContain(privateMarker);
    expect(JSON.stringify(tv)).not.toContain(privateMarker);
    expect((aiObservation as unknown as PhonePatchPayload).privateRivalry).toBeTruthy();
  });

  it("chooses setup operatives deterministically from its own agenda priority", () => {
    const characters = [
      { id: "forge-specialist", stats: { command: 1, grit: 2, signal: 1, guile: 2, forge: 5 } },
      { id: "grit-specialist", stats: { command: 1, grit: 6, signal: 1, guile: 1, forge: 1 } },
      { id: "command-specialist", stats: { command: 7, grit: 1, signal: 1, guile: 1, forge: 1 } }
    ];
    expect(chooseAiSetupCharacter(characters, "claim-trophies")?.id).toBe("grit-specialist");
    expect(chooseAiSetupCharacter(characters, "finish-contracts")?.id).toBe("command-specialist");
  });

  it("prioritizes mandatory rolls and advances only after the one-second server thinking beat", () => {
    vi.useFakeTimers();
    const state = createActiveAiNavigationState();
    const server = new GameRoomServer(state, [], createSequenceRandomSource([2, 2, 2, 2]));
    const aiSeatId = "seat-2";
    const before = server.getState().sequence;

    vi.advanceTimersByTime(AI_RIVAL_THINK_MS - 1);
    expect(server.getState().sequence).toBe(before);
    vi.advanceTimersByTime(1);

    expect(server.getState().sequence).toBeGreaterThan(before);
    expect(server.getState().activeResolution?.playerId).toBe(aiSeatId);
    expect(server.getState().activeResolution).toBeTruthy();

    server.resetSession(createInitialSessionState("ai-rival-cleanup"));
  });

  it("does not think or act while the host presentation gate is open", () => {
    vi.useFakeTimers();
    const state = createActiveAiNavigationState();
    state.tvPresentationGate = {
      eventId: "presentation:test",
      kind: "card-reveal",
      ownerSeatId: "seat-2",
      label: "Test reveal",
      createdAt: new Date().toISOString(),
      deadlineAt: new Date(Date.now() + 10_000).toISOString()
    };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([2, 2]));
    const before = server.getState().sequence;

    vi.advanceTimersByTime(AI_RIVAL_THINK_MS * 2);
    expect(server.getState().sequence).toBe(before);
    expect(server.getState().tvPresentationGate?.eventId).toBe("presentation:test");

    server.resetSession(createInitialSessionState("ai-rival-gate-cleanup"));
  });

  it("answers a mandatory assigned enemy roll before optional tactical choices", () => {
    const state = createActiveAiNavigationState();
    const patch = createPhoneProjection({
      ...state,
      phase: "action",
      pendingEnemyRoll: {
        encounterCardId: "test-threat",
        encounterTitle: "Test Threat",
        fighterSeatId: "seat-1",
        assignedRollerSeatId: "seat-2",
        stat: "grit"
      }
    } as unknown as GameState, "seat-2") as unknown as PhonePatchPayload;

    expect(chooseAiRivalIntent(patch, "seat-2")).toMatchObject({
      intent: { type: "ENEMY_ROLL_REQUESTED", seatId: "seat-2" },
      reasonCode: "enemy-roll"
    });
  });

  it.each([false, true])("recovers a recalled rival through its Scar choice and replacement (pending result: %s)", (pendingResult) => {
    vi.useFakeTimers();
    const initial = createActiveAiNavigationState();
    initial.phase = "action";
    initial.players[1]!.character.status = "recalled";
    initial.players[1]!.character.wounds = 3;
    if (pendingResult) {
      initial.phase = "resolution";
      initial.activeResolution = {
        id: "recall-battle-result", playerId: "seat-2", source: "threat", stage: "outcome_summary",
        card: { id: "latchspire-raider", title: "Latchspire Raider", type: "enemy" },
        outcome: { title: "Failure applied", text: "Take 1 Wound.", effects: ["Take 1 Wound."] }
      };
    }
    const offered = createScarChoice(initial, "seat-2", {
      type: "gain_scar_choice", amount: 1, source: "unbound", sourceCardId: "wound-threshold"
    }, "ai-recall-regression", new Date().toISOString());
    expect(offered.offered).toBe(true);
    const server = new GameRoomServer(offered.state, [], createSequenceRandomSource([0]));
    try {
      const observation = createPhoneProjection(server.getState(), "seat-2") as unknown as PhonePatchPayload;
      expect(chooseAiRivalIntent(observation, "seat-2")?.intent.type).toBe("CHOOSE_SCAR");
      vi.advanceTimersByTime(AI_RIVAL_THINK_MS);
      expect(server.getState().pendingScarChoice).toBeNull();
      const recalled = createPhoneProjection(server.getState(), "seat-2") as unknown as PhonePatchPayload;
      const recruit = chooseAiRivalIntent(recalled, "seat-2");
      expect(recruit?.intent.type).toBe("RECRUIT_REPLACEMENT");
      vi.advanceTimersByTime(AI_RIVAL_THINK_MS);
      expect(server.getState().players[1]!.character.status).toBe("active");
      expect(server.getState().players[1]!.character.wounds).toBe(0);
      expect(server.getState().players[1]!.character.qaOnly).not.toBe(true);
      if (pendingResult) {
        const replacement = createPhoneProjection(server.getState(), "seat-2") as unknown as PhonePatchPayload;
        expect(chooseAiRivalIntent(replacement, "seat-2")?.intent.type).toBe("CONTINUE_RESOLUTION");
        vi.advanceTimersByTime(AI_RIVAL_THINK_MS);
        expect(server.getState().activeResolution?.id).not.toBe("recall-battle-result");
      }
    } finally {
      server.resetSession(createInitialSessionState("ai-recall-cleanup"));
    }
  });

  it("spends its action stabilizing when one escalation step remains before collapse", () => {
    const state = { ...createActiveAiNavigationState(), phase: "action" as const, escalationLevel: 9, escalationThreshold: 10 };
    const patch = createPhoneProjection(state, "seat-2") as unknown as PhonePatchPayload;

    expect(chooseAiRivalIntent(patch, "seat-2")).toMatchObject({
      intent: { type: "STABILIZE_REQUESTED", seatId: "seat-2" },
      reasonCode: "prevent-table-defeat"
    });
  });

  it("pauses third-Scar retirement before the next arrival threat and resumes after replacement", () => {
    const state = createActiveAiNavigationState();
    state.phase = "resolution";
    state.resolutionSource = "encounter";
    state.currentEncounter = loadThreatCards().get("rail-scent-kennelmaster")!;
    const player = state.players[1]!;
    player.sectorId = player.character.currentSpaceId = "weeping-ammunition-shrine";
    player.character.scars = ["scar-rift-eye", "scar-borrowed-name", "scar-wound-5"];
    state.pendingScarThreshold = { seatId: "seat-2", selectionId: "third-scar", scarIds: player.character.scars,
      policy: "retire", status: "queued", createdAt: "2026-11-01T00:00:00.000Z" };
    state.activeResolution = { id: "retirement-result", playerId: "seat-2", source: "threat", stage: "awaiting_continue" };
    state.tileArrivalThreatProgress = { arrivalId: "retirement-arrival", seatId: "seat-2", sectorId: player.sectorId,
      threatLanes: ["red", "yellow"], threatRuleIds: ["threat:0:red", "threat:1:yellow"], nextThreatIconIndex: 1,
      resolvedThreatOutcomes: [], allThreatsSuccessful: null };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0]), undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, { mode: "simulation" });
    const messages: Array<Record<string, unknown>> = [];
    const controller = { ...createClient("seat-2", messages), automated: true,
      onAutomatedRejection: (reason: string) => { messages.push({ type: "INTENT_REJECTED", reason }); } };
    server.handleIntent(controller, { type: "CONTINUE_RESOLUTION", seatId: "seat-2" });
    expect(messages.filter((message) => message.type === "INTENT_REJECTED")).toEqual([]);
    expect(server.getState().players[1]!.character.status).toBe("recalled");
    expect(server.getState().tileArrivalThreatProgress?.nextThreatIconIndex).toBe(1);
    const choice = chooseAiRivalIntent(createPhoneProjection(server.getState(), "seat-2") as unknown as PhonePatchPayload, "seat-2");
    expect(choice?.intent.type).toBe("RECRUIT_REPLACEMENT");
    server.handleIntent(controller, choice!.intent);
    expect(messages.filter((message) => message.type === "INTENT_REJECTED")).toEqual([]);
    expect(server.getState().players[1]!.character.status).toBe("active");
    expect(server.getState().tileArrivalThreatProgress?.nextThreatIconIndex).toBe(2);
    expect(server.getState().activeResolution?.stage).toBe("card_reveal");
  });

  it("uses at most one bounded interference against a visible leader and never near collapse", () => {
    const state = { ...createActiveAiNavigationState(), phase: "action" as const };
    const projected = createPhoneProjection(state, "seat-2") as unknown as PhonePatchPayload;
    const target = projected.players.find((player) => player.seatId === "seat-1")!;
    const patch: PhonePatchPayload = {
      ...projected,
      escalationLevel: 0,
      escalationThreshold: 10,
      privateRivalry: null,
      players: projected.players.map((player) => player.seatId === target.seatId
        ? { ...player, character: { ...player.character, trophies: 3, salvage: 3 } }
        : player),
      rivalryInteraction: {
        actorCanPressure: true,
        targets: [{ seatId: target.seatId, canPressure: true }]
      }
    };

    expect(chooseAiRivalIntent(patch, "seat-2")).toMatchObject({
      intent: {
        type: "TABLE_INTERACTION",
        seatId: "seat-2",
        targetSeatId: target.seatId,
        interactionKind: "interfere"
      },
      reasonCode: "bounded-rivalry-pressure"
    });

    expect(chooseAiRivalIntent({
      ...patch,
      rivalryInteraction: { ...patch.rivalryInteraction!, actorCanPressure: false }
    }, "seat-2")?.reasonCode).not.toBe("bounded-rivalry-pressure");
    expect(chooseAiRivalIntent({ ...patch, escalationLevel: 9 }, "seat-2")?.reasonCode).toBe("prevent-table-defeat");
  });
});
