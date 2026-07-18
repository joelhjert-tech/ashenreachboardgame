import { describe, expect, it } from "vitest";
import type { ConnectedClient } from "../../../server/roomServer.js";
import { GameRoomServer, createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadThreatCards } from "../../content/threats.js";
import type { EscalationAdvancedAction } from "../actions.js";
import { getEscalationCollapseLevel } from "../escalation.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";
import type { PhonePatchPayload, PublicPatchPayload } from "../../../client/shared/types.js";

const threats = loadThreatCards();
function requireHazard(id: string) {
  const threat = threats.get(id);
  if (!threat || threat.cardType !== "hazard") throw new Error(`Missing hazard ${id}`);
  return threat;
}
const card = requireHazard("shattered-barricade");

function createClient(seatId: string, messages: Array<Record<string, unknown>> = []): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(payload: string) {
        messages.push(JSON.parse(payload) as Record<string, unknown>);
      },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function createResolutionState(options: {
  escalationLevel?: number;
  sessionMode?: "single-player" | "multiplayer";
  success?: boolean;
} = {}): GameState {
  const sessionMode = options.sessionMode ?? "multiplayer";
  const state = createInitialSessionState("b2b-shattered-barricade", sessionMode);
  const player = state.players[0]!;
  const success = options.success ?? false;

  state.status = "active";
  state.phase = "resolution";
  state.activeSeatIndex = 0;
  state.turnOrder = [player.seatId, ...state.turnOrder.filter((seatId) => seatId !== player.seatId)];
  state.escalationLevel = options.escalationLevel ?? 0;
  state.currentEncounter = card;
  state.pendingEffect = success ? card.successEffect! : card.failEffect;
  state.seats = state.seats.map((seat) => ({
    ...seat,
    characterSelected: true,
    connected: seat.seatId === player.seatId,
    ready: true
  }));
  state.activeResolution = {
    id: "shattered-barricade:authoritative-check:1",
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    roll: {
      dice: success ? [6, 6] : [1, 1],
      baseTotal: success ? 12 : 2,
      modifierTotal: 0,
      finalTotal: success ? 12 : 2,
      target: card.difficulty,
      success
    }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId,
    movedToSectorId: player.sectorId,
    encounterCardId: card.id,
    encounterTitle: card.title,
    encounterCardType: card.cardType,
    checkStat: card.stat,
    die1: success ? 6 : 1,
    die2: success ? 6 : 1,
    statBonus: 0,
    checkTotal: success ? 12 : 2,
    difficulty: card.difficulty,
    success,
    summary: `Shattered Barricade check ${success ? "passed" : "failed"}.`
  };
  state.eventLog = [{
    type: "CHECK_ROLLED",
    seatId: player.seatId,
    cardId: card.id,
    success,
    createdAt: "approved-check"
  }];

  return state;
}

function continueUntilEscalationResolves(server: GameRoomServer): void {
  const seatId = server.getState().players[0]!.seatId;
  const client = createClient(seatId);

  for (let index = 0; index < 8; index += 1) {
    if (server.getState().status !== "active") return;
    if ((server.getState().resolvedEscalationSourceEventIds ?? []).length > 0) return;
    if (
      server.getState().activeResolution ||
      (server.getState().phase === "resolution" && server.getState().pendingEffect)
    ) {
      server.handleIntent(client, { type: "CONTINUE_RESOLUTION", seatId });
      continue;
    }
    return;
  }
}

function escalationEvents(state: GameState): EscalationAdvancedAction[] {
  return state.eventLog.filter(
    (entry): entry is EscalationAdvancedAction =>
      Boolean(entry && typeof entry === "object" && "type" in entry && entry.type === "ESCALATION_ADVANCED")
  );
}

describe("Phase B2B Shattered Barricade content", () => {
  it("preserves its stable identity and all deck totals while applying the exact approved failure", () => {
    expect(card).toMatchObject({
      id: "shattered-barricade",
      cardType: "hazard",
      threatLane: "red",
      stat: "forge",
      difficulty: 7,
      text: "The breach broadcasts your position. Advance Global Escalation by 1.",
      successEffect: {
        type: "gain_note",
        text: "You marked a clear breach through the shattered barricade."
      },
      failEffect: { type: "advance_escalation", amount: 1 }
    });

    const laneCounts = [...threats.values()].reduce<Record<string, number>>((counts, threat) => {
      counts[threat.threatLane ?? "missing"] = (counts[threat.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {});
    expect(threats.size).toBe(109);
    expect(laneCounts).toEqual({ red: 26, blue: 35, yellow: 48 });

    expect(requireHazard("glass-tick-cloud").failEffect).toEqual({ type: "lose_salvage", amount: 1 });
    expect(requireHazard("locked-vault").failEffect).toEqual({ type: "lose_salvage", amount: 1 });
    expect(requireHazard("breach-halberd").failEffect).toMatchObject({ type: "forcedDisplacement", direction: "clockwise" });
    expect(requireHazard("mudglass-sinkhole").failEffect).toMatchObject({ type: "forcedDisplacement", direction: "counterclockwise" });
    expect(requireHazard("suture-storm").failEffect).toMatchObject({ type: "sequence" });
    expect(requireHazard("glass-chime-swarm").failEffect).toEqual({
      type: "next_non_battle_test_modifier", amount: -1, sourceCardId: "glass-chime-swarm"
    });
    expect(requireHazard("spindle-static-squall").failEffect).toEqual({
      type: "next_normal_movement_roll_modifier", amount: -1, minimumResult: 1, sourceCardId: "spindle-static-squall"
    });
  });
});

describe("Phase B2B Shattered Barricade authority and idempotency", () => {
  it("applies failure escalation once through the server lifecycle and leaves unrelated systems unchanged", () => {
    const state = createResolutionState();
    const actor = state.players[0]!;
    actor.character.wounds = 2;
    actor.character.scars = ["scar-wound-1"];
    actor.character.salvage = 4;
    actor.character.completedContracts = ["sealed-contract"];
    actor.character.activeContract = { contractId: "compact-equipment-requisition", progress: 0, salvageSpent: 0 };
    state.scenarioProgress = { untouched: 3 };
    const before = {
      player: structuredClone(actor.character),
      scenarioProgress: structuredClone(state.scenarioProgress)
    };
    const server = new GameRoomServer(state);

    continueUntilEscalationResolves(server);

    const resolved = server.getState();
    const resolvedActor = resolved.players[0]!;
    expect(resolved.escalationLevel).toBe(1);
    expect(resolved.resolvedEscalationSourceEventIds).toEqual([
      `${actor.seatId}:threat:shattered-barricade:approved-check:global-escalation`
    ]);
    expect(escalationEvents(resolved)).toHaveLength(1);
    expect(escalationEvents(resolved)[0]).toMatchObject({
      amount: 1,
      newLevel: 1,
      modifier: 0,
      sourceCardId: "shattered-barricade",
      sourceEventId: `${actor.seatId}:threat:shattered-barricade:approved-check:global-escalation`
    });
    expect(resolvedActor.character).toEqual(before.player);
    expect(resolved.scenarioProgress).toEqual(before.scenarioProgress);
    expect(resolved.lastOutcomeSummary?.summary).toContain("Global Escalation +1. Global Escalation is now 1.");

    const tv = createTvProjection(resolved) as unknown as PublicPatchPayload;
    const phones = resolved.players.map(
      (player) => createPhoneProjection(resolved, player.seatId) as unknown as PhonePatchPayload
    );
    expect(tv.escalationLevel).toBe(1);
    expect(phones.every((phone) => phone.escalationLevel === tv.escalationLevel)).toBe(true);
    expect(JSON.stringify(tv)).toContain("Global Escalation is now 1");
    expect(JSON.stringify(phones[0])).toContain("Global Escalation is now 1");
    expect(JSON.stringify(tv)).not.toContain("global-escalation");
    expect(JSON.stringify(phones)).not.toContain("global-escalation");
  });

  it("keeps success as the existing note and does not advance escalation", () => {
    const state = createResolutionState({ success: true });
    const actor = state.players[0]!;
    const server = new GameRoomServer(state);
    const client = createClient(actor.seatId);

    for (let index = 0; index < 4 && server.getState().activeResolution; index += 1) {
      server.handleIntent(client, { type: "CONTINUE_RESOLUTION", seatId: actor.seatId });
    }

    expect(server.getState().escalationLevel).toBe(0);
    expect(server.getState().resolvedEscalationSourceEventIds ?? []).toEqual([]);
    expect(escalationEvents(server.getState())).toHaveLength(0);
    expect(server.getState().players[0]?.private.notes).toContain(
      "You marked a clear breach through the shattered barricade."
    );
  });

  it("rejects wrong-seat, stale-source, forged-result, duplicate-source, and replay attempts", () => {
    const state = createResolutionState();
    const actorSeatId = state.players[0]!.seatId;
    const resolutionAction = {
      type: "RESOLUTION_APPLIED" as const,
      seatId: actorSeatId,
      effect: card.failEffect,
      sourceCardId: card.id,
      success: false,
      createdAt: "b2b-resolution"
    };

    expect(reduceGameState(state, { ...resolutionAction, seatId: "seat-wrong" }).ok).toBe(false);
    expect(reduceGameState(state, { ...resolutionAction, sourceCardId: "stale-card" }).ok).toBe(false);

    const forgedEffectState = structuredClone(state);
    forgedEffectState.pendingEffect = { type: "advance_escalation", amount: 2 };
    expect(reduceGameState(forgedEffectState, resolutionAction).ok).toBe(false);

    const applied = reduceGameState(state, resolutionAction);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.escalationLevel).toBe(0);
    expect(applied.state.pendingEffect).toBeNull();

    const server = new GameRoomServer(createResolutionState());
    continueUntilEscalationResolves(server);
    const resolved = server.getState();
    const event = escalationEvents(resolved)[0]!;
    expect(reduceGameState(resolved, event).ok).toBe(false);

    const forgedResult = reduceGameState(createResolutionState(), {
      ...event,
      amount: 2,
      newLevel: 2,
      modifier: 1,
      sourceEventId: `${actorSeatId}:threat:shattered-barricade:approved-check:global-escalation`
    });
    expect(forgedResult.ok).toBe(false);

    const beforeReplay = resolved.escalationLevel;
    const replay = reduceGameState(resolved, event);
    expect(replay.ok).toBe(false);
    expect(server.getState().escalationLevel).toBe(beforeReplay);
    expect(escalationEvents(server.getState())).toHaveLength(1);
  });

  it("persists the shared value and source ledger across reconnect reconstruction", () => {
    const server = new GameRoomServer(createResolutionState({ escalationLevel: 1 }));
    continueUntilEscalationResolves(server);
    const restored = gameStateSchema.parse(JSON.parse(JSON.stringify(server.getState())));
    const restoredServer = new GameRoomServer(restored);

    expect(restoredServer.getState().escalationLevel).toBe(2);
    expect(restoredServer.getState().resolvedEscalationSourceEventIds).toEqual(
      server.getState().resolvedEscalationSourceEventIds
    );
    expect(createTvProjection(restoredServer.getState()).escalationLevel).toBe(2);
    expect(
      restoredServer.getState().players.every(
        (player) => createPhoneProjection(restoredServer.getState(), player.seatId).escalationLevel === 2
      )
    ).toBe(true);
  });
});

describe("Phase B2B Shattered Barricade thresholds and cap", () => {
  it("reaches the ordinary modifier threshold once", () => {
    const server = new GameRoomServer(createResolutionState({ escalationLevel: 1 }));
    continueUntilEscalationResolves(server);

    expect(server.getState().escalationLevel).toBe(2);
    expect(escalationEvents(server.getState())).toHaveLength(1);
    expect(escalationEvents(server.getState())[0]).toMatchObject({ amount: 1, newLevel: 2, modifier: 1 });
  });

  it("reaches multiplayer collapse exactly once without overflowing", () => {
    const threshold = getEscalationCollapseLevel("multiplayer");
    const server = new GameRoomServer(
      createResolutionState({ escalationLevel: threshold - 1, sessionMode: "multiplayer" })
    );
    continueUntilEscalationResolves(server);

    const resolved = server.getState();
    expect(resolved.escalationLevel).toBe(threshold);
    expect(resolved.status).toBe("ended");
    expect(escalationEvents(resolved)).toHaveLength(1);
    expect(resolved.eventLog.filter((entry) => (entry as { type?: string }).type === "SECTOR_COLLAPSED")).toHaveLength(1);
    expect(resolved.resolvedEscalationSourceEventIds).toHaveLength(1);
  });

  it("reports an actual applied delta of zero for an already capped active snapshot", () => {
    const threshold = getEscalationCollapseLevel("multiplayer");
    const server = new GameRoomServer(
      createResolutionState({ escalationLevel: threshold, sessionMode: "multiplayer" })
    );
    continueUntilEscalationResolves(server);

    expect(server.getState().escalationLevel).toBe(threshold);
    expect(escalationEvents(server.getState())).toHaveLength(1);
    expect(escalationEvents(server.getState())[0]).toMatchObject({ amount: 0, newLevel: threshold });
    expect(server.getState().status).toBe("ended");
  });
});
