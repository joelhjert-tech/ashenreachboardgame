import WebSocket from "ws";
import { describe, expect, it, vi } from "vitest";
import { createScarChoice } from "../../game/rules/scarSystem.js";
import { loadThreatCards } from "../../game/content/threats.js";
import type { GameAction } from "../../game/engine/actions.js";
import { sessionSnapshotSchema } from "../../game/schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";

function client(seatId: string): ConnectedClient {
  return { view: "phone", seatId, socket: { send: vi.fn(), readyState: WebSocket.OPEN } as unknown as WebSocket };
}

describe("Scar choice projections and services", () => {
  it("projects public candidates but owner-only controls and survives the v2 schema", () => {
    const base = createInitialSessionState("scar-projection", "multiplayer", undefined, "co-op", "standard", 2);
    const state = createScarChoice({
      ...base,
      status: "active",
      phase: "resolution",
      seats: base.seats.map((seat) => ({ ...seat, connected: true, characterSelected: true, displayName: seat.seatId }))
    }, "seat-1", { type: "gain_scar_choice", amount: 1, source: "mind", sourceCardId: "projection-source" }, "projection-event", "now").state;
    expect(sessionSnapshotSchema.safeParse({ saveVersion: 2, sessionId: state.sessionId, sequence: state.sequence, state }).success).toBe(true);
    const tv = createTvProjection(state) as { pendingScarChoiceStatus?: { cards: Array<{ id: string }> } };
    const owner = createPhoneProjection(state, "seat-1") as { pendingScarChoice?: { selectionId: string; cards: Array<{ burdenText: string; adaptationText: string }> } };
    const other = createPhoneProjection(state, "seat-2") as { pendingScarChoice?: unknown; pendingScarChoiceStatus?: unknown };
    expect(tv.pendingScarChoiceStatus?.cards).toHaveLength(2);
    expect(owner.pendingScarChoice?.cards.every((card) => card.burdenText && card.adaptationText)).toBe(true);
    expect(other.pendingScarChoice).toBeNull();
    expect(other.pendingScarChoiceStatus).toBeTruthy();
  });

  it("accepts only an offered owner choice through the server intent", () => {
    const base = createInitialSessionState("scar-owner", "multiplayer", undefined, "co-op", "standard", 2);
    const state = createScarChoice({ ...base, status: "active", phase: "resolution", seats: base.seats.map((seat) => ({ ...seat, connected: true, characterSelected: true })) }, "seat-1", { type: "gain_scar_choice", amount: 1, source: "flesh", sourceCardId: "owner-source" }, "owner-event", "now").state;
    const server = new GameRoomServer(state);
    const pending = server.getState().pendingScarChoice!;
    server.handleIntent(client("seat-2"), { type: "CHOOSE_SCAR", seatId: "seat-2", selectionId: pending.selectionId, scarId: pending.candidateIds[0]! });
    expect(server.getState().pendingScarChoice?.selectionId).toBe(pending.selectionId);
    server.handleIntent(client("seat-1"), { type: "CHOOSE_SCAR", seatId: "seat-1", selectionId: pending.selectionId, scarId: pending.candidateIds[0]! });
    expect(server.getState().players[0]!.character.scars).toContain(pending.candidateIds[0]);
    expect(server.getState().pendingScarChoice).toBeNull();
  });

  it("opens Sable Machine Choir purification and charges exactly four Salvage once per arrival", () => {
    const base = createInitialSessionState("scar-purge", "single-player");
    const state = {
      ...base,
      status: "active" as const,
      phase: "action" as const,
      seats: base.seats.map((seat) => ({ ...seat, connected: true, characterSelected: true })),
      players: base.players.map((player) => ({
        ...player,
        sectorId: "middle_scar_surgery",
        character: { ...player.character, currentSpaceId: "middle_scar_surgery", scars: ["scar-wound-1"], salvage: 4 }
      }))
    };
    const server = new GameRoomServer(state);
    server.handleIntent(client("seat-1"), { type: "SHOP_SERVICE_REQUESTED", seatId: "seat-1", serviceId: "purge-scar" });
    const choice = server.getState().pendingScarRemovalChoice!;
    expect(choice.salvageCost).toBe(4);
    server.handleIntent(client("seat-1"), { type: "PURGE_SCAR_REQUESTED", seatId: "seat-1", choiceId: choice.choiceId, scarId: "scar-wound-1" });
    expect(server.getState().players[0]!.character.scars).toEqual([]);
    expect(server.getState().players[0]!.character.salvage).toBe(0);
    expect(server.getState().resolvedScarRemovalVisitIds).toContain(choice.visitId);
  });

  it("applies an automatic typed Burden once per declared scope through the live room resolver", () => {
    const base = createInitialSessionState("scar-live-burden", "single-player");
    const hazard = [...loadThreatCards().values()].find((card) => card.cardType === "hazard")!;
    const state = {
      ...base,
      status: "active" as const,
      phase: "action" as const,
      currentEncounter: hazard,
      seats: base.seats.map((seat) => ({ ...seat, connected: true, characterSelected: true })),
      players: base.players.map((player) => ({ ...player, character: { ...player.character, scars: ["scar-wound-11"], wounds: 0 } }))
    };
    const server = new GameRoomServer(state);
    const apply = (server as unknown as { applyAction: (action: GameAction) => void }).applyAction.bind(server);
    apply({
      type: "CHECK_ROLLED",
      seatId: "seat-1",
      stat: hazard.stat,
      difficulty: hazard.difficulty,
      roll: { faces: [1, 1], total: 2 },
      statBonus: 0,
      total: 2,
      success: false,
      effect: { type: "sequence", effects: [] },
      cardId: hazard.id,
      createdAt: "scar-burden:first"
    });
    expect(server.getState().players[0]!.character.wounds).toBe(1);
    expect(server.getState().scarUsage?.some((entry) => entry.ruleKey === "first-failed-hazard-wound")).toBe(true);
  });

  it("projects optional Adaptations only to their owner and consumes a typed once-per-round activation once", () => {
    const base = createInitialSessionState("scar-owner-control", "multiplayer", undefined, "co-op", "standard", 2);
    const elite = [...loadThreatCards().values()].find((card) => card.cardType === "enemy" && card.severity >= 5)!;
    const encounter = { ...elite, stat: "grit" as const };
    const state = {
      ...base,
      status: "active" as const,
      phase: "action" as const,
      currentEncounter: encounter,
      seats: base.seats.map((seat) => ({ ...seat, connected: true, characterSelected: true })),
      players: base.players.map((player, index) => index === 0 ? ({ ...player, character: { ...player.character, scars: ["scar-wound-9"] } }) : player),
      activeResolution: {
        id: "scar-elite-window",
        playerId: "seat-1",
        source: "threat" as const,
        stage: "battle_setup" as const,
        card: { id: encounter.id, title: encounter.title, type: "enemy" },
        battle: { stat: "grit" as const, difficulty: encounter.difficulty, modifiers: [] }
      }
    };
    const server = new GameRoomServer(state);
    const owner = createPhoneProjection(server.getState(), "seat-1") as { scarAdaptationControls: Array<{ activationId: string; scarId: string; ruleKey: string; enabled: boolean }> };
    const other = createPhoneProjection(server.getState(), "seat-2") as { scarAdaptationControls: unknown[] };
    expect(owner.scarAdaptationControls).toHaveLength(1);
    expect(owner.scarAdaptationControls[0]).toMatchObject({ scarId: "scar-wound-9", ruleKey: "elite-grit-bonus", enabled: true });
    expect(other.scarAdaptationControls).toEqual([]);

    const control = owner.scarAdaptationControls[0]!;
    server.handleIntent(client("seat-1"), { type: "USE_SCAR_ADAPTATION", seatId: "seat-1", activationId: control.activationId, scarId: control.scarId, ruleKey: control.ruleKey });
    expect(server.getState().scarUsage?.filter((entry) => entry.ruleKey === "elite-grit-bonus")).toHaveLength(1);
    const duplicate = client("seat-1");
    server.handleIntent(duplicate, { type: "USE_SCAR_ADAPTATION", seatId: "seat-1", activationId: control.activationId, scarId: control.scarId, ruleKey: control.ruleKey });
    expect(server.getState().scarUsage?.filter((entry) => entry.ruleKey === "elite-grit-bonus")).toHaveLength(1);
    expect(vi.mocked(duplicate.socket.send)).toHaveBeenCalled();
  });

  it("rerolls only the owner-selected die and preserves the activation across a v2 reconnect", () => {
    const base = createInitialSessionState("scar-reroll-control", "single-player");
    const hazard = [...loadThreatCards().values()].find((card) => card.cardType === "hazard")!;
    const encounter = { ...hazard, stat: "guile" as const };
    const state = {
      ...base,
      status: "active" as const,
      phase: "resolution" as const,
      currentEncounter: encounter,
      seats: base.seats.map((seat) => ({ ...seat, connected: true, characterSelected: true })),
      players: base.players.map((player) => ({ ...player, character: { ...player.character, scars: ["scar-hollow-reflection"] } })),
      activeResolution: {
        id: "scar-reroll-window",
        playerId: "seat-1",
        source: "threat" as const,
        stage: "roll_result" as const,
        card: { id: encounter.id, title: encounter.title, type: "hazard" },
        battle: { stat: "guile" as const, difficulty: encounter.difficulty, modifiers: [] },
        roll: { dice: [1, 2], baseTotal: 3, modifierTotal: 3, finalTotal: 6, target: encounter.difficulty, success: false }
      }
    };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5]));
    const control = (createPhoneProjection(server.getState(), "seat-1") as { scarAdaptationControls: Array<{ activationId: string; scarId: string; ruleKey: string }> }).scarAdaptationControls[0]!;
    server.handleIntent(client("seat-1"), { type: "USE_SCAR_ADAPTATION", seatId: "seat-1", activationId: control.activationId, scarId: control.scarId, ruleKey: control.ruleKey, rollIndex: 0 });
    expect(server.getState().activeResolution?.roll?.dice).toEqual([6, 2]);
    const snapshot = sessionSnapshotSchema.parse({ saveVersion: 2, sessionId: server.getState().sessionId, sequence: server.getState().sequence, state: server.getState() });
    const restored = new GameRoomServer(snapshot.state);
    const restoredControl = (createPhoneProjection(restored.getState(), "seat-1") as { scarAdaptationControls: Array<{ enabled: boolean; remainingUses: number }> }).scarAdaptationControls[0]!;
    expect(restoredControl).toMatchObject({ enabled: false, remainingUses: 0 });
  });

  it("projects a blocked Scar reroll as disabled and rejects activation without changing the dice", () => {
    const base = createInitialSessionState("scar-reroll-blocked", "single-player");
    const enemy = loadThreatCards().get("pale-marshal");
    if (!enemy || enemy.cardType !== "enemy") throw new Error("Missing Pale Marshal fixture");
    const encounter = { ...enemy, stat: "guile" as const };
    const state = {
      ...base,
      status: "active" as const,
      phase: "resolution" as const,
      currentEncounter: encounter,
      seats: base.seats.map((seat) => ({ ...seat, connected: true, characterSelected: true })),
      players: base.players.map((player) => ({ ...player, character: { ...player.character, scars: ["scar-hollow-reflection"] } })),
      activeResolution: {
        id: "scar-reroll-blocked-window",
        playerId: "seat-1",
        source: "threat" as const,
        stage: "roll_result" as const,
        card: { id: encounter.id, title: encounter.title, type: "enemy" as const },
        battle: { stat: "guile" as const, difficulty: encounter.difficulty, modifiers: [] },
        roll: { dice: [1, 2], baseTotal: 3, modifierTotal: 3, finalTotal: 6, target: encounter.difficulty, success: false }
      }
    };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5]));
    const control = (createPhoneProjection(server.getState(), "seat-1") as {
      scarAdaptationControls: Array<{
        activationId: string;
        scarId: string;
        ruleKey: string;
        enabled: boolean;
        disabledReason: string | null;
      }>;
    }).scarAdaptationControls[0]!;

    expect(control).toMatchObject({
      ruleKey: "guile-reroll",
      enabled: false,
      disabledReason: "The Pale Marshal blocks rerolls."
    });
    const owner = client("seat-1");
    server.handleIntent(owner, {
      type: "USE_SCAR_ADAPTATION",
      seatId: "seat-1",
      activationId: control.activationId,
      scarId: control.scarId,
      ruleKey: control.ruleKey,
      rollIndex: 0
    });
    expect(server.getState().activeResolution?.roll?.dice).toEqual([1, 2]);
    expect(vi.mocked(owner.socket.send)).toHaveBeenCalled();
  });
});
