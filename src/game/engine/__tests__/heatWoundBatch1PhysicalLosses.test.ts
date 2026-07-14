import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVED_LEGACY_HEAT_CONTENT_IDS, LEGACY_HEAT_EFFECT_APPROVALS, validateLegacyHeatContentRecord } from "../../../../scripts/legacy-heat-validation.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";

const TARGETS = [
  { id: "ash-cinder-runt", branch: "woundOnLoss", cardType: "enemy", severity: 1, difficulty: 2, lane: "red", graphCount: 2, stat: "grit" },
  { id: "grave-silt-press", branch: "failEffect", cardType: "hazard", severity: 1, difficulty: 5, lane: "blue", graphCount: 2, stat: "command" },
  { id: "mirror-mite-bloom", branch: "woundOnLoss", cardType: "enemy", severity: 2, difficulty: 5, lane: "blue", graphCount: 2, stat: "signal" },
  { id: "relay-pilgrim-riot", branch: "woundOnLoss", cardType: "enemy", severity: 2, difficulty: 6, lane: "yellow", graphCount: 2, stat: "command" }
] as const;

const cards = loadThreatCards();

function unresolvedState(id: string, wounds: number, kerPrevention = false): GameState {
  const card = cards.get(id)!;
  const state = createInitialSessionState(`heat-wound-batch-1-${id}`, "single-player");
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = card;
  state.players[0]!.character.wounds = wounds;
  if (kerPrevention) state.players[0]!.character.id = "char_ker_von_ker";
  state.pendingEffect = card.cardType === "enemy" ? card.woundOnLoss! : card.failEffect;
  state.activeResolution = {
    id: `resolution-${id}`,
    playerId: "seat-1",
    source: "threat",
    stage: "roll_result",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: card.difficulty, success: false }
  };
  return state;
}

function applyBranch(id: string, wounds = 0) {
  const state = unresolvedState(id, wounds);
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect: state.pendingEffect!,
    sourceCardId: id,
    success: false,
    createdAt: "2026-07-13T22:00:00.000Z"
  });
}

function resolveThroughServer(id: string, wounds: number, kerPrevention = false): GameState {
  const card = cards.get(id)!;
  const target = TARGETS.find((entry) => entry.id === id)!;
  const state = unresolvedState(id, wounds, kerPrevention);
  state.phase = "action";
  state.pendingEffect = null;
  state.resolutionSource = null;
  state.players[0]!.character.stats[target.stat] = 0;
  state.activeResolution = {
    id: `server-resolution-${id}`,
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
    battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };
  const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 0, 5, 5]));
  if (card.cardType === "enemy") {
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: target.stat });
  } else {
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: target.stat });
  }
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
  return server.getState();
}

function countEvents(state: GameState, type: string): number {
  return (state.eventLog as Array<{ type?: string }>).filter((entry) => entry.type === type).length;
}

function collectHeatEffects(): Array<{ id: string; effect: string }> {
  const output: Array<{ id: string; effect: string }> = [];
  const walkValue = (value: unknown, id: string): void => {
    if (Array.isArray(value)) return value.forEach((entry) => walkValue(entry, id));
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (["gain_heat", "gain_heat_all", "lose_heat"].includes(String(record.type))) output.push({ id, effect: String(record.type) });
    Object.values(record).forEach((entry) => walkValue(entry, id));
  };
  const walkDirectory = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walkDirectory(path);
      else if (entry.name.endsWith(".json")) {
        const parsed = JSON.parse(readFileSync(path, "utf8")) as { id?: string };
        walkValue(parsed, parsed.id ?? "<missing-id>");
      }
    }
  };
  walkDirectory(join(process.cwd(), "content"));
  return output;
}

describe("Heat-to-Wound batch 1 physical losses", () => {
  it("authors exactly four approved one-Wound branches while preserving identity, severity, art, and availability", () => {
    for (const target of TARGETS) {
      const card = cards.get(target.id)!;
      expect(card).toMatchObject({
        id: target.id,
        cardType: target.cardType,
        severity: target.severity,
        difficulty: target.difficulty,
        threatLane: target.lane,
        stat: target.stat,
        [target.branch]: { type: "take_wound", amount: 1 }
      });
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(target.id)).toBe(false);
      expect(validateLegacyHeatContentRecord(`${target.id}.json`, card)).toEqual([]);
      expect(getRuntimeCardArtPath("threat", target.id)).toBe(`/assets/cards/threats/${target.lane}/${target.id}.png`);
      expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.threat.includes(target.id))).toHaveLength(target.graphCount);
    }
  });

  it("removes precisely four Heat effects and approvals without changing remaining discriminators", () => {
    const effects = collectHeatEffects();
    expect(new Set(effects.map((entry) => entry.id)).size).toBe(20);
    expect(effects).toHaveLength(22);
    expect(effects.filter((entry) => entry.effect === "gain_heat")).toHaveLength(15);
    expect(effects.filter((entry) => entry.effect === "gain_heat_all")).toHaveLength(3);
    expect(effects.filter((entry) => entry.effect === "lose_heat")).toHaveLength(4);
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(22);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(36);
    expect(TARGETS.every((target) => !effects.some((entry) => entry.id === target.id))).toBe(true);
  });

  it.each(TARGETS)("$id applies exactly one Wound with truthful phone/TV deltas", ({ id, cardType }) => {
    const result = applyBranch(id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character).toMatchObject({ wounds: 1, status: "active" });
    expect(result.state.currentEncounter?.id).toBe(id);
    expect(result.state.pendingEffect).toBeNull();
    expect(result.state.pendingEncounterDecision).toBeNull();
    expect(result.state.activeResolution?.outcome?.effects).toEqual(["Failure: take 1 wound."]);
    expect(cardType === "enemy" ? result.state.currentEncounter?.cardType : "hazard").toBe(cardType);
    const phone = createPhoneProjection(result.state, "seat-1", true);
    const tv = createTvProjection(result.state);
    expect(JSON.stringify(phone.publicResultDeltas)).not.toMatch(/\bHeat\b|\bRisk\b|take_wound/);
    expect(JSON.stringify(tv.publicResultDeltas)).not.toMatch(/\bHeat\b|\bRisk\b|take_wound/);
    expect(phone.publicResultDeltas).toEqual(expect.arrayContaining([expect.objectContaining({ type: "wound", value: 1 })]));
  });

  it.each(TARGETS)("$id respects existing Ker prevention without a false Wound result", ({ id }) => {
    const state = resolveThroughServer(id, 0, true);
    expect(state.players[0]!.character.wounds).toBe(0);
    expect(state.players[0]!.private.notes).toContain("Hold the Line prevented 1 Wound.");
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(0);
    expect(createPhoneProjection(state, "seat-1", true).publicResultDeltas ?? []).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "wound", value: 1 })])
    );
  });

  it.each(TARGETS)("$id reaches recall only through the existing Wound threshold", ({ id }) => {
    const threshold = unresolvedState(id, 0).woundThreshold;
    const state = resolveThroughServer(id, threshold - 1);
    expect(state.players[0]!.character).toMatchObject({ wounds: threshold, status: "recalled" });
    expect(state.players[0]!.character.scars).toHaveLength(1);
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(1);
  });

  it("preserves the hazard success and all three enemy reward branches", () => {
    const hazard = cards.get("grave-silt-press")!;
    expect(hazard.cardType).toBe("hazard");
    if (hazard.cardType === "hazard") expect(hazard.successEffect).toEqual({ type: "gain_note", text: "You forced a path through the sink line and marked it for later." });
    for (const id of ["ash-cinder-runt", "mirror-mite-bloom", "relay-pilgrim-riot"]) {
      const card = cards.get(id)!;
      expect(card.cardType).toBe("enemy");
      if (card.cardType === "enemy") expect(card.defeatReward).toMatchObject({ type: "gain_note" });
    }
  });

  it("round-trips an unresolved branch and continuation cannot apply it twice", () => {
    const source = unresolvedState("grave-silt-press", 0);
    expect(gameStateSchema.safeParse(source).success).toBe(true);
    const restored = new GameRoomServer(structuredClone(source));
    const applied = reduceGameState(restored.getState(), {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: source.pendingEffect!,
      sourceCardId: "grave-silt-press",
      success: false,
      createdAt: "2026-07-13T22:01:00.000Z"
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const continued = new GameRoomServer(applied.state);
    continued.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    expect(() => continued.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" })).toThrow("No active resolution is waiting to continue");
    expect(continued.getState().players[0]!.character.wounds).toBe(1);
    expect(countEvents(continued.getState(), "RESOLUTION_APPLIED")).toBe(1);
  });
});
