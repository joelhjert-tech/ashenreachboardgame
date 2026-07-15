import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PhonePatchPayload, PublicPatchPayload } from "../../../client/shared/types.js";
import type { ConnectedClient } from "../../../server/roomServer.js";
import { GameRoomServer, createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadThreatCards } from "../../content/threats.js";
import type { EscalationAdvancedAction } from "../actions.js";
import { getEscalationCollapseLevel } from "../escalation.js";
import { reduceGameState } from "../reducer.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";

const threats = loadThreatCards();

function requireHazard(id: string) {
  const threat = threats.get(id);
  if (!threat || threat.cardType !== "hazard") throw new Error(`Missing hazard ${id}`);
  return threat;
}

const gateblind = requireHazard("gateblind-pulse");
const shattered = requireHazard("shattered-barricade");

function createClient(seatId: string): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: { send() {}, close() {} } as unknown as ConnectedClient["socket"]
  };
}

function createResolutionState(options: {
  cardId?: "gateblind-pulse" | "shattered-barricade";
  escalationLevel?: number;
  sessionMode?: "single-player" | "multiplayer";
  success?: boolean;
  characterId?: string;
} = {}): GameState {
  const card = options.cardId === "shattered-barricade" ? shattered : gateblind;
  const sessionMode = options.sessionMode ?? "multiplayer";
  const success = options.success ?? false;
  const state = createInitialSessionState(`h7b-${card.id}`, sessionMode);
  const player = state.players[0]!;

  state.status = "active";
  state.phase = "resolution";
  state.activeSeatIndex = 0;
  state.turnOrder = [player.seatId, ...state.turnOrder.filter((seatId) => seatId !== player.seatId)];
  state.escalationLevel = options.escalationLevel ?? 0;
  state.currentEncounter = card;
  state.pendingEffect = success ? card.successEffect! : card.failEffect;
  if (options.characterId) player.character.id = options.characterId;
  state.seats = state.seats.map((seat) => ({
    ...seat,
    characterSelected: true,
    connected: seat.seatId === player.seatId,
    ready: true
  }));
  state.activeResolution = {
    id: `${card.id}:authoritative-check:1`,
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
    summary: `${card.title} check ${success ? "passed" : "failed"}.`
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
    if (server.getState().activeResolution || (server.getState().phase === "resolution" && server.getState().pendingEffect)) {
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

function collapseEvents(state: GameState): unknown[] {
  return state.eventLog.filter((entry) => (entry as { type?: string }).type === "SECTOR_COLLAPSED");
}

describe("Heat Retirement H7B Gateblind Pulse content", () => {
  it("preserves identity and success while replacing only the obsolete Heat failure", () => {
    expect(gateblind).toMatchObject({
      id: "gateblind-pulse",
      title: "Gateblind Pulse",
      cardType: "hazard",
      threatLane: "blue",
      stat: "signal",
      difficulty: 10,
      severity: 4,
      region: "inner",
      rarity: "uncommon",
      text: "On failure, if Global Escalation is not already one step from collapse, advance Global Escalation by 1.",
      successEffect: {
        type: "advance_scenario",
        progressKey: "gateblindPulsesRead",
        amount: 1,
        summary: "Gateblind pulse translated into final-route leverage."
      },
      failEffect: {
        type: "gain_global_escalation_guarded",
        sourceCardId: "gateblind-pulse",
        amount: 1,
        guard: "oneBeforeCollapse"
      }
    });
    expect(JSON.stringify(gateblind)).not.toMatch(/\bHeat\b|gain_heat|lose_heat|take_wound|gain_scar|lose_salvage/i);
    expect(threats.size).toBe(109);
    const laneCounts = [...threats.values()].reduce<Record<string, number>>((counts, threat) => {
      counts[threat.threatLane ?? "missing"] = (counts[threat.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {});
    expect(laneCounts).toEqual({ red: 26, blue: 35, yellow: 48 });
  });

  it("keeps success-side scenario progress and creates no escalation", () => {
    const server = new GameRoomServer(createResolutionState({ success: true }));
    const seatId = server.getState().players[0]!.seatId;
    const client = createClient(seatId);
    for (let index = 0; index < 4 && server.getState().activeResolution; index += 1) {
      server.handleIntent(client, { type: "CONTINUE_RESOLUTION", seatId });
    }
    expect(server.getState().scenarioProgress.gateblindPulsesRead).toBe(1);
    expect(server.getState().escalationLevel).toBe(0);
    expect(escalationEvents(server.getState())).toHaveLength(0);
  });
});

describe("Heat Retirement H7B Gateblind Pulse guard matrix", () => {
  it.each([
    ["multiplayer", 0, 1, 1, undefined],
    ["multiplayer", 4, 5, 1, undefined],
    ["multiplayer", 5, 5, 0, "oneBeforeCollapseGuard"],
    ["single-player", 0, 1, 1, undefined],
    ["single-player", 6, 7, 1, undefined],
    ["single-player", 7, 7, 0, "oneBeforeCollapseGuard"]
  ] as const)("resolves %s %i to %i with requested %i", (sessionMode, before, after, requested, guardedReason) => {
    const server = new GameRoomServer(createResolutionState({ sessionMode, escalationLevel: before }));
    continueUntilEscalationResolves(server);

    const resolved = server.getState();
    const event = escalationEvents(resolved)[0]!;
    expect(resolved.escalationLevel).toBe(after);
    expect(event).toMatchObject({
      previousLevel: before,
      requestedAmount: requested,
      amount: requested,
      newLevel: after,
      sourceCardId: "gateblind-pulse",
      sourceEventId: `${resolved.players[0]!.seatId}:threat:gateblind-pulse:approved-check:global-escalation`
    });
    expect(event.guardedReason).toBe(guardedReason);
    expect(resolved.resolvedEscalationSourceEventIds).toEqual([event.sourceEventId]);
    expect(collapseEvents(resolved)).toHaveLength(0);
    expect(resolved.status).toBe("active");
    expect(after).toBeLessThan(getEscalationCollapseLevel(sessionMode));
  });

  it("crosses an ordinary difficulty threshold once without classifying it as collapse", () => {
    const server = new GameRoomServer(createResolutionState({ escalationLevel: 1 }));
    continueUntilEscalationResolves(server);
    const resolved = server.getState();
    const event = escalationEvents(resolved)[0]!;
    expect(event).toMatchObject({ previousLevel: 1, requestedAmount: 1, amount: 1, newLevel: 2, modifier: 1 });
    expect(collapseEvents(resolved)).toHaveLength(0);
    expect(reduceGameState(resolved, event).ok).toBe(false);
    expect(resolved.escalationLevel).toBe(2);
  });

  it("records and publicly explains the guarded zero without leaking internal IDs", () => {
    const server = new GameRoomServer(createResolutionState({ escalationLevel: 5 }));
    continueUntilEscalationResolves(server);
    const resolved = server.getState();
    const tv = createTvProjection(resolved) as unknown as PublicPatchPayload;
    const phones = resolved.players.map((player) => createPhoneProjection(resolved, player.seatId) as unknown as PhonePatchPayload);
    const publicJson = JSON.stringify({ tv, phones });

    expect(resolved.lastOutcomeSummary?.summary).toContain("cannot advance Global Escalation closer to collapse");
    expect(resolved.lastOutcomeSummary?.summary).toContain("Global Escalation remains 5");
    expect(tv.escalationLevel).toBe(5);
    expect(phones.every((phone) => phone.escalationLevel === 5)).toBe(true);
    expect(publicJson).toContain("cannot advance Global Escalation closer to collapse");
    expect(publicJson).not.toContain("oneBeforeCollapseGuard");
    expect(publicJson).not.toContain(":global-escalation");
  });
});

describe("Heat Retirement H7B authority, reactions, and replay", () => {
  it("rejects wrong-seat, stale-source, forged delta, forged guard, and repeated source events", () => {
    const state = createResolutionState({ escalationLevel: 4 });
    const seatId = state.players[0]!.seatId;
    const resolutionAction = {
      type: "RESOLUTION_APPLIED" as const,
      seatId,
      effect: gateblind.failEffect,
      sourceCardId: gateblind.id,
      success: false,
      createdAt: "h7b-resolution"
    };
    expect(reduceGameState(state, { ...resolutionAction, seatId: "seat-wrong" }).ok).toBe(false);
    expect(reduceGameState(state, { ...resolutionAction, sourceCardId: "stale-card" }).ok).toBe(false);

    const server = new GameRoomServer(createResolutionState({ escalationLevel: 4 }));
    continueUntilEscalationResolves(server);
    const resolved = server.getState();
    const event = escalationEvents(resolved)[0]!;
    expect(reduceGameState(resolved, event).ok).toBe(false);

    const fresh = createResolutionState({ escalationLevel: 4 });
    expect(reduceGameState(fresh, { ...event, requestedAmount: 2, amount: 2, newLevel: 6 }).ok).toBe(false);
    expect(reduceGameState(fresh, { ...event, requestedAmount: 0, amount: 0, newLevel: 4, guardedReason: "oneBeforeCollapseGuard" }).ok).toBe(false);
  });

  it("lets Bone Bell react once below the guard and does not trigger it for guarded zero", () => {
    const reactiveServer = new GameRoomServer(createResolutionState({ characterId: "cinder-monk", escalationLevel: 0 }));
    continueUntilEscalationResolves(reactiveServer);
    const reactive = reactiveServer.getState();
    expect(reactive.escalationLevel).toBe(0);
    expect(escalationEvents(reactive)).toHaveLength(2);
    expect(escalationEvents(reactive)[0]).toMatchObject({ sourceCardId: "gateblind-pulse", amount: 1, newLevel: 1 });
    expect(escalationEvents(reactive)[1]).toMatchObject({ amount: -1, newLevel: 0, reason: "Bone Bell" });
    expect(reactive.eventLog.filter((entry) => (entry as { type?: string; abilityId?: string }).abilityId === "bone-bell")).toHaveLength(1);

    const guardedServer = new GameRoomServer(createResolutionState({ characterId: "cinder-monk", escalationLevel: 5 }));
    continueUntilEscalationResolves(guardedServer);
    const guarded = guardedServer.getState();
    expect(guarded.escalationLevel).toBe(5);
    expect(escalationEvents(guarded)).toHaveLength(1);
    expect(guarded.eventLog.filter((entry) => (entry as { type?: string; abilityId?: string }).abilityId === "bone-bell")).toHaveLength(0);
  });

  it("persists positive and guarded completion across reconnect without replay", () => {
    for (const escalationLevel of [4, 5]) {
      const server = new GameRoomServer(createResolutionState({ escalationLevel }));
      continueUntilEscalationResolves(server);
      const restored = gameStateSchema.parse(JSON.parse(JSON.stringify(server.getState())));
      const restoredServer = new GameRoomServer(restored);
      const before = restoredServer.getState().escalationLevel;
      const event = escalationEvents(restoredServer.getState())[0]!;
      expect(restoredServer.getState().resolvedEscalationSourceEventIds).toEqual([event.sourceEventId]);
      expect(reduceGameState(restoredServer.getState(), event).ok).toBe(false);
      expect(restoredServer.getState().escalationLevel).toBe(before);
    }
  });

  it("leaves Shattered Barricade unconditional and collapse-capable", () => {
    const threshold = getEscalationCollapseLevel("multiplayer");
    const server = new GameRoomServer(createResolutionState({
      cardId: "shattered-barricade",
      escalationLevel: threshold - 1
    }));
    continueUntilEscalationResolves(server);
    expect(server.getState().escalationLevel).toBe(threshold);
    expect(server.getState().status).toBe("ended");
    expect(collapseEvents(server.getState())).toHaveLength(1);
  });

  it("hash-pins both remaining blocked definitions", () => {
    const expected = new Map([
      ["marrow-tax-auditors", "70862bdfbc75105d239c5926822bbe75fd5f073827c67c8878ac5918f01fe1ee"],
      ["memory-tax-gate", "8b7d60e7fdf354131df2a0f3f5f1c701e2ab657a369b1c53cbe095b8d356ae80"]
    ]);
    for (const [id, hash] of expected) {
      const bytes = readFileSync(join(process.cwd(), "content", "cards", "threats", `${id}.json`));
      expect(createHash("sha256").update(bytes).digest("hex"), id).toBe(hash);
    }
  });
});
