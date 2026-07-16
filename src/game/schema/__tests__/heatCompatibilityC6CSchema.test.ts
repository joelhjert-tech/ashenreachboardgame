import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../../../server/sessionState.js";
import {
  normalizeLegacyGameAction,
  type LegacyCompatibilityEventRecord
} from "../../persistence/legacyGameActionCompatibility.js";
import {
  parseAndMigrateSessionSnapshot,
  serializeSessionSnapshotV2
} from "../../persistence/sessionSnapshot.js";
import { normalizeLegacyEncounterEffect } from "../../rules/legacyHeatCompatibility.js";
import type { LegacyCompatibleGameAction } from "../../engine/actions.js";
import {
  authoredEffectSchema,
  effectSchema,
  legacyCompatibleEffectSchema
} from "../card.schema.js";
import {
  followerSchema,
  legacyCompatibleFollowerSchema,
  normalizeLegacyFollowerMetadata
} from "../follower.schema.js";
import {
  gearItemSchema,
  legacyCompatibleGearItemSchema,
  normalizeLegacyGearItem
} from "../gear.schema.js";

const gear = {
  id: "legacy-c6c-gear",
  name: "Legacy C6C Gear",
  slot: "utility" as const,
  statBonus: { stat: "signal" as const, amount: 1 }
};

const follower = {
  id: "legacy-c6c-follower",
  name: "Legacy C6C Follower",
  role: "guide" as const,
  text: "Reads the furnace heat without using a player resource."
};

describe("Heat Compatibility C6C schema and type boundary", () => {
  it("structurally rejects Heat in authored and current runtime effects", () => {
    expect(authoredEffectSchema.safeParse({ type: "gain_heat", amount: 1 }).success).toBe(false);
    expect(authoredEffectSchema.safeParse({ type: "gain_heat_all", amount: 1 }).success).toBe(false);
    expect(authoredEffectSchema.safeParse({ type: "lose_heat", amount: 1 }).success).toBe(false);
    expect(effectSchema.safeParse({ type: "gain_heat", amount: 1 }).success).toBe(false);
  });

  it("accepts legacy Heat leaves only through the compatibility schema and normalizes them inertly", () => {
    for (const type of ["gain_heat", "gain_heat_all", "lose_heat"] as const) {
      const legacy = legacyCompatibleEffectSchema.parse({ type, amount: 1 });
      expect(normalizeLegacyEncounterEffect(legacy)).toEqual({
        type: "legacy_compatibility_noop"
      });
    }

    const sequence = legacyCompatibleEffectSchema.parse({
      type: "sequence",
      effects: [
        { type: "gain_note", text: "first" },
        { type: "gain_heat", amount: 1 },
        { type: "gain_note", text: "second" }
      ]
    });
    expect(normalizeLegacyEncounterEffect(sequence)).toEqual({
      type: "sequence",
      effects: [
        { type: "gain_note", text: "first" },
        { type: "gain_note", text: "second" }
      ]
    });
  });

  it("keeps environmental prose valid while isolating legacy gear and follower metadata", () => {
    expect(followerSchema.parse(follower).text).toContain("furnace heat");
    expect(gearItemSchema.safeParse({ ...gear, heatCost: 1 }).success).toBe(false);
    expect(followerSchema.safeParse({ ...follower, tags: ["heat"] }).success).toBe(false);
    expect(followerSchema.safeParse({ ...follower, lossCondition: "heat" }).success).toBe(false);

    const legacyGear = legacyCompatibleGearItemSchema.parse({ ...gear, heatCost: 1 });
    const legacyFollower = legacyCompatibleFollowerSchema.parse({
      ...follower,
      tags: ["heat", "route"],
      lossCondition: "heat"
    });
    expect(normalizeLegacyGearItem(legacyGear)).not.toHaveProperty("heatCost");
    expect(normalizeLegacyFollowerMetadata(legacyFollower)).toMatchObject({
      tags: ["route"]
    });
    expect(normalizeLegacyFollowerMetadata(legacyFollower)).not.toHaveProperty("lossCondition");
  });

  it("routes threshold actions to an inert compatibility record instead of the current reducer", () => {
    const action: LegacyCompatibleGameAction = {
      type: "HEAT_THRESHOLD_REACHED",
      seatId: "seat-1",
      threshold: 6,
      newHeatTotal: 9,
      createdAt: "legacy-threshold"
    };
    const normalized = normalizeLegacyGameAction(action);
    expect(normalized).toEqual<LegacyCompatibilityEventRecord>({
      type: "LEGACY_COMPATIBILITY_EVENT",
      legacyType: "HEAT_THRESHOLD_REACHED",
      seatId: "seat-1",
      createdAt: "legacy-threshold"
    });
  });

  it("loads a legacy-compatible v2 snapshot and writes only canonical state plus archival metadata", () => {
    const state = createInitialSessionState("c6c-v2", "single-player");
    const seatId = state.players[0]!.seatId;
    const characterId = state.players[0]!.character.id;
    const legacy = structuredClone({
      saveVersion: 2 as const,
      sessionId: state.sessionId,
      sequence: state.sequence,
      state
    });
    Object.assign(legacy.state.players[0]!.character, { heat: 7 });
    legacy.state.pendingEffect = { type: "gain_heat", amount: 1 } as never;
    legacy.state.eventLog = [{
      type: "HEAT_THRESHOLD_REACHED",
      seatId,
      threshold: 6,
      newHeatTotal: 7,
      createdAt: "legacy-replay"
    }];
    legacy.state.shopStockReveals = [{
      seatId,
      sectorId: state.players[0]!.character.currentSpaceId,
      serviceId: "legacy-service",
      shopName: "Legacy Shop",
      stockIds: [],
      revealCost: { salvage: 1, heat: 2 },
      createdAt: "legacy-shop"
    }] as never;

    const migrated = parseAndMigrateSessionSnapshot(legacy);
    expect(migrated.state.players[0]!.character).not.toHaveProperty("heat");
    expect(migrated.state.pendingEffect).toEqual({ type: "legacy_compatibility_noop" });
    expect(migrated.state.eventLog).toEqual([{
      type: "LEGACY_COMPATIBILITY_EVENT",
      legacyType: "HEAT_THRESHOLD_REACHED",
      seatId,
      createdAt: "legacy-replay"
    }]);
    expect(migrated.state.shopStockReveals[0]!.revealCost).toEqual({ salvage: 1 });
    expect(migrated.legacyCompatibility?.characterHeat).toEqual([{
      seatId,
      characterId,
      value: 7
    }]);

    const serialized = serializeSessionSnapshotV2(
      migrated.state,
      migrated.legacyCompatibility
    );
    expect(serialized.saveVersion).toBe(2);
    expect(serialized.state.players[0]!.character).not.toHaveProperty("heat");
    expect(serialized.state.pendingEffect).toEqual({ type: "legacy_compatibility_noop" });
    expect(serialized.legacyCompatibility?.characterHeat[0]?.value).toBe(7);
  });
});
