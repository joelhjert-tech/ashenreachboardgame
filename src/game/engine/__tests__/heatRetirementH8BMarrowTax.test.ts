import { describe, expect, it } from "vitest";
import {
  APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS,
  APPROVED_LEGACY_HEAT_CONTENT_IDS,
  LEGACY_HEAT_EFFECT_APPROVALS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import { loadGear } from "../../content/gear.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import { THREAT_REVISION_SALVAGE_LOSS_SOURCE_IDS } from "../../rules/salvageLoss.js";
import type { HazardThreatCard } from "../../schema/card.schema.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";

const TARGET_ID = "marrow-tax-auditors";
const EXPECTED_SECTORS = [
  "middle_relic_cache",
  "middle_scar_surgery",
  "middle_shard_sprawl",
  "the-salt-archive"
] as const;

const threats = loadThreatCards();

type Projection = {
  activeResolution?: {
    outcome?: {
      text?: string;
      effects?: string[];
      salvageLoss?: {
        requestedLoss: number;
        actualLoss: number;
        resultingSalvage: number;
        sourceCardId: string;
      };
    };
  } | null;
  publicResultDeltas?: unknown[];
  self?: unknown;
};

function requireTarget(): HazardThreatCard {
  const card = threats.get(TARGET_ID);
  if (!card || card.cardType !== "hazard") throw new Error(`Missing H8B hazard ${TARGET_ID}`);
  return card;
}

function failureState(salvage: number): GameState {
  const card = requireTarget();
  const state = createInitialSessionState(`h8b-${salvage}`, "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = card;
  state.pendingEffect = card.failEffect;
  player.character.salvage = salvage;
  state.activeResolution = {
    id: `${TARGET_ID}:failed-check`,
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    roll: {
      dice: [1, 1],
      baseTotal: 2,
      modifierTotal: 0,
      finalTotal: 2,
      target: card.difficulty,
      success: false
    }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId,
    movedToSectorId: player.sectorId,
    encounterCardId: card.id,
    encounterTitle: card.title,
    encounterCardType: card.cardType,
    checkStat: card.stat,
    die1: 1,
    die2: 1,
    statBonus: 0,
    checkTotal: 2,
    difficulty: card.difficulty,
    success: false,
    summary: `${card.title} check failed.`
  };
  return state;
}

function applyFailure(state: GameState, overrides: Partial<Extract<Parameters<typeof reduceGameState>[1], { type: "RESOLUTION_APPLIED" }>> = {}) {
  const card = requireTarget();
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: state.players[0]!.seatId,
    effect: card.failEffect,
    sourceCardId: card.id,
    success: false,
    createdAt: "h8b-failure",
    ...overrides
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

describe("Heat Retirement H8B Marrow Tax Auditors", () => {
  it("preserves identity and four finite local-deck entries while authoring exactly one automatic loss", () => {
    const card = requireTarget();
    expect(card).toMatchObject({
      id: TARGET_ID,
      title: "Marrow-Tax Auditors",
      cardType: "hazard",
      threatLane: "yellow",
      stat: "guile",
      difficulty: 7,
      severity: 2,
      region: "outer",
      rarity: "common",
      tempo: "push",
      successEffect: {
        type: "gain_note",
        text: "You found a loophole in a dead empire tariff."
      },
      failEffect: { type: "lose_salvage", amount: 1 }
    });
    expect(card.text).toBe("Ink-faced auditors unfold from a dead checkpoint and calculate what your bones owe the road. On failure, lose up to 1 Salvage.");
    expect(card.resourceTags).toContain("salvage");
    expect(card.resourceTags).not.toContain("heat");
    expect(card).not.toHaveProperty("persistent");
    expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b|\bpay\b|\bspend\b/i);
    expect(validateLegacyHeatContentRecord(`${TARGET_ID}.json`, card)).toEqual([]);
    expect(APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS.has(TARGET_ID)).toBe(true);
    expect(THREAT_REVISION_SALVAGE_LOSS_SOURCE_IDS.has(TARGET_ID)).toBe(true);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(TARGET_ID)).toBe(false);
    expect(getRuntimeCardArtPath("threat", TARGET_ID)).toBe(`/assets/cards/threats/yellow/${TARGET_ID}.png`);
    expect(createCanonicalSectorGraph()
      .filter((sector) => sector.encounterDecks.threat.includes(TARGET_ID))
      .map((sector) => sector.id)
      .sort()).toEqual(EXPECTED_SECTORS);
    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, threat) => {
      counts[threat.threatLane ?? "missing"] = (counts[threat.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
  });

  it("preserves success behavior without changing Salvage or creating a loss result", () => {
    const card = requireTarget();
    const state = createInitialSessionState("h8b-success", "single-player");
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = card;
    state.players[0]!.character.salvage = 3;
    state.players[0]!.character.stats.guile = 20;
    state.activeResolution = {
      id: "h8b-success",
      playerId: "seat-1",
      source: "threat",
      stage: "card_reveal",
      card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
      battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
    };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "guile" });
    const opened = server.getState();
    expect(opened.pendingEffect).toEqual(card.successEffect);
    expect(opened.players[0]!.character.salvage).toBe(3);
    const result = reduceGameState(opened, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: opened.pendingEffect!,
      sourceCardId: card.id,
      success: true,
      createdAt: "h8b-success-applied"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character.salvage).toBe(3);
    expect(result.state.players[0]!.private.notes).toContain("You found a loophole in a dead empire tariff.");
    expect(result.state.activeResolution?.outcome?.salvageLoss).toBeUndefined();
  });

  it.each([
    [3, 1, 2, "Lost 1 Salvage."],
    [1, 1, 0, "Lost 1 Salvage."],
    [0, 0, 0, "No Salvage to lose."]
  ] as const)("resolves %i Salvage with requested 1, actual %i, and resulting %i", (starting, actual, resulting, text) => {
    const state = failureState(starting);
    const player = state.players[0]!;
    player.character.wounds = 2;
    player.character.scars = ["scar-wound-1"];
    player.character.heldGear.push(loadGear().get("salvage-ledger")!);
    player.character.activeContract = { contractId: "compact-equipment-requisition", progress: 0, salvageSpent: 0 };
    player.character.completedContracts = ["sealed-contract"];
    const isolatedBefore = structuredClone({
      wounds: player.character.wounds,
      scars: player.character.scars,
      sectorId: player.sectorId,
      heldGear: player.character.heldGear,
      activeContract: player.character.activeContract,
      completedContracts: player.character.completedContracts,
      private: player.private,
      escalationLevel: state.escalationLevel,
      scenarioProgress: state.scenarioProgress,
      shopStockReveals: state.shopStockReveals
    });

    const result = applyFailure(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const resolved = result.state.players[0]!;
    expect(resolved.character.salvage).toBe(resulting);
    expect({
      wounds: resolved.character.wounds,
      scars: resolved.character.scars,
      sectorId: resolved.sectorId,
      heldGear: resolved.character.heldGear,
      activeContract: resolved.character.activeContract,
      completedContracts: resolved.character.completedContracts,
      private: resolved.private,
      escalationLevel: result.state.escalationLevel,
      scenarioProgress: result.state.scenarioProgress,
      shopStockReveals: result.state.shopStockReveals
    }).toEqual(isolatedBefore);
    expect(result.state.pendingEffect).toBeNull();
    expect(result.state.activeResolution?.outcome).toMatchObject({
      text,
      effects: [text],
      salvageLoss: { requestedLoss: 1, actualLoss: actual, resultingSalvage: resulting, sourceCardId: TARGET_ID }
    });
    expect(result.state.eventLog.some((event) => /SHOP|COMPLETE_CONTRACT|MISSION|ENCOUNTER_PAYMENT|PURCHASE|SALE|RELIC/.test((event as { type?: string }).type ?? ""))).toBe(false);

    const phone = createPhoneProjection(result.state, "seat-1", true) as Projection;
    const tv = createTvProjection(result.state) as Projection;
    expect(phone.activeResolution?.outcome?.salvageLoss).toEqual(result.state.activeResolution?.outcome?.salvageLoss);
    expect(phone.activeResolution?.outcome?.effects).toEqual([text]);
    expect(tv.activeResolution?.outcome?.text).toBe(text);
    expect(JSON.stringify({ phone: phone.activeResolution, tv: tv.activeResolution })).not.toMatch(/\bHeat\b|\bRisk\b|lose_salvage|sourceEventId|transactionId|shopTransaction/i);
  });

  it("rejects wrong-seat, stale-source, and replay attempts while deriving the approved amount", () => {
    const wrongSeat = applyFailure(failureState(3), { seatId: "seat-2" });
    expect(wrongSeat.ok).toBe(false);
    expect(wrongSeat.state.players[0]!.character.salvage).toBe(3);

    const stale = applyFailure(failureState(3), { sourceCardId: "memory-tax-gate" });
    expect(stale.ok).toBe(false);
    expect(stale.state.players[0]!.character.salvage).toBe(3);

    const forged = applyFailure(failureState(3), { effect: { type: "lose_salvage", amount: 99 } });
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.players[0]!.character.salvage).toBe(2);
    expect(forged.state.activeResolution?.outcome?.salvageLoss).toMatchObject({ requestedLoss: 1, actualLoss: 1, resultingSalvage: 2 });

    const replay = applyFailure(forged.state);
    expect(replay.ok).toBe(false);
    expect(replay.state.players[0]!.character.salvage).toBe(2);
    expect((replay.state.eventLog as Array<{ type?: string }>).filter((event) => event.type === "RESOLUTION_APPLIED")).toHaveLength(1);
  });

  it("reconstructs pending and completed zero-delta results without replay", () => {
    const pending = failureState(0);
    expect(gameStateSchema.safeParse(pending).success).toBe(true);
    const restoredPending = new GameRoomServer(structuredClone(pending)).getState();
    expect(restoredPending.pendingEffect).toEqual({ type: "lose_salvage", amount: 1 });
    expect(restoredPending.players[0]!.character.salvage).toBe(0);

    const applied = applyFailure(restoredPending);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.activeResolution?.outcome?.salvageLoss).toMatchObject({ requestedLoss: 1, actualLoss: 0, resultingSalvage: 0 });
    expect(gameStateSchema.safeParse(applied.state).success).toBe(true);

    const restoredComplete = new GameRoomServer(structuredClone(applied.state)).getState();
    expect(restoredComplete.pendingEffect).toBeNull();
    expect(restoredComplete.players[0]!.character.salvage).toBe(0);
    expect(applyFailure(restoredComplete).ok).toBe(false);
    expect(restoredComplete.players[0]!.character.salvage).toBe(0);
  });

  it("leaves no authored Heat-linked Threat and preserves the final typed retirement", () => {
    expect(collectHeatThreatIds()).toEqual([]);
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(8);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(22);
    expect((threats.get("memory-tax-gate") as HazardThreatCard | undefined)?.failEffect).toEqual({
      type: "memory_tax_choice",
      sourceCardId: "memory-tax-gate"
    });
  });
});
