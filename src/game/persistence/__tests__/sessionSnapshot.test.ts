import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { legacySessionSnapshotSchemaV0, sessionSnapshotSchema, sessionSnapshotSchemaV1 } from "../../schema/session.schema.js";
import {
  CURRENT_SAVE_VERSION,
  UnsupportedSnapshotVersionError,
  migrateSessionSnapshotV0ToV1,
  migrateSessionSnapshotV1ToV2,
  parseAndMigrateSessionSnapshot,
  serializeSessionSnapshotV2
} from "../sessionSnapshot.js";

function legacySnapshot(heats: number[] = [0]) {
  const state = createInitialSessionState("legacy-room", heats.length > 1 ? "multiplayer" : "single-player", undefined, "co-op", "standard", heats.length);
  const { reflectionPressureThreshold, ...legacyState } = state;
  return {
    sessionId: state.sessionId,
    sequence: state.sequence,
    state: {
      ...legacyState,
      heatThreshold: reflectionPressureThreshold,
      players: state.players.map((player, index) => ({
        ...player,
        character: { ...player.character, heat: heats[index] ?? 0 }
      }))
    }
  };
}

function v1Snapshot(heats: number[] = [0]) {
  return migrateSessionSnapshotV0ToV1(legacySnapshot(heats));
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
    const missingThreshold = structuredClone(legacySnapshot([0])) as Record<string, any>;
    delete missingThreshold.state.heatThreshold;
    expect(() => parseAndMigrateSessionSnapshot(missingThreshold)).toThrow();
    for (const invalid of [0, -1, 1.5, "8", null, [], {}]) {
      const input = structuredClone(legacySnapshot([0])) as Record<string, any>;
      input.state.heatThreshold = invalid;
      expect(() => parseAndMigrateSessionSnapshot(input)).toThrow();
    }
    expect(() => parseAndMigrateSessionSnapshot({ ...legacySnapshot([0]), state: { ...legacySnapshot([0]).state, reflectionPressureThreshold: 8 } })).toThrow();
  });

  it("migrates zero Heat through v1 to a Heat-free v2 snapshot without metadata", () => {
    const migrated = parseAndMigrateSessionSnapshot(legacySnapshot([0]));
    expect(migrated.saveVersion).toBe(2);
    expect(migrated.state.reflectionPressureThreshold).toBe(8);
    expect("heatThreshold" in migrated.state).toBe(false);
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

  it("keeps strict v1 compatibility and requires only the old threshold key", () => {
    const legacy = v1Snapshot([0]);
    expect(sessionSnapshotSchemaV1.parse(legacy)).toEqual(legacy);
    expect(() => sessionSnapshotSchemaV1.parse({ ...legacy, state: { ...legacy.state, reflectionPressureThreshold: 8 } })).toThrow();
    expect(() => sessionSnapshotSchemaV1.parse({ ...legacy, state: { ...legacy.state, heatThreshold: undefined } })).toThrow();
    expect(() => sessionSnapshotSchemaV1.parse({ ...legacy, state: { ...legacy.state, heatThreshold: 0 } })).toThrow();
    for (const invalid of [-1, 1.5, "8", null, [], {}]) {
      expect(() => sessionSnapshotSchemaV1.parse({ ...legacy, state: { ...legacy.state, heatThreshold: invalid } })).toThrow();
    }
  });

  it("validates v2 strictly, rejecting old/direct Heat fields and invalid metadata", () => {
    const current = serializeSessionSnapshotV2(createInitialSessionState("v2-room", "single-player"));
    expect(sessionSnapshotSchema.parse(current)).toEqual(current);
    expect(() => sessionSnapshotSchema.parse({ ...current, state: { ...current.state, heatThreshold: 8 } })).toThrow();
    expect(() => sessionSnapshotSchema.parse({ ...current, state: { ...current.state, reflectionPressureThreshold: undefined } })).toThrow();
    for (const invalid of [0, -1, 1.5, "8", null, [], {}]) {
      expect(() => sessionSnapshotSchema.parse({ ...current, state: { ...current.state, reflectionPressureThreshold: invalid } })).toThrow();
    }
    expect(() => sessionSnapshotSchema.parse({ ...current, state: { ...current.state, players: current.state.players.map((player) => ({ ...player, character: { ...player.character, heat: 0 } })) } })).toThrow();
    const owner = current.state.players[0]!;
    const record = { seatId: owner.seatId, characterId: owner.character.id, value: 7 };
    expect(() => sessionSnapshotSchema.parse({ ...current, legacyCompatibility: { characterHeat: [{ ...record, value: 0 }] } })).toThrow();
    expect(() => sessionSnapshotSchema.parse({ ...current, legacyCompatibility: { characterHeat: [record, record] } })).toThrow();
    expect(() => sessionSnapshotSchema.parse({ ...current, legacyCompatibility: { characterHeat: [{ ...record, seatId: "wrong" }] } })).toThrow();
    for (const version of [3, -1, 1.5, "2", null]) expect(() => parseAndMigrateSessionSnapshot({ ...current, saveVersion: version }, "fixture.json")).toThrow(UnsupportedSnapshotVersionError);
  });

  it("renames the v1 key exactly without mutating state or archival metadata", () => {
    const source = v1Snapshot([7]);
    const before = structuredClone(source);
    const migrated = migrateSessionSnapshotV1ToV2(source);
    expect(source).toEqual(before);
    expect(migrated.saveVersion).toBe(2);
    expect(migrated.state.reflectionPressureThreshold).toBe(source.state.heatThreshold);
    expect("heatThreshold" in migrated.state).toBe(false);
    expect(migrated.legacyCompatibility).toEqual(source.legacyCompatibility);
    expect(migrateSessionSnapshotV1ToV2(source)).toEqual(migrated);
  });

  it("is deterministic and idempotent and keeps archival metadata through serialization", () => {
    const source = legacySnapshot([7]);
    const first = parseAndMigrateSessionSnapshot(source);
    expect(parseAndMigrateSessionSnapshot(source)).toEqual(first);
    expect(parseAndMigrateSessionSnapshot(first)).toEqual(first);
    const serialized = serializeSessionSnapshotV2(first.state, first.legacyCompatibility);
    expect(parseAndMigrateSessionSnapshot(serialized)).toEqual(first);
    expect(serialized.legacyCompatibility?.characterHeat[0]?.value).toBe(7);

    const replacementState = structuredClone(first.state);
    replacementState.players[0]!.character.id = "replacement-character";
    const afterReplacement = serializeSessionSnapshotV2(replacementState, first.legacyCompatibility);
    expect(afterReplacement.state.players[0]!.character.id).toBe("replacement-character");
    expect(afterReplacement.legacyCompatibility).toEqual(first.legacyCompatibility);
  });

  it("normalizes legacy Broken Seal progress into preparation without changing save versions", () => {
    const current = serializeSessionSnapshotV2(createInitialSessionState("legacy-broken-seal", "multiplayer"));
    const { scenarioPreparation, scenarioConfrontation, scenarioResult, ...legacyState } = current.state;
    const legacyV2 = {
      ...current,
      state: {
        ...legacyState,
        scenarioProgress: { ...legacyState.scenarioProgress, sealTokens: 4 }
      }
    };

    const normalized = parseAndMigrateSessionSnapshot(legacyV2);
    expect(normalized.saveVersion).toBe(2);
    expect(normalized.state.scenarioPreparation.resources.sealIntegrity).toBe(4);
    expect(normalized.state.scenarioConfrontation.progress).toEqual({});
    expect(normalized.state.scenarioResult.status).toBe("unresolved");
  });

  it("creates Heat-free new snapshots and omits empty compatibility metadata", () => {
    const snapshot = serializeSessionSnapshotV2(createInitialSessionState("new-room", "single-player"));
    expect(snapshot.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(snapshot.legacyCompatibility).toBeUndefined();
    expect(snapshot.state.players.every((player) => !("heat" in player.character))).toBe(true);
  });
});
