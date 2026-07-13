import { describe, expect, it } from "vitest";
import { APPROVED_LEGACY_HEAT_CONTENT_IDS, validateLegacyHeatContentRecord } from "../../../../scripts/legacy-heat-validation.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const TARGETS = [
  { id: "bell-mask-pilgrim", branch: "woundOnLoss", cardType: "enemy", severity: 1, difficulty: 5, lane: "blue" },
  { id: "cracked-censer-novice", branch: "woundOnLoss", cardType: "enemy", severity: 1, difficulty: 3, lane: "blue" },
  { id: "glasswing-midge-cloud", branch: "woundOnLoss", cardType: "enemy", severity: 1, difficulty: 4, lane: "blue" },
  { id: "roadside-bone-oracle", branch: "failEffect", cardType: "hazard", severity: 1, difficulty: 5, lane: "blue" }
] as const;

const cards = loadThreatCards();

function unresolvedState(id: string, wounds: number, kerPrevention = false): GameState {
  const card = cards.get(id)!;
  const state = createInitialSessionState(`phase-1x-${id}`, "single-player");
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

function applyLoss(id: string, wounds: number, kerPrevention = false) {
  const state = unresolvedState(id, wounds, kerPrevention);
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect: state.pendingEffect!,
    sourceCardId: id,
    success: false,
    createdAt: "2026-07-13T21:00:00.000Z"
  });
}

function countEvents(state: GameState, type: string): number {
  return (state.eventLog as Array<{ type?: string }>).filter((entry) => entry.type === type).length;
}

function resolveThroughServer(id: string, wounds: number, kerPrevention = false): GameState {
  const card = cards.get(id)!;
  const state = unresolvedState(id, wounds, kerPrevention);
  state.phase = "action";
  state.pendingEffect = null;
  state.resolutionSource = null;
  state.players[0]!.character.stats.signal = 0;
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
    server.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: "signal" });
  } else {
    server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });
  }
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
  return server.getState();
}

describe("Phase 1X four Wound conversions", () => {
  it("replaces exactly the four approved Heat branches while preserving identity and availability", () => {
    for (const target of TARGETS) {
      const card = cards.get(target.id)!;
      expect(card).toMatchObject({
        id: target.id,
        cardType: target.cardType,
        severity: target.severity,
        difficulty: target.difficulty,
        threatLane: target.lane,
        [target.branch]: { type: "take_wound", amount: 1 }
      });
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(target.id)).toBe(false);
      expect(validateLegacyHeatContentRecord(`${target.id}.json`, card)).toEqual([]);
      expect(getRuntimeCardArtPath("threat", target.id)).toBe(`/assets/cards/threats/blue/${target.id}.png`);
      expect(createCanonicalSectorGraph().some((sector) => sector.encounterDecks.threat.includes(target.id))).toBe(true);
    }
  });

  it.each(TARGETS)("$id applies exactly one Wound and leaves the encounter present for normal continuation", ({ id, cardType }) => {
    const result = applyLoss(id, 0);
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
  });

  it.each(TARGETS)("$id uses the established Ker prevention without a false Wound delta", ({ id }) => {
    const state = resolveThroughServer(id, 0, true);
    expect(state.players[0]!.character.wounds).toBe(0);
    expect(state.players[0]!.private.notes).toContain("Hold the Line prevented 1 Wound.");
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(0);
  });

  it.each(TARGETS)("$id invokes the existing recall path at the Wound threshold", ({ id }) => {
    const threshold = unresolvedState(id, 0).woundThreshold;
    const state = resolveThroughServer(id, threshold - 1);
    expect(state.players[0]!.character).toMatchObject({ wounds: threshold, status: "recalled" });
    expect(state.players[0]!.character.scars).toHaveLength(1);
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(1);
  });

  it("preserves Roadside Bone Oracle success and each enemy reward branch", () => {
    const oracle = cards.get("roadside-bone-oracle")!;
    expect(oracle.cardType).toBe("hazard");
    if (oracle.cardType === "hazard") expect(oracle.successEffect).toEqual({ type: "gain_note", text: "The oracle traded a clean route omen for your patience." });
    for (const id of TARGETS.slice(0, 3).map((target) => target.id)) {
      const card = cards.get(id)!;
      expect(card.cardType).toBe("enemy");
      if (card.cardType === "enemy") expect(card.defeatReward).toMatchObject({ type: "gain_note" });
    }
  });

  it("round-trips an unresolved branch and cannot replay it after continuation", () => {
    const source = unresolvedState("roadside-bone-oracle", 0);
    expect(gameStateSchema.safeParse(source).success).toBe(true);
    const restored = new GameRoomServer(structuredClone(source));
    const applied = reduceGameState(restored.getState(), {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: source.pendingEffect!,
      sourceCardId: "roadside-bone-oracle",
      success: false,
      createdAt: "2026-07-13T21:01:00.000Z"
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const continued = new GameRoomServer(applied.state);
    continued.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    expect(continued.getState().players[0]!.character.wounds).toBe(1);
    expect(countEvents(continued.getState(), "RESOLUTION_APPLIED")).toBe(1);
  });
});
