import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  C1_BLOCKED_RUNTIME_HEAT_EFFECT_SIGNATURES,
  validateC1BlockedRuntimeHeatEffects
} from "../../../../scripts/legacy-heat-validation.js";
import { loadEscalationCards } from "../../content/escalations.js";
import { loadFollowers } from "../../content/followers.js";
import { isScenarioConfrontationSpace } from "../../data/boardSpaces.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import { getScenarioSheetArtPath } from "../../data/scenarioSheetArt.js";
import {
  getScenarioDefinition,
  SCENARIOS,
  type ScenarioConfrontationContext
} from "../../data/scenarios.js";

const TARGET_ID = "scenario_mirror_of_false_heroes";
const REMAINING_IDS = [
  "crownless-advocate",
  "saltflat-bone-reader"
] as const;

const OTHER_SCENARIO_HASHES = new Map([
  ["scenario_broken_seal", "2bf67c801579ecad442cccd0a224dee2bc18bea78526ad97f27c5526a2e426de"],
  ["scenario_throne_of_ash", "31e9db76844bd9d7d9d3f0683ba72d6ff4e40ca0508a807414e3d869b108e27b"],
  ["scenario_devourer_beneath", "1ff8a9ed1ce88cef98b321c3f39533a098c2bc4c5458c97863aff0d8c125aebc"],
  ["scenario_labyrinth_engine", "70ebcaca71ac1af3c7ec5bc47a5753655015ddbb55903f968613388d0ebe078a"],
  ["scenario_dying_star", "e7d2b6a0167dbbaf2a3f4f5e6e651ed1d78ff009d9c559240d2e102fa9abcf4d"]
]);

const HEAT_EFFECT_TYPES = new Set(["gain_heat", "gain_heat_all", "lose_heat"]);
const REPLACEMENT_EFFECT_TYPES = new Set([
  "take_wound",
  "gain_scar",
  "gain_global_escalation",
  "gain_global_escalation_guarded",
  "lose_salvage",
  "forced_displacement",
  "next_non_battle_test_modifier",
  "memory_tax_choice"
]);

function context(mirrorPressure: number): ScenarioConfrontationContext {
  return {
    playerName: "Pinned Operative",
    sessionMode: "single-player",
    crownClaims: 2,
    mirrorPressure,
    salvageLeverage: 2,
    engineModeIndex: 1,
    heldGearCount: 2
  };
}

function collectTypedEffects(value: unknown, output: Array<{ type: string }> = []): Array<{ type: string }> {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectTypedEffects(entry, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const record = value as Record<string, unknown>;
  if (typeof record.type === "string") output.push({ type: record.type });
  Object.values(record).forEach((entry) => collectTypedEffects(entry, output));
  return output;
}

function hashScenario(id: string): string {
  const scenario = getScenarioDefinition(id);
  if (!scenario) throw new Error(`Missing scenario ${id}`);
  return createHash("sha256")
    .update(JSON.stringify({ ...scenario, buildConfrontationPlan: undefined, plan: scenario.buildConfrontationPlan(context(6)) }))
    .digest("hex");
}

describe("Heat Compatibility C3B Mirror scenario retirement", () => {
  it("preserves Mirror identity and every static scenario contract around the retired effect", () => {
    const mirror = getScenarioDefinition(TARGET_ID);
    expect(mirror).toMatchObject({
      id: TARGET_ID,
      name: "The Mirror of False Heroes",
      supportedPlayerCounts: { min: 1, max: 6 },
      supportedModes: ["solo", "co-op", "rivalry", "hidden-agenda"],
      setup: ["Each player begins with 0 Reflection."],
      finalGateRequirement: "Face the Mirror with 1 Artifact, 2 completed Contracts, or 0 Scars.",
      confrontationTitle: "Face Yourself",
      confrontationSteps: [
        "Final gate: 1 Artifact, 2 completed Contracts, or 0 Scars.",
        "Test Guile 10 plus your Reflection.",
        "Test Signal 10 plus your Reflection.",
        "Test Grit 10 plus your Scars.",
        "If your Reflection is 4+ when you fail, gain 1 Scar."
      ],
      confrontationText: "At the breach mirror, resolve guile, signal, and grit checks in order. Each win records one mirror break. At two mirror breaks, you win.",
      winConditionKey: "mirrorBreaks",
      victoryThreshold: 2,
      failureEffectKey: "scenario_gainCorruption",
      victoryText: "If you pass at least 2 of the 3 mirror stat checks, you win the game.",
      lossCondition: "Escalation loss or Reflection pressure reaching its collapse state defeats the table.",
      difficulty: "medium",
      sheetArtAssetId: "scenario_sheet_mirror_of_false_heroes"
    });
    expect(mirror?.scenarioRewards.map((reward) => reward.id)).toEqual([
      "shattered-reflection",
      "honest-wound",
      "mirror-knife-technique",
      "reflection-bargain"
    ]);
  });

  it.each([0, 5, 6, 99])("keeps the Face Yourself plan but returns null at Mirror pressure %i", (mirrorPressure) => {
    const plan = getScenarioDefinition(TARGET_ID)?.buildConfrontationPlan(context(mirrorPressure));
    expect(plan).toEqual({
      checks: [
        { stat: "guile", difficulty: 10 + mirrorPressure, label: "Outwit your mirrored self" },
        { stat: "signal", difficulty: 10 + mirrorPressure, label: "Steady your fractured signal" },
        { stat: "grit", difficulty: 10 + mirrorPressure, label: "Break the final reflection" }
      ],
      markLabel: "mirror break",
      effect: null,
      victorySummary: "Pinned Operative shattered the false hero and walked free of the mirror."
    });
    const effectTypes = collectTypedEffects(plan);
    expect(effectTypes.some(({ type }) => HEAT_EFFECT_TYPES.has(type))).toBe(false);
    expect(effectTypes.some(({ type }) => REPLACEMENT_EFFECT_TYPES.has(type))).toBe(false);
  });

  it("keeps the center confrontation and scenario-art boundaries exact", () => {
    expect(isScenarioConfrontationSpace("center_cinder_gate")).toBe(true);
    expect(isScenarioConfrontationSpace("inner_gate_of_cinders")).toBe(false);
    expect(getScenarioSheetArtPath(TARGET_ID)).toBe("/assets/scenarios/mirror-of-false-heroes.png");
    expect(createCanonicalSectorGraph().find((sector) => sector.id === "center_cinder_gate")).toMatchObject({
      id: "center_cinder_gate",
      regionTier: "cinder_gate",
      neighbors: ["inner_gate_of_cinders", "inner_blackstar_shortcut"]
    });
  });

  it("leaves all five out-of-scope scenarios byte-stable through their authored plans", () => {
    expect(SCENARIOS).toHaveLength(6);
    for (const [id, hash] of OTHER_SCENARIO_HASHES) expect(hashScenario(id)).toBe(hash);
  });

  it("reconciles the authored Heat population to the exact two post-C4B2 follower IDs", () => {
    const effects: Array<{ id: string; type: string }> = [];
    for (const card of loadEscalationCards().values()) {
      collectTypedEffects(card).filter(({ type }) => HEAT_EFFECT_TYPES.has(type)).forEach(({ type }) => effects.push({ id: card.id, type }));
    }
    for (const follower of loadFollowers().values()) {
      collectTypedEffects(follower).filter(({ type }) => HEAT_EFFECT_TYPES.has(type)).forEach(({ type }) => effects.push({ id: follower.id, type }));
    }
    for (const scenario of SCENARIOS) {
      collectTypedEffects(scenario.buildConfrontationPlan(context(6)))
        .filter(({ type }) => HEAT_EFFECT_TYPES.has(type))
        .forEach(({ type }) => effects.push({ id: scenario.id, type }));
    }

    expect(effects).toHaveLength(2);
    expect([...new Set(effects.map(({ id }) => id))].sort()).toEqual([...REMAINING_IDS].sort());
    expect(effects.filter(({ type }) => type === "gain_heat")).toHaveLength(0);
    expect(effects.filter(({ type }) => type === "gain_heat_all")).toHaveLength(0);
    expect(effects.filter(({ type }) => type === "lose_heat")).toHaveLength(2);
    expect(C1_BLOCKED_RUNTIME_HEAT_EFFECT_SIGNATURES.size).toBe(0);
    expect(validateC1BlockedRuntimeHeatEffects([])).toEqual([]);
    expect(validateC1BlockedRuntimeHeatEffects([{ id: TARGET_ID, type: "gain_heat" }]).join(" ")).toContain(TARGET_ID);
  });
});
