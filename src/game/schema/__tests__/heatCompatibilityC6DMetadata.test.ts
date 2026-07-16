import { describe, expect, it } from "vitest";
import { loadFollowers } from "../../content/followers.js";
import { loadThreatCards } from "../../content/threats.js";
import {
  CANONICAL_THREAT_EFFECT_KEYS,
  LEGACY_HEAT_THREAT_EFFECT_KEYS,
  normalizeLegacyThreatEffectKey
} from "../../cards/threatEffectKeys.js";
import { resolveThreatEffect } from "../../cards/threatEffects.js";
import {
  parseAndMigrateSessionSnapshot,
  migrateSessionSnapshotV0ToV1,
  serializeSessionSnapshotV2
} from "../../persistence/sessionSnapshot.js";
import { normalizeLegacyThreatCard } from "../../rules/legacyHeatCompatibility.js";
import {
  authoredThreatCardSchema,
  legacyCompatibleThreatCardSchema
} from "../card.schema.js";
import {
  followerSchema,
  legacyCompatibleFollowerSchema,
  normalizeLegacyFollowerMetadata
} from "../follower.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const legacyFollower = {
  id: "legacy-c6d-follower",
  name: "Legacy C6D Follower",
  role: "guide" as const,
  text: "Reads a safe road.",
  tags: ["route", "heat"],
  lossCondition: "heat" as const
};

const legacyThreat = {
  id: "legacy-c6d-threat",
  type: "threat" as const,
  cardType: "hazard" as const,
  title: "Legacy C6D Threat",
  text: "A historical pending threat.",
  flavor: "The old record remains readable.",
  severity: 1,
  stat: "signal" as const,
  difficulty: 4,
  resourceTags: ["movement", "heat"] as Array<"movement" | "heat">,
  revealEffectKey: "threat_force_choose_heat_or_wound" as const,
  successEffect: { type: "gain_note" as const, text: "Safe." },
  failEffect: { type: "gain_heat" as const, amount: 1 }
};

function legacyV0Snapshot() {
  const state = createInitialSessionState("c6d-v0", "single-player");
  const { reflectionPressureThreshold, ...legacyState } = state;
  return {
    sessionId: state.sessionId,
    sequence: state.sequence,
    state: {
      ...legacyState,
      heatThreshold: reflectionPressureThreshold,
      players: state.players.map((player) => ({
        ...player,
        character: {
          ...player.character,
          heat: 0,
          followers: [legacyFollower]
        }
      })),
      currentEncounter: legacyThreat
    }
  };
}

describe("Heat Compatibility C6D follower and Threat metadata migration", () => {
  it("keeps canonical follower and Threat catalogs Heat-metadata free and structurally stable", () => {
    const followers = loadFollowers();
    const threats = loadThreatCards();
    expect(followers).toHaveLength(24);
    expect(threats).toHaveLength(109);

    for (const follower of followers.values()) {
      expect(follower.lossCondition).not.toBe("heat");
      expect(follower.tags?.map((tag) => tag.toLowerCase()) ?? []).not.toContain("heat");
      expect(followerSchema.parse(follower)).toEqual(follower);
    }
    for (const threat of threats.values()) {
      expect(threat.resourceTags).not.toContain("heat");
      for (const key of [
        threat.effectKey,
        threat.revealEffectKey,
        ...(threat.combatEffectKeys ?? []),
        threat.successEffectKey,
        threat.defeatEffectKey,
        threat.failEffectKey
      ].filter((key) => key !== undefined)) {
        expect(key.toLowerCase()).not.toContain("heat");
        expect(CANONICAL_THREAT_EFFECT_KEYS).toContain(key);
      }
      expect(authoredThreatCardSchema.parse(threat)).toEqual(threat);
    }

    const laneCounts = [...threats.values()].reduce<Record<string, number>>((counts, threat) => {
      if (threat.threatLane) counts[threat.threatLane] = (counts[threat.threatLane] ?? 0) + 1;
      return counts;
    }, {});
    expect(laneCounts).toEqual({ red: 26, blue: 35, yellow: 48 });

    expect(followers.get("crownless-advocate")?.activeEffect).toEqual({
      type: "gain_note",
      text: "Crownless Advocate: one faction demand or rivalry bargain was softened."
    });
    expect(followers.get("saltflat-bone-reader")?.activeEffect).toEqual({
      type: "gain_note",
      text: "Saltflat Bone-Reader: one scar, omen, or void-salt bargain became a safer route note."
    });
    expect(followers.get("saltflat-bone-reader")?.useLimit).toBe("oncePerRound");
  });

  it("rejects retired metadata in current schemas while accepting and stripping exact legacy forms", () => {
    expect(followerSchema.safeParse(legacyFollower).success).toBe(false);
    const parsedFollower = legacyCompatibleFollowerSchema.parse(legacyFollower);
    expect(normalizeLegacyFollowerMetadata(parsedFollower)).toEqual({
      id: legacyFollower.id,
      name: legacyFollower.name,
      role: legacyFollower.role,
      text: legacyFollower.text,
      tags: ["route"]
    });

    expect(authoredThreatCardSchema.safeParse(legacyThreat).success).toBe(false);
    const parsedThreat = legacyCompatibleThreatCardSchema.parse(legacyThreat);
    expect(normalizeLegacyThreatCard(parsedThreat)).toMatchObject({
      id: legacyThreat.id,
      resourceTags: ["movement"],
      failEffect: { type: "legacy_compatibility_noop" }
    });
    expect(normalizeLegacyThreatCard(parsedThreat)).not.toHaveProperty("revealEffectKey");
  });

  it("normalizes every historical Threat key exhaustively without inventing a consequence", () => {
    expect(new Set(LEGACY_HEAT_THREAT_EFFECT_KEYS).size).toBe(10);
    expect(normalizeLegacyThreatEffectKey("threat_combat_plus_one_if_player_has_heat"))
      .toBe("threat_combat_plus_one_if_player_has_scar");
    expect(normalizeLegacyThreatEffectKey("threat_pay_heat_or_enemy_plus_two"))
      .toBe("threat_enemy_plus_two");
    expect(normalizeLegacyThreatEffectKey("threat_fail_wound_and_heat"))
      .toBe("threat_fail_take_wound");
    for (const key of [
      "threat_heat_on_reveal",
      "threat_all_heat_on_reveal",
      "threat_force_choose_heat_or_wound",
      "threat_force_discard_gear_or_gain_heat",
      "threat_fail_gain_heat",
      "threat_fail_gain_two_heat",
      "threat_defeat_reduce_heat"
    ] as const) {
      expect(normalizeLegacyThreatEffectKey(key)).toBeNull();
    }
  });

  it("preserves the two renamed behaviors and the Wound half of the historical mixed failure", () => {
    const state = createInitialSessionState("c6d-effects", "single-player");
    const player = state.players[0]!;
    const card = loadThreatCards().get("mirror-lord-envoy")!;
    player.character.scars = ["scar-wound-1"];
    const context = {
      state,
      seatId: player.seatId,
      card,
      player,
      escalationLevel: 0
    };
    expect(resolveThreatEffect("threat_combat_plus_one_if_player_has_scar", context).enemyBonusModifier).toBe(1);
    expect(resolveThreatEffect("threat_enemy_plus_two", context).enemyBonusModifier).toBe(2);
    expect(resolveThreatEffect("threat_fail_take_wound", context).effect).toEqual({
      type: "take_wound",
      amount: 1
    });
  });

  it.each(["v0", "v1", "v2"] as const)(
    "loads legacy %s follower and Threat metadata into a canonical Heat-free snapshot",
    (version) => {
      const v0 = legacyV0Snapshot();
      const input =
        version === "v0"
          ? v0
          : version === "v1"
            ? migrateSessionSnapshotV0ToV1(v0)
            : {
                ...serializeSessionSnapshotV2(
                  parseAndMigrateSessionSnapshot(v0).state
                ),
                state: {
                  ...parseAndMigrateSessionSnapshot(v0).state,
                  players: parseAndMigrateSessionSnapshot(v0).state.players.map((player) => ({
                    ...player,
                    character: { ...player.character, followers: [legacyFollower] }
                  })),
                  currentEncounter: legacyThreat
                }
              };

      if (version === "v1") {
        (input as ReturnType<typeof migrateSessionSnapshotV0ToV1>).state.players[0]!.character.followers = [legacyFollower];
        (input as ReturnType<typeof migrateSessionSnapshotV0ToV1>).state.currentEncounter = legacyThreat;
      }

      const migrated = parseAndMigrateSessionSnapshot(input);
      expect(migrated.saveVersion).toBe(2);
      expect(migrated.state.players[0]!.character.followers?.[0]).toEqual({
        id: legacyFollower.id,
        name: legacyFollower.name,
        role: legacyFollower.role,
        text: legacyFollower.text,
        tags: ["route"]
      });
      expect(migrated.state.currentEncounter).toMatchObject({
        id: legacyThreat.id,
        resourceTags: ["movement"],
        failEffect: { type: "legacy_compatibility_noop" }
      });
      expect(migrated.state.currentEncounter).not.toHaveProperty("revealEffectKey");
    }
  );
});
