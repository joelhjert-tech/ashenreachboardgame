import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { legacySessionSnapshotSchemaV0, sessionSnapshotSchema } from "../../schema/session.schema.js";
import {
  CURRENT_SAVE_VERSION,
  UnsupportedSnapshotVersionError,
  migrateSessionSnapshotV0ToV1,
  parseAndMigrateSessionSnapshot,
  serializeSessionSnapshotV1
} from "../sessionSnapshot.js";

function legacySnapshot(heats: number[] = [0]) {
  const state = createInitialSessionState("legacy-room", heats.length > 1 ? "multiplayer" : "single-player", undefined, "co-op", "standard", heats.length);
  return {
    sessionId: state.sessionId,
    sequence: state.sequence,
    state: {
      ...state,
      players: state.players.map((player, index) => ({
        ...player,
        character: { ...player.character, heat: heats[index] ?? 0 }
      }))
    }
  };
}

describe("versioned session snapshot migration", () => {
  it("strictly parses unversioned v0 Heat and rejects missing or malformed legacy Heat", () => {
    expect(legacySessionSnapshotSchemaV0.parse(legacySnapshot([0])).state.players[0]!.character.heat).toBe(0);
    expect(legacySessionSnapshotSchemaV0.parse(legacySnapshot([7])).state.players[0]!.character.heat).toBe(7);
    const missing = structuredClone(legacySnapshot([0])) as Record<string, any>;
    delete missing.state.players[0].character.heat;
    expect(() => parseAndMigrateSessionSnapshot(missing)).toThrow();
    for (const invalid of ["7", -1, 1.5, null]) {
      const input = structuredClone(legacySnapshot([0])) as Record<string, any>;
      input.state.players[0].character.heat = invalid;
      expect(() => parseAndMigrateSessionSnapshot(input)).toThrow();
    }
  });

  it("migrates zero Heat to a Heat-free v1 snapshot without metadata", () => {
    const migrated = parseAndMigrateSessionSnapshot(legacySnapshot([0]));
    expect(migrated.saveVersion).toBe(1);
    expect("heat" in migrated.state.players[0]!.character).toBe(false);
    expect(migrated.legacyCompatibility).toBeUndefined();
  });

  it("preserves exact nonzero values by stable seat and character identity", () => {
    const migrated = migrateSessionSnapshotV0ToV1(legacySnapshot([7, 3]));
    expect(migrated.state.players.every((player) => !("heat" in player.character))).toBe(true);
    expect(migrated.legacyCompatibility?.characterHeat).toEqual(
      migrated.state.players.map((player, index) => ({ seatId: player.seatId, characterId: player.character.id, value: [7, 3][index] }))
    );
  });

  it("preserves all non-Heat state and pending/resolved interaction state without mutating input", () => {
    const source = legacySnapshot([7]);
    source.state.pendingEncounterDecision = {
      decisionId: "decision-1", decisionVersion: 1, seatId: source.state.players[0]!.seatId, sourceCardId: "gate-tax-collectors",
      sourceResolutionId: "resolution-1", sourceBranch: "woundOnLoss", decisionKey: "tax", mode: "required", prompt: "Pay",
      salvageCost: 1, paidOptionId: "pay", paidLabel: "Pay 1 Salvage", paidEffect: { type: "none" }, declineOptionId: null,
      declineLabel: null, declineEffect: null, unavailableEffect: { type: "none" }, legalOptionIds: ["pay"], createdAt: "now", status: "pending"
    } as any;
    source.state.resolvedEncounterDecisionIds = ["closed-1"];
    const before = structuredClone(source);
    const migrated = parseAndMigrateSessionSnapshot(source);
    expect(source).toEqual(before);
    expect(migrated.state.pendingEncounterDecision).toEqual(source.state.pendingEncounterDecision);
    expect(migrated.state.resolvedEncounterDecisionIds).toEqual(["closed-1"]);
    expect(migrated.state.players[0]!.character.salvage).toBe(source.state.players[0]!.character.salvage);
    expect(migrated.state.players[0]!.character.heldGear).toEqual(source.state.players[0]!.character.heldGear);
  });

  it("validates v1 strictly, rejects direct Heat, zero/duplicate/bad-owner metadata, and future versions", () => {
    const current = serializeSessionSnapshotV1(createInitialSessionState("v1-room", "single-player"));
    expect(sessionSnapshotSchema.parse(current)).toEqual(current);
    expect(() => sessionSnapshotSchema.parse({ ...current, state: { ...current.state, players: current.state.players.map((player) => ({ ...player, character: { ...player.character, heat: 0 } })) } })).toThrow();
    const owner = current.state.players[0]!;
    const record = { seatId: owner.seatId, characterId: owner.character.id, value: 7 };
    expect(() => sessionSnapshotSchema.parse({ ...current, legacyCompatibility: { characterHeat: [{ ...record, value: 0 }] } })).toThrow();
    expect(() => sessionSnapshotSchema.parse({ ...current, legacyCompatibility: { characterHeat: [record, record] } })).toThrow();
    expect(() => sessionSnapshotSchema.parse({ ...current, legacyCompatibility: { characterHeat: [{ ...record, seatId: "wrong" }] } })).toThrow();
    for (const version of [2, -1, 1.5, "1", null]) expect(() => parseAndMigrateSessionSnapshot({ ...current, saveVersion: version }, "fixture.json")).toThrow(UnsupportedSnapshotVersionError);
  });

  it("is deterministic and idempotent and keeps archival metadata through serialization", () => {
    const source = legacySnapshot([7]);
    const first = parseAndMigrateSessionSnapshot(source);
    expect(parseAndMigrateSessionSnapshot(source)).toEqual(first);
    expect(parseAndMigrateSessionSnapshot(first)).toEqual(first);
    const serialized = serializeSessionSnapshotV1(first.state, first.legacyCompatibility);
    expect(parseAndMigrateSessionSnapshot(serialized)).toEqual(first);
    expect(serialized.legacyCompatibility?.characterHeat[0]?.value).toBe(7);

    const replacementState = structuredClone(first.state);
    replacementState.players[0]!.character.id = "replacement-character";
    const afterReplacement = serializeSessionSnapshotV1(replacementState, first.legacyCompatibility);
    expect(afterReplacement.state.players[0]!.character.id).toBe("replacement-character");
    expect(afterReplacement.legacyCompatibility).toEqual(first.legacyCompatibility);
  });

  it("creates Heat-free new snapshots and omits empty compatibility metadata", () => {
    const snapshot = serializeSessionSnapshotV1(createInitialSessionState("new-room", "single-player"));
    expect(snapshot.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(snapshot.legacyCompatibility).toBeUndefined();
    expect(snapshot.state.players.every((player) => !("heat" in player.character))).toBe(true);
  });
});
