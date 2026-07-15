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
import type { EncounterEffect, EnemyThreatCard, HazardThreatCard } from "../../schema/card.schema.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";

const TARGETS = [
  {
    id: "crown-bell-baron",
    title: "Crown-Bell Baron",
    stat: "command",
    difficulty: 7,
    severity: 3,
    region: "middle",
    rarity: "uncommon",
    trophyValue: 2,
    graphCount: 1,
    defeatReward: { type: "gain_note", text: "You seize the Baron's stamped writ case and expose a route-fee fraud." }
  },
  {
    id: "pale-contract-collector",
    title: "Pale Contract Collector",
    stat: "command",
    difficulty: 8,
    severity: 2,
    region: "outer",
    rarity: "common",
    trophyValue: 2,
    graphCount: 2,
    defeatReward: { type: "gain_trophy", amount: 2 }
  },
  {
    id: "soot-stained-cutpurse",
    title: "Soot-Stained Cutpurse",
    stat: "guile",
    difficulty: 3,
    severity: 1,
    region: "outer",
    rarity: "common",
    trophyValue: 1,
    graphCount: 2,
    defeatReward: { type: "gain_note", text: "You catch the cutpurse and recover a useful market rumor." }
  }
] as const;

const BLOCKED_HEAT_THREAT_IDS = [
  "false-route-procession",
  "gateblind-pulse",
  "marrow-tax-auditors",
  "memory-tax-gate"
] as const;

const threats = loadThreatCards();

function requireEnemy(id: string): EnemyThreatCard {
  const card = threats.get(id);
  if (!card || card.cardType !== "enemy") throw new Error(`Missing H3 enemy ${id}`);
  return card;
}

function requireHazard(id: string): HazardThreatCard {
  const card = threats.get(id);
  if (!card || card.cardType !== "hazard") throw new Error(`Missing regression hazard ${id}`);
  return card;
}

function lossEffect(card: EnemyThreatCard): EncounterEffect {
  if (!card.woundOnLoss) throw new Error(`Missing H3 loss effect ${card.id}`);
  return card.woundOnLoss;
}

function resolutionState(card: EnemyThreatCard, salvage: number): GameState {
  const state = createInitialSessionState(`h3-${card.id}-${salvage}`, "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = card;
  state.pendingEffect = lossEffect(card);
  player.character.salvage = salvage;
  state.activeResolution = {
    id: `${card.id}:failed-battle`,
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: card.difficulty, success: false }
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
    summary: `${card.title} battle failed.`
  };
  return state;
}

function applyFailure(state: GameState, card: EnemyThreatCard) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: state.players[0]!.seatId,
    effect: lossEffect(card),
    sourceCardId: card.id,
    success: false,
    createdAt: `h3-${card.id}-failure`
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

describe("Heat Retirement H3 floor-zero Salvage Threats", () => {
  it("authors exactly the three approved automatic losses while preserving identity, rewards, graph placement, art, and totals", () => {
    expect(THREAT_REVISION_SALVAGE_LOSS_SOURCE_IDS).toEqual(new Set([
      "crown-bell-baron",
      "glass-tick-cloud",
      "locked-vault",
      "pale-contract-collector",
      "soot-stained-cutpurse"
    ]));
    for (const target of TARGETS) {
      const card = requireEnemy(target.id);
      expect(card).toMatchObject({
        id: target.id,
        title: target.title,
        cardType: "enemy",
        threatLane: "yellow",
        stat: target.stat,
        difficulty: target.difficulty,
        severity: target.severity,
        region: target.region,
        rarity: target.rarity,
        trophyValue: target.trophyValue,
        defeatReward: target.defeatReward,
        woundOnLoss: { type: "lose_salvage", amount: 1 }
      });
      expect(card.text).toMatch(/If you lose, lose up to 1 Salvage\.$/);
      expect(card.resourceTags).toContain("salvage");
      expect(card.resourceTags).not.toContain("heat");
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(JSON.stringify(card.woundOnLoss)).not.toMatch(/wound|scar|movement|equipment|escalation/i);
      expect(validateLegacyHeatContentRecord(`${target.id}.json`, card)).toEqual([]);
      expect(APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS.has(target.id)).toBe(true);
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(target.id)).toBe(false);
      expect(getRuntimeCardArtPath("threat", target.id)).toBe(`/assets/cards/threats/yellow/${target.id}.png`);
      expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.threat.includes(target.id))).toHaveLength(target.graphCount);
    }
    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
  });

  it.each(TARGETS)("$id applies the approved floor-zero actual loss at 3, 1, and 0 Salvage", (target) => {
    const card = requireEnemy(target.id);
    for (const [startingSalvage, actualLoss, resultingSalvage, text] of [
      [3, 1, 2, "Lost 1 Salvage."],
      [1, 1, 0, "Lost 1 Salvage."],
      [0, 0, 0, "No Salvage to lose."]
    ] as const) {
      const state = resolutionState(card, startingSalvage);
      const player = state.players[0]!;
      player.character.wounds = 2;
      player.character.scars = ["scar-wound-1"];
      player.character.heldGear.push(loadGear().get("salvage-ledger")!);
      player.character.activeContract = { contractId: "compact-equipment-requisition", progress: 0, salvageSpent: 0 };
      player.character.completedContracts = ["sealed-contract"];
      const before = structuredClone({
        wounds: player.character.wounds,
        scars: player.character.scars,
        sectorId: player.sectorId,
        heldGear: player.character.heldGear,
        activeContract: player.character.activeContract,
        completedContracts: player.character.completedContracts,
        escalationLevel: state.escalationLevel,
        scenarioProgress: state.scenarioProgress,
        shopStockReveals: state.shopStockReveals
      });

      const result = applyFailure(state, card);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const resolved = result.state.players[0]!;
      expect(resolved.character.salvage).toBe(resultingSalvage);
      expect({
        wounds: resolved.character.wounds,
        scars: resolved.character.scars,
        sectorId: resolved.sectorId,
        heldGear: resolved.character.heldGear,
        activeContract: resolved.character.activeContract,
        completedContracts: resolved.character.completedContracts,
        escalationLevel: result.state.escalationLevel,
        scenarioProgress: result.state.scenarioProgress,
        shopStockReveals: result.state.shopStockReveals
      }).toEqual(before);
      expect(result.state.activeResolution?.outcome).toMatchObject({
        text,
        effects: [text],
        salvageLoss: { requestedLoss: 1, actualLoss, resultingSalvage, sourceCardId: target.id }
      });
      expect(result.state.eventLog.some((event) => /SHOP|COMPLETE_CONTRACT|MISSION|ENCOUNTER_PAYMENT/.test((event as { type?: string }).type ?? ""))).toBe(false);

      const phone = createPhoneProjection(result.state, "seat-1", true) as { activeResolution?: { outcome?: { salvageLoss?: unknown; text?: string } } | null; publicResultDeltas?: unknown };
      const tv = createTvProjection(result.state) as { activeResolution?: { outcome?: { salvageLoss?: unknown; text?: string } } | null; publicResultDeltas?: unknown };
      expect(phone.activeResolution?.outcome?.salvageLoss).toEqual(result.state.activeResolution?.outcome?.salvageLoss);
      expect(tv.activeResolution?.outcome?.text).toBe(text);
      expect(JSON.stringify({ phone: phone.activeResolution, phoneDeltas: phone.publicResultDeltas, tv: tv.activeResolution, tvDeltas: tv.publicResultDeltas })).not.toMatch(/\bHeat\b|\bRisk\b|lose_salvage|encounter_payment|shopTransaction/i);
    }
  });

  it.each(TARGETS)("$id victory preserves its reward and trophy lifecycle without creating Salvage loss", (target) => {
    const card = requireEnemy(target.id);
    const state = createInitialSessionState(`h3-${target.id}-victory`, "single-player");
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = card;
    state.players[0]!.character.stats[target.stat] = 20;
    state.players[0]!.character.salvage = 3;
    state.players[0]!.character.trophies = 0;
    state.players[0]!.character.trophyPile = [];
    state.activeResolution = {
      id: `h3-${target.id}-victory`,
      playerId: "seat-1",
      source: "threat",
      stage: "card_reveal",
      card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
      battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
    };
    const server = new GameRoomServer(state, [], createSequenceRandomSource([5, 5]));
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: target.stat });
    const opened = server.getState();
    expect(opened.pendingEffect).toEqual(target.defeatReward);
    expect(opened.players[0]!.character.salvage).toBe(3);
    const applied = reduceGameState(opened, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: opened.pendingEffect!,
      sourceCardId: target.id,
      success: true,
      createdAt: `h3-${target.id}-reward`
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const resolved = applied.state;
    expect(resolved.players[0]!.character.salvage).toBe(3);
    expect(resolved.pendingEffect).toBeNull();
    expect(resolved.players[0]!.character.trophyPile).toContainEqual(expect.objectContaining({
      cardId: target.id,
      trophyValue: target.trophyValue,
      stat: target.stat,
      cardType: "enemy"
    }));
    expect(resolved.players[0]!.character.trophies).toBe(target.trophyValue + (target.id === "pale-contract-collector" ? 2 : 0));
    if (target.defeatReward.type === "gain_note") expect(resolved.players[0]!.private.notes).toContain(target.defeatReward.text);
    expect(JSON.stringify(resolved.activeResolution?.outcome)).not.toMatch(/Salvage|lose_salvage|Heat|Risk/i);
  });

  it.each(TARGETS)("$id rejects wrong-seat, stale-source, forged-effect, and replay attempts", (target) => {
    const card = requireEnemy(target.id);
    for (const action of [
      { seatId: "seat-2", effect: lossEffect(card), sourceCardId: card.id },
      { seatId: "seat-1", effect: lossEffect(card), sourceCardId: "stale-card" }
    ]) {
      const state = resolutionState(card, 3);
      const rejected = reduceGameState(state, { type: "RESOLUTION_APPLIED", ...action, success: false, createdAt: "h3-rejected" });
      expect(rejected.ok).toBe(false);
      expect(rejected.state.players[0]!.character.salvage).toBe(3);
    }

    const forged = reduceGameState(resolutionState(card, 3), {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: { type: "lose_salvage", amount: 2 },
      sourceCardId: card.id,
      success: false,
      createdAt: "h3-forged"
    });
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.players[0]!.character.salvage).toBe(2);
    expect(forged.state.activeResolution?.outcome?.salvageLoss).toMatchObject({ requestedLoss: 1, actualLoss: 1, resultingSalvage: 2, sourceCardId: card.id });

    const first = applyFailure(resolutionState(card, 3), card);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const replay = reduceGameState(first.state, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: lossEffect(card),
      sourceCardId: card.id,
      success: false,
      createdAt: "h3-replay"
    });
    expect(replay.ok).toBe(false);
    expect(replay.state.players[0]!.character.salvage).toBe(2);
    expect((replay.state.eventLog as Array<{ type?: string }>).filter((event) => event.type === "RESOLUTION_APPLIED")).toHaveLength(1);
  });

  it.each(TARGETS)("$id reconnects before and after resolution without loss replay", (target) => {
    const card = requireEnemy(target.id);
    const pending = resolutionState(card, 2);
    expect(gameStateSchema.safeParse(pending).success).toBe(true);
    const restoredPending = new GameRoomServer(structuredClone(pending)).getState();
    expect(restoredPending.pendingEffect).toEqual({ type: "lose_salvage", amount: 1 });
    expect(restoredPending.players[0]!.character.salvage).toBe(2);
    const applied = applyFailure(restoredPending, card);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(gameStateSchema.safeParse(applied.state).success).toBe(true);
    const restoredComplete = new GameRoomServer(structuredClone(applied.state)).getState();
    expect(restoredComplete.pendingEffect).toBeNull();
    expect(restoredComplete.players[0]!.character.salvage).toBe(1);
    expect(applyFailure(restoredComplete, card).ok).toBe(false);
    expect(restoredComplete.players[0]!.character.salvage).toBe(1);
  });

  it("preserves B2A, H1, H2, Glass-Chime, Spindle, Siren, and the four blocked cards after H5B", () => {
    expect(collectHeatThreatIds()).toEqual([...BLOCKED_HEAT_THREAT_IDS].sort());
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(12);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(26);
    expect(requireEnemy("crown-bell-baron").woundOnLoss).toEqual({ type: "lose_salvage", amount: 1 });
    expect(requireHazard("glass-tick-cloud").failEffect).toEqual({ type: "lose_salvage", amount: 1 });
    expect(requireHazard("locked-vault").failEffect).toEqual({ type: "lose_salvage", amount: 1 });
    expect(requireHazard("choir-static-burst").failEffect).toEqual({ type: "take_wound", amount: 1 });
    expect(requireHazard("lantern-moth-swarm").failEffect).toEqual({ type: "take_wound", amount: 1 });
    expect(requireHazard("glass-chime-swarm").failEffect).toEqual({ type: "next_non_battle_test_modifier", amount: -1, sourceCardId: "glass-chime-swarm" });
    expect(requireHazard("spindle-static-squall").failEffect).toEqual({ type: "next_normal_movement_roll_modifier", amount: -1, minimumResult: 1, sourceCardId: "spindle-static-squall" });
    for (const id of ["cinder-gate-backlash", "mirror-rot-interference", "webglass-snarefield"]) {
      expect(requireHazard(id).successEffect).toBeUndefined();
    }
  });
});
