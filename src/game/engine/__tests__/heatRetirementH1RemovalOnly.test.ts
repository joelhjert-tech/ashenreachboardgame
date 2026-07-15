import { describe, expect, it } from "vitest";
import {
  APPROVED_LEGACY_HEAT_CONTENT_IDS,
  LEGACY_HEAT_EFFECT_APPROVALS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
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

const TARGETS = [
  {
    id: "cinder-gate-backlash",
    title: "Cinder Gate Backlash",
    stat: "signal",
    difficulty: 12,
    severity: 5,
    region: "inner",
    rarity: "rare",
    graphCount: 3,
    failureWounds: 2,
    art: "/assets/cards/threats/blue/cinder-gate-backlash.png"
  },
  {
    id: "mirror-rot-interference",
    title: "Mirror-Rot Interference",
    stat: "guile",
    difficulty: 11,
    severity: 4,
    region: "middle",
    rarity: "uncommon",
    graphCount: 2,
    failureWounds: 1,
    art: "/assets/cards/threats/blue/mirror-rot-interference.png"
  },
  {
    id: "webglass-snarefield",
    title: "Webglass Snarefield",
    stat: "guile",
    difficulty: 9,
    severity: 3,
    region: "middle",
    rarity: "uncommon",
    graphCount: 3,
    failureWounds: 1,
    art: "/assets/cards/threats/blue/webglass-snarefield.png"
  }
] as const;

const REMAINING_HEAT_THREAT_IDS = [
  "false-route-procession",
  "gateblind-pulse",
  "marrow-tax-auditors",
  "memory-tax-gate"
] as const;

const threats = loadThreatCards();

type ResolutionProjection = {
  activeResolution?: { outcome?: { text?: string; effects?: unknown[] } } | null;
  publicResultDeltas?: unknown[];
};

function requireTarget(id: string): HazardThreatCard {
  const card = threats.get(id);
  if (!card || card.cardType !== "hazard") throw new Error(`Missing H1 hazard ${id}`);
  return card;
}

function countEvents(state: GameState, type: string): number {
  return (state.eventLog as Array<{ type?: string }>).filter((entry) => entry.type === type).length;
}

function createEncounterState(card: HazardThreatCard, fail: boolean): GameState {
  const state = createInitialSessionState(`h1-${card.id}-${fail ? "failure" : "success"}`, "single-player");
  state.status = "active";
  state.phase = "action";
  state.resolutionSource = null;
  state.currentEncounter = card;
  if (fail) state.players[0]!.character.stats[card.stat] = 0;
  state.activeResolution = {
    id: `h1-resolution-${card.id}-${fail ? "failure" : "success"}`,
    playerId: "seat-1",
    source: "threat",
    stage: "card_reveal",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor, artType: "threat" },
    battle: { enemyName: card.title, stat: card.stat, difficulty: card.difficulty, modifiers: [] }
  };
  return state;
}

function resolveCheck(card: HazardThreatCard, fail: boolean): GameRoomServer {
  const server = new GameRoomServer(
    createEncounterState(card, fail),
    [],
    createSequenceRandomSource(fail ? [0, 0] : [5, 5])
  );
  server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: card.stat });
  return server;
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

describe("Heat Retirement H1 removal-only Threats", () => {
  it("preserves the three approved identities while omitting only their success effects", () => {
    expect(HAZARD_SUCCESS_EFFECT_RETIREMENT_IDS).toEqual(expect.arrayContaining(TARGETS.map((target) => target.id)));

    for (const target of TARGETS) {
      const card = requireTarget(target.id);
      expect(card).toMatchObject({
        id: target.id,
        title: target.title,
        cardType: "hazard",
        threatLane: "blue",
        stat: target.stat,
        difficulty: target.difficulty,
        severity: target.severity,
        region: target.region,
        rarity: target.rarity
      });
      expect(card.successEffect).toBeUndefined();
      expect(card.failEffect).toEqual(
        target.failureWounds === 2
          ? { type: "take_wound", amount: 2 }
          : { type: "sequence", effects: [{ type: "take_wound", amount: 1 }] }
      );
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(validateLegacyHeatContentRecord(`${target.id}.json`, card)).toEqual([]);
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(target.id)).toBe(false);
      expect(getRuntimeCardArtPath("threat", target.id)).toBe(target.art);
      expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.threat.includes(target.id))).toHaveLength(target.graphCount);
    }

    expect(threats.size).toBe(109);
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
  });

  it("keeps omission validation narrow and unrelated hazard success effects required", () => {
    for (const target of TARGETS) expect(hazardThreatCardSchema.safeParse(requireTarget(target.id)).success).toBe(true);
    const unsupported = { ...requireTarget(TARGETS[0].id), id: "unsupported-success-retirement" };
    const parsed = hazardThreatCardSchema.safeParse(unsupported);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.map((issue) => issue.message)).toContain(
      "Hazard threats require a success effect unless explicitly retired"
    );
  });

  it.each(TARGETS)("$id success stores no consequence and projects a readable empty-effect result", (target) => {
    const card = requireTarget(target.id);
    const server = resolveCheck(card, false);
    const state = server.getState();
    const check = [...state.eventLog].reverse().find(
      (entry) => (entry as { type?: string }).type === "CHECK_ROLLED"
    ) as
      | { effect?: unknown; success?: boolean }
      | undefined;

    expect(check).toMatchObject({ success: true, effect: null });
    expect(state.phase).toBe("resolution");
    expect(state.pendingEffect).toBeNull();
    expect(state.pendingFailureReaction).toBeNull();
    expect(state.activeResolution?.outcome).toEqual({
      title: "Check passed",
      text: "Success: no additional effect.",
      effects: []
    });
    expect(state.players[0]!.character).toMatchObject({ wounds: 0, salvage: 4, scars: [] });
    expect(state.pendingNextNonBattleTestModifiers).toEqual([]);
    expect(state.pendingNextNormalMovementRollModifiers).toEqual([]);
    expect(state.escalationLevel).toBe(0);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(0);
    expect(gameStateSchema.safeParse(state).success).toBe(true);

    const phone = createPhoneProjection(state, "seat-1", true) as ResolutionProjection;
    const tv = createTvProjection(state) as ResolutionProjection;
    expect(JSON.stringify({
      phoneOutcome: phone.activeResolution?.outcome,
      phoneDeltas: phone.publicResultDeltas,
      tvOutcome: tv.activeResolution?.outcome,
      tvDeltas: tv.publicResultDeltas
    })).not.toMatch(/\bHeat\b|\bRisk\b|gain_heat|lose_heat/i);
    expect(phone.activeResolution?.outcome?.text).toBe("Success: no additional effect.");
    expect(phone.activeResolution?.outcome?.effects).toEqual([]);
    expect(tv.activeResolution?.outcome?.text).toBe("Success: no additional effect.");
    expect(tv.activeResolution?.outcome?.effects).toEqual([]);
    expect(() => server.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: card.stat })).toThrow(
      /Cannot resolve a check during phase resolution/
    );
  });

  it.each(TARGETS)("$id success survives reconnect and completes without inventing a consequence", (target) => {
    const resolved = resolveCheck(requireTarget(target.id), false).getState();
    const restored = new GameRoomServer(structuredClone(resolved), [], createSequenceRandomSource([5, 5]));
    expect(restored.getState().pendingEffect).toBeNull();
    restored.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    restored.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    (restored as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    const state = restored.getState();
    expect(countEvents(state, "CHECK_ROLLED")).toBe(1);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(0);
    expect(state.players[0]!.character).toMatchObject({ wounds: 0, salvage: 4, scars: [] });
    expect(state.pendingNextNonBattleTestModifiers).toEqual([]);
    expect(state.pendingNextNormalMovementRollModifiers).toEqual([]);
    expect(state.escalationLevel).toBe(0);
  });

  it.each(TARGETS)("$id keeps its existing failure Wound and no other consequence", (target) => {
    const server = resolveCheck(requireTarget(target.id), true);
    expect(server.getState().pendingEffect).toEqual(requireTarget(target.id).failEffect);
    server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    server.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    (server as unknown as { runAutomaticPhases: (seatId: string) => void }).runAutomaticPhases("seat-1");
    const state = server.getState();
    expect(state.players[0]!.character).toMatchObject({ wounds: target.failureWounds, salvage: 4, scars: [] });
    expect(state.pendingNextNonBattleTestModifiers).toEqual([]);
    expect(state.pendingNextNormalMovementRollModifiers).toEqual([]);
    expect(countEvents(state, "RESOLUTION_APPLIED")).toBe(1);
    const phone = createPhoneProjection(state, "seat-1", true) as ResolutionProjection;
    const tv = createTvProjection(state) as ResolutionProjection;
    expect(JSON.stringify({
      phoneOutcome: phone.activeResolution?.outcome,
      phoneDeltas: phone.publicResultDeltas,
      tvOutcome: tv.activeResolution?.outcome,
      tvDeltas: tv.publicResultDeltas
    })).not.toMatch(/\bHeat\b|\bRisk\b/i);
  });

  it("leaves Siren plus the four blocked Heat-linked Threats and completed duplicate revisions unchanged", () => {
    expect(collectHeatThreatIds()).toEqual([...REMAINING_HEAT_THREAT_IDS].sort());
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(12);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(26);
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
