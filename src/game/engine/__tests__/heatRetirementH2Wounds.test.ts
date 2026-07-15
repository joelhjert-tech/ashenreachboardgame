import { describe, expect, it } from "vitest";
import {
  APPROVED_LEGACY_HEAT_CONTENT_IDS,
  LEGACY_HEAT_EFFECT_APPROVALS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import { loadGear } from "../../content/gear.js";
import { loadThreatCards } from "../../content/threats.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import {
  HAZARD_SUCCESS_EFFECT_RETIREMENT_IDS,
  hazardThreatCardSchema,
  type HazardThreatCard
} from "../../schema/card.schema.js";
import { gameStateSchema, type GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection, GameRoomServer } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";

const TARGETS = [
  {
    id: "choir-static-burst",
    title: "Choir-Static Burst",
    difficulty: 9,
    severity: 3,
    region: "middle",
    rarity: "uncommon",
    graphCount: 4,
    successEffect: {
      type: "advance_scenario",
      progressKey: "choirStaticContained",
      amount: 1,
      summary: "Choir-static was contained and converted into scenario leverage."
    }
  },
  {
    id: "lantern-moth-swarm",
    title: "Lantern-Moth Swarm",
    difficulty: 5,
    severity: 1,
    region: "outer",
    rarity: "common",
    graphCount: 2,
    successEffect: undefined
  }
] as const;

const REMAINING_HEAT_THREAT_IDS = [
] as const;

const threats = loadThreatCards();

type PhoneProjection = {
  activeResolution?: { outcome?: { text?: string; effects?: unknown[] } } | null;
  publicResultDeltas?: Array<{ type?: string; value?: number; source?: string; publicText?: string }>;
  playerResultDeltas?: Array<{ type?: string; value?: number; source?: string; publicText?: string }>;
  objectUseStates?: Array<{ id: string; disabledReason?: string | null }>;
  self?: unknown;
};

function requireTarget(id: string): HazardThreatCard {
  const card = threats.get(id);
  if (!card || card.cardType !== "hazard") throw new Error(`Missing H2 hazard ${id}`);
  return card;
}

function countEvents(state: GameState, type: string): number {
  return (state.eventLog as Array<{ type?: string }>).filter((entry) => entry.type === type).length;
}

function createEncounterState(card: HazardThreatCard, wounds = 0, kerPrevention = false): GameState {
  const state = createInitialSessionState(`h2-${card.id}-${wounds}-${kerPrevention}`, "single-player");
  state.status = "active";
  state.phase = "action";
  state.resolutionSource = null;
  state.currentEncounter = card;
  state.players[0]!.character.stats.signal = 0;
  state.players[0]!.character.wounds = wounds;
  if (kerPrevention) state.players[0]!.character.id = "char_ker_von_ker";
  state.activeResolution = {
    id: `h2-resolution-${card.id}-${wounds}-${kerPrevention}`,
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
    battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };
  return state;
}

function openCheck(card: HazardThreatCard, fail: boolean, wounds = 0, kerPrevention = false): GameRoomServer {
  const server = new GameRoomServer(
    createEncounterState(card, wounds, kerPrevention),
    [],
    createSequenceRandomSource(fail ? [0, 0] : [5, 5])
  );
  server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: "signal" });
  return server;
}

function applyPending(server: GameRoomServer): GameState {
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  return server.getState();
}

function applyPendingEffect(state: GameState, sourceCardId: string) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: "seat-1",
    effect: state.pendingEffect!,
    sourceCardId,
    success: state.lastOutcomeSummary?.success ?? false,
    createdAt: `h2-apply-${sourceCardId}`
  });
}

function finish(server: GameRoomServer): GameState {
  if (server.getState().pendingEffect) applyPending(server);
  server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
  (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
  return server.getState();
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

describe("Heat Retirement H2 normal Wound Threats", () => {
  it("authors the exact two approved one-Wound failures while preserving identity and totals", () => {
    for (const target of TARGETS) {
      const card = requireTarget(target.id);
      expect(card).toMatchObject({
        id: target.id,
        title: target.title,
        cardType: "hazard",
        threatLane: "blue",
        stat: "signal",
        difficulty: target.difficulty,
        severity: target.severity,
        region: target.region,
        rarity: target.rarity,
        failEffect: { type: "take_wound", amount: 1 }
      });
      expect(card.successEffect).toEqual(target.successEffect);
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(JSON.stringify(card.failEffect)).not.toMatch(/gain_scar|salvage|displacement|modifier|escalation/i);
      expect(validateLegacyHeatContentRecord(`${target.id}.json`, card)).toEqual([]);
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(target.id)).toBe(false);
      expect(getRuntimeCardArtPath("threat", target.id)).toBe(`/assets/cards/threats/blue/${target.id}.png`);
      expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.threat.includes(target.id))).toHaveLength(target.graphCount);
    }

    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
  });

  it("keeps success-effect omission restricted to the four approved retirement IDs", () => {
    expect(HAZARD_SUCCESS_EFFECT_RETIREMENT_IDS).toEqual([
      "cinder-gate-backlash",
      "lantern-moth-swarm",
      "mirror-rot-interference",
      "webglass-snarefield"
    ]);
    expect(hazardThreatCardSchema.safeParse(requireTarget("lantern-moth-swarm")).success).toBe(true);
    const unsupported = { ...requireTarget("lantern-moth-swarm"), id: "unsupported-h2-success-omission" };
    expect(hazardThreatCardSchema.safeParse(unsupported).success).toBe(false);
  });

  it.each(TARGETS)("$id failure opens exactly one typed, preventable owner-scoped consequence", (target) => {
    const server = openCheck(requireTarget(target.id), true);
    const state = server.getState();
    expect(state.pendingEffect).toEqual({ type: "take_wound", amount: 1 });
    expect(state.pendingFailureReaction).toMatchObject({ seatId: "seat-1", testType: "hazard", sourceId: target.id });
    expect(state.players[0]!.character.wounds).toBe(0);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(0);
    expect(gameStateSchema.safeParse(state).success).toBe(true);
    const owner = createPhoneProjection(state, "seat-1", true) as PhoneProjection;
    const tv = createTvProjection(state) as PhoneProjection;
    expect(JSON.stringify({ encounter: state.currentEncounter, effect: state.pendingEffect, outcome: owner.activeResolution, deltas: owner.publicResultDeltas })).not.toMatch(/\bHeat\b|\bRisk\b|gain_heat|lose_heat/i);
    expect(JSON.stringify({ encounter: state.currentEncounter, effect: state.pendingEffect, outcome: tv.activeResolution, deltas: tv.publicResultDeltas })).not.toMatch(/\bHeat\b|\bRisk\b|gain_heat|lose_heat/i);
  });

  it.each(TARGETS)("$id applies one authoritative Wound, projects it once, and waits for continuation", (target) => {
    const opened = openCheck(requireTarget(target.id), true).getState();
    const applied = applyPendingEffect(opened, target.id);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const state = applied.state;
    expect(state.players[0]!.character).toMatchObject({ wounds: 1, status: "active" });
    expect(state.currentEncounter?.id).toBe(target.id);
    expect(state.pendingEffect).toBeNull();
    expect(state.activeResolution?.outcome?.effects).toEqual(["Failure: take 1 wound."]);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(1);

    const owner = createPhoneProjection(state, "seat-1", true) as PhoneProjection;
    const otherPhone = createPhoneProjection(state, "seat-2", true) as PhoneProjection;
    const tv = createTvProjection(state) as PhoneProjection;
    for (const projection of [owner, tv]) {
      expect(projection.publicResultDeltas).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: "wound", value: 1 })
      ]));
      expect(JSON.stringify({ outcome: projection.activeResolution, deltas: projection.publicResultDeltas })).not.toMatch(/\bHeat\b|\bRisk\b|gain_heat|lose_heat/i);
    }
    expect(otherPhone.self).toBeNull();
    expect(otherPhone.objectUseStates).toEqual([]);
    expect((tv as { objectUseStates?: unknown }).objectUseStates).toBeUndefined();
  });

  it.each(TARGETS)("$id full prevention reports no actual Wound and can avoid recall", (target) => {
    const card = requireTarget(target.id);
    const threshold = createEncounterState(card).woundThreshold;
    const server = openCheck(card, true, threshold - 1, true);
    const pending = server.getState();
    expect(JSON.stringify(pending.pendingEffect)).toContain("Hold the Line prevented 1 Wound.");
    const state = finish(server);
    expect(state.players[0]!.character).toMatchObject({ wounds: threshold - 1, status: "active" });
    expect(state.players[0]!.private.notes).toContain("Hold the Line prevented 1 Wound.");
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(0);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(1);
    expect(createPhoneProjection(state, "seat-1", true).publicResultDeltas ?? []).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "wound", value: 1 })])
    );
  });

  it.each(TARGETS)("$id threshold-crossing Wound uses the normal recall and Scar lifecycle once", (target) => {
    const card = requireTarget(target.id);
    const threshold = createEncounterState(card).woundThreshold;
    const state = finish(openCheck(card, true, threshold - 1));
    expect(state.players[0]!.character).toMatchObject({ wounds: threshold, status: "recalled" });
    expect(state.players[0]!.character.scars).toHaveLength(1);
    expect(countEvents(state, "WOUND_THRESHOLD_REACHED")).toBe(1);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(1);
    expect(JSON.stringify(card)).not.toMatch(/gain_scar/i);
  });

  it("preserves Choir scenario leverage and leaves Lantern success consequence-free", () => {
    const choir = openCheck(requireTarget("choir-static-burst"), false).getState();
    expect(choir.pendingEffect).toEqual(TARGETS[0].successEffect);
    const choirApplied = applyPendingEffect(choir, "choir-static-burst");
    expect(choirApplied.ok).toBe(true);
    if (!choirApplied.ok) return;
    const choirState = choirApplied.state;
    expect(choirState.scenarioProgress.choirStaticContained).toBe(1);
    expect(choirState.players[0]!.character.wounds).toBe(0);

    const lantern = openCheck(requireTarget("lantern-moth-swarm"), false);
    expect(lantern.getState().pendingEffect).toBeNull();
    expect(lantern.getState().activeResolution?.outcome).toEqual({
      title: "Check passed",
      text: "Success: no additional effect.",
      effects: []
    });
    expect(countEvents(lantern.getState(), "RESOLUTION_APPLIED")).toBe(0);
  });

  it("keeps the owner-only failed-hazard Artifact reaction authoritative and single-use", () => {
    const opened = openCheck(requireTarget("lantern-moth-swarm"), true).getState();
    const ampoule = loadGear().get("artifact-blackstar-ampoule")!;
    opened.players[0]!.character.heldGear.push(ampoule);
    const owner = createPhoneProjection(opened, "seat-1", true) as PhoneProjection;
    const otherPhone = createPhoneProjection(opened, "seat-2", true) as PhoneProjection;
    expect(owner.objectUseStates).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "artifact-blackstar-ampoule", disabledReason: null })
    ]));
    expect(otherPhone.objectUseStates).toEqual([]);

    const sent: Array<Record<string, unknown>> = [];
    const server = new GameRoomServer(opened);
    const client = {
      seatId: "seat-1",
      view: "phone",
      socket: { send: (payload: string) => sent.push(JSON.parse(payload) as Record<string, unknown>), close() {} }
    };
    server.handleIntent(client as never, { type: "USE_GEAR", seatId: "seat-1", gearId: "artifact-blackstar-ampoule" });
    expect(server.getState().pendingEffect).toBeNull();
    expect(server.getState().players[0]!.character.wounds).toBe(0);
    expect(server.getState().players[0]!.character.heldGear.some((item) => item.id === "artifact-blackstar-ampoule")).toBe(false);
    server.handleIntent(client as never, { type: "USE_GEAR", seatId: "seat-1", gearId: "artifact-blackstar-ampoule" });
    expect(sent.filter((message) => message.type === "INTENT_REJECTED")).toHaveLength(1);
    expect(server.getState().players[0]!.character.wounds).toBe(0);
  });

  it.each(TARGETS)("$id reconnects pending, applies once, and rejects stale replay", (target) => {
    const pending = openCheck(requireTarget(target.id), true).getState();
    expect(gameStateSchema.safeParse(pending).success).toBe(true);
    const restored = new GameRoomServer(structuredClone(pending)).getState();
    const applied = applyPendingEffect(restored, target.id);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.players[0]!.character.wounds).toBe(1);
    const replay = reduceGameState(applied.state, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect: { type: "take_wound", amount: 1 },
      sourceCardId: target.id,
      success: false,
      createdAt: "replay"
    });
    expect(replay.ok).toBe(false);
    expect(replay.state.players[0]!.character.wounds).toBe(1);
    expect(countEvents(replay.state, "RESOLUTION_APPLIED")).toBe(1);
  });

  it("removes exactly the H2 Heat approvals and leaves every out-of-scope Threat pinned", () => {
    expect(collectHeatThreatIds()).toEqual([...REMAINING_HEAT_THREAT_IDS].sort());
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(4);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(18);
    for (const id of ["cinder-gate-backlash", "mirror-rot-interference", "webglass-snarefield"]) {
      expect(requireTarget(id).successEffect).toBeUndefined();
    }
    expect(requireTarget("glass-chime-swarm").failEffect).toEqual({
      type: "next_non_battle_test_modifier",
      amount: -1,
      sourceCardId: "glass-chime-swarm"
    });
    expect(requireTarget("spindle-static-squall").failEffect).toEqual({
      type: "next_normal_movement_roll_modifier",
      amount: -1,
      minimumResult: 1,
      sourceCardId: "spindle-static-squall"
    });
  });
});
