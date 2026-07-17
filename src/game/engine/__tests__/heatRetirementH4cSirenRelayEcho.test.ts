import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadThreatCards } from "../../content/threats.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";
import {
  createOrReplaceNextNonBattleTestModifier,
  createOrReplaceSirenRelayEchoModifier,
  consumeReservedSirenRelayEchoModifier,
  getNextNonBattleTestModifierSource,
  reserveSirenRelayEchoModifier
} from "../../rules/nextNonBattleTestModifier.js";
import { sessionSnapshotSchema, type GameState } from "../../schema/session.schema.js";
import type { ThreatCard } from "../../schema/card.schema.js";
import type { SoloRerollResolvedAction } from "../actions.js";

const threats = loadThreatCards();
const siren = threats.get("siren-relay-echo") as Extract<ThreatCard, { cardType: "hazard" }>;

function sirenResolution(success: boolean, id = `siren:${success ? "success" : "failure"}`): GameState {
  const state = createInitialSessionState(id, "single-player");
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = siren;
  state.pendingEffect = success ? siren.successEffect! : siren.failEffect;
  state.activeResolution = {
    id,
    playerId: "seat-1",
    source: "threat",
    stage: "roll_result",
    card: { id: siren.id, title: siren.title, type: siren.cardType, flavor: siren.flavor },
    battle: { enemyName: siren.title, stat: siren.stat, difficulty: siren.difficulty, modifiers: [] },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: 6, success }
  };
  state.lastOutcomeSummary = {
    seatId: "seat-1", movedToSectorId: state.players[0]!.sectorId, encounterCardId: siren.id,
    encounterTitle: siren.title, encounterCardType: siren.cardType, checkStat: "command",
    die1: 1, die2: 1, statBonus: 0, checkTotal: 2, difficulty: 6, success, summary: "Siren resolved."
  };
  return state;
}

function applySiren(success: boolean, state = sirenResolution(success)) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect: success ? siren.successEffect! : siren.failEffect,
    sourceCardId: siren.id,
    success,
    createdAt: `apply:${success}`
  });
}

describe("Heat retirement H4C: Siren Relay Echo", () => {
  it("preserves identity and totals while replacing both Heat branches with exact typed wording", () => {
    expect(siren).toMatchObject({
      id: "siren-relay-echo", title: "Siren Relay Echo", cardType: "hazard", threatLane: "yellow",
      stat: "command", difficulty: 6, severity: 2, region: "outer", rarity: "common",
      text: "If you succeed, gain +1 on your next non-battle Command test. If you fail, suffer -1 on your next non-battle Command test.",
      successEffect: { type: "next_non_battle_test_modifier", amount: 1, sourceCardId: "siren-relay-echo", stat: "command", context: "nonBattleTest" },
      failEffect: { type: "next_non_battle_test_modifier", amount: -1, sourceCardId: "siren-relay-echo", stat: "command", context: "nonBattleTest" }
    });
    expect(JSON.stringify(siren)).not.toMatch(/gain_heat|lose_heat|\bHeat\b/);
    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
    for (const [id, hash] of [
      ["relay-husk", "bf2f4bdea63780f979241f0e5ea12d00e1760b2fbb89ca5a4044d96e1322f8f2"],
      ["signal-rotted-engineer", "e437ec07f6c254697d01724e695adf9ad2434974bf895c0c96f00a3d14081483"]
    ] as const) {
      expect(createHash("sha256").update(JSON.stringify(threats.get(id))).digest("hex"), id).toBe(hash);
    }
  });

  it.each([[true, 1], [false, -1]] as const)("creates the signed pending modifier for success=%s", (success, amount) => {
    const applied = applySiren(success);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.pendingNextNonBattleTestModifiers).toEqual([expect.objectContaining({
      ownerSeatId: "seat-1", sourceCardId: siren.id, stat: "command", context: "nonBattleTest",
      amount, boundTestResolutionId: null, sourceEventId: `${success ? "siren:success" : "siren:failure"}:next-non-battle-test`
    })]);
  });

  it("replaces every signed combination, deduplicates old events, and stacks Glass-Chime by name", () => {
    let state = createInitialSessionState("replace", "single-player");
    state = createOrReplaceSirenRelayEchoModifier(state, "seat-1", 1, "s1", "s1");
    state = createOrReplaceSirenRelayEchoModifier(state, "seat-1", 1, "s2", "s2");
    expect(state.pendingNextNonBattleTestModifiers).toHaveLength(1);
    state = createOrReplaceSirenRelayEchoModifier(state, "seat-1", -1, "s3", "s3");
    expect(state.pendingNextNonBattleTestModifiers).toEqual([expect.objectContaining({ amount: -1, sourceEventId: "s3" })]);
    state = createOrReplaceSirenRelayEchoModifier(state, "seat-1", 1, "s4", "s4");
    state = createOrReplaceSirenRelayEchoModifier(state, "seat-1", -1, "s3", "replay");
    expect(state.pendingNextNonBattleTestModifiers).toEqual([expect.objectContaining({ amount: 1, sourceEventId: "s4" })]);
    state = createOrReplaceNextNonBattleTestModifier(state, "seat-1", "glass", "glass");
    expect(getNextNonBattleTestModifierSource(state, "seat-1", "command")).toEqual([
      { label: "Siren Relay Echo", value: 1 },
      { label: "Glass-Chime Swarm", value: -1 }
    ]);
    expect(getNextNonBattleTestModifierSource(state, "seat-1", "signal")).toEqual([
      { label: "Glass-Chime Swarm", value: -1 }
    ]);
  });

  it("reserves one authoritative Command resolution, survives reconnect, then consumes once", () => {
    const pending = createOrReplaceSirenRelayEchoModifier(createInitialSessionState("reserve", "single-player"), "seat-1", -1, "source", "source");
    const reserved = reserveSirenRelayEchoModifier(pending, "seat-1", "test-resolution");
    expect(reserved.pendingNextNonBattleTestModifiers).toEqual([expect.objectContaining({ boundTestResolutionId: "test-resolution" })]);
    expect(getNextNonBattleTestModifierSource(reserved, "seat-1", "command")).toEqual([]);
    expect(sessionSnapshotSchema.safeParse({ saveVersion: 2, sessionId: reserved.sessionId, sequence: reserved.sequence, state: reserved }).success).toBe(true);
    const consumed = consumeReservedSirenRelayEchoModifier(reserved, "seat-1");
    expect(consumed.pendingNextNonBattleTestModifiers).toEqual([]);
    expect(consumed.consumedNextNonBattleTestModifierTestEventIds).toContain("test-resolution");
    expect(consumeReservedSirenRelayEchoModifier(consumed, "seat-1")).toEqual(consumed);
    const replacedAtFinalization = createOrReplaceSirenRelayEchoModifier(reserved, "seat-1", 1, "new-source", "new");
    expect(replacedAtFinalization.pendingNextNonBattleTestModifiers).toEqual([
      expect.objectContaining({ amount: 1, sourceEventId: "new-source", boundTestResolutionId: null })
    ]);
    expect(replacedAtFinalization.consumedNextNonBattleTestModifierTestEventIds).toContain("test-resolution");
  });

  it("uses the normal authoritative Command calculation once without mutating stored Command", () => {
    const state = createInitialSessionState("command-check", "single-player");
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = siren;
    state.players[0]!.character.stats.command = 0;
    const pending = createOrReplaceSirenRelayEchoModifier(state, "seat-1", -1, "source", "source");
    const server = new GameRoomServer(pending, [], createSequenceRandomSource([0, 0, 5, 5]));
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "command" });
    const resolved = server.getState();
    expect(resolved.activeResolution?.battle?.modifiers.filter((source) => source.label === "Siren Relay Echo")).toEqual([
      { label: "Siren Relay Echo", value: -1 }
    ]);
    expect(resolved.activeResolution?.roll).toMatchObject({ modifierTotal: -1, finalTotal: 1 });
    expect(resolved.players[0]!.character.stats.command).toBe(0);
    expect(resolved.pendingNextNonBattleTestModifiers).toEqual([expect.objectContaining({ boundTestResolutionId: resolved.activeResolution?.id })]);
    const reroll = (server as unknown as {
      createSoloRerollAction: (intent: { type: "SOLO_REROLL_REQUESTED"; seatId: string }, createdAt: string) => SoloRerollResolvedAction;
    }).createSoloRerollAction({ type: "SOLO_REROLL_REQUESTED", seatId: "seat-1" }, "reroll");
    expect(reroll.modifierSources?.filter((source) => source.label === "Siren Relay Echo")).toEqual([
      { label: "Siren Relay Echo", value: -1 }
    ]);
    expect(reroll.statBonus).toBe(-1);
    expect(reroll.total).toBe(11);
  });

  it("keeps pending state owner-private and exposes no internal IDs", () => {
    const state = createOrReplaceSirenRelayEchoModifier(createInitialSessionState("privacy", "multiplayer"), "seat-1", 1, "private-source", "now");
    const owner = createPhoneProjection(state, "seat-1", true) as { pendingTestModifiers?: unknown[] };
    const other = createPhoneProjection(state, "seat-2", true) as { pendingTestModifiers?: unknown[] };
    expect(owner.pendingTestModifiers).toEqual([expect.objectContaining({
      label: "Siren Relay Echo", summary: "Next non-battle Command test: +1", amount: 1
    })]);
    expect(other.pendingTestModifiers).toEqual([]);
    expect(JSON.stringify(owner.pendingTestModifiers)).not.toMatch(/private-source|sourceEventId|boundTestResolutionId/);
    expect(JSON.stringify(createTvProjection(state))).not.toMatch(/Siren Relay Echo|pendingTestModifiers|private-source/);
  });

  it("rejects a result/amount mismatch and never creates forged state", () => {
    const state = sirenResolution(true, "mismatch");
    state.pendingEffect = siren.failEffect;
    const rejected = reduceGameState(state, {
      type: "RESOLUTION_APPLIED", seatId: "seat-1", effect: siren.failEffect,
      sourceCardId: siren.id, success: true, createdAt: "mismatch"
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.state.pendingNextNonBattleTestModifiers).toEqual([]);
  });
});
