import { describe, expect, it } from "vitest";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { BOARD_SPACES, getBoardSpace } from "../../data/boardSpaces.js";
import {
  BOARD_TEXT_EFFECTS,
  resolveBoardTextChoice,
  validateBoardTextEffectCoverage
} from "../../data/boardTextEffects.js";
import { resolveSpaceText } from "../../rules/tileTextResolver.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import { reduceGameState } from "../reducer.js";

const GROUP_4 = {
  middle_shardSprawlBargain: {
    summary: "Cut a hard bargain in the Shard Sprawl.",
    spaces: ["middle_shard_sprawl", "the-salt-archive", "blastworks"],
    choices: [
      {
        id: "stock",
        label: "Take passage stock",
        stat: "command",
        difficulty: 8,
        summary: "Pressed the Shard Sprawl for passage stock and secured a calmer route cache.",
        effect: { type: "gain_note", text: "Shard Sprawl passage stock secured for the next route push." },
        failureSummary: "The Shard Sprawl stock deal turned sour and the route crew pushed back."
      },
      {
        id: "gossip",
        label: "Press for gossip",
        stat: "guile",
        difficulty: 8,
        summary: "Cut a quieter bargain in the Shard Sprawl and took field gossip instead of supply stock.",
        effect: { type: "sequence", effects: [
          { type: "gain_follower", followerId: "crownless-advocate" },
          { type: "gain_note", text: "Shard Sprawl gossip mapped a safer approach through the middle lanes." }
        ] },
        failureSummary: "The Shard Sprawl gossip line collapsed into rumor and cost you breathing room."
      }
    ]
  },
  middle_webglassFracture: {
    summary: "Threaded the Webglass fracture path and logged a breach route.",
    spaces: ["middle_webglass_breach"],
    choices: [
      {
        id: "hidden-lane",
        label: "Slip the hidden lane",
        stat: "guile",
        difficulty: 9,
        summary: "Slipped through the hidden Webglass lane and logged a safer breach route.",
        effect: { type: "sequence", effects: [
          { type: "gain_follower", followerId: "webglass-runner" },
          { type: "gain_note", text: "Webglass hidden lane mapped through shifting lanes." }
        ] },
        failureSummary: "The hidden Webglass lane buckled and dumped you back into the live fracture."
      },
      {
        id: "relay-splice",
        label: "Splice the relay seam",
        stat: "signal",
        difficulty: 9,
        summary: "Spliced the relay seam into a stable Webglass route before the breach could shift.",
        effect: { type: "sequence", effects: [
          { type: "gain_follower", followerId: "webglass-runner" },
          { type: "gain_note", text: "Webglass relay splice stabilized a mapped breach route." }
        ] },
        failureSummary: "The relay splice flared too hot and the Webglass seam answered with static."
      }
    ]
  },
  inner_veilRiftEntry: {
    summary: "Stabilized the Veil Rift entry long enough to chart the deeper breach.",
    spaces: ["inner_veil_rift"],
    choices: [
      {
        id: "anchor-surge",
        label: "Anchor the surge",
        stat: "signal",
        difficulty: 10,
        summary: "Anchored the Veil Rift surge and fixed a stable breach rhythm for the deeper push.",
        effect: { type: "gain_note", text: "Veil Rift surge anchored for deeper breach timing." },
        failureSummary: "The Veil Rift surge broke loose and left the approach running dangerously hot."
      },
      {
        id: "slip-fold",
        label: "Slip the fold",
        stat: "guile",
        difficulty: 10,
        summary: "Slipped the fold at the Veil Rift and mapped a quieter breach line into the core lanes.",
        effect: { type: "gain_note", text: "Veil Rift fold slipped cleanly for a quieter inner-breach route." },
        failureSummary: "The fold snapped shut at the wrong moment and threw you back into the breach wash."
      }
    ]
  }
} as const;

const GROUP_4_IDS = Object.keys(GROUP_4) as Array<keyof typeof GROUP_4>;

function noteText(effect: { type: string; text?: string; effects?: readonly { type: string; text?: string }[] }): string {
  if (effect.type === "gain_note" && effect.text) return effect.text;
  if (effect.type === "sequence") {
    const note = effect.effects?.find((entry) => entry.type === "gain_note");
    if (note?.text) return note.text;
  }
  throw new Error("Expected board choice to retain its private note effect");
}
const HEAT_OR_REPLACEMENT = /gain_heat|lose_heat|gain_heat_all|take_wound|gain_scar|lose_salvage|advance_escalation|forced_displacement|temporary_modifier|equipment_suppression/i;

function stateAtEffect(effectKey: keyof typeof GROUP_4): GameState {
  const space = BOARD_SPACES.find((entry) => entry.textBox.effectKey === effectKey);
  if (!space) throw new Error(`No board space found for ${effectKey}`);

  const state = createInitialSessionState(`c2b4-${effectKey}`, "multiplayer", undefined, undefined, "standard", 2);
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

function resolveChoice(
  state: GameState,
  effectKey: keyof typeof GROUP_4,
  optionIndex: 0 | 1,
  success: boolean,
  createdAt: string
) {
  const option = GROUP_4[effectKey].choices[optionIndex];
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

describe("Heat Compatibility C2B4 board route-choice cleanup", () => {
  it("preserves exactly three definitions with two ordered server-authored choices", () => {
    expect(GROUP_4_IDS).toHaveLength(3);
    expect(new Set(GROUP_4_IDS).size).toBe(3);

    for (const id of GROUP_4_IDS) {
      const expected = GROUP_4[id];
      const definition = BOARD_TEXT_EFFECTS[id];
      expect(definition).toEqual({
        effectKey: id,
        summary: expected.summary,
        effect: null,
        choices: expected.choices.map(({ label: _label, ...choice }) => choice)
      });
      expect(JSON.stringify(definition)).not.toMatch(HEAT_OR_REPLACEMENT);

      const linkedSpaces = BOARD_SPACES.filter((space) => space.textBox.effectKey === id);
      expect(linkedSpaces.map((space) => space.id).sort()).toEqual([...expected.spaces].sort());
      for (const space of linkedSpaces) {
        expect(space.textBox.choices).toEqual(expected.choices.map(({ id: choiceId, label }) => ({ id: choiceId, label })));
      }

      expected.choices.forEach((option, index) => {
        expect(resolveBoardTextChoice(id, option.id)).toEqual(definition.choices?.[index]);
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

  it("preserves the Melted Gate entry requirement and does not alter center access", () => {
    expect(getBoardSpace("inner_veil_rift")?.movementRequirements).toEqual([
      {
        allowedFrom: ["middle_guardian_span"],
        requiredNotes: ["guardian-span-clearance"],
        errorMessage: "Requires Guardian Span Clearance"
      }
    ]);
    expect(getBoardSpace("center_cinder_gate")?.movementRequirements).toEqual([
      {
        allowedFrom: ["inner_gate_of_cinders", "inner_blackstar_shortcut"],
        errorMessage: "Enter the Core from the Last Signal Well or Dead Star Reliquary"
      },
      {
        requiredNotes: ["gate-of-cinders-breached"],
        errorMessage: "Breach the Gate of Cinders first"
      }
    ]);
  });

  it.each(GROUP_4_IDS)("resolves only the selected %s option and keeps movement state unchanged", (id) => {
    for (const optionIndex of [0, 1] as const) {
      const state = stateAtEffect(id);
      const startingSector = state.players[0]!.sectorId;
      const startingMovement = structuredClone(state.movementRolls);
      const result = resolveChoice(state, id, optionIndex, true, `c2b4-${id}-${optionIndex}-success`);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      const selected = GROUP_4[id].choices[optionIndex];
      const unselected = GROUP_4[id].choices[optionIndex === 0 ? 1 : 0];
      const selectedNote = noteText(selected.effect);
      expect(result.state.players[0]!.private.notes).toContain(selectedNote);
      expect(result.state.players[0]!.private.notes).not.toContain(noteText(unselected.effect));
      expect(result.state.players[0]!.sectorId).toBe(startingSector);
      expect(result.state.players[0]!.character.currentSpaceId).toBe(startingSector);
      expect(result.state.movementRolls).toEqual(startingMovement);
      expect(result.state.activeResolution?.outcome?.effects).toContain(`Success: note added: ${selectedNote}`);
    }
  });

  it.each(GROUP_4_IDS)("keeps both %s failures consequence-free", (id) => {
    for (const optionIndex of [0, 1] as const) {
      const state = stateAtEffect(id);
      const before = structuredClone(state.players[0]);
      const result = resolveChoice(state, id, optionIndex, false, `c2b4-${id}-${optionIndex}-failure`);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      expect(result.state.players[0]!.character).toEqual(before!.character);
      expect(result.state.players[0]!.private.notes).toEqual(before!.private.notes);
      expect(result.state.activeResolution?.outcome?.effects).toEqual([]);
    }
  });

  it.each(GROUP_4_IDS)("keeps %s Heat-free, note-owner scoped, reconnect-safe, and idempotent", (id) => {
    const preselection = stateAtEffect(id);
    const reconnectedBefore = structuredClone(preselection);
    expect(GROUP_4[id].choices.map((choice) => resolveSpaceText(id, choice.id).effect)).toEqual(
      GROUP_4[id].choices.map((choice) => choice.effect)
    );
    expect(reconnectedBefore.players[0]!.sectorId).toBe(preselection.players[0]!.sectorId);

    const completed = resolveChoice(preselection, id, 0, true, `c2b4-${id}-complete`);
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    const selectedNote = noteText(GROUP_4[id].choices[0].effect);

    const owner = createPhoneProjection(completed.state, "seat-1", true);
    const other = createPhoneProjection(completed.state, "seat-2", true);
    const tv = createTvProjection(completed.state);
    expect((owner.self as { notes?: string[] } | null)?.notes).toContain(selectedNote);
    expect((other.self as { notes?: string[] } | null)?.notes ?? []).not.toContain(selectedNote);
    expect(JSON.stringify(other.activeResolution)).toContain(`Success: note added: ${selectedNote}`);
    expect(JSON.stringify(tv.activeResolution)).toContain(`Success: note added: ${selectedNote}`);
    for (const projection of [owner, other, tv, createPhoneProjection(structuredClone(completed.state), "seat-1", true)]) {
      const scoped = JSON.stringify({
        activeResolution: projection.activeResolution,
        outcomeSummary: projection.outcomeSummary,
        publicResultDeltas: projection.publicResultDeltas
      });
      expect(scoped).not.toMatch(/\bHeat\b|gain_heat|lose_heat|HEAT_THRESHOLD_REACHED/i);
      expect(scoped).not.toContain('"effects":[""]');
    }

    const duplicate = resolveChoice(completed.state, id, 0, true, `c2b4-${id}-duplicate`);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.state).toBe(completed.state);
    expect(completed.state.players[0]!.private.notes.filter((note) => note === selectedNote)).toHaveLength(1);
  });

  it("rejects missing and forged option IDs through the existing resolver boundary", () => {
    expect(resolveSpaceText("middle_shardSprawlBargain")).toMatchObject({
      effect: null,
      check: null,
      summary: "A choice is required before resolving middle_shardSprawlBargain."
    });
    expect(resolveBoardTextChoice("middle_shardSprawlBargain", "forged-option")).toBeNull();
    expect(resolveSpaceText("middle_shardSprawlBargain", "forged-option")).toMatchObject({
      effect: null,
      check: null,
      summary: "Unknown board-text choice forged-option for middle_shardSprawlBargain."
    });
  });
});
