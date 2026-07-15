import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { BOARD_SPACES } from "../../data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS } from "../../data/boardTextEffects.js";
import { resolveSpaceText } from "../../rules/tileTextResolver.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

const GROUP_3 = {
  outer_brokenCausewayShortcut: {
    summary: "Marked the Broken Causeway shortcut toward Guardian Span.",
    stat: "grit",
    difficulty: 8,
    effect: { type: "gain_note", text: "Broken Causeway shortcut marked. The fast route is dangerous but real." },
    failureSummary: "The causeway cracked under the attempt and threw cinder pressure through the line.",
    failureEffect: { type: "take_wound", amount: 1 },
    sectorDeck: { kind: "escalation" },
    spaces: ["outer_broken_causeway", "shattered-causeway"]
  },
  middle_scarSurgery: {
    summary: "Survived field surgery in the Red March.",
    stat: "forge",
    difficulty: 9,
    effect: {
      type: "sequence",
      effects: [
        { type: "heal_wound", amount: 1 },
        { type: "gain_note", text: "Field surgery completed. The scar holds for now." }
      ]
    },
    failureSummary: "The surgery pit made the wound quieter, not safer.",
    failureEffect: { type: "gain_scar", scarId: "scar-wound-1" },
    sectorDeck: { kind: "escalation" },
    spaces: ["middle_scar_surgery"]
  },
  inner_blackstarShortcut: {
    summary: "Crossed the Blackstar shortcut and kept your nerve.",
    stat: "guile",
    difficulty: 11,
    effect: { type: "gain_note", text: "Blackstar shortcut survived. The route is ugly but fast." },
    failureSummary: "The Blackstar cut folded wrong and made the shortcut cost blood.",
    failureEffect: { type: "take_wound", amount: 1 },
    sectorDeck: { kind: "artifact" },
    spaces: ["inner_blackstar_shortcut"]
  }
} as const;

const GROUP_3_IDS = Object.keys(GROUP_3) as Array<keyof typeof GROUP_3>;
const HEAT_OR_REPLACEMENT = /gain_heat|lose_heat|gain_heat_all|lose_salvage|advance_escalation|forced_displacement|temporary_modifier|equipment_suppression|choice/i;

function stateAtEffect(effectKey: keyof typeof GROUP_3): GameState {
  const space = BOARD_SPACES.find((entry) => entry.textBox.effectKey === effectKey);
  if (!space) throw new Error(`No board space found for ${effectKey}`);

  const state = createInitialSessionState(`c2b3-${effectKey}`, "multiplayer", undefined, undefined, "standard", 2);
  state.status = "active";
  state.phase = "action";
  state.players[0]!.sectorId = space.id;
  state.players[0]!.character.currentSpaceId = space.id;
  state.players[0]!.character.wounds = 2;
  state.players[0]!.character.scars = [];
  state.sectors = state.sectors.map((sector) =>
    sector.id === space.id
      ? { ...sector, encounterDecks: { ...sector.encounterDecks, threat: [] } }
      : sector
  );
  return state;
}

function resolve(
  state: GameState,
  id: keyof typeof GROUP_3,
  success: boolean,
  createdAt: string
) {
  const expected = GROUP_3[id];
  return reduceGameState(state, {
    type: "SPACE_TEXT_RESOLVED",
    seatId: "seat-1",
    effectKey: id,
    summary: success ? expected.summary : expected.failureSummary,
    effect: (success ? expected.effect : expected.failureEffect) as EncounterEffect,
    checkStat: expected.stat,
    difficulty: expected.difficulty,
    roll: { faces: success ? [6, 6] : [1, 1], total: success ? 12 : 2 },
    statBonus: 0,
    total: success ? 12 : 2,
    success,
    sectorId: state.players[0]!.sectorId,
    createdAt
  });
}

describe("Heat Compatibility C2B3 severe board consequence cleanup", () => {
  it("preserves the exact three approved definitions, locations, and severe effects", () => {
    expect(GROUP_3_IDS).toHaveLength(3);
    expect(new Set(GROUP_3_IDS).size).toBe(3);

    for (const id of GROUP_3_IDS) {
      const definition = BOARD_TEXT_EFFECTS[id];
      const expected = GROUP_3[id];
      const { spaces: expectedSpaces, ...expectedDefinition } = expected;
      expect(definition).toEqual({ effectKey: id, ...expectedDefinition });
      expect(JSON.stringify(definition)).not.toMatch(HEAT_OR_REPLACEMENT);

      const spaces = BOARD_SPACES
        .filter((space) => space.textBox.effectKey === id)
        .map((space) => space.id)
        .sort();
      expect(spaces).toEqual([...expectedSpaces].sort());

      const resolved = resolveSpaceText(id);
      expect(resolved.summary).toBe(expected.summary);
      expect(resolved.effect).toEqual(expected.effect);
      expect(resolved.check).toMatchObject({
        stat: expected.stat,
        difficulty: expected.difficulty,
        failureSummary: expected.failureSummary,
        failureEffect: expected.failureEffect
      });
    }

    expect(BOARD_TEXT_EFFECTS.outer_brokenCausewayShortcut.failureEffect).toEqual({ type: "take_wound", amount: 1 });
    expect(BOARD_TEXT_EFFECTS.middle_scarSurgery.failureEffect).toEqual({ type: "gain_scar", scarId: "scar-wound-1" });
    expect(BOARD_TEXT_EFFECTS.inner_blackstarShortcut.failureEffect).toEqual({ type: "take_wound", amount: 1 });
  });

  it.each(["outer_brokenCausewayShortcut", "inner_blackstarShortcut"] as const)(
    "%s retains exactly one failure Wound with no duplicate severe result",
    (id) => {
      const state = stateAtEffect(id);
      const result = resolve(state, id, false, `c2b3-${id}-failure`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.state.players[0]!.character.wounds).toBe(3);
      expect(result.state.players[0]!.character.scars).toEqual([]);
      expect(result.state.pendingEffect).toBeNull();
      expect(result.state.pendingScarConsequence ?? null).toBeNull();
      expect(result.state.activeResolution?.outcome?.effects).toEqual(["Failure: take 1 wound."]);
      expect(result.state.activeResolution?.outcome?.effects.filter((entry) => /wound/i.test(entry))).toHaveLength(1);
    }
  );

  it("middle_scarSurgery retains exactly one direct Ash-Lanced failure Scar", () => {
    const state = stateAtEffect("middle_scarSurgery");
    const result = resolve(state, "middle_scarSurgery", false, "c2b3-middle-scar-failure");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.players[0]!.character.wounds).toBe(2);
    expect(result.state.players[0]!.character.scars).toEqual(["scar-wound-1"]);
    expect(result.state.pendingScarConsequence ?? null).toBeNull();
    expect(result.state.activeResolution?.outcome?.effects).toEqual(["Failure: gain scar scar-wound-1."]);
    expect(result.state.activeResolution?.outcome?.effects.filter((entry) => /scar/i.test(entry))).toHaveLength(1);
  });

  it.each(GROUP_3_IDS)("keeps %s success effects and order exact", (id) => {
    const state = stateAtEffect(id);
    const result = resolve(state, id, true, `c2b3-${id}-success`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const player = result.state.players[0]!;
    expect(player.character.scars).toEqual([]);
    expect(player.character.wounds).toBe(id === "middle_scarSurgery" ? 1 : 2);
    expect(player.private.notes).toContain(
      id === "outer_brokenCausewayShortcut"
        ? "Broken Causeway shortcut marked. The fast route is dangerous but real."
        : id === "middle_scarSurgery"
          ? "Field surgery completed. The scar holds for now."
          : "Blackstar shortcut survived. The route is ugly but fast."
    );
    if (id === "middle_scarSurgery") {
      expect(result.state.activeResolution?.outcome?.effects).toEqual([
        "Success: heal 1 wound.",
        "Success: note added: Field surgery completed. The scar holds for now."
      ]);
    }
  });

  it.each(GROUP_3_IDS)("keeps %s idempotent and Heat-free across projections and reconnect", (id) => {
    const state = stateAtEffect(id);
    const completed = resolve(state, id, false, `c2b3-${id}-projection`);
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;

    for (const projection of [
      createPhoneProjection(completed.state, "seat-1", true),
      createPhoneProjection(completed.state, "seat-2", true),
      createTvProjection(completed.state),
      createPhoneProjection(structuredClone(completed.state), "seat-1", true)
    ]) {
      const scoped = JSON.stringify({
        activeResolution: projection.activeResolution,
        outcomeSummary: projection.outcomeSummary,
        publicResultDeltas: projection.publicResultDeltas
      });
      expect(scoped).not.toMatch(/\bHeat\b|gain_heat|lose_heat|HEAT_THRESHOLD_REACHED/i);
      expect(scoped).not.toContain('"effects":[""]');
    }

    const duplicate = resolve(completed.state, id, false, `c2b3-${id}-duplicate`);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state).toBe(completed.state);
  });
});
