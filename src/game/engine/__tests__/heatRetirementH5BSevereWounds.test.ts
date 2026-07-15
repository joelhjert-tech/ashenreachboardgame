import { describe, expect, it } from "vitest";
import {
  APPROVED_LEGACY_HEAT_CONTENT_IDS,
  LEGACY_HEAT_EFFECT_APPROVALS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import { loadFollowers } from "../../content/followers.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import type { EnemyThreatCard } from "../../schema/card.schema.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";

const TARGETS = [
  {
    id: "ashen-doppelganger",
    title: "Ashen Doppelganger",
    lane: "blue",
    stat: "guile",
    difficulty: 11,
    severity: 4,
    region: "inner",
    rarity: "uncommon",
    amount: 2,
    graphCount: 3,
    trophyValue: 3,
    defeatReward: { type: "gain_trophy", amount: 3 },
    failureText: "If you lose this battle, suffer 2 Wounds."
  },
  {
    id: "hymn-scarred-zealot",
    title: "Hymn-Scarred Zealot",
    lane: "red",
    stat: "grit",
    difficulty: 3,
    severity: 1,
    region: "outer",
    rarity: "common",
    amount: 1,
    graphCount: 1,
    trophyValue: 1,
    defeatReward: {
      type: "sequence",
      effects: [{ type: "gain_note", text: "You silenced the zealot before the full formation answered." }]
    },
    failureText: "If you lose this battle, suffer 1 Wound."
  }
] as const;

const BLOCKED_HASHES = new Map<string, string>();

const threats = loadThreatCards();

type Projection = {
  activeResolution?: { outcome?: { text?: string; effects?: unknown[] } } | null;
  publicResultDeltas?: Array<{ type?: string; value?: number }>;
  objectUseStates?: unknown[];
  self?: unknown;
};

function requireEnemy(id: string): EnemyThreatCard {
  const card = threats.get(id);
  if (!card || card.cardType !== "enemy") throw new Error(`Missing H5B enemy ${id}`);
  return card;
}

function countEvents(state: GameState, type: string): number {
  return (state.eventLog as Array<{ type?: string }>).filter((entry) => entry.type === type).length;
}

function createEncounterState(card: EnemyThreatCard, wounds = 0, ker = false, fandiablos = false): GameState {
  const state = createInitialSessionState(`h5b-${card.id}-${wounds}-${ker}-${fandiablos}`, "single-player");
  state.status = "active";
  state.phase = "action";
  state.resolutionSource = null;
  state.currentEncounter = card;
  state.players[0]!.character.stats[card.stat] = 0;
  state.players[0]!.character.wounds = wounds;
  if (ker) state.players[0]!.character.id = "char_ker_von_ker";
  if (fandiablos) {
    state.players[0]!.character.followers = [{
      ...loadFollowers().get("fandiablos")!,
      instanceId: "fandiablos:seat-1:h5b",
      exhausted: false
    }];
  }
  state.activeResolution = {
    id: `h5b-resolution-${card.id}-${wounds}-${ker}-${fandiablos}`,
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
    battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };
  return state;
}

function openLoss(card: EnemyThreatCard, wounds = 0, ker = false, fandiablos = false): GameRoomServer {
  const rolls = fandiablos ? [0, 0, 5, 5, 3] : [0, 0, 5, 5];
  const server = new GameRoomServer(createEncounterState(card, wounds, ker, fandiablos), [], createSequenceRandomSource(rolls));
  server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: card.stat });
  return server;
}

function finish(server: GameRoomServer): GameState {
  if (server.getState().pendingEffect) server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
  return server.getState();
}

function unresolvedState(card: EnemyThreatCard, wounds = 0): GameState {
  const state = createEncounterState(card, wounds);
  state.phase = "resolution";
  state.pendingEffect = card.woundOnLoss!;
  state.activeResolution = {
    ...state.activeResolution!,
    stage: "roll_result",
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: card.difficulty, success: false }
  };
  return state;
}

function applyPending(state: GameState, card: EnemyThreatCard, effect = state.pendingEffect!) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect,
    sourceCardId: card.id,
    success: false,
    createdAt: `h5b-apply-${card.id}`
  });
}

function collectHeatThreatIds(): string[] {
  const found = new Set<string>();
  const walk = (value: unknown, id: string): void => {
    if (Array.isArray(value)) return value.forEach((entry) => walk(entry, id));
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (["gain_heat", "gain_heat_all", "lose_heat"].includes(String(record.type))) found.add(id);
    Object.values(record).forEach((entry) => walk(entry, id));
  };
  for (const card of threats.values()) walk(card, card.id);
  return [...found].sort();
}

describe("Heat Retirement H5B severe Wound Threats", () => {
  it("authors the two exact approved Wound failures while preserving identity, rewards, membership, and totals", () => {
    for (const target of TARGETS) {
      const card = requireEnemy(target.id);
      expect(card).toMatchObject({
        id: target.id,
        title: target.title,
        cardType: "enemy",
        threatLane: target.lane,
        stat: target.stat,
        difficulty: target.difficulty,
        severity: target.severity,
        region: target.region,
        rarity: target.rarity,
        trophyValue: target.trophyValue,
        defeatReward: target.defeatReward,
        woundOnLoss: { type: "take_wound", amount: target.amount }
      });
      expect(card.text).toContain(target.failureText);
      expect(card.resourceTags).toContain("wound");
      expect(card.resourceTags).not.toContain("heat");
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|gain_scar|direct recall/i);
      expect(validateLegacyHeatContentRecord(`${target.id}.json`, card)).toEqual([]);
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(target.id)).toBe(false);
      expect(getRuntimeCardArtPath("threat", target.id)).toBe(`/assets/cards/threats/${target.lane}/${target.id}.png`);
      expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.threat.includes(target.id))).toHaveLength(target.graphCount);
    }
    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
  });

  it.each(TARGETS)("$id loss creates one owner-scoped authoritative pending consequence", (target) => {
    const state = openLoss(requireEnemy(target.id)).getState();
    expect(state.pendingEffect).toEqual({ type: "take_wound", amount: target.amount });
    expect(state.pendingFailureReaction).toBeNull();
    expect(state.activeResolution?.id).toContain(target.id);
    expect(state.players[0]!.character.wounds).toBe(0);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(0);
    expect(gameStateSchema.safeParse(state).success).toBe(true);
  });

  it("applies Ashen Doppelganger's atomic two-Wound request once with a single result delta", () => {
    const card = requireEnemy("ashen-doppelganger");
    const applied = applyPending(unresolvedState(card), card);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.players[0]!.character.wounds).toBe(2);
    expect(applied.state.pendingEffect).toBeNull();
    expect(applied.state.activeResolution?.outcome?.effects).toEqual(["Failure: take 2 wounds."]);
    expect(countEvents(applied.state, "RESOLUTION_APPLIED")).toBe(1);
    expect(createPhoneProjection(applied.state, "seat-1", true).publicResultDeltas).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "wound", value: 2 })])
    );
  });

  it("uses one Ashen prevention lifecycle for partial and full prevention", () => {
    const card = requireEnemy("ashen-doppelganger");
    const partial = openLoss(card, 0, true);
    expect(JSON.stringify(partial.getState().pendingEffect)).toContain("Hold the Line prevented 1 Wound.");
    expect(JSON.stringify(partial.getState().pendingEffect).match(/take_wound/g)).toHaveLength(1);
    const partialState = finish(partial);
    expect(partialState.players[0]!.character.wounds).toBe(1);
    expect(countEvents(partialState, "RESOLUTION_APPLIED")).toBe(1);
    expect(countEvents(partialState, "WOUND_THRESHOLD_REACHED")).toBe(0);

    const full = openLoss(card, 0, true, true);
    expect(JSON.stringify(full.getState().pendingEffect)).not.toContain("take_wound");
    const fullState = finish(full);
    expect(fullState.players[0]!.character.wounds).toBe(0);
    expect(fullState.players[0]!.private.notes.join(" ")).toMatch(/Fandiablos Unreasonable Courage rolled 4/);
    expect(fullState.players[0]!.private.notes).toContain("Hold the Line prevented 1 Wound.");
    expect(countEvents(fullState, "RESOLUTION_APPLIED")).toBe(1);
    expect(countEvents(fullState, "WOUND_THRESHOLD_REACHED")).toBe(0);
  });

  it("fully prevents Hymn-Scarred Zealot through the same normal pipeline", () => {
    const card = requireEnemy("hymn-scarred-zealot");
    const state = finish(openLoss(card, 0, true));
    expect(state.players[0]!.character.wounds).toBe(0);
    expect(state.players[0]!.private.notes).toContain("Hold the Line prevented 1 Wound.");
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(1);
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(0);
  });

  it.each(TARGETS)("$id crosses the threshold only after the final delta and creates one normal recall Scar", (target) => {
    const card = requireEnemy(target.id);
    const threshold = createEncounterState(card).woundThreshold;
    const startingWounds = threshold - target.amount;
    const state = finish(openLoss(card, startingWounds));
    expect(state.players[0]!.character).toMatchObject({ wounds: threshold, status: "recalled" });
    expect(state.players[0]!.character.scars).toHaveLength(1);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(1);
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(1);
  });

  it("partial Ashen prevention changes the final delta and avoids recall before any threshold check", () => {
    const card = requireEnemy("ashen-doppelganger");
    const threshold = createEncounterState(card).woundThreshold;
    const state = finish(openLoss(card, threshold - 2, true));
    expect(state.players[0]!.character).toMatchObject({ wounds: threshold - 1, status: "active" });
    expect(state.players[0]!.character.scars).toEqual([]);
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(0);
  });

  it.each(TARGETS)("$id rejects the wrong seat and derives the authored Wound amount", (target) => {
    const card = requireEnemy(target.id);
    const rejected = reduceGameState(unresolvedState(card), {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-2",
      sourceCardId: card.id,
      effect: { type: "take_wound", amount: 99 },
      success: false,
      createdAt: "h5b-rejected"
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.state.players[0]!.character.wounds).toBe(0);
    const forged = applyPending(unresolvedState(card), card, { type: "take_wound", amount: 99 });
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.players[0]!.character.wounds).toBe(target.amount);
  });

  it.each(TARGETS)("$id reconnects pending and completed state without replaying Wounds, recall, or Scars", (target) => {
    const card = requireEnemy(target.id);
    const pending = new GameRoomServer(structuredClone(unresolvedState(card))).getState();
    expect(pending.pendingEffect).toEqual({ type: "take_wound", amount: target.amount });
    const applied = applyPending(pending, card);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const complete = new GameRoomServer(structuredClone(applied.state)).getState();
    const replay = applyPending(complete, card, { type: "take_wound", amount: target.amount });
    expect(replay.ok).toBe(false);
    expect(replay.state.players[0]!.character.wounds).toBe(target.amount);
    expect(countEvents(replay.state, "RESOLUTION_APPLIED")).toBe(1);
    expect(gameStateSchema.safeParse(replay.state).success).toBe(true);
  });

  it("preserves Ashen Doppelganger's documented 6-point/3-value reward mismatch exactly once", () => {
    const card = requireEnemy("ashen-doppelganger");
    const state = createEncounterState(card);
    state.players[0]!.character.stats.guile = 20;
    state.players[0]!.character.trophies = 0;
    state.players[0]!.character.trophyPile = [];
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5, 0, 0]));
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "guile" });
    const opened = server.getState();
    expect(opened.pendingEffect).toEqual({ type: "gain_trophy", amount: 3 });
    const applied = reduceGameState(opened, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: opened.pendingEffect!,
      sourceCardId: card.id,
      success: true,
      createdAt: "h5b-ashen-reward"
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.players[0]!.character.trophies).toBe(6);
    expect(applied.state.players[0]!.character.trophyPile).toContainEqual(expect.objectContaining({
      cardId: card.id,
      trophyValue: 3,
      stat: "guile",
      cardType: "enemy"
    }));
    const replay = reduceGameState(applied.state, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: { type: "gain_trophy", amount: 3 },
      sourceCardId: card.id,
      success: true,
      createdAt: "h5b-ashen-reward-replay"
    });
    expect(replay.ok).toBe(false);
    expect(replay.state.players[0]!.character.trophies).toBe(6);
    expect(replay.state.players[0]!.character.trophyPile).toHaveLength(1);
  });

  it.each(TARGETS)("$id keeps owner-private controls private and public results free of Heat and internal IDs", (target) => {
    const card = requireEnemy(target.id);
    const pending = openLoss(card).getState();
    const owner = createPhoneProjection(pending, "seat-1", true) as Projection;
    const other = createPhoneProjection(pending, "seat-2", true) as Projection;
    const tv = createTvProjection(pending) as Projection;
    expect(other.self).toBeNull();
    expect(other.objectUseStates).toEqual([]);
    expect(tv.objectUseStates).toBeUndefined();
    expect(JSON.stringify({ owner: owner.activeResolution, tv: tv.activeResolution, pending: pending.pendingEffect }))
      .not.toMatch(/\bHeat\b|gain_heat|lose_heat|sourceEventId|consequenceId/i);
  });

  it("preserves H5B and hash-pins the sole still-blocked definition after H8B", () => {
    expect(collectHeatThreatIds()).toEqual([...BLOCKED_HASHES.keys()].sort());
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(4);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(18);
  });
});
