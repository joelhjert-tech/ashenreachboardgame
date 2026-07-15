import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEscalationCards } from "../../content/escalations.js";
import { loadFollowers } from "../../content/followers.js";
import { BOARD_TEXT_EFFECTS } from "../../data/boardTextEffects.js";
import { SCENARIOS, type ScenarioConfrontationContext } from "../../data/scenarios.js";
import { parseAndMigrateSessionSnapshot } from "../../persistence/sessionSnapshot.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { reduceGameState } from "../reducer.js";

const BLOCKED_AUTHORED_IDS = [
  "crownless-advocate",
  "escalation-blackstar-hunger",
  "escalation-choir-feedback",
  "escalation-marrow-surgery-debt",
  "escalation-saltwind-lockdown",
  "inner_blackstarShortcut",
  "inner_cinderLatticeTrial",
  "inner_gateOfCindersTrial",
  "inner_veilRiftEntry",
  "middle_guardianSpanThreshold",
  "middle_redMarchBargain",
  "middle_scarSurgery",
  "middle_shardSprawlBargain",
  "middle_webglassFracture",
  "outer_ashwakeClearLane",
  "outer_brokenCausewayShortcut",
  "outer_emberSanctumRest",
  "outer_glassmereChorus",
  "outer_mirecoilTraffic",
  "outer_oathpostWrit",
  "outer_relayCrew",
  "outer_saltCrossing",
  "outer_surgeryTreatment",
  "outer_waymarketExchange",
  "saltflat-bone-reader",
  "scenario_mirror_of_false_heroes"
] as const;

const HEAT_EFFECT_TYPES = new Set(["gain_heat", "gain_heat_all", "lose_heat"]);

function collectHeatEffects(value: unknown, id: string, output: Array<{ id: string; type: string }>): void {
  if (Array.isArray(value)) return value.forEach((entry) => collectHeatEffects(entry, id, output));
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.type === "string" && HEAT_EFFECT_TYPES.has(record.type)) output.push({ id, type: record.type });
  Object.values(record).forEach((entry) => collectHeatEffects(entry, id, output));
}

function authoredHeatEffects(): Array<{ id: string; type: string }> {
  const output: Array<{ id: string; type: string }> = [];
  for (const [id, definition] of Object.entries(BOARD_TEXT_EFFECTS)) collectHeatEffects(definition, id, output);
  for (const card of loadEscalationCards().values()) collectHeatEffects(card, card.id, output);
  for (const follower of loadFollowers().values()) collectHeatEffects(follower, follower.id, output);

  const context: ScenarioConfrontationContext = {
    playerName: "Audit Operative",
    sessionMode: "single-player",
    crownClaims: 0,
    mirrorPressure: 6,
    salvageLeverage: 0,
    engineModeIndex: 0,
    heldGearCount: 0
  };
  for (const scenario of SCENARIOS) collectHeatEffects(scenario.buildConfrontationPlan(context), scenario.id, output);
  return output;
}

function legacySnapshot(current: GameState, heat: number): unknown {
  const { reflectionPressureThreshold, ...legacyState } = current;
  return {
    sessionId: current.sessionId,
    sequence: current.sequence,
    state: {
      ...legacyState,
      heatThreshold: reflectionPressureThreshold,
      players: current.players.map((player) => ({
        ...player,
        character: { ...player.character, heat }
      }))
    }
  };
}

function productionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : productionFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Heat Compatibility C1 containment", () => {
  it("keeps the exact 39 unresolved authored effects blocked without silently changing content", () => {
    const effects = authoredHeatEffects();
    expect(effects).toHaveLength(39);
    expect([...new Set(effects.map((entry) => entry.id))].sort()).toEqual([...BLOCKED_AUTHORED_IDS].sort());
    expect(effects.filter((entry) => entry.type === "gain_heat")).toHaveLength(26);
    expect(effects.filter((entry) => entry.type === "gain_heat_all")).toHaveLength(3);
    expect(effects.filter((entry) => entry.type === "lose_heat")).toHaveLength(10);
  });

  it("makes HEAT_THRESHOLD_REACHED an exact compatibility no-op", () => {
    const state = createInitialSessionState("c1-threshold", "single-player");
    state.status = "active";
    state.phase = "resolution";
    state.players[0]!.character.wounds = 2;
    state.players[0]!.character.scars = ["scar-wound-1"];
    state.players[0]!.character.salvage = 7;
    state.escalationLevel = 4;
    state.scenarioProgress = { lossPressure: 3 };
    const before = structuredClone(state);
    const action = {
      type: "HEAT_THRESHOLD_REACHED" as const,
      seatId: state.players[0]!.seatId,
      threshold: 6,
      newHeatTotal: 6,
      createdAt: "legacy-event"
    };

    const first = reduceGameState(state, action);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state).toBe(state);
    expect(first.state).toEqual(before);
    expect(first.state.players[0]!.character.status).toBe("active");
    expect(first.state.eventLog).toEqual(before.eventLog);
    expect(first.emitted).toEqual([]);

    const duplicate = reduceGameState(first.state, action);
    expect(duplicate.ok).toBe(true);
    if (!duplicate.ok) return;
    expect(duplicate.state).toBe(state);
    expect(duplicate.state).toEqual(before);
  });

  it("keeps legacy Heat values mechanically identical and separate from Scars", () => {
    const base = createInitialSessionState("c1-legacy", "single-player");
    const zero = parseAndMigrateSessionSnapshot(legacySnapshot(base, 0));
    const seven = parseAndMigrateSessionSnapshot(legacySnapshot(base, 7));

    expect(zero.state).toEqual(seven.state);
    expect(zero.state.players[0]!.character.scars).toEqual(seven.state.players[0]!.character.scars);
    expect(zero.state.pendingScarConsequence).toEqual(seven.state.pendingScarConsequence);
    expect(zero.legacyCompatibility).toBeUndefined();
    expect(seven.legacyCompatibility?.characterHeat[0]?.value).toBe(7);

    const replay = reduceGameState(seven.state, {
      type: "HEAT_THRESHOLD_REACHED",
      seatId: seven.state.players[0]!.seatId,
      threshold: 6,
      newHeatTotal: 7,
      createdAt: "legacy-replay"
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.state.players[0]!.character.status).toBe("active");
    expect(replay.state.players[0]!.character.scars).toEqual([]);
    expect(replay.state.pendingScarConsequence).toBeNull();
  });

  it("confines Heat resolution and threshold symbols to an exact compatibility allowlist", () => {
    const root = process.cwd();
    const files = [...productionFiles(join(root, "src", "game")), ...productionFiles(join(root, "src", "server"))];
    const heatEffectAllowlist = new Set([
      "src/game/cards/threatEffects.ts",
      "src/game/data/boardTextEffects.ts",
      "src/game/data/scenarios.ts",
      "src/game/engine/reducer.ts",
      "src/game/rules/legacyHeatCompatibility.ts",
      "src/game/schema/card.schema.ts",
      "src/server/legacyHeatProjection.ts"
    ]);
    const thresholdAllowlist = new Set([
      "src/game/engine/actions.ts",
      "src/game/engine/reducer.ts"
    ]);
    const effectViolations: string[] = [];
    const thresholdViolations: string[] = [];

    for (const file of files) {
      const path = relative(root, file).replaceAll("\\", "/");
      const source = readFileSync(file, "utf8");
      if (/\b(?:gain_heat|gain_heat_all|lose_heat|set_heat|clear_heat)\b/.test(source) && !heatEffectAllowlist.has(path)) effectViolations.push(path);
      if (/\bHEAT_THRESHOLD_REACHED\b/.test(source) && !thresholdAllowlist.has(path)) thresholdViolations.push(path);
    }

    expect(effectViolations).toEqual([]);
    expect(thresholdViolations).toEqual([]);
    expect(readFileSync(join(root, "src/game/engine/reducer.ts"), "utf8")).toMatch(/case "HEAT_THRESHOLD_REACHED"[\s\S]*return \{ ok: true, state, emitted: \[\] \}/);
  });
});
