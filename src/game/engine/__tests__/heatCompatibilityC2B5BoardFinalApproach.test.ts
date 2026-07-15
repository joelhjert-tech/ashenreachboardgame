import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { BOARD_SPACES, getBoardSpace } from "../../data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS, resolveBoardTextChoice, validateBoardTextEffectCoverage } from "../../data/boardTextEffects.js";
import { getMovementStepBlockReason } from "../../rules/movementPlanner.js";
import { resolveSpaceText } from "../../rules/tileTextResolver.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

const GROUP_5 = {
  middle_guardianSpanThreshold: {
    spaces: ["middle_guardian_span"],
    choices: [
      {
        id: "seal-alignment",
        label: "Align the threshold seals",
        stat: "command",
        difficulty: 9,
        summary: "Aligned the threshold seals and fixed a legal route into the inner breach.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "guardian-span-clearance" },
            { type: "gain_note", text: "Guardian Span threshold aligned for breach entry." }
          ]
        },
        failureSummary: "The threshold seals resisted alignment and the span lashed back with pressure."
      },
      {
        id: "ghost-marker",
        label: "Ghost a route marker",
        stat: "signal",
        difficulty: 9,
        summary: "Ghosted a route marker through Guardian Span and opened a quieter breach entry.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "guardian-span-clearance" },
            { type: "gain_note", text: "Guardian Span route marker held long enough to chart the breach." }
          ]
        },
        failureSummary: "The ghost marker bled out across the span and left you exposed to the threshold wash."
      }
    ]
  },
  inner_cinderLatticeTrial: {
    spaces: ["inner_cinder_lattice"],
    choices: [
      {
        id: "trace-embers",
        label: "Trace the ember pulses",
        stat: "signal",
        difficulty: 10,
        summary: "Traced the ember lattice pulses and locked a clean timing route toward the core.",
        effect: { type: "gain_note", text: "Cinder lattice ember pulse traced into a stable core approach." },
        failureSummary: "The ember trace slipped its rhythm and the lattice answered with rising interference."
      },
      {
        id: "ghost-angles",
        label: "Read the ghost angles",
        stat: "guile",
        difficulty: 10,
        summary: "Read the ghost angles in the lattice and cut a covert line toward the final gate.",
        effect: { type: "gain_note", text: "Cinder lattice ghost angles mapped a covert final-gate route." },
        failureSummary: "The ghost angles misaligned and the lattice fed your position back into the fireline."
      }
    ]
  },
  inner_gateOfCindersTrial: {
    spaces: ["inner_gate_of_cinders"],
    choices: [
      {
        id: "brace-locks",
        label: "Brace the cinder locks",
        stat: "grit",
        difficulty: 12,
        summary: "Braced the cinder locks apart and forced a direct breach into the core chamber.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "gate-of-cinders-breached" },
            { type: "gain_note", text: "Gate of Cinders forced open under brute brace pressure." }
          ]
        },
        failureSummary: "The cinder locks held under the strain and burned the operative back."
      },
      {
        id: "time-relays",
        label: "Time the relay pulse",
        stat: "signal",
        difficulty: 12,
        summary: "Timed the relay pulse perfectly and cut a clean breach into the core chamber.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "gate-of-cinders-breached" },
            { type: "gain_note", text: "Gate of Cinders relay pulse timed cleanly for the core breach." }
          ]
        },
        failureSummary: "The relay timing slipped and the gate answered with a surge of static backlash."
      },
      {
        id: "ghost-path",
        label: "Ghost the last breach path",
        stat: "guile",
        difficulty: 12,
        summary: "Ghosted the last breach path and slipped a viable route into the core chamber.",
        effect: {
          type: "sequence",
          effects: [
            { type: "gain_note", text: "gate-of-cinders-breached" },
            { type: "gain_note", text: "Gate of Cinders ghost-path fixed long enough to reach the core." }
          ]
        },
        failureSummary: "The ghost-path collapsed underfoot and left the approach running hot."
      }
    ]
  }
} as const;

const GROUP_5_IDS = Object.keys(GROUP_5) as Array<keyof typeof GROUP_5>;
const FORBIDDEN_REPLACEMENT = /gain_heat|lose_heat|gain_heat_all|take_wound|gain_scar|lose_salvage|advance_escalation|forced_displacement|temporary_modifier|equipment_suppression/i;

function stateAtEffect(effectKey: keyof typeof GROUP_5): GameState {
  const spaceId = GROUP_5[effectKey].spaces[0];
  const state = createInitialSessionState(`c2b5-${effectKey}`, "multiplayer", undefined, undefined, "standard", 2);
  state.status = "active";
  state.phase = "action";
  state.players[0]!.sectorId = spaceId;
  state.players[0]!.character.currentSpaceId = spaceId;
  state.sectors = state.sectors.map((sector) =>
    sector.id === spaceId ? { ...sector, encounterDecks: { ...sector.encounterDecks, threat: [] } } : sector
  );
  return state;
}

function resolveChoice(
  state: GameState,
  effectKey: keyof typeof GROUP_5,
  optionIndex: number,
  success: boolean,
  createdAt: string
) {
  const option = GROUP_5[effectKey].choices[optionIndex]!;
  return reduceGameState(state, {
    type: "SPACE_TEXT_RESOLVED",
    seatId: "seat-1",
    effectKey,
    summary: success ? option.summary : option.failureSummary,
    effect: success ? option.effect as EncounterEffect : null,
    checkStat: option.stat,
    difficulty: option.difficulty,
    roll: { faces: success ? [6, 6] : [1, 1], total: success ? 12 : 2 },
    statBonus: 0,
    total: success ? 12 : 2,
    success,
    sectorId: state.players[0]!.sectorId,
    createdAt
  });
}

describe("Heat Compatibility C2B5 final board approach cleanup", () => {
  it("preserves the three approved definitions, exact choices, checks, notes, and ordering", () => {
    expect(GROUP_5_IDS).toHaveLength(3);
    expect(new Set(GROUP_5_IDS).size).toBe(3);

    for (const id of GROUP_5_IDS) {
      const expected = GROUP_5[id];
      const definition = BOARD_TEXT_EFFECTS[id];
      expect(definition?.choices).toEqual(expected.choices.map(({ label: _label, ...choice }) => choice));
      expect(JSON.stringify(definition)).not.toMatch(FORBIDDEN_REPLACEMENT);
      expect(BOARD_SPACES.filter((space) => space.textBox.effectKey === id).map((space) => space.id)).toEqual(expected.spaces);

      expected.choices.forEach((option, index) => {
        expect(resolveBoardTextChoice(id, option.id)).toEqual(definition?.choices?.[index]);
        expect(resolveSpaceText(id, option.id)).toEqual({
          effectKey: id,
          summary: option.summary,
          effect: option.effect,
          check: {
            stat: option.stat,
            difficulty: option.difficulty,
            failureSummary: option.failureSummary,
            failureEffect: null
          }
        });
      });
    }

    expect(validateBoardTextEffectCoverage()).toEqual({
      missingEffectKeys: [],
      unusedEffectKeys: [],
      mismatchedChoiceKeys: [],
      invalidCheckKeys: [],
      legacyBoardTestKeys: []
    });
  });

  it.each(GROUP_5_IDS)("resolves each %s success once without changing scenario state", (id) => {
    GROUP_5[id].choices.forEach((option, index) => {
      const state = stateAtEffect(id);
      const scenarioBefore = structuredClone({
        progress: state.scenarioProgress,
        preparation: state.scenarioPreparation,
        confrontation: state.scenarioConfrontation,
        result: state.scenarioResult,
        winnerSeatId: state.winnerSeatId
      });
      const result = resolveChoice(state, id, index, true, `c2b5-${id}-${option.id}-success`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const expectedNotes = option.effect.type === "sequence"
        ? option.effect.effects.map((effect) => effect.text)
        : [option.effect.text];
      expect(result.state.players[0]!.private.notes).toEqual(expect.arrayContaining(expectedNotes));
      expect({
        progress: result.state.scenarioProgress,
        preparation: result.state.scenarioPreparation,
        confrontation: result.state.scenarioConfrontation,
        result: result.state.scenarioResult,
        winnerSeatId: result.state.winnerSeatId
      }).toEqual(scenarioBefore);
      expect(result.state.status).toBe("active");
    });
  });

  it.each(GROUP_5_IDS)("keeps every %s failure consequence-free and withholds notes", (id) => {
    GROUP_5[id].choices.forEach((option, index) => {
      const state = stateAtEffect(id);
      const before = structuredClone(state.players[0]);
      const result = resolveChoice(state, id, index, false, `c2b5-${id}-${option.id}-failure`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.players[0]!.character).toEqual(before!.character);
      expect(result.state.players[0]!.private.notes).toEqual(before!.private.notes);
      expect(result.state.activeResolution?.outcome?.effects).toEqual([]);
      expect(result.state.scenarioResult.status).toBe("unresolved");
    });
  });

  it("preserves Guardian Span and center entry requirements exactly", () => {
    expect(getBoardSpace("inner_veil_rift")?.movementRequirements).toEqual([
      {
        allowedFrom: ["middle_guardian_span"],
        requiredNotes: ["guardian-span-clearance"],
        errorMessage: "Resolve Guardian Span before entering the inner breach"
      }
    ]);
    expect(getBoardSpace("center_cinder_gate")?.movementRequirements).toEqual([
      {
        allowedFrom: ["inner_gate_of_cinders", "inner_blackstar_shortcut"],
        errorMessage: "Only the Last Signal Well or Dead Star Reliquary opens the final route into the core chamber"
      },
      {
        requiredNotes: ["gate-of-cinders-breached"],
        errorMessage: "Resolve the Last Signal Well before entering the Ashen Reach Core"
      }
    ]);

    const guardian = stateAtEffect("middle_guardianSpanThreshold");
    expect(getMovementStepBlockReason(guardian, guardian.players[0]!, "middle_guardian_span", "inner_veil_rift"))
      .toBe("Resolve Guardian Span before entering the inner breach");
    guardian.players[0]!.private.notes.push("guardian-span-clearance");
    expect(getMovementStepBlockReason(guardian, guardian.players[0]!, "middle_guardian_span", "inner_veil_rift")).toBeNull();

    const gate = stateAtEffect("inner_gateOfCindersTrial");
    expect(getMovementStepBlockReason(gate, gate.players[0]!, "inner_gate_of_cinders", "center_cinder_gate"))
      .toBe("Resolve the Last Signal Well before entering the Ashen Reach Core");
    gate.players[0]!.private.notes.push("gate-of-cinders-breached");
    expect(getMovementStepBlockReason(gate, gate.players[0]!, "inner_gate_of_cinders", "center_cinder_gate")).toBeNull();
  });

  it.each(GROUP_5_IDS)("keeps %s owner-note state private and projections Heat-free", (id) => {
    const pending = stateAtEffect(id);
    const reconnectedPending = structuredClone(pending);
    expect(reconnectedPending.players[0]!.sectorId).toBe(pending.players[0]!.sectorId);
    expect(GROUP_5[id].choices.map((choice) => resolveSpaceText(id, choice.id).effect)).toEqual(
      GROUP_5[id].choices.map((choice) => choice.effect)
    );

    const completed = resolveChoice(reconnectedPending, id, 0, true, `c2b5-${id}-projection`);
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    const reconnectedCompleted = structuredClone(completed.state);
    const owner = createPhoneProjection(completed.state, "seat-1", true);
    const other = createPhoneProjection(completed.state, "seat-2", true);
    const tv = createTvProjection(completed.state);
    expect((owner.self as { notes?: string[] } | null)?.notes?.length).toBeGreaterThan(0);
    expect((other.self as { notes?: string[] } | null)?.notes ?? []).toEqual([]);
    expect(reconnectedCompleted.players[0]!.private.notes).toEqual(completed.state.players[0]!.private.notes);
    for (const projection of [owner, other, tv]) {
      const scoped = JSON.stringify({
        activeResolution: projection.activeResolution,
        outcomeSummary: projection.outcomeSummary,
        publicResultDeltas: projection.publicResultDeltas
      });
      expect(scoped).not.toMatch(/\bHeat\b|gain_heat|lose_heat|HEAT_THRESHOLD_REACHED/i);
      expect(scoped).not.toContain('"effects":[""]');
    }

    const duplicate = resolveChoice(completed.state, id, 0, true, `c2b5-${id}-duplicate`);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state).toBe(completed.state);
  });
});
