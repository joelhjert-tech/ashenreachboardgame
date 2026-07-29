import { describe, expect, it } from "vitest";
import { resolveThreatEffect } from "../../game/cards/threatEffects.js";
import { loadThreatCards } from "../../game/content/threats.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import type { CombatResolvedAction } from "../../game/engine/actions.js";
import type { EnemyThreatCard } from "../../game/schema/card.schema.js";
import type { GameState } from "../../game/schema/session.schema.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

const threats = loadThreatCards();

function requireEnemy(id: string): EnemyThreatCard {
  const card = threats.get(id);
  if (!card || card.cardType !== "enemy") throw new Error(`Missing enemy ${id}`);
  return card;
}

function resolveAt(card: EnemyThreatCard, spaceId: string): CombatResolvedAction {
  const state = createInitialSessionState(`threat-region:${spaceId}`, "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "action";
  state.currentEncounter = card;
  player.sectorId = spaceId;
  player.character.currentSpaceId = spaceId;
  player.character.stats[card.stat] = 0;
  state.activeResolution = {
    id: `threat-region:${spaceId}:${card.id}`,
    playerId: player.seatId,
    source: "threat",
    stage: "battle_setup",
    card: { id: card.id, title: card.title, type: "enemy" },
    battle: { enemyName: card.enemyName, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };

  const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 0, 0]));
  server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: player.seatId, stat: card.stat });
  const action = [...server.getState().eventLog].reverse().find(
    (event): event is CombatResolvedAction => (event as { type?: string }).type === "COMBAT_RESOLVED"
  );
  if (!action) throw new Error("Combat did not resolve");
  return action;
}

function effectContext(card: EnemyThreatCard): {
  state: GameState;
  seatId: string;
  card: EnemyThreatCard;
  player: GameState["players"][number];
  escalationLevel: number;
} {
  const state = createInitialSessionState(`threat-effect:${card.id}`, "single-player");
  return {
    state,
    seatId: state.players[0]!.seatId,
    card,
    player: state.players[0]!,
    escalationLevel: state.escalationLevel
  };
}

describe("resolved Threat semantics", () => {
  it("uses the live board sector before authored region metadata", () => {
    const marshal = requireEnemy("pale-marshal");
    const outer = resolveAt(marshal, "outer_waymarket");
    const inner = resolveAt(marshal, "inner_veil_rift");

    expect(outer.enemyBonus - outer.difficulty).toBe(0);
    expect(inner.enemyBonus - inner.difficulty).toBe(2);
  });

  it("keeps one authored loss consequence on cards that previously duplicated keyed effects", () => {
    const larva = requireEnemy("static-larva-swarm");
    const moth = requireEnemy("moth-carrier-husk");
    const engineer = requireEnemy("signal-rotted-engineer");
    const marshal = requireEnemy("pale-marshal");

    expect(larva.failEffectKey).toBeUndefined();
    expect(moth.failEffectKey).toBeUndefined();
    expect(engineer.failEffectKey).toBeUndefined();
    expect(marshal.revealEffectKey).toBeUndefined();
    expect(larva.woundOnLoss).toMatchObject({
      type: "sequence",
      effects: expect.arrayContaining([expect.objectContaining({ type: "gain_scar_choice", amount: 1 })])
    });
  });

  it("resolves faction salvage and escalation keys as typed state effects", () => {
    const salvager = requireEnemy("chain-maul-salvager");
    const moth = requireEnemy("moth-carrier-husk");

    expect(resolveThreatEffect("threat_defeat_gain_salvage", effectContext(salvager)).effect)
      .toEqual({ type: "gain_salvage", amount: 1 });
    expect(resolveThreatEffect("threat_fail_escalate", effectContext(moth)).effect)
      .toEqual({ type: "advance_escalation", amount: 1 });
  });
});
