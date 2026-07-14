import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPROVED_LEGACY_HEAT_CONTENT_IDS,
  LEGACY_HEAT_EFFECT_APPROVALS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import { loadAnomalyCards } from "../../content/anomalies.js";
import { loadContracts } from "../../content/contracts.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { reduceGameState } from "../reducer.js";

const TARGET_IDS = [
  "anomaly-bellrain-inversion",
  "compact-equipment-requisition",
  "latchspire-raider"
] as const;

const anomaly = loadAnomalyCards().get("anomaly-bellrain-inversion")!;
const contract = loadContracts().get("compact-equipment-requisition")!;
const raider = loadThreatCards().get("latchspire-raider")!;

function rewardState(id: string, effect: EncounterEffect): GameState {
  const state = createInitialSessionState(`heat-salvage-batch-1-${id}`, "single-player");
  state.status = "active";
  state.phase = "resolution";
  state.pendingEffect = effect;
  state.players[0]!.character.salvage = 2;
  state.activeResolution = {
    id: `resolution-${id}`,
    playerId: "seat-1",
    source: id.startsWith("anomaly-") ? "anomaly" : "threat",
    stage: "roll_result",
    card: { id, title: id, type: id.startsWith("anomaly-") ? "anomaly" : "enemy", flavor: "", artType: id.startsWith("anomaly-") ? "anomaly" : "threat" },
    roll: { dice: [6, 6], baseTotal: 12, modifierTotal: 0, finalTotal: 12, target: 1, success: true }
  };
  return state;
}

function applyReward(id: string, effect: EncounterEffect) {
  const state = rewardState(id, effect);
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect,
    sourceCardId: id,
    success: true,
    createdAt: "2026-07-13T23:00:00.000Z"
  });
}

function collectEffects(type: "gain_heat" | "gain_heat_all" | "lose_heat" | "gain_salvage") {
  const found: string[] = [];
  const scan = (value: unknown, id: string): void => {
    if (Array.isArray(value)) return value.forEach((entry) => scan(entry, id));
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (record.type === type) found.push(id);
    Object.values(record).forEach((entry) => scan(entry, id));
  };
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".json")) {
        const parsed = JSON.parse(readFileSync(path, "utf8")) as { id?: string };
        scan(parsed, parsed.id ?? "<missing-id>");
      }
    }
  };
  walk(join(process.cwd(), "content"));
  return found;
}

describe("Heat-to-Salvage reward batch 1", () => {
  it("authors exactly the three approved one-Salvage rewards and preserves identity and availability", () => {
    expect(anomaly).toMatchObject({
      id: "anomaly-bellrain-inversion",
      instability: 1,
      resolveEffect: { type: "gain_salvage", amount: 1 }
    });
    expect(contract).toMatchObject({
      id: "compact-equipment-requisition",
      objective: {
        type: "shopTransaction",
        action: "buyEquipment",
        requiredShopType: "shop",
        requiredCount: 1,
        minimumSalvageSpent: 1
      },
      reward: { type: "gain_salvage", amount: 1 }
    });
    expect(raider).toMatchObject({
      id: "latchspire-raider",
      cardType: "enemy",
      severity: 2,
      difficulty: 6,
      trophyValue: 6,
      threatLane: "yellow",
      region: "outer",
      defeatReward: { type: "gain_salvage", amount: 1 },
      woundOnLoss: { type: "take_wound", amount: 1 }
    });
    expect(getRuntimeCardArtPath("anomaly", anomaly.id)).toBe("/assets/cards/anomalies/anomaly-bellrain-inversion.png");
    expect(getRuntimeCardArtPath("threat", raider.id)).toBe("/assets/cards/threats/yellow/latchspire-raider.png");
    expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.anomaly.includes(anomaly.id))).toHaveLength(3);
    expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.threat.includes(raider.id))).toHaveLength(1);
    for (const record of [anomaly, contract, raider]) {
      expect(JSON.stringify(record)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(record.id)).toBe(false);
      expect(validateLegacyHeatContentRecord(`${record.id}.json`, record)).toEqual([]);
    }
  });

  it("reconciles the exact post-batch Heat and Salvage populations", () => {
    const gainHeat = collectEffects("gain_heat");
    const gainHeatAll = collectEffects("gain_heat_all");
    const loseHeat = collectEffects("lose_heat");
    const heatIds = new Set([...gainHeat, ...gainHeatAll, ...loseHeat]);
    expect(heatIds.size).toBe(15);
    expect(gainHeat).toHaveLength(10);
    expect(gainHeatAll).toHaveLength(3);
    expect(loseHeat).toHaveLength(3);
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(17);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(31);
    expect(collectEffects("gain_salvage")).toHaveLength(10);
    expect(TARGET_IDS.every((id) => !heatIds.has(id))).toBe(true);
  });

  it.each([
    ["anomaly-bellrain-inversion", anomaly.resolveEffect],
    ["latchspire-raider", raider.cardType === "enemy" ? raider.defeatReward : null]
  ] as const)("%s grants exactly one Salvage once with truthful projections", (id, effect) => {
    expect(effect).not.toBeNull();
    const result = applyReward(id, effect!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character.salvage).toBe(3);
    expect(result.state.pendingEffect).toBeNull();
    expect(result.state.activeResolution?.outcome?.effects).toEqual(["Success: gain 1 Salvage."]);
    const phone = createPhoneProjection(result.state, "seat-1", true);
    const tv = createTvProjection(result.state);
    expect(result.state.activeResolution?.outcome?.text).toContain("gain 1 Salvage");
    expect(phone.publicResultDeltas ?? []).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: "salvage", sign: "loss" })]));
    expect(tv.publicResultDeltas ?? []).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: "salvage", sign: "loss" })]));
    expect(JSON.stringify(result.state.activeResolution?.outcome)).not.toMatch(/\bHeat\b|\bRisk\b|gain_salvage/);
    expect(JSON.stringify({ phone: phone.publicResultDeltas, tv: tv.publicResultDeltas })).not.toMatch(/\bHeat\b|\bRisk\b|gain_salvage/);

    const replay = reduceGameState(result.state, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: effect!,
      sourceCardId: id,
      success: true,
      createdAt: "2026-07-13T23:01:00.000Z"
    });
    expect(replay.ok).toBe(false);
    expect(replay.state.players[0]!.character.salvage).toBe(3);
    const restored = new GameRoomServer(structuredClone(result.state));
    expect(restored.getState().players[0]!.character.salvage).toBe(3);
  });

  it("Latchspire Raider loss grants no Salvage and preserves its Wound consequence", () => {
    expect(raider.cardType).toBe("enemy");
    if (raider.cardType !== "enemy") return;
    const result = applyReward(raider.id, raider.woundOnLoss!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character.salvage).toBe(2);
    expect(result.state.players[0]!.character.wounds).toBe(1);
    expect(raider.trophyValue).toBe(6);
  });

  it("Equipment Requisition pays only through canonical completion and cannot replay", () => {
    const state = createInitialSessionState("heat-salvage-contract", "single-player");
    state.status = "active";
    state.phase = "action";
    state.players[0]!.character.salvage = 2;
    state.players[0]!.character.activeContract = { contractId: contract.id, progress: 0, salvageSpent: 0 };
    const heldBefore = structuredClone(state.players[0]!.character.heldGear);
    const action = { type: "COMPLETE_CONTRACT" as const, seatId: "seat-1", contractId: contract.id, contract, createdAt: "2026-07-13T23:02:00.000Z" };

    const early = reduceGameState(state, action);
    expect(early.ok).toBe(false);
    expect(early.state.players[0]!.character.salvage).toBe(2);
    expect(early.state.players[0]!.character.completedContracts ?? []).not.toContain(contract.id);

    state.players[0]!.character.activeContract = { contractId: contract.id, progress: 1, salvageSpent: 1 };
    const completed = reduceGameState(state, action);
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.state.players[0]!.character.salvage).toBe(3);
    expect(completed.state.players[0]!.character.completedContracts).toEqual([contract.id]);
    expect(completed.state.players[0]!.character.activeContract).toBeNull();
    expect(completed.state.players[0]!.character.heldGear).toEqual(heldBefore);
    expect(completed.state.lastOutcomeSummary?.summary).toMatch(/gain 1 Salvage\./i);
    expect((completed.state.eventLog as Array<{ type?: string }>).filter((entry) => entry.type === "COMPLETE_CONTRACT")).toHaveLength(1);

    const duplicate = reduceGameState(completed.state, action);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state.players[0]!.character.salvage).toBe(3);
    expect(duplicate.state.players[0]!.character.completedContracts).toEqual([contract.id]);
    const restored = new GameRoomServer(structuredClone(completed.state));
    expect(restored.getState().players[0]!.character.salvage).toBe(3);
    expect(restored.getState().players[0]!.character.completedContracts).toEqual([contract.id]);
  });

  it("continues rejecting newly authored Heat without broadening schema or economy authority", () => {
    expect(validateLegacyHeatContentRecord("new.json", { id: "new-heat", reward: { type: "lose_heat", amount: 1 } })[0]).toMatch(/blocked legacy Heat construct/);
    expect(validateLegacyHeatContentRecord("new.json", { id: "new-reward", reward: { type: "gain_salvage", amount: 1 } })).toEqual([]);
  });
});
