import { describe, expect, it } from "vitest";
import { GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import type { EnemyThreatCard } from "../../schema/card.schema.js";
import { gameStateSchema } from "../../schema/session.schema.js";
import { createSequenceRandomSource } from "../dice.js";

const threats = loadThreatCards();
const grothak = threats.get("grothak-gorged-king");

if (!grothak || grothak.cardType !== "enemy") {
  throw new Error("Missing canonical Grothak enemy");
}

function createBattleServer(card: EnemyThreatCard, rolls: number[]): GameRoomServer {
  const state = createInitialSessionState(`grothak-${rolls.join("-")}`, "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "action";
  state.activeSeatIndex = 0;
  state.turnOrder = [player.seatId];
  state.currentEncounter = card;
  state.activeResolution = {
    id: `battle:${card.id}:1`,
    playerId: player.seatId,
    source: "threat",
    stage: "card_reveal",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
    battle: { enemyName: card.enemyName, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };
  return new GameRoomServer(state, [], createSequenceRandomSource(rolls));
}

function finishPendingResolution(server: GameRoomServer): void {
  for (let index = 0; index < 6; index += 1) {
    const state = server.getState();
    if (!state.activeResolution && !state.pendingEffect) return;
    server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: state.players[0]!.seatId });
  }
}

describe("Grothak, the Gorged King", () => {
  it("replaces the retired throne slot while preserving canonical deck and lane totals", () => {
    expect(grothak).toMatchObject({
      id: "grothak-gorged-king",
      title: "Grothak, the Gorged King",
      cardType: "enemy",
      threatLane: "yellow",
      region: "inner",
      rarity: "rare",
      severity: 5,
      stat: "command",
      difficulty: 11,
      trophyValue: 7,
      defeatReward: { type: "gain_salvage", amount: 2 },
      woundOnLoss: { type: "take_wound", amount: 2 }
    });
    expect(threats.has("throne-soot-knight")).toBe(false);
    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
    expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.threat.includes(grothak.id))).toHaveLength(3);
    expect(getRuntimeCardArtPath("threat", grothak.id)).toBe("/assets/cards/threats/yellow/grothak-gorged-king.png");
    expect(JSON.stringify(grothak)).not.toMatch(/gain_heat|lose_heat|\bHeat\b/);
  });

  it("applies the two-Wound loss once through the authoritative battle lifecycle", () => {
    const server = createBattleServer(grothak, [0, 0, 5, 5]);
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "command" });
    expect(server.getState().pendingEffect).toEqual({ type: "take_wound", amount: 2 });
    finishPendingResolution(server);
    expect(server.getState().players[0]!.character.wounds).toBe(2);
    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "RESOLUTION_APPLIED")).toHaveLength(1);
    expect(gameStateSchema.safeParse(server.getState()).success).toBe(true);
  });

  it("grants the authored Salvage reward once after an authoritative victory", () => {
    const server = createBattleServer(grothak, [5, 5, 0, 0]);
    const before = server.getState().players[0]!.character.salvage ?? 0;
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "command" });
    expect(server.getState().pendingEffect).toEqual({ type: "gain_salvage", amount: 2 });
    finishPendingResolution(server);
    expect(server.getState().players[0]!.character.salvage).toBe(before + 2);
    expect(server.getState().eventLog.filter((event) => (event as { type?: string }).type === "RESOLUTION_APPLIED")).toHaveLength(1);
  });
});
