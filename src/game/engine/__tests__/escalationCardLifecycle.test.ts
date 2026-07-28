import { describe, expect, it } from "vitest";
import { loadEscalationCards } from "../../content/escalations.js";
import { BOARD_SPACES } from "../../data/boardSpaces.js";
import { resolveBoardTextEffect } from "../../data/boardTextEffects.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import type { EscalationCard } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import type { ClientIntent, GameAction, SpaceTextResolvedAction } from "../actions.js";
import { createSequenceRandomSource } from "../dice.js";
import {
  GameRoomServer,
  createPhoneProjection,
  createTvProjection,
  type ConnectedClient
} from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const PRIMARY_ESCALATION_BANDS = [
  { sectorId: "emberwatch-step", steps: [1] },
  { sectorId: "outer_broken_causeway", steps: [2] },
  { sectorId: "middle_scar_surgery", steps: [3, 4, 5] }
] as const;

const ESCALATION_CASES = [...loadEscalationCards().values()]
  .sort((left, right) => left.step - right.step || left.id.localeCompare(right.id))
  .map((card) => [card.id, card] as const);

function client(seatId: string): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: { send() {}, close() {} } as unknown as ConnectedClient["socket"]
  };
}

function runIntent(server: GameRoomServer, intent: ClientIntent): void {
  server.handleIntent(client(intent.seatId), intent);
  for (let index = 0; index < 6; index += 1) {
    const resolution = server.getState().activeResolution;
    if (!resolution || !["roll_result", "outcome_summary", "awaiting_continue"].includes(resolution.stage)) return;
    server.handleIntent(client(intent.seatId), { type: "CONTINUE_RESOLUTION", seatId: intent.seatId });
  }
}

function liveSectorIdFor(card: EscalationCard): string {
  const band = PRIMARY_ESCALATION_BANDS.find(({ steps }) => (steps as readonly number[]).includes(card.step));
  if (!band) throw new Error(`No live Escalation band is registered for step ${card.step}`);
  return band.sectorId;
}

function setup(card: EscalationCard, scenarioId = "scenario_broken_seal"): GameState {
  const sectorId = liveSectorIdFor(card);
  const escalationLevel = scenarioId === "scenario_grinning_tithe"
    ? 0
    : card.escalationDelta < 0 ? 3 : 0;
  const state = createInitialSessionState(
    `escalation-lifecycle-${card.id}-${scenarioId}`,
    "single-player",
    scenarioId,
    "co-op",
    "standard",
    1
  );

  return {
    ...state,
    status: "active",
    phase: "action",
    currentEncounter: null,
    escalationLevel,
    players: state.players.map((player) => player.seatId === "seat-1"
      ? {
          ...player,
          sectorId,
          character: {
            ...player.character,
            currentSpaceId: sectorId,
            salvage: 3,
            wounds: 0
          }
        }
      : player),
    sectors: state.sectors.map((sector) => sector.id === sectorId
      ? {
          ...sector,
          encounterDecks: {
            ...sector.encounterDecks,
            threat: [],
            escalation: [card.id]
          }
        }
      : sector)
  };
}

function resolve(card: EscalationCard, scenarioId?: string): {
  server: GameRoomServer;
  immediatePhone: string;
  immediateTv: string;
} {
  const server = new GameRoomServer(
    setup(card, scenarioId),
    [],
    createSequenceRandomSource([0, 5, 5])
  );
  server.handleIntent(client("seat-1"), { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
  const immediatePhone = JSON.stringify(createPhoneProjection(server.getState(), "seat-1"));
  const immediateTv = JSON.stringify(createTvProjection(server.getState()));
  for (let index = 0; index < 6; index += 1) {
    const resolution = server.getState().activeResolution;
    if (!resolution || !["roll_result", "outcome_summary", "awaiting_continue"].includes(resolution.stage)) break;
    server.handleIntent(client("seat-1"), { type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  }
  return { server, immediatePhone, immediateTv };
}

function escalationEvents(state: GameState): Array<GameAction & { amount: number; reason?: string }> {
  return (state.eventLog as GameAction[]).filter(
    (event): event is GameAction & { amount: number; reason?: string } => event.type === "ESCALATION_ADVANCED"
  );
}

function resolvedCardEvents(state: GameState, cardId: string): SpaceTextResolvedAction[] {
  return (state.eventLog as GameAction[]).filter(
    (event): event is SpaceTextResolvedAction =>
      event.type === "SPACE_TEXT_RESOLVED" && event.revealedCard?.id === cardId
  );
}

describe("Escalation card lifecycle", () => {
  it("places all 16 authored cards in reachable, progression-banded Escalation actions", () => {
    const cards = loadEscalationCards();
    const sectors = createCanonicalSectorGraph();
    const liveSectorIds = new Set(
      BOARD_SPACES
        .filter((space) => resolveBoardTextEffect(space.textBox.effectKey)?.sectorDeck?.kind === "escalation")
        .map((space) => space.id)
    );
    const liveCards = new Map<string, string>();

    expect(liveSectorIds).toEqual(new Set([
      "emberwatch-step",
      "cinder-fields",
      "outer_broken_causeway",
      "shattered-causeway",
      "middle_scar_surgery"
    ]));

    for (const { sectorId, steps } of PRIMARY_ESCALATION_BANDS) {
      const sector = sectors.find((entry) => entry.id === sectorId);
      expect(sector, `Missing live Escalation sector ${sectorId}`).toBeDefined();
      for (const cardId of sector?.encounterDecks.escalation ?? []) {
        const card = cards.get(cardId);
        expect(card, `${sectorId} references missing Escalation ${cardId}`).toBeDefined();
        expect((steps as readonly number[]).includes(card?.step ?? 0)).toBe(true);
        expect(liveCards.has(cardId), `${cardId} appears in multiple live Escalation pools`).toBe(false);
        liveCards.set(cardId, sectorId);
      }
    }

    expect([...liveCards.keys()].sort()).toEqual([...cards.keys()].sort());
  });

  it.each(ESCALATION_CASES)("%s resolves publicly once, changes pressure once, and survives reconnect", (cardId, card) => {
    const initialLevel = card.escalationDelta < 0 ? 3 : 0;
    const { server, immediatePhone, immediateTv } = resolve(card);
    const resolved = server.getState();
    const sectorId = liveSectorIdFor(card);

    const consequencePressure = cardId === "escalation-gate-saint-wake" ? 1 : 0;
    expect(resolved.escalationLevel).toBe(initialLevel + card.escalationDelta + consequencePressure);
    const cardEscalationEvents = escalationEvents(resolved).filter((event) => event.reason === "sector stabilization");
    expect(cardEscalationEvents).toHaveLength(1);
    expect(cardEscalationEvents[0]).toMatchObject({
      amount: card.escalationDelta,
      reason: "sector stabilization"
    });
    expect(resolvedCardEvents(resolved, cardId)).toHaveLength(1);
    expect(resolvedCardEvents(resolved, cardId)[0]?.revealedCard).toMatchObject({
      id: cardId,
      title: card.title,
      type: "escalation",
      sourceDeck: "escalation",
      sourceSectorId: sectorId,
      privacy: "public"
    });
    expect(resolved.sectors.find((sector) => sector.id === sectorId)?.encounterDecks.escalation).toEqual([]);
    expect(immediateTv).toContain(card.title);
    expect(immediatePhone).toContain(card.title);

    runIntent(server, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    expect(resolvedCardEvents(server.getState(), cardId)).toHaveLength(1);
    expect(escalationEvents(server.getState()).filter((event) => event.reason === "sector stabilization")).toHaveLength(1);

    const restored = new GameRoomServer(JSON.parse(JSON.stringify(server.getState())) as GameState);
    runIntent(restored, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    expect(resolvedCardEvents(restored.getState(), cardId)).toHaveLength(1);
    expect(escalationEvents(restored.getState()).filter((event) => event.reason === "sector stabilization")).toHaveLength(1);
  });

  it.each(ESCALATION_CASES)(
    "%s cannot raise pressure in The Grinning Tithe",
    (cardId, card) => {
      const { server } = resolve(card, "scenario_grinning_tithe");
      const state = server.getState();

      expect(state.escalationLevel).toBe(0);
      expect(resolvedCardEvents(state, cardId)).toHaveLength(1);
      expect(state.sectors.find((sector) => sector.id === liveSectorIdFor(card))?.encounterDecks.escalation).toEqual([]);
      expect(card.resolveEffect?.type).not.toBe("advance_escalation");
    }
  );
});
