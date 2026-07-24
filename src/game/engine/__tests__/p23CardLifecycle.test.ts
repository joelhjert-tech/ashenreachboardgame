import { describe, expect, it } from "vitest";
import { loadAfflictionCards } from "../../content/afflictions.js";
import { loadArtifactCards } from "../../content/artifacts.js";
import { loadGear } from "../../content/gear.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import type { GameAction } from "../actions.js";
import { getEquippedGearModifierSources } from "../gear.js";
import { reduceGameState } from "../reducer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import { artifactCardSchema, legacyCompatibleArtifactCardSchema } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";

const completedPassiveEquipmentIds = [
  "chainhook-blade",
  "route-compass",
  "field-lens",
  "lockjaw-kit",
  "bridge-spike",
  "static-probe",
  "surveyor-chalk",
  "cinder-suture-kit",
  "saintwire-splint",
  "salt-gauze-wrap",
  "ember-poultice",
  "salvage-ledger",
  "mirror-token",
  "oath-chain",
  "red-march-bell",
  "signal-lantern"
] as const;

function reduce(state: GameState, action: GameAction): GameState {
  const result = reduceGameState(state, action);
  expect(result.ok, result.ok ? "" : result.rejection.reason).toBe(true);
  if (!result.ok) throw new Error(result.rejection.reason);
  return result.state;
}

function collectGainGearEffects(
  effect: EncounterEffect
): Array<Extract<EncounterEffect, { type: "gain_gear" }>> {
  if (effect.type === "gain_gear") return [effect];
  if (effect.type === "sequence") return effect.effects.flatMap(collectGainGearEffects);
  return [];
}

describe("P23 Affliction lifecycle", () => {
  it("queues authored draw_affliction effects without applying client-side randomness", () => {
    const base = createInitialSessionState("p23-affliction-source", "single-player");
    const effect: EncounterEffect = { type: "draw_affliction", amount: 1 };
    const state: GameState = {
      ...base,
      status: "active",
      phase: "resolution",
      pendingEffect: effect
    };
    const next = reduce(state, {
      type: "RESOLUTION_APPLIED",
      seatId: "seat-1",
      effect,
      sourceCardId: "smoke-leech-clutch",
      success: false,
      createdAt: "2026-07-24T00:00:00.000Z"
    });
    expect(next.pendingAfflictionResolution).toMatchObject({
      ownerSeatId: "seat-1",
      sourceCardId: "smoke-leech-clutch",
      remainingDraws: 1,
      status: "queued"
    });
    expect(next.players[0]?.afflictionDrawHistory).toEqual([]);
  });

  it("continues Oath to the Breach and Condemned Echoes replacement chains", () => {
    const cards = loadAfflictionCards();
    const base = createInitialSessionState("p23-affliction-chain", "single-player");
    const queued: GameState = {
      ...base,
      pendingAfflictionResolution: {
        id: "queue-1",
        ownerSeatId: "seat-1",
        sourceCardId: "fixture",
        remainingDraws: 1,
        status: "queued",
        nextAfflictionId: null,
        nextDie: null,
        chosenStat: null,
        excludedCardIds: [],
        createdAt: "a"
      }
    };
    const oath = cards.get("oath-to-the-breach")!;
    const afterOath = reduce(queued, {
      type: "AFFLICTION_DRAWN",
      seatId: "seat-1",
      afflictionId: oath.id,
      affliction: oath,
      die: 3,
      createdAt: "b"
    });
    expect(afterOath.pendingAfflictionResolution?.remainingDraws).toBe(1);
    expect(afterOath.pendingAfflictionResolution?.excludedCardIds).toEqual(["oath-to-the-breach"]);

    const condemned = cards.get("condemned-echoes")!;
    const withFacedown: GameState = {
      ...queued,
      players: queued.players.map((player) => ({
        ...player,
        facedownAfflictions: ["old-a", "old-b"].map((cardId) => ({
          instanceId: cardId,
          cardId,
          drawnAt: "old",
          face: "facedown" as const,
          resolved: true
        }))
      }))
    };
    const afterCondemned = reduce(withFacedown, {
      type: "AFFLICTION_DRAWN",
      seatId: "seat-1",
      afflictionId: condemned.id,
      affliction: condemned,
      die: 2,
      createdAt: "c"
    });
    expect(afterCondemned.players[0]?.facedownAfflictions).toHaveLength(1);
    expect(afterCondemned.players[0]?.facedownAfflictions?.[0]?.cardId).toBe("condemned-echoes");
    expect(afterCondemned.pendingAfflictionResolution?.remainingDraws).toBe(2);
  });

  it("persists Runaway Growth choice state and resolves it only for its owner", () => {
    const base = createInitialSessionState("p23-runaway-growth", "single-player");
    const state: GameState = {
      ...base,
      players: base.players.map((player) => ({
        ...player,
        faceupAfflictions: [{
          instanceId: "growth",
          cardId: "runaway-growth",
          drawnAt: "a",
          face: "faceup",
          resolved: false
        }]
      })),
      pendingAfflictionResolution: {
        id: "queue-growth",
        ownerSeatId: "seat-1",
        sourceCardId: "fixture",
        remainingDraws: 1,
        status: "queued",
        nextAfflictionId: null,
        nextDie: null,
        chosenStat: null,
        excludedCardIds: [],
        createdAt: "a"
      }
    };
    const prepared = reduce(state, {
      type: "AFFLICTION_DRAW_PREPARED",
      seatId: "seat-1",
      resolutionId: "queue-growth",
      afflictionId: "mind-fog",
      die: 4,
      createdAt: "b"
    });
    expect(prepared.pendingAfflictionResolution?.status).toBe("awaitingStatChoice");
    const selected = reduce(prepared, {
      type: "AFFLICTION_STAT_CHOSEN",
      seatId: "seat-1",
      resolutionId: "queue-growth",
      stat: "signal",
      createdAt: "c"
    });
    expect(selected.pendingAfflictionResolution).toMatchObject({
      status: "queued",
      chosenStat: "signal",
      nextAfflictionId: "mind-fog"
    });
  });

  it("marks reactions once and applies Bile Spit to the authoritative target", () => {
    const base = createInitialSessionState("p23-bile-spit", "multiplayer");
    const state: GameState = {
      ...base,
      players: base.players.map((player, index) => index === 0 ? {
        ...player,
        faceupAfflictions: [{
          instanceId: "bile",
          cardId: "bile-spit",
          drawnAt: "a",
          face: "faceup",
          resolved: false
        }]
      } : player)
    };
    const opened = reduce(state, {
      type: "AFFLICTION_REACTION_OPENED",
      seatId: "seat-1",
      reactionId: "bile-reaction",
      afflictionId: "bile-spit",
      kind: "arrivalWound",
      targetSeatId: "seat-2",
      originalRoll: [1],
      sourceEventId: "arrival-1",
      createdAt: "a"
    });
    const before = opened.players.find((player) => player.seatId === "seat-2")!.character.wounds;
    const resolved = reduce(opened, {
      type: "AFFLICTION_REACTION_RESOLVED",
      seatId: "seat-1",
      reactionId: "bile-reaction",
      use: true,
      createdAt: "b"
    });
    expect(resolved.players.find((player) => player.seatId === "seat-2")!.character.wounds).toBe(before + 1);
    expect(resolved.players.find((player) => player.seatId === "seat-1")!.afflictionUsageState?.reactionUsed["arrival-1"]).toBe(true);
    expect(resolved.pendingAfflictionReaction).toBeNull();
  });
});

describe("P23 Equipment and Artifact lifecycle", () => {
  it.each(completedPassiveEquipmentIds)(
    "applies %s only while its exact item is equipped and not suppressed",
    (gearId) => {
      const gear = loadGear().get(gearId)!;
      expect(gear.effectModel).toBe("permanent");
      expect(gear.requiresEquipped).toBe(true);
      expect(gear.activeText).toBe(`While equipped, gain +1 ${gear.statBonus.stat[0]!.toUpperCase()}${gear.statBonus.stat.slice(1)}.`);
      const base = createInitialSessionState(`p23-gear-${gearId}`, "single-player");
      const character = {
        ...base.players[0]!.character,
        heldGear: [{ ...gear, instanceId: `${gearId}:owned` }],
        equippedGear: {
          ...base.players[0]!.character.equippedGear,
          [gear.slot]: gear.id
        },
        equippedGearInstances: {
          weapon: null,
          armor: null,
          utility: null,
          [gear.slot]: `${gearId}:owned`
        }
      };
      expect(getEquippedGearModifierSources(character, gear.statBonus.stat)).toContainEqual({
        label: gear.name,
        value: 1
      });
      expect(getEquippedGearModifierSources(
        character,
        gear.statBonus.stat,
        { mode: "check", suppressedInstanceIds: new Set([`${gearId}:owned`]) }
      )).toEqual([]);
      expect(getEquippedGearModifierSources({
        ...character,
        equippedGear: { weapon: null, armor: null, utility: null },
        equippedGearInstances: { weapon: null, armor: null, utility: null }
      }, gear.statBonus.stat)).toEqual([]);
      expect(JSON.parse(JSON.stringify(character)).heldGear[0].effectModel).toBe("permanent");
    }
  );

  it("links every Artifact-owned gear result back to its source card", () => {
    const artifacts = [...loadArtifactCards().values()];
    const gearLinks = artifacts.flatMap((artifact) => collectGainGearEffects(artifact.resolveEffect));
    expect(gearLinks.length).toBeGreaterThan(0);
    for (const effect of gearLinks) {
      expect(effect.sourceArtifactCardId).toMatch(/^artifact-/);
    }
  });

  it("keeps 26 sector-deck Artifacts and four relic-dealer-only presentations as distinct paths", () => {
    const sectorArtifactIds = new Set(createCanonicalSectorGraph().flatMap((space) => space.encounterDecks.artifact));
    expect(sectorArtifactIds.size).toBe(26);
    expect([
      "artifact-choir-lantern",
      "artifact-oathchain-lens",
      "artifact-route-star",
      "artifact-void-key"
    ].filter((artifactId) => !sectorArtifactIds.has(artifactId))).toHaveLength(4);
  });

  it("rejects retired Artifact eligibility flags in canonical content but accepts them at the legacy boundary", () => {
    const artifact = loadArtifactCards().get("artifact-route-star")!;
    const legacy = {
      ...artifact,
      missionRewardEligible: true,
      eliteThreatRewardEligible: false,
      rareShopEligible: true,
      scenarioRewardEligible: false
    };

    expect(() => artifactCardSchema.strict().parse(legacy)).toThrow();
    expect(legacyCompatibleArtifactCardSchema.strict().parse(legacy)).toMatchObject({
      id: artifact.id,
      missionRewardEligible: true,
      rareShopEligible: true
    });
  });
});
