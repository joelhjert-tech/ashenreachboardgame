import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVED_LEGACY_HEAT_CONTENT_IDS, validateLegacyHeatContentRecord } from "../../../../scripts/legacy-heat-validation.js";
import { loadThreatCards } from "../../content/threats.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const card = loadThreatCards().get("void-salt-sickness")!;

function countEvents(state: GameState, type: string): number {
  return (state.eventLog as Array<{ type?: string }>).filter((entry) => entry.type === type).length;
}

function unresolvedState(wounds: number, kerPrevention = false): GameState {
  const state = createInitialSessionState("void-salt-wounds", "single-player");
  state.status = "active";
  state.phase = "action";
  state.resolutionSource = null;
  state.currentEncounter = card;
  state.players[0]!.character.wounds = wounds;
  if (kerPrevention) state.players[0]!.character.id = "char_ker_von_ker";
  state.activeResolution = {
    id: "void-salt-resolution",
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
    battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };
  return state;
}

function resolve(wounds: number, success: boolean, kerPrevention = false): GameRoomServer {
  const random = success ? [5, 5] : [0, 0];
  const state = unresolvedState(wounds, kerPrevention);
  if (!success) state.players[0]!.character.stats.forge = 0;
  const server = new GameRoomServer(state, [], createSequenceRandomSource(random));
  server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "forge" });
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
  return server;
}

describe("Phase 1V Void-Salt Sickness Wound conversion", () => {
  it("keeps the stable active card identity while replacing both Heat branches in place", () => {
    expect(card).toMatchObject({
      id: "void-salt-sickness",
      title: "Void-Salt Sickness",
      cardType: "hazard",
      severity: 1,
      threatLane: "blue",
      stat: "forge",
      difficulty: 5,
      region: "outer",
      rarity: "common",
      successEffect: { type: "heal_wound", amount: 1 },
      failEffect: { type: "take_wound", amount: 1 }
    });
    expect(JSON.stringify(card)).not.toMatch(/gain_heat|lose_heat|\bHeat\b|\bRisk\b/i);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(card.id)).toBe(false);
    expect(validateLegacyHeatContentRecord("void-salt-sickness.json", card)).toEqual([]);

    const activeSectors = createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.threat.includes(card.id));
    expect(activeSectors.map((sector) => sector.id).sort()).toEqual(["mirecoil-beacon", "outer_salt_flats"]);
    expect(activeSectors.every((sector) => sector.regionTier === "borderlight")).toBe(true);
    const authoredBorderlight = JSON.parse(readFileSync(join(process.cwd(), "content", "sectors", "borderlight.json"), "utf8")) as {
      nodes: Array<{ encounterDecks: { threat: string[] } }>;
    };
    expect(authoredBorderlight.nodes.some((sector) => sector.encounterDecks.threat.includes(card.id))).toBe(true);
    expect(getRuntimeCardArtPath("threat", card.id)).toBe("/assets/cards/threats/blue/void-salt-sickness.png");
  });

  it.each([
    [2, 1, true],
    [1, 0, true],
    [0, 0, false]
  ] as const)("heals from %i Wounds to %i and reports only actual healing", (before, after, reportsHealing) => {
    const server = resolve(before, true);
    const state = server.getState();
    expect(state.players[0]!.character.wounds).toBe(after);
    const phoneDeltas = createPhoneProjection(state, "seat-1", true).publicResultDeltas ?? [];
    const tvDeltas = createTvProjection(state).publicResultDeltas ?? [];
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(1);
    expect(JSON.stringify(phoneDeltas)).not.toMatch(/\bHeat\b|\bRisk\b/i);
    expect(JSON.stringify(tvDeltas)).not.toMatch(/\bHeat\b|\bRisk\b/i);

    const presentationState = unresolvedState(before);
    presentationState.phase = "resolution";
    presentationState.pendingEffect = { type: "heal_wound", amount: 1 };
    const presented = reduceGameState(presentationState, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: presentationState.pendingEffect,
      sourceCardId: card.id,
      success: true,
      createdAt: "2026-07-13T00:00:00.000Z"
    });
    expect(presented.ok).toBe(true);
    if (presented.ok) {
      expect(presented.state.activeResolution?.outcome?.effects.some((entry) => /Healed 1 Wound/.test(entry))).toBe(reportsHealing);
    }
  });

  it("applies one Wound below threshold and invokes existing recall at the threshold", () => {
    const below = resolve(0, false).getState();
    expect(below.players[0]!.character).toMatchObject({ wounds: 1, status: "active" });
    expect(countEvents(below, "RESOLUTION_APPLIED")).toBe(1);

    const threshold = unresolvedState(0).woundThreshold;
    const recalled = resolve(threshold - 1, false).getState();
    expect(recalled.players[0]!.character).toMatchObject({ wounds: threshold, status: "recalled" });
    expect(recalled.players[0]!.character.scars).toHaveLength(1);
    expect(countEvents(recalled, "WOUND_THRESHOLD_REACHED")).toBe(1);
  });

  it("respects the existing Ker Wound prevention path without a false mutation", () => {
    const state = resolve(0, false, true).getState();
    expect(state.players[0]!.character.wounds).toBe(0);
    expect(state.players[0]!.private.notes).toContain("Hold the Line prevented 1 Wound.");
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(0);
  });

  it("round-trips an unresolved active encounter and resolves its branch exactly once", () => {
    const source = unresolvedState(1);
    expect(gameStateSchema.safeParse(source).success).toBe(true);
    const restored = new GameRoomServer(structuredClone(source), [], createSequenceRandomSource([5, 5]));
    expect(restored.getState().currentEncounter?.id).toBe(card.id);
    expect(restored.getState().pendingEffect).toBeNull();

    restored.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "forge" });
    restored.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    restored.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    (restored as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    expect(restored.getState().players[0]!.character.wounds).toBe(0);
    expect(countEvents(restored.getState(), "CHECK_ROLLED")).toBe(1);
    expect(countEvents(restored.getState(), "RESOLUTION_APPLIED")).toBe(1);
  });
});
