import WebSocket from "ws";
import { describe, expect, it, vi } from "vitest";
import { loadCharacters } from "../../game/content/characters.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { ThreatCard } from "../../game/schema/card.schema.js";
import { sessionSnapshotSchema } from "../../game/schema/session.schema.js";
import { createPhoneProjection, GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

const hazard: ThreatCard = {
  id: "cw-signal-test",
  type: "threat",
  cardType: "hazard",
  title: "Brood-Vat Signal",
  text: "Read the failing relay before it collapses.",
  flavor: "Metal clicks answer the static.",
  severity: 1,
  stat: "signal",
  difficulty: 9,
  successEffect: { type: "legacy_compatibility_noop" },
  failEffect: { type: "legacy_compatibility_noop" }
};

function client() {
  return {
    view: "phone" as const,
    seatId: "seat-1",
    socket: { send: vi.fn(), readyState: WebSocket.OPEN } as unknown as WebSocket
  } satisfies ConnectedClient;
}

function createServer() {
  const initial = createInitialSessionState("cw-test", "single-player", undefined, "co-op", "standard", 1);
  const cw = loadCharacters().get("cinder-wattle")!;
  const state = {
    ...initial,
    status: "active" as const,
    phase: "action" as const,
    seats: initial.seats.map((seat) => ({ ...seat, connected: true, characterSelected: true, displayName: "Joel", characterId: cw.id })),
    players: initial.players.map((player) => ({
      ...player,
      character: { ...cw, salvage: 4, heldGear: [], equippedGear: { weapon: null, armor: null, utility: null } }
    })),
    currentEncounter: hazard,
    activeResolution: {
      id: "cw-resolution",
      playerId: "seat-1",
      source: "threat" as const,
      stage: "battle_setup" as const,
      card: { id: hazard.id, title: hazard.title, type: "hazard" },
      battle: { stat: "signal" as const, difficulty: 9, modifiers: [] }
    }
  };
  return new GameRoomServer(state, [], createSequenceRandomSource([0, 0]));
}

describe("Cinder Wattle Scrap-Crowned Instinct", () => {
  it("prepares +1 before a test and applies it exactly once", () => {
    const server = createServer();
    server.handleIntent(client(), { type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });

    const prepared = createPhoneProjection(server.getState(), "seat-1") as { characterAbilityAction: { prepared: boolean; available: boolean } };
    expect(prepared.characterAbilityAction).toMatchObject({ prepared: true, available: false });

    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });
    const event = [...server.getState().eventLog].reverse().find((entry) => (entry as { type?: string }).type === "CHECK_ROLLED") as {
      statBonus: number;
      modifierSources: Array<{ label: string; value: number }>;
    };
    expect(event.modifierSources.filter((source) => source.label === "Scrap-Crowned Instinct")).toEqual([{ label: "Scrap-Crowned Instinct", value: 1 }]);
    expect(event.statBonus).toBe(4);
  });

  it("rejects use after dice are visible and rejects movement-only state", () => {
    const rolled = createServer();
    rolled.getState().activeResolution = {
      ...rolled.getState().activeResolution!,
      stage: "roll_result",
      roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 3, finalTotal: 5, target: 9, success: false }
    };
    const rolledClient = client();
    rolled.handleIntent(rolledClient, { type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });
    expect(rolled.getState().eventLog.some((entry) => (entry as { abilityId?: string }).abilityId === "scrap-crowned-instinct")).toBe(false);
    expect(vi.mocked(rolledClient.socket.send)).toHaveBeenCalled();

    const movement = createServer();
    movement.getState().phase = "navigation";
    movement.getState().currentEncounter = null;
    movement.getState().activeResolution = null;
    const movementClient = client();
    movement.handleIntent(movementClient, { type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });
    expect(movement.getState().eventLog.some((entry) => (entry as { abilityId?: string }).abilityId === "scrap-crowned-instinct")).toBe(false);
  });

  it("cannot be used twice in a round and resets only at ROUND_COMPLETED", () => {
    const server = createServer();
    server.handleIntent(client(), { type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });
    const duplicateClient = client();
    server.handleIntent(duplicateClient, { type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });
    expect(server.getState().eventLog.filter((entry) => (entry as { abilityId?: string }).abilityId === "scrap-crowned-instinct")).toHaveLength(1);

    server.getState().eventLog.push({ type: "ROUND_COMPLETED", seatId: "seat-1", createdAt: new Date().toISOString() });
    server.handleIntent(client(), { type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });
    expect(server.getState().eventLog.filter((entry) => (entry as { abilityId?: string }).abilityId === "scrap-crowned-instinct")).toHaveLength(2);
  });

  it("preserves the prepared modifier through a version 2 save and reconnect", () => {
    const server = createServer();
    server.handleIntent(client(), { type: "USE_CHARACTER_ABILITY", seatId: "seat-1", abilityId: "scrap-crowned-instinct" });
    const snapshot = sessionSnapshotSchema.parse({
      saveVersion: 2,
      sessionId: server.getState().sessionId,
      sequence: server.getState().sequence,
      state: server.getState()
    });
    const restored = new GameRoomServer(snapshot.state, [], createSequenceRandomSource([0, 0]));
    const projection = createPhoneProjection(restored.getState(), "seat-1") as { characterAbilityAction: { prepared: boolean } };

    expect(projection.characterAbilityAction.prepared).toBe(true);
    restored.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });
    const modifiers = restored.getState().activeResolution?.battle?.modifiers ?? [];
    expect(modifiers.filter((source) => source.label === "Scrap-Crowned Instinct")).toHaveLength(1);
  });
});
