import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { BOARD_SPACES } from "../../data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS } from "../../data/boardTextEffects.js";
import { resolveSpaceText } from "../../rules/tileTextResolver.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

const GROUP_1 = {
  outer_ashwakeClearLane: {
    stat: "guile",
    difficulty: 6,
    effect: { type: "gain_note", text: "Ashwake crossing cleared. The convoy lane is charted." },
    failureSummary: "The Ashwake lane looked clear until the crossing ghosts forced you back under pressure.",
    sectorDeck: undefined
  },
  outer_mirecoilTraffic: {
    stat: "signal",
    difficulty: 8,
    effect: { type: "sequence", effects: [
      { type: "gain_follower", followerId: "mirecoil-saboteur" },
      { type: "gain_note", text: "Mirecoil contract lead secured from mast traffic." }
    ] },
    failureSummary: "The Mirecoil traffic lanes broke into static and the contract lead dissolved into noise.",
    sectorDeck: { kind: "contract" }
  },
  outer_relayCrew: {
    stat: "command",
    difficulty: 6,
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_follower", followerId: "grave-scribe" },
        { type: "gain_note", text: "Relay camp contact: a route crew owes you one clean signal." }
      ]
    },
    failureSummary: "The relay camp would not commit a crew while your line looked this unstable.",
    sectorDeck: { kind: "contract" }
  },
  outer_oathpostWrit: {
    stat: "command",
    difficulty: 7,
    effect: { type: "sequence", effects: [
      { type: "gain_follower", followerId: "gate-saint-acolyte" },
      { type: "gain_note", text: "Faction writ: can be cashed for bounded rivalry, aid, or a contract lead." }
    ] },
    failureSummary: "The Oathpost refused your claim and marked the attempt as unpaid scar debt.",
    sectorDeck: { kind: "contract" }
  },
  middle_redMarchBargain: {
    stat: "command",
    difficulty: 9,
    effect: {
      type: "sequence",
      effects: [
        { type: "gain_follower", followerId: "votive-gunner" },
        { type: "gain_note", text: "Red March outpost favor: gunner, guide, or hard military passage promised." }
      ]
    },
    failureSummary: "The outpost commander liked your nerve but not your credentials.",
    sectorDeck: { kind: "contract" }
  }
} as const;

const GROUP_1_IDS = Object.keys(GROUP_1) as Array<keyof typeof GROUP_1>;
const HEAT_OR_REPLACEMENT_EFFECT = /gain_heat|lose_heat|gain_heat_all|take_wound|gain_scar|lose_salvage|advance_escalation|forced_displacement|temporary_modifier|equipment_suppression|choice/i;

function stateAtEffect(effectKey: keyof typeof GROUP_1): GameState {
  const space = BOARD_SPACES.find((entry) => entry.textBox.effectKey === effectKey);
  if (!space) throw new Error(`No board space found for ${effectKey}`);

  const state = createInitialSessionState(`c2b1-${effectKey}`, "multiplayer", undefined, undefined, "standard", 2);
  state.status = "active";
  state.phase = "action";
  state.players[0]!.sectorId = space.id;
  state.players[0]!.character.currentSpaceId = space.id;
  state.sectors = state.sectors.map((sector) =>
    sector.id === space.id
      ? { ...sector, encounterDecks: { ...sector.encounterDecks, threat: [] } }
      : sector
  );
  return state;
}

describe("Heat Compatibility C2B1 board failure removals", () => {
  it("preserves the exact five approved definitions while removing only their failure Heat effects", () => {
    expect(GROUP_1_IDS).toHaveLength(5);
    expect(new Set(GROUP_1_IDS).size).toBe(5);

    for (const id of GROUP_1_IDS) {
      const definition = BOARD_TEXT_EFFECTS[id];
      const expected = GROUP_1[id];
      expect(definition).toBeDefined();
      expect(definition.effectKey).toBe(id);
      expect(definition.stat).toBe(expected.stat);
      expect(definition.difficulty).toBe(expected.difficulty);
      expect(definition.effect).toEqual(expected.effect);
      expect(definition.failureSummary).toBe(expected.failureSummary);
      expect(definition.failureEffect).toBeUndefined();
      expect(definition.sectorDeck).toEqual(expected.sectorDeck);
      expect(JSON.stringify(definition)).not.toMatch(HEAT_OR_REPLACEMENT_EFFECT);

      const resolved = resolveSpaceText(id);
      expect(resolved.effect).toEqual(expected.effect);
      expect(resolved.check).toMatchObject({ stat: expected.stat, difficulty: expected.difficulty });
      expect(resolved.check?.failureSummary).toBe(expected.failureSummary);
      expect(resolved.check?.failureEffect).toBeNull();
    }
  });

  it.each(GROUP_1_IDS)("resolves %s failure with no substitute consequence or empty result row", (id) => {
    const state = stateAtEffect(id);
    const before = structuredClone(state.players[0]!.character);
    const expected = GROUP_1[id];
    const result = reduceGameState(state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      effectKey: id,
      summary: expected.failureSummary,
      effect: null,
      checkStat: expected.stat,
      difficulty: expected.difficulty,
      roll: { faces: [1, 1], total: 2 },
      statBonus: 0,
      total: 2,
      success: false,
      sectorId: state.players[0]!.sectorId,
      createdAt: `c2b1-${id}-failure`
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character).toEqual(before);
    expect(result.state.phase).toBe("broadcast");
    expect(result.state.activeResolution).toMatchObject({
      outcome: {
        title: "Space check failed",
        text: expected.failureSummary,
        effects: []
      }
    });
    expect(result.emitted).toEqual([]);

    const projections = [
      createPhoneProjection(result.state, "seat-1", true),
      createPhoneProjection(result.state, "seat-2", true),
      createTvProjection(result.state),
      createPhoneProjection(structuredClone(result.state), "seat-1", true)
    ];
    for (const projection of projections) {
      const scopedResult = JSON.stringify({
        activeResolution: projection.activeResolution,
        outcomeSummary: projection.outcomeSummary,
        publicResultDeltas: projection.publicResultDeltas
      });
      expect(scopedResult).not.toMatch(/\bHeat\b|gain_heat|lose_heat|HEAT_THRESHOLD_REACHED/i);
      expect(scopedResult).not.toContain('"effects":[""]');
    }

    const duplicate = reduceGameState(result.state, {
      type: "SPACE_TEXT_RESOLVED",
      seatId: "seat-1",
      effectKey: id,
      summary: expected.failureSummary,
      effect: null,
      createdAt: `c2b1-${id}-duplicate`
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state).toBe(result.state);
  });
});
