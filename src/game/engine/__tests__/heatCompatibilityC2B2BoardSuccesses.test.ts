import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadFollowers } from "../../content/followers.js";
import { BOARD_SPACES } from "../../data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS } from "../../data/boardTextEffects.js";
import { resolveSpaceText } from "../../rules/tileTextResolver.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

const GROUP_2 = {
  outer_emberSanctumRest: {
    summary: "Heal 1 Wound.",
    stat: undefined,
    difficulty: undefined,
    effect: { type: "heal_wound", amount: 1 },
    failureSummary: undefined,
    failureEffect: undefined,
    sectorDeck: undefined,
    spaces: ["outer_ember_sanctum"]
  },
  outer_glassmereChorus: {
    summary: "Tuned the Glassmere spindle and recruited the mapper who held its stable line.",
    stat: "signal",
    difficulty: 7,
    effect: { type: "sequence", effects: [
      { type: "gain_follower", followerId: "glassmere-mapper" },
      { type: "gain_note", text: "Glassmere spindle tuned. Relay chorus remains stable." }
    ] },
    failureSummary: "The Glassmere chorus slipped sharp and left the relay line unstable.",
    failureEffect: undefined,
    sectorDeck: { kind: "anomaly" },
    spaces: ["coldwind-wharf", "flooded-locks", "glassmere-spindle"]
  },
  outer_waymarketExchange: {
    summary: "Worked the Waymarket exchange and recruited a Black Lantern broker.",
    stat: "guile",
    difficulty: 6,
    effect: { type: "sequence", effects: [
      { type: "gain_follower", followerId: "black-lantern-broker" },
      { type: "gain_note", text: "Waymarket favor banked for trade, aid, or a safer route." }
    ] },
    failureSummary: "The Waymarket deal soured and every stall seemed to know your scar tally.",
    failureEffect: undefined,
    sectorDeck: { kind: "contract" },
    spaces: ["kettleward-foundry", "outer_waymarket"]
  },
  outer_saltCrossing: {
    summary: "Harvested void-salt and recruited the bone-reader who interpreted it.",
    stat: "forge",
    difficulty: 7,
    effect: { type: "sequence", effects: [
      { type: "gain_follower", followerId: "saltflat-bone-reader" },
      { type: "gain_note", text: "Void-salt vial: useful for scar treatment or gate bargaining." }
    ] },
    failureSummary: "The salt bloom bit through the gloves and left a white nerve-mark under the skin.",
    failureEffect: { type: "take_wound", amount: 1 },
    sectorDeck: { kind: "anomaly" },
    spaces: ["deadwater-marsh", "outer_salt_flats", "votive-engine-room"]
  },
  outer_surgeryTreatment: {
    summary: "Accepted rough cinder surgery and walked away patched.",
    stat: "forge",
    difficulty: 7,
    effect: {
      type: "sequence",
      effects: [
        { type: "heal_wound", amount: 1 },
        { type: "gain_follower", followerId: "cinder-surgeon" },
        { type: "gain_note", text: "Cinder surgery receipt: scar treatment logged." }
      ]
    },
    failureSummary: "The surgery tent ran out of anesthetic and the patch job became a liability.",
    failureEffect: { type: "take_wound", amount: 1 },
    sectorDeck: { kind: "artifact" },
    spaces: ["outer_surgery_tent"]
  }
} as const;

const GROUP_2_IDS = Object.keys(GROUP_2) as Array<keyof typeof GROUP_2>;
const followers = loadFollowers();
const HEAT_OR_REPLACEMENT_EFFECT = /gain_heat|lose_heat|gain_heat_all|gain_scar|lose_salvage|advance_escalation|forced_displacement|temporary_modifier|equipment_suppression|choice/i;

function hydrateEffect(effect: EncounterEffect): EncounterEffect {
  if (effect.type === "sequence") {
    return { ...effect, effects: effect.effects.map(hydrateEffect) };
  }
  if (effect.type === "gain_follower") {
    const follower = followers.get(effect.followerId);
    return {
      ...effect,
      follower: follower
        ? { ...follower, instanceId: `${effect.followerId}:c2b2`, exhausted: false }
        : undefined
    };
  }
  return effect;
}

function stateAtEffect(effectKey: keyof typeof GROUP_2): GameState {
  const space = BOARD_SPACES.find((entry) => entry.textBox.effectKey === effectKey);
  if (!space) throw new Error(`No board space found for ${effectKey}`);

  const state = createInitialSessionState(`c2b2-${effectKey}`, "multiplayer", undefined, undefined, "standard", 2);
  state.status = "active";
  state.phase = "action";
  state.players[0]!.sectorId = space.id;
  state.players[0]!.character.currentSpaceId = space.id;
  state.players[0]!.character.wounds = 2;
  state.sectors = state.sectors.map((sector) =>
    sector.id === space.id
      ? { ...sector, encounterDecks: { ...sector.encounterDecks, threat: [] } }
      : sector
  );
  return state;
}

describe("Heat Compatibility C2B2 board success-sequence cleanup", () => {
  it("preserves the exact five approved definitions and surviving effect order", () => {
    expect(GROUP_2_IDS).toHaveLength(5);
    expect(new Set(GROUP_2_IDS).size).toBe(5);

    for (const id of GROUP_2_IDS) {
      const definition = BOARD_TEXT_EFFECTS[id];
      const expected = GROUP_2[id];
      expect(definition).toMatchObject({
        effectKey: id,
        summary: expected.summary,
        effect: expected.effect
      });
      expect(definition.stat).toBe(expected.stat);
      expect(definition.difficulty).toBe(expected.difficulty);
      expect(definition.failureSummary).toBe(expected.failureSummary);
      expect(definition.failureEffect).toEqual(expected.failureEffect);
      expect(definition.sectorDeck).toEqual(expected.sectorDeck);
      expect(JSON.stringify(definition)).not.toMatch(HEAT_OR_REPLACEMENT_EFFECT);

      const linkedSpaces = BOARD_SPACES
        .filter((space) => space.textBox.effectKey === id)
        .map((space) => space.id)
        .sort();
      expect(linkedSpaces).toEqual([...expected.spaces].sort());
      expect(BOARD_SPACES.filter((space) => linkedSpaces.includes(space.id)).every((space) => space.tier === "outer")).toBe(true);

      const resolved = resolveSpaceText(id);
      expect(resolved.summary).toBe(expected.summary);
      expect(resolved.effect).toEqual(expected.effect);
      if (expected.stat) {
        expect(resolved.check).toMatchObject({
          stat: expected.stat,
          difficulty: expected.difficulty,
          failureSummary: expected.failureSummary,
          failureEffect: expected.failureEffect ?? null
        });
      } else {
        expect(resolved.check).toBeNull();
      }
    }

    expect(BOARD_TEXT_EFFECTS.outer_surgeryTreatment.effect).toEqual({
      type: "sequence",
      effects: [
        { type: "heal_wound", amount: 1 },
        { type: "gain_follower", followerId: "cinder-surgeon" },
        { type: "gain_note", text: "Cinder surgery receipt: scar treatment logged." }
      ]
    });
  });

  it.each(GROUP_2_IDS)("resolves %s success once with the cleaned result", (id) => {
    const expected = GROUP_2[id];
    const state = stateAtEffect(id);
    const effect = hydrateEffect(expected.effect as EncounterEffect);
    const result = reduceGameState(state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      effectKey: id,
      summary: expected.summary,
      effect,
      checkStat: expected.stat ?? null,
      difficulty: expected.difficulty ?? null,
      roll: expected.stat ? { faces: [6, 6], total: 12 } : null,
      statBonus: expected.stat ? 0 : null,
      total: expected.stat ? 12 : null,
      success: true,
      sectorId: state.players[0]!.sectorId,
      createdAt: `c2b2-${id}-success`
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const player = result.state.players[0]!;
    const heals = id === "outer_emberSanctumRest" || id === "outer_surgeryTreatment";
    expect(player.character.wounds).toBe(heals ? 1 : 2);
    const noteEffects = effect.type === "sequence"
      ? effect.effects.filter((entry) => entry.type === "gain_note")
      : effect.type === "gain_note" ? [effect] : [];
    for (const note of noteEffects) {
      if (note.type === "gain_note") expect(player.private.notes).toContain(note.text);
    }
    if (id === "outer_surgeryTreatment") {
      expect((player.character.followers ?? []).map((entry) => entry.id)).toContain("cinder-surgeon");
      expect(result.state.activeResolution?.outcome?.effects).toEqual([
        "Success: heal 1 wound.",
        "Success: gain follower Cinder Surgeon.",
        "Success: note added: Cinder surgery receipt: scar treatment logged."
      ]);
    }

    const projections = [
      createPhoneProjection(result.state, "seat-1", true),
      createPhoneProjection(result.state, "seat-2", true),
      createTvProjection(result.state),
      createPhoneProjection(structuredClone(result.state), "seat-1", true)
    ];
    for (const projection of projections) {
      const scoped = JSON.stringify({
        activeResolution: projection.activeResolution,
        outcomeSummary: projection.outcomeSummary,
        publicResultDeltas: projection.publicResultDeltas
      });
      expect(scoped).not.toMatch(/\bHeat\b|gain_heat|lose_heat|HEAT_THRESHOLD_REACHED/i);
      expect(scoped).not.toContain('"effects":[""]');
    }

    const duplicate = reduceGameState(result.state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      effectKey: id,
      summary: expected.summary,
      effect,
      createdAt: `c2b2-${id}-duplicate`
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state).toBe(result.state);
  });

  it.each(GROUP_2_IDS.filter((id) => id !== "outer_emberSanctumRest"))(
    "keeps %s failure behavior exact",
    (id) => {
      const expected = GROUP_2[id];
      const state = stateAtEffect(id);
      const failureEffect = expected.failureEffect as EncounterEffect | undefined;
      const result = reduceGameState(state, {
        type: "SPACE_TEXT_RESOLVED",
        seatId: "seat-1",
        effectKey: id,
        summary: expected.failureSummary!,
        effect: failureEffect ?? null,
        checkStat: expected.stat,
        difficulty: expected.difficulty,
        roll: { faces: [1, 1], total: 2 },
        statBonus: 0,
        total: 2,
        success: false,
        sectorId: state.players[0]!.sectorId,
        createdAt: `c2b2-${id}-failure`
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const woundsExpected = failureEffect?.type === "take_wound" ? 3 : 2;
      expect(result.state.players[0]!.character.wounds).toBe(woundsExpected);
      expect(result.state.activeResolution?.outcome?.effects).toEqual(
        failureEffect ? ["Failure: take 1 wound."] : []
      );
    }
  );
});
